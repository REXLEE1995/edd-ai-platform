import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, message } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  ChevronRight, 
  Lock, 
  Building2, 
  Scale, 
  Truck, 
  Users, 
  Award, 
  Check, 
  Gift, 
  Phone,
  FileCheck
} from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const { userLogin } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [phone, setPhone] = useState('13800138000');
  const [code, setCode] = useState('123456');
  const [authLoading, setAuthLoading] = useState(false);

  const handleTriggerExperience = (companyName) => {
    if (companyName) {
      setKeyword(companyName);
    }
    setIsAuthModalOpen(true);
  };

  const handleModalAuth = async (e) => {
    if (e) e.preventDefault();
    if (!phone || phone.length < 11) {
      message.warning('请输入有效的 11 位手机号码');
      return;
    }

    setAuthLoading(true);
    try {
      await userLogin(phone, code);
      setIsAuthModalOpen(false);
      message.success('登录成功！已为您发放 2 次免费 AI 全景尽调体验额度');
      navigate('/app', { state: { prefillCompany: { company_name: keyword.trim() || '东莞市顺捷实业有限公司' } } });
    } catch (err) {
      message.error(err.response?.data?.detail || '登录失败');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#fafafa] text-slate-900 antialiased selection:bg-slate-200 selection:text-slate-900">
      
      {/* ========================================================================= */}
      {/* 1. Hero 核心首屏：权威定位与企业检索输入 */}
      {/* ========================================================================= */}
      <section className="pt-20 pb-20 text-center px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-6">
        
        {/* 顶部微徽标 */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-800 text-xs font-medium shadow-2xs hover:bg-zinc-200/60 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>官方市监工商 · 司法涉诉 · 股权穿透 · 企业全景尽调平台</span>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
        </div>

        {/* 主标题 */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.15]">
          聚合官方中台与企业经营档案 <br />
          <span className="text-slate-700">
            生成银行信贷级企业全景深度尽调报告
          </span>
        </h1>

        {/* 核心价值阐述 */}
        <p className="text-sm sm:text-base text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          官方中台直连 + 股权出资穿透与失信合规排查 + 银行信贷级企业全景尽调报告。支持沉浸式在线目录查阅与一键导出 A4 PDF 原件。
        </p>

        {/* 一键免费体验 AI 尽调 CTA 核心入口 */}
        <div className="pt-4 max-w-lg mx-auto space-y-4">
          <button 
            type="button"
            onClick={() => handleTriggerExperience()}
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer gap-2"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>免费体验 AI 尽调</span>
            <ArrowRight className="w-4 h-4 ml-0.5" />
          </button>
          
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> 新用户注册即赠 2 次额度
            </span>
            <span className="text-zinc-300">•</span>
            <span className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> 官方中台全息数据直连
            </span>
            <span className="text-zinc-300">•</span>
            <span className="flex items-center gap-1.5 text-zinc-700 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-600" /> A4 PDF 原件一键导出
            </span>
          </div>
        </div>

        {/* 4 维硬实力信任指标条 */}
        <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
          <div className="shadcn-card-hover p-4 bg-white">
            <span className="text-2xl font-bold text-slate-900 font-mono block">全维度</span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">官方数据聚合</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">覆盖市监/裁判文书/执行网</span>
          </div>
          <div className="shadcn-card-hover p-4 bg-white">
            <span className="text-2xl font-bold text-slate-900 font-mono block">多层级</span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">股权穿透与实控人图谱</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">最终受益人穿透核验</span>
          </div>
          <div className="shadcn-card-hover p-4 bg-white">
            <span className="text-2xl font-bold text-slate-900 font-mono block">100%</span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">司法失信红线排查</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">限高令/异常名录/行政处罚</span>
          </div>
          <div className="shadcn-card-hover p-4 bg-white">
            <span className="text-2xl font-bold text-slate-900 font-mono block">全景报告</span>
            <span className="text-xs font-semibold text-slate-800 mt-1 block">银行级尽调报告</span>
            <span className="text-[11px] text-zinc-500 mt-0.5 block">全维度穿透与PDF原件导出</span>
          </div>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 2. 权威数据源矩阵与数据全面性 (Authoritative Multi-Source Data Grid) */}
      {/* ========================================================================= */}
      <section className="py-20 bg-white border-y border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
              AUTHORITATIVE MULTI-SOURCE DATA ARCHITECTURE
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              四大权威数据源深度聚合 · 破除尽调信息孤岛
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed">
              严格遵循「最高准据原则 (Golden Source Principle)」，官方中台数据深度整合与交叉验证，覆盖陈旧数据，构建不可篡改的企业全息事实集。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* 1. 工商市监 */}
            <div className="shadcn-card-hover p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">官方市监工商中台</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  聚合国家企业信用信息公示系统全量底账，毫秒级提取登记照面、注册与实缴到位率、董监高治理架构、对外投资与 15 项历史工商变更加权频率。
                </p>
              </div>
              <ul className="pt-3 border-t border-zinc-100 text-xs text-zinc-700 space-y-1.5 font-medium">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 多层级穿透识别实际控制人</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 认缴/实缴出资到位率穿透</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 董监高关联任职全景排查</li>
              </ul>
            </div>

            {/* 2. 司法合规 */}
            <div className="shadcn-card-hover p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">最高法与司法合规雷达</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  自研司法合规排查雷达，全景扫描裁判文书网、全国失信被执行人名录、限制高消费令、经营异常名录、环保行政处罚及金融机构动产抵质押敞口。
                </p>
              </div>
              <ul className="pt-3 border-t border-zinc-100 text-xs text-zinc-700 space-y-1.5 font-medium">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 裁判文书案由深度分类审查</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 五大红线指标秒级交叉排查</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 动产抵押与大股东质押率穿透</li>
              </ul>
            </div>

            {/* 3. 股权穿透与实控人 */}
            <div className="shadcn-card-hover p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">股权穿透与实控人图谱</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  多层级股权链条向上穿透至自然人或国资主体，精准识别最终实控人与受益所有人，排查隐性关联方与交叉持股风险。
                </p>
              </div>
              <ul className="pt-3 border-t border-zinc-100 text-xs text-zinc-700 space-y-1.5 font-medium">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 最终受益所有人穿透识别</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 股东出资历史与实缴核验</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 对外投资全景关联图谱</li>
              </ul>
            </div>

            {/* 4. 供应链客商与经营态势 */}
            <div className="shadcn-card-hover p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">供应链与经营态势排查</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  聚合行业上下游主要客商信息与经营动态，结合知识产权、资质许可与招投标档案，全景呈现企业持续经营能力。
                </p>
              </div>
              <ul className="pt-3 border-t border-zinc-100 text-xs text-zinc-700 space-y-1.5 font-medium">
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 核心资质许可与行政许可</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 知识产权与专利商标资产</li>
                <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-slate-900" /> 招投标与重大经营事件排查</li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. 行业应用场景 (Enterprise Scenarios) */}
      {/* ========================================================================= */}
      <section className="py-20 bg-[#fafafa] border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
              INDUSTRY SOLUTIONS & USE CASES
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              金融机构与供应链核心企业四大业务场景落地
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500">
              赋能普惠信贷、供应链准入、融资租赁与股权投资全流程降本增效
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="shadcn-card p-6 space-y-3 bg-white">
              <span className="text-xs font-mono font-semibold text-slate-800 px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 inline-block">场景 01</span>
              <h3 className="text-base font-bold text-slate-900">商业银行普惠信贷审批</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                贷前 0 接触快速初审，金税强授权精准测算商业参考额度（¥300~500万），尽调会材料秒级生成。
              </p>
            </div>

            <div className="shadcn-card p-6 space-y-3 bg-white">
              <span className="text-xs font-mono font-semibold text-slate-800 px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 inline-block">场景 02</span>
              <h3 className="text-base font-bold text-slate-900">核心企业供应链准入年审</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                批量导入 100+ 供应商统一代码，排查司法失信被执行、大股东质押套现及空壳虚开发票，杜绝关联舞弊。
              </p>
            </div>

            <div className="shadcn-card p-6 space-y-3 bg-white">
              <span className="text-xs font-mono font-semibold text-slate-800 px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 inline-block">场景 03</span>
              <h3 className="text-base font-bold text-slate-900">融资租赁与商业保理尽调</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                以月度用电与物流运费强拟合度核验承租企业实体经营活跃度，严防应收账款重复质押与空头承租。
              </p>
            </div>

            <div className="shadcn-card p-6 space-y-3 bg-white">
              <span className="text-xs font-mono font-semibold text-slate-800 px-2.5 py-0.5 rounded-full bg-zinc-100 border border-zinc-200 inline-block">场景 04</span>
              <h3 className="text-base font-bold text-slate-900">产业基金与股权投前风控</h3>
              <p className="text-xs text-zinc-600 leading-relaxed">
                多层级穿透实际控制人与最终受益人股份，溯源 15 项工商变更历史与环保处罚记录，出具投决会尽调底稿。
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 分级权益商业化加油包 (Tiered Pricing & Packages) */}
      {/* ========================================================================= */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
            TRANSPARENT TIERED PACKAGES
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
            透明灵活的尽调加油包 · 按需充值永久有效
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500">
            新注册即赠送 2 次免费额度，支持按次加油，权益分级清晰，无任何隐形门槛
          </p>
        </div>

        {/* 1 次尽调额度 = 1 份报告 与 数据中台价值拆解核心看板 */}
        <div className="shadcn-card p-6 bg-white space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  超高性价比承诺
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  消耗 1 次额度 = 生成 1 份终身有效全景报告 (平台自研全维数据深度拟合计算)
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                按报告份数结算，一次生成永久归档于历史资产库中，后续在系统内随时复查、调阅底稿<strong>终身免费，绝无重复扣费</strong>。
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-zinc-200 sm:pl-6 shrink-0 font-mono">
              <span className="text-xs text-zinc-400 block line-through">市面独立采购成本: ¥85~125/家</span>
              <span className="text-sm font-bold text-slate-900 block mt-0.5">享宇智评 仅耗 1 次额度 (低至 ¥22.5/份)</span>
            </div>
          </div>

          {/* 全维数据体系 4 宫格拆解 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-zinc-50/70 rounded-lg border border-zinc-200/80 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>市监工商数据中台</span>
                <span className="text-zinc-400 font-mono text-[11px]">自研中台</span>
              </div>
              <p className="text-zinc-600 leading-relaxed text-[11px]">
                市监照面登记、实缴出资到位率穿透、董监高治理体系、15项工商变更轨迹、对外投资图谱及实际控制人。
              </p>
            </div>

            <div className="p-4 bg-zinc-50/70 rounded-lg border border-zinc-200/80 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>司法与行政合规中台</span>
                <span className="text-zinc-400 font-mono text-[11px]">实时穿透</span>
              </div>
              <p className="text-zinc-600 leading-relaxed text-[11px]">
                最高法裁判文书涉诉案由审查、失信被执行人红线、限制高消费令、经营异常名录、环保处罚与动产抵质押。
              </p>
            </div>

            <div className="p-4 bg-zinc-50/70 rounded-lg border border-zinc-200/80 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>股权与经营态势中台</span>
                <span className="text-zinc-400 font-mono text-[11px]">穿透核验</span>
              </div>
              <p className="text-zinc-600 leading-relaxed text-[11px]">
                多层级股权架构向上穿透、最终受益所有人识别、对外关联投资图谱与主要客商经营态势。
              </p>
            </div>

            <div className="p-4 bg-zinc-100/80 rounded-lg border border-zinc-200 space-y-1.5">
              <div className="font-bold text-slate-900 flex items-center justify-between">
                <span>全景报告与PDF导出</span>
                <span className="text-slate-800 font-mono text-[11px]">享宇智评</span>
              </div>
              <p className="text-zinc-700 leading-relaxed text-[11px]">
                集成全景大纲目录索引、深度尽调报告全文，支持在线高清沉浸式查阅与 A4 PDF 原件导出。
              </p>
            </div>
          </div>
        </div>

        {/* 注册赠送额度提示条 */}
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="font-bold text-sm text-slate-950 flex items-center gap-2">
              <Gift className="w-4 h-4 text-slate-800" />
              新用户个人注册并完成实名认证，即刻获赠 1 次免费全景尽调额度
            </div>
            <p className="text-zinc-500 text-[11px]">
              * 注：消耗 1 次额度即可生成 1 份终身有效的企业全景尽调报告，支持导出银行级 A4 PDF 原件。
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleTriggerExperience()}
            className="shadcn-button-primary text-xs py-2 px-4 shrink-0"
          >
            立即领取 1 次赠送
          </button>
        </div>

        {/* 3 档分级套餐矩阵 (基于报告份数充值) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* 1. 标准充值包 (10份) */}
          <div className="shadcn-card p-6 bg-white flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">灵活充值 · 永久有效</span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">标准充值包 (10份)</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  包含 10 份企业全景尽调报告，适合信贷与业务精准尽调。
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-600">¥</span>
                  <span className="text-3xl font-extrabold text-slate-950">268</span>
                  <span className="text-xs text-zinc-400 line-through ml-1">¥380</span>
                </div>
                <span className="text-xs text-zinc-600 font-medium mt-0.5 block">包含 10 份全景报告 (¥26.8/份)</span>
              </div>

              <ul className="space-y-2 text-xs text-zinc-700 pt-4 border-t border-zinc-100 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 10 份企业全景尽调报告</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 企业工商基本面与股权全量覆盖</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 永久归档终身免费复查已生成报告</li>
              </ul>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/app/profile?tab=billing')}
              className="shadcn-button-outline w-full py-2.5"
            >
              立即充值 10 份
            </button>
          </div>

          {/* 2. 优惠充值包 (50份) - 推荐 */}
          <div className="rounded-xl border-2 border-slate-900 bg-white p-6 shadow-md flex flex-col justify-between space-y-6 relative">
            <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider shadow-xs">
              推荐 · 单次 ¥24.0
            </span>

            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-800 uppercase tracking-wider block">优惠充值 · 单价更低</span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">优惠充值包 (50份)</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  包含 50 份企业全景尽调报告，单次成本更低，支持开具发票。
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-600">¥</span>
                  <span className="text-3xl font-extrabold text-slate-950">1,200</span>
                  <span className="text-xs text-zinc-400 line-through ml-1">¥1,900</span>
                </div>
                <span className="text-xs text-slate-800 font-medium mt-0.5 block">包含 50 份全景报告 (¥24.0/份)</span>
              </div>

              <ul className="space-y-2 text-xs text-zinc-700 pt-4 border-t border-zinc-100 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 50 份企业全景尽调报告</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 企业工商基本面与股权全量覆盖</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 支持开具增值税发票</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 永久归档终身免费复查已生成报告</li>
              </ul>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/app/profile?tab=billing')}
              className="shadcn-button-primary w-full py-2.5 shadow-sm"
            >
              购买 50 份优惠包
            </button>
          </div>

          {/* 3. 大额特惠包 (200份) */}
          <div className="shadcn-card p-6 bg-white flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">大额特惠 · 单价最优</span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">大额特惠包 (200份)</h3>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  包含 200 份企业全景尽调报告，适合大批量企业排查与尽调。
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-100 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-bold text-slate-600">¥</span>
                  <span className="text-3xl font-extrabold text-slate-950">4,500</span>
                  <span className="text-xs text-zinc-400 line-through ml-1">¥7,600</span>
                </div>
                <span className="text-xs text-zinc-600 font-medium mt-0.5 block">包含 200 份全景报告 (¥22.5/份)</span>
              </div>

              <ul className="space-y-2 text-xs text-zinc-700 pt-4 border-t border-zinc-100 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 200 份企业全景尽调报告</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 企业工商基本面与股权全量覆盖</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 支持开具发票与对公转账结算</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-slate-900 shrink-0" /> 永久归档终身免费复查已生成报告</li>
              </ul>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/app/profile?tab=billing')}
              className="shadcn-button-outline w-full py-2.5"
            >
              购买 200 份大额包
            </button>
          </div>

        </div>

      </section>

      {/* ========================================================================= */}
      {/* 5. 金融级合规与数据安全保障 (Security & Compliance) */}
      {/* ========================================================================= */}
      <section className="py-20 bg-white border-t border-zinc-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 uppercase tracking-wider bg-zinc-100 px-2.5 py-1 rounded-md border border-zinc-200">
              BANK-GRADE SECURITY & COMPLIANCE
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950">
              金融级数据安全标准与全流程合规保障
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500">
              严格恪守国家数据合规要求，确保数据传输、存证与授权合法合规
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="shadcn-card p-6 space-y-3 bg-[#fafafa]">
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Lock className="w-4 h-4 text-slate-800" />
                <span>国密 SM4 传输与存储加密</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                全链路采用金融级 TLS 1.3 + 国密 SM4 双层对称加密体系，涉税发票与个人身份敏感字段全脱敏存储。
              </p>
            </div>

            <div className="shadcn-card p-6 space-y-3 bg-[#fafafa]">
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <ShieldCheck className="w-4 h-4 text-slate-800" />
                <span>法定代表人强授权电子存证</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                涉税与经营数据调取必须经由法定代表人微信人脸三元核身确权，生成不可篡改的区块链电子授权凭证链。
              </p>
            </div>

            <div className="shadcn-card p-6 space-y-3 bg-[#fafafa]">
              <div className="flex items-center gap-2.5 font-bold text-sm text-slate-900">
                <Award className="w-4 h-4 text-slate-800" />
                <span>等保三级与合规法律审查</span>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                全面满足国家公安部网络安全等级保护三级（等保三级）规范，严格遵循《数据安全法》与《个人信息保护法》。
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 免费体验 AI 尽调 - 快速登录/注册 Dialog (shadcn Dialog style) */}
      <Modal
        open={isAuthModalOpen}
        onCancel={() => setIsAuthModalOpen(false)}
        footer={null}
        width={420}
        centered
        destroyOnClose
      >
        <div className="space-y-6 pt-1">
          <div className="text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 mx-auto flex items-center justify-center text-slate-900 shadow-2xs">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">
              快速登录 / 注册享宇智评
            </h3>
            <p className="text-xs text-zinc-500">
              手机验证码一键登录，即刻获赠 <strong className="text-slate-900 font-semibold">2 次免费 AI 全景尽调</strong> 体验额度
            </p>
          </div>

          <form onSubmit={handleModalAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">手机号码</label>
              <div className="flex items-center bg-white rounded-md px-3 py-2 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
                <Phone className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号码"
                  className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-zinc-400"
                  maxLength={11}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">短信验证码</label>
              <div className="flex items-center bg-white rounded-md px-3 py-2 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
                <Lock className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="验证码 (本地测试填 123456)"
                  className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-zinc-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => message.info('测试验证码已自动填充：123456')}
                  className="text-xs text-slate-700 hover:text-slate-900 font-medium shrink-0 ml-2 hover:underline cursor-pointer"
                >
                  获取验证码
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="shadcn-button-primary w-full py-2.5 text-xs font-semibold shadow-xs"
            >
              {authLoading ? '正在核验身份并初始化额度...' : '免费注册/登录并立即体验 AI 尽调'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-3 border-t border-zinc-100 text-center text-[11px] text-zinc-400">
            <span>登录即代表同意并遵守</span>
            <span className="text-zinc-600 hover:underline mx-1 cursor-pointer">《用户服务协议》</span>
            <span>与</span>
            <span className="text-zinc-600 hover:underline mx-1 cursor-pointer">《金融级数据隐私政策》</span>
          </div>
        </div>
      </Modal>

    </div>
  );
}
