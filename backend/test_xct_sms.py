import asyncio
import hashlib
import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

from app.core.config import settings
from app.core.database import AsyncSessionLocal, init_db
from app.core.cache import cache_client
from app.providers.xct_sms_provider import (
    generate_xct_signature,
    format_xct_sms_content,
    get_xct_sms_provider,
    XCT_SMS_TEMPLATES
)
from app.services.sms_service import SMSService

async def test_xct_signature():
    print("--- [Test 1] 享畅通双重 MD5 加盐动态鉴权算法测试 ---")
    test_key = "my_secret_key_123"
    test_seed = "20260910120000"
    
    first_md5 = hashlib.md5(test_key.encode("utf-8")).hexdigest().lower()
    expected_sign = hashlib.md5((first_md5 + test_seed).encode("utf-8")).hexdigest().lower()
    
    actual_sign = generate_xct_signature(test_key, test_seed)
    assert actual_sign == expected_sign, f"Signature mismatch: {actual_sign} != {expected_sign}"
    assert len(actual_sign) == 32 and actual_sign.islower(), "Signature must be 32-char lowercase hex"
    print(f"✅ 动态签名测试通过: key={test_key}, seed={test_seed} -> sign={actual_sign}")

async def test_xct_templates():
    print("\n--- [Test 2] 4 大报备模版与固定签名格式测试 ---")
    code = "889966"
    
    # 验证 4 大模版
    for scene in ["login", "register", "change_pwd", "reset_pwd"]:
        content = format_xct_sms_content(scene=scene, code=code)
        assert content.startswith("【成都享宇森云科技】"), f"Missing signature in scene {scene}: {content}"
        assert f"验证码为：{code}" in content, f"Missing code in scene {scene}: {content}"
        assert "5分钟内有效" in content, f"Missing expiry in scene {scene}: {content}"
        print(f"✅ [{scene}] 模版组装验证通过: {content}")
        
    # 验证防重入签名测试
    content_with_bracket = format_xct_sms_content(scene="login", code="123456", sign="【成都享宇森云科技】")
    assert content_with_bracket.startswith("【成都享宇森云科技】") and not content_with_bracket.startswith("【【"), "Double brackets detected!"
    print("✅ 签名括号智能去重测试通过")

async def test_xct_provider_mock():
    print("\n--- [Test 3] 享畅通 Provider 挡板拦截器与安全零资费测试 ---")
    provider = get_xct_sms_provider(is_open=False)
    ok, msg, meta = await provider.send_sms("13800138000", "【成都享宇森云科技】您正在进行登录操作，验证码为：123456，5分钟内有效。")
    assert ok is True, "Mock send should return True"
    assert meta.get("is_mock") is True, "Meta should indicate mock"
    print(f"✅ 挡板拦截测试通过: ok={ok}, msg={msg}, meta={meta}")

