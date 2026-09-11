from typing import List, Optional
from fastapi import APIRouter, Query
from app.mock.mock_data import MOCK_COMPANIES
from app.providers import get_ic_provider, get_weifengqi_provider, get_risk_provider

router = APIRouter(prefix="/search", tags=["三方数据源与企业搜索"])

@router.get("/companies")
async def search_companies(keyword: str = Query(..., min_length=1)):
    """
    企业模糊搜索联想接口
    """
    keyword_clean = keyword.strip().lower()
    matches = []
    for c in MOCK_COMPANIES:
        if keyword_clean in c["company_name"].lower() or keyword_clean in c["credit_code"].lower():
            matches.append({
                "company_name": c["company_name"],
                "credit_code": c["credit_code"],
                "legal_person": c["legal_person"],
                "reg_capital": c["reg_capital"],
                "established_date": c["established_date"],
                "address": c["address"],
                "industry": c["industry"]
            })
    return {"code": 0, "data": matches}

@router.get("/companies/ic-info")
async def get_company_ic_info(
    credit_code: Optional[str] = Query(None),
    company_name: Optional[str] = Query(None)
):
    """
    【三方接口2·企业工商】获取目标企业完整工商档案（含股东出资穿透、主要人员、历史变更与对外投资）
    """
    provider = get_ic_provider()
    data = await provider.fetch_ic_full_profile(credit_code or "", company_name or "")
    return {"code": 0, "data": data}

@router.get("/companies/tax-info")
async def get_company_tax_info(
    credit_code: Optional[str] = Query(None),
    company_name: Optional[str] = Query(None)
):
    """
    【三方接口1·享宇官方涉税数据中台】获取目标企业增值税纳税申报表底稿与发票明细
    """
    provider = get_weifengqi_provider()
    data = await provider.fetch_tax_data(credit_code or "", company_name or "")
    return {"code": 0, "data": data}

@router.get("/companies/risk-info")
async def get_company_risk_info(
    credit_code: Optional[str] = Query(None),
    company_name: Optional[str] = Query(None)
):
    """
    【三方接口3·经营风险】获取企业司法合规风险、失信一票否决与全网多头信贷借贷底稿
    """
    provider = get_risk_provider()
    data = await provider.fetch_risk_profile(credit_code or "", company_name or "")
    return {"code": 0, "data": data}
