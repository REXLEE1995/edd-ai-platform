from typing import Optional, List
from pydantic import BaseModel

class RechargePackage(BaseModel):
    id: str
    name: str
    quota_points: int
    original_price: float
    price: float
    tag: Optional[str] = None
    desc: str

class CreateOrderRequest(BaseModel):
    package_id: str
    pay_type: str = "wechat" # wechat / alipay

class QuotaAdjustRequest(BaseModel):
    user_id: str
    adjust_type: str # add, sub, set
    amount: int
    reason_category: str # offline_payment, business_gift, customer_compensation, manual_correction, internal_test
    proof_no: Optional[str] = None
    proof_image_url: Optional[str] = None
    remark: str

class QuotaTransactionResponse(BaseModel):
    id: str
    tx_no: str
    user_id: str
    user_phone: str
    user_company: Optional[str] = None
    change_type: str
    amount: int
    balance_before: int
    balance_after: int
    ref_type: str
    ref_id: Optional[str] = None
    operator_type: str
    operator_name: Optional[str] = None
    remark: Optional[str] = None
    created_at: str
