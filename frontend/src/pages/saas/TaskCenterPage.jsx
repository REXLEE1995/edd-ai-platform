import React, { useState, useEffect, useRef } from 'react';
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
  Check,
  Share2,
  FolderLock,
  RotateCw,
  Trash2
} from 'lucide-react';
import { message, Modal } from 'antd';
import apiClient from '../../api/client';
import { formatLocalTime } from '../../utils/date';
import ShareReportModal from '../../components/ShareReportModal';
import ShareManagementModal from '../../components/ShareManagementModal';

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
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return !!successful;
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
  const [syncingTaskId, setSyncingTaskId] = useState(null);

  // 2. 报告资产数据
  const [reports, setReports] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportKeyword, setReportKeyword] = useState('');
  const [reportRiskFilter, setReportRiskFilter] = useState('');

  // 3. 分享与管理状态
  const [selectedReportForShare, setSelectedReportForShare] = useState(null);
  const [openShareManagement, setOpenShareManagement] = useState(false);

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
      const list = res.data || [];
      // 严格保证按生成时间从新到旧 (最新在前) 倒序排列
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setReports(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReports(false);
    }
  };

  // 删除/取消单个尽调任务
  const handleDeleteTask = async (task) => {
    Modal.confirm({
      title: '确认取消并删除该尽调任务？',
      content: `企业主体：${task.company_name}（单号: ${task.task_no || task.id}），删除后该任务记录将从列表中彻底移除。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          const res = await apiClient.delete(`/v1/tasks/${task.id}`);
          if (res.code === 0) {
            message.success('尽调任务已成功删除');
            if (selectedTaskForAuth && selectedTaskForAuth.id === task.id) {
              setSelectedTaskForAuth(null);
            }
            fetchTasks();
          }
        } catch (err) {
          message.error('删除任务失败: ' + (err.response?.data?.detail || err.message));
        }
      }
    });
  };

  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    } else {
      fetchReports();
    }
  }, [activeTab, reportRiskFilter]);

  // 定时轻量轮询：当有任务处于 processing (pulling_data / ai_analyzing / waiting_auth) 时自动刷新
  useEffect(() => {
    if (activeTab !== 'tasks') return;
    const interval = setInterval(() => {
      const hasProcessing = tasks.some(t => t.status === 'pulling_data' || t.status === 'ai_analyzing' || t.status === 'waiting_auth');
      if (hasProcessing) {
        fetchTasks();
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTab, tasks]);

  // 实际校验三方微风企是否已完成实名授权与回调
  const handleSyncTask = async (task, showToast = true) => {
    setSyncingTaskId(task.id);
    try {
      const res = await apiClient.post(`/v1/tasks/${task.id}/sync`);
      if (res.code === 0) {
        if (res.data?.authorized) {
          if (showToast) message.success(res.message || '已确认三方微风企实名授权成功！AI 尽调研判已启动。');
          if (selectedTaskForAuth && selectedTaskForAuth.id === task.id) {
            setSelectedTaskForAuth(null);
          }
          await fetchTasks();
        } else {
          if (showToast) message.warning(res.message || '未检测到法人授权完成，请让企业法定代表人在微信端打开授权链接并提交实名认证。');
        }
      }
    } catch (err) {
      if (showToast) message.error(err.response?.data?.detail || '授权状态校验失败');
    } finally {
      setSyncingTaskId(null);
    }
  };

  // 弹窗打开时的被动状态感知轮询：仅查询任务详情判断是否已收到微风企回调，不强行更改状态
  useEffect(() => {
    if (!selectedTaskForAuth) return;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/v1/tasks/${selectedTaskForAuth.id}`);
        if (res.code === 0 && res.data?.auth_status === 'authorized') {
          message.success('已接收到微风企授权完成回调！AI 全景尽调流水线已启动。');
          setSelectedTaskForAuth(null);
          await fetchTasks();
        }
      } catch (err) {
        console.debug(err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedTaskForAuth]);

  const getStatusBadge = (status) => {
    if (status === 'waiting_auth') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50/80 backdrop-blur-sm text-amber-800 border border-amber-200/60 shadow-2xs">
          <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" /> 等待法定代表人扫码授权
        </span>
      );
    }
    if (status === 'pulling_data' || status === 'ai_analyzing') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-50/80 backdrop-blur-sm text-[#0084c2] border border-cyan-200/60 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-[#0096DB] animate-spin" /> 数据清洗与 AI 研判中...
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-2xs">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 已生成并存入历史
      </span>
    );
  };

  const getRiskBadge = (level, score) => {
    if (level === 'green') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 建议准入 ({score}分 · 仅供参考)
        </span>
      );
    }
    if (level === 'yellow') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-600" /> 审慎关注 ({score}分 · 仅供参考)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200">
        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> 一票否决 ({score}分 · 仅供参考)
      </span>
    );
  };

  const activeTasks = tasks.filter(t => t.status !== 'completed');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      {/* 头部标题与操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2.5 tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400 to-[#0ea5e9] text-white flex items-center justify-center shadow-xs border border-white/50 backdrop-blur-md">
              <Clock className="w-4 h-4" />
            </div>
            <span>尽调任务与报告资产中心</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            一站式管理：实时处理进行中的尽调授权，随时调阅历史全量尽调报告与存证底稿
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setOpenShareManagement(true)}
            className="shadcn-button-outline text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-[#0ea5e9] hover:text-[#0284c7] shadow-xs"
            title="查看与管理我创建的报告加密分享"
          >
            <FolderLock className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>分享管理</span>
          </button>

          <button 
            type="button"
            onClick={() => {
              if (activeTab === 'tasks') fetchTasks();
              else fetchReports();
            }}
            className="shadcn-button-outline text-xs py-1.5 px-3 shadow-xs hover:border-[#0ea5e9] hover:text-[#0284c7]"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
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

      {/* 玻璃拟态 Tabs 胶囊切换栏 */}
      <div className="mt-6 flex items-center bg-slate-200/60 backdrop-blur-xl p-1 rounded-lg w-fit border border-white/60 shadow-xs">
        <button
          type="button"
          onClick={() => switchTab('tasks')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-white text-[#0284c7] font-semibold shadow-xs border border-white/80 backdrop-blur-md'
              : 'text-slate-600 hover:text-[#0ea5e9] hover:bg-white/40 border border-transparent'
          }`}
        >
          <Activity className={`w-3.5 h-3.5 ${activeTab === 'tasks' ? 'text-[#0ea5e9]' : 'text-slate-500'}`} />
          <span>进行中的尽调任务</span>
          {activeTasks.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${
              activeTab === 'tasks' ? 'bg-cyan-50 text-[#0284c7] border border-cyan-200/60' : 'bg-slate-300 text-slate-700'
            }`}>
              {activeTasks.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => switchTab('reports')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-white text-[#0284c7] font-semibold shadow-xs border border-white/80 backdrop-blur-md'
              : 'text-slate-600 hover:text-[#0ea5e9] hover:bg-white/40 border border-transparent'
          }`}
        >
          <FileText className={`w-3.5 h-3.5 ${activeTab === 'reports' ? 'text-[#0ea5e9]' : 'text-slate-500'}`} />
          <span>历史尽调报告资产库 ({reports.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 进行中的尽调任务 */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="mt-6 space-y-4">
          {loadingTasks ? (
            <div className="text-center py-16 text-slate-400 text-sm">正在加载进行中的尽调任务...</div>
          ) : activeTasks.length === 0 ? (
            <div className="shadcn-card p-12 text-center bg-white/80 backdrop-blur-xl space-y-4 border border-white/80 shadow-glass">
              <div className="w-12 h-12 rounded-lg bg-cyan-50/80 border border-cyan-100 flex items-center justify-center mx-auto text-[#0096DB] shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">当前暂无进行中的尽调任务</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  所有已生成的尽调报告均已自动归档至【历史尽调报告资产库】中，可随时调阅或导出。
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => switchTab('reports')}
                  className="shadcn-button-outline text-xs py-2 px-4 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 text-[#0096DB]" />
                  查看历史尽调报告 ({reports.length} 份)
                </button>
                <Link 
                  to="/app" 
                  className="shadcn-button-primary text-xs py-2 px-4 shadow-glow-primary"
                >
                  发起新企业尽调
                </Link>
              </div>
            </div>
          ) : (
            activeTasks.map((task) => (
              <div key={task.id} className="shadcn-card p-5 bg-white/80 backdrop-blur-xl space-y-4 border border-white/80 shadow-glass">
                
                {/* 头部企业与状态栏 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-bold text-slate-900">{task.company_name}</h3>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
                      <span>任务单号: <strong className="text-slate-800">{task.task_no || task.id}</strong></span>
                      <span>统一代码: <strong className="text-slate-800">{task.credit_code}</strong></span>
                      <span>创建时间: {formatLocalTime(task.created_at)}</span>
                    </div>
                  </div>

                  {/* 快捷操作 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === 'waiting_auth' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setSelectedTaskForAuth(task)}
                          className="shadcn-button-outline text-xs py-1.5 px-3 bg-amber-50/70 border-amber-300 text-amber-900 hover:bg-amber-100/70 shadow-xs"
                        >
                          <QrCode className="w-3.5 h-3.5 text-amber-700" />
                          扫码授权协同
                        </button>

                        <button
                          type="button"
                          disabled={syncingTaskId === task.id}
                          onClick={() => handleSyncTask(task)}
                          className="shadcn-button-primary text-xs py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center gap-1.5"
                          title="主动向微风企网关拉取最新实名授权与报告生成状态"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${syncingTaskId === task.id ? 'animate-spin' : ''}`} />
                          <span>{syncingTaskId === task.id ? '同步中...' : '同步授权状态'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task)}
                          className="shadcn-button-outline text-xs py-1.5 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200/80 shadow-xs flex items-center gap-1"
                          title="取消并删除此尽调任务"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>删除</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 进行中状态提示条 */}
                {(task.status === 'pulling_data' || task.status === 'ai_analyzing') && (
                  <div className="p-3.5 rounded-lg bg-cyan-50/50 backdrop-blur-md border border-cyan-200/60 flex items-center justify-between text-xs text-slate-900 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-[#0096DB] shrink-0 animate-spin" />
                      <span className="text-slate-700">正在向微风企网关拉取贷前报告 PDF，聚合工商主体与经营司法数据，并执行 AI 深度量化研判，完成后将自动移入【历史尽调报告资产库】...</span>
                    </div>
                    <span className="text-[#0084c2] font-mono font-semibold animate-pulse">处理中</span>
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
          <div className="shadcn-card p-2.5 bg-white/75 backdrop-blur-xl border border-white/80 shadow-glass">
            <form onSubmit={(e) => { e.preventDefault(); fetchReports(); }} className="flex items-center w-full bg-white/60 backdrop-blur-md rounded-md px-3 py-1.5 border border-slate-200/80 focus-within:border-[#0096DB] focus-within:ring-2 focus-within:ring-[#0096DB]/20 transition-all">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={reportKeyword}
                onChange={(e) => setReportKeyword(e.target.value)}
                placeholder="搜索企业名称或统一社会信用代码..."
                className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
              {reportKeyword && (
                <button
                  type="button"
                  onClick={() => { setReportKeyword(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-mono mr-2"
                >
                  清除
                </button>
              )}
              <button 
                type="submit"
                className="shadcn-button-primary text-xs py-1.5 px-3.5 shrink-0 shadow-xs"
              >
                搜索报告
              </button>
            </form>
          </div>

          {/* 报告列表 */}
          {loadingReports ? (
            <div className="text-center py-16 text-slate-400 text-sm">正在加载企业尽调报告...</div>
          ) : reports.length === 0 ? (
            <div className="shadcn-card p-12 text-center bg-white/80 backdrop-blur-xl space-y-3 border border-white/80 shadow-glass">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">未检索到历史尽调报告</h3>
              <p className="text-xs text-slate-500">发起新尽调并完成法人授权后，生成的报告将永久留存于此资产库中。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {reports.map((report) => (
                <div key={report.id} className="shadcn-card-hover p-5 bg-white/80 backdrop-blur-xl space-y-3.5 border border-white/85 shadow-glass hover:shadow-glass-hover">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-base font-bold text-slate-950 hover:text-[#0096DB] transition-colors">
                          <Link to={`/app/reports/${report.id}`}>
                            {report.company_name}
                          </Link>
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span>任务单号: <strong className="text-slate-800">{report.task_no || report.task_id || report.report_no}</strong></span>
                        <span>统一代码: <strong className="text-slate-800">{report.credit_code}</strong></span>
                        <span>生成时间: {formatLocalTime(report.created_at)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      {/* 6位密码加密分享入口 */}
                      <button
                        type="button"
                        onClick={() => setSelectedReportForShare(report)}
                        className="shadcn-button-outline text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs"
                        title="设置 6 位密码加密分享此报告"
                      >
                        <Share2 className="w-3.5 h-3.5 text-[#0096DB]" />
                        <span>分享报告</span>
                      </button>

                      <a
                        href={report.pdf_url || '/sample_report.pdf'}
                        download={`${report.company_name}_尽调报告.pdf`}
                        className="shadcn-button-outline text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs hover:border-[#0096DB] hover:text-[#0096DB]"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                        <span>下载 PDF 原件</span>
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
                  {report.summary_ai_comment && (
                    <div className="p-3 bg-slate-50/70 backdrop-blur-md rounded-md border border-slate-200/70 text-xs text-slate-700 leading-relaxed shadow-2xs">
                      <div className="font-semibold text-slate-900 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#0096DB]" />
                        AI 全景综合画像结论:
                      </div>
                      <p className="line-clamp-2 text-slate-600">{report.summary_ai_comment}</p>
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

            {(() => {
              const rawTarget = selectedTaskForAuth.short_url || selectedTaskForAuth.auth_short_url || selectedTaskForAuth.auth_qrcode_url || selectedTaskForAuth.auth_link || '';
              const getNormalizedUrl = (url) => {
                if (!url) return '';
                const currentHost = window.location.hostname;
                if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1') {
                  return url.replace(/127\.0\.0\.1|localhost/g, currentHost);
                }
                return url;
              };
              const normalizedLink = getNormalizedUrl(rawTarget);

              return (
                <>
                  <div className="inline-block p-3.5 bg-white border border-slate-200 rounded-md shadow-2xs">
                    <QRCodeSVG 
                      value={normalizedLink} 
                      size={200}
                      level="H"
                      includeMargin={true}
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-xs text-slate-700 font-mono space-y-1 text-left">
                    <div>授权企业: <strong>{selectedTaskForAuth.company_name}</strong></div>
                    <div>统一代码: <span>{selectedTaskForAuth.credit_code}</span></div>
                    <div>任务单号: <span className="text-sky-700 font-bold">{selectedTaskForAuth.task_no || selectedTaskForAuth.id}</span></div>
                    <div className="text-[11px] text-slate-500 break-all pt-1 border-t border-slate-200/80">
                      授权短链: <span className="text-sky-700 font-semibold">{normalizedLink}</span>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        const ok = await copyToClipboard(normalizedLink);
                        if (ok) {
                          message.success('极简授权短链已成功复制到剪贴板！');
                        } else {
                          message.error('复制失败，请手动选择链接复制');
                        }
                      }}
                      className="w-full sm:w-auto shadcn-button-primary px-6 py-2 text-xs font-semibold"
                    >
                      复制授权短链
                    </button>

                    <button
                      type="button"
                      disabled={syncingTaskId === selectedTaskForAuth.id}
                      onClick={() => handleSyncTask(selectedTaskForAuth, true)}
                      className="w-full sm:w-auto px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{syncingTaskId === selectedTaskForAuth.id ? '正在探测微风企...' : '我已完成授权，立即检查'}</span>
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </Modal>

      {/* 报告加密分享弹窗 (6 位访问密码设置) */}
      <ShareReportModal
        report={selectedReportForShare}
        open={!!selectedReportForShare}
        onClose={() => setSelectedReportForShare(null)}
        onShareUpdated={fetchReports}
      />

      {/* 分享管理中心弹窗 */}
      <ShareManagementModal
        open={openShareManagement}
        onClose={() => setOpenShareManagement(false)}
      />

    </div>
  );
}