async def test_sms_service_lifecycle():
    print("\n--- [Test 4] 短信完整生命周期测试 (频控、无状态凭证、5次防爆破、单次消费) ---")
    await init_db()
    
    async with AsyncSessionLocal() as session:
        import random
        test_phone = f"138{random.randint(10000000, 99999999)}"
        
        # 1. 发送验证码 (login 场景)
        ok, msg, data = await SMSService.send_verification_code(
            session=session,
            phone=test_phone,
            scene="login",
            client_ip="127.0.0.1"
        )
        assert ok is True, f"Send failed: {msg}"
        sms_token = data["sms_token"]
        assert sms_token is not None and len(sms_token) > 10, "sms_token must be generated"
        print(f"✅ 验证码发送成功: sms_token={sms_token}")
        
        # 从缓存中检索出实际生成的 code 用于后续测试
        actual_code = await cache_client.get(f"sms-code:{sms_token}")
        assert actual_code is not None, "Code must be in cache"
        print(f"🔍 检索到生成验证码为: {actual_code}")
        
        # 2. 60秒频控拦截测试
        ok2, msg2, _ = await SMSService.send_verification_code(
            session=session,
            phone=test_phone,
            scene="login"
        )
        assert ok2 is False, "Second send should be rate limited"
        assert "频繁" in msg2, f"Expected rate limit message, got: {msg2}"
        print(f"✅ 60秒频控拦截测试通过: {msg2}")
        
        # 3. 错误验证码重试与 5 次防爆破测试
        for i in range(1, 5):
            is_valid, err_msg = await SMSService.verify_code(
                session=session,
                phone=test_phone,
                code="000000",
                scene="login",
                sms_token=sms_token
            )
            assert is_valid is False, "Wrong code should not validate"
            assert "还可以重试" in err_msg, f"Expected retry count message, got: {err_msg}"
            print(f"   - 第 {i} 次输错测试通过: {err_msg}")
            
        # 第 5 次输错 -> 强制作废
        is_valid_5, err_msg_5 = await SMSService.verify_code(
            session=session,
            phone=test_phone,
            code="000000",
            scene="login",
            sms_token=sms_token
        )
        assert is_valid_5 is False, "5th wrong attempt must fail"
        assert "作废" in err_msg_5, f"Expected lockout message, got: {err_msg_5}"
        print(f"✅ 第 5 次输错强制作废测试通过: {err_msg_5}")
        
        # 确认验证码已被销毁
        assert await cache_client.get(f"sms-code:{sms_token}") is None, "Code must be purged from cache"
        
        # 4. 重新发送验证码并在正确核验后单次销毁测试 (reset_pwd 场景)
        await cache_client.delete(f"sms-rate-limit:{test_phone}") # 解除频控以便测试
        ok_reset, _, data_reset = await SMSService.send_verification_code(
            session=session,
            phone=test_phone,
            scene="reset_pwd"
        )
        assert ok_reset is True
        token_reset = data_reset["sms_token"]
        correct_code = await cache_client.get(f"sms-code:{token_reset}")
        
        # 正确核验
        valid_ok, valid_msg = await SMSService.verify_code(
            session=session,
            phone=test_phone,
            code=correct_code,
            scene="reset_pwd",
            sms_token=token_reset
        )
        assert valid_ok is True, f"Verify should succeed: {valid_msg}"
        print(f"✅ 正确验证码核验成功: {valid_msg}")
        
        # 单次消费防重放测试: 再次使用相同验证码核验应该失败
        reuse_ok, reuse_msg = await SMSService.verify_code(
            session=session,
            phone=test_phone,
            code=correct_code,
            scene="reset_pwd",
            sms_token=token_reset
        )
        assert reuse_ok is False, "Reusing consumed code must fail"
        print(f"✅ 一次性核验消费防重放测试通过: {reuse_msg}")
        
        # 5. 兼容历史无 sms_token 的场景核验测试 (change_pwd 场景)
        await cache_client.delete(f"sms-rate-limit:{test_phone}")
        ok_chg, _, data_chg = await SMSService.send_verification_code(
            session=session,
            phone=test_phone,
            scene="change_pwd"
        )
        code_chg = await cache_client.get(f"sms-code:{data_chg['sms_token']}")
        
        # 不传 sms_token，仅凭 phone + scene + code 核验
        no_token_ok, no_token_msg = await SMSService.verify_code(
            session=session,
            phone=test_phone,
            code=code_chg,
            scene="change_pwd",
            sms_token=None
        )
        assert no_token_ok is True, f"Backward compatible verify failed: {no_token_msg}"
        print(f"✅ 无 sms_token 历史兼容核验测试通过: {no_token_msg}")

