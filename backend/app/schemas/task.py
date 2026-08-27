from typing import Optional, List, Any
from pydantic import BaseModel

class TaskCreateRequest(BaseModel):
    company_name: str
    credit_code: str
    legal_person: Optional[str] = None
    scene: str = "bank_credit" # bank_credit, supply_chain, risk_scan
    dimensions: List[str] = ["工商司法", "税务真实性", "多头借贷", "资产抵质押"]
    auth_mode: str = "weifengqi_qr" # weifengqi_qr, public_only

class TaskSummaryResponse(BaseModel):
    id: str
    task_no: str
    company_name: str
    credit_code: str
    scene: str
    status: str
    auth_status: str
    auth_qrcode_url: Optional[str] = None
    auth_link: Optional[str] = None
    risk_level: Optional[str] = None
    report_id: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None
    thinking_logs: Optional[List[dict]] = []

class ReportDetailResponse(BaseModel):
    id: str
    report_no: str
    task_id: str
    company_name: str
    credit_code: str
    legal_person: Optional[str] = None
    risk_level: str
    score: int
    suggested_quota_min: int
    suggested_quota_max: int
    summary_ai_comment: Optional[str] = None
    content_json: dict
    raw_sources_json: dict
    created_at: str
