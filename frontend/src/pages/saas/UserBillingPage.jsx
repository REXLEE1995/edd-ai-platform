import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Zap, 
  CheckCircle2, 
  QrCode, 
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      {/* 头部标题 */}
      <div className="pb-6 border-b border-zinc-200">
        <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2 tracking-tight">
          <CreditCard className="w-5 h-5 text-slate-800" />
          尽调额度充值与资产中心
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-zinc-500">
          管理可用尽调额度、在线购买加油包、查看消耗流水与对公专票申请
        </p>
      </div>

      {/* 1. 额度资产看板 */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="shadcn-card p-5 bg-white border border-zinc-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
            <span>当前可用额度</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold text-slate-950 font-mono">{user?.balance_quota ?? 0}</span>
            <span className="text-xs text-zinc-500">次</span>
          </div>
          <span className="text-[11px] text-zinc-400 block font-mono">1次扣减/完整尽调报告</span>
        </div>

        <div className="shadcn-card p-5 bg-white border border-zinc-200 shadow-xs space-y-1.5">
          <span className="text-xs text-zinc-500 font-medium block">累计充值额度</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-950 font-mono">{user?.total_recharge_quota ?? 0}</span>
            <span className="text-xs text-zinc-500">次</span>
          </div>
          <span className="text-[11px] text-zinc-400 block">线上收银与对公充值</span>
        </div>

        <div className="shadcn-card p-5 bg-white border border-zinc-200 shadow-xs space-y-1.5">
          <span className="text-xs text-zinc-500 font-medium block">累计消耗额度</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-950 font-mono">{user?.total_consumed_quota ?? 0}</span>
            <span className="text-xs text-zinc-500">次</span>
          </div>
          <span className="text-[11px] text-zinc-400 block">已出具的正式报告数</span>
        </div>

        <div className="shadcn-card p-5 bg-white border border-zinc-200 shadow-xs space-y-1.5">
          <span className="text-xs text-zinc-500 font-medium block">系统赠送额度</span>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-emerald-700 font-mono">{user?.total_gifted_quota ?? 0}</span>
            <span className="text-xs text-zinc-500">次</span>
          </div>
          <span className="text-[11px] text-zinc-400 block">新户注册与运营活动</span>
        </div>
      </div>

      {/* 2. 套餐购买区域 */}
      <div className="mt-10">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          购买尽调点数加油包 (即刻到账)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {packages.map((pkg) => {
            const isPopular = pkg.id === 'pack_50' || pkg.id === 'pack_10';
            return (
              <div
                key={pkg.id}
                className={`shadcn-card p-6 bg-white flex flex-col justify-between space-y-6 transition-all ${
                  isPopular
                    ? 'border-2 border-slate-900 shadow-md relative'
                    : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {isPopular && (
                  <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider shadow-xs">
                    推荐档位
                  </span>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                    <span className="text-base font-bold text-slate-950">{pkg.name}</span>
                    <span className="shadcn-badge-outline font-mono text-[11px]">
                      {pkg.quota_count} 次额度
                    </span>
                  </div>

                  <div className="font-mono">
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-slate-600">¥</span>
                      <span className="text-3xl font-extrabold text-slate-950">{pkg.price_cny}</span>
                      {pkg.original_price_cny && (
                        <span className="text-xs text-zinc-400 line-through ml-1.5">
                          ¥{pkg.original_price_cny}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 mt-1 block">
                      单次仅需 ¥{(pkg.price_cny / pkg.quota_count).toFixed(1)} / 份
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {pkg.description || '包含完整企业全景尽调报告，支持在线目录大纲查阅与 PDF 原件下载。'}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={submittingOrder}
                  onClick={() => handleCreateOrder(pkg.id)}
                  className={`w-full py-2.5 text-xs font-semibold ${
                    isPopular ? 'shadcn-button-primary' : 'shadcn-button-outline'
                  }`}
                >
                  {submittingOrder ? '正在调起收银台...' : `立即充值 ¥${pkg.price_cny}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 额度变动流水 */}
      <div className="mt-12">
        <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-slate-700" />
          近期额度变动明细
        </h2>

        <div className="shadcn-card bg-white overflow-hidden border border-zinc-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 text-zinc-500 font-semibold border-b border-zinc-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">流水编号</th>
                  <th className="px-4 py-3">变动类型</th>
                  <th className="px-4 py-3">变动点数</th>
                  <th className="px-4 py-3">变动后结余</th>
                  <th className="px-4 py-3">关联主体/说明</th>
                  <th className="px-4 py-3">操作时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-zinc-400">暂无额度变动明细</td>
                  </tr>
                ) : (
                  transactions.slice(0, 10).map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-50/70 transition-colors">
                      <td className="px-4 py-3 font-mono text-zinc-500">{tx.tx_no || `TX${tx.id}`}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">
                          {tx.change_type === 'recharge' ? '🟢 购买充值' : (tx.change_type === 'consume' ? '🔴 尽调消耗' : '🎁 系统赠送')}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold">
                        <span className={tx.delta_quota > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                          {tx.delta_quota > 0 ? `+${tx.delta_quota}` : tx.delta_quota} 次
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-800 font-semibold">{tx.after_balance} 次</td>
                      <td className="px-4 py-3 text-zinc-600">{tx.remark || '-'}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{tx.created_at}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. 收银台 Modal */}
      {currentOrder && (
        <Modal
          open={!!currentOrder}
          onCancel={() => setCurrentOrder(null)}
          footer={null}
          width={420}
          centered
          destroyOnClose
        >
          <div className="space-y-5 pt-1">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-950 tracking-tight">扫码支付尽调加油包</h3>
              <p className="text-xs text-zinc-500">
                订单编号: <strong className="font-mono text-slate-900">{currentOrder.order_no}</strong>
              </p>
            </div>

            <div className="bg-zinc-50 p-6 rounded-xl border border-zinc-200 text-center space-y-3">
              <div className="w-40 h-40 mx-auto bg-white p-2 border border-zinc-200 rounded-lg shadow-2xs flex items-center justify-center">
                <QrCode className="w-full h-full text-slate-900" />
              </div>
              <div className="font-mono">
                <span className="text-xs text-zinc-500 block">应付金额</span>
                <span className="text-2xl font-extrabold text-slate-950">¥{currentOrder.amount_cny}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleMockPay}
                className="shadcn-button-primary w-full py-2.5 text-xs font-semibold"
              >
                ⚡ 一键模拟微信支付成功 (开发测试通道)
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}
