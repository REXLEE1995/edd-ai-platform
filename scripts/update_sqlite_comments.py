import os
import sqlite3

TABLE_DDLS = {
    "users": """-- 表描述: 前台注册用户表（包含额度资产、认证企业与状态）
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 用户唯一标识 UID (UUID)
    phone VARCHAR(20) NOT NULL UNIQUE,                                -- [登录] 注册手机号（主登录账号）
    hashed_password VARCHAR(255),                                     -- [安全] 密码哈希值 (PBKDF2-HMAC-SHA256)
    wechat_openid VARCHAR(64) UNIQUE,                                 -- [微信] 微信 OpenID (扫码授权绑定)
    wechat_nickname VARCHAR(100),                                     -- [微信] 微信昵称
    avatar_url VARCHAR(500),                                          -- [基本] 用户头像图片 URL
    company_name VARCHAR(200),                                        -- [企业] 实名认证/所属企业主体名称
    credit_code VARCHAR(50),                                          -- [企业] 企业统一社会信用代码 (18位)
    balance_quota INTEGER NOT NULL DEFAULT 2,                         -- [资产] 当前可用尽调额度余额 (次，新注册赠送2次)
    total_recharge_quota INTEGER NOT NULL DEFAULT 0,                  -- [资产] 累计充值额度总点数
    total_consumed_quota INTEGER NOT NULL DEFAULT 0,                  -- [资产] 累计已消耗尽调额度点数 (成功生成报告数)
    total_gifted_quota INTEGER NOT NULL DEFAULT 2,                    -- [资产] 累计系统赠送额度点数 (注册赠送/活动奖励)
    status VARCHAR(20) NOT NULL DEFAULT 'active',                     -- [状态] 账号状态: active(正常) / frozen(已冻结，禁止登录和发起尽调)
    tags JSON,                                                        -- [运营] 运营打标标签 JSON (如 ["VIP大客户", "金融信贷部"])
    register_ip VARCHAR(50),                                          -- [审计] 注册时的客户端 IP 地址
    last_login_ip VARCHAR(50),                                         -- [审计] 最后一次登录的客户端 IP 地址
    last_login_at VARCHAR(50),                                         -- [审计] 最后一次登录时间戳字符串
    remark VARCHAR(500),                                              -- [运营] 运营人员内部跟进备注
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 账户创建注册时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 账户最后更新时间
)""",

    "admin_users": """-- 表描述: 管理后台管理员账号与RBAC角色权限表
CREATE TABLE admin_users (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 管理员唯一标识 UID
    username VARCHAR(50) NOT NULL UNIQUE,                             -- [登录] 管理员登录账号 (如 admin, operation)
    hashed_password VARCHAR(255) NOT NULL,                            -- [安全] 密码哈希值 (PBKDF2-HMAC-SHA256)
    real_name VARCHAR(50) NOT NULL,                                   -- [身份] 管理员真实姓名/工号显示名
    role VARCHAR(30) NOT NULL DEFAULT 'operation',                    -- [权限] 角色: super_admin(超级管理员)/operation(运营主管)/support(客服)/finance(财务)
    status VARCHAR(20) NOT NULL DEFAULT 'active',                     -- [状态] 状态: active(正常启用) / disabled(已禁用)
    last_login_at VARCHAR(50),                                         -- [审计] 最后一次登录时间戳字符串
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 账号创建时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 账号最后更新时间
)""",

    "quota_transactions": """-- 表描述: 全生命周期额度变动流水台账表（不可篡改，支持财务对账）
CREATE TABLE quota_transactions (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 流水唯一标识 ID
    tx_no VARCHAR(50) NOT NULL UNIQUE,                                -- [单号] 全局唯一流水业务单号 (如 QTX202608250001)
    user_id VARCHAR(36) NOT NULL,                                     -- [关联] 关联用户 UID
    user_phone VARCHAR(20) NOT NULL,                                  -- [关联] 用户手机号 (冗余便于快速检索)
    user_company VARCHAR(200),                                        -- [关联] 用户企业主体名称
    change_type VARCHAR(30) NOT NULL,                                 -- [类型] 变动类型: consume(尽调扣除)/recharge(线上充值)/gift(系统赠送)/refund(失败返还)/manual_add(线下对公调额)/manual_sub(核减)
    amount INTEGER NOT NULL,                                          -- [数值] 变动点数 (增加为正数如+10，扣除为负数如-1)
    balance_before INTEGER NOT NULL,                                  -- [对账] 变动前账户基准余额 (次)
    balance_after INTEGER NOT NULL,                                   -- [对账] 变动后账户最终余额 (次)
    ref_type VARCHAR(30) NOT NULL DEFAULT 'task',                     -- [溯源] 关联单据类型: task(尽调任务)/order(订单)/adjust(调额工单)/system(系统)
    ref_id VARCHAR(100),                                              -- [溯源] 关联业务源单据编号 (如任务ID、订单号、调额单号)
    operator_type VARCHAR(20) NOT NULL DEFAULT 'system',              -- [主体] 操作主体类型: system(系统)/user(用户自助)/admin(管理员操作)
    operator_id VARCHAR(36),                                          -- [主体] 操作人 UID
    operator_name VARCHAR(50) DEFAULT 'SYSTEM',                       -- [主体] 操作人名称/渠道显示名 (如: SYSTEM、微信支付、Admin-张运营)
    ip_address VARCHAR(50),                                           -- [审计] 客户端 IP 地址
    remark TEXT,                                                      -- [备注] 流水详细备注说明与凭据摘要
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 流水发生记录时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 最后更新时间
)""",

    "quota_adjust_records": """-- 表描述: 管理员人工调额工单与凭证审计表
CREATE TABLE quota_adjust_records (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 调额工单主键 ID
    adjust_no VARCHAR(50) NOT NULL UNIQUE,                            -- [单号] 调额工单全局单号 (如 ADJ202608250001)
    user_id VARCHAR(36) NOT NULL,                                     -- [关联] 被调额目标用户 UID
    admin_id VARCHAR(36) NOT NULL,                                    -- [经办] 经办管理员 UID
    admin_name VARCHAR(50) NOT NULL,                                  -- [经办] 经办管理员姓名
    adjust_type VARCHAR(20) NOT NULL,                                 -- [方式] 调额方式: add(增加)/sub(核减)/set(重置为指定值)
    adjust_amount INTEGER NOT NULL,                                   -- [数值] 本次调额变动数值 (点数)
    reason_category VARCHAR(50) NOT NULL,                             -- [原因] 原因分类: offline_payment(线下对公)/business_gift(大客户赠送)/customer_compensation(客诉补偿)/manual_correction(误操作核减)/internal_test(内部测试)
    proof_no VARCHAR(100),                                            -- [凭证] 关联银行打款流水号/合同号/工单号
    proof_image_url VARCHAR(500),                                     -- [凭据] 上传的打款水单凭证截图 URL
    remark TEXT NOT NULL,                                             -- [说明] 调额详细背景说明 (不少于5字)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 工单提交时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 最后更新时间
)""",

    "dd_tasks": """-- 表描述: AI尽调任务表（记录授权状态、清洗步骤与实时思考流日志）
CREATE TABLE dd_tasks (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 任务唯一主键 ID
    task_no VARCHAR(50) NOT NULL UNIQUE,                              -- [单号] 任务业务单号 (如 TSK202608250001)
    user_id VARCHAR(36) NOT NULL,                                     -- [用户] 发起用户 UID
    company_name VARCHAR(200) NOT NULL,                               -- [企业] 目标尽调企业全称
    credit_code VARCHAR(50) NOT NULL,                                 -- [企业] 目标企业统一社会信用代码 (18位)
    legal_person VARCHAR(50),                                         -- [企业] 法定代表人
    scene VARCHAR(50) NOT NULL DEFAULT 'bank_credit',                 -- [场景] 尽调场景模板: bank_credit(信贷审批)/supply_chain(供应链准入)/risk_scan(风险速查)
    dimensions JSON,                                                  -- [配置] 勾选的分析研判维度列表 JSON
    auth_mode VARCHAR(30) NOT NULL DEFAULT 'weifengqi_qr',            -- [模式] 授权模式: weifengqi_qr(生成法人微风企二维码)/public_only(仅公开工商涉诉)
    status VARCHAR(30) NOT NULL DEFAULT 'waiting_auth',               -- [状态] 状态: waiting_auth(等授权)/pulling_data(拉取中)/ai_analyzing(AI推理中)/completed(完成)/failed(失败)/cancelled(取消)
    auth_status VARCHAR(30) NOT NULL DEFAULT 'pending',               -- [授权] 微风企授权状态: pending(待签署)/authorized(已授权)/expired(已超时)
    authorized_at VARCHAR(50),                                         -- [授权] 法人首次完成实名授权的时间戳字符串 (如 2026-08-28 14:16:30)
    auth_qrcode_url VARCHAR(500),                                     -- [授权] 微风企法人授权专属二维码图片 URL
    auth_link VARCHAR(500),                                           -- [授权] 微风企法人授权专属 H5 链接
    thinking_logs JSON,                                               -- [思考] AI智能体实时思考流日志列表 JSON
    report_id VARCHAR(36),                                            -- [资产] 生成完毕后关联的报告资产 ID (DDReport.id)
    risk_level VARCHAR(20),                                           -- [结论] 最终风控评级: green(建议准入)/yellow(审慎关注)/red(一票否决)
    error_message TEXT,                                               -- [异常] 若异常终止时的错误原因详情
    wfq_order_no VARCHAR(100),                                        -- [外部] 微风企外部业务订单号 (orderNo)
    wfq_request_no VARCHAR(100),                                      -- [外部] 微风企外部请求流水号 (requestNo)
    wfq_pdf_url VARCHAR(1000),                                        -- [远程] 微风企返回的原始远程报告 PDF 下载地址
    storage_file_id VARCHAR(36),                                      -- [存证] 本地文件持久化存储关联存证 ID (dd_task_files.id)
    completed_at VARCHAR(50),                                         -- [时间] 任务完成时间戳字符串
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 任务发起创建时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 任务最后更新时间
)""",

    "dd_reports": """-- 表描述: 尽调报告终态资产表（存储完整看板内容与微风企底稿溯源库）
CREATE TABLE dd_reports (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 报告资产唯一 ID
    report_no VARCHAR(50) NOT NULL UNIQUE,                            -- [单号] 报告全局业务编号 (如 RPT202608250001)
    task_id VARCHAR(36) NOT NULL,                                     -- [溯源] 生成该报告的源尽调任务 ID
    user_id VARCHAR(36) NOT NULL,                                     -- [用户] 归属用户 UID
    company_name VARCHAR(200) NOT NULL,                               -- [企业] 目标尽调企业全称
    credit_code VARCHAR(50) NOT NULL,                                 -- [企业] 目标企业统一信用代码
    legal_person VARCHAR(50),                                         -- [企业] 法定代表人
    risk_level VARCHAR(20) NOT NULL DEFAULT 'green',                  -- [评级] 风控准入评级: green(建议准入)/yellow(审慎关注)/red(一票否决)
    score INTEGER NOT NULL DEFAULT 85,                                -- [评分] 综合风控量化评分 (0-100)
    suggested_quota_min INTEGER DEFAULT 300,                          -- [额度] AI 测算建议授信下限 (万元)
    suggested_quota_max INTEGER DEFAULT 500,                          -- [额度] AI 测算建议授信上限 (万元)
    summary_ai_comment TEXT,                                          -- [综述] AI 核心风控综述与研判结论
    content_json JSON NOT NULL,                                       -- [看板] 报告完整看板 JSON (工商、红黄牌、ECharts开票趋势、集中度)
    raw_sources_json JSON NOT NULL,                                   -- [底稿] 微风企纳税申报表、发票抽样与多头借贷征信原始底稿双向溯源库 JSON
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 报告生成归档时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 报告最后更新时间
)""",

    "orders": """-- 表描述: 额度充值订单表（微信/支付宝线上支付与线下对公记录）
CREATE TABLE orders (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 订单唯一主键 ID
    order_no VARCHAR(50) NOT NULL UNIQUE,                             -- [单号] 平台订单业务单号 (如 ORD202608250001)
    user_id VARCHAR(36) NOT NULL,                                     -- [用户] 下单用户 UID
    user_phone VARCHAR(20) NOT NULL,                                  -- [用户] 下单用户手机号
    package_id VARCHAR(50) NOT NULL,                                  -- [套餐] 购买套餐 ID (如 pack_single, pack_10, pack_50)
    package_name VARCHAR(100) NOT NULL,                               -- [套餐] 套餐显示名称 (如 标准加油包 10次)
    amount FLOAT NOT NULL,                                            -- [金额] 实际应付金额 (元，如 880.00)
    quota_points INTEGER NOT NULL,                                    -- [点数] 充值尽调额度点数 (次，如 10)
    pay_type VARCHAR(20) NOT NULL DEFAULT 'wechat',                   -- [支付] 渠道: wechat(微信扫码)/alipay(支付宝)/offline(对公转账)
    status VARCHAR(20) NOT NULL DEFAULT 'pending',                    -- [状态] 状态: pending(待支付)/paid(已支付)/cancelled(已取消)/refunded(已退款)
    third_trade_no VARCHAR(100),                                      -- [网关] 第三方支付流水号 (微信/支付宝交易单号)
    paid_at VARCHAR(50),                                              -- [时间] 支付完成时间戳字符串
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 订单创建时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 订单最后更新时间
)""",

    "invoices": """-- 表描述: 增值税普通发票与专用发票开具申请表
CREATE TABLE invoices (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 发票申请主键 ID
    invoice_no VARCHAR(50) NOT NULL UNIQUE,                           -- [单号] 发票业务申请单号
    user_id VARCHAR(36) NOT NULL,                                     -- [用户] 申请用户 UID
    order_id VARCHAR(36) NOT NULL,                                    -- [关联] 关联的充值支付订单 ID
    title VARCHAR(200) NOT NULL,                                      -- [抬头] 发票抬头 (企业全称或个人姓名)
    tax_number VARCHAR(50) NOT NULL,                                  -- [税号] 纳税人识别号/统一社会信用代码
    amount FLOAT NOT NULL,                                            -- [金额] 开票金额 (元)
    invoice_type VARCHAR(20) NOT NULL DEFAULT 'vat_normal',           -- [类型] 类型: vat_normal(增值税电子普票)/vat_special(增值税专票)
    email VARCHAR(100) NOT NULL,                                      -- [交付] 接收电子发票 PDF 的邮箱地址
    status VARCHAR(20) NOT NULL DEFAULT 'pending',                    -- [状态] 状态: pending(待开票)/issued(已开具并发送)/rejected(已驳回)
    pdf_url VARCHAR(500),                                             -- [交付] 开具成功的电子发票 PDF 下载地址
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 申请时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 最后更新时间
)""",

    "admin_audit_logs": """-- 表描述: 全站管理员高危操作审计日志表（防篡改、安全合规追溯）
CREATE TABLE admin_audit_logs (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 审计日志唯一主键 ID
    admin_id VARCHAR(36) NOT NULL,                                    -- [经办] 操作管理员 UID
    admin_name VARCHAR(50) NOT NULL,                                  -- [经办] 操作管理员姓名
    module VARCHAR(50) NOT NULL,                                      -- [模块] 模块: users(用户)/quota(额度)/orders(订单)/system(系统)
    action VARCHAR(50) NOT NULL,                                      -- [动作] 动作: adjust_quota(调额)/freeze_user(冻结)/export_data(导出)等
    target_id VARCHAR(100),                                           -- [目标] 受影响目标对象唯一 ID (如用户UID或订单号)
    target_name VARCHAR(200),                                         -- [目标] 受影响目标对象名称/手机号
    details JSON,                                                     -- [明细] 操作详情与 Diff 镜像 JSON (如 {"before": 2, "after": 12})
    ip_address VARCHAR(50),                                           -- [审计] 管理员客户端 IP 地址
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 操作发生时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 最后更新时间
)""",

    "dd_task_files": """-- 表描述: 任务文件与报告PDF物理存储存证记录表
CREATE TABLE dd_task_files (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 文件唯一主键 ID (UUID)
    task_id VARCHAR(36) NOT NULL,                                     -- [关联] 关联的尽调任务 ID
    report_id VARCHAR(36),                                            -- [关联] 关联的尽调报告 ID
    file_type VARCHAR(50) NOT NULL DEFAULT 'wfq_preloan_pdf',         -- [类型] 文件业务类型: wfq_preloan_pdf(微风企贷前报告PDF)/audit_proof(存证底稿)
    filename VARCHAR(255) NOT NULL,                                   -- [文件] 原始文件名 (如 微风企贷前报告12345678.pdf)
    file_path VARCHAR(500) NOT NULL,                                  -- [路径] 本地文件存储绝对路径或相对路径
    file_size BIGINT NOT NULL DEFAULT 0,                              -- [大小] 文件大小 (字节 Bytes)
    file_hash VARCHAR(64),                                            -- [哈希] 文件 SHA-256 哈希校验值 (防篡改数字存证)
    mime_type VARCHAR(100) DEFAULT 'application/pdf',                 -- [格式] 文件 MIME 类型 (如 application/pdf)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 文件写入归档时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 最后更新时间
)""",

    "sys_third_party_apis": """-- 表描述: 三方数据源与外部接口字典配置表
CREATE TABLE sys_third_party_apis (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 主键 ID
    api_code VARCHAR(50) NOT NULL UNIQUE,                             -- [代码] 接口全局代码 (如 WFQ_AUTH, WFQ_REPORT_STATUS)
    api_name VARCHAR(100) NOT NULL,                                   -- [名称] 接口名称 (如 微风企获取授权链接接口)
    provider_name VARCHAR(50) NOT NULL,                               -- [厂商] 所属服务商/供应商 (如 weifengqi)
    call_mode VARCHAR(30) NOT NULL DEFAULT 'mock',                    -- [模式] 调用模式: mock(本地模拟网关)/http(真实网络请求)
    endpoint_url VARCHAR(500) NOT NULL,                               -- [端点] 接口请求端点完整 URL
    http_method VARCHAR(10) NOT NULL DEFAULT 'POST',                  -- [方式] HTTP 请求方式: GET / POST
    lifecycle_type VARCHAR(30) NOT NULL DEFAULT 'interactive_interrupt',-- [周期] 取数生命周期类型: direct_fetch(直接拉取)/interactive_interrupt(需授权)
    auth_params JSON,                                                 -- [配置] 三方认证参数配置 JSON
    request_headers_template JSON,                                    -- [模版] 默认请求头模版 JSON
    response_mapping_rules JSON,                                      -- [规则] 响应字段映射与准错拦截提取规则 JSON
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,                         -- [状态] 接口状态: true(正常启用)/false(下线禁用)
    remark VARCHAR(500),                                              -- [说明] 三方接口对接说明与接入文档链接
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 接口创建注册时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 最后更新时间
)"""
}

def update_sqlite_db(db_path):
    if not os.path.exists(db_path):
        return
    print(f"Updating sqlite_master DDL comments in: {db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA writable_schema = ON;")
    for tbl_name, new_ddl in TABLE_DDLS.items():
        cursor.execute("UPDATE sqlite_master SET sql = ? WHERE type = 'table' AND name = ?", (new_ddl, tbl_name))
    conn.commit()
    cursor.execute("PRAGMA writable_schema = OFF;")
    conn.close()
    print(f"Successfully updated comments for {len(TABLE_DDLS)} tables in {db_path}!")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    update_sqlite_db(os.path.join(base_dir, "backend", "data", "edd_dev.db"))
    update_sqlite_db(os.path.join(base_dir, "backend", "edd_platform.db"))
