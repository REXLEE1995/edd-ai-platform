import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Zap, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  QrCode, 
  ShieldCheck, 
  Sparkles, 
  Receipt
} from 'lucide-react';
import { message, Modal } from 'antd';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function UserBillingPage() {
  const { user, refreshUserProfile } = useAuth();
  const [packages, setPackages] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);

  const fetchData = async () => {
    try {
      const [pkgRes, txRes] = await Promise.all([
        apiClient.get('/v1/billing/packages'),
        apiClient.get('/v1/billing/transactions')
      ]);
      setPackages(pkgRes.data || []);
      setTransactions(txRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateOrder = async (pkgId) => {
    setSubmittingOrder(true);
    try {
      const res = await apiClient.post('/v1/billing/orders/create', {
        package_id: pkgId,
        pay_type: 'wechat'
      });
      if (res.code === 0) {
        setCurrentOrder(res.data);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || '创建订单失败');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleMockPay = async () => {
    if (!currentOrder) return;
    try {
      const res = await apiClient.post(`/v1/billing/orders/${currentOrder.order_id}/mock-pay`);
      message.success(res.message || '充值成功！');
      setCurrentOrder(null);
      await refreshUserProfile();
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.detail || '支付失败');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800">
      
      {/* 头部标题 */}
      <div className="pb-6 border-b border-slate-300">
        <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-sky-700" />
          尽调额度充值与资产中心
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          管理可用尽调额度、在线购买加油包、查看消耗流水与对公专票申请
        </p>
      </div>

      {/* 1. 额度资产看板 */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-sm p-4 border border-sky-300 shadow-2xs bg-sky-50/40">
          <div className="flex items-center justify-between text-xs text-sky-800 font-bold">
            <span>当前可用额度</span>
            <Zap className="w-4 h-4 text-sky-700" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-sky-900 font-mono">{user?.balance_quota ?? 0}</span>
            <span className="text-xs text-slate-500">次</span>
          </div>
          <span className="text-xs text-slate-500 mt-1.5 block font-mono">1次扣减/完整尽调报告</span>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-300 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold block">累计充值额度</span>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-800 font-mono">{user?.total_recharge_quota ?? 0}</span>
            <span className="text-xs text-slate-400">次</span>
          </div>
          <span className="text-xs text-slate-400 mt-1.5 block">线上收银与对公充值</span>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-300 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold block">累计消耗额度</span>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-800 font-mono">{user?.total_consumed_quota ?? 0}</span>
            <span className="text-xs text-slate-400">次</span>
          </div>
          <span className="text-xs text-slate-400 mt-1.5 block">已出具的正式报告数</span>
        </div>

        <div className="bg-white rounded-sm p-4 border border-slate-300 shadow-2xs">
          <span className="text-xs text-slate-500 font-bold block">系统赠送额度</span>
          <div className="mt-2.5 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-teal-800 font-mono">{user?.total_gifted_quota ?? 0}</span>
            <span className="text-xs text-slate-400">次</span>
          </div>
          <span className="text-xs text-slate-400 mt-1.5 block">新户注册与运营活动</span>
        </div>
      </div>

      {/* 2. 套餐购买区域 */}
      <div className="mt-8">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-700" />
          购买尽调点数加油包 (即刻到账)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white rounded-sm p-5 border transition-colors flex flex-col justify-between ${
                pkg.id === 'pack_10'
                  ? 'border-sky-600 ring-1 ring-sky-600 shadow-xs'
                  : 'border-slate-300 hover:border-slate-400 shadow-2xs'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-sm font-bold text-slate-900">{pkg.name}</span>
                  {pkg.tag && (
                    <span className="px-2 py-0.5 rounded-xs text-[11px] font-bold bg-sky-700 text-white font-mono">
                      {pkg.tag}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline font-mono">
                  <span className="text-2xl font-extrabold text-slate-900">¥ {pkg.price}</span>
                  <span className="text-xs text-slate-500 ml-2">/ {pkg.quota_points} 次</span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{pkg.desc}</p>
              </div>

              <button
                onClick={() => handleCreateOrder(pkg.id)}
                disabled={submittingOrder}
                className="mt-5 w-full py-2.5 rounded-sm bg-sky-700 hover:bg-sky-800 text-xs font-bold text-white shadow-2xs transition-colors"
              >
                立即充值 (+{pkg.quota_points}次)
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* 3. 额度变动流水明细 */}
      <div className="mt-8">
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-teal-700" />
          额度消耗与变动明细
        </h2>

        <div className="bg-white rounded-sm border border-slate-300 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-700 divide-y divide-slate-200">
              <thead className="text-[11px] text-slate-600 uppercase bg-slate-100 font-bold">
                <tr>
                  <th className="py-3 px-4">流水单号</th>
                  <th className="py-3 px-4">变动业务类型</th>
                  <th className="py-3 px-4">变动点数</th>
                  <th className="py-3 px-4">变动后余额</th>
                  <th className="py-3 px-4">操作渠道</th>
                  <th className="py-3 px-4">详细说明</th>
                  <th className="py-3 px-4">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">加载流水记录中...</td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400">暂无额度流水记录</td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500">{tx.tx_no}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                          tx.amount > 0 ? 'bg-teal-50 text-teal-800 border border-teal-300' : 'bg-rose-50 text-rose-800 border border-rose-300'
                        }`}>
                          {tx.change_type === 'consume' ? '发起尽调扣减' : 
                           (tx.change_type === 'recharge' ? '线上充值' : 
                           (tx.change_type === 'gift' ? '系统赠送' : 
                           (tx.change_type === 'refund' ? '失败退还' : '人工调额')))}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold">
                        <span className={tx.amount > 0 ? 'text-teal-700' : 'text-rose-700'}>
                          {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 次
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sky-800 font-bold">{tx.balance_after} 次</td>
                      <td className="py-3 px-4 text-slate-600">{tx.operator_name || 'SYSTEM'}</td>
                      <td className="py-3 px-4 text-slate-800 max-w-xs truncate">{tx.remark}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{tx.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 扫码支付弹窗 */}
      <Modal
        open={!!currentOrder}
        onCancel={() => setCurrentOrder(null)}
        footer={null}
        title={
          <span className="text-slate-900 font-bold flex items-center gap-2 text-sm">
            <QrCode className="w-4 h-4 text-sky-700" />
            微信/支付宝 收银台扫码支付
          </span>
        }
      >
        {currentOrder && (
          <div className="py-4 text-center space-y-4">
            <p className="text-xs text-slate-700">
              购买套餐: <strong className="text-slate-900">{currentOrder.package_name}</strong> | 应付金额: <strong className="text-sky-800 text-base font-mono">¥ {currentOrder.amount}</strong>
            </p>

            <div className="p-3 bg-white rounded-sm inline-block shadow-2xs border border-slate-300">
              <img 
                src={currentOrder.pay_qrcode_url} 
                alt="收款二维码"
                className="w-44 h-44 mx-auto" 
              />
            </div>

            <p className="text-xs text-slate-400 font-mono">
              订单号: {currentOrder.order_no} | 支付完成后额度自动实时到账
            </p>

            <div className="pt-2">
              <button
                onClick={handleMockPay}
                className="w-full py-2.5 rounded-sm bg-teal-700 hover:bg-teal-800 text-xs font-bold text-white shadow-2xs transition-colors"
              >
                ⚡ 模拟微信扫码支付完成
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
