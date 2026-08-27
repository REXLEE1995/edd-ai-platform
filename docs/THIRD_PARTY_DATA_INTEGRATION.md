# EDD AI 平台三方数据接口分层架构与无缝切换规范

本文档详细说明尽调平台的三大外部数据源架构：**微风企数据接口**、**企业工商数据接口**、**企业经营风险数据接口**，以及当前 **Mock 模式** 如何无缝平滑切换为 **生产真实 HTTP 接口** 的技术规范。

---

## 1. 三方数据源职责划分与边界

平台尽调全流程不依赖单一数据源，而是通过标准的 **Adapter 模式** 并发拉取 3 个独立第三方的标准接口：

| 数据源名称 | 适配器类名 | 职责与覆盖维度 | 对应的三方系统形态 |
| :--- | :--- | :--- | :--- |
| **1. 微风企数据** | `WeifengqiProvider` | 近24个月增值税申报表、销项/进项发票明细切片、开票连续性与有效票比例、下游客户集中度 | 腾讯微风企 / 航天信息 / 百望云税票开放平台 |
| **2. 企业工商数据** | `ICDataProvider` | 统一信用代码、法人、注册/实缴资本、成立日期、行业、参保人数、股东及出资穿透（最终受益人）、董监高人员、历史关键变更轨迹、对外投资分支 | 国家企业信用信息公示系统 / 企查查 / 天眼查 / 官方数据中台 |
| **3. 企业经营风险** | `RiskRadarProvider` | 司法裁判文书、被执行人、**失信被执行人（一票否决红线）**、限制高消费、行政处罚、经营异常名录、动产抵押/股权出质、**全网金融机构多头借贷征信** | 司法大数据研究院 / 汇法网 / 征信机构多头雷达 / 风险监控中台 |

---

## 2. 整体分层架构与数据流

```
                    ┌──────────────────────────────────────────────────┐
                    │            尽调任务异步流水线 (TaskService)          │
                    └────────────────────────┬─────────────────────────┘
                                             │
                       并发触发 3 个三方数据适配器 (Providers)
                                             │
             ┌───────────────────────────────┼───────────────────────────────┐
             │                               │                               │
             ▼                               ▼                               ▼
  ┌──────────────────────┐        ┌──────────────────────┐        ┌──────────────────────┐
  │   WeifengqiProvider  │        │    ICDataProvider    │        │  RiskRadarProvider   │
  │   (微风企数据接口)   │        │   (企业工商数据接口) │        │  (企业经营风险接口)  │
  └──────────┬───────────┘        └──────────┬───────────┘        └──────────┬───────────┘
             │                               │                               │
       [模式判断分支]                  [模式判断分支]                  [模式判断分支]
      MODE == "mock"?                 MODE == "mock"?                 MODE == "mock"?
      ├── YES: 本地Mock引擎           ├── YES: 本地Mock引擎           ├── YES: 本地Mock引擎
      └── NO : 真实三方HTTP网关       └── NO : 真实三方HTTP网关       └── NO : 真实三方HTTP网关
             │                               │                               │
             └───────────────────────────────┼───────────────────────────────┘
                                             │
                                             ▼
                    ┌──────────────────────────────────────────────────┐
                    │    联合数据清洗与风控特征服务 (DataCleansingService)   │
                    │  1. 剔除作废红冲发票，构建 24 个月对齐时间轴      │
                    │  2. 穿透股权出资与实际控制人/最终受益人           │
                    │  3. 18 项红黄牌硬规则运算与多头借贷压力评估       │
                    │  4. AI 智能体上下文 Prompt 组装与参考额度测算     │
                    └────────────────────────┬─────────────────────────┘
                                             │
                         ┌───────────────────┴───────────────────┐
                         ▼                                       ▼
        ┌──────────────────────────────────┐   ┌──────────────────────────────────┐
        │       终态报告结构化资产         │   │       三方接口不可篡改原始底稿   │
        │         (content_json)           │   │        (raw_sources_json)        │
        │ - 工商基本面 & 股东穿透表        │   │ - raw_sources.tax_invoice_summary│
        │ - 24个月真实营收开票 ECharts 图表│   │ - raw_sources.business_reg_raw   │
        │ - 核心采购集中度 & 风控评级结论  │   │ - raw_sources.multi_lending_raw  │
        └──────────────────────────────────┘   └──────────────────────────────────┘
```

