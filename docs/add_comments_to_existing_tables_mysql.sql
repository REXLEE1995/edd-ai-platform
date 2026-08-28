-- ==============================================================================
-- EDD AI Platform (企业尽调系统) - MySQL 增量补充已存在表与字段注释脚本
-- 适用场景: 数据库中【已经存在表】时，执行此 SQL 可直接为已有表和每个字段补全 Navicat 中文注释
-- 适用工具: Navicat for MySQL, DBeaver, DataGrip, MySQL Workbench
-- 注意事项: 执行本脚本【绝不会删除或改变现有任何数据】，仅更新元数据注释 COMMENT
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. 前台注册用户表 (users)
-- ------------------------------------------------------------------------------
ALTER TABLE users COMMENT='前台注册用户表（包含额度资产、认证企业与状态）';
ALTER TABLE users MODIFY COLUMN id VARCHAR(36) COMMENT '用户唯一标识 UID (UUID)';
ALTER TABLE users MODIFY COLUMN phone VARCHAR(20) NOT NULL COMMENT '注册手机号（主登录账号）';
ALTER TABLE users MODIFY COLUMN hashed_password VARCHAR(255) COMMENT '密码哈希值 (PBKDF2-HMAC-SHA256)';
ALTER TABLE users MODIFY COLUMN wechat_openid VARCHAR(64) COMMENT '微信 OpenID (扫码授权绑定)';
ALTER TABLE users MODIFY COLUMN wechat_nickname VARCHAR(100) COMMENT '微信昵称';
ALTER TABLE users MODIFY COLUMN avatar_url VARCHAR(500) COMMENT '用户头像图片 URL';
ALTER TABLE users MODIFY COLUMN company_name VARCHAR(200) COMMENT '实名认证/所属企业主体名称';
ALTER TABLE users MODIFY COLUMN credit_code VARCHAR(50) COMMENT '企业统一社会信用代码 (18位)';
ALTER TABLE users MODIFY COLUMN balance_quota INT NOT NULL DEFAULT 2 COMMENT '当前可用尽调额度余额 (次，新注册赠送2次)';
ALTER TABLE users MODIFY COLUMN total_recharge_quota INT NOT NULL DEFAULT 0 COMMENT '累计充值额度总点数';
ALTER TABLE users MODIFY COLUMN total_consumed_quota INT NOT NULL DEFAULT 0 COMMENT '累计已消耗尽调额度点数 (成功生成报告数)';
ALTER TABLE users MODIFY COLUMN total_gifted_quota INT NOT NULL DEFAULT 2 COMMENT '累计系统赠送额度点数 (注册赠送/活动奖励)';
ALTER TABLE users MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '账号状态: active(正常) / frozen(已冻结，禁止登录和发起尽调)';
ALTER TABLE users MODIFY COLUMN tags JSON COMMENT '运营打标标签 JSON (如 ["VIP大客户", "金融信贷部"])';
ALTER TABLE users MODIFY COLUMN register_ip VARCHAR(50) COMMENT '注册时的客户端 IP 地址';
ALTER TABLE users MODIFY COLUMN last_login_ip VARCHAR(50) COMMENT '最后一次登录的客户端 IP 地址';
ALTER TABLE users MODIFY COLUMN last_login_at VARCHAR(50) COMMENT '最后一次登录时间戳字符串';
ALTER TABLE users MODIFY COLUMN remark VARCHAR(500) COMMENT '运营人员内部跟进备注';
ALTER TABLE users MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账户创建注册时间';
ALTER TABLE users MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账户最后更新时间';

