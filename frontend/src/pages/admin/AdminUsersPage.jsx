import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  KeyRound, 
  Clock, 
  FileText, 
  Zap, 
  ArrowRight, 
  CreditCard, 
  Building, 
  Tag
} from 'lucide-react';
import { message, Drawer, Modal, Input, Select } from 'antd';
import apiClient from '../../api/client';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // 用户 360° 详情抽屉
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 人工调额弹窗
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustingUser, setAdjustingUser] = useState(null);
  const [adjustType, setAdjustType] = useState('add');
  const [adjustAmount, setAdjustAmount] = useState(10);
  const [adjustReasonCategory, setAdjustReasonCategory] = useState('offline_payment');
  const [adjustProofNo, setAdjustProofNo] = useState('');
  const [adjustRemark, setAdjustRemark] = useState('');
  const [submittingAdjust, setSubmittingAdjust] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      let url = `/admin/users/list?page=${page}&page_size=10`;
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      const res = await apiClient.get(url);
      setUsers(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleOpenDetail = async (userId) => {
    setLoadingDetail(true);
    setDetailDrawerOpen(true);
    try {
      const res = await apiClient.get(`/admin/users/${userId}/detail`);
      setSelectedUserDetail(res.data);
    } catch (err) {
      message.error('获取用户详情失败');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleToggleFreeze = async (userId, currentStatus) => {
    const nextStatus = currentStatus === 'frozen' ? 'active' : 'frozen';
    try {
      await apiClient.post(`/admin/users/${userId}/status`, {
        status: nextStatus,
        remark: nextStatus === 'frozen' ? '管理员手动冻结账户' : '管理员解除冻结'
      });
      message.success(`用户已成功${nextStatus === 'frozen' ? '冻结' : '解冻'}`);
      fetchUsers();
      if (selectedUserDetail) {
        handleOpenDetail(userId);
      }
    } catch (err) {
      message.error('操作失败');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      const res = await apiClient.post(`/admin/users/${userId}/reset-password`, {
        new_password: 'Password@2026'
      });
      message.success(res.message || '密码重置成功');
    } catch (err) {
      message.error('重置密码失败');
    }
  };

  const handleOpenAdjustModal = (user) => {
    setAdjustingUser(user);
    setAdjustType('add');
    setAdjustAmount(10);
    setAdjustReasonCategory('offline_payment');
    setAdjustProofNo('');
    setAdjustRemark('');
    setAdjustModalOpen(true);
  };

  const handleSubmitAdjust = async () => {
    if (!adjustingUser) return;
    if (adjustAmount <= 0) {
      message.warning('请输入大于0的变动额度');
      return;
    }
    if (!adjustRemark || adjustRemark.length < 5) {
      message.warning('请至少填写5个字的详细调额背景与原因说明');
      return;
    }

    setSubmittingAdjust(true);
    try {
      const res = await apiClient.post('/admin/quota/adjust', {
        user_id: adjustingUser.id,
        adjust_type: adjustType,
        amount: Number(adjustAmount),
        reason_category: adjustReasonCategory,
        proof_no: adjustProofNo,
        remark: adjustRemark
      });
      message.success(res.message || '额度调控完成！');
      setAdjustModalOpen(false);
      fetchUsers();
      if (selectedUserDetail) {
        handleOpenDetail(adjustingUser.id);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || '调额失败');
    } finally {
      setSubmittingAdjust(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
            <Users className="w-6 h-6 text-sky-700" />
            注册用户全景管理
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            查看用户画像与资产、调阅历史尽调任务、精准控制额度与账号状态管控
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          共收录注册用户: <strong className="text-slate-900 font-mono text-sm font-bold">{total}</strong> 名
        </div>
      </div>

      {/* 检索过滤栏 */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-sm p-3 border border-slate-300 shadow-2xs">
        <form onSubmit={handleSearch} className="flex items-center w-full sm:w-80 bg-slate-50 rounded-sm px-3 py-2 border border-slate-200 focus-within:border-sky-500 focus-within:bg-white">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索手机号、企业主体、UID..."
            className="w-full bg-transparent border-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 shrink-0 font-medium">账号状态:</span>
          {['', 'active', 'frozen'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-sm text-xs font-bold border transition-all ${
                statusFilter === st
                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {st === '' ? '全部' : (st === 'active' ? '正常' : '已冻结')}
            </button>
          ))}
        </div>
      </div>

      {/* 用户列表表格 */}
      <div className="mt-6 bg-white rounded-sm border border-slate-300 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">用户主体 / 手机号</th>
                <th className="py-3 px-4">认证状态 / 属性</th>
                <th className="py-3 px-4">当前可用额度</th>
                <th className="py-3 px-4">充值 / 消耗</th>
                <th className="py-3 px-4">账号状态</th>
                <th className="py-3 px-4">注册时间</th>
                <th className="py-3 px-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">正在加载用户数据...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">未找到符合条件的用户</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 font-mono">{u.phone}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800">
                        {u.is_real_name_verified !== false ? '个人实名用户' : '普通注册用户'}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-xs border ${
                          u.is_real_name_verified !== false 
                            ? 'bg-teal-50 text-teal-800 border-teal-300 font-semibold' 
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {u.is_real_name_verified !== false ? '公安实名通过' : '未实名'}
                        </span>
                        {u.tags?.map((t, tidx) => (
                          <span key={tidx} className="text-[9px] px-1.5 py-0.2 rounded-xs bg-slate-100 text-slate-600 border border-slate-200">
                            {t}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-sm font-extrabold text-sky-700">{u.balance_quota}</span>
                      <span className="text-[10px] text-slate-500 ml-1">次</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500">
                      <div>充: <strong className="text-teal-700 font-mono font-semibold">+{u.total_recharge_quota}</strong></div>
                      <div>耗: <strong className="text-slate-700 font-mono font-semibold">{u.total_consumed_quota}</strong></div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                        u.status === 'active' 
                          ? 'bg-teal-50 text-teal-800 border border-teal-300' 
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {u.status === 'active' ? '正常' : '已冻结'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">{u.created_at}</td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenDetail(u.id)}
                        className="px-2.5 py-1 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold transition-all shadow-2xs"
                      >
                        详情画像
                      </button>
                      <button
                        onClick={() => handleOpenAdjustModal(u)}
                        className="px-2.5 py-1 rounded-sm bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold transition-all shadow-2xs"
                      >
                        调额
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 用户 360° 详情抽屉 */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={720}
        title={
          <span className="text-slate-900 font-extrabold flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-700" />
            用户 360° 全景画像与管控
          </span>
        }
      >
        {selectedUserDetail && (
          <div className="space-y-6 text-xs text-slate-700 pb-8">
            
            {/* 1. 基础档案卡 */}
            <div className="p-4 rounded-sm bg-slate-50 border border-slate-300 space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900 font-mono">{selectedUserDetail.profile.phone}</span>
                <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                  selectedUserDetail.profile.status === 'active' ? 'bg-teal-50 text-teal-800 border border-teal-300' : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {selectedUserDetail.profile.status === 'active' ? '正常在用' : '已冻结'}
                </span>
              </div>
              <p className="text-slate-500">UID: <span className="font-mono text-slate-800 font-semibold">{selectedUserDetail.profile.id}</span></p>
              <p className="text-slate-500">实名核验: <span className="text-slate-800 font-semibold">{selectedUserDetail.profile.is_real_name_verified !== false ? '已通过公安个人实名认证 (赠送1次额度)' : '未实名认证'}</span></p>
              <p className="text-slate-500">注册时间: <span className="text-slate-800 font-mono">{selectedUserDetail.profile.created_at}</span></p>
            </div>

            {/* 2. 额度资产卡片 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-sm bg-sky-50 border border-sky-300 text-center shadow-2xs">
                <span className="text-slate-500 block text-[11px] font-medium">当前可用额度</span>
                <span className="text-2xl font-extrabold text-sky-800 font-mono mt-1 block">
                  {selectedUserDetail.profile.balance_quota} <span className="text-xs font-normal text-slate-400">次</span>
                </span>
              </div>
              <div className="p-3.5 rounded-sm bg-slate-50 border border-slate-300 text-center shadow-2xs">
                <span className="text-slate-500 block text-[11px] font-medium">累计充值额度</span>
                <span className="text-xl font-extrabold text-slate-800 font-mono mt-1 block">
                  {selectedUserDetail.profile.total_recharge_quota} 次
                </span>
              </div>
              <div className="p-3.5 rounded-sm bg-slate-50 border border-slate-300 text-center shadow-2xs">
                <span className="text-slate-500 block text-[11px] font-medium">累计尽调消耗</span>
                <span className="text-xl font-extrabold text-slate-800 font-mono mt-1 block">
                  {selectedUserDetail.profile.total_consumed_quota} 次
                </span>
              </div>
            </div>

            {/* 3. 快捷状态管控操作栏 */}
            <div className="p-4 rounded-sm bg-slate-50 border border-slate-300 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleFreeze(selectedUserDetail.profile.id, selectedUserDetail.profile.status)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                    selectedUserDetail.profile.status === 'active'
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-300'
                  }`}
                >
                  {selectedUserDetail.profile.status === 'active' ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                  {selectedUserDetail.profile.status === 'active' ? '一键冻结账户' : '一键解除冻结'}
                </button>

                <button
                  onClick={() => handleResetPassword(selectedUserDetail.profile.id)}
                  className="px-3 py-1.5 rounded-sm bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  重置密码
                </button>
              </div>

              <button
                onClick={() => handleOpenAdjustModal(selectedUserDetail.profile)}
                className="px-3.5 py-1.5 rounded-sm bg-sky-700 text-white hover:bg-sky-800 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5" />
                手动调额
              </button>
            </div>

            {/* 4. 该用户关联发起的尽调任务 */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-sky-700" />
                该用户发起的尽调任务 ({selectedUserDetail.tasks?.length || 0})
              </h4>
              <div className="space-y-2">
                {selectedUserDetail.tasks?.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-sm border border-slate-200 text-center text-slate-400">暂无任务记录</div>
                ) : (
                  selectedUserDetail.tasks.map((t) => (
                    <div key={t.id} className="p-3 rounded-sm bg-white border border-slate-300 flex items-center justify-between shadow-2xs">
                      <div>
                        <div className="font-bold text-slate-900">{t.company_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {t.task_no} · {t.created_at}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-xs font-bold bg-teal-50 text-teal-800 border border-teal-300">
                        {t.status === 'completed' ? '已生成报告' : t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5. 最近额度变动流水 */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-teal-700" />
                最近额度变动流水 (前10条)
              </h4>
              <div className="space-y-1.5">
                {selectedUserDetail.recent_transactions?.map((tx) => (
                  <div key={tx.id} className="p-2.5 rounded-sm bg-white border border-slate-300 text-[11px] flex items-center justify-between shadow-2xs">
                    <div>
                      <span className="text-slate-800 font-semibold">{tx.remark}</span>
                      <span className="text-slate-400 ml-2 font-mono">[{tx.operator_name}]</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-teal-700' : 'text-rose-600'}`}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </span>
                      <span className="text-slate-500 font-mono">({tx.balance_after}次)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </Drawer>

      {/* 人工调额弹窗 */}
      <Modal
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        footer={null}
        title={
          <span className="text-slate-900 font-bold flex items-center gap-2">
            <Zap className="w-4 h-4 text-sky-700" />
            管理员人工精准调额 (带凭证审计)
          </span>
        }
      >
        {adjustingUser && (
          <div className="py-4 space-y-4 text-xs text-slate-700">
            <div className="p-3 rounded-sm bg-slate-50 border border-slate-300 flex justify-between items-center shadow-2xs">
              <div>
                <span className="text-slate-500 block font-medium">调额目标用户:</span>
                <span className="text-sm font-bold text-slate-900 font-mono">{adjustingUser.phone}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block font-medium">当前可用额度:</span>
                <span className="text-base font-extrabold text-sky-700 font-mono">{adjustingUser.balance_quota} 次</span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">调额方式</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'add', label: '增加额度 (+)' },
                  { key: 'sub', label: '核减额度 (-)' },
                  { key: 'set', label: '重置为指定值 (=)' }
                ].map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setAdjustType(m.key)}
                    className={`py-2 rounded-sm font-bold border transition-all ${
                      adjustType === m.key
                        ? 'bg-sky-50 text-sky-800 border-sky-300'
                        : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">变动数值 (点数/次)</label>
              <input
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                className="w-full bg-slate-50 rounded-sm px-3 py-2 border border-slate-300 text-sm text-slate-900 font-mono focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">调额原因分类 (必选)</label>
              <select
                value={adjustReasonCategory}
                onChange={(e) => setAdjustReasonCategory(e.target.value)}
                className="w-full bg-slate-50 rounded-sm px-3 py-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
              >
                <option value="offline_payment">线下对公打款入账</option>
                <option value="business_gift">商务大客户合作赠送</option>
                <option value="customer_compensation">系统异常客诉补偿</option>
                <option value="manual_correction">误操作调账核减</option>
                <option value="internal_test">内部联调测试</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">关联打款流水号 / 合同号凭证 (选填)</label>
              <input
                type="text"
                value={adjustProofNo}
                onChange={(e) => setAdjustProofNo(e.target.value)}
                placeholder="如银行回单号：招行99882312、合同编号"
                className="w-full bg-slate-50 rounded-sm px-3 py-2 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">详细调额背景与说明 (不少于5字)</label>
              <textarea
                rows="3"
                value={adjustRemark}
                onChange={(e) => setAdjustRemark(e.target.value)}
                placeholder="请详述本次人工调额的原因背景..."
                className="w-full bg-slate-50 rounded-sm p-3 border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
              />
            </div>

            <div className="pt-3">
              <button
                onClick={handleSubmitAdjust}
                disabled={submittingAdjust}
                className="w-full py-2.5 rounded-sm bg-sky-700 hover:bg-sky-800 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50"
              >
                {submittingAdjust ? '提交审核调额中...' : '确认执行人工调额'}
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
