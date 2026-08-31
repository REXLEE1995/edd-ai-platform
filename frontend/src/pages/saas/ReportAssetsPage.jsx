import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, 
  Search, 
  Filter, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  ArrowRight, 
  Download,
  Calendar,
  Layers
} from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';
import { formatLocalTime } from '../../utils/date';

export default function ReportAssetsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  const fetchReports = async () => {
    try {
      let url = '/v1/reports/list?';
      if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
      if (riskFilter) url += `risk_level=${encodeURIComponent(riskFilter)}&`;
      const res = await apiClient.get(url);
      setReports(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [riskFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchReports();
  };

  const getRiskBadge = (level, score) => {
    if (level === 'green') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-teal-50 text-teal-800 border border-teal-300">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-700" /> 高信用评分 ({score}分 · 仅供参考)
        </span>
      );
    }
    if (level === 'yellow') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-700" /> 中等/一般信用 ({score}分 · 仅供参考)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-700" /> 预警关注 ({score}分 · 仅供参考)
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* 头部标题与统计 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-700" />
            尽调报告资产库
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            支持企业尽调报告调阅、全景底稿溯源与银行级 PDF 导出存证
          </p>
        </div>

        <Link
          to="/app"
          className="inline-flex items-center px-4 py-2 rounded-sm bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs transition-colors shadow-2xs self-start sm:self-auto"
        >
          发起新尽调
          <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
        </Link>
      </div>

      {/* 检索过滤条 */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-sm p-3.5 border border-slate-300 shadow-2xs">
        <form onSubmit={handleSearch} className="flex items-center w-full sm:w-80 bg-slate-50 rounded-sm px-3 py-2 border border-slate-300 focus-within:border-sky-600 focus-within:bg-white">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索企业名称或统一代码..."
            className="w-full bg-transparent border-0 text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-500 font-semibold shrink-0">信用评分等级:</span>
          {['', 'green', 'yellow', 'red'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setRiskFilter(lvl)}
              className={`px-3 py-1 rounded-sm text-xs font-semibold border transition-colors shrink-0 ${
                riskFilter === lvl
                  ? 'bg-sky-50 text-sky-800 border-sky-300 font-bold'
                  : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {lvl === '' ? '全部' : (lvl === 'green' ? '🟢 高信用评分 (A/B+)' : (lvl === 'yellow' ? '🟡 中等信用 (B/C+)' : '🔴 预警关注 (D/E)'))}
            </button>
          ))}
        </div>
      </div>

      {/* 报告列表卡片 */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">正在加载报告资产库...</div>
        ) : reports.length === 0 ? (
          <div className="bg-white rounded-sm p-12 text-center border border-slate-300 shadow-2xs">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-700">未找到匹配的尽调报告</h3>
            <p className="text-xs text-slate-400 mt-1">请尝试修改筛选条件或发起新的企业尽调</p>
          </div>
        ) : (
          reports.map((rpt) => (
            <div
              key={rpt.id}
              className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs hover:border-sky-600 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-extrabold text-slate-900">{rpt.company_name}</h3>
                  {getRiskBadge(rpt.risk_level, rpt.score)}
                </div>

                <p className="text-xs text-slate-600 line-clamp-1 max-w-2xl leading-relaxed">
                  {rpt.summary_ai_comment}
                </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-mono">
                    <span>报告文号: <strong className="text-slate-700">{rpt.report_no}</strong></span>
                    <span>信用代码: <strong className="text-slate-700">{rpt.credit_code}</strong></span>
                    <span>参考授信额度: <strong className="text-teal-800 font-bold">{rpt.suggested_quota_min}~{rpt.suggested_quota_max} 万元</strong></span>
                    <span>出具时间: <strong className="text-slate-700 font-semibold">{formatLocalTime(rpt.created_at)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/app/reports/${rpt.id}`}
                    className="px-4 py-2 rounded-sm bg-sky-700 hover:bg-sky-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <span>查看全景报告</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <a
                    href={`/api/v1/reports/${rpt.id}/pdf`}
                    download={`微风企尽调报告_${rpt.company_name}.pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs transition-colors inline-flex items-center justify-center"
                    title="下载 MinIO 真实 PDF 存证原件"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
