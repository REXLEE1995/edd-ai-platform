import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, message } from 'antd';
import { motion } from 'framer-motion';
import apiClient from '../../api/client';
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
  FileCheck,
  Activity,
  Layers,
  FileText,
  Clock,
  Compass,
  Cpu,
  BarChart3,
  ExternalLink,
  ChevronDown,
  ArrowUp,
  X,
  Navigation
} from 'lucide-react';

// 页面快速锚点配置
const NAV_SECTIONS = [
  { id: 'section-hero', title: '平台概览', icon: Sparkles },
  { id: 'section-demo', title: '全景演示', icon: FileText },
  { id: 'section-sources', title: '四大数据源', icon: Layers },
  { id: 'section-scenarios', title: '业务场景', icon: Compass },
  { id: 'section-pricing', title: '尽调加油包', icon: Gift },
  { id: 'section-security', title: '安全合规', icon: ShieldCheck },
];

// Apple 风格动画变体
const fadeInUp = {
  initial: { opacity: 0, y: 35 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
};

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1
    }
  },
  viewport: { once: true, margin: "-60px" }
};

export default function HomePage() {
  const navigate = useNavigate();
  const { user, userLogin } = useAuth();
  const [keyword, setKeyword] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sendLoading, setSendLoading] = useState(false);

  // 悬浮导航与置顶状态
  const [activeSection, setActiveSection] = useState('section-hero');
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // 监听页面滚动，计算高亮章节与置顶按钮显隐
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowBackToTop(scrollY > 280);

      const sectionElements = NAV_SECTIONS.map(sec => ({
        id: sec.id,
        el: document.getElementById(sec.id)
      })).filter(item => item.el);

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const item = sectionElements[i];
        const rect = item.el.getBoundingClientRect();
        if (rect.top <= 200) {
          setActiveSection(item.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      const navOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setIsMobileNavOpen(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      message.warning('请先输入有效的 11 位手机号码');
      return;
    }
    setSendLoading(true);
    try {
      const res = await apiClient.post('/v1/auth/send-code', { phone, scene: 'login' });
      setCountdown(60);
      message.success(res?.message || '短信验证码已成功发送至您的手机，5分钟内有效，请查收！');
    } catch (err) {
      message.error(err.response?.data?.detail || '短信发送失败，请稍后重试');
    } finally {
      setSendLoading(false);
    }
  };

  const handleTriggerExperience = (companyName) => {
    const targetComp = (companyName || keyword || '').trim();
    if (companyName) {
      setKeyword(companyName);
    }
    if (user) {
      navigate(targetComp ? `/app?company=${encodeURIComponent(targetComp)}` : '/app', {
        state: targetComp ? { prefillCompany: { company_name: targetComp } } : undefined
      });
      return;
    }
    setIsAuthModalOpen(true);
  };

  const handleModalAuth = async (e) => {
    if (e) e.preventDefault();
    if (!phone || phone.length < 11) {
      message.warning('请输入有效的 11 位手机号码');
      return;
    }
    if (!code) {
      message.warning('请输入短信验证码');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await userLogin(phone, code);
      setIsAuthModalOpen(false);
      if (res?.is_new_user) {
        message.success('注册并登录成功！已为您赠送 1 次免费 AI 全景尽调体验额度');
      } else {
        message.success(res?.message || '登录成功，欢迎回到工作台！');
      }
      const targetComp = keyword.trim();
      navigate(targetComp ? `/app?company=${encodeURIComponent(targetComp)}` : '/app', { 
        state: targetComp ? { prefillCompany: { company_name: targetComp } } : undefined
      });
    } catch (err) {
      message.error(err.response?.data?.detail || '认证失败，请重试');
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#f8fafc] text-slate-900 antialiased selection:bg-cyan-100 selection:text-cyan-900 overflow-x-hidden">
      
      {/* 桌面端左侧悬浮导航 (Apple / Linear SaaS 拟态质感，适度放大更易点击阅读) */}
      <aside aria-label="页面快速导航" className="hidden lg:flex fixed left-4 xl:left-8 top-1/2 -translate-y-1/2 z-40 flex-col items-start gap-1.5 p-2.5 sm:p-3 rounded-2xl bg-white/90 backdrop-blur-2xl border border-white/95 shadow-[0_16px_45px_-8px_rgba(0,0,0,0.1)] transition-all min-w-[152px]">
        <div className="px-3 py-1.5 mb-1 text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 border-b border-slate-100 w-full">
          <Compass className="w-3.5 h-3.5 text-[#0096DB]" />
          <span>快速直达</span>
        </div>
        {NAV_SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] sm:text-sm transition-all group text-left cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-cyan-50 via-sky-50/70 to-blue-50/40 text-[#0070a4] font-bold border-l-2 border-[#0096DB] shadow-2xs'
                  : 'text-slate-600 font-medium hover:text-slate-950 hover:bg-slate-50'
              }`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isActive ? 'bg-[#0096DB] text-white shadow-xs' : 'text-slate-400 group-hover:text-slate-700 bg-slate-100/80'
              }`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="tracking-normal whitespace-nowrap">{sec.title}</span>
              {isActive && (
                <span className="ml-auto w-2 h-2 rounded-full bg-[#0096DB] animate-pulse" />
              )}
            </button>
          );
        })}
      </aside>

      {/* 移动端左下角悬浮定位胶囊 (不遮挡主体内容，轻触弹出快速跳转清单) */}
      <div className="lg:hidden fixed left-4 bottom-20 z-40">
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-xl border border-white/90 shadow-glass text-slate-800 font-semibold text-xs active:scale-95 transition-all shadow-md hover:border-[#0096DB]/40 cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5 text-[#0096DB] animate-spin" style={{ animationDuration: '10s' }} />
          <span>{NAV_SECTIONS.find(s => s.id === activeSection)?.title || '定位导航'}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isMobileNavOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* 移动端快速跳转弹出卡片 (向上展开，清晰可见) */}
        {isMobileNavOpen && (
          <div className="absolute left-0 bottom-full mb-2 w-44 rounded-2xl bg-white/95 backdrop-blur-2xl border border-white/90 shadow-2xl p-2 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200 z-50">
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
              <span>快速直达章节</span>
              <button type="button" onClick={() => setIsMobileNavOpen(false)} className="text-slate-400 hover:text-slate-600 p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
            {NAV_SECTIONS.map((sec) => {
              const Icon = sec.icon;
              const isActive = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-cyan-50 text-[#0070a4] font-bold border-l-2 border-[#0096DB]'
                      : 'text-slate-600 active:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#0096DB]' : 'text-slate-400'}`} />
                  <span className="truncate">{sec.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 右侧置顶悬浮按钮 (桌面与手机端自适应避让底栏) */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="回到顶部"
        className={`fixed right-4 sm:right-6 lg:right-8 bottom-20 lg:bottom-8 z-40 w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/90 backdrop-blur-xl border border-white/90 shadow-glass text-slate-700 hover:text-white hover:bg-gradient-to-tr hover:from-[#0096DB] hover:to-[#0ea5e9] flex items-center justify-center transition-all duration-300 group cursor-pointer active:scale-90 ${
          showBackToTop ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-90 pointer-events-none'
        }`}
        title="回到顶部"
      >
        <ArrowUp className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:-translate-y-0.5" />
      </button>

      {/* ========================================================================= */}
      {/* 1. Hero 核心首屏：大字号视觉震撼与苹果风排版 */}
      {/* ========================================================================= */}
      <section id="section-hero" className="relative pt-20 pb-16 sm:pt-28 sm:pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          
          {/* 顶部微徽标 (Pill Badge) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex items-center space-x-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-xl border border-white/90 shadow-xs hover:border-[#0ea5e9]/40 transition-all cursor-pointer group max-w-[92vw] sm:max-w-none"
            onClick={() => handleTriggerExperience()}
          >
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] sm:text-xs font-semibold text-slate-700 tracking-wide truncate">
              官方中台直连 · 司法涉诉排查 · 股权穿透 · 智评大模型
            </span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </motion.div>

          {/* 主标题 (大字号、饱满行高、梯度渲染) */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3 sm:space-y-4 max-w-6xl mx-auto"
          >
            <h1 className="text-[25px] xs:text-[28px] sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.28] sm:leading-[1.18]">
              <span className="block">聚合官方中台与企业经营档案</span>
              <span className="block mt-1.5 sm:mt-3 bg-clip-text text-transparent bg-gradient-to-r from-[#0070a4] via-[#0ea5e9] to-[#29B47D]">
                生成银行信贷级企业全景深度尽调报告
              </span>
            </h1>
          </motion.div>

          {/* 核心价值阐述副标题 */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-sm sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed px-2 sm:px-0"
          >
            官方中台直连 + 股权出资穿透与失信合规排查 + 银行信贷级企业全景尽调报告。支持沉浸式在线目录查阅与一键导出 A4 PDF 原件。
          </motion.p>

          {/* 核心行动 CTA */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="pt-2 max-w-md mx-auto space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button 
                type="button"
                onClick={() => handleTriggerExperience()}
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0096DB] to-[#0ea5e9] hover:from-[#0084c2] hover:to-[#0284c7] text-white font-semibold text-base shadow-glow-primary hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer gap-2 border border-white/30"
              >
                <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                <span>{user ? '进入工作台发起尽调' : '注册 / 登录并生成报告'}</span>
                <ArrowRight className="w-4 h-4 ml-0.5" />
              </button>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-slate-500 font-medium pt-1">
              <span className="flex items-center gap-1.5 text-slate-700 text-[11px] sm:text-xs">
                <Check className="w-4 h-4 text-[#0ea5e9] stroke-[2.5]" /> 新用户登录赠送 1 次免费额度
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 text-slate-700 text-[11px] sm:text-xs">
                <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> 官方中台全息数据直连
              </span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="flex items-center gap-1.5 text-slate-700 text-[11px] sm:text-xs">
                <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> A4 PDF 原件一键导出
              </span>
            </div>
          </motion.div>

          {/* 4 维硬实力信任指标条 (Apple 风格拟态磨砂卡片) */}
          <motion.div 
            {...fadeInUp}
            className="pt-4 sm:pt-6 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 max-w-5xl mx-auto text-left"
          >
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-glass hover:shadow-md hover:-translate-y-1 transition-all">
              <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono block">全维度</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block">官方数据聚合</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 block truncate">覆盖市监/裁判文书</span>
            </div>
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-glass hover:shadow-md hover:-translate-y-1 transition-all">
              <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono block">多层级</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block">股权与实控人</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 block truncate">最终受益人穿透核验</span>
            </div>
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-glass hover:shadow-md hover:-translate-y-1 transition-all">
              <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono block">100%</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block">司法合规排查</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 block truncate">限高/异常名录/处罚</span>
            </div>
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white/70 backdrop-blur-xl border border-white/80 shadow-glass hover:shadow-md hover:-translate-y-1 transition-all">
              <span className="text-xl sm:text-3xl font-extrabold text-slate-900 font-mono block">全景报告</span>
              <span className="text-xs font-bold text-slate-800 mt-1 block">银行级尽调报告</span>
              <span className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 block truncate">全维度PDF原件导出</span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. 苹果风格交互式产品体验看板 (Interactive Product Showcase) */}
      {/* ========================================================================= */}
      <section id="section-demo" className="py-12 sm:py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <motion.div {...fadeInUp} className="text-center max-w-3xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0084c2] uppercase tracking-wider bg-cyan-50/80 px-3 py-1 rounded-full border border-cyan-200/60 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-[#0096DB]" />
              <span>LIVE INTERACTIVE REPORT DEMO</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-950">
              身临其境的企业全景尽调阅读体验
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              左侧 8 大章节多级大纲秒级跳页，右侧无缝 PDF 原件流式渲染，顶部 AI 智能总结一目了然
            </p>
          </motion.div>

          {/* 模拟苹果风格 macOS App 拟态窗口 */}
          <motion.div 
            {...fadeInUp}
            className="relative rounded-2xl sm:rounded-3xl border border-white/90 bg-white/80 backdrop-blur-2xl shadow-[0_20px_60px_-15px_rgba(0,150,219,0.12)] p-2 sm:p-4 overflow-hidden"
          >
            {/* 窗口顶栏模拟 */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/70 bg-slate-50/80 rounded-t-xl mb-3 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-400/80 border border-rose-500/30"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400/80 border border-amber-500/30"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400/80 border border-emerald-500/30"></div>
                <span className="text-slate-400 font-mono ml-2 hidden sm:inline">享宇AI智评 · 全景报告阅读器 Pro</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-cyan-50 text-[#0070a4] border border-cyan-200">
                  <ShieldCheck className="w-3 h-3 mr-1 text-[#0096DB]" /> 存证底册核验完成
                </span>
                <span className="font-mono text-slate-400 hidden md:inline">共 61 页 · PDF 原件在线存证</span>
              </div>
            </div>

            {/* 窗口内核心 UI 模拟预览 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              
              {/* 左侧：章节大纲导航模拟 */}
              <div className="hidden lg:block lg:col-span-4 bg-slate-50/70 rounded-xl p-3.5 border border-slate-200/60 space-y-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase">
                  <span>报告全景大纲 (8大模块)</span>
                  <span className="font-mono text-[#0096DB]">目录索引</span>
                </div>
                <div className="space-y-1">
                  {[
                    { id: 1, title: '01 企业基本信息 (市监照面与治理)', active: true, page: 'P.1' },
                    { id: 2, title: '02 股东出资与股权穿透 (实控人图谱)', active: false, page: 'P.6' },
                    { id: 3, title: '03 董监高关联关系与任职排查', active: false, page: 'P.12' },
                    { id: 4, title: '04 对外投资及分支机构网络', active: false, page: 'P.18' },
                    { id: 5, title: '05 纳税开票与实体经营活跃度', active: false, page: 'P.25' },
                    { id: 6, title: '06 供应链客商与上下游拟合分析', active: false, page: 'P.31' },
                    { id: 7, title: '07 企业信用情况 (司法涉诉与合规)', active: false, page: 'P.37' },
                    { id: 8, title: '08 附件 (原始明细底册总览)', active: false, page: 'P.51' }
                  ].map(chap => (
                    <div 
                      key={chap.id}
                      className={`px-3 py-2 rounded-lg flex items-center justify-between font-medium cursor-pointer transition-all ${
                        chap.active 
                          ? 'bg-white text-[#0070a4] font-bold shadow-xs border border-cyan-200/70 border-l-4 border-l-[#0096DB]' 
                          : 'text-slate-600 hover:bg-white/60'
                      }`}
                    >
                      <span className="truncate pr-2">{chap.title}</span>
                      <span className="font-mono text-[10px] text-slate-400 shrink-0">{chap.page}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 右侧：报告正文与 AI 全息画像模拟 */}
              <div className="lg:col-span-8 space-y-4">
                
                {/* 顶部 AI 智能总结画像卡片 */}
                <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-br from-white via-cyan-50/20 to-emerald-50/20 border border-cyan-200/70 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#0ea5e9] text-white flex items-center justify-center shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm text-slate-900">企业信用全景综合画像 (AI 深度研判)</span>
                    </div>
                    <span className="text-xs font-mono text-slate-500 bg-slate-100/90 px-2 py-0.5 rounded-md border border-slate-200/80 font-medium">
                      官方全息数据存证
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    目标企业【深圳市***信息技术有限公司】工商实缴到位，纳税信用记录良好，近 24 个月进销项开票流水稳步上扬无断票，水电运费与开票强相关拟合，企业实体经营稳定，各项底层存证完整真实。
                  </p>
                </div>

                {/* 模拟页面报告预览图与动态指标 */}
                <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">深圳市***信息技术有限公司</span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                        91440300MA****888X
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        type="button" 
                        onClick={() => handleTriggerExperience('深圳市***信息技术有限公司')}
                        className="shadcn-button-primary text-xs py-1 px-3"
                      >
                        体验全景阅读 <ArrowRight className="w-3 h-3 ml-1" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-center">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                      <span className="text-[11px] text-slate-500 block">注册/实缴资本</span>
                      <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">5,000.00 万 (100%)</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                      <span className="text-[11px] text-slate-500 block">近 12 个月开票</span>
                      <span className="text-sm font-bold text-[#0096DB] font-mono mt-0.5 block">¥4,063.73 万</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                      <span className="text-[11px] text-slate-500 block">司法失信被执行</span>
                      <span className="text-sm font-bold text-emerald-600 font-mono mt-0.5 block">0 条记录</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
                      <span className="text-[11px] text-slate-500 block">数据核验维度</span>
                      <span className="text-sm font-bold text-slate-900 font-mono mt-0.5 block">8 大核心模块</span>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. 权威数据源矩阵与数据全面性 (Authoritative Multi-Source Data Grid) */}
      {/* ========================================================================= */}
      <section id="section-sources" className="py-16 sm:py-24 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <motion.div {...fadeInUp} className="text-center max-w-4xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <Layers className="w-3.5 h-3.5 text-slate-600" />
              <span>AUTHORITATIVE MULTI-SOURCE DATA ARCHITECTURE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950">
              四大权威数据源深度聚合 · 破除尽调信息孤岛
            </h2>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl mx-auto">
              严格遵循「最高准据原则 (Golden Source Principle)」，官方中台数据深度整合与交叉验证，覆盖陈旧数据，构建不可篡改的企业全息事实集。
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6"
          >
            
            {/* 1. 工商市监 */}
            <motion.div variants={fadeInUp} className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-[#0ea5e9]/60 hover:-translate-y-1 transition-all flex flex-col justify-between space-y-3 sm:space-y-5">
              <div className="space-y-2 sm:space-y-3.5">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-cyan-50 border border-cyan-200/60 flex items-center justify-center text-[#0096DB] shadow-xs">
                  <Building2 className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-lg font-bold text-slate-900 leading-snug">官方市监工商中台</h3>
                <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  聚合国家企业信用信息公示系统全量底账，毫秒级提取登记照面、注册与实缴到位率、董监高治理架构、对外投资与 15 项历史工商变更加权频率。
                </p>
              </div>
              <ul className="pt-2.5 sm:pt-4 border-t border-slate-100 text-[10px] sm:text-xs text-slate-700 space-y-1.5 sm:space-y-2 font-medium">
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0ea5e9] shrink-0" /> <span className="truncate">多层级穿透识别实际控制人</span></li>
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0ea5e9] shrink-0" /> <span className="truncate">认缴/实缴出资到位率穿透</span></li>
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0ea5e9] shrink-0" /> <span className="truncate">董监高关联任职全景排查</span></li>
              </ul>
            </motion.div>

            {/* 2. 司法合规 */}
            <motion.div variants={fadeInUp} className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-[#0ea5e9]/60 hover:-translate-y-1 transition-all flex flex-col justify-between space-y-3 sm:space-y-5">
              <div className="space-y-2 sm:space-y-3.5">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600 shadow-xs">
                  <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-lg font-bold text-slate-900 leading-snug">最高法与司法合规雷达</h3>
                <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  自研司法合规排查雷达，全景扫描裁判文书网、全国失信被执行人名录、限制高消费令、经营异常名录、环保行政处罚及金融机构动产抵质押敞口。
                </p>
              </div>
              <ul className="pt-2.5 sm:pt-4 border-t border-slate-100 text-[10px] sm:text-xs text-slate-700 space-y-1.5 sm:space-y-2 font-medium">
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" /> <span className="truncate">裁判文书案由深度分类审查</span></li>
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" /> <span className="truncate">五大红线指标秒级交叉排查</span></li>
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" /> <span className="truncate">动产抵押与大股东质押率穿透</span></li>
              </ul>
            </motion.div>

            {/* 3. 股权穿透与实控人 */}
            <motion.div variants={fadeInUp} className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-[#0ea5e9]/60 hover:-translate-y-1 transition-all flex flex-col justify-between space-y-3 sm:space-y-5">
              <div className="space-y-2 sm:space-y-3.5">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-sky-50 border border-sky-200/60 flex items-center justify-center text-sky-600 shadow-xs">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-lg font-bold text-slate-900 leading-snug">股权穿透与实控人图谱</h3>
                <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  多层级股权链条向上穿透至自然人或国资主体，精准识别最终实控人与受益所有人，排查隐性关联方与交叉持股风险。
                </p>
              </div>
              <ul className="pt-2.5 sm:pt-4 border-t border-slate-100 text-[10px] sm:text-xs text-slate-700 space-y-1.5 sm:space-y-2 font-medium">
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 shrink-0" /> <span className="truncate">最终受益所有人穿透识别</span></li>
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 shrink-0" /> <span className="truncate">股东出资历史与实缴核验</span></li>
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-600 shrink-0" /> <span className="truncate">对外投资全景关联图谱</span></li>
              </ul>
            </motion.div>

            {/* 4. 供应链客商与经营态势 */}
            <motion.div variants={fadeInUp} className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-[#0ea5e9]/60 hover:-translate-y-1 transition-all flex flex-col justify-between space-y-3 sm:space-y-5">
              <div className="space-y-2 sm:space-y-3.5">
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 shadow-xs">
                  <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-lg font-bold text-slate-900 leading-snug">供应链与经营态势排查</h3>
                <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                  聚合行业上下游主要客商信息与经营动态，结合知识产权、资质许可与招投标档案，全景呈现企业持续经营能力。
                </p>
              </div>
              <ul className="pt-2.5 sm:pt-4 border-t border-slate-100 text-[10px] sm:text-xs text-slate-700 space-y-1.5 sm:space-y-2 font-medium">
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" /> <span className="truncate">核心资质许可与行政许可</span></li>
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" /> <span className="truncate">知识产权与专利商标资产</span></li>
                <li className="flex items-center gap-1.5 sm:gap-2"><Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" /> <span className="truncate">招投标与重大经营事件排查</span></li>
              </ul>
            </motion.div>

          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. 行业应用场景 (Enterprise Scenarios) */}
      {/* ========================================================================= */}
      <section id="section-scenarios" className="py-12 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-12">
          
          <motion.div {...fadeInUp} className="text-center max-w-4xl mx-auto space-y-2.5 sm:space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0084c2] uppercase tracking-wider bg-cyan-50/80 px-3 py-1 rounded-full border border-cyan-200/60">
              <Compass className="w-3.5 h-3.5 text-[#0096DB]" />
              <span>INDUSTRY SOLUTIONS & USE CASES</span>
            </div>
            <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950">
              金融机构与供应链核心企业四大业务场景落地
            </h2>
            <p className="text-xs sm:text-base text-slate-600">
              赋能普惠信贷、供应链准入、融资租赁与股权投资全流程降本增效
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6"
          >
            <motion.div variants={fadeInUp} className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-glass hover:shadow-md hover:-translate-y-1 transition-all space-y-2 sm:space-y-3.5">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-[#0070a4] px-2 sm:px-3 py-0.5 sm:py-1 rounded-md bg-cyan-50 border border-cyan-200/60 inline-block">场景 01</span>
              <h3 className="text-xs sm:text-base font-bold text-slate-900 leading-snug">商业银行普惠信贷审批</h3>
              <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                贷前 0 接触快速初审，官方系统强授权精准测算商业参考额度（¥300~500万），尽调会材料秒级生成。
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-glass hover:shadow-md hover:-translate-y-1 transition-all space-y-2 sm:space-y-3.5">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-[#0070a4] px-2 sm:px-3 py-0.5 sm:py-1 rounded-md bg-cyan-50 border border-cyan-200/60 inline-block">场景 02</span>
              <h3 className="text-xs sm:text-base font-bold text-slate-900 leading-snug">核心企业供应链准入年审</h3>
              <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                批量导入 100+ 供应商统一代码，排查司法失信被执行、大股东质押套现及空壳虚开发票，杜绝关联舞弊。
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-glass hover:shadow-md hover:-translate-y-1 transition-all space-y-2 sm:space-y-3.5">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-[#0070a4] px-2 sm:px-3 py-0.5 sm:py-1 rounded-md bg-cyan-50 border border-cyan-200/60 inline-block">场景 03</span>
              <h3 className="text-xs sm:text-base font-bold text-slate-900 leading-snug">融资租赁与商业保理尽调</h3>
              <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                以月度用电与物流运费强拟合度核验承租企业实体经营活跃度，严防应收账款重复质押与空头承租。
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-3.5 sm:p-6 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-glass hover:shadow-md hover:-translate-y-1 transition-all space-y-2 sm:space-y-3.5">
              <span className="text-[10px] sm:text-xs font-mono font-bold text-[#0070a4] px-2 sm:px-3 py-0.5 sm:py-1 rounded-md bg-cyan-50 border border-cyan-200/60 inline-block">场景 04</span>
              <h3 className="text-xs sm:text-base font-bold text-slate-900 leading-snug">产业基金与股权投前风控</h3>
              <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed line-clamp-3 sm:line-clamp-none">
                多层级穿透实际控制人与最终受益人股份，溯源 15 项工商变更历史与环保处罚记录，出具投决会尽调底稿。
              </p>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. 分级权益商业化加油包 (Tiered Pricing & Packages) */}
      {/* ========================================================================= */}
      <section id="section-pricing" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <motion.div {...fadeInUp} className="text-center max-w-4xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0084c2] uppercase tracking-wider bg-cyan-50/80 px-3 py-1 rounded-full border border-cyan-200/60">
            <Gift className="w-3.5 h-3.5 text-[#0096DB]" />
            <span>TRANSPARENT TIERED PACKAGES</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950">
            透明灵活的尽调加油包 · 按需充值永久有效
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            新用户首次注册登录即赠送 1 次免费额度，支持按次加油，权益分级清晰，无任何隐形门槛
          </p>
        </motion.div>

        {/* 1 次尽调额度 = 1 份报告 与 数据中台价值拆解核心看板 */}
        <motion.div {...fadeInUp} className="p-6 sm:p-8 rounded-3xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-glass space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  超高性价比承诺
                </span>
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  消耗 1 次额度 = 生成 1 份企业全景尽调报告
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                按报告份数结算，一次生成长期归档于历史资产库中，后续在系统内随时复查、调阅底稿<strong>永久免费查阅，绝无重复扣费</strong>。
              </p>
            </div>

            <div className="text-right sm:border-l sm:border-slate-200 sm:pl-6 shrink-0 font-mono">
              <span className="text-xs text-slate-400 block line-through">市面独立采购成本: ¥498/家</span>
              <span className="text-sm font-bold text-[#0096DB] block mt-0.5">享宇AI智评 仅耗 1 次额度 (单份低至 ¥318)</span>
            </div>
          </div>

          {/* 全维数据体系 4 宫格拆解 (移动端 2 列网格自适应) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 text-xs">
            <div className="p-3 sm:p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1 sm:space-y-1.5 shadow-2xs">
              <div className="font-bold text-slate-900 flex items-center justify-between text-xs sm:text-sm">
                <span>市监工商中台</span>
                <span className="text-[#0096DB] font-mono text-[10px] sm:text-[11px] font-semibold">自研中台</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[10px] sm:text-[11px] line-clamp-3 sm:line-clamp-none">
                市监照面登记、实缴出资到位率穿透、董监高治理体系、15项工商变更轨迹、对外投资图谱及实际控制人。
              </p>
            </div>

            <div className="p-3 sm:p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1 sm:space-y-1.5 shadow-2xs">
              <div className="font-bold text-slate-900 flex items-center justify-between text-xs sm:text-sm">
                <span>司法合规中台</span>
                <span className="text-[#0096DB] font-mono text-[10px] sm:text-[11px] font-semibold">实时穿透</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[10px] sm:text-[11px] line-clamp-3 sm:line-clamp-none">
                最高法裁判文书涉诉案由审查、失信被执行人红线、限制高消费令、经营异常名录、环保处罚与动产抵质押。
              </p>
            </div>

            <div className="p-3 sm:p-4 bg-slate-50/70 rounded-xl border border-slate-200/60 space-y-1 sm:space-y-1.5 shadow-2xs">
              <div className="font-bold text-slate-900 flex items-center justify-between text-xs sm:text-sm">
                <span>股权态势中台</span>
                <span className="text-[#0096DB] font-mono text-[10px] sm:text-[11px] font-semibold">穿透核验</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[10px] sm:text-[11px] line-clamp-3 sm:line-clamp-none">
                多层级股权架构向上穿透、最终受益所有人识别、对外关联投资图谱与主要客商经营态势。
              </p>
            </div>

            <div className="p-3 sm:p-4 bg-cyan-50/60 rounded-xl border border-cyan-200/60 space-y-1 sm:space-y-1.5 shadow-2xs">
              <div className="font-bold text-[#0070a4] flex items-center justify-between text-xs sm:text-sm">
                <span>全景报告导出</span>
                <span className="text-[#0096DB] font-mono text-[10px] sm:text-[11px] font-semibold">享宇AI智评</span>
              </div>
              <p className="text-slate-700 leading-relaxed text-[10px] sm:text-[11px] line-clamp-3 sm:line-clamp-none">
                集成全景大纲目录索引、深度尽调报告全文，支持在线高清沉浸式查阅与 A4 PDF 原件导出。
              </p>
            </div>
          </div>
        </motion.div>

        {/* 注册赠送额度提示条 */}
        <motion.div 
          {...fadeInUp}
          className="p-5 rounded-2xl bg-gradient-to-r from-cyan-50/90 via-sky-50/80 to-emerald-50/90 border border-cyan-200/70 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-glass"
        >
          <div className="space-y-0.5">
            <div className="font-bold text-base text-slate-950 flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#0096DB]" />
              新用户个人注册并完成实名认证，即刻获赠 1 次免费全景尽调额度
            </div>
            <p className="text-slate-600 text-xs">
              * 注：消耗 1 次额度即可生成 1 份企业全景尽调报告，支持导出银行级 A4 PDF 原件。
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleTriggerExperience()}
            className="shadcn-button-primary text-xs py-2.5 px-5 shrink-0 shadow-sm hover:shadow-md"
          >
            立即领取 1 次赠送
          </button>
        </motion.div>

        {/* 3 档分级套餐矩阵 (与个人中心充值套餐 100% 保持一致) */}
        <motion.div 
          variants={staggerContainer}
          initial="initial"
          whileInView="whileInView"
          viewport={{ once: true, margin: "-60px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          
          {/* 1. 单份尝鲜体验包 (1份) */}
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-white/80 backdrop-blur-xl flex flex-col justify-between space-y-6 border border-white/90 shadow-glass hover:shadow-md transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">尝鲜体验 · 随时复查</span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">单份尝鲜体验包 (1份)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  包含 1 份企业全景尽调报告，支持在线目录大纲查阅与 A4 PDF 原件下载。
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-600">¥</span>
                  <span className="text-4xl font-extrabold text-slate-950">368</span>
                  <span className="text-xs text-slate-400 line-through ml-1">¥498</span>
                </div>
                <span className="text-xs text-slate-600 font-medium mt-0.5 block">包含 1 份全景报告 (¥368.0/份)</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 pt-4 border-t border-slate-200 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 1 份企业全景尽调报告</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 企业工商基本面与股权全量覆盖</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 历史报告长期归档，支持随时在线复查</li>
              </ul>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/app/profile?tab=billing')}
              className="shadcn-button-outline w-full py-2.5"
            >
              立即充值 1 份
            </button>
          </motion.div>

          {/* 2. 标准进阶充值包 (10份) - 推荐 */}
          <motion.div variants={fadeInUp} className="rounded-2xl border-2 border-[#0096DB] bg-white/95 backdrop-blur-xl p-6 shadow-xl flex flex-col justify-between space-y-6 relative hover:-translate-y-1 transition-all">
            <span className="absolute -top-3 right-6 px-3.5 py-0.5 rounded-full text-[11px] font-bold bg-[#0096DB] text-white uppercase tracking-wider shadow-sm">
              推荐 · 单次 ¥338.0
            </span>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-[#0084c2] uppercase tracking-wider block">标准进阶 · 单价更低</span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">标准进阶充值包 (10份)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  包含 10 份企业全景尽调报告，适合信贷与投前精准尽调，支持开具专用发票。
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-600">¥</span>
                  <span className="text-4xl font-extrabold text-slate-950">3,380</span>
                  <span className="text-xs text-slate-400 line-through ml-1">¥4,980</span>
                </div>
                <span className="text-xs text-[#0084c2] font-medium mt-0.5 block">包含 10 份全景报告 (单份立省 ¥30)</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 pt-4 border-t border-slate-200 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 10 份企业全景尽调报告</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 单份折算低至 ¥338 元</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 支持开具增值税专用发票</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 历史报告长期归档，支持随时在线复查</li>
              </ul>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/app/profile?tab=billing')}
              className="shadcn-button-primary w-full py-2.5 shadow-md"
            >
              购买 10 份标准包
            </button>
          </motion.div>

          {/* 3. 机构大额优选包 (50份) */}
          <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-white/80 backdrop-blur-xl flex flex-col justify-between space-y-6 border border-white/90 shadow-glass hover:shadow-md transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">机构大额 · 单价最优</span>
                <h3 className="font-bold text-lg text-slate-900 mt-1">机构大额优选包 (50份)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  包含 50 份企业全景尽调报告，适合金融机构与律所高频批量排查，支持对公打款。
                </p>
              </div>

              <div className="pt-4 border-t border-slate-200 font-mono">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-600">¥</span>
                  <span className="text-4xl font-extrabold text-slate-950">15,900</span>
                  <span className="text-xs text-slate-400 line-through ml-1">¥24,900</span>
                </div>
                <span className="text-xs text-slate-600 font-medium mt-0.5 block">包含 50 份全景报告 (单份低至 ¥318)</span>
              </div>

              <ul className="space-y-2 text-xs text-slate-700 pt-4 border-t border-slate-200 font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 50 份企业全景尽调报告</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 单份折算低至 ¥318 元 (最优)</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 支持在线目录大纲索引查阅</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 支持一键下载 A4 PDF 原件</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 支持开具发票与对公转账结算</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#0096DB] shrink-0" /> 历史报告长期归档，支持随时在线复查</li>
              </ul>
            </div>

            <button 
              type="button"
              onClick={() => navigate('/app/profile?tab=billing')}
              className="shadcn-button-outline w-full py-2.5"
            >
              购买 50 份机构包
            </button>
          </motion.div>

        </motion.div>

      </section>

      {/* ========================================================================= */}
      {/* 6. 金融级合规与数据安全保障 (Security & Compliance) */}
      {/* ========================================================================= */}
      <section id="section-security" className="py-16 sm:py-24 bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <motion.div {...fadeInUp} className="text-center max-w-4xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-600" />
              <span>BANK-GRADE SECURITY & COMPLIANCE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-950">
              金融级数据安全标准与全流程合规保障
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              严格恪守国家数据合规要求，确保数据传输、存证与授权合法合规
            </p>
          </motion.div>

          <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true, margin: "-60px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5 hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 font-bold text-base text-slate-900">
                <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200/60 flex items-center justify-center text-[#0096DB]">
                  <Lock className="w-4 h-4" />
                </div>
                <span>国密 SM4 传输与存储加密</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                全链路采用金融级 TLS 1.3 + 国密 SM4 双层对称加密体系，涉税发票与个人身份敏感字段全脱敏存储。
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5 hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 font-bold text-base text-slate-900">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span>法定代表人强授权电子存证</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                涉税与经营数据调取必须经由法定代表人微信人脸三元核身确权，生成不可篡改的区块链电子授权凭证链。
              </p>
            </motion.div>

            <motion.div variants={fadeInUp} className="p-6 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3.5 hover:shadow-md transition-all">
              <div className="flex items-center gap-2.5 font-bold text-base text-slate-900">
                <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-600">
                  <Award className="w-4 h-4" />
                </div>
                <span>等保三级与合规法律审查</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                全面满足国家公安部网络安全等级保护三级（等保三级）规范，严格遵循《数据安全法》与《个人信息保护法》。
              </p>
            </motion.div>
          </motion.div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. 底部行动转化卡片 (Bottom Conversion Hero Banner) */}
      {/* ========================================================================= */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            {...fadeInUp}
            className="p-8 sm:p-14 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden text-center space-y-6"
          >
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="relative z-10 space-y-4 max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                即刻开启银行级企业全景深度尽调
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                新用户注册即赠 1 次免费额度，毫秒级调取官方中台，出具权威尽调报告与 A4 PDF 存证原件。
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleTriggerExperience()}
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#0096DB] to-[#0ea5e9] hover:from-[#0084c2] hover:to-[#0284c7] text-white font-semibold text-base shadow-glow-primary hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer gap-2"
                >
                  <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                  <span>{user ? '进入工作台立即发起' : '免费注册并领取体验额度'}</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 免费体验 AI 尽调 - 快速登录/注册 Dialog (shadcn Dialog style) */}
      <Modal
        open={isAuthModalOpen}
        onCancel={() => setIsAuthModalOpen(false)}
        footer={null}
        width={420}
        centered
        destroyOnHidden
      >
        <div className="space-y-6 pt-1">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto flex items-center justify-center">
              <img src="/brand_logo.png" alt="享宇AI智评" className="w-10 h-10 object-contain" />
            </div>
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">
              快速注册 / 登录享宇AI智评
            </h3>
            <p className="text-xs text-slate-500">
              手机验证码一键登录，新用户即刻获赠 <strong className="text-slate-900 font-semibold">1 次免费 AI 全景尽调</strong> 体验额度
            </p>
          </div>

          <form onSubmit={handleModalAuth} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">手机号码</label>
              <div className="flex items-center bg-white rounded-md px-3 py-2 border border-slate-300 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
                <Phone className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="请输入手机号码"
                  className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-slate-400"
                  maxLength={11}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">短信验证码</label>
              <div className="flex items-center bg-white rounded-md px-3 py-2 border border-slate-300 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
                <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="请输入 6 位短信验证码"
                  className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-slate-400"
                  maxLength={6}
                  required
                />
                <button
                  type="button"
                  disabled={countdown > 0 || sendLoading}
                  onClick={handleSendCode}
                  className={`text-xs font-medium shrink-0 ml-2 cursor-pointer transition-colors ${
                    countdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#0096DB] hover:text-[#007cb3] hover:underline'
                  }`}
                >
                  {sendLoading ? '发送中...' : countdown > 0 ? `${countdown}s 后重试` : '获取验证码'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="shadcn-button-primary w-full py-2.5 text-xs font-semibold shadow-xs"
            >
              {authLoading ? '正在核验身份...' : '注册/登录'}
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-3 border-t border-slate-200 text-center text-[11px] text-slate-400">
            <span>登录/注册即代表同意并遵守</span>
            <span className="text-slate-600 hover:underline mx-1 cursor-pointer">《用户服务协议》</span>
            <span>与</span>
            <span className="text-slate-600 hover:underline mx-1 cursor-pointer">《金融级数据隐私政策》</span>
          </div>
        </div>
      </Modal>

    </div>
  );
}
