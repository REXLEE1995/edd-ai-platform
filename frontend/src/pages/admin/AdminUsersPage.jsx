import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  KeyRound, 
  Clock, 
  Zap, 
  CreditCard
} from 'lucide-react';
import { message, Drawer, Modal, Pagination } from 'antd';
import apiClient from '../../api/client';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const fetchUsers = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      let url = `/admin/users/list?page=${p}&page_size=${ps}`;
      if (keyword) url += `&keyword=${encodeURIComponent(keyword.trim())}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      const res = await apiClient.get(url);
      setUsers(res.data?.items || res.items || []);
      setTotal(res.data?.total || res.total || 0);
    } catch (err) {
      console.error(err);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page, pageSize);
  }, [page, pageSize, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers(1, pageSize);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2 tracking-tight">
            <Users className="w-5 h-5 text-slate-800" />
            注册用户全景管理
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            查看用户画像与资产、调阅历史尽调任务、精准控制额度与账号状态管控
          </p>
        </div>

        <div className="text-xs text-zinc-500">
          共收录注册用户: <strong className="text-slate-950 font-mono text-sm font-bold">{total}</strong> 名
        </div>
      </div>

      {/* 检索过滤栏 */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadcn-card bg-white p-3 border border-zinc-200">
        <form onSubmit={handleSearch} className="flex items-center w-full sm:w-80 bg-white rounded-md px-3 py-2 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
          <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索手机号、企业主体、UID..."
            className="w-full bg-transparent border-0 text-xs text-slate-900 placeholder:text-zinc-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-500 shrink-0 font-medium">账号状态:</span>
          <div className="bg-zinc-100 p-1 rounded-lg flex items-center gap-1 border border-zinc-200/80">
            {['', 'active', 'frozen'].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-950 font-semibold shadow-xs'
                    : 'text-zinc-600 hover:text-slate-900'
                }`}
              >
                {st === '' ? '全部' : (st === 'active' ? '正常' : '已冻结')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 用户列表表格 */}
      <div className="mt-6 shadcn-card bg-white border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200 font-semibold tracking-wider">
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
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-400">正在加载用户数据...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-400">未找到符合条件的用户</td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-950 font-mono">{u.phone}</div>
                      <div className="text-[10px] text-zinc-400 font-mono">{u.id}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900">
                        {u.is_real_name_verified !== false ? '个人实名用户' : '普通注册用户'}
                      </div>
                      <div className="flex gap-1 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                          u.is_real_name_verified !== false 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold' 
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {u.is_real_name_verified !== false ? '公安实名通过' : '未实名'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      <span className="text-base font-bold text-slate-950">{u.balance_quota}</span>
                      <span className="text-[11px] text-zinc-500 ml-1">次</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-600">
                      <div>充值: <strong className="text-slate-900">+{u.total_recharge_quota}</strong></div>
                      <div>消耗: <strong className="text-zinc-500">-{u.total_consumed_quota}</strong></div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        u.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}>
                        {u.status === 'active' ? '正常运行' : '已被冻结'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-zinc-500">
                      {u.created_at}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(u.id)}
                        className="shadcn-button-outline text-xs py-1 px-2.5"
                      >
                        详情
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustModal(u)}
                        className="shadcn-button-primary text-xs py-1 px-2.5"
                      >
                        调额
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFreeze(u.id, u.status)}
                        className="shadcn-button-outline text-xs py-1 px-2.5 text-rose-700 hover:bg-rose-50"
                      >
                        {u.status === 'active' ? '冻结' : '解冻'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 用户列表分页换页条 */}
        {total > 0 && (
          <div className="p-3.5 border-t border-zinc-200 flex items-center justify-between flex-wrap gap-4 bg-zinc-50/40">
            <span className="text-xs text-zinc-500 font-mono">
              共计 <strong className="text-slate-900 font-semibold">{total}</strong> 位注册用户
            </span>
            <Pagination
              current={page}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={['10', '20', '50']}
              onChange={(p, ps) => {
                setPage(p);
                setPageSize(ps);
              }}
              showQuickJumper
              size="small"
            />
          </div>
        )}
      </div>

      {/* 调额弹窗 (shadcn Dialog) */}
      <Modal
        open={adjustModalOpen}
        onCancel={() => setAdjustModalOpen(false)}
        footer={null}
        width={480}
        centered
        destroyOnClose
      >
        {adjustingUser && (
          <div className="space-y-4 pt-1">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-950 tracking-tight">人工精准调额</h3>
              <p className="text-xs text-zinc-500">
                目标账号: <strong className="font-mono text-slate-900">{adjustingUser.phone}</strong> (当前结余: {adjustingUser.balance_quota} 次)
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-slate-700">调额方向</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustType('add')}
                    className={`py-2 rounded-md font-semibold border transition-all ${
                      adjustType === 'add' ? 'bg-[#29B47D] text-white border-[#29B47D] shadow-xs' : 'bg-white text-slate-700 border-zinc-200'
                    }`}
                  >
                    增加额度 (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustType('deduct')}
                    className={`py-2 rounded-md font-semibold border transition-all ${
                      adjustType === 'deduct' ? 'bg-rose-600 text-white border-rose-600 shadow-xs' : 'bg-white text-slate-700 border-zinc-200'
                    }`}
                  >
                    扣减额度 (-)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">变动点数 (次)</label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-md focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 text-xs font-mono font-bold"
                  min={1}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-slate-700">调额背景及原因</label>
                <textarea
                  rows={3}
                  value={adjustRemark}
                  onChange={(e) => setAdjustRemark(e.target.value)}
                  placeholder="请详细说明调额背景（如：对公汇款核销、客诉补偿）..."
                  className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-md focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 text-xs"
                />
              </div>

              <button
                type="button"
                disabled={submittingAdjust}
                onClick={handleSubmitAdjust}
                className="shadcn-button-primary w-full py-2.5 text-xs font-semibold mt-2"
              >
                {submittingAdjust ? '提交调额事务中...' : '确认执行调额'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 用户 360° 详情抽屉 (shadcn Sheet) */}
      <Drawer
        open={detailDrawerOpen}
        onClose={() => setDetailDrawerOpen(false)}
        width={540}
        title={
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="w-4 h-4 text-slate-800" />
            用户 360° 全景资产与画像
          </div>
        }
      >
        {selectedUserDetail && (
          <div className="space-y-6 text-xs text-slate-900">
            <div className="shadcn-card bg-zinc-50 p-4 space-y-2 border border-zinc-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-950">{selectedUserDetail.user.phone}</span>
                <span className="shadcn-badge-secondary">{selectedUserDetail.user.id}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-zinc-600">
                <div>可用额度: <strong className="text-slate-950 font-mono">{selectedUserDetail.user.balance_quota} 次</strong></div>
                <div>累计充值: <strong className="text-slate-950 font-mono">{selectedUserDetail.user.total_recharge_quota} 次</strong></div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">历史尽调任务 ({selectedUserDetail.tasks?.length || 0})</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {selectedUserDetail.tasks?.map((t) => (
                  <div key={t.id} className="p-3 bg-white border border-zinc-200 rounded-lg space-y-1">
                    <div className="font-semibold text-slate-950">{t.company_name}</div>
                    <div className="flex justify-between text-zinc-500 font-mono text-[11px]">
                      <span>状态: {t.status}</span>
                      <span>{t.created_at}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Drawer>

    </div>
  );
}
