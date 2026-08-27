-- ==============================================================================
-- EDD AI Platform (企业尽调系统) - 核心数据库 DDL 定义与全量中英文字段注释
-- 版本: v2.1
-- 支持引擎: PostgreSQL 15+ / MySQL 8.0+ / SQLite 3
-- 适用工具: DBeaver, Navicat, DataGrip, pgAdmin, SQLiteStudio 等可视化工具
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. 前台注册用户表 (users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
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
    last_login_at VARCHAR(50),                                         -- [审计] 最后一次登录时间戳
    remark VARCHAR(500),                                              -- [运营] 运营人员内部跟进备注
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 账户创建注册时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 账户最后更新时间
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

COMMENT ON TABLE users IS '前台注册用户表（包含额度资产、认证企业与状态）';
COMMENT ON COLUMN users.id IS '用户唯一标识 UID';
COMMENT ON COLUMN users.phone IS '注册手机号（主登录账号）';
COMMENT ON COLUMN users.hashed_password IS '密码哈希值（PBKDF2-HMAC-SHA256）';
COMMENT ON COLUMN users.wechat_openid IS '微信 OpenID（微信扫码授权绑定）';
COMMENT ON COLUMN users.wechat_nickname IS '微信昵称';
COMMENT ON COLUMN users.avatar_url IS '用户头像图片地址';
COMMENT ON COLUMN users.company_name IS '实名认证/所属企业全称';
COMMENT ON COLUMN users.credit_code IS '企业统一社会信用代码 (18位)';
COMMENT ON COLUMN users.balance_quota IS '当前可用尽调额度余额 (次，新用户注册默认赠送 2 次)';
COMMENT ON COLUMN users.total_recharge_quota IS '累计充值额度总点数 (包含线上支付与线下对公转账入账)';
COMMENT ON COLUMN users.total_consumed_quota IS '累计已消耗尽调额度点数 (成功生成报告数)';
COMMENT ON COLUMN users.total_gifted_quota IS '累计系统赠送额度点数 (注册赠送/活动奖励)';
COMMENT ON COLUMN users.status IS '账号状态: active(正常) / frozen(已冻结，禁止登录和发起尽调)';
COMMENT ON COLUMN users.tags IS '运营打标列表 JSON (如 ["VIP客户", "金融信贷部", "高频客户"])';
COMMENT ON COLUMN users.register_ip IS '注册时的客户端 IP 地址';
COMMENT ON COLUMN users.last_login_ip IS '最后一次登录的客户端 IP 地址';
COMMENT ON COLUMN users.last_login_at IS '最后一次登录时间戳字符串';
COMMENT ON COLUMN users.remark IS '运营人员内部跟进备注';
COMMENT ON COLUMN users.created_at IS '创建注册时间';
COMMENT ON COLUMN users.updated_at IS '最后更新时间';


-- ------------------------------------------------------------------------------
-- 2. 管理后台管理员与角色权限表 (admin_users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 管理员唯一标识 UID
    username VARCHAR(50) NOT NULL UNIQUE,                             -- [登录] 管理员登录账号 (如 admin, operation)
    hashed_password VARCHAR(255) NOT NULL,                            -- [安全] 密码哈希值 (PBKDF2-HMAC-SHA256)
    real_name VARCHAR(50) NOT NULL,                                   -- [身份] 管理员真实姓名/工号显示名
    role VARCHAR(30) NOT NULL DEFAULT 'operation',                    -- [权限] 角色: super_admin(超级管理员)/operation(运营)/support(客服)/finance(财务)
    status VARCHAR(20) NOT NULL DEFAULT 'active',                     -- [状态] 状态: active(正常启用) / disabled(已禁用)
    last_login_at VARCHAR(50),                                         -- [审计] 最后登录时间戳
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 账号创建时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 账号最后更新时间
);

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);

