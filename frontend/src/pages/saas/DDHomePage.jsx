import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Users
} from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import RechargeModal from '../../components/RechargeModal';

export default function DDHomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUserProfile } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [creditCode, setCreditCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);

  useEffect(() => {
    // 仅在显式传入非空参数时设置，不进行任何默认预填充
    if (location.state?.prefillCompany) {
      const p = location.state.prefillCompany;
      if (p.company_name) setCompanyName(p.company_name);
      if (p.credit_code) setCreditCode(p.credit_code);
    }
  }, [location.state]);

  const handleStartDD = async () => {
    const trimmedName = companyName.trim();
    const trimmedCode = creditCode.trim();

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

      const res = await apiClient.post('/v1/tasks/create', {
        company_name: trimmedName,
        credit_code: trimmedCode,
        legal_person: '法定代表人',
        scene: 'bank_credit',
        dimensions: dimensions,
        auth_mode: 'weifengqi_qr'
      });

      if (res.code === 0) {
        message.success('尽调任务发起成功！已生成专属授权链接，请让企业法人完成扫码授权');
        refreshUserProfile();
        navigate('/app/tasks?tab=tasks');
      }
    } catch (err) {
      message.error(err.response?.data?.detail || '发起尽调任务失败');
    } finally {
      setSubmitting(false);
    }
  };

  const hasQuota = (user?.balance_quota ?? 0) > 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-900">
      
      {/* 头部标题与公文状态栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] sm:text-xs font-semibold text-[#0096DB] uppercase tracking-wider">
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

        {user && (
          <div className="shadcn-card px-3.5 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0 bg-white/80 backdrop-blur-xl border border-white/90 shadow-glass rounded-xl">
            <div className="text-left sm:text-right">
              <span className="text-[11px] sm:text-xs text-slate-500 block">可用尽调额度</span>
              <span className="text-lg sm:text-xl font-bold text-[#0096DB] font-mono leading-none">
                {user.balance_quota ?? 0} <span className="text-xs font-normal text-slate-500">次</span>
              </span>
            </div>
            <button 
              type="button"
              onClick={() => setRechargeModalOpen(true)}
              className="shadcn-button-outline text-xs py-1.5 px-3 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 text-[#0096DB]" />
              充值额度
            </button>
          </div>
        )}
      </div>

      {/* 额度不足提示 Banner */}
      {!hasQuota && (
        <div className="mt-4 sm:mt-6 p-3.5 sm:p-4 rounded-xl bg-amber-50/80 backdrop-blur-sm border border-amber-200/80 text-xs text-amber-950 flex flex-col sm:flex-row sm:items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-0.5 sm:space-y-1">
              <div className="font-bold text-xs sm:text-sm text-amber-900">
                当前可用尽调额度为 0 次
              </div>
              <p className="text-amber-800 leading-relaxed text-[11px] sm:text-xs">
                发起全景尽调需消耗 1 次尽调额度（生成企业全景尽调报告，长期归档随时调阅）。请先在线购买额度加油包。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRechargeModalOpen(true)}
            className="w-full sm:w-auto text-center px-3.5 py-2 sm:py-1.5 rounded-lg bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            立即充值
          </button>
        </div>
      )}

      <div className="mt-5 sm:mt-8 space-y-4 sm:space-y-6">
        
        {/* 1. 目标企业主体与统一信用代码 */}
        <div className="shadcn-card p-4 sm:p-6 bg-white/80 backdrop-blur-xl space-y-4 sm:space-y-5 border border-white/90 shadow-glass rounded-xl sm:rounded-2xl">
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
            <span className="shadcn-badge-secondary font-mono bg-cyan-50 text-[#0084c2] border border-cyan-200/60 shrink-0 text-[10px] sm:text-xs px-2 py-0.5">
              STEP 01
            </span>
          </div>

          {/* 突出的双核心输入区域 */}
          <div className="p-3.5 sm:p-5 bg-white/60 backdrop-blur-md rounded-xl border border-slate-200/70 space-y-3 sm:space-y-4 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {/* 企业全称 */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    企业全称 <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal">须与营业执照一致</span>
                </label>
                <div className="flex items-center bg-white/90 border border-slate-200/90 rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 focus-within:border-[#0096DB] focus-within:ring-2 focus-within:ring-[#0096DB]/20 transition-all shadow-2xs">
                  <Building className="w-4 h-4 text-slate-400 mr-2 sm:mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="请输入企业完整注册全称（如：某某实业有限公司）"
                    className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-900 font-medium focus:outline-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* 统一社会信用代码 */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    统一社会信用代码 (18位) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-normal">18位大写英数</span>
                </label>
                <div className="flex items-center bg-white/90 border border-slate-200/90 rounded-xl px-3 sm:px-3.5 py-2 sm:py-2.5 focus-within:border-[#0096DB] focus-within:ring-2 focus-within:ring-[#0096DB]/20 transition-all shadow-2xs">
                  <Hash className="w-4 h-4 text-slate-400 mr-2 sm:mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={creditCode}
                    onChange={(e) => setCreditCode(e.target.value.toUpperCase())}
                    placeholder="请输入18位统一代码（如：91441900MA4UQ****X）"
                    className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-900 font-mono font-bold tracking-wide focus:outline-none placeholder:text-slate-400"
                    maxLength={18}
                  />
                </div>
              </div>
            </div>

            <div className="pt-2.5 sm:pt-3 border-t border-slate-100 text-[11px] sm:text-xs text-slate-600 flex items-start gap-1.5 sm:gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0096DB] shrink-0 mt-0.5" />
              <span>提示：请核对企业全称与信用代码，确认无误后点击发起。系统将对接官方工商与司法全息数据中台。</span>
            </div>
          </div>
        </div>

        {/* 2. 企业数据授权全量接入清单 */}
        <div className="shadcn-card p-4 sm:p-6 bg-white/80 backdrop-blur-xl space-y-3 sm:space-y-4 border border-white/90 shadow-glass rounded-xl sm:rounded-2xl">
          <div className="flex items-center justify-between pb-2.5 sm:pb-3 border-b border-slate-100">
            <label className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5 sm:gap-2">
              <FileCheck className="w-4 h-4 text-[#0096DB]" />
              <span>2. 尽调数据维度清单 (全量 6 大维度)</span>
            </label>
            <span className="shadcn-badge-secondary font-mono bg-cyan-50 text-[#0084c2] border border-cyan-200/60 shrink-0 text-[10px] sm:text-xs px-2 py-0.5">
              STEP 02
            </span>
          </div>

          <div className="space-y-2.5 sm:space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 text-xs">
              <div className="p-2.5 sm:p-3 bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg flex items-center gap-2 text-slate-800 shadow-2xs hover:border-[#0096DB]/40 transition-colors">
                <Building className="w-3.5 h-3.5 text-[#0096DB] shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">市监工商主体照面与董监高治理</span>
              </div>
              <div className="p-2.5 sm:p-3 bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg flex items-center gap-2 text-slate-800 shadow-2xs hover:border-[#0096DB]/40 transition-colors">
                <Users className="w-3.5 h-3.5 text-[#0096DB] shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">股权出资穿透与最终实控人图谱</span>
              </div>
              <div className="p-2.5 sm:p-3 bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg flex items-center gap-2 text-slate-800 shadow-2xs hover:border-[#0096DB]/40 transition-colors">
                <Scale className="w-3.5 h-3.5 text-[#0096DB] shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">司法涉诉裁判、失信与行政处罚</span>
              </div>
              <div className="p-2.5 sm:p-3 bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg flex items-center gap-2 text-slate-800 shadow-2xs hover:border-[#0096DB]/40 transition-colors">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0096DB] shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">经营异常名录与动产抵质押排查</span>
              </div>
              <div className="p-2.5 sm:p-3 bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg flex items-center gap-2 text-slate-800 shadow-2xs hover:border-[#0096DB]/40 transition-colors">
                <Truck className="w-3.5 h-3.5 text-[#0096DB] shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">供应链客商分布与产业经营态势</span>
              </div>
              <div className="p-2.5 sm:p-3 bg-white/70 backdrop-blur-sm border border-slate-200/70 rounded-lg flex items-center gap-2 text-slate-800 shadow-2xs hover:border-[#0096DB]/40 transition-colors">
                <Bookmark className="w-3.5 h-3.5 text-[#0096DB] shrink-0" />
                <span className="font-semibold text-[11px] sm:text-xs">企业全景尽调报告全文与原件下载</span>
              </div>
            </div>
            
            <div className="p-3 sm:p-3.5 bg-cyan-50/50 backdrop-blur-sm border border-cyan-100/70 rounded-xl text-[11px] sm:text-xs text-slate-800 flex items-start gap-2">
              <QrCode className="w-4 h-4 text-[#0096DB] shrink-0 mt-0.5" />
              <span>【授权说明】任务发起后将实时生成专属授权链接与二维码，支持复制分享或由企业法定代表人微信扫码确认授权。</span>
            </div>
          </div>
        </div>

        {/* 3. 一键发起按钮栏 */}
        <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <span className="text-[11px] sm:text-xs text-slate-500">
            消耗规则：消耗 <strong className="text-[#0096DB] font-semibold">1 次尽调额度 = 生成 1 份全景报告</strong>（长期归档随时调阅）
          </span>

          <button
            type="button"
            onClick={handleStartDD}
            disabled={submitting}
            className="shadcn-button-primary w-full sm:w-auto px-6 sm:px-8 py-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-md"
          >
            <span>{submitting ? '尽调流水线调度中...' : (hasQuota ? '一键发起企业全景尽调 (消耗 1 次额度)' : '额度不足，去充值')}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
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
