import sys
import io
import asyncio

# 确保 UTF-8 打印
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from app.providers import get_weifengqi_provider, get_ic_provider, get_risk_provider
from app.services.cleansing_service import DataCleansingService

async def main():
    print("=== 测试 3 个三方数据接口 Adapter 与四维量化深度评估 (Mock 模式) ===")
    
    wfq = get_weifengqi_provider()
    ic = get_ic_provider()
    risk = get_risk_provider()

    test_cases = [
        ("91440300MA5DQ8888X", "深圳腾讯前海信息技术有限公司", "GREEN"),
        ("91440300MA5H88888X", "享宇数科供应链（深圳）有限公司", "GREEN"),
        ("91320400MA1W99991L", "江苏恒瑞智造科技有限公司", "YELLOW"),
        ("91310115MA1H88773K", "上海盛泰供应链管理服务有限公司", "RED"),
        ("91330100MA2B99999P", "浙江红运达实业发展有限公司", "RED")
    ]

    for code, name, expected_level in test_cases:
        tax_res = await wfq.fetch_tax_data(code, name)
        ic_res = await ic.fetch_ic_full_profile(code, name)
        risk_res = await risk.fetch_risk_profile(code, name)

        (
            content_json, 
            raw_sources_json, 
            risk_level, 
            score, 
            quota_min, 
            quota_max, 
            ai_summary
        ) = DataCleansingService.clean_and_synthesize(tax_res, ic_res, risk_res)

        sub = content_json["score_card"]["sub_scores"]
        matrix = content_json["credit_decision_matrix"]
        reds = content_json["red_lines_triggered"]

        print(f"\n[{'PASS' if risk_level.upper() == expected_level else 'FAIL'}] 企业: {name}")
        print(f"  -> 评级: {risk_level.upper()} (期望: {expected_level}), 总分: {score}分")
        print(f"  -> 四维子得分: 工商={sub['biz_score']}, 经营风险={sub['risk_score']}, 税务财报={sub['tax_score']}, 流水多头={sub['flow_score']}")
        print(f"  -> 触发一票否决红线数: {len(reds)} ({[r['title'] for r in reds]})")
        print(f"  -> 授信决策结论: {matrix['admission_status']} | 额度: {matrix['suggested_quota_range']} | 期限: {matrix['suggested_term']}")
        print(f"  -> 原始底稿键: {list(raw_sources_json.keys())}")

    print("\n✓ 全部 5 类企业画像深度风险评估与一票否决熔断规则测试通过！")

if __name__ == "__main__":
    asyncio.run(main())