---

## 3. 代码目录与模块结构

```
backend/app/
├── providers/                     # [核心] 三方数据适配器层
│   ├── __init__.py                # 统一导出工厂 get_weifengqi_provider, get_ic_provider, get_risk_provider
│   ├── base.py                    # BaseProvider (HTTP客户端、鉴权头、超时重试)
│   ├── weifengqi_provider.py      # WeifengqiProvider (微风企税票与申报接口)
│   ├── ic_provider.py             # ICDataProvider (工商照面/股东穿透/董监高/变更)
│   └── risk_provider.py           # RiskRadarProvider (司法涉诉/失信一票否决/多头借贷)
│
├── services/
│   ├── cleansing_service.py       # [核心] DataCleansingService (三方联合数据清洗管道)
│   ├── task_service.py            # TaskService (异步驱动三方采集与 AI 思考流)
│   └── quota_service.py           # 额度扣减与事务控制
│
├── mock/
│   └── mock_data.py               # 拟真多场景数据集 (绿色标杆、黄色关注、红色一票否决)
│
└── core/
    └── config.py                  # Settings (读取 .env 配置三方模式与密钥)
```

---

## 4. 如何无缝切换为真实接口（零代码改动）

在上线接入三方供应商提供的正式环境时，**无需修改任何业务代码**，仅需修改 `backend/.env` 环境变量配置文件即可：

### 示例 1：全面切换为真实接口
```ini
# ==========================================
# 1. 切换微风企为真实 HTTP 接口
# ==========================================
WEIFENGQI_MODE="http"
WEIFENGQI_BASE_URL="https://api.weifengqi.com/v1"
WEIFENGQI_APP_KEY="prod_wfq_key_883901"
WEIFENGQI_APP_SECRET="prod_wfq_secret_992104"
WEIFENGQI_TIMEOUT_SECONDS=15

# ==========================================
# 2. 切换企业工商为真实 HTTP 接口
# ==========================================
IC_DATA_MODE="http"
IC_DATA_BASE_URL="https://api.enterprise-data.com/ic/v1"
IC_DATA_APP_KEY="prod_ic_key_110293"
IC_DATA_APP_SECRET="prod_ic_secret_338192"
IC_DATA_TIMEOUT_SECONDS=15

# ==========================================
# 3. 切换经营风险雷达为真实 HTTP 接口
# ==========================================
RISK_DATA_MODE="http"
RISK_DATA_BASE_URL="https://api.risk-radar.com/v1"
RISK_DATA_APP_KEY="prod_risk_key_771920"
RISK_DATA_APP_SECRET="prod_risk_secret_449102"
RISK_DATA_TIMEOUT_SECONDS=15
```

### 示例 2：支持混合模式（例如微风企调真实接口，工商与风险暂用 Mock）
```ini
WEIFENGQI_MODE="http" # 仅微风企调真实三方网关
IC_DATA_MODE="mock"   # 工商继续用内置拟真引擎
RISK_DATA_MODE="mock" # 风险雷达继续用内置拟真引擎
```

---

## 5. 三方接口标准报文规范 (HTTP JSON)

### 1) 接口 1: 微风企增值税申报接口 (`/tax/declaration/aggregate`)
**请求方式**: `POST`
**Request Body**:
```json
{
  "credit_code": "91440300MA5DQ8888X",
  "company_name": "深圳腾讯前海信息技术有限公司",
  "period_months": 24,
  "include_samples": true
}
```
**Response JSON**:
```json
{
  "code": 200,
  "data": {
    "auth_code": "WFQ-AUTH-88291039",
    "tax_bureau": "国家税务总局深圳市前海深港现代服务业合作区税务局",
    "total_sales_invoices": 1842,
    "valid_ratio": "99.8%",
    "tax_trend": {
      "months": ["2024-09", "2024-11", "2025-01", "2025-03", "..."],
      "sales_amount": [850, 920, 1100, 980, 1250],
      "tax_paid": [42.5, 46.0, 55.0, 49.0, 62.5]
    },
    "top_clients": [
      {"rank": 1, "name": "腾讯科技（深圳）有限公司", "amount": "4,947.25 万元", "ratio": "38.5%", "status": "正常开票"}
    ],
    "sample_invoices": [
      {"fp_num": "044002300111", "date": "2026-07-28", "buyer": "腾讯科技（深圳）有限公司", "amount": "¥ 1,280,000.00", "tax": "¥ 76,800.00", "item": "软件技术服务费"}
    ]
  }
}
```

