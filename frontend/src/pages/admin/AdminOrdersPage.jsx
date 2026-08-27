import React, { useState, useEffect } from 'react';
import { Receipt, Search, Filter, RefreshCw, CreditCard } from 'lucide-react';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
            <Receipt className="w-6 h-6 text-teal-700" />
            线上订单与财务对账
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            微信/支付宝线上支付流水监控与大客户线下对公转账核销
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="p-1.5 rounded-sm bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-300 transition-all shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* 检索过滤 */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-sm p-3 border border-slate-300 shadow-2xs">
        <form onSubmit={handleSearch} className="flex items-center w-full sm:w-80 bg-slate-50 rounded-sm px-3 py-2 border border-slate-200 focus-within:border-sky-500 focus-within:bg-white">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索订单号、手机号..."
            className="w-full bg-transparent border-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">状态:</span>
          {['', 'paid', 'pending'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-sm text-xs font-bold border transition-all ${
                statusFilter === st
                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {st === '' ? '全部' : (st === 'paid' ? '已支付' : '待支付')}
            </button>
          ))}
        </div>
      </div>

      {/* 订单表格 */}
      <div className="mt-6 bg-white rounded-sm border border-slate-300 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">订单号</th>
                <th className="py-3 px-4">用户手机号</th>
                <th className="py-3 px-4">套餐名称</th>
                <th className="py-3 px-4">支付金额</th>
                <th className="py-3 px-4">点数</th>
                <th className="py-3 px-4">支付渠道</th>
                <th className="py-3 px-4">状态</th>
                <th className="py-3 px-4">下单时间</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">正在加载订单数据...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">暂无订单数据</td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr key={ord.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">{ord.order_no}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{ord.user_phone}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">{ord.package_name}</td>
                    <td className="py-3.5 px-4 font-mono text-teal-700 font-extrabold text-sm">¥ {ord.amount.toFixed(2)}</td>
                    <td className="py-3.5 px-4 font-mono text-sky-700 font-bold">+{ord.quota_points} 次</td>
                    <td className="py-3.5 px-4 text-slate-600">{ord.pay_type === 'wechat' ? '微信支付' : '支付宝'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                        ord.status === 'paid' ? 'bg-teal-50 text-teal-800 border border-teal-300' : 'bg-amber-50 text-amber-800 border border-amber-300'
                      }`}>
                        {ord.status === 'paid' ? '已支付' : '待支付'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{ord.created_at}</td>
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