-- ------------------------------------------------------------------------------
-- 2. 管理后台管理员与角色权限表 (admin_users)
-- ------------------------------------------------------------------------------
ALTER TABLE admin_users COMMENT='管理后台管理员账号与RBAC角色权限表';
ALTER TABLE admin_users MODIFY COLUMN id VARCHAR(36) COMMENT '管理员唯一标识 UID';
ALTER TABLE admin_users MODIFY COLUMN username VARCHAR(50) NOT NULL COMMENT '管理员登录账号（如 admin, operation）';
ALTER TABLE admin_users MODIFY COLUMN hashed_password VARCHAR(255) NOT NULL COMMENT '密码哈希值 (PBKDF2-HMAC-SHA256)';
ALTER TABLE admin_users MODIFY COLUMN real_name VARCHAR(50) NOT NULL COMMENT '管理员真实姓名/工号显示名';
ALTER TABLE admin_users MODIFY COLUMN role VARCHAR(30) NOT NULL DEFAULT 'operation' COMMENT '角色: super_admin(超级管理员)/operation(运营主管)/support(客服)/finance(财务)';
ALTER TABLE admin_users MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active' COMMENT '账号状态: active(正常启用) / disabled(已禁用)';
ALTER TABLE admin_users MODIFY COLUMN last_login_at VARCHAR(50) COMMENT '最后一次登录时间戳字符串';
ALTER TABLE admin_users MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账号创建时间';
ALTER TABLE admin_users MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '账号最后更新时间';

