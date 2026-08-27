# 企业尽调系统 (EDD AI Platform) - 用户发起尽调任务场景 ER 图与业务主流程文档

> **版本**：v2.1  
> **文档主题**：用户发起 AI 尽调任务场景的核心数据实体关系 (ER)、业务时序流转与事务状态机规范 (浅色主题图表)  
> **更新时间**：2026-08-25  

---

## 1. 场景概述

“用户发起 AI 尽调”是平台 SaaS 业务的核心业务主线。该场景串联了：
1. **企业主体模糊检索**（中台工商涉诉数据匹配）
2. **账户额度校验与强一致性扣减**（生成不可篡改的消耗流水）
3. **微风企税务与信贷法人授权协同**（生成专属授权二维码/链接并异步接收回调）
4. **AI 智能体思考流分析**（结合工商、近24个月税务开票与多头征信进行推理）
5. **风控报告生成与资产归档**（交付三栏交互式看板与双向原始底稿溯源库）

---

## 2. 核心实体关系 ER 图 (Entity-Relationship Diagram)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': { 'primaryColor': '#f8fafc', 'primaryTextColor': '#0f172a', 'primaryBorderColor': '#94a3b8', 'lineColor': '#475569', 'secondaryColor': '#f1f5f9', 'tertiaryColor': '#ffffff' }}}%%
erDiagram
    USERS ||--o{ DD_TASKS : "1. 发起尽调任务 (1:N)"
    USERS ||--o{ QUOTA_TRANSACTIONS : "2. 产生额度流水 (1:N)"
    DD_TASKS ||--|| QUOTA_TRANSACTIONS : "3. 扣费/返还单据关联 (1:1)"
    DD_TASKS ||--o| DD_REPORTS : "4. 生成报告终态资产 (1:1)"
    USERS ||--o{ DD_REPORTS : "5. 拥有报告资产 (1:N)"

    USERS {
        string id PK "用户唯一标识 UID (UUID)"
        string phone "注册手机号"
        string company_name "所属机构/企业主体名称"
        string credit_code "统一社会信用代码"
        int balance_quota "当前可用额度(次)"
        int total_recharge_quota "累计充值点数"
        int total_consumed_quota "累计消费点数"
        int total_gifted_quota "系统赠送点数"
        string status "状态: active(正常) / frozen(冻结)"
        json tags "运营标签列表 (如 VIP大客户)"
        datetime created_at "注册时间"
        datetime updated_at "最后更新时间"
    }

    DD_TASKS {
        string id PK "任务主键 ID (UUID)"
        string task_no UK "任务业务单号 (TSK2026...)"
        string user_id FK "发起用户 UID"
        string company_name "目标企业全称"
        string credit_code "目标企业统一信用代码"
        string legal_person "目标企业法定代表人"
        string scene "尽调场景: bank_credit/supply_chain/risk_scan"
        json dimensions "勾选的研判维度清单"
        string auth_mode "授权模式: weifengqi_qr / public_only"
        string status "任务状态: waiting_auth/pulling_data/ai_analyzing/completed/failed"
        string auth_status "微风企授权状态: pending / authorized"
        string auth_qrcode_url "微风企授权二维码 URL"
        string auth_link "微风企专属授权 H5 链接"
        json thinking_logs "AI实时思考流日志列表"
        string report_id FK "关联生成的报告 ID"
        string risk_level "最终风控评级: green/yellow/red"
        string error_message "异常终止原因"
        datetime created_at "任务创建时间"
        datetime completed_at "任务完成时间"
    }

    QUOTA_TRANSACTIONS {
        string id PK "流水主键 ID (UUID)"
        string tx_no UK "全局流水单号 (QTX2026...)"
        string user_id FK "用户 UID"
        string user_phone "用户手机号"
        string user_company "用户所属企业"
        string change_type "变动类型: consume/recharge/gift/refund/manual_add/manual_sub"
        int amount "变动数值 (+N / -N)"
        int balance_before "变动前基准余额"
        int balance_after "变动后基准余额"
        string ref_type "关联业务类型: task/order/adjust/system"
        string ref_id FK "关联业务单号 (如 TSK2026...)"
        string operator_type "操作主体: user / admin / system"
        string operator_name "操作人名称/渠道"
        string ip_address "客户端 IP 地址"
        string remark "业务备注原因"
        datetime created_at "流水记录时间"
    }

    DD_REPORTS {
        string id PK "报告资产主键 ID (UUID)"
        string report_no UK "报告全局编号 (RPT2026...)"
        string task_id FK "关联源任务 ID"
        string user_id FK "所属用户 UID"
        string company_name "目标企业全称"
        string credit_code "统一信用代码"
        string legal_person "法定代表人"
        string risk_level "风控评级: green(准入)/yellow(关注)/red(否决)"
        int score "综合风控评分 (0-100)"
        int suggested_quota_min "测算建议授信下限 (万元)"
        int suggested_quota_max "测算建议授信上限 (万元)"
        string summary_ai_comment "AI 核心研判摘要评述"
        json content_json "报告完整看板内容与 ECharts 趋势图数据"
        json raw_sources_json "微风企税务申报与征信原始底稿双向溯源库"
        datetime created_at "报告生成归档时间"
    }
```

---

## 3. 业务主流程时序图 (Sequence Diagram)

```mermaid
%%{init: {'theme': 'default', 'themeVariables': { 'actorBkg': '#f8fafc', 'actorBorder': '#64748b', 'actorTextColor': '#0f172a', 'signalColor': '#334155', 'signalTextColor': '#0f172a', 'labelBoxBkgColor': '#f1f5f9', 'labelBoxBorderColor': '#cbd5e1', 'labelTextColor': '#0f172a', 'noteBkgColor': '#fef9c3', 'noteBorderColor': '#facc15', 'noteTextColor': '#713f12' }}}%%
sequenceDiagram
    autonumber
    actor User as 用户 (SaaS 前端)
    participant API as 后端 API (FastAPI)
    participant DB as 数据库 (SQLite / PostgreSQL)
    participant QuotaSvc as 额度事务服务 (QuotaService)
    participant WFQ as 微风企 / 中台数据网关
    participant AI as AI 尽调分析引擎 (DeepSeek)

    User->>API: 1. 输入企业名称/税号，中台联想匹配后点击【发起 AI 尽调】
    API->>QuotaSvc: 2. 请求创建尽调任务 (校验用户有效性)
    
    rect rgb(240, 246, 255)
        Note over QuotaSvc, DB: 额度扣减强一致性事务 (行级锁/事务隔离)
        QuotaSvc->>DB: 3. 锁定并查询 User 记录，校验 balance_quota >= 1
        QuotaSvc->>DB: 4. User.balance_quota - 1, total_consumed_quota + 1
        QuotaSvc->>DB: 5. 插入【QUOTA_TRANSACTIONS】扣费流水 (-1 次, change_type='consume')
        QuotaSvc->>DB: 6. 插入【DD_TASKS】任务记录 (status='waiting_auth')
    end

    API-->>User: 7. 任务创建成功，返回任务详情与微风企法人授权二维码
    
    User->>WFQ: 8. 转发授权链接，企业法人微信扫码签署微风企数据授权
    WFQ-->>API: 9. 授权成功 Webhook 回调通知 (或前端/轮询触发)
    
    API->>DB: 10. 更新 DD_TASKS (auth_status='authorized', status='pulling_data')
    
    rect rgb(240, 253, 244)
        Note over API, AI: 异步数据清洗与 AI 深度研判
        API->>WFQ: 11. 调取中台工商涉诉、近24个月增值税申报底稿与多头借贷数据
        API->>DB: 12. 追加 AI 思考流日志 (Thinking Logs: 完成工商清洗、断票排查等)
        API->>AI: 13. 组装风控提示词 Prompt 与结构化底稿，调用 LLM 深度研判
        AI-->>API: 14. 交付风控评级、红黄牌、建议授信区间及综合研判评述
    end

    API->>DB: 15. 插入【DD_REPORTS】报告资产 (包含三栏图表看板与 raw_sources 原始底稿)
    API->>DB: 16. 更新 DD_TASKS (status='completed', report_id=rpt.id)
    
    User->>API: 17. 任务中心接收完成状态，点击【在线三栏交互阅读】
    API-->>User: 18. 返回三栏报告与双向底稿穿透数据 (支持点击指标联动高亮原始申报底稿)
```

---

## 4. 尽调任务全生命周期状态机 (Task State Machine)

```mermaid
%%{init: {'theme': 'neutral', 'themeVariables': { 'primaryColor': '#f8fafc', 'primaryTextColor': '#0f172a', 'primaryBorderColor': '#94a3b8', 'lineColor': '#475569' }}}%%
stateDiagram-v2
    [*] --> waiting_auth: 1. 用户发起尽调 (额度扣除-1次, 生成微风企二维码)
    
    waiting_auth --> pulling_data: 2. 法人微信扫码授权成功 (Webhook回调)
    waiting_auth --> cancelled: 用户手动取消任务 / 授权超时
    
    pulling_data --> ai_analyzing: 3. 中台工商涉诉与税务申报底稿拉取就绪
    
    ai_analyzing --> completed: 4. AI 研判完成，生成 DD_REPORTS 报告资产
    ai_analyzing --> failed: 5. 异常终止 (网络超时/大模型解析错误)
    
    cancelled --> [*]: 触发额度返还 (+1次流水)
    failed --> [*]: 触发额度自动返还 (+1次流水)
    completed --> [*]: 报告永久归档，支持调阅与导出
```

---

## 5. 核心字段与设计原则

### 5.1 额度资产强一致性保障
- **原子事务**：`User` 余额扣减与 `QUOTA_TRANSACTIONS` 流水生成在同一个数据库事务中执行。
- **自动逆向补偿机制**：在数据拉取（`pulling_data`）或 AI 研判（`ai_analyzing`）阶段若出现不可恢复的异常，调度服务自动触发反向补偿事务：
  - 任务状态标记为 `failed`；
  - 自动向 `QUOTA_TRANSACTIONS` 插入一条 `change_type='refund'`、`amount=+1` 的流水；
  - 将用户 `balance_quota` 恢复，并在备注中记录异常返还原因。

### 5.2 过程态与终态解耦
- **`DD_TASKS`（过程态）**：聚焦于记录**任务执行轨迹**（授权二维码状态、当前进行步骤、AI 思考流实时日志、生成耗时）。
- **`DD_REPORTS`（终态资产）**：聚焦于存储**完整的尽调成果与证据链**（基本信息、风控红黄牌清单、ECharts 开票营收趋势、下游集中度、以及右侧双向溯源底稿库 `raw_sources_json`）。
