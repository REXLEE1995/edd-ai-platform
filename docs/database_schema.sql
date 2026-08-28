-- ==============================================================================
-- EDD AI Platform (企业尽调系统) - 核心数据库 DDL 定义与全量中英文字段注释
-- 版本: v2.1.0
-- 支持引擎: MySQL 8.0+ / PostgreSQL 15+ / SQLite 3
-- 适用工具: Navicat, DBeaver, DataGrip, pgAdmin, SQLiteStudio 等可视化客户端
-- 特效说明: 兼容量产级 Navicat 软件【设计表/字段注释】视图与 DDL 预览中的中文字段注释原生显示
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. 前台注册用户表 (users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY COMMENT '用户唯一标识 UID (UUID)',
    phone VARCHAR(20) NOT NULL UNIQUE COMMENT '注册手机号（主登录账号）',
    hashed_password VARCHAR(255) COMMENT '密码哈希值 (PBKDF2-HMAC-SHA256)',
    wechat_openid VARCHAR(64) UNIQUE COMMENT '微信 OpenID (扫码授权绑定)',
    wechat_nickname VARCHAR(100) COMMENT '微信昵称',
    avatar_url VARCHAR(500) COMMENT '用户头像图片 URL',
    company_name VARCHAR(200) COMMENT '实名认证/所属企业主体名称',
    credit_code VARCHAR(50) COMMENT '企业统一社会信用代码 (18位)',
    balance_quota INTEGER NOT NULL DEFAULT 2 COMMENT '当前可用尽调额度余额 (次，新注册赠送2次)',
    total_recharge_quota INTEGER NOT NULL DEFAULT 0 COMMENT '累计充值额度总点数',
    total_consumed_quota INTEGER NOT NULL DEFAULT 0 COMMENT '累计已消耗尽调额度点数 (成功生成报告数)',
    total_gifted_quota INTEGER NOT NULL DEFAULT 2 COMMENT '累计系统赠送额度点数 (注册赠送/活动奖励)',
    status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '账号状态: active(正常) / frozen(已冻结，禁止登录和发起尽调)',
    tags JSON COMMENT '运营打标标签 JSON (如 ["VIP大客户", "金融信贷部"])',
    register_ip VARCHAR(50) COMMENT '注册时的客户端 IP 地址',
    last_login_ip VARCHAR(50) COMMENT '最后一次登录的客户端 IP 地址',
    last_login_at VARCHAR(50) COMMENT '最后一次登录时间戳字符串',
    remark VARCHAR(500) COMMENT '运营人员内部跟进备注',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账户创建注册时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账户最后更新时间'
) COMMENT='前台注册用户表（包含额度资产、认证企业与状态）';

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);


-- ------------------------------------------------------------------------------
-- 2. 管理后台管理员与角色权限表 (admin_users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(36) PRIMARY KEY COMMENT '管理员唯一标识 UID',
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '管理员登录账号（如 admin, operation）',
    hashed_password VARCHAR(255) NOT NULL COMMENT '密码哈希值 (PBKDF2-HMAC-SHA256)',
    real_name VARCHAR(50) NOT NULL COMMENT '管理员真实姓名/工号显示名',
    role VARCHAR(30) NOT NULL DEFAULT 'operation' COMMENT '角色: super_admin(超级管理员)/operation(运营主管)/support(客服)/finance(财务)',
    status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '账号状态: active(正常启用) / disabled(已禁用)',
    last_login_at VARCHAR(50) COMMENT '最后一次登录时间戳字符串',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账号创建时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账号最后更新时间'
) COMMENT='管理后台管理员账号与RBAC角色权限表';

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);


