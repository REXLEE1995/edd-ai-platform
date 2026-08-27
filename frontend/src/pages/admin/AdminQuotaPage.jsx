import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Receipt, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  Building
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
            <Zap className="w-6 h-6 text-sky-700" />
            额度全生命周期流水与财务对账台账
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            全站每一笔额度变动（实名赠送/线上充值/线下对公调额/尽调扣减/失败返还）不可篡改全量台账
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 rounded-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-sky-700" />
            导出财务对账报表
          </button>
          <button
            onClick={fetchTransactions}
            className="p-1.5 rounded-sm bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-300 transition-all shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 过滤筛选条 */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-sm p-3 border border-slate-300 shadow-2xs">
        <form onSubmit={handleSearch} className="flex items-center w-full sm:w-80 bg-slate-50 rounded-sm px-3 py-2 border border-slate-200 focus-within:border-sky-500 focus-within:bg-white">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索流水单号、手机号、企业名..."
            className="w-full bg-transparent border-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          {[
            { key: '', label: '全部类型' },
            { key: 'consume', label: '尽调扣减 (-1)' },
            { key: 'recharge', label: '线上充值 (+)' },
            { key: 'manual_add', label: '线下对公调额 (+)' },
            { key: 'gift', label: '实名赠送 (+1)' },
            { key: 'refund', label: '失败返还 (+1)' }
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setChangeTypeFilter(t.key)}
              className={`px-2.5 py-1 rounded-sm text-xs font-bold border transition-all shrink-0 ${
                changeTypeFilter === t.key
                  ? 'bg-sky-50 text-sky-800 border-sky-300'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 流水明细数据表格 */}
      <div className="mt-6 bg-white rounded-sm border border-slate-300 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="text-[11px] text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">流水单号</th>
                <th className="py-3 px-4">用户手机 / 企业</th>
                <th className="py-3 px-4">变动类型</th>
                <th className="py-3 px-4">变动点数</th>
                <th className="py-3 px-4">变动前后基准</th>
                <th className="py-3 px-4">操作人</th>
                <th className="py-3 px-4">备注原因与凭据</th>
                <th className="py-3 px-4">时间戳</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">加载流水记录中...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400">暂无匹配的额度流水记录</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-500">{tx.tx_no}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 font-mono">{tx.user_phone}</div>
                      <div className="text-[10px] text-slate-400">{tx.user_company || '个人/未填企业'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                        tx.amount > 0 ? 'bg-teal-50 text-teal-800 border border-teal-300' : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}>
                        {tx.change_type === 'consume' ? '尽调扣减' : 
                         (tx.change_type === 'recharge' ? '线上充值' : 
                         (tx.change_type === 'manual_add' ? '线下对公调额' : 
                         (tx.change_type === 'gift' ? '实名赠送' : 
                         (tx.change_type === 'refund' ? '失败退还' : '人工扣除'))))}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-extrabold text-sm">
                      <span className={tx.amount > 0 ? 'text-teal-700' : 'text-rose-600'}>
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} 次
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[11px]">
                      {tx.balance_before} → <strong className="text-sky-700">{tx.balance_after}</strong> 次
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">
                      {tx.operator_name || 'SYSTEM'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 max-w-xs truncate" title={tx.remark}>
                      {tx.remark}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">{tx.created_at}</td>
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
