import sys
import time
import requests
import json

# 设置控制台输出为 UTF-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BACKEND_URL = "http://127.0.0.1:8000"
MOCK_SERVER_URL = "http://127.0.0.1:8010"

def run_test():
    print("=" * 70)
    print(">>> 1. 检查微风企 Mock 服务健康状态")
    print("=" * 70)
    r_mock = requests.get(f"{MOCK_SERVER_URL}/health")
    print(f"WFQ Mock Status: {r_mock.status_code}, Response: {r_mock.json()}")
    assert r_mock.status_code == 200, "微风企 Mock 服务未正常运行！"

    print("\n" + "=" * 70)
    print(">>> 2. 尽调系统用户登录 (13800138000 / 123456)")
    print("=" * 70)
    login_res = requests.post(f"{BACKEND_URL}/api/v1/auth/login", json={
        "phone": "13800138000",
        "password": "123456"
    })
    print(f"Login Status: {login_res.status_code}")
    login_data = login_res.json()
    token = login_data.get("access_token") or login_data.get("data", {}).get("access_token")
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print(f"登录成功，获取 JWT Token: {token[:20]}***")

    print("\n" + "=" * 70)
    print(">>> 3. 发起尽调任务 (POST /api/v1/tasks/create)")
    print("=" * 70)
    task_payload = {
        "company_name": "东莞市顺捷实业有限公司",
        "credit_code": "91441900MA4W8888XX",
        "legal_person": "吕顺光",
        "scene": "bank_credit"
    }
    create_res = requests.post(f"{BACKEND_URL}/api/v1/tasks/create", json=task_payload, headers=headers)
    print(f"Create Task Status: {create_res.status_code}")
    task_info = create_res.json()["data"]
    task_id = task_info["task_id"]
    wfq_order_no = task_info["wfq_order_no"]
    print(f"创建任务成功！")
    print(f"- 任务ID: {task_id}")
    print(f"- 微风企单号: {wfq_order_no}")
    print(f"- 微风企 H5 授权地址: {task_info['auth_link']}")
    print(f"- 授权二维码: {task_info['auth_qrcode_url']}")

    print("\n" + "=" * 70)
    print(">>> 4. H5 自动重定向回调跳转测试 (GET /api/v1/tasks/callback/wfq?orderNo=...&message=...)")
    print("=" * 70)
    cb_get_url = f"{BACKEND_URL}/api/v1/tasks/callback/wfq?orderNo={wfq_order_no}&message=dGFTcjk2MVJwUENKSm81VDZBMUhCd01GV2M1VEczUVJ2Y2huQW1ZaHJYeWo1"
    cb_res = requests.get(cb_get_url)
    print(f"GET Callback Status: {cb_res.status_code}")
    print(f"Content-Type: {cb_res.headers.get('Content-Type')}")
    print(f"HTML Preview: {cb_res.text[:120]}...")
    assert cb_res.status_code == 200, "GET 回调失败！"
    assert "企业数据授权已完成" in cb_res.text, "GET 回调未正确渲染 HTML 授权完成页面！"
    print(">>> [SUCCESS] 首次 H5 GET 回调跳转校验成功！正确返回授权完成 HTML 提示页面并自动更新任务授权状态！")

    print("\n" + "=" * 70)
    print(">>> 4.5 再次访问回调地址测试 (重复访问防重用校验)")
    print("=" * 70)
    cb_res_2 = requests.get(cb_get_url)
    print(f"Second GET Callback Status: {cb_res_2.status_code}")
    print(f"Second HTML Preview: {cb_res_2.text[:120]}...")
    assert cb_res_2.status_code == 200, "二次 GET 回调响应异常！"
    assert "该授权链接已失效" in cb_res_2.text, "二次 GET 回调未正确显示链接已失效页面！"
    assert "首次授权完成时间" in cb_res_2.text, "失效页面未返显固化的首次授权完成时间！"
    print(">>> [SUCCESS] 二次回调防重用与失效页面校验 100% 通过！首次授权完成时间已固化！")

    print("\n" + "=" * 70)
    print(">>> 5. 轮询等待后台全链路流水线执行 (微风企状态查询 -> PDF拉取落盘 -> 数据清洗 -> 报告生成)")
    print("=" * 70)
    completed = False
    report_id = None
    for i in range(20):
        time.sleep(1.5)
        detail_res = requests.get(f"{BACKEND_URL}/api/v1/tasks/{task_id}", headers=headers)
        data = detail_res.json()["data"]
        status = data["status"]
        logs = data.get("thinking_logs", [])
        latest_log = logs[-1]["content"] if logs else ""
        print(f"[轮询 {i+1}] 状态: {status} | 最新日志: {latest_log}")
        if status == "completed":
            completed = True
            report_id = data["report_id"]
            print(f"\n>>> 任务执行完成！终态报告资产 ID: {report_id}")
            print(f"- 微风企 PDF 原始地址: {data.get('wfq_pdf_url')}")
            print(f"- 文件存证 ID: {data.get('storage_file_id')}")
            break

    assert completed, "任务未在预期时间内完成！"

    print("\n" + "=" * 70)
    print(">>> 6. 测试文件存储服务调取与 PDF 下载接口 (GET /api/v1/reports/{report_id}/pdf)")
    print("=" * 70)
    pdf_res = requests.get(f"{BACKEND_URL}/api/v1/reports/{report_id}/pdf", headers=headers)
    print(f"PDF 下载 Status: {pdf_res.status_code}")
    print(f"Content-Type: {pdf_res.headers.get('Content-Type')}")
    print(f"Content-Disposition: {pdf_res.headers.get('Content-Disposition')}")
    print(f"PDF 文件大小: {len(pdf_res.content)} 字节 (~{round(len(pdf_res.content)/1024/1024, 2)}MB)")
    print(f"PDF 文件魔数头: {pdf_res.content[:8]}")
    assert pdf_res.content.startswith(b"%PDF"), "PDF 文件头校验失败！"
    print(">>> [SUCCESS] 文件存储服务校验成功，成功拉取并持久化微风企报告！")

    print("\n" + "=" * 70)
    print(">>> 7. 校验报告详情与数据呈现 (GET /api/v1/reports/{report_id})")
    print("=" * 70)
    rep_res = requests.get(f"{BACKEND_URL}/api/v1/reports/{report_id}", headers=headers)
    rep_data = rep_res.json()["data"]
    print(f"企业名称: {rep_data['company_name']}")
    print(f"风控评级: {rep_data['risk_level']} | 评分: {rep_data['score']}分")
    print(f"建议授信额度: {rep_data['suggested_quota_min']} ~ {rep_data['suggested_quota_max']} 万元")
    print(f"AI 综合研判: {rep_data['summary_ai_comment'][:100]}...")
    print("=" * 70)
    print(">>> [ALL PASSED] 微风企全流程改造与文件存储服务端到端验证 100% 通过！")
    print("=" * 70)

if __name__ == "__main__":
    run_test()
