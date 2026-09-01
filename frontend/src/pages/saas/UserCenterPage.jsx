import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  User, 
  CreditCard, 
  Receipt, 
  ShieldCheck, 
  Lock, 
  Save, 
  Sparkles, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  QrCode,
  Phone,
  Gift
} from 'lucide-react';
import { message, Modal, Pagination } from 'antd';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function UserCenterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUserProfile } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const qTab = new URLSearchParams(location.search).get('tab');
    if (qTab && ['profile', 'billing', 'transactions'].includes(qTab)) {
      setActiveTab(qTab);
    }
  }, [location.search]);

  const switchTab = (key) => {
    setActiveTab(key);
    navigate(`/app/profile?tab=${key}`, { replace: true });
  };

  // 1. 个人资料与实名认证状态
  const [isRealNameVerified, setIsRealNameVerified] = useState(true);
  const [userName, setUserName] = useState('大雄');
  const [idCardNumber, setIdCardNumber] = useState('440301199001011234');
  const [savingProfile, setSavingProfile] = useState(false);

  // 密码修改
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handleVerifyRealName = (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      message.warning('请输入真实姓名');
      return;
    }
    if (!idCardNumber.trim() || idCardNumber.length < 15) {
      message.warning('请输入有效的18位居民身份证号码');
      return;
    }
    setIsRealNameVerified(true);
    message.success('恭喜！个人公安实名认证已核验通过，已为您发放 1 次免费全景尽调额度！');
  };

  const handleCancelRealName = () => {
    setIsRealNameVerified(false);
    message.info('已切换为【未实名认证】状态（测试模拟），已撤销实名赠送额度');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!userName.trim()) {
      message.warning('请输入姓名');
      return;
    }
    setSavingProfile(true);
    try {
      const res = await apiClient.post('/v1/auth/profile/update', {
        name: userName
      });
      message.success(res.message || '个人资料保存成功！');
      refreshUserProfile();
    } catch (err) {
      message.error(err.response?.data?.detail || '更新资料失败');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      message.warning('新密码长度不能少于6位');
      return;
    }
    if (newPassword !== confirmPassword) {
      message.warning('两次输入的新密码不一致');
      return;
    }
    setChangingPwd(true);
    try {
      const res = await apiClient.post('/v1/auth/password/change', {
        new_password: newPassword
      });
      message.success(res.message || '密码修改成功，请牢记新密码！');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      message.error(err.response?.data?.detail || '修改密码失败');
    } finally {
      setChangingPwd(false);
    }
  };

  // 2. 额度与充值加油包数据
  const [packages, setPackages] = useState([]);
  const [summary, setSummary] = useState(null);
  const [payingOrder, setPayingOrder] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // 3. 流水数据与分页
  const [transactions, setTransactions] = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [txPage, setTxPage] = useState(1);
  const [txPageSize, setTxPageSize] = useState(10);
  const [loadingTx, setLoadingTx] = useState(false);

  const fetchPackagesAndSummary = async () => {
    try {
      const [pkgRes, sumRes] = await Promise.all([
        apiClient.get('/v1/billing/packages'),
        apiClient.get('/v1/billing/summary')
      ]);
      setPackages(pkgRes.data || []);
      setSummary(sumRes.data || {});
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTransactions = async (p = txPage, ps = txPageSize) => {
    setLoadingTx(true);
    try {
      const res = await apiClient.get(`/v1/billing/transactions?page=${p}&page_size=${ps}`);
      setTransactions(res.items || res.data || []);
      setTxTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTx(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'billing') {
      fetchPackagesAndSummary();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab]);

  const handleCreateOrder = async (pkg) => {
    try {
      const res = await apiClient.post('/v1/billing/orders/create', {
        package_id: pkg.id,
        pay_type: 'wechat'
      });
      setPayingOrder(res.data);
      setPayModalOpen(true);
    } catch (err) {
      message.error(err.response?.data?.detail || '创建充值订单失败');
    }
  };

  const handleMockPaySuccess = async () => {
    if (!payingOrder) return;
    setIsProcessingPay(true);
    try {
      const res = await apiClient.post(`/v1/billing/orders/${payingOrder.order_id}/mock-pay`);
      message.success(res.message || '充值成功！尽调额度已即时到账');
      setPayModalOpen(false);
      setPayingOrder(null);
      refreshUserProfile();
      fetchPackagesAndSummary();
    } catch (err) {
      message.error(err.response?.data?.detail || '支付处理失败');
    } finally {
      setIsProcessingPay(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      {/* 头部个人基本信息卡片 (shadcn Card) */}
      <div className="shadcn-card bg-white/75 backdrop-blur-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border border-white/85 shadow-glass rounded-xl">
        <div className="flex items-center space-x-4">
          <div className={`w-12 h-12 rounded-lg text-white flex items-center justify-center font-bold text-xl shadow-2xs ${
            isRealNameVerified ? 'bg-gradient-to-br from-[#0096DB] to-[#29B47D]' : 'bg-zinc-400'
          }`}>
            {isRealNameVerified ? (userName?.[0] || '雄') : '未'}
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-950 tracking-tight">
                {isRealNameVerified ? (userName || '大雄') : '未实名用户'}
              </h1>
              <span className="shadcn-badge-secondary">
                {isRealNameVerified ? '个人实名用户' : '个人普通用户'}
              </span>
              {isRealNameVerified ? (
                <span className="shadcn-badge-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  实名认证已通过
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 text-amber-800 px-2.5 py-0.5 text-xs font-medium gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  未实名认证
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 font-mono">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-zinc-400" /> {user?.phone || '13800138000'}</span>
              <span>实名认证: {isRealNameVerified ? <strong className="text-slate-800">440301********1234 (已核验)</strong> : <strong className="text-amber-700">待完成公安实名核身</strong>}</span>
              <span>注册时间: <strong className="text-slate-800">2026-08-27</strong></span>
            </div>
          </div>
        </div>

        {/* 快捷额度卡 */}
        <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-3 rounded-lg border border-white/80 self-start md:self-auto shadow-2xs">
          <div className="text-right">
            <span className="text-xs text-zinc-500 block">可用尽调额度</span>
            <span className="text-2xl font-bold text-slate-950 font-mono leading-none">
              {isRealNameVerified ? (user?.balance_quota ?? 57) : Math.max(0, (user?.balance_quota ?? 57) - 1)} <span className="text-xs font-normal text-zinc-500">次</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => switchTab('billing')}
            className="shadcn-button-primary text-xs py-1.5 px-3"
          >
            <CreditCard className="w-3.5 h-3.5" />
            购买加油包
          </button>
        </div>
      </div>

      {/* Tab 导航栏 (shadcn 胶囊风格) */}
      <div className="mt-6 flex items-center bg-slate-200/60 backdrop-blur-xl p-1 rounded-lg w-fit border border-white/60 shadow-xs">
        <button
          type="button"
          onClick={() => switchTab('profile')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-white text-slate-950 font-semibold shadow-xs border border-white/80 backdrop-blur-md'
              : 'text-zinc-600 hover:text-slate-900 border border-transparent'
          }`}
        >
          <User className="w-3.5 h-3.5 text-slate-700" />
          <span>个人资料与实名认证</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('billing')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'billing'
              ? 'bg-white text-slate-950 font-semibold shadow-xs border border-white/80 backdrop-blur-md'
              : 'text-zinc-600 hover:text-slate-900 border border-transparent'
          }`}
        >
          <Zap className="w-3.5 h-3.5 text-slate-700" />
          <span>尽调额度加油包</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('transactions')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'bg-white text-slate-950 font-semibold shadow-xs border border-white/80 backdrop-blur-md'
              : 'text-zinc-600 hover:text-slate-900 border border-transparent'
          }`}
        >
          <Receipt className="w-3.5 h-3.5 text-slate-700" />
          <span>额度变动流水明细</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. 个人资料与实名认证设置 */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="mt-6 space-y-6">
          
          <div className="shadcn-card bg-white/75 backdrop-blur-xl p-6 space-y-4 border border-white/85 shadow-glass rounded-xl">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#0096DB]" />
                个人实名认证与账户资料
              </h3>
              {isRealNameVerified ? (
                <span className="shadcn-badge-success">
                  个人公安实名已核身
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 text-amber-800 px-2.5 py-0.5 text-xs font-medium">
                  未完成实名认证 (不可发起尽调)
                </span>
              )}
            </div>

            <form onSubmit={isRealNameVerified ? handleSaveProfile : handleVerifyRealName} className="space-y-4 max-w-2xl text-xs">
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700">真实姓名</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="请输入您的真实姓名..."
                  className="w-full px-3.5 py-2 bg-white/80 border border-slate-200 rounded-md focus:border-[#0096DB] focus:ring-2 focus:ring-[#0096DB]/15 focus:outline-none text-slate-900 text-xs font-medium transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700">登录手机号 (不可变更)</label>
                <input
                  type="text"
                  disabled
                  value={user?.phone || '13800138000'}
                  className="w-full px-3.5 py-2 bg-slate-100/70 border border-slate-200 rounded-md text-zinc-500 font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700">证件类型</label>
                <input
                  type="text"
                  disabled
                  value="居民身份证"
                  className="w-full px-3.5 py-2 bg-slate-100/70 border border-slate-200 rounded-md text-zinc-500 text-xs cursor-not-allowed font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700">
                  {isRealNameVerified ? '实名身份证号码 (已通过公安核验)' : '身份证号码 (18位居民身份证)'}
                </label>
                <input
                  type="text"
                  disabled={isRealNameVerified}
                  value={isRealNameVerified ? '440301********1234' : idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value)}
                  placeholder="请输入18位居民身份证号码..."
                  className={`w-full px-3.5 py-2 border border-slate-200 rounded-md font-mono text-xs ${
                    isRealNameVerified ? 'bg-slate-100/70 text-zinc-500 cursor-not-allowed' : 'bg-white/80 focus:border-[#0096DB] focus:ring-2 focus:ring-[#0096DB]/15 focus:outline-none'
                  }`}
                />
              </div>

              {isRealNameVerified ? (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-300 rounded-lg text-emerald-950 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">实名认证权益已生效：</p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      您已完成个人实名核验，享有平台全部企业全景尽调发起、报告查阅与 PDF 原件下载权限（实名认证已获赠 1 次全景尽调额度）。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50/80 border border-amber-300 rounded-lg text-amber-950 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold">⚠️ 尚未完成实名认证提示：</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      根据合规监管要求，发起尽调前需先完成个人公安实名核验。<strong>仅完成实名认证后才可获赠 1 次免费全景尽调额度（普通注册/登录不赠送额度）。</strong>
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center gap-3 flex-wrap">
                {isRealNameVerified ? (
                  <>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="shadcn-button-primary text-xs py-2 px-4"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingProfile ? '正在保存...' : '保存个人资料'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelRealName}
                      className="shadcn-button-outline text-xs py-2 px-4 text-amber-900 border-amber-300 bg-amber-50 hover:bg-amber-100/50"
                      title="点击模拟未实名认证状态，便于测试未认证场景"
                    >
                      <XCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>取消实名认证 (模拟未认证)</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    className="shadcn-button-primary text-xs py-2.5 px-6"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>立即提交公安实名认证 (立领 1 次免费额度)</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* 安全与登录密码修改 */}
          <div className="shadcn-card bg-white/75 backdrop-blur-xl p-6 space-y-4 border border-white/85 shadow-glass rounded-xl">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#0096DB]" />
                账户登录密码安全
              </h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl text-xs">
              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700">新登录密码 (不少于6位)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码..."
                  className="w-full px-3.5 py-2 bg-white/80 border border-slate-200 rounded-md focus:border-[#0096DB] focus:ring-2 focus:ring-[#0096DB]/15 focus:outline-none text-slate-900 text-xs font-mono transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block font-medium text-slate-700">确认新密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码..."
                  className="w-full px-3.5 py-2 bg-white/80 border border-slate-200 rounded-md focus:border-[#0096DB] focus:ring-2 focus:ring-[#0096DB]/15 focus:outline-none text-slate-900 text-xs font-mono transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPwd}
                  className="shadcn-button-primary text-xs py-2 px-4"
                >
                  {changingPwd ? '正在更新密码...' : '修改登录密码'}
                </button>
              </div>
            </form>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. 额度充值加油包 */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div className="mt-6 space-y-6">
          
          {/* 额度 4 宫格概览 (shadcn Stat Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="shadcn-card p-5 bg-white/75 backdrop-blur-xl space-y-1 border border-white/85 shadow-glass rounded-xl">
              <span className="text-xs text-zinc-500 font-semibold block">当前可用尽调额度</span>
              <span className="text-3xl font-bold text-slate-950 font-mono block mt-1">
                {isRealNameVerified ? (user?.balance_quota ?? 57) : Math.max(0, (user?.balance_quota ?? 57) - 1)}
                <span className="text-xs font-normal text-zinc-500 ml-1">次</span>
              </span>
            </div>

            <div className="shadcn-card p-5 bg-white/75 backdrop-blur-xl space-y-1 border border-white/85 shadow-glass rounded-xl">
              <span className="text-xs text-zinc-500 font-semibold block">累计购买充值额度</span>
              <span className="text-2xl font-bold text-slate-950 font-mono block mt-1">
                {summary?.total_recharge_quota ?? 80}
                <span className="text-xs font-normal text-zinc-500 ml-1">次</span>
              </span>
            </div>

            <div className="shadcn-card p-5 bg-white/75 backdrop-blur-xl space-y-1 border border-white/85 shadow-glass rounded-xl">
              <span className="text-xs text-zinc-500 font-semibold block">累计已消耗尽调</span>
              <span className="text-2xl font-bold text-slate-950 font-mono block mt-1">
                {summary?.total_consumed_quota ?? 24}
                <span className="text-xs font-normal text-zinc-500 ml-1">次</span>
              </span>
            </div>

            <div className="shadcn-card p-5 bg-white/75 backdrop-blur-xl space-y-1 border border-white/85 shadow-glass rounded-xl">
              <span className="text-xs text-zinc-500 font-semibold block">实名赠送额度</span>
              <span className="text-2xl font-bold text-emerald-700 font-mono block mt-1">
                {isRealNameVerified ? 1 : 0}
                <span className="text-xs font-normal text-zinc-500 ml-1">次</span>
              </span>
            </div>
          </div>

          {/* 1 次尽调额度 = 1 份完整报告 看板 */}
          <div className="shadcn-card bg-white/75 backdrop-blur-xl p-6 space-y-5 border border-white/85 shadow-glass rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
                    透明计费说明
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">
                    消耗 1 次尽调额度 = 生成 1 份全景报告 (平台自研全维数据深度拟合计算)
                  </h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                  按报告份数结算，一次生成长期归档于您的【任务中心】中，后续在系统内随时复查、调阅底稿<strong>随时免费复查，绝无重复扣费</strong>。
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-5 shrink-0 font-mono">
                <span className="text-xs text-zinc-400 block line-through">市面独立采购成本: ¥498/家</span>
                <span className="text-xs font-bold text-slate-900 block mt-0.5">享宇AI智评 仅耗 1 次 (单份低至 ¥318)</span>
              </div>
            </div>

            {/* 多维数据体系 3 宫格拆解 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 bg-white/60 backdrop-blur-md rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>市监工商与股权治理</span>
                  <span className="text-zinc-400 font-mono text-[10px]">自研中台</span>
                </div>
                <p className="text-zinc-600 leading-relaxed text-[11px]">
                  市监照面登记、实缴出资到位率穿透、董监高治理、工商变更轨迹、股权出资与对外投资图谱。
                </p>
              </div>

              <div className="p-3.5 bg-white/60 backdrop-blur-md rounded-lg border border-slate-200 space-y-1 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>司法涉诉与合规监管</span>
                  <span className="text-zinc-400 font-mono text-[10px]">实时穿透</span>
                </div>
                <p className="text-zinc-600 leading-relaxed text-[11px]">
                  最高法涉诉案由审查、失信被执行人红线、限制高消费令、经营异常名录、动产抵质押。
                </p>
              </div>

              <div className="p-3.5 bg-cyan-50/40 backdrop-blur-md rounded-lg border border-cyan-100 space-y-1 shadow-2xs">
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>企业全景尽调报告</span>
                  <span className="text-[#0096DB] font-mono text-[10px]">享宇AI智评</span>
                </div>
                <p className="text-zinc-700 leading-relaxed text-[11px]">
                  集成全景大纲目录索引、深度尽调报告全文，支持在线高清沉浸式查阅与 A4 PDF 原件导出。
                </p>
              </div>
            </div>
          </div>

          {/* 赠送额度与充值机制说明 */}
          <div className="p-4 rounded-xl bg-white/60 backdrop-blur-md border border-white/80 flex items-start gap-3 text-xs text-slate-900 shadow-2xs">
            <Gift className="w-5 h-5 text-[#0096DB] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-bold text-sm text-slate-950">
                新用户注册并首次登录后，即刻获赠 1 次免费全景尽调体验额度 · 永久有效
              </div>
              <p className="text-zinc-500 leading-relaxed text-[11px]">
                新手机号首次登录成功后系统自动发放 1 次体验额度。消耗 1 次额度即可生成 1 份企业全景尽调报告，长期归档于任务中心随时调阅。
              </p>
            </div>
          </div>

          {/* 3 档商业化加油包 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#0096DB]" />
                选择尽调加油包套餐 (按次计费 · 永久有效)
              </h3>
              <span className="text-xs text-zinc-400 font-mono">TIERED PACKAGES</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => {
                const isPopular = pkg.id === 'pack_50' || pkg.id === 'pack_standard_10' || pkg.id === 'pack_10';
                return (
                  <div
                    key={pkg.id}
                    className={`shadcn-card bg-white/75 backdrop-blur-xl p-6 flex flex-col justify-between space-y-6 transition-all rounded-xl ${
                      isPopular
                        ? 'border-2 border-[#0096DB] shadow-md relative'
                        : 'border-white/85 hover:border-slate-300'
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-md text-[10px] font-bold bg-gradient-to-r from-[#0096DB] to-[#29B47D] text-white uppercase tracking-wider shadow-xs">
                        推荐档位
                      </span>
                    )}

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-bold text-base text-slate-950">{pkg.name}</h4>
                        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{pkg.desc || pkg.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-200 font-mono">
                        <div className="flex items-baseline gap-1">
                          <span className="text-sm font-bold text-slate-600">¥</span>
                          <span className="text-3xl font-extrabold text-slate-950">{pkg.price || pkg.price_cny}</span>
                          {(pkg.original_price || pkg.original_price_cny) && (
                            <span className="text-xs text-zinc-400 line-through ml-1.5">
                              ¥{pkg.original_price || pkg.original_price_cny}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-600 font-medium mt-0.5">
                          包含 {pkg.quota_points || pkg.quota_count} 次尽调额度
                        </div>
                      </div>

                      {pkg.features && (
                        <ul className="space-y-2 text-xs text-zinc-700 pt-3 border-t border-slate-200">
                          {pkg.features.map((feat, fIdx) => (
                            <li key={fIdx} className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleCreateOrder(pkg)}
                        className={`w-full py-2.5 text-xs font-semibold ${
                          isPopular ? 'shadcn-button-primary' : 'shadcn-button-outline'
                        }`}
                      >
                        立即充值
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 额度变动流水明细 */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="mt-6 space-y-4">
          <div className="shadcn-card bg-white p-6 space-y-4 border border-slate-300 shadow-xs">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-800" />
                额度变动账单与消耗明细
              </h3>
              <button
                type="button"
                onClick={fetchTransactions}
                className="shadcn-button-outline text-xs py-1 px-2.5"
              >
                刷新明细
              </button>
            </div>

            {loadingTx ? (
              <div className="text-center py-12 text-zinc-400 text-sm">正在加载变动流水...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-zinc-400 text-sm">暂无额度变动明细</div>
            ) : (
              <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-zinc-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] border-b-2 border-slate-300">
                    <tr>
                      <th className="py-3 px-4">流水号</th>
                      <th className="py-3 px-4">变动类型</th>
                      <th className="py-3 px-4">点数变动</th>
                      <th className="py-3 px-4">变动后结余</th>
                      <th className="py-3 px-4">关联合同/企业/任务</th>
                      <th className="py-3 px-4">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono text-zinc-500">{tx.tx_no || tx.id}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {tx.change_type === 'recharge' ? '🟢 购买充值' : (tx.change_type === 'consume' ? '🔴 尽调消耗' : '🎁 实名赠送')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold">
                          <span className={(tx.amount || tx.points_changed || tx.delta_quota) > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                            {(tx.amount || tx.points_changed || tx.delta_quota) > 0 ? `+${tx.amount || tx.points_changed || tx.delta_quota}` : (tx.amount || tx.points_changed || tx.delta_quota)} 次
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">{tx.balance_after || tx.after_balance} 次</td>
                        <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">{tx.remark}</td>
                        <td className="py-3 px-4 font-mono text-zinc-400">{tx.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 流水明细分页组件 */}
            {txTotal > 0 && (
              <div className="pt-2 flex items-center justify-between flex-wrap gap-4 border-t border-slate-200">
                <span className="text-xs text-slate-500 font-mono">
                  共计 <strong className="text-slate-800 font-semibold">{txTotal}</strong> 条额度变动流水记录
                </span>
                <Pagination
                  current={txPage}
                  pageSize={txPageSize}
                  total={txTotal}
                  showSizeChanger
                  pageSizeOptions={['10', '20', '50']}
                  onChange={(p, ps) => {
                    setTxPage(p);
                    setTxPageSize(ps);
                  }}
                  showQuickJumper
                  size="small"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* 支付模拟弹窗 (shadcn Dialog) */}
      <Modal
        open={payModalOpen}
        onCancel={() => setPayModalOpen(false)}
        footer={null}
        width={420}
        centered
        destroyOnClose
      >
        {payingOrder && (
          <div className="space-y-5 pt-1">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-950 tracking-tight">尽调额度充值收银台</h3>
              <p className="text-xs text-zinc-500 font-mono">
                订单编号: {payingOrder.order_no}
              </p>
            </div>

            <div className="bg-zinc-50 p-6 rounded-xl border border-slate-300 text-center space-y-3 shadow-2xs">
              <div className="w-40 h-40 mx-auto bg-white p-2 border border-slate-300 rounded-lg shadow-2xs flex items-center justify-center">
                <img src={payingOrder.pay_qrcode_url} alt="支付二维码" className="w-full h-full object-contain" />
              </div>
              <div className="font-mono">
                <span className="text-xs text-zinc-500 block">应付金额</span>
                <span className="text-2xl font-extrabold text-slate-950">¥{payingOrder.amount}</span>
                <p className="text-xs text-zinc-500 mt-0.5">{payingOrder.package_name} (+{payingOrder.quota_points} 次)</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleMockPaySuccess}
                disabled={isProcessingPay}
                className="shadcn-button-primary w-full py-2.5 text-xs font-semibold shadow-xs"
              >
                {isProcessingPay ? '正在结算入账...' : '⚡ 模拟微信扫码支付成功 (开发测试通道)'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
