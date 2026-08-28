import os
import uuid
import base64
import hashlib
import hmac
from datetime import datetime
from typing import Optional, Dict, Any

import uvicorn
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(
    title="微风企开放平台 Mock 服务 (WFQ Mock Server)",
    version="1.0.0",
    description="模拟微风企企业授权、报告生成状态查询及 PDF 报告文件下载服务"
)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SAMPLE_PDF_PATH = os.path.join(CURRENT_DIR, "贷前报告样例-享宇智评版.pdf")

# 内存模拟任务状态缓存 (orderNo -> status)
task_state_cache: Dict[str, Dict[str, Any]] = {}

def generate_mock_signature(payload_str: str) -> str:
    """生成动态模拟签名"""
    sign_key = "wfq_mock_secret_key"
    h = hmac.new(sign_key.encode("utf-8"), payload_str.encode("utf-8"), hashlib.sha256)
    return base64.b64encode(h.digest() + b"wfq_sign_padding_2026").decode("utf-8")

# ==============================================================================
# 请求模型定义
# ==============================================================================

class AuthRequest(BaseModel):
    cburl: Optional[str] = "https://www.baidu.com/"
    orderNo: Optional[str] = None
    typeWay: Optional[int] = 1
    taxpayerId: Optional[str] = "91440300MA5DQ8888X"
    companyName: Optional[str] = "测试企业有限公司"
    authenticationMsg: Optional[Dict[str, Any]] = None
    prodId: Optional[str] = "WFQ_AUTH"
    token: Optional[str] = "J0xmJ1ux1eHrkINt"
    requestTime: Optional[str] = None
    requestNo: Optional[str] = None
    sign: Optional[str] = None

class ReportStatusRequest(BaseModel):
    orderNo: Optional[str] = None
    requestNo: Optional[str] = None
    taxpayerId: Optional[str] = None
    appNo: Optional[str] = "be51gABP3iPL781L"
    prodId: Optional[str] = "WFQ_STATUS"
    token: Optional[str] = "J0xmJ1ux1eHrkINt"
    requestTime: Optional[str] = None
    sign: Optional[str] = None

class ReportPdfUrlRequest(BaseModel):
    orderNo: Optional[str] = None
    requestNo: Optional[str] = None
    taxpayerId: Optional[str] = None
    appNo: Optional[str] = "be51gABP3iPL781L"
    prodId: Optional[str] = "WFQ_REPORT_PDF"
    token: Optional[str] = "J0xmJ1ux1eHrkINt"
    requestTime: Optional[str] = None
    sign: Optional[str] = None

# ==============================================================================
# 1. 基础与健康检查接口
# ==============================================================================

@app.get("/")
@app.get("/health")
async def health_check():
    pdf_exists = os.path.exists(SAMPLE_PDF_PATH)
    pdf_size = os.path.getsize(SAMPLE_PDF_PATH) if pdf_exists else 0
    return {
        "status": "online",
        "service": "微风企开放网关 Mock Server",
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "pdf_template": {
            "file_name": "贷前报告样例-享宇智评版.pdf",
            "exists": pdf_exists,
            "size_bytes": pdf_size
        }
    }

# ==============================================================================
# 2. 接口：获取微风企授权链接 (POST /model/wfq/auth)
# ==============================================================================

