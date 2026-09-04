import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.providers.base import BaseProvider, get_third_party_api_config
from app.mock.mock_data import MOCK_BUSINESS_REGISTRATION, MOCK_COMPANIES

class ICDataProvider(BaseProvider):
    """
    数据源 2: 企业工商数据接口 (Enterprise IC API Adapter)
    对接企业登记照面信息、股东股权及出资穿透、主要管理人员（董监高）、历史变更轨迹与对外投资分支
    """

    async def fetch_ic_full_profile(
        self,
        credit_code: str,
        company_name: str,
        db: Optional[AsyncSession] = None
    ) -> Dict[str, Any]:
        """
        获取企业完整工商档案（包含股东穿透与董监高）
        支持动态读取 sys_third_party_apis 中 IC_ENTERPRISE 的调用模式 (mock/http)
        """
        mode, endpoint = await get_third_party_api_config(
            db, "IC_ENTERPRISE", default_mode=self.mode, default_endpoint=self.base_url
        )
        if mode == "mock" or (mode != "http" and self.is_mock_mode):
            return self._mock_ic_profile(credit_code, company_name)

        # 生产环境真实接口调用逻辑
        payload = {
            "credit_code": credit_code,
            "company_name": company_name,
            "include_shareholders": True,
            "include_personnel": True,
            "include_changes": True,
            "include_investments": True
        }
        raw_res = await self._post_json("/enterprise/profile/full", payload)
        return {
            "source_code": "ENTERPRISE_IC_API",
            "source_name": "官方企业信用信息中台工商底稿",
            "basic_info": raw_res.get("basic_info", {}),
            "shareholders": raw_res.get("shareholders", []),
            "key_personnel": raw_res.get("key_personnel", []),
            "change_records": raw_res.get("change_records", []),
            "investments": raw_res.get("investments", []),
            "verified_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    def _mock_ic_profile(self, credit_code: str, company_name: str) -> Dict[str, Any]:
        """
        本地 Mock 引擎：根据统一社会信用代码或企业名称返回拟真企业工商档案
        """
        # 1. 优先从 MOCK_BUSINESS_REGISTRATION 精准查找
        if credit_code in MOCK_BUSINESS_REGISTRATION:
            matched_ic = MOCK_BUSINESS_REGISTRATION[credit_code]
        else:
            # 按名称模糊匹配
            matched_code = next(
                (code for code, data in MOCK_BUSINESS_REGISTRATION.items() 
                 if data["basic_info"]["company_name"] in company_name or company_name in data["basic_info"]["company_name"]),
                None
            )
            if matched_code:
                matched_ic = MOCK_BUSINESS_REGISTRATION[matched_code]
            else:
                # 默认返回腾讯前海模板并适配名称
                matched_ic = MOCK_BUSINESS_REGISTRATION["91440300MA5DQ8888X"]

        return {
            "source_code": "ENTERPRISE_IC_API",
            "source_name": "国家企业信用信息公示系统 / 官方数据中台工商底稿",
            "credit_code": credit_code or matched_ic["basic_info"]["credit_code"],
            "company_name": company_name or matched_ic["basic_info"]["company_name"],
            "basic_info": {
                **matched_ic["basic_info"],
                "company_name": company_name or matched_ic["basic_info"]["company_name"],
                "credit_code": credit_code or matched_ic["basic_info"]["credit_code"]
            },
            "actual_controller": matched_ic.get("actual_controller", {}),
            "shareholders": matched_ic.get("shareholders", []),
            "key_personnel": matched_ic.get("key_personnel", []),
            "change_records": matched_ic.get("change_records", []),
            "investments": matched_ic.get("investments", []),
            "shareholders_count": len(matched_ic.get("shareholders", [])),
            "key_personnel_count": len(matched_ic.get("key_personnel", [])),
            "change_records_count": len(matched_ic.get("change_records", [])),
            "investments_count": len(matched_ic.get("investments", [])),
            "verified_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
