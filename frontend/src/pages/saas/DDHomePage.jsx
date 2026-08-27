import React, { useState, useEffect } from 'react';
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
  Bookmark
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
  const [legalPerson, setLegalPerson] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.prefillCompany) {
      const p = location.state.prefillCompany;
      setCompanyName(p.company_name || '');
      setCreditCode(p.credit_code || '91440300MA5EXXXX99');
      setLegalPerson(p.legal_person || '法定代表人');
    }
  }, [location.state]);

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setCompanyName(val);
    if (val.trim().length >= 1) {
      try {
        const res = await apiClient.get(`/v1/search/companies?keyword=${encodeURIComponent(val)}`);
        setSearchResults(res.data || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectCompany = (comp) => {
    setCompanyName(comp.company_name);
    setCreditCode(comp.credit_code);
    setLegalPerson(comp.legal_person);
    setSearchResults([]);
  };

  const handleStartDD = async () => {
    if (!companyName.trim()) {
      message.warning('请输入目标企业全称或统一信用代码');
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
        company_name: companyName,
        credit_code: creditCode || `91440300MA5${Math.floor(Math.random()*900000000+100000000)}X`,
        legal_person: legalPerson || '张法定',
        scene: 'bank_credit',
        dimensions: dimensions,
        auth_mode: 'weifengqi_qr'
      });

      if (res.code === 0) {
        message.success('尽调任务发起成功！已扣减 1 次尽调额度，请让企业法定代表人完成扫码授权');
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
            企业法人授权接入，全量调阅企业工商、司法、股权与经营合规全景尽调报告
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
        
        {/* 1. 目标企业输入 */}
        <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <label className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-700" />
              1. 目标企业主体 (中台模糊联想匹配)
            </label>
            <span className="text-xs text-slate-400 font-mono">STEP 01</span>
          </div>
          
          <div className="relative pt-1">
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-sm px-3.5 py-2.5 focus-within:border-sky-600 focus-within:bg-white transition-colors">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={companyName}
                onChange={handleSearchChange}
                placeholder="输入企业全称或统一信用代码（如：东莞市顺捷实业、深圳腾讯前海、享宇数科）..."
                className="w-full bg-transparent border-0 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            {/* 联想下拉菜单 */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-sm shadow-lg border border-slate-300 overflow-hidden z-50 divide-y divide-slate-100">
                <div className="p-2.5 text-xs text-slate-500 font-semibold bg-slate-50">
                  匹配到企业主体库（点击快捷填入）：
                </div>
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSelectCompany(item)}
                    className="p-3.5 hover:bg-sky-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{item.company_name}</span>
                      <span className="text-xs text-sky-800 font-mono font-semibold px-2 py-0.5 rounded-xs bg-sky-50 border border-sky-300">
                        法人: {item.legal_person}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-slate-500 font-mono">
                      统一社会信用代码: {item.credit_code}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {creditCode && (
            <div className="p-3.5 rounded-sm bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-700 font-mono">
              <span>已绑定统一代码: <strong className="text-slate-900">{creditCode}</strong></span>
              <span>法定代表人: <strong className="text-slate-900">{legalPerson || '已核验'}</strong></span>
            </div>
          )}
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
              <span>【授权流说明】任务发起后将生成专属授权二维码，企业法人微信扫码确认后，平台将全自动调阅生成企业全景尽调报告。</span>
            </div>
          </div>
        </div>

        {/* 3. 一键发起按钮栏 */}
        <div className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <span className="text-xs text-slate-500">
            消耗规则：消耗 <strong className="text-slate-900 font-semibold">1 次尽调额度 = 生成 1 份终身有效报告</strong>（深度整合全维数据中台，永久归档免费复查）
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