---

### 2) 接口 2: 企业工商与股权穿透接口 (`/enterprise/profile/full`)
**请求方式**: `POST`
**Request Body**:
```json
{
  "credit_code": "91440300MA5DQ8888X",
  "company_name": "深圳腾讯前海信息技术有限公司",
  "include_shareholders": true,
  "include_personnel": true,
  "include_changes": true,
  "include_investments": true
}
```
**Response JSON**:
```json
{
  "code": 200,
  "data": {
    "basic_info": {
      "company_name": "深圳腾讯前海信息技术有限公司",
      "credit_code": "91440300MA5DQ8888X",
      "legal_person": "马化腾",
      "reg_capital": "10,000 万元人民币",
      "paid_in_capital": "10,000 万元人民币",
      "established_date": "2018-05-18",
      "operating_status": "存续（在营、开业、在册）",
      "industry": "信息传输、软件和信息技术服务业",
      "insured_count": 1850,
      "registered_address": "深圳市前海深港合作区前湾一路63号前海企业公馆2B栋",
      "business_scope": "计算机软硬件开发、云平台研发及人工智能公共服务..."
    },
    "shareholders": [
      {
        "name": "深圳市腾讯计算机系统有限公司",
        "type": "企业法人",
        "ratio": "95.00%",
        "subscribed_capital": "9,500.00 万元",
        "paid_capital": "9,500.00 万元",
        "beneficiary": "马化腾 (最终受益股份约 54.2%)"
      }
    ],
    "key_personnel": [
      {"name": "马化腾", "position": "董事长"},
      {"name": "任宇昕", "position": "董事兼总经理"}
    ],
    "change_records": [
      {"change_date": "2023-04-12", "change_item": "注册资本及实收资本变更", "before_change": "5,000 万元", "after_change": "10,000 万元"}
    ],
    "investments": [
      {"company_name": "腾讯前海云计算技术（深圳）有限公司", "ratio": "100.00%", "status": "存续"}
    ]
  }
}
```

---

### 3) 接口 3: 企业经营风险与多头借贷雷达接口 (`/risk/radar/aggregate`)
**请求方式**: `POST`
**Request Body**:
```json
{
  "credit_code": "91440300MA5DQ8888X",
  "company_name": "深圳腾讯前海信息技术有限公司",
  "include_judiciary": true,
  "include_penalties": true,
  "include_multi_lending": true
}
```
**Response JSON**:
```json
{
  "code": 200,
  "data": {
    "judiciary_risks": {
      "dishonest_executors": [],
      "executed_persons_count": 0,
      "judicial_auctions": [],
      "has_one_vote_veto": false
    },
    "operational_risks": {
      "abnormal_operations": [],
      "administrative_penalties": [],
      "chattel_mortgages": [],
      "equity_pledges": []
    },
    "multi_lending_summary": {
      "query_count_1m": 0,
      "query_count_3m": 1,
      "query_count_12m": 3,
      "overdue_records": 0,
      "inquiry_institutions": ["招商银行股份有限公司深圳分行 (授信审批)"]
    }
  }
}
```

---

## 6. 异常降级与容灾设计

1. **三方单点故障隔离**:
   - 若三方接口之一（例如企业经营风险接口）发生超时或 5xx 异常，适配器层支持在指定重试次数（如 2 次）失败后，自动降级记录该模块为“接口暂时维护”，不阻断整个尽调任务的正常生成，同时在报告中明确打上“风险雷达部分指标待重试”标记。
2. **原始数据留痕与审计溯源**:
   - 无论处于 Mock 还是真实 HTTP 模式，每一次任务拉取到的原始 JSON 报文均完整持久化保存在数据表 `dd_reports.raw_sources_json` 中，确保未来即使三方接口发生变更或数据到期，已生成的尽调报告及其证据链依旧具备永久合规存证效力。