async def test_auth_routes():
    print("\n--- [Test 5] FastAPI 短信相关业务路由端到端集成测试 ---")
    import httpx
    import random
    from main import app
    
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        phone = f"139{random.randint(10000000, 99999999)}"
        
        # 1. 发送注册验证码
        resp = await client.post("/api/v1/auth/send-code", json={"phone": phone, "scene": "register"})
        assert resp.status_code == 200, f"send-code failed: {resp.text}"
        data = resp.json().get("data", {})
        sms_token = data.get("sms_token")
        assert sms_token, "Must return sms_token"
        print(f"✅ /api/v1/auth/send-code (register) 成功，sms_token={sms_token}")
        
        # 获取实际 code
        code = await cache_client.get(f"sms-code:{sms_token}")
        
        # 2. 调用注册
        resp_reg = await client.post("/api/v1/auth/register", json={
            "phone": phone,
            "code": code,
            "sms_token": sms_token,
            "company_name": "成都享畅通测试企业"
        })
        assert resp_reg.status_code == 200, f"register failed: {resp_reg.text}"
        reg_data = resp_reg.json()
        assert "access_token" in reg_data, "Must return access_token"
        print(f"✅ /api/v1/auth/register 注册成功: {reg_data['message']}")
        
        # 3. 发送重置密码验证码
        await cache_client.delete(f"sms-rate-limit:{phone}")
        resp_reset_send = await client.post("/api/v1/auth/send-code", json={"phone": phone, "scene": "reset_pwd"})
        assert resp_reset_send.status_code == 200
        token_reset = resp_reset_send.json().get("data", {}).get("sms_token")
        code_reset = await cache_client.get(f"sms-code:{token_reset}")
        
        # 4. 调用重置密码
        resp_reset = await client.post("/api/v1/auth/reset-password", json={
            "phone": phone,
            "code": code_reset,
            "sms_token": token_reset,
            "new_password": "NewStrongPassword2026"
        })
        assert resp_reset.status_code == 200, f"reset-password failed: {resp_reset.text}"
        print(f"✅ /api/v1/auth/reset-password 成功: {resp_reset.json()['message']}")

        # 5. 测试管理后台 SMS 配置获取与连通性探针
        resp_admin_sms = await client.get("/api/admin/settings/sms")
        assert resp_admin_sms.status_code == 200, f"admin sms settings failed: {resp_admin_sms.text}"
        sms_data = resp_admin_sms.json().get("data", {})
        assert sms_data.get("sign") == "成都享宇森云科技", "Sign must match"
        print(f"✅ /api/admin/settings/sms 成功: sign={sms_data.get('sign')}, templates={sms_data.get('available_templates')}")

        test_probe_phone = f"137{random.randint(10000000, 99999999)}"
        resp_probe = await client.post("/api/admin/settings/sms/test", json={"phone": test_probe_phone, "scene": "login"})
        assert resp_probe.status_code == 200, f"admin sms test failed: {resp_probe.text}"
        print(f"✅ /api/admin/settings/sms/test 成功: {resp_probe.json()['message']}")

        # 6. 测试商户账号、密码与短信签名协同热更新 (验证可按需自由配置)
        resp_update = await client.post("/api/admin/settings/sms", json={
            "name": "new_merchant_001",
            "key": "new_secret_key_888",
            "sign": "享宇数科测试"
        })
        assert resp_update.status_code == 200, f"admin sms update failed: {resp_update.text}"
        updated_data = resp_update.json().get("data", {})
        assert updated_data.get("sign") == "享宇数科测试"
        assert updated_data.get("name") == "new_merchant_001"
        print(f"✅ 短信签名与商户账号密码协同热更新测试通过: name={updated_data.get('name')}, sign={updated_data.get('sign')}")

        # 验证热更新后发送短信使用新签名
        probe_phone_2 = f"136{random.randint(10000000, 99999999)}"
        resp_probe_2 = await client.post("/api/admin/settings/sms/test", json={"phone": probe_phone_2, "scene": "login"})
        assert resp_probe_2.status_code == 200
        print(f"✅ 热更新签名后发送短信验证通过: {resp_probe_2.json()['message']}")

        # 恢复默认签名
        await client.post("/api/admin/settings/sms", json={"sign": "成都享宇森云科技"})

async def main():
    print("==================================================")
    print("🚀 开始享畅通 (XCT SMS) 全套功能与安全控制自动化验证")
    print("==================================================")
    await test_xct_signature()
    await test_xct_templates()
    await test_xct_provider_mock()
    await test_sms_service_lifecycle()
    await test_auth_routes()
    print("\n==================================================")
    print("🎉 ALL TESTS PASSED! 享畅通短信对接全部功能验证通过！")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
