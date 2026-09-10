import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  Building,
  Building2, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  ArrowRight, 
  FileCheck, 
  CreditCard, 
  Lock, 
  Scale, 
  Truck, 
  Bookmark, 
  Hash,
  Users,
  LogIn
} from 'lucide-react';
import { message } from 'antd';
import apiClient, { generateRequestId } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import RechargeModal from '../../components/RechargeModal';

export default function DDHomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, refreshUserProfile, openLoginModal } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [creditCode, setCreditCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qCompany = params.get('company') || params.get('company_name');
    const qCode = params.get('code') || params.get('credit_code');
    if (qCompany) setCompanyName(qCompany);
    if (qCode) setCreditCode(qCode);

    const p = location.state?.prefill;
    if (p) {
      if (p.company_name) setCompanyName(p.company_name);
      if (p.credit_code) setCreditCode(p.credit_code);
    }
  }, [location.search, location.state]);

  const handleStartDD = async () => {
    if (!user) {
      openLoginModal();
      return;
    }

    const trimmedName = companyName.trim();
    const trimmedCode = creditCode.trim().toUpperCase();

    if (!trimmedName) {
      message.warning('请输入目标企业全称');
      return;
    }

    if (!trimmedCode) {
      message.warning('请输入企业统一社会信用代码 (18位)');
      return;
    }

    if ((user?.balance_quota ?? 0) <= 0) {
      message.warning('当前可用尽调额度不足，请先充值额度加油包');
      setRechargeModalOpen(true);
      return;
    }

    setSubmitting(true);
    try {
      const dimensions = [
        '市监工商照面与董监高治理', 
        '股权出资穿透与实控人图谱', 
        '经营司法涉诉与合规监管', 
        '经营异常与行政处罚排查', 
        '供应链客商与产业经营态势', 
        '企业全景深度尽调底稿'
      ];

      const reqId = generateRequestId('req-create');

      const res = await apiClient.post('/v1/tasks/create', {
        company_name: trimmedName,
        credit_code: trimmedCode,
        legal_person: '法定代表人',
        scene: 'bank_credit',
        dimensions: dimensions,
        auth_mode: 'weifengqi_qr'
      }, {
        headers: {
          'X-Request-ID': reqId
        }
      });

      if (res.code === 0) {
        message.success('尽调任务发起成功！已生成专属授权链接，请让企业法人完成扫码授权');
        refreshUserProfile();
        navigate('/app/tasks?tab=tasks', { state: { latestReqId: reqId } });
      }
    } catch (err) {
      message.error(err.response?.data?.detail || '发起尽调任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  const hasQuota = (user?.balance_quota ?? 0) > 0;

  const SAMPLE_ENTERPRISES = [
    { name: '东莞市顺捷实业有限公司', code: '91441900MA54D12345' },
    { name: '杭州享宇智能科技有限公司', code: '91330108MA28W12345' }
  ];

  const handleFillSample = (sample) => {
    setCompanyName(sample.name);
    setCreditCode(sample.code);
    message.info(`已填入示例企业：${sample.name}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-900">
      
      {/* 头部标题与公文状态栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-[#0084c2] uppercase tracking-wider">
              ENTERPRISE DUE DILIGENCE INITIATION
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 tracking-tight">
            发起企业深度尽调任务
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            全量调阅企业工商、司法、股权与经营合规全景尽调报告
          </p>
        </div>

        {user ? (
          <div className="shadcn-card px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs rounded-xl">
            <div className="text-left sm:text-right">
              <span className="text-[11px] sm:text-xs text-slate-500 block">可用尽调额度</span>
              <span className="text-lg sm:text-xl font-bold text-[#0084c2] font-mono leading-none">
                {user.balance_quota ?? 0} <span className="text-xs font-normal text-slate-500">次</span>
              </span>
            </div>
            <button 
              type="button"
              onClick={() => setRechargeModalOpen(true)}
              className="shadcn-button-outline text-xs py-1.5 px-3 hover:border-[#0096DB] hover:text-[#0084c2] shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#0096DB]" />
              充值额度
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200/60 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>登录后调阅与充值额度</span>
          </div>
        )}
      </div>

      {/* 登录提示 Banner (仅未登录时轻量提示) */}
      {!user && (
        <div className="mt-4 sm:mt-6 p-3 sm:p-3.5 rounded-xl bg-cyan-50/70 backdrop-blur-sm border border-cyan-200/70 text-xs text-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#0096DB] shrink-0" />
            <div className="text-slate-600 text-[11px] sm:text-xs">
              <span className="font-semibold text-slate-800">提示：</span>
              您当前处于未登录状态，可直接填写企业信息，点击发起时将自动调起快捷登录，输入内容自动保留。
            </div>
          </div>
          <button
            type="button"
            onClick={openLoginModal}
            className="text-xs text-[#0084c2] hover:text-[#0070a4] font-medium shrink-0 hover:underline inline-flex items-center gap-1 cursor-pointer self-end sm:self-auto"
          >
            <span>已有账号？去登录</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="mt-5 sm:mt-8 space-y-4 sm:space-y-6">
        
        {/* 1. 目标企业主体与统一信用代码 */}
        <div className="shadcn-card p-4 sm:p-6 bg-white/85 backdrop-blur-xl space-y-4 sm:space-y-5 border border-slate-200/80 shadow-xs rounded-xl sm:rounded-2xl">
          <div className="flex items-start sm:items-center justify-between gap-2 pb-3 sm:pb-4 border-b border-slate-100">
            <div>
              <label className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
                <Building2 className="w-4 h-4 text-[#0096DB] shrink-0" />
                <span>1. 目标企业主体与统一社会信用代码</span>
              </label>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                请准确输入接入尽调的企业全称与 18 位统一社会信用代码
              </p>
            </div>
            <span className="shadcn-badge-secondary font-mono bg-cyan-50 text-[#0084c2] border border-cyan-200/60 shrink-0 text-[10px] sm:text-xs px-2 py-0.5 font-bold">
              STEP 01
            </span>
          </div>

          {/* 突出的双核心输入区域 (强化边框与高亮对比，让用户一眼锁定) */}
          <div className="p-4 sm:p-5 bg-gradient-to-b from-sky-50/30 via-white to-white rounded-xl border-2 border-sky-200/90 shadow-[0_4px_20px_-4px_rgba(0,150,219,0.10)] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 企业全称 */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-[#0096DB] rounded-full inline-block"></span>
                    企业全称 <span className="text-rose-500 font-bold">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">须与营业执照完全一致</span>
                </label>
                <div className="flex items-center bg-white border border-slate-300/90 hover:border-slate-400 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 focus-within:border-[#0096DB] focus-within:ring-4 focus-within:ring-[#0096DB]/15 transition-all shadow-xs">
                  <Building className="w-4 h-4 text-[#0096DB] mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="请输入企业完整注册全称（如：杭州某某科技有限公司）"
                    className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-950 font-semibold focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                  />
                  {companyName && (
                    <button
                      type="button"
                      onClick={() => setCompanyName('')}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* 统一社会信用代码 */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-3.5 bg-[#0096DB] rounded-full inline-block"></span>
                    统一社会信用代码 (18位) <span className="text-rose-500 font-bold">*</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">18位大写英文字母与数字</span>
                </label>
                <div className="flex items-center bg-white border border-slate-300/90 hover:border-slate-400 rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 focus-within:border-[#0096DB] focus-within:ring-4 focus-within:ring-[#0096DB]/15 transition-all shadow-xs">
                  <Hash className="w-4 h-4 text-[#0096DB] mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={creditCode}
                    onChange={(e) => setCreditCode(e.target.value.toUpperCase())}
                    placeholder="请输入18位统一代码（如：91330108MA28W****X）"
                    className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-950 font-mono font-bold tracking-wide focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
                    maxLength={18}
                  />
                  {creditCode && (
                    <button
                      type="button"
                      onClick={() => setCreditCode('')}
                      className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 快捷示例企业一键填充 */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0096DB]" />
                <span>快速填入示例：</span>
              </span>
              {SAMPLE_ENTERPRISES.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFillSample(sample)}
                  className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white/90 hover:bg-cyan-50/80 text-slate-700 hover:text-[#0084c2] border border-slate-200/80 hover:border-cyan-200 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                >
                  {sample.name}
                </button>
              ))}
            </div>

            {/* 一键发起核心操作行：紧跟在企业与代码信息下一行 */}
            <div className="pt-3.5 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-[11px] sm:text-xs text-slate-600 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#0096DB] shrink-0" />
                <span>消耗规则：消耗 <strong className="text-[#0084c2] font-semibold">1 次尽调额度 = 生成 1 份全景报告</strong>（长期归档随时调阅）</span>
              </div>

              <button
                type="button"
                onClick={handleStartDD}
                disabled={submitting}
                className="shadcn-button-primary w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm hover:shadow-md cursor-pointer transition-all shrink-0 active:scale-[0.98]"
              >
                <span>
                  {submitting 
                    ? '尽调流水线调度中...' 
                    : (user 
                        ? (hasQuota ? '一键发起企业全景尽调 (消耗 1 次额度)' : '额度不足，去充值') 
                        : '一键发起企业全景尽调')}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 2. 企业数据授权全量接入清单 */}
        <div className="shadcn-card p-4 sm:p-6 bg-white/85 backdrop-blur-xl space-y-3 sm:space-y-4 border border-slate-200/80 shadow-xs rounded-xl sm:rounded-2xl">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
            <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
              <FileCheck className="w-4 h-4 text-[#0096DB]" />
              <span>2. 尽调数据维度清单 (全量 6 大维度)</span>
            </label>
            <span className="shadcn-badge-secondary font-mono bg-cyan-50 text-[#0084c2] border border-cyan-200/60 shrink-0 text-[10px] sm:text-xs px-2 py-0.5 font-bold">
              STEP 02
            </span>
          </div>

          <div className="space-y-2.5 sm:space-y-3 pt-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
              {[
                { icon: Building, title: '市监工商与治理', desc: '照面信息、董监高任职' },
                { icon: Users, title: '股权出资与实控人', desc: '穿透图谱、最终受益人' },
                { icon: Scale, title: '司法涉诉与合规排查', desc: '被执行人、限制高消费' },
                { icon: ShieldCheck, title: '经营异常与动产抵押', desc: '异常名录、严重违法' },
                { icon: Truck, title: '客商分布与经营态势', desc: '上下游协同、行业对标' },
                { icon: Bookmark, title: '尽调报告与PDF下载', desc: 'Markdown存证、矢量导出' }
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={idx} 
                    className="p-3 bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-xl flex items-center gap-2.5 text-slate-800 shadow-2xs hover:border-[#0096DB]/50 hover:shadow-xs transition-all group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-50 group-hover:bg-cyan-100/70 text-[#0096DB] border border-sky-100 flex items-center justify-center shrink-0 transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 block truncate group-hover:text-[#0084c2] transition-colors">{item.title}</span>
                      <span className="text-[10px] sm:text-[11px] text-slate-400 block truncate">{item.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-3 sm:p-3.5 bg-gradient-to-r from-cyan-50/60 to-sky-50/60 backdrop-blur-sm border border-cyan-200/70 rounded-xl text-[11px] sm:text-xs text-slate-800 flex items-start gap-2 shadow-2xs">
              <QrCode className="w-4 h-4 text-[#0096DB] shrink-0 mt-0.5" />
              <span>【授权说明】任务发起后将实时生成专属授权链接与二维码，支持复制分享或由企业法定代表人微信扫码确认授权。</span>
            </div>
          </div>
        </div>

      </div>

      {/* 快捷充值浮窗 */}
      <RechargeModal
        open={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
      />
    </div>
  );
}