-- ------------------------------------------------------------------------------
-- 3. 全生命周期额度流水明细表 (quota_transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quota_transactions (
    id VARCHAR(36) PRIMARY KEY COMMENT '流水唯一主键 ID',
    tx_no VARCHAR(50) NOT NULL UNIQUE COMMENT '全局唯一流水业务单号 (如 QTX202608250001)',
    user_id VARCHAR(36) NOT NULL COMMENT '关联用户 UID',
    user_phone VARCHAR(20) NOT NULL COMMENT '用户手机号（冗余字段便于快速检索）',
    user_company VARCHAR(200) COMMENT '用户企业主体名称',
    change_type VARCHAR(30) NOT NULL COMMENT '变动类型: consume(尽调扣除)/recharge(线上充值)/gift(系统赠送)/refund(失败返还)/manual_add(线下对公调额)/manual_sub(人工核减)',
    amount INTEGER NOT NULL COMMENT '变动点数 (增加为正数如+10，扣除为负数如-1)',
    balance_before INTEGER NOT NULL COMMENT '变动前账户基准余额 (次)',
    balance_after INTEGER NOT NULL COMMENT '变动后账户最终余额 (次)',
    ref_type VARCHAR(30) NOT NULL DEFAULT 'task' COMMENT '关联单据类型: task(尽调任务)/order(充值订单)/adjust(调额工单)/system(系统事件)',
    ref_id VARCHAR(100) COMMENT '关联业务源单据编号 (如任务ID、订单号、对公工单号)',
    operator_type VARCHAR(20) NOT NULL DEFAULT 'system' COMMENT '操作主体类型: system(系统自动)/user(用户自助)/admin(管理员操作)',
    operator_id VARCHAR(36) COMMENT '操作人唯一 ID (管理员 UID 或 用户 UID)',
    operator_name VARCHAR(50) DEFAULT 'SYSTEM' COMMENT '操作人名称/渠道显示名 (如: SYSTEM、微信扫码、Admin-张运营)',
    ip_address VARCHAR(50) COMMENT '触发操作时的客户端 IP 地址',
    remark TEXT COMMENT '流水详细备注说明与凭证摘要',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '流水发生记录时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='全生命周期额度变动流水台账表（不可篡改，支持财务对账）';

CREATE INDEX IF NOT EXISTS idx_quota_tx_user_id ON quota_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_tx_tx_no ON quota_transactions(tx_no);
CREATE INDEX IF NOT EXISTS idx_quota_tx_change_type ON quota_transactions(change_type);


-- ------------------------------------------------------------------------------
-- 4. 管理员人工调额审核工单与凭据表 (quota_adjust_records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quota_adjust_records (
    id VARCHAR(36) PRIMARY KEY COMMENT '调额工单主键 ID',
    adjust_no VARCHAR(50) NOT NULL UNIQUE COMMENT '调额工单编号 (如 ADJ202608250001)',
    user_id VARCHAR(36) NOT NULL COMMENT '被调额的目标用户 UID',
    admin_id VARCHAR(36) NOT NULL COMMENT '经办管理员 UID',
    admin_name VARCHAR(50) NOT NULL COMMENT '经办管理员姓名',
    adjust_type VARCHAR(20) NOT NULL COMMENT '调额方式: add(增加) / sub(核减) / set(重置为指定值)',
    adjust_amount INTEGER NOT NULL COMMENT '本次调额变动数值 (点数)',
    reason_category VARCHAR(50) NOT NULL COMMENT '调额原因分类: offline_payment(线下对公打款)/business_gift(商务大客户赠送)/customer_compensation(客诉补偿)/manual_correction(误操作核减)/internal_test(内部测试)',
    proof_no VARCHAR(100) COMMENT '关联银行打款流水号/合同编号/工单号凭证',
    proof_image_url VARCHAR(500) COMMENT '上传的打款水单凭证截图附件 URL',
    remark TEXT NOT NULL COMMENT '调额详细背景说明（不少于5字）',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '工单提交时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='管理员人工调额工单与凭证审计表';

CREATE INDEX IF NOT EXISTS idx_quota_adj_user_id ON quota_adjust_records(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_adj_no ON quota_adjust_records(adjust_no);


-- ------------------------------------------------------------------------------
-- 5. AI 尽调任务表 - 生命周期过程态 (dd_tasks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dd_tasks (
    id VARCHAR(36) PRIMARY KEY COMMENT '任务唯一主键 ID',
    task_no VARCHAR(50) NOT NULL UNIQUE COMMENT '任务全局业务单号 (如 TSK202608250001)',
    user_id VARCHAR(36) NOT NULL COMMENT '发起任务的用户 UID',
    company_name VARCHAR(200) NOT NULL COMMENT '目标尽调企业全称',
    credit_code VARCHAR(50) NOT NULL COMMENT '目标企业统一社会信用代码 (18位)',
    legal_person VARCHAR(50) COMMENT '目标企业法定代表人姓名',
    scene VARCHAR(50) NOT NULL DEFAULT 'bank_credit' COMMENT '尽调场景模板: bank_credit(银行信贷审批)/supply_chain(供应链客户准入)/risk_scan(工商风险速查)',
    dimensions JSON COMMENT '勾选的分析研判维度列表 JSON (如 ["工商司法", "税务真实性", "多头借贷"])',
    auth_mode VARCHAR(30) NOT NULL DEFAULT 'weifengqi_qr' COMMENT '微风企授权模式: weifengqi_qr(生成法人授权二维码)/public_only(仅公开工商数据)',
    status VARCHAR(30) NOT NULL DEFAULT 'waiting_auth' COMMENT '生命周期状态: waiting_auth(等待法人授权)/pulling_data(拉取数据中)/ai_analyzing(AI推理中)/completed(已完成)/failed(异常终止)',
    auth_status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT '微风企法人授权状态: pending(待签署) / authorized(已授权签署) / expired(已超时)',
    authorized_at VARCHAR(50) COMMENT '法人首次完成实名授权的时间戳字符串 (如 2026-08-28 14:16:30)',
    auth_qrcode_url VARCHAR(500) COMMENT '微风企法人授权专属二维码图片 URL',
    auth_link VARCHAR(500) COMMENT '微风企法人授权专属移动端 H5 链接',
    thinking_logs JSON COMMENT 'AI 智能体实时思考流日志列表 JSON',
    report_id VARCHAR(36) COMMENT '生成完毕后关联的终态报告资产 ID (DDReport.id)',
    risk_level VARCHAR(20) COMMENT '最终综合研判风控评级: green(建议准入) / yellow(审慎关注) / red(一票否决)',
    error_message TEXT COMMENT '若任务异常终止时的错误原因详情',
    wfq_order_no VARCHAR(100) COMMENT '微风企外部业务订单号 (orderNo)',
    wfq_request_no VARCHAR(100) COMMENT '微风企外部请求流水号 (requestNo)',
    wfq_pdf_url VARCHAR(1000) COMMENT '微风企返回的原始远程报告 PDF 下载地址',
    storage_file_id VARCHAR(36) COMMENT '本地文件持久化存储关联存证 ID (dd_task_files.id)',
    completed_at VARCHAR(50) COMMENT '任务完成归档时间戳字符串',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '任务发起时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='AI尽调任务表（记录授权状态、清洗步骤与实时思考流日志）';

CREATE INDEX IF NOT EXISTS idx_dd_tasks_user_id ON dd_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_dd_tasks_task_no ON dd_tasks(task_no);
CREATE INDEX IF NOT EXISTS idx_dd_tasks_company ON dd_tasks(company_name);
CREATE INDEX IF NOT EXISTS idx_dd_tasks_status ON dd_tasks(status);


-- ------------------------------------------------------------------------------
-- 6. 尽调报告终态资产表 - 双向溯源 (dd_reports)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dd_reports (
    id VARCHAR(36) PRIMARY KEY COMMENT '报告资产主键 ID',
    report_no VARCHAR(50) NOT NULL UNIQUE COMMENT '报告全局业务编号 (如 RPT202608250001)',
    task_id VARCHAR(36) NOT NULL COMMENT '生成该报告的源尽调任务 ID',
    user_id VARCHAR(36) NOT NULL COMMENT '归属用户 UID',
    company_name VARCHAR(200) NOT NULL COMMENT '目标尽调企业全称',
    credit_code VARCHAR(50) NOT NULL COMMENT '目标企业统一社会信用代码',
    legal_person VARCHAR(50) COMMENT '法定代表人',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'green' COMMENT '风控准入评级: green(建议准入) / yellow(审慎关注) / red(一票否决)',
    score INTEGER NOT NULL DEFAULT 85 COMMENT '综合风控量化评分 (0-100)',
    suggested_quota_min INTEGER DEFAULT 300 COMMENT 'AI 测算建议授信下限额度 (万元)',
    suggested_quota_max INTEGER DEFAULT 500 COMMENT 'AI 测算建议授信上限额度 (万元)',
    summary_ai_comment TEXT COMMENT 'AI 核心风控综述与研判依据',
    content_json JSON NOT NULL COMMENT '报告完整看板 JSON (工商基础面、红黄牌列表、ECharts近24个月税务开票趋势、前五大客户集中度)',
    raw_sources_json JSON NOT NULL COMMENT '微风企税务纳税申报表、发票抽样明细与多头借贷征信原始申报底稿溯源库 JSON',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报告生成归档时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='尽调报告终态资产表（存储完整看板内容与微风企底稿溯源库）';

CREATE INDEX IF NOT EXISTS idx_dd_reports_user_id ON dd_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_dd_reports_task_id ON dd_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_dd_reports_company ON dd_reports(company_name);
CREATE INDEX IF NOT EXISTS idx_dd_reports_risk ON dd_reports(risk_level);


-- ------------------------------------------------------------------------------
-- 7. 额度加油包充值订单表 (orders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(36) PRIMARY KEY COMMENT '订单唯一主键 ID',
    order_no VARCHAR(50) NOT NULL UNIQUE COMMENT '平台订单业务单号 (如 ORD202608250001)',
    user_id VARCHAR(36) NOT NULL COMMENT '下单用户 UID',
    user_phone VARCHAR(20) NOT NULL COMMENT '下单用户手机号',
    package_id VARCHAR(50) NOT NULL COMMENT '购买套餐 ID (如 pack_single, pack_10, pack_50)',
    package_name VARCHAR(100) NOT NULL COMMENT '套餐显示名称 (如 标准加油包 10次)',
    amount FLOAT NOT NULL COMMENT '实际应付金额 (元，如 880.00)',
    quota_points INTEGER NOT NULL COMMENT '购买充值的尽调额度点数 (次，如 10)',
    pay_type VARCHAR(20) NOT NULL DEFAULT 'wechat' COMMENT '支付渠道: wechat(微信扫码支付) / alipay(支付宝) / offline(对公转账)',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '支付状态: pending(待支付) / paid(已支付) / cancelled(已取消) / refunded(已退款)',
    third_trade_no VARCHAR(100) COMMENT '第三方支付网关流水号 (微信/支付宝交易单号)',
    paid_at VARCHAR(50) COMMENT '支付成功完成时间戳字符串',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '订单创建时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='额度充值订单表（微信/支付宝线上支付与线下对公记录）';

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);


-- ------------------------------------------------------------------------------
-- 8. 增值税发票申请表 (invoices)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(36) PRIMARY KEY COMMENT '发票申请主键 ID',
    invoice_no VARCHAR(50) NOT NULL UNIQUE COMMENT '发票业务申请单号',
    user_id VARCHAR(36) NOT NULL COMMENT '申请用户 UID',
    order_id VARCHAR(36) NOT NULL COMMENT '关联的充值支付订单 ID',
    title VARCHAR(200) NOT NULL COMMENT '发票抬头（企业全称或个人姓名）',
    tax_number VARCHAR(50) NOT NULL COMMENT '纳税人识别号/统一社会信用代码',
    amount FLOAT NOT NULL COMMENT '开票金额 (元)',
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'vat_normal' COMMENT '发票类型: vat_normal(增值税电子普票) / vat_special(增值税专用发票)',
    email VARCHAR(100) NOT NULL COMMENT '接收电子发票 PDF 的邮箱地址',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '开票状态: pending(待开票) / issued(已开具并发送) / rejected(已驳回)',
    pdf_url VARCHAR(500) COMMENT '开具成功的电子发票 PDF 下载地址',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请提交时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='增值税普通发票与专用发票开具申请表';

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);


-- ------------------------------------------------------------------------------
-- 9. 全站管理后台高危操作审计日志表 (admin_audit_logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id VARCHAR(36) PRIMARY KEY COMMENT '审计日志唯一主键 ID',
    admin_id VARCHAR(36) NOT NULL COMMENT '操作管理员 UID',
    admin_name VARCHAR(50) NOT NULL COMMENT '操作管理员姓名',
    module VARCHAR(50) NOT NULL COMMENT '功能模块: users(用户管理) / quota(额度管控) / orders(订单审核) / system(系统配置)',
    action VARCHAR(50) NOT NULL COMMENT '执行动作: adjust_quota(人工调额) / freeze_user(冻结用户) / export_data(导出报表)',
    target_id VARCHAR(100) COMMENT '受影响目标对象唯一 ID (如目标用户 UID 或 订单单号)',
    target_name VARCHAR(200) COMMENT '受影响目标对象名称/手机号',
    details JSON COMMENT '操作详情与变动前后 Diff 镜像 JSON',
    ip_address VARCHAR(50) COMMENT '管理员发起操作时的客户端 IP 地址',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作发生时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='全站管理员高危操作审计日志表（防篡改、安全合规追溯）';

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_module ON admin_audit_logs(module);


-- ------------------------------------------------------------------------------
-- 10. 尽调任务文件存证与物理存储记录表 (dd_task_files)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dd_task_files (
    id VARCHAR(36) PRIMARY KEY COMMENT '文件唯一主键 ID (UUID)',
    task_id VARCHAR(36) NOT NULL COMMENT '关联的尽调任务 ID',
    report_id VARCHAR(36) COMMENT '关联的尽调报告 ID',
    file_type VARCHAR(50) NOT NULL DEFAULT 'wfq_preloan_pdf' COMMENT '文件业务类型: wfq_preloan_pdf(微风企贷前报告PDF) / audit_proof(存证底稿)',
    filename VARCHAR(255) NOT NULL COMMENT '原始文件名 (如 微风企贷前报告12345678.pdf)',
    file_path VARCHAR(500) NOT NULL COMMENT '本地文件存储绝对路径或相对路径',
    file_size BIGINT NOT NULL DEFAULT 0 COMMENT '文件大小 (字节 Bytes)',
    file_hash VARCHAR(64) COMMENT '文件 SHA-256 哈希校验值 (防篡改数字存证)',
    mime_type VARCHAR(100) DEFAULT 'application/pdf' COMMENT '文件 MIME 类型 (如 application/pdf)',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '文件写入归档时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='任务文件与报告PDF物理存储存证记录表';

CREATE INDEX IF NOT EXISTS idx_dd_task_files_task_id ON dd_task_files(task_id);
CREATE INDEX IF NOT EXISTS idx_dd_task_files_report_id ON dd_task_files(report_id);


-- ------------------------------------------------------------------------------
-- 11. 三方数据源与外部接口字典配置表 (sys_third_party_apis)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sys_third_party_apis (
    id VARCHAR(36) PRIMARY KEY COMMENT '主键 ID',
    api_code VARCHAR(50) NOT NULL UNIQUE COMMENT '接口代码 (如 WFQ_AUTH, WFQ_REPORT_STATUS, WFQ_REPORT_PDF_URL)',
    api_name VARCHAR(100) NOT NULL COMMENT '接口名称 (如 微风企获取授权链接接口)',
    provider_name VARCHAR(50) NOT NULL COMMENT '所属服务商/供应商 (如 weifengqi / enterprise_ic / risk_radar)',
    call_mode VARCHAR(30) NOT NULL DEFAULT 'mock' COMMENT '调用模式: mock(本地模拟网关) / http(真实网络请求)',
    endpoint_url VARCHAR(500) NOT NULL COMMENT '接口请求端点完整 URL',
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST' COMMENT 'HTTP 请求方式: GET / POST',
    lifecycle_type VARCHAR(30) NOT NULL DEFAULT 'interactive_interrupt' COMMENT '取数生命周期类型: direct_fetch(直接拉取) / interactive_interrupt(断层中断-需要授权)',
    auth_params JSON COMMENT '三方认证参数配置 JSON (AppKey, AppSecret 等)',
    request_headers_template JSON COMMENT '默认请求头模版 JSON',
    response_mapping_rules JSON COMMENT '响应字段映射与准错拦截提取规则 JSON',
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE COMMENT '接口状态: true(正常启用) / false(下线禁用)',
    remark VARCHAR(500) COMMENT '三方接口对接说明与接入文档链接',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '接口创建注册时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间'
) COMMENT='三方数据源与外部接口字典配置表';

CREATE INDEX IF NOT EXISTS idx_sys_third_party_api_code ON sys_third_party_apis(api_code);