-- ------------------------------------------------------------------------------
-- 3. 全生命周期额度流水明细表 (quota_transactions)
-- ------------------------------------------------------------------------------
ALTER TABLE quota_transactions COMMENT='全生命周期额度变动流水台账表（不可篡改，支持财务对账）';
ALTER TABLE quota_transactions MODIFY COLUMN id VARCHAR(36) COMMENT '流水唯一主键 ID';
ALTER TABLE quota_transactions MODIFY COLUMN tx_no VARCHAR(50) NOT NULL COMMENT '全局唯一流水业务单号 (如 QTX202608250001)';
ALTER TABLE quota_transactions MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT '关联用户 UID';
ALTER TABLE quota_transactions MODIFY COLUMN user_phone VARCHAR(20) NOT NULL COMMENT '用户手机号（冗余字段便于快速检索）';
ALTER TABLE quota_transactions MODIFY COLUMN user_company VARCHAR(200) COMMENT '用户企业主体名称';
ALTER TABLE quota_transactions MODIFY COLUMN change_type VARCHAR(30) NOT NULL COMMENT '变动类型: consume(尽调扣除)/recharge(线上充值)/gift(系统赠送)/refund(失败返还)/manual_add(线下对公调额)/manual_sub(人工核减)';
ALTER TABLE quota_transactions MODIFY COLUMN amount INT NOT NULL COMMENT '变动点数 (增加为正数如+10，扣除为负数如-1)';
ALTER TABLE quota_transactions MODIFY COLUMN balance_before INT NOT NULL COMMENT '变动前账户基准余额 (次)';
ALTER TABLE quota_transactions MODIFY COLUMN balance_after INT NOT NULL COMMENT '变动后账户最终余额 (次)';
ALTER TABLE quota_transactions MODIFY COLUMN ref_type VARCHAR(30) NOT NULL DEFAULT 'task' COMMENT '关联单据类型: task(尽调任务)/order(充值订单)/adjust(调额工单)/system(系统事件)';
ALTER TABLE quota_transactions MODIFY COLUMN ref_id VARCHAR(100) COMMENT '关联业务源单据编号 (如任务ID、订单号、对公工单号)';
ALTER TABLE quota_transactions MODIFY COLUMN operator_type VARCHAR(20) NOT NULL DEFAULT 'system' COMMENT '操作主体类型: system(系统自动)/user(用户自助)/admin(管理员操作)';
ALTER TABLE quota_transactions MODIFY COLUMN operator_id VARCHAR(36) COMMENT '操作人唯一 ID (管理员 UID 或 用户 UID)';
ALTER TABLE quota_transactions MODIFY COLUMN operator_name VARCHAR(50) DEFAULT 'SYSTEM' COMMENT '操作人名称/渠道显示名 (如: SYSTEM、微信扫码、Admin-张运营)';
ALTER TABLE quota_transactions MODIFY COLUMN ip_address VARCHAR(50) COMMENT '触发操作时的客户端 IP 地址';
ALTER TABLE quota_transactions MODIFY COLUMN remark TEXT COMMENT '流水详细备注说明与凭证摘要';
ALTER TABLE quota_transactions MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '流水发生记录时间';
ALTER TABLE quota_transactions MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ------------------------------------------------------------------------------
-- 4. 管理员人工调额审核工单与凭据表 (quota_adjust_records)
-- ------------------------------------------------------------------------------
ALTER TABLE quota_adjust_records COMMENT='管理员人工调额工单与凭证审计表';
ALTER TABLE quota_adjust_records MODIFY COLUMN id VARCHAR(36) COMMENT '调额工单主键 ID';
ALTER TABLE quota_adjust_records MODIFY COLUMN adjust_no VARCHAR(50) NOT NULL COMMENT '调额工单编号 (如 ADJ202608250001)';
ALTER TABLE quota_adjust_records MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT '被调额的目标用户 UID';
ALTER TABLE quota_adjust_records MODIFY COLUMN admin_id VARCHAR(36) NOT NULL COMMENT '经办管理员 UID';
ALTER TABLE quota_adjust_records MODIFY COLUMN admin_name VARCHAR(50) NOT NULL COMMENT '经办管理员姓名';
ALTER TABLE quota_adjust_records MODIFY COLUMN adjust_type VARCHAR(20) NOT NULL COMMENT '调额方式: add(增加) / sub(核减) / set(重置为指定值)';
ALTER TABLE quota_adjust_records MODIFY COLUMN adjust_amount INT NOT NULL COMMENT '本次调额变动数值 (点数)';
ALTER TABLE quota_adjust_records MODIFY COLUMN reason_category VARCHAR(50) NOT NULL COMMENT '调额原因分类: offline_payment(线下对公打款)/business_gift(商务大客户赠送)/customer_compensation(客诉补偿)/manual_correction(误操作核减)/internal_test(内部测试)';
ALTER TABLE quota_adjust_records MODIFY COLUMN proof_no VARCHAR(100) COMMENT '关联银行打款流水号/合同编号/工单号凭证';
ALTER TABLE quota_adjust_records MODIFY COLUMN proof_image_url VARCHAR(500) COMMENT '上传的打款水单凭证截图附件 URL';
ALTER TABLE quota_adjust_records MODIFY COLUMN remark TEXT NOT NULL COMMENT '调额详细背景说明（不少于5字）';
ALTER TABLE quota_adjust_records MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '工单提交时间';
ALTER TABLE quota_adjust_records MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ------------------------------------------------------------------------------
-- 5. AI 尽调任务表 - 生命周期过程态 (dd_tasks)
-- ------------------------------------------------------------------------------
ALTER TABLE dd_tasks COMMENT='AI尽调任务表（记录授权状态、清洗步骤与实时思考流日志）';
ALTER TABLE dd_tasks MODIFY COLUMN id VARCHAR(36) COMMENT '任务唯一主键 ID';
ALTER TABLE dd_tasks MODIFY COLUMN task_no VARCHAR(50) NOT NULL COMMENT '任务全局业务单号 (如 TSK202608250001)';
ALTER TABLE dd_tasks MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT '发起任务的用户 UID';
ALTER TABLE dd_tasks MODIFY COLUMN company_name VARCHAR(200) NOT NULL COMMENT '目标尽调企业全称';
ALTER TABLE dd_tasks MODIFY COLUMN credit_code VARCHAR(50) NOT NULL COMMENT '目标企业统一社会信用代码 (18位)';
ALTER TABLE dd_tasks MODIFY COLUMN legal_person VARCHAR(50) COMMENT '目标企业法定代表人姓名';
ALTER TABLE dd_tasks MODIFY COLUMN scene VARCHAR(50) NOT NULL DEFAULT 'bank_credit' COMMENT '尽调场景模板: bank_credit(银行信贷审批)/supply_chain(供应链客户准入)/risk_scan(工商风险速查)';
ALTER TABLE dd_tasks MODIFY COLUMN dimensions JSON COMMENT '勾选的分析研判维度列表 JSON (如 ["工商司法", "税务真实性", "多头借贷"])';
ALTER TABLE dd_tasks MODIFY COLUMN auth_mode VARCHAR(30) NOT NULL DEFAULT 'weifengqi_qr' COMMENT '微风企授权模式: weifengqi_qr(生成法人授权二维码)/public_only(仅公开工商数据)';
ALTER TABLE dd_tasks MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'waiting_auth' COMMENT '生命周期状态: waiting_auth(等待法人授权)/pulling_data(拉取数据中)/ai_analyzing(AI推理中)/completed(已完成)/failed(异常终止)';
ALTER TABLE dd_tasks MODIFY COLUMN auth_status VARCHAR(30) NOT NULL DEFAULT 'pending' COMMENT '微风企法人授权状态: pending(待签署) / authorized(已授权签署) / expired(已超时)';
ALTER TABLE dd_tasks MODIFY COLUMN authorized_at VARCHAR(50) COMMENT '法人首次完成实名授权的时间戳字符串 (如 2026-08-28 14:16:30)';
ALTER TABLE dd_tasks MODIFY COLUMN auth_qrcode_url VARCHAR(500) COMMENT '微风企法人授权专属二维码图片 URL';
ALTER TABLE dd_tasks MODIFY COLUMN auth_link VARCHAR(500) COMMENT '微风企法人授权专属移动端 H5 链接';
ALTER TABLE dd_tasks MODIFY COLUMN thinking_logs JSON COMMENT 'AI 智能体实时思考流日志列表 JSON';
ALTER TABLE dd_tasks MODIFY COLUMN report_id VARCHAR(36) COMMENT '生成完毕后关联的终态报告资产 ID (DDReport.id)';
ALTER TABLE dd_tasks MODIFY COLUMN risk_level VARCHAR(20) COMMENT '最终综合研判风控评级: green(建议准入) / yellow(审慎关注) / red(一票否决)';
ALTER TABLE dd_tasks MODIFY COLUMN error_message TEXT COMMENT '若任务异常终止时的错误原因详情';
ALTER TABLE dd_tasks MODIFY COLUMN wfq_order_no VARCHAR(100) COMMENT '微风企外部业务订单号 (orderNo)';
ALTER TABLE dd_tasks MODIFY COLUMN wfq_request_no VARCHAR(100) COMMENT '微风企外部请求流水号 (requestNo)';
ALTER TABLE dd_tasks MODIFY COLUMN wfq_pdf_url VARCHAR(1000) COMMENT '微风企返回的原始远程报告 PDF 下载地址';
ALTER TABLE dd_tasks MODIFY COLUMN storage_file_id VARCHAR(36) COMMENT '本地文件持久化存储关联存证 ID (dd_task_files.id)';
ALTER TABLE dd_tasks MODIFY COLUMN completed_at VARCHAR(50) COMMENT '任务完成归档时间戳字符串';
ALTER TABLE dd_tasks MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '任务发起时间';
ALTER TABLE dd_tasks MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ------------------------------------------------------------------------------
-- 6. 尽调报告终态资产表 - 双向溯源 (dd_reports)
-- ------------------------------------------------------------------------------
ALTER TABLE dd_reports COMMENT='尽调报告终态资产表（存储完整看板内容与微风企底稿溯源库）';
ALTER TABLE dd_reports MODIFY COLUMN id VARCHAR(36) COMMENT '报告资产主键 ID';
ALTER TABLE dd_reports MODIFY COLUMN report_no VARCHAR(50) NOT NULL COMMENT '报告全局业务编号 (如 RPT202608250001)';
ALTER TABLE dd_reports MODIFY COLUMN task_id VARCHAR(36) NOT NULL COMMENT '生成该报告的源尽调任务 ID';
ALTER TABLE dd_reports MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT '归属用户 UID';
ALTER TABLE dd_reports MODIFY COLUMN company_name VARCHAR(200) NOT NULL COMMENT '目标尽调企业全称';
ALTER TABLE dd_reports MODIFY COLUMN credit_code VARCHAR(50) NOT NULL COMMENT '目标企业统一社会信用代码';
ALTER TABLE dd_reports MODIFY COLUMN legal_person VARCHAR(50) COMMENT '法定代表人';
ALTER TABLE dd_reports MODIFY COLUMN risk_level VARCHAR(20) NOT NULL DEFAULT 'green' COMMENT '风控准入评级: green(建议准入) / yellow(审慎关注) / red(一票否决)';
ALTER TABLE dd_reports MODIFY COLUMN score INT NOT NULL DEFAULT 85 COMMENT '综合风控量化评分 (0-100)';
ALTER TABLE dd_reports MODIFY COLUMN suggested_quota_min INT DEFAULT 300 COMMENT 'AI 测算建议授信下限额度 (万元)';
ALTER TABLE dd_reports MODIFY COLUMN suggested_quota_max INT DEFAULT 500 COMMENT 'AI 测算建议授信上限额度 (万元)';
ALTER TABLE dd_reports MODIFY COLUMN summary_ai_comment TEXT COMMENT 'AI 核心风控综述与研判依据';
ALTER TABLE dd_reports MODIFY COLUMN content_json JSON NOT NULL COMMENT '报告完整看板 JSON (工商基础面、红黄牌列表、ECharts近24个月税务开票趋势、前五大客户集中度)';
ALTER TABLE dd_reports MODIFY COLUMN raw_sources_json JSON NOT NULL COMMENT '微风企税务纳税申报表、发票抽样明细与多头借贷征信原始申报底稿溯源库 JSON';
ALTER TABLE dd_reports MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报告生成归档时间';
ALTER TABLE dd_reports MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ------------------------------------------------------------------------------
-- 7. 额度加油包充值订单表 (orders)
-- ------------------------------------------------------------------------------
ALTER TABLE orders COMMENT='额度充值订单表（微信/支付宝线上支付与线下对公记录）';
ALTER TABLE orders MODIFY COLUMN id VARCHAR(36) COMMENT '订单唯一主键 ID';
ALTER TABLE orders MODIFY COLUMN order_no VARCHAR(50) NOT NULL COMMENT '平台订单业务单号 (如 ORD202608250001)';
ALTER TABLE orders MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT '下单用户 UID';
ALTER TABLE orders MODIFY COLUMN user_phone VARCHAR(20) NOT NULL COMMENT '下单用户手机号';
ALTER TABLE orders MODIFY COLUMN package_id VARCHAR(50) NOT NULL COMMENT '购买套餐 ID (如 pack_single, pack_10, pack_50)';
ALTER TABLE orders MODIFY COLUMN package_name VARCHAR(100) NOT NULL COMMENT '套餐显示名称 (如 标准加油包 10次)';
ALTER TABLE orders MODIFY COLUMN amount DOUBLE NOT NULL COMMENT '实际应付金额 (元，如 880.00)';
ALTER TABLE orders MODIFY COLUMN quota_points INT NOT NULL COMMENT '购买充值的尽调额度点数 (次，如 10)';
ALTER TABLE orders MODIFY COLUMN pay_type VARCHAR(20) NOT NULL DEFAULT 'wechat' COMMENT '支付渠道: wechat(微信扫码支付) / alipay(支付宝) / offline(对公转账)';
ALTER TABLE orders MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '支付状态: pending(待支付) / paid(已支付) / cancelled(已取消) / refunded(已退款)';
ALTER TABLE orders MODIFY COLUMN third_trade_no VARCHAR(100) COMMENT '第三方支付网关流水号 (微信/支付宝交易单号)';
ALTER TABLE orders MODIFY COLUMN paid_at VARCHAR(50) COMMENT '支付成功完成时间戳字符串';
ALTER TABLE orders MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '订单创建时间';
ALTER TABLE orders MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ------------------------------------------------------------------------------
-- 8. 增值税发票申请表 (invoices)
-- ------------------------------------------------------------------------------
ALTER TABLE invoices COMMENT='增值税普通发票与专用发票开具申请表';
ALTER TABLE invoices MODIFY COLUMN id VARCHAR(36) COMMENT '发票申请主键 ID';
ALTER TABLE invoices MODIFY COLUMN invoice_no VARCHAR(50) NOT NULL COMMENT '发票业务申请单号';
ALTER TABLE invoices MODIFY COLUMN user_id VARCHAR(36) NOT NULL COMMENT '申请用户 UID';
ALTER TABLE invoices MODIFY COLUMN order_id VARCHAR(36) NOT NULL COMMENT '关联的充值支付订单 ID';
ALTER TABLE invoices MODIFY COLUMN title VARCHAR(200) NOT NULL COMMENT '发票抬头（企业全称或个人姓名）';
ALTER TABLE invoices MODIFY COLUMN tax_number VARCHAR(50) NOT NULL COMMENT '纳税人识别号/统一社会信用代码';
ALTER TABLE invoices MODIFY COLUMN amount DOUBLE NOT NULL COMMENT '开票金额 (元)';
ALTER TABLE invoices MODIFY COLUMN invoice_type VARCHAR(20) NOT NULL DEFAULT 'vat_normal' COMMENT '发票类型: vat_normal(增值税电子普票) / vat_special(增值税专用发票)';
ALTER TABLE invoices MODIFY COLUMN email VARCHAR(100) NOT NULL COMMENT '接收电子发票 PDF 的邮箱地址';
ALTER TABLE invoices MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '开票状态: pending(待开票) / issued(已开具并发送) / rejected(已驳回)';
ALTER TABLE invoices MODIFY COLUMN pdf_url VARCHAR(500) COMMENT '开具成功的电子发票 PDF 下载地址';
ALTER TABLE invoices MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请提交时间';
ALTER TABLE invoices MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ------------------------------------------------------------------------------
-- 9. 全站管理后台高危操作审计日志表 (admin_audit_logs)
-- ------------------------------------------------------------------------------
ALTER TABLE admin_audit_logs COMMENT='全站管理员高危操作审计日志表（防篡改、安全合规追溯）';
ALTER TABLE admin_audit_logs MODIFY COLUMN id VARCHAR(36) COMMENT '审计日志唯一主键 ID';
ALTER TABLE admin_audit_logs MODIFY COLUMN admin_id VARCHAR(36) NOT NULL COMMENT '操作管理员 UID';
ALTER TABLE admin_audit_logs MODIFY COLUMN admin_name VARCHAR(50) NOT NULL COMMENT '操作管理员姓名';
ALTER TABLE admin_audit_logs MODIFY COLUMN module VARCHAR(50) NOT NULL COMMENT '功能模块: users(用户管理) / quota(额度管控) / orders(订单审核) / system(系统配置)';
ALTER TABLE admin_audit_logs MODIFY COLUMN action VARCHAR(50) NOT NULL COMMENT '执行动作: adjust_quota(人工调额) / freeze_user(冻结用户) / export_data(导出报表)';
ALTER TABLE admin_audit_logs MODIFY COLUMN target_id VARCHAR(100) COMMENT '受影响目标对象唯一 ID (如目标用户 UID 或 订单单号)';
ALTER TABLE admin_audit_logs MODIFY COLUMN target_name VARCHAR(200) COMMENT '受影响目标对象名称/手机号';
ALTER TABLE admin_audit_logs MODIFY COLUMN details JSON COMMENT '操作详情与变动前后 Diff 镜像 JSON';
ALTER TABLE admin_audit_logs MODIFY COLUMN ip_address VARCHAR(50) COMMENT '管理员发起操作时的客户端 IP 地址';
ALTER TABLE admin_audit_logs MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作发生时间';
ALTER TABLE admin_audit_logs MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ------------------------------------------------------------------------------
-- 10. 尽调任务文件存证与物理存储记录表 (dd_task_files)
-- ------------------------------------------------------------------------------
ALTER TABLE dd_task_files COMMENT='任务文件与报告PDF物理存储存证记录表';
ALTER TABLE dd_task_files MODIFY COLUMN id VARCHAR(36) COMMENT '文件唯一主键 ID (UUID)';
ALTER TABLE dd_task_files MODIFY COLUMN task_id VARCHAR(36) NOT NULL COMMENT '关联的尽调任务 ID';
ALTER TABLE dd_task_files MODIFY COLUMN report_id VARCHAR(36) COMMENT '关联的尽调报告 ID';
ALTER TABLE dd_task_files MODIFY COLUMN file_type VARCHAR(50) NOT NULL DEFAULT 'wfq_preloan_pdf' COMMENT '文件业务类型: wfq_preloan_pdf(微风企贷前报告PDF) / audit_proof(存证底稿)';
ALTER TABLE dd_task_files MODIFY COLUMN filename VARCHAR(255) NOT NULL COMMENT '原始文件名 (如 微风企贷前报告12345678.pdf)';
ALTER TABLE dd_task_files MODIFY COLUMN file_path VARCHAR(500) NOT NULL COMMENT '本地文件存储绝对路径或相对路径';
ALTER TABLE dd_task_files MODIFY COLUMN file_size BIGINT NOT NULL DEFAULT 0 COMMENT '文件大小 (字节 Bytes)';
ALTER TABLE dd_task_files MODIFY COLUMN file_hash VARCHAR(64) COMMENT '文件 SHA-256 哈希校验值 (防篡改数字存证)';
ALTER TABLE dd_task_files MODIFY COLUMN mime_type VARCHAR(100) DEFAULT 'application/pdf' COMMENT '文件 MIME 类型 (如 application/pdf)';
ALTER TABLE dd_task_files MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '文件写入归档时间';
ALTER TABLE dd_task_files MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';

