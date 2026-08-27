import uuid
from datetime import datetime
from typing import Dict, Any, List
from app.providers.base import BaseProvider
from app.mock.mock_data import MOCK_BUSINESS_REGISTRATION, MOCK_COMPANIES

class RiskRadarProvider(BaseProvider):
    """
    数据源 3: 企业经营风险数据接口 (Enterprise Operational & Legal Risk API Adapter)
    对接司法涉诉裁判、失信被执行人一票否决、限制高消费、行政处罚、经营异常、动产抵押及全网多头信贷借贷排查
    """

    async def fetch_risk_profile(self, credit_code: str, company_name: str) -> Dict[str, Any]:
        """
        获取企业经营与合规司法全景风险档案
        """
        if self.is_mock_mode:
            return self._mock_risk_profile(credit_code, company_name)

        # 生产环境真实接口调用逻辑
        payload = {
            "credit_code": credit_code,
            "company_name": company_name,
            "include_judiciary": True,
            "include_penalties": True,
            "include_multi_lending": True
        }
        raw_res = await self._post_json("/risk/radar/aggregate", payload)
        return {
            "source_code": "ENTERPRISE_RISK_API",
            "source_name": "全网司法合规与多头信贷风险雷达底稿",
            "judiciary_risks": raw_res.get("judiciary_risks", {}),
            "operational_risks": raw_res.get("operational_risks", {}),
            "multi_lending_summary": raw_res.get("multi_lending_summary", {}),
            "verified_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def _mock_risk_profile(self, credit_code: str, company_name: str) -> Dict[str, Any]:
        """
        本地 Mock 引擎：根据企业匹配其风险底稿与多头借贷记录
        """
        matched_comp = next(
            (c for c in MOCK_COMPANIES if c["credit_code"] == credit_code or c["company_name"] in company_name or company_name in c["company_name"]),
            MOCK_COMPANIES[0]
        )

        matched_ic = MOCK_BUSINESS_REGISTRATION.get(matched_comp["credit_code"]) or MOCK_BUSINESS_REGISTRATION["91440300MA5DQ8888X"]
        comp_risk = matched_ic.get("compliance_and_judiciary", {})
        
        is_red = matched_comp.get("risk_level") == "red"
        is_yellow = matched_comp.get("risk_level") == "yellow"
        multi_data = matched_comp.get("multi_lending", {})

        return {
            "source_code": "ENTERPRISE_RISK_API",
            "source_name": "全网司法合规与多头信贷风险雷达底稿",
            "credit_code": credit_code or matched_comp["credit_code"],
            "company_name": company_name or matched_comp["company_name"],
            "risk_level_tag": matched_comp["risk_level"],
            "judiciary_risks": {
                "serious_illegal": comp_risk.get("serious_illegal", False),
                "serious_illegal_detail": comp_risk.get("serious_illegal_detail", ""),
                "dishonest_executors": comp_risk.get("dishonest_executors", []),
                "executed_persons_count": len(comp_risk.get("dishonest_executors", [])),
                "judicial_auctions": comp_risk.get("judicial_auctions", []),
                "lawsuits_summary": comp_risk.get("lawsuits_summary", {}),
                "has_one_vote_veto": is_red or comp_risk.get("serious_illegal", False) or len(comp_risk.get("dishonest_executors", [])) > 0
            },
            "operational_risks": {
                "abnormal_operations": comp_risk.get("abnormal_operations", []),
                "administrative_penalties": comp_risk.get("administrative_penalties", []),
                "chattel_mortgages": comp_risk.get("chattel_mortgages", []),
                "equity_pledges": comp_risk.get("equity_pledges", []),
                "administrative_licenses": comp_risk.get("administrative_licenses", [])
            },
            "multi_lending_summary": {
                "source_name": "享宇风控雷达·全网金融机构多头信贷排查底稿",
                "query_count_1m": multi_data.get("query_count_1m", 0),
                "query_count_3m": multi_data.get("query_count_3m", 1),
                "query_count_12m": multi_data.get("query_count_12m", 3),
                "overdue_records": multi_data.get("overdue_records", 0),
                "inquiry_institutions": multi_data.get("inquiry_institutions", [
                    "招商银行股份有限公司深圳分行 (授信审批)"
                ])
            },
            "verified_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
