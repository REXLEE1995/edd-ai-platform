import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Building,
  Building2, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  CheckCircle, 
  AlertCircle, 
  ArrowRight, 
  FileCheck, 
  CreditCard, 
  Check, 
  Lock, 
  FileText,
  HelpCircle,
  Layers,
  Scale,
  Calendar,
  Zap,
  Truck,
  BarChart3,
  Users,
  Bookmark,
  Edit3,
  Hash,
  UserCheck
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800">
      
      {/* 头部标题与公文状态栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-block w-2.5 h-2.5 bg-sky-700 rounded-xs"></span>
            <span className="text-xs font-bold text-sky-800 uppercase tracking-wider">
              ENTERPRISE DUE DILIGENCE INITIATION
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            发起企业深度尽调任务
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            全量调阅企业工商、司法、股权与经营合规全景尽调报告
          </p>
        </div>

        {user && (
          <div className="bg-white px-4 py-2.5 rounded-sm border border-slate-300 shadow-2xs flex items-center gap-3.5 shrink-0">
            <div className="text-right">
              <span className="text-xs text-slate-500 block font-medium">当前可用尽调额度</span>
              <span className="text-xl font-extrabold text-sky-800 font-mono leading-none">
                {user.balance_quota ?? 0} <span className="text-xs font-normal text-slate-500">次</span>
              </span>
            </div>
            <button 
              onClick={() => navigate('/app/profile?tab=billing')}
              className="px-3 py-1.5 rounded-sm bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs flex items-center gap-1 transition-colors font-semibold shadow-2xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              充值加油包
            </button>
          </div>
        )}
      </div>

      {/* 额度不足提示 Banner */}
      {!hasQuota && (
        <div className="mt-6 p-4 rounded-sm bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start justify-between gap-3">
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
            onClick={() => navigate('/app/profile?tab=billing')}
            className="px-3.5 py-1.5 rounded-sm bg-amber-800 hover:bg-amber-900 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
          >
            立即充值
          </button>
        </div>
      )}

      <div className="mt-6 space-y-6">
        
        {/* 1. 目标企业主体与统一信用代码 */}
        <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <label className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-700" />
                1. 目标企业主体与统一社会信用代码
              </label>
              <p className="text-xs text-slate-500 mt-0.5">
                请准确输入接入尽调的企业全称与 18 位统一社会信用代码
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-sky-800 bg-sky-50 px-2.5 py-1 rounded-sm border border-sky-200">
              STEP 01
            </span>
          </div>

          {/* 突出的双核心输入区域 */}
          <div className="p-5 sm:p-6 bg-gradient-to-r from-sky-50/50 via-slate-50/80 to-sky-50/30 rounded-md border-2 border-sky-100 shadow-2xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* 企业全称 */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    企业全称 <span className="text-rose-500 font-extrabold text-base">*</span>
                  </span>
                  <span className="text-2xs text-slate-400 font-normal">须与营业执照完全一致</span>
                </label>
                <div className="flex items-center bg-white border-2 border-slate-300 rounded-sm px-4 py-3 focus-within:border-sky-600 focus-within:ring-3 focus-within:ring-sky-100 transition-all shadow-2xs">
                  <Building className="w-4 h-4 text-sky-700 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="请输入企业全称（如：东莞市顺捷实业有限公司）"
                    className="w-full bg-transparent border-0 text-sm sm:text-base text-slate-900 font-bold focus:outline-none placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                  />
                </div>
              </div>

              {/* 统一社会信用代码 */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-900 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    统一社会信用代码 (18位) <span className="text-rose-500 font-extrabold text-base">*</span>
                  </span>
                  <span className="text-2xs text-slate-400 font-normal">18位大写英数混编</span>
                </label>
                <div className="flex items-center bg-white border-2 border-slate-300 rounded-sm px-4 py-3 focus-within:border-sky-600 focus-within:ring-3 focus-within:ring-sky-100 transition-all shadow-2xs">
                  <Hash className="w-4 h-4 text-sky-700 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={creditCode}
                    onChange={(e) => setCreditCode(e.target.value.toUpperCase())}
                    placeholder="如：91441900MA4UQ8888X"
                    className="w-full bg-transparent border-0 text-sm sm:text-base text-slate-900 font-mono font-extrabold tracking-wider focus:outline-none placeholder:text-slate-400 placeholder:font-normal placeholder:text-xs"
                    maxLength={18}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-sky-100/80 text-xs text-slate-600 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-sky-700 shrink-0" />
              <span>提示：请仔细核对上述企业全称与统一社会信用代码，确认无误后点击下方按钮发起全景尽调。系统将对接微风企金税网关与工商全息数据源。</span>
            </div>
          </div>
        </div>

        {/* 2. 企业数据授权全量接入清单 */}
        <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-teal-700" />
              2. 企业授权接入与全景尽调数据清单 (全量 6 大维度)
            </label>
            <span className="text-xs text-slate-400 font-mono">STEP 02</span>
          </div>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center gap-2 text-slate-800">
                <Building className="w-4 h-4 text-sky-700 shrink-0" />
                <span>市监工商主体照面与董监高治理</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center gap-2 text-slate-800">
                <Users className="w-4 h-4 text-teal-700 shrink-0" />
                <span>股权出资穿透与最终实控人图谱</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center gap-2 text-slate-800">
                <Scale className="w-4 h-4 text-rose-700 shrink-0" />
                <span>司法涉诉裁判、失信与行政处罚</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center gap-2 text-slate-800">
                <ShieldCheck className="w-4 h-4 text-sky-700 shrink-0" />
                <span>经营异常名录与动产抵质押排查</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center gap-2 text-slate-800">
                <Truck className="w-4 h-4 text-teal-700 shrink-0" />
                <span>供应链客商分布与产业经营态势</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-sm flex items-center gap-2 text-slate-800">
                <Bookmark className="w-4 h-4 text-indigo-700 shrink-0" />
                <span>企业全景尽调报告全文与原件下载</span>
              </div>
            </div>
            
            <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-sm text-xs text-sky-950 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-sky-700 shrink-0" />
              <span>【授权说明】任务发起后将实时生成专属授权链接与二维码，支持复制分享或由企业法定代表人微信扫码确认授权。</span>
            </div>
          </div>
        </div>

        {/* 3. 一键发起按钮栏 */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            消耗规则：消耗 <strong className="text-slate-900 font-semibold">1 次尽调额度 = 生成 1 份终身有效报告</strong>（深度整合金税与全维数据中台）
          </span>

          <button
            onClick={handleStartDD}
            disabled={submitting}
            className="inline-flex items-center justify-center px-8 py-3 rounded-sm bg-sky-700 hover:bg-sky-800 text-white font-extrabold text-sm shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? '尽调流水线调度中...' : (hasQuota ? '一键发起企业全景尽调 (消耗 1 次额度)' : '额度不足，去充值')}
            <ArrowRight className="w-4 h-4 ml-2" />
          </button>
        </div>

      </div>
    </div>
  );
}