COMMENT ON TABLE admin_users IS '管理后台管理员账号与RBAC角色权限表';
COMMENT ON COLUMN admin_users.id IS '管理员唯一标识 UID';
COMMENT ON COLUMN admin_users.username IS '管理员登录账号（如 admin, operation）';
COMMENT ON COLUMN admin_users.hashed_password IS '管理员密码哈希值（PBKDF2-HMAC-SHA256）';
COMMENT ON COLUMN admin_users.real_name IS '管理员真实姓名/工号显示名';
COMMENT ON COLUMN admin_users.role IS '角色权限: super_admin(超级管理员) / operation(运营主管) / support(客服) / finance(财务)';
COMMENT ON COLUMN admin_users.status IS '账号状态: active(正常启用) / disabled(已禁用)';
COMMENT ON COLUMN admin_users.last_login_at IS '最后一次登录时间戳字符串';
COMMENT ON COLUMN admin_users.created_at IS '账号创建时间';
COMMENT ON COLUMN admin_users.updated_at IS '最后更新时间';


-- ------------------------------------------------------------------------------
-- 3. 全生命周期额度流水明细表 (quota_transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quota_transactions (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 流水唯一标识 ID
    tx_no VARCHAR(50) NOT NULL UNIQUE,                                -- [单号] 全局唯一流水业务单号 (如 QTX202608250001)
    user_id VARCHAR(36) NOT NULL,                                     -- [关联] 关联用户 UID
    user_phone VARCHAR(20) NOT NULL,                                  -- [关联] 用户手机号 (冗余便于快速检索)
    user_company VARCHAR(200),                                        -- [关联] 用户所属企业名称
    change_type VARCHAR(30) NOT NULL,                                 -- [类型] 变动类型: consume(扣费)/recharge(充值)/gift(赠送)/refund(退还)/manual_add(加额)/manual_sub(核减)
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
);

CREATE INDEX IF NOT EXISTS idx_quota_tx_user_id ON quota_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_tx_tx_no ON quota_transactions(tx_no);
CREATE INDEX IF NOT EXISTS idx_quota_tx_change_type ON quota_transactions(change_type);

COMMENT ON TABLE quota_transactions IS '全生命周期额度变动流水台账表（不可篡改，支持财务对账）';
COMMENT ON COLUMN quota_transactions.id IS '流水唯一主键 ID';
COMMENT ON COLUMN quota_transactions.tx_no IS '全局唯一流水业务单号 (如 QTX202608250001)';
COMMENT ON COLUMN quota_transactions.user_id IS '关联用户 UID';
COMMENT ON COLUMN quota_transactions.user_phone IS '用户手机号（冗余字段便于快速检索）';
COMMENT ON COLUMN quota_transactions.user_company IS '用户企业主体名称';
COMMENT ON COLUMN quota_transactions.change_type IS '变动业务类型: consume(尽调扣除) / recharge(线上充值) / gift(系统赠送) / refund(失败返还) / manual_add(线下对公调额) / manual_sub(人工核减)';
COMMENT ON COLUMN quota_transactions.amount IS '变动点数 (增加为正数如+10，扣除为负数如-1)';
COMMENT ON COLUMN quota_transactions.balance_before IS '变动前账户基准余额 (次)';
COMMENT ON COLUMN quota_transactions.balance_after IS '变动后账户最终余额 (次)';
COMMENT ON COLUMN quota_transactions.ref_type IS '关联业务单据类型: task(尽调任务) / order(充值订单) / adjust(调额工单) / system(系统事件)';
COMMENT ON COLUMN quota_transactions.ref_id IS '关联业务源单据编号 (如任务ID、订单号、对公工单号)';
COMMENT ON COLUMN quota_transactions.operator_type IS '操作主体类型: system(系统自动) / user(用户自助) / admin(管理员操作)';
COMMENT ON COLUMN quota_transactions.operator_id IS '操作人唯一 ID (管理员 UID 或 用户 UID)';
COMMENT ON COLUMN quota_transactions.operator_name IS '操作人名称/渠道显示名 (如: SYSTEM、微信扫码、Admin-张运营)';
COMMENT ON COLUMN quota_transactions.ip_address IS '触发操作时的客户端 IP 地址';
COMMENT ON COLUMN quota_transactions.remark IS '流水详细备注说明与凭证摘要';
COMMENT ON COLUMN quota_transactions.created_at IS '流水发生时间';
COMMENT ON COLUMN quota_transactions.updated_at IS '最后更新时间';


-- ------------------------------------------------------------------------------
-- 4. 管理员人工调额审核工单与凭据表 (quota_adjust_records)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quota_adjust_records (
    id VARCHAR(36) PRIMARY KEY,                                      -- [主键] 调额工单主键 ID
    adjust_no VARCHAR(50) NOT NULL UNIQUE,                            -- [单号] 调额工单全局单号 (如 ADJ202608250001)
    user_id VARCHAR(36) NOT NULL,                                     -- [关联] 被调额目标用户 UID
    admin_id VARCHAR(36) NOT NULL,                                    -- [经办] 经办管理员 UID
    admin_name VARCHAR(50) NOT NULL,                                  -- [经办] 经办管理员姓名
    adjust_type VARCHAR(20) NOT NULL,                                 -- [方式] 调额方式: add(增加)/sub(核减)/set(重置为指定值)
    adjust_amount INTEGER NOT NULL,                                   -- [数值] 本次调额变动数值 (点数)
    reason_category VARCHAR(50) NOT NULL,                             -- [原因] 原因分类: offline_payment(线下对公)/business_gift(大客户赠送)/customer_compensation(客诉补偿)/manual_correction(误操作核减)/internal_test(测试)
    proof_no VARCHAR(100),                                            -- [凭证] 关联银行打款流水号/合同号/工单号
    proof_image_url VARCHAR(500),                                     -- [凭据] 上传的打款水单凭证截图 URL
    remark TEXT NOT NULL,                                             -- [说明] 调额详细背景说明 (不少于5字)
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 工单提交时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 最后更新时间
);

CREATE INDEX IF NOT EXISTS idx_quota_adj_user_id ON quota_adjust_records(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_adj_no ON quota_adjust_records(adjust_no);

COMMENT ON TABLE quota_adjust_records IS '管理员人工调额工单与凭证审计表';
COMMENT ON COLUMN quota_adjust_records.id IS '调额工单主键 ID';
COMMENT ON COLUMN quota_adjust_records.adjust_no IS '调额工单编号 (如 ADJ202608250001)';
COMMENT ON COLUMN quota_adjust_records.user_id IS '被调额的目标用户 UID';
COMMENT ON COLUMN quota_adjust_records.admin_id IS '经办管理员 UID';
COMMENT ON COLUMN quota_adjust_records.admin_name IS '经办管理员姓名';
COMMENT ON COLUMN quota_adjust_records.adjust_type IS '调额方式: add(增加) / sub(核减) / set(重置为指定值)';
COMMENT ON COLUMN quota_adjust_records.adjust_amount IS '本次调额变动数值 (点数)';
COMMENT ON COLUMN quota_adjust_records.reason_category IS '调额原因分类: offline_payment(线下对公打款) / business_gift(商务大客户赠送) / customer_compensation(客诉补偿) / manual_correction(误操作核减) / internal_test(内部测试)';
COMMENT ON COLUMN quota_adjust_records.proof_no IS '关联银行打款流水号/合同编号/工单号凭证';
COMMENT ON COLUMN quota_adjust_records.proof_image_url IS '上传的打款水单凭证截图附件 URL';
COMMENT ON COLUMN quota_adjust_records.remark IS '调额详细背景说明（不少于5字）';
COMMENT ON COLUMN quota_adjust_records.created_at IS '工单提交时间';
COMMENT ON COLUMN quota_adjust_records.updated_at IS '最后更新时间';


-- ------------------------------------------------------------------------------
-- 5. AI 尽调任务表 - 生命周期过程态 (dd_tasks)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dd_tasks (
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
    auth_qrcode_url VARCHAR(500),                                     -- [授权] 微风企法人授权专属二维码图片 URL
    auth_link VARCHAR(500),                                           -- [授权] 微风企法人授权专属 H5 链接
    thinking_logs JSON,                                               -- [思考] AI智能体实时思考流日志列表 JSON
    report_id VARCHAR(36),                                            -- [资产] 生成完毕后关联的报告资产 ID (DDReport.id)
    risk_level VARCHAR(20),                                           -- [结论] 最终风控评级: green(建议准入)/yellow(审慎关注)/red(一票否决)
    error_message TEXT,                                               -- [异常] 若异常终止时的错误原因详情
    completed_at VARCHAR(50),                                         -- [时间] 任务完成时间戳字符串
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,          -- [时间] 任务发起创建时间
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP           -- [时间] 任务最后更新时间
);

CREATE INDEX IF NOT EXISTS idx_dd_tasks_user_id ON dd_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_dd_tasks_task_no ON dd_tasks(task_no);
CREATE INDEX IF NOT EXISTS idx_dd_tasks_company ON dd_tasks(company_name);
CREATE INDEX IF NOT EXISTS idx_dd_tasks_status ON dd_tasks(status);

COMMENT ON TABLE dd_tasks IS 'AI尽调任务表（记录授权状态、清洗步骤与实时思考流日志）';
COMMENT ON COLUMN dd_tasks.id IS '任务唯一主键 ID';
COMMENT ON COLUMN dd_tasks.task_no IS '任务全局业务单号 (如 TSK202608250001)';
COMMENT ON COLUMN dd_tasks.user_id IS '发起任务的用户 UID';
COMMENT ON COLUMN dd_tasks.company_name IS '目标尽调企业全称';
COMMENT ON COLUMN dd_tasks.credit_code IS '目标企业统一社会信用代码 (18位)';
COMMENT ON COLUMN dd_tasks.legal_person IS '目标企业法定代表人姓名';
COMMENT ON COLUMN dd_tasks.scene IS '尽调场景模板: bank_credit(银行信贷审批) / supply_chain(供应链客户准入) / risk_scan(工商风险速查)';
COMMENT ON COLUMN dd_tasks.dimensions IS '勾选的分析研判维度列表 JSON (如 ["工商司法", "税务真实性", "多头借贷", "资产抵质押"])';
COMMENT ON COLUMN dd_tasks.auth_mode IS '微风企授权模式: weifengqi_qr(生成法人授权二维码) / public_only(仅公开工商数据)';
COMMENT ON COLUMN dd_tasks.status IS '任务生命周期状态: waiting_auth(等待法人授权) / pulling_data(拉取数据中) / ai_analyzing(AI大模型推理中) / completed(已完成) / failed(异常终止) / cancelled(已取消)';
COMMENT ON COLUMN dd_tasks.auth_status IS '微风企法人授权状态: pending(待签署) / authorized(已授权签署) / expired(已超时)';
COMMENT ON COLUMN dd_tasks.auth_qrcode_url IS '微风企法人授权专属二维码图片 URL';
COMMENT ON COLUMN dd_tasks.auth_link IS '微风企法人授权专属移动端 H5 链接';
COMMENT ON COLUMN dd_tasks.thinking_logs IS 'AI 智能体实时思考流日志列表 JSON';
COMMENT ON COLUMN dd_tasks.report_id IS '生成完毕后关联的终态报告资产 ID (DDReport.id)';
COMMENT ON COLUMN dd_tasks.risk_level IS '最终综合研判风控评级: green(建议准入) / yellow(审慎关注) / red(一票否决)';
COMMENT ON COLUMN dd_tasks.error_message IS '若任务异常终止时的错误原因详情';
COMMENT ON COLUMN dd_tasks.completed_at IS '任务完成归档时间戳字符串';
COMMENT ON COLUMN dd_tasks.created_at IS '任务发起时间';
COMMENT ON COLUMN dd_tasks.updated_at IS '最后更新时间';


-- ------------------------------------------------------------------------------
-- 6. 尽调报告终态资产表 - 双向溯源 (dd_reports)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dd_reports (
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
);

CREATE INDEX IF NOT EXISTS idx_dd_reports_user_id ON dd_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_dd_reports_task_id ON dd_reports(task_id);
CREATE INDEX IF NOT EXISTS idx_dd_reports_company ON dd_reports(company_name);
CREATE INDEX IF NOT EXISTS idx_dd_reports_risk ON dd_reports(risk_level);

COMMENT ON TABLE dd_reports IS '尽调报告终态资产表（存储完整看板内容与微风企底稿溯源库）';
COMMENT ON COLUMN dd_reports.id IS '报告资产主键 ID';
COMMENT ON COLUMN dd_reports.report_no IS '报告全局业务编号 (如 RPT202608250001)';
COMMENT ON COLUMN dd_reports.task_id IS '生成该报告的源尽调任务 ID';
COMMENT ON COLUMN dd_reports.user_id IS '归属用户 UID';
COMMENT ON COLUMN dd_reports.company_name IS '目标尽调企业全称';
COMMENT ON COLUMN dd_reports.credit_code IS '目标企业统一社会信用代码';
COMMENT ON COLUMN dd_reports.legal_person IS '法定代表人';
COMMENT ON COLUMN dd_reports.risk_level IS '风控准入评级: green(建议准入) / yellow(审慎关注) / red(一票否决)';
COMMENT ON COLUMN dd_reports.score IS '综合风控量化评分 (0-100)';
COMMENT ON COLUMN dd_reports.suggested_quota_min IS 'AI 测算建议授信下限额度 (万元)';
COMMENT ON COLUMN dd_reports.suggested_quota_max IS 'AI 测算建议授信上限额度 (万元)';
COMMENT ON COLUMN dd_reports.summary_ai_comment IS 'AI 核心风控综述与研判依据';
COMMENT ON COLUMN dd_reports.content_json IS '报告完整看板 JSON (工商基础面、红黄牌列表、ECharts近24个月税务开票趋势、前五大客户集中度)';
COMMENT ON COLUMN dd_reports.raw_sources_json IS '微风企税务纳税申报表、发票抽样明细与多头借贷征信原始申报底稿溯源库 JSON';
COMMENT ON COLUMN dd_reports.created_at IS '报告生成归档时间';
COMMENT ON COLUMN dd_reports.updated_at IS '最后更新时间';


-- ------------------------------------------------------------------------------
-- 7. 额度加油包充值订单表 (orders)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
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
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

COMMENT ON TABLE orders IS '额度充值订单表（微信/支付宝线上支付与线下对公记录）';
COMMENT ON COLUMN orders.id IS '订单唯一主键 ID';
COMMENT ON COLUMN orders.order_no IS '平台订单业务单号 (如 ORD202608250001)';
COMMENT ON COLUMN orders.user_id IS '下单用户 UID';
COMMENT ON COLUMN orders.user_phone IS '下单用户手机号';
COMMENT ON COLUMN orders.package_id IS '购买套餐 ID (如 pack_single, pack_10, pack_50)';
COMMENT ON COLUMN orders.package_name IS '套餐显示名称 (如 标准加油包 10次)';
COMMENT ON COLUMN orders.amount IS '实际应付金额 (元，如 880.00)';
COMMENT ON COLUMN orders.quota_points IS '购买充值的尽调额度点数 (次，如 10)';
COMMENT ON COLUMN orders.pay_type IS '支付渠道: wechat(微信扫码支付) / alipay(支付宝) / offline(对公转账)';
COMMENT ON COLUMN orders.status IS '支付状态: pending(待支付) / paid(已支付) / cancelled(已取消) / refunded(已退款)';
COMMENT ON COLUMN orders.third_trade_no IS '第三方支付网关流水号 (微信/支付宝交易单号)';
COMMENT ON COLUMN orders.paid_at IS '支付成功完成时间戳字符串';
COMMENT ON COLUMN orders.created_at IS '订单创建时间';
COMMENT ON COLUMN orders.updated_at IS '最后更新时间';


-- ------------------------------------------------------------------------------
-- 8. 增值税发票申请表 (invoices)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
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
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order_id ON invoices(order_id);

COMMENT ON TABLE invoices IS '增值税普通发票与专用发票开具申请表';
COMMENT ON COLUMN invoices.id IS '发票申请主键 ID';
COMMENT ON COLUMN invoices.invoice_no IS '发票业务申请单号';
COMMENT ON COLUMN invoices.user_id IS '申请用户 UID';
COMMENT ON COLUMN invoices.order_id IS '关联的充值支付订单 ID';
COMMENT ON COLUMN invoices.title IS '发票抬头（企业全称或个人姓名）';
COMMENT ON COLUMN invoices.tax_number IS '纳税人识别号/统一社会信用代码';
COMMENT ON COLUMN invoices.amount IS '开票金额 (元)';
COMMENT ON COLUMN invoices.invoice_type IS '发票类型: vat_normal(增值税电子普票) / vat_special(增值税专用发票)';
COMMENT ON COLUMN invoices.email IS '接收电子发票 PDF 的邮箱地址';
COMMENT ON COLUMN invoices.status IS '开票状态: pending(待开票) / issued(已开具并发送) / rejected(已驳回)';
COMMENT ON COLUMN invoices.pdf_url IS '开具成功的电子发票 PDF 下载地址';
COMMENT ON COLUMN invoices.created_at IS '申请提交时间';
COMMENT ON COLUMN invoices.updated_at IS '最后更新时间';


-- ------------------------------------------------------------------------------
-- 9. 全站管理后台高危操作审计日志表 (admin_audit_logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_logs (
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
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_module ON admin_audit_logs(module);

COMMENT ON TABLE admin_audit_logs IS '全站管理员高危操作审计日志表（防篡改、安全合规追溯）';
COMMENT ON COLUMN admin_audit_logs.id IS '审计日志唯一主键 ID';
COMMENT ON COLUMN admin_audit_logs.admin_id IS '操作管理员 UID';
COMMENT ON COLUMN admin_audit_logs.admin_name IS '操作管理员姓名';
COMMENT ON COLUMN admin_audit_logs.module IS '功能模块: users(用户管理) / quota(额度管控) / orders(订单审核) / system(系统配置)';
COMMENT ON COLUMN admin_audit_logs.action IS '执行动作: adjust_quota(人工调额) / freeze_user(冻结用户) / unfreeze_user(解冻用户) / reset_password(重置密码) / export_data(导出报表)';
COMMENT ON COLUMN admin_audit_logs.target_id IS '受影响目标对象唯一 ID (如目标用户 UID 或 订单单号)';
COMMENT ON COLUMN admin_audit_logs.target_name IS '受影响目标对象名称/手机号';
COMMENT ON COLUMN admin_audit_logs.details IS '操作详情与变动前后 Diff 镜像 JSON (如 {"before": 2, "after": 12, "reason": "对公打款"})';
COMMENT ON COLUMN admin_audit_logs.ip_address IS '管理员发起操作时的客户端 IP 地址';
COMMENT ON COLUMN admin_audit_logs.created_at IS '操作发生时间';
COMMENT ON COLUMN admin_audit_logs.updated_at IS '最后更新时间';
