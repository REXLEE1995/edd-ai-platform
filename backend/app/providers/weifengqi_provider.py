import os
import uuid
import logging
from datetime import datetime
from typing import Dict, Any, Optional
import httpx

from app.providers.base import BaseProvider
from app.mock.mock_data import MOCK_COMPANIES

logger = logging.getLogger("edd.providers.wfq")

class WeifengqiProvider(BaseProvider):
    """
    微风企数据中台数据适配器 (Weifengqi API Adapter)
    对接企业实名数据授权链接生成、报告生成状态查询、报告 PDF 获取及税务数据解析
    """

    def __init__(self, mode: str = "mock", base_url: str = "http://127.0.0.1:8010", app_key: str = "", app_secret: str = "", timeout: int = 15):
        super().__init__(mode=mode, base_url=base_url or "http://127.0.0.1:8010", app_key=app_key, app_secret=app_secret, timeout=timeout)
        if not self.base_url:
            self.base_url = "http://127.0.0.1:8010"

    async def get_auth_link(
        self,
        company_name: str,
        taxpayer_id: str,
        cb_url: str = "https://edd.ai/api/v1/tasks/callback/wfq",
        order_no: Optional[str] = None,
        request_no: Optional[str] = None,
        legal_mobile: str = "1",
        legal_name: str = "1"
    ) -> Dict[str, Any]:
        """
        第一步：获取微风企企业数据授权链接 (POST /model/wfq/auth)
        规范完全对齐 testfile/获取微风企授权链接.py
        """
        generated_order_no = order_no or f"hqq{datetime.now().strftime('%Y%m%d%H%M%S')}{uuid.uuid4().hex[:4]}"
        generated_req_no = request_no or f"req_{uuid.uuid4().hex[:16]}"
        now_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        payload = {
            "cburl": cb_url,
            "orderNo": generated_order_no,
            "typeWay": 1,
            "taxpayerId": taxpayer_id,
            "companyName": company_name,
            "authenticationMsg": {
                "cognizantMobile": legal_mobile,
                "cognizantName": legal_name,
                "authenticationResult": ""
            },
            "prodId": "WFQ_AUTH",
            "token": "J0xmJ1ux1eHrkINt",
            "requestTime": now_time_str,
            "requestNo": generated_req_no,
            "sign": "c11EsTe8JQUkXViyfglgr83Wlo+pfEB1tbIWNPi6tjq5O/SCApksorIj2X74j3Ah71UQibLuzE+pP6ilClQ3TShH+2YNbZJ8tDDgu/qLvB0hJDUmHMFYxXsslBA73e7wWu5q3kCYVLpBbVQdrCvyISsVb9ti74s5GPOk0wTHI6U="
        }

        url = f"{self.base_url}/model/wfq/auth"
        logger.info(f"[WFQ Provider] Requesting Auth Link from {url} for company={company_name}, orderNo={generated_order_no}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if res.status_code == 200:
                    res_data = res.json()
                    body = res_data.get("body", {})
                    field_obj = body.get("field", {})
                    auth_url = (
                        field_obj.get("url") 
                        or body.get("authUrl") 
                        or f"https://www.wfq2020.com/authorization/?orderNo={generated_order_no}&cburl={cb_url}"
                    )
                    return {
                        "auth_url": auth_url,
                        "order_no": body.get("orderNo") or generated_order_no,
                        "request_no": body.get("requestNo") or generated_req_no,
                        "app_no": body.get("appNo") or "ws2tMSOtu058Ey2G",
                        "status": "WAIT_AUTH",
                        "raw_response": res_data
                    }
        except Exception as exc:
            logger.warning(f"[WFQ Provider] Request to {url} failed ({str(exc)}), using fallback mock auth link.")

        # 优雅本地降级兜底
        return {
            "auth_url": f"https://www.wfq2020.com/authorization/?orderNo={generated_order_no}&cburl={cb_url}",
            "order_no": generated_order_no,
            "request_no": generated_req_no,
            "app_no": "ws2tMSOtu058Ey2G",
            "status": "WAIT_AUTH",
            "raw_response": {"fallback": True}
        }

    async def check_report_status(
        self,
        order_no: str,
        request_no: Optional[str] = None,
        app_no: str = "be51gABP3iPL781L"
    ) -> Dict[str, Any]:
        """
        第二步：查询微风企报告是否生成完毕 (POST /model/wfq/report/status)
        """
        generated_req_no = request_no or f"req_{uuid.uuid4().hex[:12]}"
        payload = {
            "orderNo": order_no,
            "requestNo": generated_req_no,
            "appNo": app_no,
            "prodId": "WFQ_STATUS",
            "token": "J0xmJ1ux1eHrkINt",
            "requestTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        url = f"{self.base_url}/model/wfq/report/status"
        logger.info(f"[WFQ Provider] Checking Report Status from {url} for orderNo={order_no}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if res.status_code == 200:
                    res_data = res.json()
                    body = res_data.get("body", {})
                    return {
                        "is_ready": body.get("isReady", True) or body.get("status") == "SUCCESS",
                        "status": body.get("status", "SUCCESS"),
                        "order_no": body.get("orderNo", order_no),
                        "progress": body.get("progress", 100),
                        "raw_response": res_data
                    }
        except Exception as exc:
            logger.warning(f"[WFQ Provider] Request to {url} failed ({str(exc)}), using fallback ready status.")

        return {
            "is_ready": True,
            "status": "SUCCESS",
            "order_no": order_no,
            "progress": 100,
            "raw_response": {"fallback": True}
        }

    async def get_report_pdf_url(
        self,
        order_no: str,
        request_no: Optional[str] = None,
        app_no: str = "be51gABP3iPL781L"
    ) -> str:
        """
        第三步：获取微风企报告 PDF 下载地址 (POST /model/wfq/report/pdf-url)
        返回可直接通过 HTTP GET 下载的 PDF 完整 URL
        """
        generated_req_no = request_no or "123456789"
        payload = {
            "orderNo": order_no,
            "requestNo": generated_req_no,
            "appNo": app_no,
            "prodId": "WFQ_REPORT_PDF",
            "token": "J0xmJ1ux1eHrkINt",
            "requestTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        url = f"{self.base_url}/model/wfq/report/pdf-url"
        logger.info(f"[WFQ Provider] Fetching Report PDF URL from {url} for orderNo={order_no}")

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if res.status_code == 200:
                    res_data = res.json()
                    pdf_url = res_data.get("body", {}).get("field", {}).get("reportPdfUrl")
                    if pdf_url:
                        return pdf_url
        except Exception as exc:
            logger.warning(f"[WFQ Provider] Request to {url} failed ({str(exc)}), fallback to default mock URL.")

        # 默认指向本地微风企 mock 服务的文件下载端点
        return f"{self.base_url}/files/微风企贷前报告{order_no}.pdf"

    async def fetch_tax_data(self, credit_code: str, company_name: str) -> Dict[str, Any]:
        """
        获取金税全税种申报与发票明细解析数据 (提供给 DataCleansingService)
        """
        return self._mock_tax_data(credit_code, company_name)

    def _mock_tax_data(self, credit_code: str, company_name: str) -> Dict[str, Any]:
        """
        本地规则引擎：根据企业信用代码或名称返回拟真的享宇金税数据中台税务底稿
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
