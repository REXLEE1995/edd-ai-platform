import React, { useState, useEffect } from 'react';
import { Receipt, Search, RefreshCw } from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let url = `/admin/orders/list?page=${page}&page_size=15`;
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      const res = await apiClient.get(url);
      setOrders(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2 tracking-tight">
            <Receipt className="w-5 h-5 text-slate-800" />
            线上订单与财务对账
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            微信/支付宝线上支付流水监控与大客户线下对公转账核销
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOrders}
          className="p-2 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-slate-900 transition-colors shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 检索过滤 */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadcn-card bg-white p-3 border border-zinc-200">
        <form onSubmit={handleSearch} className="flex items-center w-full sm:w-80 bg-white rounded-md px-3 py-2 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
          <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索订单号、手机号..."
            className="w-full bg-transparent border-0 text-xs text-slate-900 placeholder:text-zinc-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-500 font-medium">状态:</span>
          <div className="bg-zinc-100 p-1 rounded-lg flex items-center gap-1 border border-zinc-200/80">
            {['', 'paid', 'pending'].map((st) => (
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
                {st === '' ? '全部' : (st === 'paid' ? '已支付' : '待支付')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 订单表格 */}
      <div className="mt-6 shadcn-card bg-white border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">订单号</th>
                <th className="py-3 px-4">用户手机号</th>
                <th className="py-3 px-4">购买套餐</th>
                <th className="py-3 px-4">金额</th>
                <th className="py-3 px-4">支付方式</th>
                <th className="py-3 px-4">订单状态</th>
                <th className="py-3 px-4">下单时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-400">正在加载订单...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-400">暂无订单数据</td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-zinc-600">{o.order_no}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-900 font-medium">{o.user_phone}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-950">
                      {o.package_name} (+{o.quota_points || o.quota_count}次)
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-950">¥{o.amount_cny || o.amount}</td>
                    <td className="py-3.5 px-4 text-zinc-600">
                      {o.pay_type === 'wechat' ? '微信支付' : (o.pay_type === 'alipay' ? '支付宝' : '对公转账')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                        o.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {o.status === 'paid' ? '已支付' : '待付款'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-zinc-400">{o.created_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
