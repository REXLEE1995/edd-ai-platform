import uuid
from datetime import datetime
from typing import Dict, Any, List
from app.providers.base import BaseProvider
from app.mock.mock_data import MOCK_COMPANIES

class WeifengqiProvider(BaseProvider):
    """
    数据源 1: 享宇金税数据中台数据接口 (Weifengqi API Adapter)
    对接企业税务增值税申报底稿、进销项开票切片与开票连续性数据
    """

    async def fetch_tax_data(self, credit_code: str, company_name: str) -> Dict[str, Any]:
        """
        获取享宇金税数据中台纳税申报与发票数据
        """
        if self.is_mock_mode:
            return self._mock_tax_data(credit_code, company_name)
        
        # 生产环境真实接口调用逻辑
        payload = {
            "credit_code": credit_code,
            "company_name": company_name,
            "period_months": 24,
            "include_samples": True
        }
        raw_res = await self._post_json("/tax/declaration/aggregate", payload)
        # 标准化适配
        return {
            "source_code": "WEIFENGQI_API",
            "auth_code": raw_res.get("auth_code", f"WFQ-AUTH-{uuid.uuid4().hex[:8].upper()}"),
            "tax_bureau": raw_res.get("tax_bureau", "国家税务总局本地税务局"),
            "total_sales_invoices": raw_res.get("total_sales_invoices", 0),
            "valid_ratio": raw_res.get("valid_ratio", "100.0%"),
            "tax_trend": raw_res.get("tax_trend", {"months": [], "sales_amount": [], "tax_paid": []}),
            "top_clients": raw_res.get("top_clients", []),
            "sample_invoices": raw_res.get("sample_invoices", []),
            "verified_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def _mock_tax_data(self, credit_code: str, company_name: str) -> Dict[str, Any]:
        """
        本地 Mock 引擎：根据企业信用代码或名称返回拟真的享宇金税数据中台税务底稿
        """
        matched = next(
            (c for c in MOCK_COMPANIES if c["credit_code"] == credit_code or c["company_name"] in company_name or company_name in c["company_name"]),
            MOCK_COMPANIES[0]
        )

        is_red = matched.get("risk_level") == "red"
        tax_prof = matched.get("tax_profile", {})
        fin_rat = matched.get("financial_ratios", {})
        stab = matched.get("stability_metrics", {})
        
        return {
            "source_code": "TAX_INVOICE_API",
            "source_name": "享宇数据中台·全税种纳税申报与发票明细存证底稿 (近24~36个月)",
            "auth_code": f"WFQ-AUTH-{uuid.uuid4().hex[:8].upper()}",
            "credit_code": credit_code,
            "company_name": company_name or matched["company_name"],
            "tax_bureau": tax_prof.get("tax_bureau", "国家税务总局本地税务局"),
            "tax_profile": tax_prof,
            "financial_ratios": fin_rat,
            "stability_metrics": stab,
            "wfq_base_score": matched.get("wfq_base_score", 702),
            "wfq_base_rating": matched.get("wfq_base_rating", "B+"),
            "wfq_preloan_quota": matched.get("wfq_preloan_quota", "500.00 万元"),
            "declaration_matrix_36m": matched.get("declaration_matrix_36m", {}),
            "production_factors_36m": matched.get("production_factors_36m", {}),
            "industry_benchmarks": matched.get("industry_benchmarks", {}),
            "financial_warnings_8": matched.get("financial_warnings_8", []),
            "expert_opinions": matched.get("expert_opinions", {}),
            "total_sales_invoices": 1842 if not is_red else 210,
            "valid_ratio": "99.8%" if not is_red else "84.2%",
            "irregular_invoices": 0 if not is_red else 5,
            "tax_trend": matched["tax_trend"],
            "top_clients": matched.get("top_clients", []),
            "top_suppliers": matched.get("top_suppliers", []),
            "sample_invoices": [
                {
                    "fp_num": "044002300991",
                    "date": datetime.now().strftime("%Y-07-28"),
                    "buyer": matched["top_clients"][0]["name"] if matched.get("top_clients") else "核心采销客户A",
                    "amount": "¥ 860,000.00",
                    "tax": "¥ 51,600.00",
                    "item": "主营业务产品销售"
                },
                {
                    "fp_num": "044002300992",
                    "date": datetime.now().strftime("%Y-07-15"),
                    "buyer": matched["top_clients"][1]["name"] if len(matched.get("top_clients", [])) > 1 else "核心采销客户B",
                    "amount": "¥ 420,000.00",
                    "tax": "¥ 25,200.00",
                    "item": "技术研发及维保服务"
                }
            ],
            "declared_periods_count": 36,
            "is_continuous_invoice": not is_red,
            "verified_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
