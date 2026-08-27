import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  TrendingUp, 
  Activity, 
  Layers, 
  FileCheck2, 
  Zap, 
  CheckCircle2, 
  ChevronRight, 
  Database, 
  Lock, 
  Cpu, 
  Building2, 
  TableProperties,
  Scale,
  Calendar,
  Truck,
  BarChart3,
  Bot,
  Users,
  Award,
  CreditCard,
  FileSignature,
  Share2,
  FileDown,
  Building,
  Check,
  HelpCircle,
  ShieldAlert,
  Gift
} from 'lucide-react';
import apiClient from '../../api/client';

export default function HomePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setKeyword(val);
    if (val.trim().length >= 1) {
      setSearching(true);
      try {
        const res = await apiClient.get(`/v1/search/companies?keyword=${encodeURIComponent(val)}`);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectCompany = (company) => {
    navigate('/app', { state: { prefillCompany: company } });
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-800 antialiased selection:bg-sky-100 selection:text-sky-900">
      
      {/* ========================================================================= */}
      {/* 1. Hero 核心首屏：权威定位与企业检索输入 */}
      {/* ========================================================================= */}
      <section className="pt-16 pb-20 text-center px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-6">
        
        {/* 顶部标签 */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-xs bg-sky-50 border border-sky-300 text-sky-900 text-xs font-bold shadow-2xs">
          <span className="w-2 h-2 rounded-xs bg-teal-600"></span>
          <span>官方市监工商 · 司法涉诉 · 股权穿透 · 企业全景尽调报告查阅平台</span>
          <ChevronRight className="w-3.5 h-3.5 text-sky-700" />
        </div>

        {/* 主标题 */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
          聚合官方中台与企业经营全息档案 <br />
          <span className="text-sky-800">
            生成银行信贷级企业全景深度尽调报告
          </span>
        </h1>

        {/* 核心价值阐述 */}
        <p className="text-sm sm:text-base text-slate-600 max-w-3xl mx-auto leading-relaxed">
          官方中台直连 + 股权出资穿透与失信合规排查 + 银行信贷级企业全景尽调报告。支持沉浸式在线目录查阅与一键导出 A4 PDF 原件。
        </p>

        {/* 交互式企业搜索首屏组件 */}
        <div className="pt-2 max-w-2xl mx-auto relative text-left">
          <div className="relative bg-white rounded-sm p-1.5 shadow-2xs border border-slate-300 focus-within:border-sky-600 transition-colors">
            <div className="flex items-center">
              <Search className="w-4 h-4 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={keyword}
                onChange={handleSearchChange}
                placeholder="输入企业全称或统一社会信用代码（如：深圳腾讯前海、江苏恒瑞智造、享宇数科）..."
                className="w-full bg-transparent border-0 px-3 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              <button 
                onClick={() => {
                  if (keyword.trim()) {
                    navigate('/app', { state: { prefillCompany: { company_name: keyword } } });
                  } else {
                    navigate('/app');
                  }
                }}
                className="inline-flex items-center px-5 py-2.5 rounded-sm bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shadow-2xs transition-colors shrink-0 cursor-pointer"
              >
                免费体验 AI 尽调
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </button>
            </div>

            {/* 搜索下拉联想 */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-sm shadow-lg border border-slate-300 overflow-hidden z-50 divide-y divide-slate-100">
                <div className="p-2.5 text-xs text-slate-500 font-semibold bg-slate-50 flex items-center justify-between">
                  <span>匹配到企业主体（点击直接填入）：</span>
                  <span className="text-sky-800 font-mono font-bold">官方中台实时联想</span>
                </div>
                <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {searchResults.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectCompany(item)}
                      className="p-3 hover:bg-sky-50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{item.company_name}</span>
                        <span className="text-xs text-sky-800 px-2 py-0.5 rounded-xs bg-sky-50 border border-sky-300 font-mono">
                          法人: {item.legal_person}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-slate-500 font-mono">
                        <span>代码: {item.credit_code}</span>
                        <span>注册资本: {item.reg_capital}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span>💡 快捷体验热词:</span>
            <button onClick={() => setKeyword('深圳腾讯前海信息技术有限公司')} className="text-sky-800 hover:underline cursor-pointer">深圳腾讯前海</button>
            <span>•</span>
            <button onClick={() => setKeyword('江苏恒瑞智造科技有限公司')} className="text-sky-800 hover:underline cursor-pointer">江苏恒瑞智造</button>
            <span>•</span>
            <button onClick={() => setKeyword('享宇数科供应链（深圳）有限公司')} className="text-teal-800 font-semibold hover:underline cursor-pointer">享宇数科供应链</button>
          </div>
        </div>

        {/* 4 维硬实力信任指标条 */}
        <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="bg-white p-4 rounded-sm border border-slate-300 shadow-2xs">
            <span className="text-2xl font-extrabold text-sky-800 font-mono block">全维度</span>
            <span className="text-xs font-semibold text-slate-700 mt-0.5 block">官方数据聚合</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">覆盖市监/裁判文书/执行网</span>
          </div>
          <div className="bg-white p-4 rounded-sm border border-slate-300 shadow-2xs">
            <span className="text-2xl font-extrabold text-teal-700 font-mono block">多层级</span>
            <span className="text-xs font-semibold text-slate-700 mt-0.5 block">股权穿透与实控人图谱</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">最终受益人穿透核验</span>
          </div>
          <div className="bg-white p-4 rounded-sm border border-slate-300 shadow-2xs">
            <span className="text-2xl font-extrabold text-sky-800 font-mono block">100%</span>
            <span className="text-xs font-semibold text-slate-700 mt-0.5 block">司法失信红线排查</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">限高令/异常名录/行政处罚</span>
          </div>
          <div className="bg-white p-4 rounded-sm border border-slate-300 shadow-2xs">
            <span className="text-2xl font-extrabold text-teal-700 font-mono block">全景报告</span>
            <span className="text-xs font-semibold text-slate-700 mt-0.5 block">银行级尽调报告</span>
            <span className="text-[11px] text-slate-400 mt-0.5 block">全维度穿透与PDF原件导出</span>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 2. 权威数据源矩阵与数据全面性 (Authoritative Multi-Source Data Grid) */}
      {/* ========================================================================= */}
      <section className="py-16 bg-white border-y border-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 uppercase tracking-wider bg-sky-50 px-2.5 py-0.5 rounded-xs border border-sky-300">
              AUTHORITATIVE MULTI-SOURCE DATA ARCHITECTURE
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              四大国家级权威数据源深度聚合 · 破除尽调信息孤岛
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              严格遵循「最高准据原则 (Golden Source Principle)」，官方中台数据深度整合与交叉验证，覆盖陈旧数据，构建不可篡改的企业全息事实集。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. 工商市监 */}
            <div className="p-6 rounded-sm bg-slate-50 border border-slate-300 shadow-2xs space-y-3.5 flex flex-col justify-between hover:border-sky-600 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-sm bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">官方市监工商中台</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  聚合国家企业信用信息公示系统全量底账，毫秒级提取登记照面、注册与实缴到位率、董监高治理架构、对外投资与 15 项历史工商变更加权频率。
                </p>
              </div>
              <ul className="pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-700" /> 多层级穿透识别实际控制人</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-700" /> 认缴/实缴出资到位率穿透</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-700" /> 董监高关联任职全景排查</li>
              </ul>
            </div>

            {/* 2. 司法合规 */}
            <div className="p-6 rounded-sm bg-slate-50 border border-slate-300 shadow-2xs space-y-3.5 flex flex-col justify-between hover:border-rose-600 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-sm bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-800">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">最高法与司法合规雷达</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  自研司法合规排查雷达，全景扫描裁判文书网、全国失信被执行人名录、限制高消费令、经营异常名录、环保行政处罚及金融机构动产抵质押敞口。
                </p>
              </div>
              <ul className="pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-700" /> 裁判文书案由深度分类审查</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-700" /> 五大红线指标秒级交叉排查</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-rose-700" /> 动产抵押与大股东质押率穿透</li>
              </ul>
            </div>

            {/* 3. 股权穿透与实控人 */}
            <div className="p-6 rounded-sm bg-slate-50 border border-slate-300 shadow-2xs space-y-3.5 flex flex-col justify-between hover:border-teal-600 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-sm bg-teal-100 border border-teal-300 flex items-center justify-center text-teal-800">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">股权穿透与实控人图谱</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  多层级股权链条向上穿透至自然人或国资主体，精准识别最终实控人与受益所有人，排查隐性关联方与交叉持股风险。
                </p>
              </div>
              <ul className="pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-teal-700" /> 最终受益所有人穿透识别</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-teal-700" /> 股东出资历史与实缴核验</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-teal-700" /> 对外投资全景关联图谱</li>
              </ul>
            </div>

            {/* 4. 供应链客商与经营态势 */}
            <div className="p-6 rounded-sm bg-slate-50 border border-slate-300 shadow-2xs space-y-3.5 flex flex-col justify-between hover:border-sky-600 transition-colors">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-sm bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-extrabold text-slate-900">供应链与经营态势排查</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  聚合行业上下游主要客商信息与经营动态，结合知识产权、资质许可与招投标档案，全景呈现企业持续经营能力。
                </p>
              </div>
              <ul className="pt-3 border-t border-slate-200 text-xs text-slate-700 space-y-1.5 font-medium">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-700" /> 核心资质许可与行政许可</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-700" /> 知识产权与专利商标资产</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-sky-700" /> 招投标与重大经营事件排查</li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. 行业应用场景 (Enterprise Scenarios) */}
      {/* ========================================================================= */}
      <section className="py-16 bg-white border-y border-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 uppercase tracking-wider bg-sky-50 px-2.5 py-0.5 rounded-xs border border-sky-300">
              INDUSTRY SOLUTIONS & USE CASES
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              金融机构与供应链核心企业四大业务场景落地
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              赋能普惠信贷、供应链准入、融资租赁与股权投资全流程降本增效
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-sm bg-slate-50 border border-slate-300 shadow-2xs space-y-3">
              <span className="text-xs font-mono font-bold text-sky-800 px-2 py-0.5 rounded-xs bg-sky-100 border border-sky-200 inline-block">场景 01</span>
              <h3 className="text-base font-extrabold text-slate-900">商业银行普惠信贷审批</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                贷前 0 接触快速初审，金税强授权精准测算商业参考额度（¥300~500万），尽调会材料秒级生成。
              </p>
            </div>

            <div className="p-6 rounded-sm bg-slate-50 border border-slate-300 shadow-2xs space-y-3">
              <span className="text-xs font-mono font-bold text-teal-800 px-2 py-0.5 rounded-xs bg-teal-100 border border-teal-200 inline-block">场景 02</span>
              <h3 className="text-base font-extrabold text-slate-900">核心企业供应链准入年审</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                批量导入 100+ 供应商统一代码，排查司法失信被执行、大股东质押套现及空壳虚开发票，杜绝关联舞弊。
              </p>
            </div>

            <div className="p-6 rounded-sm bg-slate-50 border border-slate-300 shadow-2xs space-y-3">
              <span className="text-xs font-mono font-bold text-sky-800 px-2 py-0.5 rounded-xs bg-sky-100 border border-sky-200 inline-block">场景 03</span>
              <h3 className="text-base font-extrabold text-slate-900">融资租赁与商业保理尽调</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                以月度用电与物流运费强拟合度核验承租企业实体经营活跃度，严防应收账款重复质押与空头承租。
              </p>
            </div>

            <div className="p-6 rounded-sm bg-slate-50 border border-slate-300 shadow-2xs space-y-3">
              <span className="text-xs font-mono font-bold text-teal-800 px-2 py-0.5 rounded-xs bg-teal-100 border border-teal-200 inline-block">场景 04</span>
              <h3 className="text-base font-extrabold text-slate-900">产业基金与股权投前风控</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                多层级穿透实际控制人与最终受益人股份，溯源 15 项工商变更历史与环保处罚记录，出具投决会尽调底稿。
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 分级权益商业化加油包 (Tiered Pricing & Packages) */}
      {/* ========================================================================= */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        <div className="text-center max-w-3xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 uppercase tracking-wider bg-sky-50 px-2.5 py-0.5 rounded-xs border border-sky-300">
            TRANSPARENT TIERED PACKAGES
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            透明灵活的尽调加油包 · 按需充值永久有效
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            新注册即赠送 2 次免费额度，支持按次加油，权益分级清晰，无任何隐形门槛
          </p>
        </div>

        {/* 1 次尽调额度 = 1 份报告 与 数据中台价值拆解核心看板 */}
        <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-xs text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-300">
                  超高性价比承诺
                </span>
                <h3 className="text-base font-extrabold text-slate-900">
                  消耗 1 次额度 = 生成 1 份终身有效全景报告 (平台自研全维数据深度拟合计算)
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                按报告份数结算，一次生成永久归档于历史资产库中，后续在系统内随时复查、调阅底稿<strong>终身免费，绝无重复扣费</strong>。
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 shrink-0 font-mono">
              <span className="text-xs text-slate-400 block line-through">市面独立采购成本: ¥85~125/家</span>
              <span className="text-sm font-extrabold text-teal-700 block mt-0.5">EDD 仅耗 1 次额度 (低至 ¥22.5/份)</span>
            </div>
          </div>

          {/* 全维数据体系 4 宫格拆解 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-sm border border-slate-200 space-y-1.5">
              <div className="font-extrabold text-slate-900 flex items-center justify-between">
                <span className="text-sky-800">市监工商数据中台</span>
                <span className="text-slate-400 font-mono text-[11px]">自研中台</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                市监照面登记、实缴出资到位率穿透、董监高治理体系、15项工商变更轨迹、对外投资图谱及实际控制人。
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-sm border border-slate-200 space-y-1.5">
              <div className="font-extrabold text-slate-900 flex items-center justify-between">
                <span className="text-rose-800">司法与行政合规中台</span>
                <span className="text-slate-400 font-mono text-[11px]">实时穿透</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                最高法裁判文书涉诉案由审查、失信被执行人红线、限制高消费令、经营异常名录、环保处罚与动产抵质押。
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-sm border border-slate-200 space-y-1.5">
              <div className="font-extrabold text-slate-900 flex items-center justify-between">
                <span className="text-teal-800">股权与经营态势中台</span>
                <span className="text-slate-400 font-mono text-[11px]">穿透核验</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                多层级股权架构向上穿透、最终受益所有人识别、对外关联投资图谱与主要客商经营态势。
              </p>
            </div>

            <div className="p-3.5 bg-sky-50/70 rounded-sm border border-sky-200 space-y-1.5">
              <div className="font-extrabold text-slate-900 flex items-center justify-between">
                <span className="text-sky-900">企业全景报告与PDF导出</span>
                <span className="text-sky-700 font-mono text-[11px]">享宇智评</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">
                集成全景大纲目录索引、深度尽调报告全文，支持在线高清沉浸式查阅与 A4 PDF 原件导出。
              </p>
            </div>
          </div>
        </div>

        {/* 注册赠送额度提示条 */}
        <div className="p-4 rounded-sm bg-sky-50/80 border border-sky-300 text-xs text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="font-extrabold text-sm text-sky-900 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-sky-700" />
              新用户个人注册并完成实名认证，即刻获赠 1 次免费全景尽调额度
            </div>
            <p className="text-slate-600 text-[11px]">
              * 注：消耗 1 次额度即可生成 1 份终身有效的企业全景尽调报告，支持导出银行级 A4 PDF 原件。
            </p>
          </div>
          <Link
            to="/app"
            className="px-4 py-2 rounded-sm bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shrink-0 transition-colors shadow-2xs text-center"
          >
            立即领取 1 次赠送
          </Link>
        </div>

        {/* 3 档分级套餐矩阵 (基于报告份数充值) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. 标准充值包 (10份) */}
          <div className="bg-white rounded-sm p-6 border-2 border-sky-700 shadow-md flex flex-col justify-between relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-xs text-[10px] font-bold bg-sky-700 text-white uppercase tracking-wider">
              单次 ¥26.8
            </span>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-sky-800 uppercase tracking-wider block">灵活充值 · 永久有效</span>
                <h3 className="font-extrabold text-lg text-slate-900 mt-1">标准充值包 (10份)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  包含 10 份企业全景尽调报告，适合信贷与业务精准尽调。
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-sky-800">¥</span>
                  <span className="text-3xl font-extrabold text-slate-900">268</span>
                  <span className="text-xs text-slate-400 line-through ml-1">¥380</span>
                </div>
                <span className="text-xs text-sky-800 font-bold mt-0.5 block">包含 10 份全景报告 (¥26.8/份)</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 pt-3 border-t border-slate-100 font-medium">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700 shrink-0" /> 10 份企业全景尽调报告</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700 shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700 shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700 shrink-0" /> 企业工商基本面与股权全量覆盖</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700 shrink-0" /> 企业经营司法合规深度排查</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-sky-700 shrink-0" /> 永久归档终身免费复查已生成报告</li>
              </ul>
            </div>

            <button 
              onClick={() => navigate('/app/profile?tab=billing')}
              className="mt-6 w-full py-2.5 rounded-sm bg-sky-700 hover:bg-sky-800 text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
            >
              立即充值 10 份
            </button>
          </div>

          {/* 2. 优惠充值包 (50份) */}
          <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs flex flex-col justify-between hover:border-slate-400 transition-colors relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-xs text-[10px] font-bold bg-teal-700 text-white uppercase tracking-wider">
              单次 ¥24.0 · 推荐
            </span>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">优惠充值 · 单价更低</span>
                <h3 className="font-extrabold text-lg text-slate-900 mt-1">优惠充值包 (50份)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  包含 50 份企业全景尽调报告，单次成本更低，支持开具发票。
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-500">¥</span>
                  <span className="text-3xl font-extrabold text-slate-900">1,200</span>
                  <span className="text-xs text-slate-400 line-through ml-1">¥1,900</span>
                </div>
                <span className="text-xs text-teal-800 font-bold mt-0.5 block">包含 50 份全景报告 (¥24.0/份)</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 pt-3 border-t border-slate-100">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 50 份企业全景尽调报告</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 企业工商基本面与股权全量覆盖</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 支持开具增值税发票</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 永久归档终身免费复查已生成报告</li>
              </ul>
            </div>

            <button 
              onClick={() => navigate('/app/profile?tab=billing')}
              className="mt-6 w-full py-2.5 rounded-sm border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              购买 50 份优惠包
            </button>
          </div>

          {/* 3. 大额特惠包 (200份) */}
          <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs flex flex-col justify-between hover:border-slate-400 transition-colors relative">
            <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-xs text-[10px] font-bold bg-slate-800 text-white uppercase tracking-wider">
              单次 ¥22.5 · 最优
            </span>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider block">大额特惠 · 单价最优</span>
                <h3 className="font-extrabold text-lg text-slate-900 mt-1">大额特惠包 (200份)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  包含 200 份企业全景尽调报告，适合大批量企业排查与尽调。
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-500">¥</span>
                  <span className="text-3xl font-extrabold text-slate-900">4,500</span>
                  <span className="text-xs text-slate-400 line-through ml-1">¥7,600</span>
                </div>
                <span className="text-xs text-sky-800 font-bold mt-0.5 block">包含 200 份全景报告 (¥22.5/份)</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 pt-3 border-t border-slate-100">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 200 份企业全景尽调报告</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 企业工商基本面与股权全量覆盖</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 支持开具发票与对公转账结算</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" /> 永久归档终身免费复查已生成报告</li>
              </ul>
            </div>

            <button 
              onClick={() => navigate('/app/profile?tab=billing')}
              className="mt-6 w-full py-2.5 rounded-sm border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
            >
              购买 200 份大额包
            </button>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 6. 金融级合规与数据安全保障 (Security & Compliance) */}
      {/* ========================================================================= */}
      <section className="py-16 bg-white border-t border-slate-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-100 px-2.5 py-0.5 rounded-xs border border-slate-300">
              BANK-GRADE SECURITY & COMPLIANCE
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">
              金融级数据安全标准与全流程合规保障
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              严格恪守国家数据合规要求，确保数据传输、存证与授权合法合规
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-sm bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Lock className="w-4 h-4 text-sky-700" />
                <span>国密 SM4 传输与存储加密</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                全链路采用金融级 TLS 1.3 + 国密 SM4 双层对称加密体系，涉税发票与个人身份敏感字段全脱敏存储。
              </p>
            </div>

            <div className="p-6 rounded-sm bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <ShieldCheck className="w-4 h-4 text-teal-700" />
                <span>法定代表人强授权电子存证</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                涉税与经营数据调取必须经由法定代表人微信人脸三元核身确权，生成不可篡改的区块链电子授权凭证链。
              </p>
            </div>

            <div className="p-6 rounded-sm bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
                <Award className="w-4 h-4 text-sky-700" />
                <span>等保三级与合规法律审查</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                全面满足国家公安部网络安全等级保护三级（等保三级）规范，严格遵循《数据安全法》与《个人信息保护法》。
              </p>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
