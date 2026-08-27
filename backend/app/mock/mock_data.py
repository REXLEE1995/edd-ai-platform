from typing import List, Dict, Any

# ==============================================================================
# 1. 完整企业工商与治理数据 Mock (照面基础、股权出资穿透、主要管理层、工商变更加权、对外投资)
# ==============================================================================

MOCK_BUSINESS_REGISTRATION: Dict[str, Dict[str, Any]] = {
    # --------------------------------------------------------------------------
    # 1. 优质标杆企业: 深圳腾讯前海信息技术有限公司 (91440300MA5DQ8888X)
    # --------------------------------------------------------------------------
    "91440300MA5DQ8888X": {
        "basic_info": {
            "company_name": "深圳腾讯前海信息技术有限公司",
            "credit_code": "91440300MA5DQ8888X",
            "taxpayer_id": "91440300MA5DQ8888X",
            "reg_no": "44030020180518001",
            "org_code": "MA5DQ888-8",
            "legal_person": "马化腾",
            "company_type": "有限责任公司（法人独资）",
            "reg_capital": "10,000.00 万元人民币",
            "paid_in_capital": "10,000.00 万元人民币",
            "paid_rate": "100.0%",
            "established_date": "2018-05-18",
            "operating_period": "2018-05-18 至 2068-05-17 (长期)",
            "operating_status": "存续（在营、开业、在册）",
            "reg_authority": "深圳市市场监督管理局前海监管局",
            "approved_date": "2024-03-12",
            "industry": "信息传输、软件和信息技术服务业",
            "insured_count": 1850,
            "staff_size": "1000-4999人",
            "registered_address": "深圳市前海深港合作区前湾一路63号前海企业公馆2B栋",
            "business_scope": "一般经营项目：计算机软硬件、网络技术、通信技术、多媒体技术的开发、销售与技术咨询；企业数字化转型云平台研发；大数据服务与人工智能公共服务平台技术咨询。许可经营项目：第二类增值电信业务；互联网信息服务。"
        },
        "actual_controller": {
            "name": "马化腾",
            "holding_ratio": "54.20%",
            "holding_path": "马化腾 (54.2%) -> 深圳市腾讯计算机系统有限公司 (95.0%) -> 深圳腾讯前海信息技术有限公司",
            "layer_count": 2,
            "is_legal_rep": True
        },
        "shareholders": [
            {
                "name": "深圳市腾讯计算机系统有限公司",
                "type": "企业法人",
                "ratio": "95.00%",
                "subscribed_capital": "9,500.00 万元",
                "paid_capital": "9,500.00 万元",
                "pay_date": "2018-05-15",
                "is_actual_controller": False,
                "beneficiary": "马化腾 (最终受益股份约 54.2%)"
            },
            {
                "name": "深圳市前海金融控股有限公司",
                "type": "国有控股企业",
                "ratio": "5.00%",
                "subscribed_capital": "500.00 万元",
                "paid_capital": "500.00 万元",
                "pay_date": "2018-05-15",
                "is_actual_controller": False,
                "beneficiary": "深圳市前海管理局"
            }
        ],
        "key_personnel": [
            {"name": "马化腾", "position": "董事长", "holding_ratio": "最终受益人"},
            {"name": "任宇昕", "position": "董事兼总经理", "holding_ratio": "-"},
            {"name": "许晨晔", "position": "董事", "holding_ratio": "-"},
            {"name": "卢山", "position": "监事会主席", "holding_ratio": "-"},
            {"name": "罗硕瀚", "position": "财务负责人", "holding_ratio": "-"}
        ],
        "change_records": [
            {
                "change_date": "2023-04-12",
                "change_item": "注册资本及实收资本变更",
                "before_change": "5,000 万元人民币",
                "after_change": "10,000 万元人民币（增资 5000 万元已全部实缴到位）"
            },
            {
                "change_date": "2021-08-20",
                "change_item": "经营范围变更",
                "before_change": "软件开发与技术服务",
                "after_change": "增加企业数字化转型云平台研发、人工智能公共数据平台服务与第二类增值电信业务"
            },
            {
                "change_date": "2019-11-15",
                "change_item": "住所/经营场所变更",
                "before_change": "深圳市南山区高新科技园南区腾讯大厦",
                "after_change": "深圳市前海深港合作区前湾一路63号前海企业公馆2B栋"
            }
        ],
        "investments": [
            {
                "company_name": "腾讯前海云计算技术（深圳）有限公司",
                "legal_person": "任宇昕",
                "reg_capital": "5,000 万元",
                "ratio": "100.00%",
                "established_date": "2020-07-08",
                "status": "存续"
            },
            {
                "company_name": "深圳市前海智汇企服科技有限公司",
                "legal_person": "张立",
                "reg_capital": "2,000 万元",
                "ratio": "40.00%",
                "established_date": "2021-12-18",
                "status": "存续"
            }
        ],
        "compliance_and_judiciary": {
            "serious_illegal": False,
            "dishonest_executors": [],
            "abnormal_operations": [],
            "administrative_penalties": [],
            "chattel_mortgages": [],
            "equity_pledges": [],
            "judicial_auctions": [],
            "lawsuits_summary": {"as_defendant": 0, "as_plaintiff": 2, "total_execution_amount": 0}
        }
    },

    # --------------------------------------------------------------------------
    # 2. 优质标杆供应链金融企业: 享宇数科供应链（深圳）有限公司 (91440300MA5H88888X)
    # --------------------------------------------------------------------------
    "91440300MA5H88888X": {
        "basic_info": {
            "company_name": "享宇数科供应链（深圳）有限公司",
            "credit_code": "91440300MA5H88888X",
            "taxpayer_id": "91440300MA5H88888X",
            "reg_no": "44030020190618009",
            "org_code": "MA5H8888-8",
            "legal_person": "温喜华",
            "company_type": "有限责任公司",
            "reg_capital": "5,000.00 万元人民币",
            "paid_in_capital": "5,000.00 万元人民币",
            "paid_rate": "100.0%",
            "established_date": "2019-06-18",
            "operating_period": "2019-06-18 至 2069-06-17",
            "operating_status": "存续（在营、开业、在册）",
            "reg_authority": "深圳市市场监督管理局南山监管局",
            "approved_date": "2024-04-10",
            "industry": "现代供应链管理与科技金融服务",
            "insured_count": 168,
            "staff_size": "150-200人",
            "registered_address": "深圳市南山区粤海街道高新南九道科技生态园12栋A座1801室",
            "business_scope": "一般经营项目：供应链管理及相关配套服务；计算机软硬件的技术开发、技术咨询与技术服务；供应链金融信息系统研发；国内贸易、货物及技术进出口。许可经营项目：第二类增值电信业务。"
        },
        "actual_controller": {
            "name": "温喜华",
            "holding_ratio": "51.40%",
            "holding_path": "温喜华 -> 深圳享宇控股集团有限公司(70.0%) -> 享宇数科(70.0%) + 直接持股(20.0%)",
            "layer_count": 2,
            "is_legal_rep": True
        },
        "shareholders": [
            {
                "name": "深圳享宇控股集团有限公司",
                "type": "企业法人",
                "ratio": "70.00%",
                "subscribed_capital": "3,500.00 万元",
                "paid_capital": "3,500.00 万元",
                "pay_date": "2019-06-15",
                "is_actual_controller": False,
                "beneficiary": "温喜华 (穿透持股约 51.4%)"
            },
            {
                "name": "温喜华",
                "type": "自然人股东",
                "ratio": "20.00%",
                "subscribed_capital": "1,000.00 万元",
                "paid_capital": "1,000.00 万元",
                "pay_date": "2019-06-15",
                "is_actual_controller": True,
                "beneficiary": "温喜华 (直接持股 20.0%)"
            },
            {
                "name": "深圳市创新共赢合伙企业（有限合伙）",
                "type": "合伙企业",
                "ratio": "10.00%",
                "subscribed_capital": "500.00 万元",
                "paid_capital": "500.00 万元",
                "pay_date": "2020-03-20",
                "is_actual_controller": False,
                "beneficiary": "员工持股平台"
            }
        ],
        "key_personnel": [
            {"name": "温喜华", "position": "执行董事兼总经理", "holding_ratio": "51.4%"},
            {"name": "李强", "position": "监事", "holding_ratio": "-"},
            {"name": "王建新", "position": "首席风控官", "holding_ratio": "-"},
            {"name": "张敏", "position": "财务总监", "holding_ratio": "-"}
        ],
        "change_records": [
            {
                "change_date": "2022-09-15",
                "change_item": "实缴资本变更",
                "before_change": "2,000.00 万元",
                "after_change": "5,000.00 万元（全额实缴完成）"
            },
            {
                "change_date": "2020-03-20",
                "change_item": "投资人股权变更",
                "before_change": "深圳享宇控股 80%, 温喜华 20%",
                "after_change": "引入深圳市创新共赢合伙企业增资扩股 10%"
            }
        ],
        "investments": [
            {
                "company_name": "享宇智链科技（武汉）有限公司",
                "legal_person": "温喜华",
                "reg_capital": "1,000 万元",
                "ratio": "100.00%",
                "established_date": "2021-08-10",
                "status": "存续"
            }
        ],
        "compliance_and_judiciary": {
            "serious_illegal": False,
            "dishonest_executors": [],
            "abnormal_operations": [],
            "administrative_penalties": [],
            "chattel_mortgages": [
                {
                    "mortgage_no": "4403002024001928",
                    "mortgagee": "招商银行股份有限公司深圳科技园支行",
                    "amount": "1,200.00 万元",
                    "collateral": "智能化自动化立体仓储分拣流水线设备及配套控制软件",
                    "status": "有效存续"
                }
            ],
            "equity_pledges": [],
            "judicial_auctions": [],
            "lawsuits_summary": {"as_defendant": 0, "as_plaintiff": 1, "total_execution_amount": 0}
        }
    },

    # --------------------------------------------------------------------------
    # 3. 审慎关注制造企业: 江苏恒瑞智造科技有限公司 (91320400MA1W99991L)
    # --------------------------------------------------------------------------
    "91320400MA1W99991L": {
        "basic_info": {
            "company_name": "江苏恒瑞智造科技有限公司",
            "credit_code": "91320400MA1W99991L",
            "taxpayer_id": "91320400MA1W99991L",
            "reg_no": "320400000201910221",
            "org_code": "MA1W9999-1",
            "legal_person": "孙恒瑞",
            "company_type": "有限责任公司（自然人投资或控股）",
            "reg_capital": "5,000.00 万元人民币",
            "paid_in_capital": "3,500.00 万元人民币",
            "paid_rate": "70.0%",
            "established_date": "2019-10-22",
            "operating_period": "2019-10-22 至 2049-10-21",
            "operating_status": "存续（在营、开业、在册）",
            "reg_authority": "常州市武进区市场监督管理局",
            "approved_date": "2024-05-18",
            "industry": "通用设备与高端数控装备制造业",
            "insured_count": 320,
            "staff_size": "300-499人",
            "registered_address": "常州市武进区高新技术产业开发区凤林南路39号",
            "business_scope": "数控机床、工业自动化重型机械、精密铸件研发、制造、销售；金属切削加工与模具制造；工业机器人集成应用与售后维护；自营和代理各类商品及技术的进出口业务。"
        },
        "actual_controller": {
            "name": "孙恒瑞",
            "holding_ratio": "65.00%",
            "holding_path": "孙恒瑞 (直接持股 65.0%)",
            "layer_count": 1,
            "is_legal_rep": True
        },
        "shareholders": [
            {
                "name": "孙恒瑞",
                "type": "自然人股东",
                "ratio": "65.00%",
                "subscribed_capital": "3,250.00 万元",
                "paid_capital": "2,275.00 万元",
                "pay_date": "2019-10-20",
                "is_actual_controller": True,
                "beneficiary": "孙恒瑞 (持股 65.0%)"
            },
            {
                "name": "常州智造产业股权投资合伙企业（有限合伙）",
                "type": "合伙企业",
                "ratio": "25.00%",
                "subscribed_capital": "1,250.00 万元",
                "paid_capital": "875.00 万元",
                "pay_date": "2021-03-15",
                "is_actual_controller": False,
                "beneficiary": "常州高新产业母基金"
            },
            {
                "name": "江苏省智能制造引导基金（有限合伙）",
                "type": "国有引导基金",
                "ratio": "10.00%",
                "subscribed_capital": "500.00 万元",
                "paid_capital": "350.00 万元",
                "pay_date": "2022-06-10",
                "is_actual_controller": False,
                "beneficiary": "江苏省财政厅"
            }
        ],
        "key_personnel": [
            {"name": "孙恒瑞", "position": "执行董事兼总经理", "holding_ratio": "65.0%"},
            {"name": "王维民", "position": "监事", "holding_ratio": "-"},
            {"name": "陈晓燕", "position": "财务总监", "holding_ratio": "-"}
        ],
        "change_records": [
            {
                "change_date": "2024-03-08",
                "change_item": "经营范围扩展",
                "before_change": "数控机床与普通机械加工制造",
                "after_change": "增加工业机器人集成应用、自动化设备制造及进出口贸易业务"
            },
            {
                "change_date": "2022-06-10",
                "change_item": "投资人（股权结构）变更",
                "before_change": "孙恒瑞 75%, 常州智造 25%",
                "after_change": "引入江苏省智能制造引导基金入股 10%"
            }
        ],
        "investments": [
            {
                "company_name": "常州恒瑞精密机械制造有限公司",
                "legal_person": "孙恒瑞",
                "reg_capital": "1,000 万元",
                "ratio": "100.00%",
                "established_date": "2021-04-12",
                "status": "存续"
            }
        ],
        "compliance_and_judiciary": {
            "serious_illegal": False,
            "dishonest_executors": [],
            "abnormal_operations": [],
            "administrative_penalties": [
                {
                    "case_no": "(武)市监处字[2023]第089号",
                    "reason": "未及时报送2022年度特种设备维保检修档案",
                    "punishment": "警告并处以罚款 10,000 元（已缴纳）",
                    "date": "2023-09-15"
                }
            ],
            "chattel_mortgages": [
                {
                    "mortgage_no": "3204002023000881",
                    "mortgagee": "江苏银行股份有限公司常州武进支行",
                    "amount": "800.00 万元",
                    "collateral": "5台大型高精度五轴联动数控立式加工中心",
                    "status": "有效存续"
                }
            ],
            "equity_pledges": [
                {
                    "pledge_no": "EQP-20240115",
                    "pledgor": "孙恒瑞",
                    "pledgee": "常州高新农村商业银行",
                    "pledged_equity": "750.00 万股 (占总股本 15.0%)",
                    "status": "有效存续"
                }
            ],
            "judicial_auctions": [],
            "lawsuits_summary": {"as_defendant": 1, "as_plaintiff": 0, "total_execution_amount": 350000}
        }
    },

    # --------------------------------------------------------------------------
    # 4. 高危一票否决企业: 上海盛泰供应链管理服务有限公司 (91310115MA1H88773K)
    # --------------------------------------------------------------------------
    "91310115MA1H88773K": {
        "basic_info": {
            "company_name": "上海盛泰供应链管理服务有限公司",
            "credit_code": "91310115MA1H88773K",
            "taxpayer_id": "91310115MA1H88773K",
            "reg_no": "31011500320210315",
            "org_code": "MA1H8877-3",
            "legal_person": "陈海峰",
            "company_type": "有限责任公司（自然人独资）",
            "reg_capital": "2,000.00 万元人民币",
            "paid_in_capital": "0.00 万元人民币",
            "paid_rate": "0.0%",
            "established_date": "2021-03-15",
            "operating_period": "2021-03-15 至 2041-03-14",
            "operating_status": "存续（已被列入经营异常与严重违法）",
            "reg_authority": "上海市临港新片区市场监督管理局",
            "approved_date": "2023-11-20",
            "industry": "多式联运和运输代理业",
            "insured_count": 0,
            "staff_size": "0人 (社保断缴脱保)",
            "registered_address": "中国（上海）自由贸易试验区临港新片区业盛路188号A区502室",
            "business_scope": "国内货物运输代理；国际船舶代理；供应链管理服务；道路货物运输（不含危险货物）；装卸搬运；仓储服务；机电设备销售。"
        },
        "actual_controller": {
            "name": "陈海峰",
            "holding_ratio": "80.00%",
            "holding_path": "陈海峰 (持股 80.0%)",
            "layer_count": 1,
            "is_legal_rep": True
        },
        "shareholders": [
            {
                "name": "陈海峰",
                "type": "自然人股东",
                "ratio": "80.00%",
                "subscribed_capital": "1,600.00 万元",
                "paid_capital": "0.00 万元",
                "pay_date": "2041-03-01",
                "is_actual_controller": True,
                "beneficiary": "陈海峰 (实控人)"
            },
            {
                "name": "李金龙",
                "type": "自然人股东",
                "ratio": "20.00%",
                "subscribed_capital": "400.00 万元",
                "paid_capital": "0.00 万元",
                "pay_date": "2041-03-01",
                "is_actual_controller": False,
                "beneficiary": "李金龙"
            }
        ],
        "key_personnel": [
            {"name": "陈海峰", "position": "执行董事兼法定代表人", "holding_ratio": "80.0%"},
            {"name": "李金龙", "position": "监事", "holding_ratio": "20.0%"}
        ],
        "change_records": [
            {
                "change_date": "2023-11-20",
                "change_item": "法定代表人及执行董事变更",
                "before_change": "原法定代表人：张世荣",
                "after_change": "变更为：陈海峰（变更后原核心团队全部退出）"
            }
        ],
        "investments": [],
        "compliance_and_judiciary": {
            "serious_illegal": True,
            "serious_illegal_detail": "被列入严重违法失信企业名单（黑名单）：因列入经营异常名录届满3年仍未履行相关法定义务。",
            "dishonest_executors": [
                {
                    "case_no": "(2025)沪0115执8892号",
                    "court": "上海市浦东新区人民法院",
                    "amount": "¥ 2,450,000.00",
                    "status": "全部未履行",
                    "detail": "有履行能力而拒不履行生效法律文书确定义务（已限制高消费）"
                },
                {
                    "case_no": "(2026)沪01执1024号",
                    "court": "上海市第一中级人民法院",
                    "amount": "¥ 1,350,000.00",
                    "status": "全部未履行",
                    "detail": "违反财产报告制度，拒不申报财产"
                }
            ],
            "abnormal_operations": [
                {
                    "reason": "通过登记的住所或者经营场所无法联系（地址失联）",
                    "put_date": "2024-06-18",
                    "authority": "上海市市场监督管理局",
                    "is_removed": False
                }
            ],
            "administrative_penalties": [
                {
                    "case_no": "沪市监临处字[2025]第221号",
                    "reason": "虚构物流运费发票申报增值税进项抵扣",
                    "punishment": "处以少缴税款1倍罚款计 280,000 元，移送司法机关",
                    "date": "2025-10-12"
                }
            ],
            "chattel_mortgages": [],
            "equity_pledges": [
                {
                    "pledge_no": "EQP-20250610",
                    "pledgor": "陈海峰",
                    "pledgee": "某民间小贷公司",
                    "pledged_equity": "1,600.00 万元 (占比 80.0%)",
                    "status": "司法冻结中"
                }
            ],
            "judicial_auctions": [
                {
                    "auction_name": "上海市浦东新区临港新片区业盛路仓储房产及货运车辆第一次拍卖",
                    "court": "上海市第一中级人民法院",
                    "eval_price": "¥ 3,800,000.00",
                    "date": "2026-06-15"
                }
            ],
            "lawsuits_summary": {"as_defendant": 5, "as_plaintiff": 0, "total_execution_amount": 3800000}
        }
    },

    # --------------------------------------------------------------------------
    # 5. 高危停开企业: 浙江红运达实业发展有限公司 (91330100MA2B99999P)
    # --------------------------------------------------------------------------
    "91330100MA2B99999P": {
        "basic_info": {
            "company_name": "浙江红运达实业发展有限公司",
            "credit_code": "91330100MA2B99999P",
            "taxpayer_id": "91330100MA2B99999P",
            "reg_no": "33010000020220410",
            "org_code": "MA2B9999-9",
            "legal_person": "张大运",
            "company_type": "有限责任公司（自然人独资）",
            "reg_capital": "3,000.00 万元人民币",
            "paid_in_capital": "50.00 万元人民币",
            "paid_rate": "1.7%",
            "established_date": "2022-04-10",
            "operating_period": "2022-04-10 至 2052-04-09",
            "operating_status": "存续（税务停供停开、经营异常）",
            "reg_authority": "杭州市萧山区市场监督管理局",
            "approved_date": "2024-06-20",
            "industry": "大宗商品商贸批发与物流供应链",
            "insured_count": 3,
            "staff_size": "10-20人 (大幅缩编)",
            "registered_address": "杭州市萧山区经济技术开发区建设四路288号",
            "business_scope": "一般经营项目：金属材料、建筑材料、煤炭、化工产品销售；供应链管理；国内货物运输代理；货物及技术进出口。"
        },
        "actual_controller": {
            "name": "张大运",
            "holding_ratio": "90.00%",
            "holding_path": "张大运 (持股 90.0%)",
            "layer_count": 1,
            "is_legal_rep": True
        },
        "shareholders": [
            {
                "name": "张大运",
                "type": "自然人股东",
                "ratio": "90.00%",
                "subscribed_capital": "2,700.00 万元",
                "paid_capital": "50.00 万元",
                "pay_date": "2042-12-31",
                "is_actual_controller": True,
                "beneficiary": "张大运"
            },
            {
                "name": "李红花",
                "type": "自然人股东",
                "ratio": "10.00%",
                "subscribed_capital": "300.00 万元",
                "paid_capital": "0.00 万元",
                "pay_date": "2042-12-31",
                "is_actual_controller": False,
                "beneficiary": "李红花"
            }
        ],
        "key_personnel": [
            {"name": "张大运", "position": "执行董事兼总经理", "holding_ratio": "90.0%"},
            {"name": "李红花", "position": "监事", "holding_ratio": "10.0%"}
        ],
        "change_records": [
            {
                "change_date": "2024-02-15",
                "change_item": "法定代表人变更",
                "before_change": "原法定代表人：王建国",
                "after_change": "变更为：张大运"
            }
        ],
        "investments": [],
        "compliance_and_judiciary": {
            "serious_illegal": True,
            "serious_illegal_detail": "已被列入严重违法失信企业名单（未履行生效裁判法律义务超6个月）。",
            "dishonest_executors": [
                {
                    "case_no": "(2025)浙0109执3321号",
                    "court": "杭州市萧山区人民法院",
                    "amount": "¥ 1,820,000.00",
                    "status": "全部未履行",
                    "detail": "买卖合同纠纷执行款项未支付"
                }
            ],
            "abnormal_operations": [
                {
                    "reason": "通过登记的住所或者经营场所无法联系",
                    "put_date": "2024-06-15",
                    "authority": "杭州市萧山区市场监督管理局",
                    "is_removed": False
                }
            ],
            "administrative_penalties": [
                {
                    "case_no": "萧市监处字[2024]102号",
                    "reason": "发布虚假大宗贸易仓单广告",
                    "punishment": "罚款 10.00 万元",
                    "date": "2024-03-20"
                }
            ],
            "chattel_mortgages": [],
            "equity_pledges": [
                {
                    "pledge_no": "EQP-20241010",
                    "pledgor": "张大运",
                    "pledgee": "某民间借贷人",
                    "pledged_equity": "2,700.00 万元 (占比 90.0%)",
                    "status": "质押且已司法冻结"
                }
            ],
            "judicial_auctions": [],
            "lawsuits_summary": {"as_defendant": 4, "as_plaintiff": 0, "total_execution_amount": 2580000}
        }
    },

    # --------------------------------------------------------------------------
    # 6. 享宇智评 50 页企业尽调报告真实样本: 东莞市顺捷实业有限公司 (91441900MA4W88888X)
    # --------------------------------------------------------------------------
    "91441900MA4W88888X": {
        "basic_info": {
            "company_name": "东莞市顺捷实业有限公司",
            "credit_code": "91441900MA4W88888X",
            "taxpayer_id": "91441900MA4W88888X",
            "reg_no": "441900003318921",
            "org_code": "MA4W8888-8",
            "legal_person": "吕顺光",
            "company_type": "有限责任公司（自然人投资或控股）",
            "reg_capital": "500.00 万元人民币",
            "paid_in_capital": "0.00 万元人民币",
            "paid_rate": "0.0%",
            "established_date": "2017-03-15",
            "operating_period": "2017-03-15 至 长期",
            "operating_status": "存续（在营、开业、在册）",
            "reg_authority": "东莞市市场监督管理局长安分局",
            "approved_date": "2024-03-20",
            "industry": "橡胶和塑料制品业（精密模具制造与塑胶制品）",
            "insured_count": 76,
            "staff_size": "50-99人",
            "registered_address": "东莞市长安镇乌沙社区振安中路128号顺捷工业园",
            "business_scope": "生产、加工、销售：五金模具、塑胶模具、五金制品、塑胶制品、电子元器件；餐饮服务及餐饮管理；货物及技术进出口。"
        },
        "actual_controller": {
            "name": "吕顺光",
            "holding_ratio": "90.00%",
            "holding_path": "吕顺光 (90.0%) -> 东莞市顺捷实业有限公司",
            "layer_count": 1,
            "is_legal_rep": True
        },
        "shareholders": [
            {
                "name": "吕顺光",
                "type": "自然人股东",
                "ratio": "90.00%",
                "subscribed_capital": "450.00 万元",
                "paid_capital": "0.00 万元",
                "pay_date": "2030-12-31",
                "is_actual_controller": True,
                "beneficiary": "吕顺光 (持股 90.0%)"
            },
            {
                "name": "叶来生",
                "type": "自然人股东",
                "ratio": "10.00%",
                "subscribed_capital": "50.00 万元",
                "paid_capital": "0.00 万元",
                "pay_date": "2030-12-31",
                "is_actual_controller": False,
                "beneficiary": "叶来生 (持股 10.0%)"
            }
        ],
        "key_personnel": [
            {"name": "吕顺光", "position": "执行董事兼总经理", "holding_ratio": "90.0%"},
            {"name": "叶来生", "position": "监事", "holding_ratio": "10.0%"},
            {"name": "邓建华", "position": "财务负责人", "holding_ratio": "-"}
        ],
        "change_records": [
            {
                "change_date": "2021-08-16",
                "change_item": "经营范围变更",
                "before_change": "生产、加工、销售：五金模具、塑胶模具、五金制品、塑胶制品",
                "after_change": "生产、加工、销售：五金模具、塑胶模具、五金制品、塑胶制品；餐饮服务及餐饮管理；货物进出口"
            },
            {
                "change_date": "2019-04-10",
                "change_item": "法定代表人变更",
                "before_change": "叶来生",
                "after_change": "吕顺光"
            }
        ],
        "investments": [
            {
                "company_name": "东莞市顺捷精密科技有限公司",
                "legal_person": "吕顺光",
                "reg_capital": "100.00 万元",
                "ratio": "100.00%",
                "established_date": "2020-05-12",
                "status": "存续"
            }
        ],
        "compliance_and_judiciary": {
            "serious_illegal": False,
            "dishonest_executors": [],
            "abnormal_operations": [],
            "administrative_penalties": [
                {
                    "case_no": "东环罚字(2018)4277号",
                    "reason": "废气污染防治设施未正常运行产生废气逸散",
                    "punishment": "罚款 20.00 万元 (已缴纳罚款并完成环保设备改造验收)",
                    "date": "2024-04-12"
                }
            ],
            "chattel_mortgages": [
                {
                    "mortgage_no": "4419002023001882",
                    "mortgagee": "中国农业银行股份有限公司东莞长安支行",
                    "amount": "300.00 万元",
                    "collateral": "数控精密火花机、高速CNC加工中心等模具生产设备",
                    "status": "有效存续"
                }
            ],
            "equity_pledges": [],
            "judicial_auctions": [],
            "lawsuits_summary": {"as_defendant": 0, "as_plaintiff": 1, "total_execution_amount": 0}
        }
    }
}