-- ------------------------------------------------------------------------------
-- 11. 三方数据源与外部接口字典配置表 (sys_third_party_apis)
-- ------------------------------------------------------------------------------
ALTER TABLE sys_third_party_apis COMMENT='三方数据源与外部接口字典配置表';
ALTER TABLE sys_third_party_apis MODIFY COLUMN id VARCHAR(36) COMMENT '主键 ID';
ALTER TABLE sys_third_party_apis MODIFY COLUMN api_code VARCHAR(50) NOT NULL COMMENT '接口代码 (如 WFQ_AUTH, WFQ_REPORT_STATUS, WFQ_REPORT_PDF_URL)';
ALTER TABLE sys_third_party_apis MODIFY COLUMN api_name VARCHAR(100) NOT NULL COMMENT '接口名称 (如 微风企获取授权链接接口)';
ALTER TABLE sys_third_party_apis MODIFY COLUMN provider_name VARCHAR(50) NOT NULL COMMENT '所属服务商/供应商 (如 weifengqi / enterprise_ic / risk_radar)';
ALTER TABLE sys_third_party_apis MODIFY COLUMN call_mode VARCHAR(30) NOT NULL DEFAULT 'mock' COMMENT '调用模式: mock(本地模拟网关) / http(真实网络请求)';
ALTER TABLE sys_third_party_apis MODIFY COLUMN endpoint_url VARCHAR(500) NOT NULL COMMENT '接口请求端点完整 URL';
ALTER TABLE sys_third_party_apis MODIFY COLUMN http_method VARCHAR(10) NOT NULL DEFAULT 'POST' COMMENT 'HTTP 请求方式: GET / POST';
ALTER TABLE sys_third_party_apis MODIFY COLUMN lifecycle_type VARCHAR(30) NOT NULL DEFAULT 'interactive_interrupt' COMMENT '取数生命周期类型: direct_fetch(直接拉取) / interactive_interrupt(断层中断-需要授权)';
ALTER TABLE sys_third_party_apis MODIFY COLUMN auth_params JSON COMMENT '三方认证参数配置 JSON (AppKey, AppSecret 等)';
ALTER TABLE sys_third_party_apis MODIFY COLUMN request_headers_template JSON COMMENT '默认请求头模版 JSON';
ALTER TABLE sys_third_party_apis MODIFY COLUMN response_mapping_rules JSON COMMENT '响应字段映射与准错拦截提取规则 JSON';
ALTER TABLE sys_third_party_apis MODIFY COLUMN is_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '接口状态: 1(正常启用) / 0(下线禁用)';
ALTER TABLE sys_third_party_apis MODIFY COLUMN remark VARCHAR(500) COMMENT '三方接口对接说明与接入文档链接';
ALTER TABLE sys_third_party_apis MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '接口创建注册时间';
ALTER TABLE sys_third_party_apis MODIFY COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后更新时间';
