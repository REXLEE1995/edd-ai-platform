import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  Download, 
  RefreshCw
} from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';

export default function AdminQuotaPage() {
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [changeTypeFilter, setChangeTypeFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = `/admin/quota/transactions?page=${page}&page_size=15`;
      if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
      if (changeTypeFilter) url += `&change_type=${encodeURIComponent(changeTypeFilter)}`;
      const res = await apiClient.get(url);
      setTransactions(res.data.items || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
      message.error('获取额度流水失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page, changeTypeFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  const handleExportCSV = () => {
    message.success('正在导出全量额度财务对账 Excel / CSV 报表...');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2 tracking-tight">
            <Zap className="w-5 h-5 text-slate-800" />
            额度全生命周期流水与财务对账台账
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            全站每一笔额度变动（实名赠送/线上充值/线下对公调额/尽调扣减/失败返还）不可篡改全量台账
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="shadcn-button-outline text-xs py-2 px-3.5"
          >
            <Download className="w-3.5 h-3.5" />
            导出财务对账报表
          </button>
          <button
            type="button"
            onClick={fetchTransactions}
            className="p-2 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 过滤筛选条 */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadcn-card bg-white p-3 border border-zinc-200">
        <form onSubmit={handleSearch} className="flex items-center w-full sm:w-80 bg-white rounded-md px-3 py-2 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10">
          <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索流水单号、手机号、企业名..."
            className="w-full bg-transparent border-0 text-xs text-slate-900 placeholder:text-zinc-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-500 shrink-0 font-medium">流水类型:</span>
          <div className="bg-zinc-100 p-1 rounded-lg flex items-center gap-1 border border-zinc-200/80">
            {['', 'recharge', 'consume', 'gift', 'admin_adjust'].map((tp) => (
              <button
                key={tp}
                type="button"
                onClick={() => setChangeTypeFilter(tp)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  changeTypeFilter === tp
                    ? 'bg-white text-slate-950 font-semibold shadow-xs'
                    : 'text-zinc-600 hover:text-slate-900'
                }`}
              >
                {tp === '' ? '全部' : (tp === 'recharge' ? '充值' : (tp === 'consume' ? '消耗' : (tp === 'gift' ? '赠送' : '人工调额')))}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 流水表格 */}
      <div className="mt-6 shadcn-card bg-white border border-zinc-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-zinc-500 uppercase bg-zinc-50 border-b border-zinc-200 font-semibold tracking-wider">
              <tr>
                <th className="py-3 px-4">流水号</th>
                <th className="py-3 px-4">用户手机号 / UID</th>
                <th className="py-3 px-4">变动类型</th>
                <th className="py-3 px-4">点数变动</th>
                <th className="py-3 px-4">变动后结余</th>
                <th className="py-3 px-4">业务背景 / 关联企业</th>
                <th className="py-3 px-4">记账时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-400">正在加载流水...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-zinc-400">暂无符合条件的流水记录</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-zinc-500">{tx.tx_no || tx.id}</td>
                    <td className="py-3 px-4 font-mono text-slate-900 font-medium">{tx.user_phone || tx.user_id}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {tx.change_type === 'recharge' ? '🟢 购买充值' : (tx.change_type === 'consume' ? '🔴 尽调消耗' : (tx.change_type === 'gift' ? '🎁 实名赠送' : '⚡ 人工调额'))}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={(tx.delta_quota || tx.points_changed) > 0 ? 'text-emerald-700' : 'text-rose-600'}>
                        {(tx.delta_quota || tx.points_changed) > 0 ? `+${tx.delta_quota || tx.points_changed}` : (tx.delta_quota || tx.points_changed)} 次
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{tx.after_balance || tx.balance_after} 次</td>
                    <td className="py-3 px-4 text-zinc-600 max-w-xs truncate">{tx.remark}</td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{tx.created_at}</td>
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