# ==============================================================================
# 2. 尽调核心企业全景画像与享宇金税涉税/流水 Mock
# ==============================================================================

MOCK_BUSINESS_REGISTRATION["91441900MA4W6BGB8T"] = MOCK_BUSINESS_REGISTRATION["91441900MA4W88888X"]

MOCK_COMPANIES: List[Dict[str, Any]] = [
    # --------------------------------------------------------------------------
    # 1. 深圳腾讯前海信息技术有限公司 (优质 A 级)
    # --------------------------------------------------------------------------
    {
        "company_name": "深圳腾讯前海信息技术有限公司",
        "credit_code": "91440300MA5DQ8888X",
        "legal_person": "马化腾",
        "reg_capital": "10,000.00 万元人民币",
        "paid_capital": "10,000.00 万元人民币",
        "established_date": "2018-05-18",
        "address": "深圳市前海深港合作区前湾一路63号前海企业公馆2B栋",
        "industry": "信息传输、软件和信息技术服务业",
        "risk_level": "green",
        "score": 93,
        "sub_scores": {
            "biz_score": 96,
            "risk_score": 98,
            "tax_score": 92,
            "flow_score": 88
        },
        "suggested_quota_min": 800,
        "suggested_quota_max": 1200,
        "summary": "目标企业税务开票真实稳健，近24个月无断票，下游核心客户资质优良且集中度适中；工商注册资本已全部实缴到位（1亿元），全网多头查询正常，无涉诉及失信记录，建议给予高优先级信贷准入支持。",
        "wfq_base_score": 702,
        "wfq_base_rating": "B+",
        "wfq_preloan_quota": "500.00 万元",
        "declaration_matrix_36m": {
            "years": ["2023", "2024", "2025"],
            "vat_status": {
                "2023": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2025": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"]
            },
            "eit_status": {
                "2023": ["*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*"],
                "2025": ["*", "*", "*", "*"]
            },
            "continuous_normal_months": 36,
            "zero_declaration_count": 0,
            "rule_evaluation": "近36个月申报连续且均为正常申报（*），无逾期、漏报及零申报异常"
        },
        "production_factors_36m": {
            "electricity_correlation": "96.8% (强相关)",
            "water_correlation": "94.2% (强相关)",
            "logistics_correlation": "95.5% (强相关)",
            "annual_electricity_fee": "142.50 万元",
            "annual_water_fee": "18.20 万元",
            "annual_logistics_fee": "320.00 万元",
            "capacity_utilization": "88.5%",
            "evaluation": "月度水电费及物流运费走势与开票营收高度拟合，未见买票虚开或空壳走账迹象"
        },
        "industry_benchmarks": {
            "industry_gini_coefficient": 0.36,
            "market_concentration": "健康竞争型",
            "top_products": ["企业级云安全与身份认证中间件", "金融科技大数据风控分析引擎", "敏捷微服务开发底座"],
            "quarterly_margins": [
                {"quarter": "2023Q1", "enterprise_margin": "27.5%", "industry_median": "22.0%"},
                {"quarter": "2023Q2", "enterprise_margin": "28.0%", "industry_median": "22.2%"},
                {"quarter": "2023Q3", "enterprise_margin": "28.2%", "industry_median": "22.5%"},
                {"quarter": "2023Q4", "enterprise_margin": "28.5%", "industry_median": "23.0%"},
                {"quarter": "2024Q1", "enterprise_margin": "28.1%", "industry_median": "22.8%"},
                {"quarter": "2024Q2", "enterprise_margin": "28.4%", "industry_median": "23.1%"},
                {"quarter": "2024Q3", "enterprise_margin": "28.6%", "industry_median": "23.2%"},
                {"quarter": "2024Q4", "enterprise_margin": "28.8%", "industry_median": "23.5%"},
                {"quarter": "2025Q1", "enterprise_margin": "28.3%", "industry_median": "23.0%"},
                {"quarter": "2025Q2", "enterprise_margin": "28.5%", "industry_median": "23.2%"},
                {"quarter": "2025Q3", "enterprise_margin": "28.7%", "industry_median": "23.4%"},
                {"quarter": "2025Q4", "enterprise_margin": "29.0%", "industry_median": "23.8%"}
            ]
        },
        "financial_warnings_8": [
            {"code": "W01", "name": "存货周转异常", "status": "NORMAL", "detail": "存货周转天数 32 天，处于行业优秀区间"},
            {"code": "W02", "name": "应收账款恶化", "status": "NORMAL", "detail": "应收账款周转天数 45 天，回款周期稳定"},
            {"code": "W03", "name": "短债长投风险", "status": "NORMAL", "detail": "流动负债匹配流动资产，无短贷长用"},
            {"code": "W04", "name": "资产负债率异动", "status": "NORMAL", "detail": "资产负债率 42.50%，低于行业红线 65%"},
            {"code": "W05", "name": "经营现金流背离", "status": "NORMAL", "detail": "经营性净现金流与净利润匹配度 1.12"},
            {"code": "W06", "name": "销售毛利暴跌", "status": "NORMAL", "detail": "近三年毛利率平稳提升（27.5%~29.0%）"},
            {"code": "W07", "name": "税负率异常偏离", "status": "NORMAL", "detail": "实际税负率 5.00% 略高于基准 4.20%，合规正常"},
            {"code": "W08", "name": "大股东关联占用", "status": "NORMAL", "detail": "其他应收款占总资产比例 1.2%，无抽逃资金"}
        ],
        "expert_opinions": {
            "legal_expert": "【法务合规专家】主体工商登记合规，实缴资本到位率100%，实际控制人穿透层级清晰（2层），未见失信被执行、司法冻结或高额动产股权抵质押敞口，合规风险极低。",
            "tax_expert": "【财税风控专家】近36个月申报纪律优良（全量正常申报无零申报），增值税与企业所得税足额缴纳，水电及运费与开票强相关拟合（96.8%），排除虚开或空壳嫌疑。",
            "supply_chain_expert": "【供应链专家】前十大采购与销售集中度适中，主要客商均为AAA级行业头部集团，行业基尼系数0.36显示产业生态健康，企业季度毛利率持续跑赢行业中位数5个百分点。",
            "cro_synthesis": "【首席风控官 CRO】目标企业各维度量化与定性指标优良，享宇智评分702分，享宇实时校准得分 702 分（B+级），五大一票否决红线全部排查通过，建议按标准信贷流程准入，给予预授信额度 500.00 万元。"
        },
        "tax_profile": {
            "tax_rating": "A",
            "tax_rating_year": "2025",
            "tax_status": "正常",
            "has_arrears": False,
            "arrears_amount": 0.0,
            "tax_bureau": "国家税务总局深圳市前海深港现代服务业合作区税务局"
        },
        "financial_ratios": {
            "annual_revenue": "18,650.00 万元",
            "annual_vat_sales": "18,450.00 万元",
            "annual_vat_paid": "922.50 万元",
            "tax_burden_rate": "5.00%",
            "industry_benchmark_tax_burden": "4.20%",
            "income_tax_paid": "385.00 万元",
            "gross_margin": "28.50%",
            "net_profit_margin": "12.30%",
            "operating_cost": "13,334.75 万元",
            "asset_liability_ratio": "42.50%",
            "current_ratio": "2.15",
            "quick_ratio": "1.92"
        },
        "tax_trend": {
            "months": ["2024-09", "2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
            "sales_amount": [780, 810, 850, 920, 1100, 750, 980, 1050, 1250, 1280, 1320, 1390, 1180, 1260, 1450, 1580, 1380, 1150, 1520, 1610, 1680, 1740, 1820, 1890],
            "tax_paid": [39.0, 40.5, 42.5, 46.0, 55.0, 37.5, 49.0, 52.5, 62.5, 64.0, 66.0, 69.5, 59.0, 63.0, 72.5, 79.0, 69.0, 57.5, 76.0, 80.5, 84.0, 87.0, 91.0, 94.5],
            "invoice_count": [82, 85, 90, 98, 115, 72, 102, 110, 130, 135, 140, 148, 125, 132, 152, 165, 145, 118, 160, 168, 175, 182, 190, 198],
            "void_count": [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            "red_count": [0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0]
        },
        "stability_metrics": {
            "continuous_invoicing_months": 24,
            "is_continuous_invoice": True,
            "sales_growth_yoy": "+21.38%",
            "cv_volatility": "0.22 (平稳)",
            "max_break_days": "27天 (春节假期正常休市)",
            "is_precipitous_drop": False
        },
        "top_clients": [
            {"rank": 1, "name": "腾讯科技（深圳）有限公司", "amount": "4,947.25 万元", "ratio": "26.8%", "cooperation_years": "5.5年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 2, "name": "招商银行股份有限公司", "amount": "2,313.00 万元", "ratio": "12.5%", "cooperation_years": "4.0年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 3, "name": "华为云计算技术有限公司", "amount": "1,670.50 万元", "ratio": "9.1%", "cooperation_years": "3.5年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 4, "name": "顺丰速运有限公司", "amount": "1,028.00 万元", "ratio": "5.6%", "cooperation_years": "3.0年", "status": "正常开票", "credit_grade": "AA+"},
            {"rank": 5, "name": "平安科技（深圳）有限公司", "amount": "771.00 万元", "ratio": "4.2%", "cooperation_years": "2.8年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 6, "name": "中国工商银行深圳市分行", "amount": "650.00 万元", "ratio": "3.5%", "cooperation_years": "2.5年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 7, "name": "比亚迪汽车工业有限公司", "amount": "580.00 万元", "ratio": "3.1%", "cooperation_years": "2.0年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 8, "name": "中兴通讯股份有限公司", "amount": "510.00 万元", "ratio": "2.8%", "cooperation_years": "2.2年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 9, "name": "大疆创新科技有限公司", "amount": "460.00 万元", "ratio": "2.5%", "cooperation_years": "1.8年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 10, "name": "华润数字科技有限公司", "amount": "390.00 万元", "ratio": "2.1%", "cooperation_years": "1.5年", "status": "正常开票", "credit_grade": "AA+"}
        ],
        "top_suppliers": [
            {"rank": 1, "name": "中科曙光信息产业股份有限公司", "amount": "3,200.00 万元", "ratio": "24.0%", "cooperation_years": "4.2年", "settlement_days": "60天"},
            {"rank": 2, "name": "浪潮电子信息产业股份有限公司", "amount": "2,850.00 万元", "ratio": "21.4%", "cooperation_years": "3.8年", "settlement_days": "45天"},
            {"rank": 3, "name": "神州数码（中国）有限公司", "amount": "1,580.00 万元", "ratio": "11.8%", "cooperation_years": "3.0年", "settlement_days": "30天"},
            {"rank": 4, "name": "紫光数码（苏州）集团有限公司", "amount": "1,200.00 万元", "ratio": "9.0%", "cooperation_years": "2.5年", "settlement_days": "30天"},
            {"rank": 5, "name": "联想（北京）信息技术有限公司", "amount": "980.00 万元", "ratio": "7.3%", "cooperation_years": "2.8年", "settlement_days": "45天"}
        ],
        "multi_lending": {
            "query_count_1m": 0,
            "query_count_3m": 1,
            "query_count_12m": 3,
            "overdue_records": 0,
            "inquiry_institutions": ["招商银行深圳分行 (2026-06-15, 授信审批)"]
        },
        "ic_detail": MOCK_BUSINESS_REGISTRATION["91440300MA5DQ8888X"]
    },

    # --------------------------------------------------------------------------
    # 2. 享宇数科供应链（深圳）有限公司 (优质 A 级)
    # --------------------------------------------------------------------------
    {
        "company_name": "享宇数科供应链（深圳）有限公司",
        "credit_code": "91440300MA5H88888X",
        "legal_person": "温喜华",
        "reg_capital": "5,000.00 万元人民币",
        "paid_capital": "5,000.00 万元人民币",
        "established_date": "2019-06-18",
        "address": "深圳市南山区粤海街道高新南九道科技生态园12栋A座1801室",
        "industry": "现代供应链管理与科技金融服务",
        "risk_level": "green",
        "score": 91,
        "sub_scores": {
            "biz_score": 93,
            "risk_score": 96,
            "tax_score": 90,
            "flow_score": 86
        },
        "wfq_base_score": 702,
        "wfq_base_rating": "B+",
        "wfq_preloan_quota": "500.00 万元",
        "declaration_matrix_36m": {
            "years": ["2023", "2024", "2025"],
            "vat_status": {
                "2023": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2025": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"]
            },
            "eit_status": {
                "2023": ["*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*"],
                "2025": ["*", "*", "*", "*"]
            },
            "continuous_normal_months": 36,
            "zero_declaration_count": 0,
            "rule_evaluation": "近36个月申报连续且均为正常申报（*），无逾期及零申报异常"
        },
        "production_factors_36m": {
            "electricity_correlation": "95.5% (强相关)",
            "water_correlation": "92.0% (强相关)",
            "logistics_correlation": "97.2% (强相关)",
            "annual_electricity_fee": "88.60 万元",
            "annual_water_fee": "12.40 万元",
            "annual_logistics_fee": "540.00 万元",
            "capacity_utilization": "91.2%",
            "evaluation": "物流运力及园区能耗支出与开票高度拟合，履约行为真实有效"
        },
        "industry_benchmarks": {
            "industry_gini_coefficient": 0.36,
            "market_concentration": "健康竞争型",
            "top_products": ["供应链数智协同中台", "运力调度智能算法平台", "应收账款电子债权凭证系统"],
            "quarterly_margins": [
                {"quarter": "2023Q1", "enterprise_margin": "18.0%", "industry_median": "14.5%"},
                {"quarter": "2023Q2", "enterprise_margin": "18.2%", "industry_median": "14.8%"},
                {"quarter": "2023Q3", "enterprise_margin": "18.4%", "industry_median": "15.0%"},
                {"quarter": "2023Q4", "enterprise_margin": "18.5%", "industry_median": "15.2%"},
                {"quarter": "2024Q1", "enterprise_margin": "18.3%", "industry_median": "14.9%"},
                {"quarter": "2024Q2", "enterprise_margin": "18.6%", "industry_median": "15.3%"},
                {"quarter": "2024Q3", "enterprise_margin": "18.8%", "industry_median": "15.5%"},
                {"quarter": "2024Q4", "enterprise_margin": "19.0%", "industry_median": "15.8%"},
                {"quarter": "2025Q1", "enterprise_margin": "18.4%", "industry_median": "15.0%"},
                {"quarter": "2025Q2", "enterprise_margin": "18.6%", "industry_median": "15.4%"},
                {"quarter": "2025Q3", "enterprise_margin": "18.9%", "industry_median": "15.6%"},
                {"quarter": "2025Q4", "enterprise_margin": "19.2%", "industry_median": "16.0%"}
            ]
        },
        "financial_warnings_8": [
            {"code": "W01", "name": "存货周转异常", "status": "NORMAL", "detail": "供应链周转高效，仓储周转天数 18 天"},
            {"code": "W02", "name": "应收账款恶化", "status": "NORMAL", "detail": "主要应收账款回款账期 35 天，无逾期坏账"},
            {"code": "W03", "name": "短债长投风险", "status": "NORMAL", "detail": "流动资产占总资产 72%，结构良好"},
            {"code": "W04", "name": "资产负债率异动", "status": "NORMAL", "detail": "资产负债率 48.20%，杠杆稳健"},
            {"code": "W05", "name": "经营现金流背离", "status": "NORMAL", "detail": "经营现金流充沛，净现金流 1,280 万元"},
            {"code": "W06", "name": "销售毛利暴跌", "status": "NORMAL", "detail": "毛利率维持在 18.0%~19.2%，持续稳定"},
            {"code": "W07", "name": "税负率异常偏离", "status": "NORMAL", "detail": "实际税负率 5.31%，符合现代服务业税负特征"},
            {"code": "W08", "name": "大股东关联占用", "status": "NORMAL", "detail": "无大股东非经营性资金拆借与占用"}
        ],
        "expert_opinions": {
            "legal_expert": "【法务合规专家】主体治理架构清晰，自然人温喜华穿透持股 51.4%，无任何司法执行、限高及严重违法失信记录，动产抵押属于正常设备授信，风控合规度优异。",
            "tax_expert": "【财税风控专家】近36个月增值税申报无断票漏报，纳税信用等级连续评为 A 级，运力物流及技术支出与开票营收吻合，财税真实性无可挑剔。",
            "supply_chain_expert": "【供应链专家】前五大下游采销客户（顺丰、怡亚通、象屿等）资质雄厚，结算账期通常在 30~45 天，回款确定性极高，供应链核心资产价值突出。",
            "cro_synthesis": "【首席风控官 CRO】综合全景数据与专家意见，企业主营造血能力强，享宇智评分 702 分（B+级），建议给予标准额度信贷准入，预授信额度 500.00 万元。"
        },
        "tax_profile": {
            "tax_rating": "A",
            "tax_rating_year": "2025",
            "tax_status": "正常",
            "has_arrears": False,
            "arrears_amount": 0.0,
            "tax_bureau": "国家税务总局深圳市南山区税务局"
        },
        "financial_ratios": {
            "annual_revenue": "18,450.00 万元",
            "annual_vat_sales": "18,450.00 万元",
            "annual_vat_paid": "980.50 万元",
            "tax_burden_rate": "5.31%",
            "industry_benchmark_tax_burden": "4.50%",
            "income_tax_paid": "387.50 万元",
            "gross_margin": "18.60%",
            "net_profit_margin": "8.40%",
            "operating_cost": "15,018.30 万元",
            "asset_liability_ratio": "48.20%",
            "current_ratio": "1.85",
            "quick_ratio": "1.62"
        },
        "tax_trend": {
            "months": ["2024-09", "2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
            "sales_amount": [620, 650, 710, 780, 850, 610, 790, 860, 920, 980, 1050, 1120, 980, 1060, 1180, 1250, 1150, 980, 1280, 1350, 1420, 1480, 1560, 1620],
            "tax_paid": [31.0, 32.5, 35.5, 39.0, 42.5, 30.5, 39.5, 43.0, 46.0, 49.0, 52.5, 56.0, 49.0, 53.0, 59.0, 62.5, 57.5, 49.0, 64.0, 67.5, 71.0, 74.0, 78.0, 81.0],
            "invoice_count": [65, 68, 74, 82, 89, 58, 83, 90, 96, 102, 110, 118, 103, 111, 124, 131, 120, 99, 134, 142, 149, 155, 163, 170],
            "void_count": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
            "red_count": [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0]
        },
        "stability_metrics": {
            "continuous_invoicing_months": 24,
            "is_continuous_invoice": True,
            "sales_growth_yoy": "+23.45%",
            "cv_volatility": "0.24 (平稳)",
            "max_break_days": "21天 (春节假期间隔)",
            "is_precipitous_drop": False
        },
        "top_clients": [
            {"rank": 1, "name": "广东顺丰供应链管理有限公司", "amount": "3,200.00 万元", "ratio": "17.3%", "cooperation_years": "4.2年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 2, "name": "深圳市怡亚通供应链股份有限公司", "amount": "2,850.00 万元", "ratio": "15.4%", "cooperation_years": "3.5年", "status": "正常开票", "credit_grade": "AA+"},
            {"rank": 3, "name": "厦门象屿物流配送有限责任公司", "amount": "1,580.00 万元", "ratio": "8.6%", "cooperation_years": "2.8年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 4, "name": "广州港物流有限公司", "amount": "1,080.00 万元", "ratio": "5.9%", "cooperation_years": "2.2年", "status": "正常开票", "credit_grade": "AA"},
            {"rank": 5, "name": "深圳前海微众供应链科技有限公司", "amount": "880.00 万元", "ratio": "4.8%", "cooperation_years": "2.0年", "status": "正常开票", "credit_grade": "AAA"}
        ],
        "top_suppliers": [
            {"rank": 1, "name": "华为数字能源技术有限公司", "amount": "2,600.00 万元", "ratio": "17.3%", "cooperation_years": "3.0年", "settlement_days": "45天"},
            {"rank": 2, "name": "海康威视数字技术股份有限公司", "amount": "1,850.00 万元", "ratio": "12.3%", "cooperation_years": "3.2年", "settlement_days": "30天"},
            {"rank": 3, "name": "浙江大华技术股份有限公司", "amount": "1,200.00 万元", "ratio": "8.0%", "cooperation_years": "2.5年", "settlement_days": "30天"}
        ],
        "multi_lending": {
            "query_count_1m": 1,
            "query_count_3m": 2,
            "query_count_12m": 4,
            "overdue_records": 0,
            "inquiry_institutions": ["微众银行供应链金融部 (2026-07-10, 贷后管理)", "招商银行深圳分行 (2026-05-18, 授信审批)"]
        },
        "ic_detail": MOCK_BUSINESS_REGISTRATION["91440300MA5H88888X"]
    },

    # --------------------------------------------------------------------------
    # 3. 江苏恒瑞智造科技有限公司 (审慎关注制造企业)
    # --------------------------------------------------------------------------
    {
        "company_name": "江苏恒瑞智造科技有限公司",
        "credit_code": "91320400MA1W99991L",
        "legal_person": "孙恒瑞",
        "reg_capital": "5,000.00 万元人民币",
        "paid_capital": "3,500.00 万元人民币",
        "established_date": "2019-10-22",
        "address": "常州市武进区高新技术产业开发区凤林南路39号",
        "industry": "通用设备与高端数控装备制造业",
        "risk_level": "yellow",
        "score": 73,
        "sub_scores": {
            "biz_score": 82,
            "risk_score": 70,
            "tax_score": 75,
            "flow_score": 68
        },
        "wfq_base_score": 625,
        "wfq_base_rating": "C+",
        "wfq_preloan_quota": "250.00 万元",
        "declaration_matrix_36m": {
            "years": ["2023", "2024", "2025"],
            "vat_status": {
                "2023": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2025": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "0", "*", "*"]
            },
            "eit_status": {
                "2023": ["*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*"],
                "2025": ["*", "*", "*", "*"]
            },
            "continuous_normal_months": 35,
            "zero_declaration_count": 1,
            "rule_evaluation": "2025年10月存在 1 次零申报记录，需核实当月产线检修情况"
        },
        "production_factors_36m": {
            "electricity_correlation": "82.4% (中度相关)",
            "water_correlation": "80.1% (中度相关)",
            "logistics_correlation": "85.0% (强相关)",
            "annual_electricity_fee": "210.00 万元",
            "annual_water_fee": "35.00 万元",
            "annual_logistics_fee": "180.00 万元",
            "capacity_utilization": "68.0%",
            "evaluation": "用电量近半年出现 15% 下滑，与开票增速趋缓走势一致，反映下游订单需求减弱"
        },
        "industry_benchmarks": {
            "industry_gini_coefficient": 0.42,
            "market_concentration": "中度竞争型",
            "top_products": ["五轴联动数控立式加工中心", "重型液压数控龙门铣床", "精密汽车模具结构件"],
            "quarterly_margins": [
                {"quarter": "2023Q1", "enterprise_margin": "24.0%", "industry_median": "21.0%"},
                {"quarter": "2023Q2", "enterprise_margin": "23.5%", "industry_median": "21.2%"},
                {"quarter": "2023Q3", "enterprise_margin": "23.0%", "industry_median": "21.0%"},
                {"quarter": "2023Q4", "enterprise_margin": "22.8%", "industry_median": "20.8%"},
                {"quarter": "2024Q1", "enterprise_margin": "22.5%", "industry_median": "20.5%"},
                {"quarter": "2024Q2", "enterprise_margin": "22.0%", "industry_median": "20.2%"},
                {"quarter": "2024Q3", "enterprise_margin": "21.8%", "industry_median": "20.0%"},
                {"quarter": "2024Q4", "enterprise_margin": "21.5%", "industry_median": "19.8%"},
                {"quarter": "2025Q1", "enterprise_margin": "21.0%", "industry_median": "19.5%"},
                {"quarter": "2025Q2", "enterprise_margin": "20.8%", "industry_median": "19.2%"},
                {"quarter": "2025Q3", "enterprise_margin": "20.5%", "industry_median": "19.0%"},
                {"quarter": "2025Q4", "enterprise_margin": "20.0%", "industry_median": "18.8%"}
            ]
        },
        "financial_warnings_8": [
            {"code": "W01", "name": "存货周转异常", "status": "WARN", "detail": "存货周转天数上升至 98 天，存在一定产成品积压"},
            {"code": "W02", "name": "应收账款恶化", "status": "WARN", "detail": "应收账款周转天数 85 天，主要客户账期拉长"},
            {"code": "W03", "name": "短债长投风险", "status": "NORMAL", "detail": "未见明显短贷长投"},
            {"code": "W04", "name": "资产负债率异动", "status": "WARN", "detail": "资产负债率达 68.50%，高于制造业安全线 65%"},
            {"code": "W05", "name": "经营现金流背离", "status": "WARN", "detail": "经营性净现金流偏紧，存在垫资压力"},
            {"code": "W06", "name": "销售毛利暴跌", "status": "NORMAL", "detail": "毛利率由 24% 缓降至 20%，未见断崖暴跌"},
            {"code": "W07", "name": "税负率异常偏离", "status": "NORMAL", "detail": "实际税负率 4.70%，与行业基准 4.80% 吻合"},
            {"code": "W08", "name": "大股东关联占用", "status": "NORMAL", "detail": "未见大额关联占用"}
        ],
        "expert_opinions": {
            "legal_expert": "【法务合规专家】主体存续，存在 1 笔市监行政处罚记录及 2 笔机床动产抵押担保，大股东存在 1 笔股权质押，需防范抵质押物处置风险。",
            "tax_expert": "【财税风控专家】纳税信用等级评定为 B 级，2025年10月曾出现 1 次零申报，近期开票流水同比下滑 14.2%，用电量与产能利用率同步走低，需关注经营持续性。",
            "supply_chain_expert": "【供应链专家】前三大客户均为工程机械龙头，但由于行业周期调整，客户结算账期均有所延长，存在一定上下游传导的流动性资金压力。",
            "cro_synthesis": "【首席风控官 CRO】企业主营业务基础仍在，但负债杠杆偏高（68.5%）且多头查询增加，享宇智评得分 625 分（C+级），建议采取审慎附条件准入策略，授信上限控制在 250 万元并追加实控人强担保。"
        },
        "tax_profile": {
            "tax_rating": "B",
            "tax_rating_year": "2025",
            "tax_status": "正常",
            "has_arrears": False,
            "arrears_amount": 0.0,
            "tax_bureau": "国家税务总局常州市武进区税务局"
        },
        "financial_ratios": {
            "annual_revenue": "5,800.00 万元",
            "annual_vat_sales": "5,650.00 万元",
            "annual_vat_paid": "265.55 万元",
            "tax_burden_rate": "4.70%",
            "industry_benchmark_tax_burden": "4.80%",
            "income_tax_paid": "98.00 万元",
            "gross_margin": "22.50%",
            "net_profit_margin": "4.80%",
            "operating_cost": "4,378.75 万元",
            "asset_liability_ratio": "68.50%",
            "current_ratio": "1.18",
            "quick_ratio": "0.85"
        },
        "tax_trend": {
            "months": ["2024-09", "2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
            "sales_amount": [420, 435, 450, 480, 510, 360, 530, 520, 500, 490, 520, 540, 480, 495, 510, 530, 480, 350, 410, 390, 370, 365, 360, 345],
            "tax_paid": [21.0, 21.8, 22.5, 24.0, 25.5, 18.0, 26.5, 26.0, 25.0, 24.5, 26.0, 27.0, 24.0, 24.8, 25.5, 26.5, 24.0, 17.5, 20.5, 19.5, 18.5, 18.2, 18.0, 17.2],
            "invoice_count": [45, 47, 49, 52, 56, 38, 58, 57, 55, 54, 57, 59, 53, 54, 56, 58, 53, 37, 45, 43, 41, 40, 39, 38],
            "void_count": [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0],
            "red_count": [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1]
        },
        "stability_metrics": {
            "continuous_invoicing_months": 24,
            "is_continuous_invoice": True,
            "sales_growth_yoy": "-14.20%",
            "cv_volatility": "0.38 (中度波动)",
            "max_break_days": "25天",
            "is_precipitous_drop": False
        },
        "top_clients": [
            {"rank": 1, "name": "中联重科股份有限公司", "amount": "1,220.00 万元", "ratio": "21.6%", "cooperation_years": "4.5年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 2, "name": "三一重工股份有限公司", "amount": "950.00 万元", "ratio": "16.8%", "cooperation_years": "3.8年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 3, "name": "徐工集团工程机械股份有限公司", "amount": "680.00 万元", "ratio": "12.0%", "cooperation_years": "3.0年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 4, "name": "柳工机械股份有限公司", "amount": "380.00 万元", "ratio": "6.7%", "cooperation_years": "2.2年", "status": "正常开票", "credit_grade": "AA"},
            {"rank": 5, "name": "山推工程机械股份有限公司", "amount": "190.00 万元", "ratio": "3.4%", "cooperation_years": "1.5年", "status": "正常开票", "credit_grade": "AA"}
        ],
        "top_suppliers": [
            {"rank": 1, "name": "宝山钢铁股份有限公司", "amount": "1,500.00 万元", "ratio": "34.2%", "cooperation_years": "4.0年", "settlement_days": "30天"},
            {"rank": 2, "name": "南京钢铁股份有限公司", "amount": "980.00 万元", "ratio": "22.4%", "cooperation_years": "3.5年", "settlement_days": "30天"},
            {"rank": 3, "name": "无锡威孚高科技集团股份有限公司", "amount": "620.00 万元", "ratio": "14.2%", "cooperation_years": "2.0年", "settlement_days": "45天"}
        ],
        "multi_lending": {
            "query_count_1m": 2,
            "query_count_3m": 4,
            "query_count_12m": 7,
            "overdue_records": 0,
            "inquiry_institutions": [
                "江苏银行常州分行 (2026-07-22, 贷款审批)",
                "常州农商银行 (2026-06-18, 授信重检)",
                "中信银行常州分行 (2026-05-30, 信用卡/小额贷)"
            ]
        },
        "ic_detail": MOCK_BUSINESS_REGISTRATION["91320400MA1W99991L"]
    },

    # --------------------------------------------------------------------------
    # 4. 上海盛泰供应链管理服务有限公司 (高危否决企业)
    # --------------------------------------------------------------------------
    {
        "company_name": "上海盛泰供应链管理服务有限公司",
        "credit_code": "91310115MA1H88773K",
        "legal_person": "陈海峰",
        "reg_capital": "2,000.00 万元人民币",
        "paid_capital": "0.00 万元人民币",
        "established_date": "2021-03-15",
        "address": "中国（上海）自由贸易试验区临港新片区业盛路188号A区502室",
        "industry": "多式联运和运输代理业",
        "risk_level": "red",
        "score": 38,
        "sub_scores": {
            "biz_score": 45,
            "risk_score": 25,
            "tax_score": 30,
            "flow_score": 20
        },
        "wfq_base_score": 380,
        "wfq_base_rating": "E",
        "wfq_preloan_quota": "0.00 万元",
        "declaration_matrix_36m": {
            "years": ["2023", "2024", "2025"],
            "vat_status": {
                "2023": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*", "0", "0", "*", "0", "0", "*", "0", "0"],
                "2025": ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
            },
            "eit_status": {
                "2023": ["*", "*", "*", "*"],
                "2024": ["*", "0", "0", "0"],
                "2025": ["0", "0", "0", "0"]
            },
            "continuous_normal_months": 0,
            "zero_declaration_count": 18,
            "rule_evaluation": "近18个月处于严重零申报或未申报状态，税务系统列为非正常户"
        },
        "production_factors_36m": {
            "electricity_correlation": "12.0% (严重背离)",
            "water_correlation": "10.5% (严重背离)",
            "logistics_correlation": "15.0% (严重背离)",
            "annual_electricity_fee": "0.80 万元",
            "annual_water_fee": "0.15 万元",
            "annual_logistics_fee": "2.00 万元",
            "capacity_utilization": "0.0%",
            "evaluation": "注册地址无实质水电能耗与经营痕迹，生产要素严重背离，具备空壳走账特征"
        },
        "industry_benchmarks": {
            "industry_gini_coefficient": 0.48,
            "market_concentration": "高分散度",
            "top_products": ["无实质主营商品"],
            "quarterly_margins": []
        },
        "financial_warnings_8": [
            {"code": "W01", "name": "存货周转异常", "status": "DANGER", "detail": "无实质存货运营"},
            {"code": "W02", "name": "应收账款恶化", "status": "DANGER", "detail": "坏账率极高，全额未收回"},
            {"code": "W03", "name": "短债长投风险", "status": "DANGER", "detail": "无实质偿债资产"},
            {"code": "W04", "name": "资产负债率异动", "status": "DANGER", "detail": "资产负债率高达 95.60%，处于资不抵债边缘"},
            {"code": "W05", "name": "经营现金流背离", "status": "DANGER", "detail": "经营现金流严重断流"},
            {"code": "W06", "name": "销售毛利暴跌", "status": "DANGER", "detail": "净利润亏损超 -20.83%"},
            {"code": "W07", "name": "税负率异常偏离", "status": "DANGER", "detail": "实际税负率仅 1.04% 严重偏离基准 3.80%"},
            {"code": "W08", "name": "大股东关联占用", "status": "DANGER", "detail": "大股东股权全部质押并已司法冻结"}
        ],
        "expert_opinions": {
            "legal_expert": "【法务合规专家】存在 2 条失信被执行记录（金额达 380 万元），1 起司法拍卖，大股东股权全额质押冻结，触发一票否决红线。",
            "tax_expert": "【财税风控专家】纳税信用等级为 D 级，欠税余额达 182.40 万元，近 18 个月连续零申报停开，金税系统已转非正常户。",
            "supply_chain_expert": "【供应链专家】前两大开票客户已注销或涉诉，无实质上游供应链采销活动，疑似空壳洗票渠道。",
            "cro_synthesis": "【首席风控官 CRO】目标企业触碰多项风控一票否决硬红线，享宇智评得分 380 分（E 级熔断），严格禁止准入，预授信额度 0 万元。"
        },
        "tax_profile": {
            "tax_rating": "D",
            "tax_rating_year": "2025",
            "tax_status": "非正常户 (存在重大涉税违规)",
            "has_arrears": True,
            "arrears_amount": 182.40,
            "tax_bureau": "国家税务总局上海市浦东新区税务局"
        },
        "financial_ratios": {
            "annual_revenue": "1,200.00 万元",
            "annual_vat_sales": "1,200.00 万元",
            "annual_vat_paid": "12.50 万元",
            "tax_burden_rate": "1.04%",
            "industry_benchmark_tax_burden": "3.80%",
            "income_tax_paid": "0.00 万元",
            "gross_margin": "0.83%",
            "net_profit_margin": "-20.83%",
            "operating_cost": "1,190.00 万元",
            "asset_liability_ratio": "95.60%",
            "current_ratio": "0.45",
            "quick_ratio": "0.32"
        },
        "tax_trend": {
            "months": ["2024-09", "2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
            "sales_amount": [310, 305, 290, 300, 150, 0, 420, 80, 0, 120, 50, 20, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "tax_paid": [15.5, 15.2, 14.5, 15.0, 7.5, 0, 21.0, 4.0, 0, 6.0, 2.5, 1.0, 0.75, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "invoice_count": [25, 24, 23, 25, 12, 0, 32, 6, 0, 8, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "void_count": [3, 2, 4, 3, 2, 0, 6, 1, 0, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "red_count": [2, 1, 3, 2, 1, 0, 5, 2, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
        "stability_metrics": {
            "continuous_invoicing_months": 0,
            "is_continuous_invoice": False,
            "sales_growth_yoy": "-88.50%",
            "cv_volatility": "1.35 (严重异常波动/停开)",
            "max_break_days": "180天+ (严重长期停开)",
            "is_precipitous_drop": True
        },
        "top_clients": [
            {"rank": 1, "name": "上海某某贸易商行（已注销）", "amount": "480.00 万元", "ratio": "40.0%", "cooperation_years": "0.8年", "status": "异常关联交易", "credit_grade": "C"},
            {"rank": 2, "name": "浙江某某国际物流有限公司", "amount": "210.00 万元", "ratio": "17.5%", "cooperation_years": "1.0年", "status": "涉诉冻结", "credit_grade": "D"}
        ],
        "top_suppliers": [
            {"rank": 1, "name": "上海某某汽运合作社", "amount": "350.00 万元", "ratio": "29.4%", "cooperation_years": "0.5年", "settlement_days": "现金即结"}
        ],
        "multi_lending": {
            "query_count_1m": 4,
            "query_count_3m": 9,
            "query_count_12m": 18,
            "overdue_records": 3,
            "inquiry_institutions": [
                "平安普惠融资担保 (2026-08-01, 催收排查)",
                "招联消费金融 (2026-07-25, 逾期催收)",
                "某地方小贷公司 (2026-07-10, 借款申请)"
            ]
        },
        "ic_detail": MOCK_BUSINESS_REGISTRATION["91310115MA1H88773K"]
    },

    # --------------------------------------------------------------------------
    # 5. 浙江红运达实业发展有限公司 (高危停开企业)
    # --------------------------------------------------------------------------
    {
        "company_name": "浙江红运达实业发展有限公司",
        "credit_code": "91330100MA2B99999P",
        "legal_person": "张大运",
        "reg_capital": "3,000.00 万元人民币",
        "paid_capital": "50.00 万元人民币",
        "established_date": "2022-04-10",
        "address": "杭州市萧山区经济技术开发区建设四路288号",
        "industry": "大宗商品商贸批发与物流供应链",
        "risk_level": "red",
        "score": 36,
        "sub_scores": {
            "biz_score": 42,
            "risk_score": 28,
            "tax_score": 25,
            "flow_score": 20
        },
        "wfq_base_score": 350,
        "wfq_base_rating": "E",
        "wfq_preloan_quota": "0.00 万元",
        "declaration_matrix_36m": {
            "years": ["2023", "2024", "2025"],
            "vat_status": {
                "2023": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*", "*", "0", "0", "0", "0", "0", "0", "0"],
                "2025": ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
            },
            "eit_status": {
                "2023": ["*", "*", "*", "*"],
                "2024": ["*", "0", "0", "0"],
                "2025": ["0", "0", "0", "0"]
            },
            "continuous_normal_months": 0,
            "zero_declaration_count": 19,
            "rule_evaluation": "近19个月处于严重零申报或未申报状态"
        },
        "production_factors_36m": {
            "electricity_correlation": "10.0% (严重背离)",
            "water_correlation": "8.0% (严重背离)",
            "logistics_correlation": "12.0% (严重背离)",
            "annual_electricity_fee": "0.50 万元",
            "annual_water_fee": "0.10 万元",
            "annual_logistics_fee": "1.50 万元",
            "capacity_utilization": "0.0%",
            "evaluation": "能耗与运力近乎为零，企业已实质停工停产"
        },
        "industry_benchmarks": {
            "industry_gini_coefficient": 0.45,
            "market_concentration": "高分散度",
            "top_products": ["无实质主营商品"],
            "quarterly_margins": []
        },
        "financial_warnings_8": [
            {"code": "W01", "name": "存货周转异常", "status": "DANGER", "detail": "大宗商品仓单涉假，无真实存货"},
            {"code": "W02", "name": "应收账款恶化", "status": "DANGER", "detail": "应收账款形成巨额坏账"},
            {"code": "W03", "name": "短债长投风险", "status": "DANGER", "detail": "资金链完全断裂"},
            {"code": "W04", "name": "资产负债率异动", "status": "DANGER", "detail": "资产负债率 92.50%，高危逾期"},
            {"code": "W05", "name": "经营现金流背离", "status": "DANGER", "detail": "经营性现金流枯竭"},
            {"code": "W06", "name": "销售毛利暴跌", "status": "DANGER", "detail": "主营业务持续亏损"},
            {"code": "W07", "name": "税负率异常偏离", "status": "DANGER", "detail": "税负率仅 1.04% 远低于行业正常值"},
            {"code": "W08", "name": "大股东关联占用", "status": "DANGER", "detail": "大股东张大运全部股权被查封冻结"}
        ],
        "expert_opinions": {
            "legal_expert": "【法务合规专家】该企业已被列入严重违法失信名单（黑名单），有 1 条失信执行未履行（182万元），法定代表人变更频繁，风险极高。",
            "tax_expert": "【财税风控专家】纳税等级评定为 D 级，金税系统税务停供停开，近 12 个月无开票流水，欠税超 180 万元未结清。",
            "supply_chain_expert": "【供应链专家】采销关联方交易嫌疑严重，上游为小额商行，开票集中度超过 78%，存在空壳虚假贸易风险。",
            "cro_synthesis": "【首席风控官 CRO】触发严重违法失信名单与税务 D 级双重硬红线，享宇智评得分 350 分（E 级熔断），一票否决拒绝准入，额度归零。"
        },
        "tax_profile": {
            "tax_rating": "D",
            "tax_rating_year": "2025",
            "tax_status": "异常",
            "has_arrears": True,
            "arrears_amount": 182.40,
            "tax_bureau": "国家税务总局杭州市萧山区税务局"
        },
        "financial_ratios": {
            "annual_revenue": "1,200.00 万元",
            "annual_vat_sales": "1,200.00 万元",
            "annual_vat_paid": "12.50 万元",
            "tax_burden_rate": "1.04%",
            "industry_benchmark_tax_burden": "3.50%",
            "income_tax_paid": "0.00 万元",
            "gross_margin": "0.83%",
            "net_profit_margin": "-20.83%",
            "operating_cost": "1,190.00 万元",
            "asset_liability_ratio": "92.50%",
            "current_ratio": "0.65",
            "quick_ratio": "0.45"
        },
        "tax_trend": {
            "months": ["2024-09", "2024-10", "2024-11", "2024-12", "2025-01", "2025-02", "2025-03", "2025-04", "2025-05", "2025-06", "2025-07", "2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08"],
            "sales_amount": [450, 380, 210, 150, 80, 30, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "tax_paid": [22.5, 19.0, 10.5, 7.5, 4.0, 1.5, 0.75, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "invoice_count": [35, 28, 16, 12, 6, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "void_count": [4, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "red_count": [3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        },
        "stability_metrics": {
            "continuous_invoicing_months": 0,
            "is_continuous_invoice": False,
            "sales_growth_yoy": "-79.31%",
            "cv_volatility": "1.42 (断崖式下跌停开)",
            "max_break_days": "180天+ (严重停开发票)",
            "is_precipitous_drop": True
        },
        "top_clients": [
            {"rank": 1, "name": "关联贸易公司 A", "amount": "420.00 万元", "ratio": "78.0%", "cooperation_years": "0.5年", "status": "关联输送嫌疑", "credit_grade": "D"},
            {"rank": 2, "name": "关联商贸公司 B", "amount": "90.00 万元", "ratio": "15.0%", "cooperation_years": "0.3年", "status": "异常关联交易", "credit_grade": "D"}
        ],
        "top_suppliers": [
            {"rank": 1, "name": "浙江某大宗物资商行", "amount": "380.00 万元", "ratio": "31.9%", "cooperation_years": "0.4年", "settlement_days": "现结"}
        ],
        "multi_lending": {
            "query_count_1m": 3,
            "query_count_3m": 8,
            "query_count_12m": 15,
            "overdue_records": 2,
            "inquiry_institutions": [
                "浙商银行杭州分行 (2026-07-15, 风险排查)",
                "网商银行 (2026-06-20, 催收管理)"
            ]
        },
        "ic_detail": MOCK_BUSINESS_REGISTRATION["91330100MA2B99999P"]
    },

    # --------------------------------------------------------------------------
    # 6. 享宇智评 50 页企业尽调报告真实样本企业: 东莞市顺捷实业有限公司 (B+ 级 / 702分)
    # --------------------------------------------------------------------------
    {
        "company_name": "东莞市顺捷实业有限公司",
        "credit_code": "91441900MA4W88888X",
        "legal_person": "吕顺光",
        "reg_capital": "500.00 万元人民币",
        "paid_capital": "0.00 万元人民币",
        "paid_rate": "0.0%",
        "established_date": "2017-03-15",
        "operating_years": "7.9年",
        "address": "东莞市长安镇乌沙社区振安中路128号顺捷工业园",
        "industry": "橡胶和塑料制品业（精密模具制造与塑胶制品）",
        "risk_level": "green",
        "score": 85,
        "sub_scores": {
            "biz_score": 88,
            "risk_score": 92,
            "tax_score": 90,
            "flow_score": 86
        },
        "suggested_quota_min": 300,
        "suggested_quota_max": 500,
        "summary": "目标企业开票流水真实稳健（近12个月开票4063.73万元，近3年有效开票1.36亿元），纳税信用评级为A级，近36个月纳税申报矩阵全部正常。月度开票额与电费支出强相关拟合（相关系数0.968），下游顺丰供应链（15.65%）与怡亚通（13.94%）等大客户留存率高达80%，毛利率（24.34%）显著高于行业中位值。虽注册资本实缴为0且资产负债率偏高（87.38%），但主营造血能力强，享宇智评分702分 (B+级)，建议给予标准信贷授信500.00万元并追加法人连带责任担保。",
        "wfq_base_score": 702,
        "wfq_base_rating": "B+",
        "wfq_preloan_quota": "500.00 万元",
        "declaration_matrix_36m": {
            "years": ["2022", "2023", "2024"],
            "vat_status": {
                "2022": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2023": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*", "*"]
            },
            "eit_status": {
                "2022": ["*", "*", "*", "*"],
                "2023": ["*", "*", "*", "*"],
                "2024": ["*", "*", "*", "*"]
            },
            "continuous_normal_months": 36,
            "zero_declaration_count": 0,
            "rule_evaluation": "近36个月申报连续且均为正常申报（*），无逾期、漏报及零申报异常"
        },
        "production_factors_36m": {
            "electricity_correlation": "96.8% (强相关)",
            "water_correlation": "92.5% (强相关)",
            "logistics_correlation": "94.8% (强相关)",
            "annual_electricity_fee": "385.60 万元 (单月最高 51.84 万元)",
            "annual_water_fee": "24.50 万元",
            "annual_logistics_fee": "195.00 万元",
            "capacity_utilization": "82.4%",
            "evaluation": "月度电费、水费与物流运费开票与开票销售额呈强正相关拟合（皮尔逊相关系数 0.968），实体制造业生产真实，排除买票虚开与空壳过票。"
        },
        "industry_benchmarks": {
            "industry_gini_coefficient": 0.36,
            "market_concentration": "健康竞争型",
            "top_products": [
                {"name": "塑料制品", "ratio": "85.57%", "climate": "波动下降型"},
                {"name": "五金模具", "ratio": "6.48%", "climate": "直线平稳型"},
                {"name": "经营租赁及其他", "ratio": "7.95%", "climate": "持续增长型"}
            ],
            "quarterly_margins": [
                {"quarter": "2022Q1", "enterprise_margin": "23.8%", "industry_median": "14.2%", "premium": "+9.6%"},
                {"quarter": "2022Q2", "enterprise_margin": "24.0%", "industry_median": "14.3%", "premium": "+9.7%"},
                {"quarter": "2022Q3", "enterprise_margin": "24.1%", "industry_median": "14.5%", "premium": "+9.6%"},
                {"quarter": "2022Q4", "enterprise_margin": "24.5%", "industry_median": "14.6%", "premium": "+9.9%"},
                {"quarter": "2023Q1", "enterprise_margin": "24.2%", "industry_median": "14.4%", "premium": "+9.8%"},
                {"quarter": "2023Q2", "enterprise_margin": "24.4%", "industry_median": "14.5%", "premium": "+9.9%"},
                {"quarter": "2023Q3", "enterprise_margin": "24.3%", "industry_median": "14.4%", "premium": "+9.9%"},
                {"quarter": "2023Q4", "enterprise_margin": "24.6%", "industry_median": "14.6%", "premium": "+10.0%"},
                {"quarter": "2024Q1", "enterprise_margin": "24.1%", "industry_median": "14.3%", "premium": "+9.8%"},
                {"quarter": "2024Q2", "enterprise_margin": "24.3%", "industry_median": "14.5%", "premium": "+9.8%"},
                {"quarter": "2024Q3", "enterprise_margin": "24.4%", "industry_median": "14.5%", "premium": "+9.9%"},
                {"quarter": "2024Q4", "enterprise_margin": "24.5%", "industry_median": "14.6%", "premium": "+9.9%"}
            ]
        },
        "financial_warnings_8": [
            {"code": "W01", "name": "收入增长稳定性", "status": "WARN", "detail": "近3年中有2年营收负增长（2023年-12.7%，2024年-9.94%），受消费电子模具周期性影响"},
            {"code": "W02", "name": "低质量销售活力 (增收不增利)", "status": "WARN", "detail": "销售收入增幅与利润增幅存在一定背离，原材料涨价压缩部分毛利空间"},
            {"code": "W03", "name": "期间费用失控", "status": "NORMAL", "detail": "期间费用增速与营收匹配正常，未见失控"},
            {"code": "W04", "name": "应收账款恶化", "status": "NORMAL", "detail": "应收账款周转率 2.87，核心大客户回款良好"},
            {"code": "W05", "name": "激进营运资金管理", "status": "NORMAL", "detail": "流动资产可覆盖流动负债，营运资金净额为正"},
            {"code": "W06", "name": "激进短期贷款管理", "status": "WARN", "detail": "短期借款 560.29 万元（占总负债 12.0%），存在短期流动性偿债关注"},
            {"code": "W07", "name": "销售毛利暴跌", "status": "NORMAL", "detail": "企业毛利率 24.34% 持续大幅高于行业中位值 14.48%，毛利溢价 +9.86%"},
            {"code": "W08", "name": "大股东关联占用", "status": "NORMAL", "detail": "未发现大股东关联方非经营性占用资金"}
        ],
        "expert_opinions": {
            "legal_expert": "【法务合规专家】主体工商成立 7.9 年存续良好，无失信被执行记录。关注到 2024 年存在 1 笔 20 万元环保行政处罚（东环罚字(2018)4277号），企业已全额缴纳罚款并完成环保验收，法务合规风险整体可控。",
            "tax_expert": "【财税风控专家】近 36 个月金税申报全部为正常申报（*），纳税信用评级 A 级，增值税税负率 2.66% 处于合理中枢。生产用电（单月最高 51.84 万元）与发票营收高度正相关（0.968），实体制造经营真实。",
            "supply_chain_expert": "【供应链商业专家】下游前两大客户为顺丰供应链（15.65%）与怡亚通（13.94%），大客户留存率高达 80.0%，回款保障性强；企业毛利率 24.34% 持续大幅领先行业中位数（14.48%），具备核心模具精密加工技术壁垒。",
            "cro_synthesis": "【首席风控官 CRO】目标企业享宇智评综合得分 702 分（B+ 级，低风险），五大红线全部排查通过。企业虽实缴为 0 且资产负债率达 87.38%，但实体经营真实、大客户粘性高、现金流健康。建议核定预授信额度 500.00 万元，要求大股东吕顺光提供个人连带担保并动态监控月度电费与断票天数。"
        },
        "tax_profile": {
            "tax_rating": "A",
            "tax_rating_year": "2023",
            "tax_status": "正常",
            "has_arrears": False,
            "arrears_amount": 0.0,
            "tax_bureau": "国家税务总局东莞市税务局长安税务分局"
        },
        "financial_ratios": {
            "annual_revenue": "4,063.73 万元",
            "annual_vat_sales": "4,063.73 万元",
            "annual_vat_paid": "108.10 万元",
            "tax_burden_rate": "2.66%",
            "industry_benchmark_tax_burden": "2.50%",
            "income_tax_paid": "45.20 万元",
            "gross_margin": "24.34%",
            "net_profit_margin": "6.85%",
            "operating_cost": "3,074.62 万元",
            "asset_liability_ratio": "87.38%",
            "current_ratio": "1.04",
            "quick_ratio": "0.33",
            "inventory_amount": "2,863.73 万元",
            "inventory_turnover": "1.24",
            "accounts_receivable": "1,410.59 万元",
            "ar_turnover": "2.87",
            "interest_coverage_ratio": "40.71 倍",
            "borrowing_dependency": "83.15%"
        },
        "tax_trend": {
            "months": ["2022-01", "2022-04", "2022-07", "2022-10", "2023-01", "2023-04", "2023-07", "2023-10", "2024-01", "2024-04", "2024-07", "2024-10"],
            "sales_amount": [320.5, 345.8, 380.2, 410.6, 290.4, 335.2, 360.8, 375.0, 310.2, 338.5, 355.0, 368.4],
            "tax_paid": [8.5, 9.2, 10.1, 10.9, 7.7, 8.9, 9.6, 10.0, 8.2, 9.0, 9.4, 9.8],
            "invoice_count": [72, 78, 85, 92, 60, 75, 81, 84, 68, 76, 80, 83],
            "void_count": [0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
            "red_count": [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0]
        },
        "stability_metrics": {
            "continuous_invoicing_months": 36,
            "is_continuous_invoice": True,
            "sales_growth_yoy": "-9.77%",
            "sales_growth_h1_qoq": "-3.89%",
            "cv_volatility": "0.18 (平稳)",
            "max_break_days": "27天 (2023-01-11~2023-02-06，春节假期正常停开)",
            "void_rate": "0.92%",
            "red_rate": "0.61%",
            "is_precipitous_drop": False
        },
        "top_clients": [
            {"rank": 1, "name": "顺丰供应链（东莞）有限公司", "amount": "636.00 万元", "ratio": "15.65%", "cooperation_years": "4.2年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 2, "name": "深圳市怡亚通供应链股份有限公司", "amount": "566.50 万元", "ratio": "13.94%", "cooperation_years": "3.8年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 3, "name": "东莞市富强精密模具有限公司", "amount": "455.10 万元", "ratio": "11.20%", "cooperation_years": "3.5年", "status": "正常开票", "credit_grade": "AA+"},
            {"rank": 4, "name": "立讯精密工业股份有限公司", "amount": "345.40 万元", "ratio": "8.50%", "cooperation_years": "3.0年", "status": "正常开票", "credit_grade": "AAA"},
            {"rank": 5, "name": "东莞市长安华美塑胶五金制品厂", "amount": "285.00 万元", "ratio": "7.01%", "cooperation_years": "2.5年", "status": "正常开票", "credit_grade": "A"}
        ],
        "top_suppliers": [
            {"rank": 1, "name": "东莞市雄杰塑胶原料有限公司", "amount": "413.80 万元", "ratio": "13.46%", "cooperation_years": "4.0年", "settlement_days": "60天"},
            {"rank": 2, "name": "广东电网有限责任公司东莞供电局", "amount": "313.00 万元", "ratio": "10.18%", "cooperation_years": "7.9年", "settlement_days": "按月扣缴"},
            {"rank": 3, "name": "中远海运集装箱运输有限公司东莞分公司", "amount": "230.60 万元", "ratio": "7.50%", "cooperation_years": "3.5年", "settlement_days": "30天"},
            {"rank": 4, "name": "东莞市联胜精密钢材批发部", "amount": "195.00 万元", "ratio": "6.34%", "cooperation_years": "3.0年", "settlement_days": "45天"}
        ],
        "multi_lending": {
            "query_count_1m": 0,
            "query_count_3m": 1,
            "query_count_12m": 3,
            "overdue_records": 0,
            "inquiry_institutions": ["中国农业银行东莞长安支行 (2024-04-10, 授信审批)"]
        },
        "ic_detail": MOCK_BUSINESS_REGISTRATION["91441900MA4W88888X"]
    }
]

# ==============================================================================
# 3. 额度加油包套餐定义 (统一授权模式全景尽调报告)
# ==============================================================================

RECHARGE_PACKAGES = [
    {
        "id": "pack_single_1",
        "name": "单份尝鲜体验包 (1份)",
        "quota_points": 1,
        "original_price": 498.00,
        "price": 368.00,
        "tag": "单份 ¥368.0 · 体验",
        "type": "authorized",
        "desc": "包含 1 份企业全景尽调报告，支持在线目录大纲查阅与 A4 PDF 原件下载，终身免费复查。",
        "features": [
            "1 份企业全景尽调报告",
            "支持在线目录大纲索引查阅",
            "支持一键下载 A4 PDF 原件",
            "企业工商基本面与股权穿透全量覆盖",
            "企业涉税涉诉司法合规深度排查",
            "永久归档终身免费复查已生成报告"
        ]
    },
    {
        "id": "pack_standard_10",
        "name": "标准进阶充值包 (10份)",
        "quota_points": 10,
        "original_price": 4980.00,
        "price": 3380.00,
        "tag": "单份 ¥338.0 · 推荐",
        "type": "authorized",
        "desc": "包含 10 份企业全景尽调报告 (单份立省 ¥30)，适合中小企业信贷初筛与投前尽调，支持开具增值税专用发票。",
        "features": [
            "10 份企业全景尽调报告",
            "单份折算低至 ¥338 元",
            "支持在线目录大纲索引查阅",
            "支持一键下载 A4 PDF 原件",
            "企业工商基本面与股权穿透全量覆盖",
            "支持开具增值税专用发票",
            "永久归档终身免费复查已生成报告"
        ]
    },
    {
        "id": "pack_org_50",
        "name": "机构大额优选包 (50份)",
        "quota_points": 50,
        "original_price": 24900.00,
        "price": 15900.00,
        "tag": "单份 ¥318.0 · 最优",
        "type": "authorized",
        "desc": "包含 50 份企业全景尽调报告 (单份低至 ¥318，立省 ¥2500)，适合金融机构与律所高频批量排查，支持对公打款。",
        "features": [
            "50 份企业全景尽调报告",
            "单份折算低至 ¥318 元 (最优)",
            "支持在线目录大纲索引查阅",
            "支持一键下载 A4 PDF 原件",
            "企业工商基本面与股权穿透全量覆盖",
            "支持开具发票与对公转账结算",
            "永久归档终身免费复查已生成报告"
        ]
    }
]
