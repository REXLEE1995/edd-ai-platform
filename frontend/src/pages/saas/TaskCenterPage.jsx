import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  QrCode, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  FileText,
  Activity,
  Search,
  Download,
  XCircle,
  AlertTriangle,
  Building,
  Check
} from 'lucide-react';
import { message, Modal } from 'antd';
import apiClient from '../../api/client';

// 全平台 / 全协议兼容的文本复制工具函数 (解决 Mac Safari 及非 HTTPS 下 navigator.clipboard 为 undefined 的问题)
const copyToClipboard = async (text) => {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn("navigator.clipboard API error, fallbacking:", err);
    }
  }

  // Fallback: 动态创建隐藏 textarea 使用 execCommand("copy")
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("execCommand fallback failed:", err);
    return false;
  }
};

export default function TaskCenterPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || 'tasks';
  const [activeTab, setActiveTab] = useState(initialTab); // 'tasks' or 'reports'

  useEffect(() => {
    const qTab = new URLSearchParams(location.search).get('tab');
    if (qTab && ['tasks', 'reports'].includes(qTab)) {
      setActiveTab(qTab);
    }
  }, [location.search]);

  const switchTab = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`/app/tasks?tab=${tabKey}`, { replace: true });
  };

  // 1. 任务数据
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTaskForAuth, setSelectedTaskForAuth] = useState(null);

  // 2. 报告资产数据
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportKeyword, setReportKeyword] = useState('');
  const [reportRiskFilter, setReportRiskFilter] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await apiClient.get('/v1/tasks/list');
      setTasks(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchReports = async () => {
    setLoadingReports(true);
    try {
      let url = '/v1/reports/list?';
      if (reportKeyword) url += `keyword=${encodeURIComponent(reportKeyword)}&`;
      if (reportRiskFilter) url += `risk_level=${encodeURIComponent(reportRiskFilter)}&`;
      const res = await apiClient.get(url);
      setReports(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchReports();
    const timer = setInterval(() => {
      if (activeTab === 'tasks') {
        fetchTasks();
        fetchReports();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports();
    }
  }, [activeTab, reportRiskFilter]);

  const handleSimulateAuth = async (taskId) => {
    try {
      await apiClient.post(`/v1/tasks/${taskId}/authorize`);
      message.success('已模拟企业法人完成金税授权！AI 分析流水线已启动');
      setSelectedTaskForAuth(null);
      fetchTasks();
    } catch (err) {
      message.error(err.response?.data?.detail || '授权操作失败');
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'waiting_auth') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-spin" /> 等待法人扫码授权
        </span>
      );
    }
    if (status === 'pulling_data' || status === 'ai_analyzing') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-slate-900 border border-zinc-200">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-slate-800 animate-spin" /> 数据清洗与 AI 研判中...
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 已生成并存入历史
      </span>
    );
  };

  const getRiskBadge = (level, score) => {
    if (level === 'green') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 高信用评分 ({score}分 · 仅供参考)
        </span>
      );
    }
    if (level === 'yellow') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> 中等/一般信用 ({score}分 · 仅供参考)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> 预警关注 ({score}分 · 仅供参考)
      </span>
    );
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      {/* 头部标题与操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2 tracking-tight">
            <Clock className="w-5 h-5 text-slate-800" />
            尽调任务与报告资产中心
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            一站式管理：实时处理进行中的尽调授权，随时调阅历史全量尽调报告与存证底稿
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            type="button"
            onClick={() => {
              if (activeTab === 'tasks') fetchTasks();
              else fetchReports();
            }}
            className="shadcn-button-outline text-xs py-1.5 px-3"
          >
            <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
            刷新
          </button>

          <Link
            to="/app"
            className="shadcn-button-primary text-xs py-1.5 px-3.5"
          >
            <span>发起新尽调</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* shadcn Tabs 胶囊切换栏 */}
      <div className="mt-6 flex items-center bg-zinc-100 p-1 rounded-lg w-fit border border-zinc-200/80">
        <button
          type="button"
          onClick={() => switchTab('tasks')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-white text-slate-950 font-semibold shadow-xs'
              : 'text-zinc-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-slate-700" />
          <span>进行中的尽调任务</span>
          {activeTasks.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-900 text-white font-mono">
              {activeTasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('reports')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-white text-slate-950 font-semibold shadow-xs'
              : 'text-zinc-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-slate-700" />
          <span>历史尽调报告资产库 ({reports.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 仅展示进行中的尽调任务 */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="mt-6 space-y-4">
          {loadingTasks ? (
            <div className="text-center py-16 text-zinc-400 text-sm">正在加载进行中的尽调任务...</div>
          ) : activeTasks.length === 0 ? (
            <div className="shadcn-card p-12 text-center bg-white space-y-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">当前暂无进行中的尽调任务</h3>
                <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
                  所有已生成的尽调报告均已自动归档至【历史尽调报告资产库】中，可随时调阅或导出。
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => switchTab('reports')}
                  className="shadcn-button-outline text-xs py-2 px-4"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-700" />
                  查看历史尽调报告 ({reports.length} 份)
                </button>
                <Link 
                  to="/app" 
                  className="shadcn-button-primary text-xs py-2 px-4"
                >
                  发起新企业尽调
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            activeTasks.map((task) => (
              <div key={task.id} className="shadcn-card p-6 bg-white space-y-4">
                
                {/* 头部企业与状态栏 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-slate-900">{task.company_name}</h3>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500 font-mono">
                      <span>任务编号: <strong className="text-slate-800">{task.task_no}</strong></span>
                      <span>统一代码: <strong className="text-slate-800">{task.credit_code}</strong></span>
                      <span>尽调类型: <strong className="text-slate-800">企业全量授权尽调</strong></span>
                      <span>创建时间: {task.created_at}</span>
                    </div>
                  </div>

                  {/* 快捷操作 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === 'waiting_auth' && (
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForAuth(task)}
                        className="shadcn-button-outline text-xs py-1.5 px-3 bg-amber-50/50 border-amber-200 text-amber-900 hover:bg-amber-100/50"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-700" />
                        扫码授权协同
                      </button>
                    )}
                  </div>
                </div>

                {/* 进行中状态提示条 */}
                {(task.status === 'pulling_data' || task.status === 'ai_analyzing') && (
                  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs text-slate-900">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-slate-800 shrink-0 animate-spin" />
                      <span className="text-zinc-700">正在调用享宇数据中台聚合工商主体、司法合规与金税发票数据，并执行 AI 深度量化研判，完成后将自动移入【历史尽调报告资产库】...</span>
                    </div>
                    <span className="text-slate-900 font-mono font-semibold animate-pulse">处理中</span>
                  </div>
                )}

              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 历史尽调报告资产库 */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="mt-6 space-y-4">
          
          {/* 检索过滤条 */}
          <div className="shadcn-card p-3 bg-white">
            <form onSubmit={(e) => { e.preventDefault(); fetchReports(); }} className="flex items-center w-full bg-zinc-50 rounded-md px-3.5 py-2 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
              <Search className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={reportKeyword}
                onChange={(e) => setReportKeyword(e.target.value)}
                placeholder="搜索企业名称或统一社会信用代码..."
                className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-900 placeholder:text-zinc-400 focus:outline-none"
              />
              {reportKeyword && (
                <button
                  type="button"
                  onClick={() => { setReportKeyword(''); }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer font-mono mr-2"
                >
                  清除
                </button>
              )}
              <button 
                type="submit"
                className="shadcn-button-primary text-xs py-1.5 px-3 shrink-0"
              >
                搜索报告
              </button>
            </form>
          </div>

          {/* 报告列表 */}
          {loadingReports ? (
            <div className="text-center py-16 text-zinc-400 text-sm">正在加载企业尽调报告...</div>
          ) : reports.length === 0 ? (
            <div className="shadcn-card p-12 text-center bg-white space-y-3">
              <FileText className="w-10 h-10 text-zinc-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">未检索到历史尽调报告</h3>
              <p className="text-xs text-zinc-500">发起新尽调并完成法人授权后，生成的报告将永久留存于此资产库中。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reports.map((report) => (
                <div key={report.id} className="shadcn-card-hover p-6 bg-white space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-lg font-bold text-slate-950 hover:text-slate-700 transition-colors">
                          <Link to={`/app/reports/${report.id}`}>
                            {report.company_name}
                          </Link>
                        </h3>
                        {getRiskBadge(report.risk_level, report.rating_score)}
                        <span className="shadcn-badge-outline font-mono">
                          {report.report_pages || 61} 页全景
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 font-mono">
                        统一代码: {report.credit_code} · 报告编号: {report.report_no} · 生成时间: {report.created_at}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={report.pdf_url || '/sample_report.pdf'}
                        download={`${report.company_name}_尽调报告.pdf`}
                        className="shadcn-button-outline text-xs py-1.5 px-3"
                      >
                        <Download className="w-3.5 h-3.5" />
                        下载 PDF 原件
                      </a>
                      <Link
                        to={`/app/reports/${report.id}`}
                        className="shadcn-button-primary text-xs py-1.5 px-3.5"
                      >
                        <span>在线沉浸查阅</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* AI 综合画像速览 */}
                  {report.ai_summary && (
                    <div className="p-3.5 bg-zinc-50/70 rounded-lg border border-zinc-200/80 text-xs text-zinc-700 leading-relaxed">
                      <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        AI 全景综合画像结论:
                      </div>
                      <p className="line-clamp-2 text-zinc-600">{report.ai_summary}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* 金税授权弹窗 */}
      <Modal
        open={!!selectedTaskForAuth}
        onCancel={() => setSelectedTaskForAuth(null)}
        footer={null}
        title={
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <QrCode className="w-4 h-4 text-sky-700" />
            企业实名数据授权通道
          </div>
        }
        width={480}
      >
        {selectedTaskForAuth && (
          <div className="py-4 text-center space-y-4 text-slate-800">
            <p className="text-xs text-slate-600">
              请使用企业法定代表人微信扫描下方二维码或点击复制链接发送给接收人完成实名数据授权：
            </p>

            <div className="inline-block p-3.5 bg-white border border-slate-200 rounded-md shadow-2xs">
              <QRCodeSVG 
                value={selectedTaskForAuth.short_url || selectedTaskForAuth.auth_qrcode_url || selectedTaskForAuth.auth_link || ''} 
                size={200}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-xs text-slate-700 font-mono space-y-1 text-left">
              <div>授权企业: <strong>{selectedTaskForAuth.company_name}</strong></div>
              <div>统一代码: <span>{selectedTaskForAuth.credit_code}</span></div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={async () => {
                  const targetLink = selectedTaskForAuth.short_url || selectedTaskForAuth.auth_short_url || selectedTaskForAuth.auth_qrcode_url || selectedTaskForAuth.auth_link;
                  const ok = await copyToClipboard(targetLink);
                  if (ok) {
                    message.success('极简授权短链已成功复制到剪贴板！');
                  } else {
                    message.error('复制失败，请手动选择链接复制');
                  }
                }}
                className="px-6 py-2 rounded-sm bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs"
              >
                复制授权短链
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