@app.post("/model/wfq/auth")
async def get_wfq_auth_link(req: AuthRequest, request: Request):
    req_no = req.requestNo or f"req_{uuid.uuid4().hex[:16]}"
    order_no = req.orderNo or f"ord_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"
    
    import urllib.parse
    encoded_cb = urllib.parse.quote(req.cburl or "", safe="")
    # 模拟真实微风企 H5 授权地址，包含 channelCode, cburl 与消息体
    auth_h5_url = f"https://www.wfq2020.com/authorization/?channelCode=5pg29&orderNo={order_no}&cburl={encoded_cb}&message=dGFTcjk2MVJwUENKSm81VDZBMUhCd01GV2M1VEczUVJ2Y2huQW1ZaHJYeWo1US9QODlqdXNjR3BCamZCT0N5L0FHM0lHQWRNdnlZKzE5L01jc0Z1RzJmUkFQU0ZTbkVjdmZkTkpPSENRZGpmbDBYRk41dkMvNElDYmU4S00wbHRmakJSZGJDTHh5ZzMxbG5aaTRZOStPRzI1ZjhOSjRoUzRRbGlBQlNzQ2JQV0Nyajh5NVA1b3JUNlpYRjFNNkNHSDBIdlBnTlI4VEF4TmNmTjA5ZktpMThFd2h0SUhZbFZsazBKYnVYUFJRbG1QT212TkR3dFd3ZzdRanJXMlNGSkRSN2oyemNUcW4wMmhMU0ROSjE2Q05nZXlhbTM5OHVyWW51S1VkUkFWejg9"
    
    # 初始化状态为已授权 (方便测试直接推进)
    task_state_cache[order_no] = {
        "orderNo": order_no,
        "taxpayerId": req.taxpayerId,
        "companyName": req.companyName,
        "status": "SUCCESS", # 状态: PROCESSING, SUCCESS, FAILED
        "reportPdfName": f"微风企贷前报告_{order_no}.pdf",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

    sig = generate_mock_signature(f"{order_no}_{req_no}")
    return {
        "body": {
            "field": {
                "url": auth_h5_url
            },
            "requestNo": req_no,
            "appNo": "ws2tMSOtu058Ey2G",
            "orderNo": order_no
        },
        "errMsg": "操作成功",
        "errorCode": 0,
        "message": None,
        "signature": sig
    }

# ==============================================================================
# 3. 接口一：获取报告是否生成完毕 (POST /model/wfq/report/status)
# ==============================================================================

@app.post("/model/wfq/report/status")
@app.get("/model/wfq/report/status")
async def query_report_status(
    request: Request,
    body: Optional[ReportStatusRequest] = None,
    orderNo: Optional[str] = Query(None),
    requestNo: Optional[str] = Query(None)
):
    # 兼容 POST Body 与 GET Query 参数
    req_order_no = (body.orderNo if body else None) or orderNo or "hqq20260828000101"
    req_request_no = (body.requestNo if body else None) or requestNo or f"req_{uuid.uuid4().hex[:12]}"
    req_app_no = (body.appNo if body else None) or "be51gABP3iPL781L"

    # 模拟检查状态 (默认返回已生成完毕 SUCCESS)
    record = task_state_cache.get(req_order_no, {})
    current_status = record.get("status", "SUCCESS") # SUCCESS: 已生成完毕, PROCESSING: 生成中

    sig = generate_mock_signature(f"{req_order_no}_{req_request_no}_{current_status}")

    return {
        "body": {
            "status": current_status,               # SUCCESS (生成完毕) / PROCESSING (生成中) / FAILED
            "isReady": (current_status == "SUCCESS"), # 布尔值标识
            "orderNo": req_order_no,                # 动态回显订单号
            "requestNo": req_request_no,            # 动态回显请求号
            "appNo": req_app_no,                    # 动态回显 AppNo
            "reportTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "progress": 100 if current_status == "SUCCESS" else 65
        },
        "errMsg": "操作成功",
        "errorCode": 0,
        "message": None,
        "signature": sig
    }

# ==============================================================================
# 4. 接口二：获取报告 PDF 下载地址 (POST /model/wfq/report/pdf-url)
# ==============================================================================

@app.post("/model/wfq/report/pdf-url")
@app.get("/model/wfq/report/pdf-url")
async def get_report_pdf_url(
    request: Request,
    body: Optional[ReportPdfUrlRequest] = None,
    orderNo: Optional[str] = Query(None),
    requestNo: Optional[str] = Query(None),
    appNo: Optional[str] = Query(None)
):
    # 1. 动态提取请求参数
    req_order_no = (body.orderNo if body else None) or orderNo or "12345678"
    req_request_no = (body.requestNo if body else None) or requestNo or "123456789"
    req_app_no = (body.appNo if body else None) or appNo or "be51gABP3iPL781L"

    # 2. 动态构造当前服务器真实可访问的 PDF 文件下载链接
    base_url = str(request.base_url).rstrip("/")
    # 构造动态文件名，如 微风企贷前报告12345678.pdf
    pdf_filename = f"微风企贷前报告{req_order_no}.pdf"
    real_download_url = f"{base_url}/files/{pdf_filename}"

    # 3. 动态签名生成
    sig_payload = f"{real_download_url}_{req_request_no}_{req_app_no}"
    signature_val = generate_mock_signature(sig_payload)

    # 4. 严格按照用户指定的格式响应返回
    return {
        "body": {
            "field": {
                "reportPdfUrl": real_download_url
            },
            "requestNo": req_request_no,
            "appNo": req_app_no
        },
        "errMsg": "操作成功",
        "errorCode": 0,
        "message": None,
        "signature": signature_val
    }

# ==============================================================================
# 5. 真实 PDF 文件流下载服务接口 (GET /files/{filename})
# ==============================================================================

from urllib.parse import quote

@app.get("/files/{filename}")
@app.get("/files/download/{filename}")
async def download_pdf_file(filename: str):
    """
    提供实际的 PDF 报告文件下载服务
    映射并返回 wfqmockserver/贷前报告样例-享宇智评版.pdf 文件流
    """
    if not os.path.exists(SAMPLE_PDF_PATH):
        raise HTTPException(status_code=404, detail="样本 PDF 文件未找到")

    encoded_filename = quote(filename)
    return FileResponse(
        path=SAMPLE_PDF_PATH,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
            "Access-Control-Allow-Origin": "*"
        }
    )

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8010, reload=True)
