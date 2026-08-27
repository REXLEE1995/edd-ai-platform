import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { 
  User, 
  CreditCard, 
  FileText, 
  Receipt, 
  Building, 
  ShieldCheck, 
  Lock, 
  Save, 
  Sparkles, 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  QrCode,
  ArrowRight,
  Phone,
  Gift,
  HelpCircle
} from 'lucide-react';
import { message, Modal } from 'antd';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function UserCenterPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, refreshUserProfile, userLogout } = useAuth();

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
      const res = await apiClient.post('/v1/auth/change-password', {
        new_password: newPassword
      });
      message.success(res.message || '密码修改成功，请妥善保管！');
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
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [payingOrder, setPayingOrder] = useState(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [isProcessingPay, setIsProcessingPay] = useState(false);

  // 3. 流水数据
  const [transactions, setTransactions] = useState([]);
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

  const fetchTransactions = async () => {
    setLoadingTx(true);
    try {
      const res = await apiClient.get('/v1/billing/transactions');
      setTransactions(res.data || []);
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
    setSelectedPkg(pkg);
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800">
      
      {/* 头部个人基本信息卡片 */}
      <div className="bg-white rounded-sm border border-slate-300 shadow-2xs p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className={`w-14 h-14 rounded-sm text-white flex items-center justify-center font-extrabold text-2xl shadow-2xs transition-colors ${
            isRealNameVerified ? 'bg-sky-700' : 'bg-slate-500'
          }`}>
            {isRealNameVerified ? (userName?.[0] || '雄') : '未'}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-extrabold text-slate-900">
                {isRealNameVerified ? (userName || '大雄') : '未实名用户'}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">
                {isRealNameVerified ? '个人实名用户' : '个人普通用户'}
              </span>
              {isRealNameVerified ? (
                <span className="text-xs px-2.5 py-0.5 rounded-xs font-semibold bg-teal-50 text-teal-800 border border-teal-300 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                  实名认证已通过
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  未实名认证
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {user?.phone || '13800138000'}</span>
              <span>实名认证: {isRealNameVerified ? <strong className="text-slate-700">440301********1234 (已核验)</strong> : <strong className="text-amber-700">待完成公安实名核身</strong>}</span>
              <span>注册时间: <strong className="text-slate-700 font-mono">2026-08-27</strong></span>
            </div>
          </div>
        </div>

        {/* 快捷额度卡 */}
        <div className="flex items-center gap-4 bg-slate-50 p-3.5 rounded-sm border border-slate-300 self-start md:self-auto">
          <div className="text-right">
            <span className="text-xs text-slate-500 block font-medium">可用尽调额度</span>
            <span className="text-2xl font-extrabold text-sky-800 font-mono leading-none">
              {isRealNameVerified ? (user?.balance_quota ?? 57) : Math.max(0, (user?.balance_quota ?? 57) - 1)} <span className="text-xs font-normal text-slate-500">次</span>
            </span>
          </div>
          <button
            onClick={() => switchTab('billing')}
            className="px-3.5 py-2 rounded-sm bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5" />
            购买加油包
          </button>
        </div>
      </div>

      {/* Tab 导航栏 */}
      <div className="mt-6 flex border-b border-slate-300 space-x-2 sm:space-x-4">
        <button
          onClick={() => switchTab('profile')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-sky-700 text-sky-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <User className="w-4 h-4 text-sky-700" />
          <span>个人资料与实名认证</span>
        </button>

        <button
          onClick={() => switchTab('billing')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'billing'
              ? 'border-sky-700 text-sky-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Zap className="w-4 h-4 text-sky-700" />
          <span>尽调额度加油包</span>
        </button>

        <button
          onClick={() => switchTab('transactions')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'transactions'
              ? 'border-sky-700 text-sky-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Receipt className="w-4 h-4 text-sky-700" />
          <span>额度变动流水明细</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. 个人资料与实名认证设置 */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="mt-6 space-y-6">
          
          <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-700" />
                个人实名认证与账户资料
              </h3>
              {isRealNameVerified ? (
                <span className="text-xs text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded-xs border border-teal-300">
                  个人公安实名已核身
                </span>
              ) : (
                <span className="text-xs text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-xs border border-amber-300">
                  未完成实名认证 (不可发起尽调)
                </span>
              )}
            </div>

            <form onSubmit={isRealNameVerified ? handleSaveProfile : handleVerifyRealName} className="space-y-4 max-w-2xl text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">真实姓名</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="请输入您的真实姓名..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm focus:bg-white focus:border-sky-600 focus:outline-none text-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">登录手机号 (不可变更)</label>
                <input
                  type="text"
                  disabled
                  value={user?.phone || '13800138000'}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-sm text-slate-500 font-mono text-xs cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">证件类型</label>
                <input
                  type="text"
                  disabled
                  value="居民身份证"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-sm text-slate-500 text-xs cursor-not-allowed font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {isRealNameVerified ? '实名身份证号码 (已通过公安核验)' : '身份证号码 (18位居民身份证)'}
                </label>
                <input
                  type="text"
                  disabled={isRealNameVerified}
                  value={isRealNameVerified ? '440301********1234' : idCardNumber}
                  onChange={(e) => setIdCardNumber(e.target.value)}
                  placeholder="请输入18位居民身份证号码..."
                  className={`w-full px-3 py-2 border border-slate-300 rounded-sm font-mono text-xs ${
                    isRealNameVerified ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50 focus:bg-white focus:border-sky-600'
                  }`}
                />
              </div>

              {isRealNameVerified ? (
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-sm text-teal-900 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">实名认证权益已生效：</p>
                    <p className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
                      您已完成个人实名核验，享有平台全部企业全景尽调发起、报告查阅与 PDF 原件下载权限（实名认证已获赠 1 次全景尽调额度）。
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-sm text-amber-950 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">⚠️ 尚未完成实名认证提示：</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
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
                      className="px-5 py-2 rounded-sm bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {savingProfile ? '正在保存...' : '保存个人资料'}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelRealName}
                      className="px-4 py-2 rounded-sm bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="点击模拟未实名认证状态，便于测试未认证场景"
                    >
                      <XCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>取消实名认证 (模拟未认证)</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-sm bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-white" />
                    <span>立即提交公安实名认证 (立领 1 次免费额度)</span>
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* 安全与登录密码修改 */}
          <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Lock className="w-4 h-4 text-sky-700" />
                账户登录密码安全
              </h3>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4 max-w-2xl text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">新登录密码 (不少于6位)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm focus:bg-white focus:border-sky-600 focus:outline-none text-slate-800 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">确认新密码</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-sm focus:bg-white focus:border-sky-600 focus:outline-none text-slate-800 text-xs font-mono"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={changingPwd}
                  className="px-5 py-2 rounded-sm bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-2xs transition-colors"
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
          
          {/* 额度 4 宫格概览 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-sm border border-slate-300 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">当前可用尽调额度</span>
              <span className="text-3xl font-extrabold text-sky-800 font-mono mt-1 block">
                {isRealNameVerified ? (user?.balance_quota ?? 57) : Math.max(0, (user?.balance_quota ?? 57) - 1)}
                <span className="text-xs font-normal text-slate-500 ml-1">次</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-sm border border-slate-300 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">累计购买充值额度</span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono mt-1 block">
                {summary?.total_recharge_quota ?? 80}
                <span className="text-xs font-normal text-slate-500 ml-1">次</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-sm border border-slate-300 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">累计已消耗尽调</span>
              <span className="text-2xl font-extrabold text-slate-700 font-mono mt-1 block">
                {summary?.total_consumed_quota ?? 24}
                <span className="text-xs font-normal text-slate-500 ml-1">次</span>
              </span>
            </div>

            <div className="bg-white p-5 rounded-sm border border-slate-300 shadow-2xs">
              <span className="text-xs text-slate-500 font-semibold block">实名赠送额度</span>
              <span className="text-2xl font-extrabold text-teal-700 font-mono mt-1 block">
                {isRealNameVerified ? 1 : 0}
                <span className="text-xs font-normal text-slate-500 ml-1">次</span>
              </span>
            </div>
          </div>

          {/* 1 次尽调额度 = 1 份完整报告 与 多维核心数据中台价值拆解看板 */}
          <div className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-xs text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-300">
                    透明计费说明
                  </span>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    消耗 1 次尽调额度 = 生成 1 份终身有效报告 (享宇全景尽调引擎深度拟合多源数据)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  按报告份数结算，一次生成永久归档于您的【任务中心】中，后续在系统内随时复查、调阅底稿<strong>终身免费，绝无重复扣费</strong>。
                </p>
              </div>

              <div className="text-right sm:border-l sm:border-slate-200 sm:pl-5 shrink-0 font-mono">
                <span className="text-xs text-slate-400 block line-through">市面独立采购/律所尽调: ¥800~1500/家</span>
                <span className="text-xs font-extrabold text-teal-700 block mt-0.5">享宇智评仅耗 1 次 (低至 ¥318/份)</span>
              </div>
            </div>

            {/* 多维数据体系 3 宫格拆解 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span className="text-sky-800">市监工商与股权治理</span>
                  <span className="text-slate-400 font-mono text-[10px]">官方中台</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  市监照面登记、实缴出资到位率穿透、董监高治理、工商变更轨迹、股权出资与对外投资图谱。
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span className="text-rose-800">司法涉诉与合规监管</span>
                  <span className="text-slate-400 font-mono text-[10px]">实时穿透</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  最高法涉诉案由审查、失信被执行人红线、限制高消费令、经营异常名录、动产抵质押。
                </p>
              </div>

              <div className="p-3 bg-sky-50/70 rounded-sm border border-sky-200 space-y-1">
                <div className="font-extrabold text-slate-900 flex items-center justify-between">
                  <span className="text-sky-900">企业全景尽调报告</span>
                  <span className="text-sky-700 font-mono text-[10px]">享宇智评</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  集成全景大纲目录索引、深度尽调报告全文，支持在线高清沉浸式查阅与 A4 PDF 原件导出。
                </p>
              </div>
            </div>
          </div>

          {/* 赠送额度与充值机制说明 */}
          <div className="p-4 rounded-sm bg-sky-50/80 border border-sky-300 flex items-start gap-3 text-xs text-sky-950">
            <Gift className="w-5 h-5 text-sky-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-sm text-sky-900">
                个人注册并完成实名认证后，即刻获赠 1 次免费全景尽调额度 · 永久有效
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                根据监管要求，<strong>仅完成个人实名核验后才会发放 1 次体验额度（普通注册/登录不赠送额度）</strong>。消耗 1 次额度即可生成 1 份终身有效的企业全景尽调报告。
              </p>
            </div>
          </div>

          {/* 3 档商业化加油包 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-sky-700" />
                选择尽调加油包套餐 (按次计费 · 永久有效)
              </h3>
              <span className="text-xs text-slate-400 font-mono">TIERED PACKAGES</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-sm p-5 border flex flex-col justify-between transition-colors relative shadow-2xs ${
                    pkg.id === 'pack_standard_10'
                      ? 'border-sky-700 ring-1 ring-sky-700'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {pkg.tag && (
                    <span className="absolute top-0 right-0 bg-sky-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-sm">
                      {pkg.tag}
                    </span>
                  )}

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-extrabold text-base text-slate-900">{pkg.name}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{pkg.desc}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 font-mono">
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold text-slate-500">¥</span>
                        <span className="text-3xl font-extrabold text-slate-900">{pkg.price}</span>
                        <span className="text-xs text-slate-400 line-through ml-1">¥{pkg.original_price}</span>
                      </div>
                      <div className="text-xs text-sky-800 font-semibold mt-0.5">
                        包含 {pkg.quota_points} 次尽调额度
                      </div>
                    </div>

                    {pkg.features && (
                      <ul className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                        {pkg.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleCreateOrder(pkg)}
                      className={`w-full py-2 rounded-sm text-xs font-bold transition-colors shadow-2xs ${
                        pkg.id === 'pack_standard_10'
                          ? 'bg-sky-700 hover:bg-sky-800 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      }`}
                    >
                      立即充值
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. 额度变动流水明细 */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="mt-6 space-y-4">
          <div className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs space-y-4">
            <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-sky-700" />
                额度变动账单与消耗明细
              </h3>
              <button
                onClick={fetchTransactions}
                className="text-xs text-sky-700 hover:text-sky-900 font-semibold"
              >
                刷新明细
              </button>
            </div>

            {loadingTx ? (
              <div className="text-center py-12 text-slate-400 text-sm">正在加载变动流水...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">暂无额度变动明细</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-sm">
                <table className="w-full text-xs text-left divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">流水号</th>
                      <th className="py-2.5 px-3">变动类型</th>
                      <th className="py-2.5 px-3">点数变动</th>
                      <th className="py-2.5 px-3">变动后结余</th>
                      <th className="py-2.5 px-3">关联合同/企业/任务</th>
                      <th className="py-2.5 px-3">时间</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-slate-500">{tx.id}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {tx.change_type === 'recharge' ? '🟢 购买充值' : (tx.change_type === 'consume' ? '🔴 尽调消耗' : '🎁 实名赠送')}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-extrabold">
                          <span className={tx.points_changed > 0 ? 'text-teal-700' : 'text-rose-700'}>
                            {tx.points_changed > 0 ? `+${tx.points_changed}` : tx.points_changed} 次
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{tx.balance_after} 次</td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-xs truncate">{tx.remark}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-400">{tx.created_at}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 支付模拟弹窗 */}
      <Modal
        open={payModalOpen}
        onCancel={() => setPayModalOpen(false)}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <QrCode className="w-4 h-4 text-sky-700" />
            尽调额度充值收银台
          </div>
        }
        width={420}
      >
        {payingOrder && (
          <div className="py-4 text-center space-y-4 text-slate-800">
            <div>
              <span className="text-xs text-slate-500 block font-medium">应付金额</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-sm font-bold text-slate-900">¥</span>
                <span className="text-3xl font-extrabold text-slate-900 font-mono">{payingOrder.amount}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{payingOrder.package_name} (+{payingOrder.quota_points} 次)</p>
            </div>

            <div className="p-3 inline-block bg-white border border-slate-300 rounded-sm shadow-2xs">
              <img src={payingOrder.pay_qrcode_url} alt="支付二维码" className="w-40 h-40 mx-auto" />
            </div>

            <div className="text-xs text-slate-500 font-mono">
              订单编号: {payingOrder.order_no}
            </div>

            <div className="pt-2">
              <button
                onClick={handleMockPaySuccess}
                disabled={isProcessingPay}
                className="w-full py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-sm shadow-2xs transition-colors"
              >
                {isProcessingPay ? '正在结算入账...' : '⚡ 模拟微信扫码支付成功'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
