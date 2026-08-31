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

export default function DDHomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUserProfile } = useAuth();

  const [companyName, setCompanyName] = useState('');
  const [creditCode, setCreditCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.prefillCompany) {
      const p = location.state.prefillCompany;
      setCompanyName(p.company_name || '');
      setCreditCode(p.credit_code || '91440300MA5EXXXX99');
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
      navigate('/app/profile?tab=billing');
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      {/* 头部标题与公文状态栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              ENTERPRISE DUE DILIGENCE INITIATION
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-950 tracking-tight">
            发起企业深度尽调任务
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            全量调阅企业工商、司法、股权与经营合规全景尽调报告
          </p>
        </div>

        {user && (
          <div className="shadcn-card px-4 py-3 flex items-center gap-4 shrink-0 bg-white border border-slate-300 shadow-xs">
            <div className="text-right">
              <span className="text-xs text-zinc-500 block">可用尽调额度</span>
              <span className="text-xl font-bold text-slate-950 font-mono leading-none">
                {user.balance_quota ?? 0} <span className="text-xs font-normal text-zinc-500">次</span>
              </span>
            </div>
            <button 
              type="button"
              onClick={() => navigate('/app/profile?tab=billing')}
              className="shadcn-button-outline text-xs py-1.5 px-3"
            >
              <CreditCard className="w-3.5 h-3.5" />
              充值额度
            </button>
          </div>
        )}
      </div>

      {/* 额度不足提示 Banner */}
      {!hasQuota && (
        <div className="mt-6 p-4 rounded-xl bg-amber-50/80 border border-amber-300 text-xs text-amber-950 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-amber-900">
                当前可用尽调额度为 0 次
              </div>
              <p className="text-amber-800 leading-relaxed">
                发起全景尽调需消耗 1 次尽调额度（生成终身有效企业全景尽调报告）。请先在线购买额度加油包。
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/app/profile?tab=billing')}
            className="px-3.5 py-1.5 rounded-md bg-amber-900 hover:bg-amber-950 text-white font-semibold text-xs shrink-0 transition-colors cursor-pointer shadow-xs"
          >
            立即充值
          </button>
        </div>
      )}

      <div className="mt-8 space-y-6">
        
        {/* 1. 目标企业主体与统一信用代码 */}
        <div className="shadcn-card p-6 bg-white space-y-5 border border-slate-300 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <label className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-800" />
                1. 目标企业主体与统一社会信用代码
              </label>
              <p className="text-xs text-zinc-500 mt-0.5">
                请准确输入接入尽调的企业全称与 18 位统一社会信用代码
              </p>
            </div>
            <span className="shadcn-badge-secondary font-mono">
              STEP 01
            </span>
          </div>

          {/* 突出的双核心输入区域 */}
          <div className="p-5 bg-zinc-50/80 rounded-lg border border-slate-300 space-y-4 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 企业全称 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    企业全称 <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-zinc-400 font-normal">须与营业执照一致</span>
                </label>
                <div className="flex items-center bg-white border border-slate-300 rounded-md px-3.5 py-2.5 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all shadow-2xs">
                  <Building className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="请输入企业全称（如：东莞市顺捷实业有限公司）"
                    className="w-full bg-transparent border-0 text-sm text-slate-900 font-medium focus:outline-none placeholder:text-zinc-400 placeholder:text-xs"
                  />
                </div>
              </div>

              {/* 统一社会信用代码 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    统一社会信用代码 (18位) <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[11px] text-zinc-400 font-normal">18位大写英数</span>
                </label>
                <div className="flex items-center bg-white border border-slate-300 rounded-md px-3.5 py-2.5 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all shadow-2xs">
                  <Hash className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
                  <input
                    type="text"
                    value={creditCode}
                    onChange={(e) => setCreditCode(e.target.value.toUpperCase())}
                    placeholder="如：91441900MA4UQ8888X"
                    className="w-full bg-transparent border-0 text-sm text-slate-900 font-mono font-bold tracking-wide focus:outline-none placeholder:text-zinc-400 placeholder:text-xs"
                    maxLength={18}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 text-xs text-zinc-600 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>提示：请核对企业全称与信用代码，确认无误后点击发起。系统将对接国家税务与官方工商全息数据中台。</span>
            </div>
          </div>
        </div>

        {/* 2. 企业数据授权全量接入清单 */}
        <div className="shadcn-card p-6 bg-white space-y-4 border border-slate-300 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-slate-800" />
              2. 尽调数据维度清单 (全量 6 大维度)
            </label>
            <span className="shadcn-badge-secondary font-mono">
              STEP 02
            </span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-zinc-50 border border-slate-300 rounded-lg flex items-center gap-2.5 text-slate-800 shadow-2xs">
                <Building className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold">市监工商主体照面与董监高治理</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-slate-300 rounded-lg flex items-center gap-2.5 text-slate-800 shadow-2xs">
                <Users className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold">股权出资穿透与最终实控人图谱</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-slate-300 rounded-lg flex items-center gap-2.5 text-slate-800 shadow-2xs">
                <Scale className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold">司法涉诉裁判、失信与行政处罚</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-slate-300 rounded-lg flex items-center gap-2.5 text-slate-800 shadow-2xs">
                <ShieldCheck className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold">经营异常名录与动产抵质押排查</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-slate-300 rounded-lg flex items-center gap-2.5 text-slate-800 shadow-2xs">
                <Truck className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold">供应链客商分布与产业经营态势</span>
              </div>
              <div className="p-3 bg-zinc-50 border border-slate-300 rounded-lg flex items-center gap-2.5 text-slate-800 shadow-2xs">
                <Bookmark className="w-4 h-4 text-slate-700 shrink-0" />
                <span className="font-semibold">企业全景尽调报告全文与原件下载</span>
              </div>
            </div>
            
            <div className="p-3.5 bg-zinc-100/90 border border-slate-300 rounded-lg text-xs text-slate-800 flex items-center gap-2.5">
              <QrCode className="w-4 h-4 text-slate-700 shrink-0" />
              <span>【授权说明】任务发起后将实时生成专属授权链接与二维码，支持复制分享或由企业法定代表人微信扫码确认授权。</span>
            </div>
          </div>
        </div>

        {/* 3. 一键发起按钮栏 */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs text-zinc-500">
            消耗规则：消耗 <strong className="text-slate-900 font-semibold">1 次尽调额度 = 生成 1 份终身有效报告</strong>（深度整合金税与全维数据中台）
          </span>

          <button
            type="button"
            onClick={handleStartDD}
            disabled={submitting}
            className="shadcn-button-primary px-8 py-3 text-sm font-semibold shadow-xs"
          >
            {submitting ? '尽调流水线调度中...' : (hasQuota ? '一键发起企业全景尽调 (消耗 1 次额度)' : '额度不足，去充值')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
