import requests
import json

BASE_URL = "http://127.0.0.1:8010"

def test_all():
    print("=" * 60)
    print("1. 测试微风企 Mock 服务健康检查")
    print("=" * 60)
    r = requests.get(f"{BASE_URL}/health")
    print("Status:", r.status_code)
    print("Response:", json.dumps(r.json(), ensure_ascii=False, indent=2))

    print("\n" + "=" * 60)
    print("2. 测试获取微风企授权链接 (POST /model/wfq/auth)")
    print("=" * 60)
    auth_payload = {
        "cburl": "https://api.example.com/api/v1/tasks/callback/wfq",
        "orderNo": "hqq20260828000101",
        "typeWay": 1,
        "taxpayerId": "91440300MA5DQ8888X",
        "companyName": "深圳腾讯前海信息技术有限公司",
        "prodId": "WFQ_AUTH",
        "token": "J0xmJ1ux1eHrkINt"
    }
    r = requests.post(f"{BASE_URL}/model/wfq/auth", json=auth_payload)
    print("Status:", r.status_code)
    print("Response:", json.dumps(r.json(), ensure_ascii=False, indent=2))

    print("\n" + "=" * 60)
    print("3. 测试查询报告是否生成完毕 (POST /model/wfq/report/status)")
    print("=" * 60)
    status_payload = {
        "orderNo": "hqq20260828000101",
        "requestNo": "req_test_883921",
        "appNo": "be51gABP3iPL781L"
    }
    r = requests.post(f"{BASE_URL}/model/wfq/report/status", json=status_payload)
    print("Status:", r.status_code)
    print("Response:", json.dumps(r.json(), ensure_ascii=False, indent=2))

    print("\n" + "=" * 60)
    print("4. 测试获取报告 PDF 下载地址 (POST /model/wfq/report/pdf-url)")
    print("=" * 60)
    pdf_payload = {
        "orderNo": "12345678",
        "requestNo": "123456789",
        "appNo": "be51gABP3iPL781L"
    }
    r = requests.post(f"{BASE_URL}/model/wfq/report/pdf-url", json=pdf_payload)
    print("Status:", r.status_code)
    res_data = r.json()
    print("Response:", json.dumps(res_data, ensure_ascii=False, indent=2))

    pdf_download_url = res_data["body"]["field"]["reportPdfUrl"]
    print(f"\n[解析获取到的真实 PDF 下载地址]: {pdf_download_url}")

    print("\n" + "=" * 60)
    print("5. 测试实际下载 PDF 文件流 (GET reportPdfUrl)")
    print("=" * 60)
    r_pdf = requests.get(pdf_download_url, stream=True)
    print("HTTP Status:", r_pdf.status_code)
    print("Content-Type:", r_pdf.headers.get("Content-Type"))
    print("Content-Length (字节):", len(r_pdf.content))
    print("PDF 文件头校验:", r_pdf.content[:8])

    if r_pdf.content.startswith(b"%PDF"):
        print(">>> [SUCCESS] PDF 文件下载验证成功！真实指向【贷前报告样例-享宇智评版.pdf】！")

if __name__ == "__main__":
    test_all()
