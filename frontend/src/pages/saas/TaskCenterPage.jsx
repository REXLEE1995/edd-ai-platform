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
  Trash2,
  LogIn,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { message, Modal, Pagination } from 'antd';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatLocalTime } from '../../utils/date';
import ShareReportModal from '../../components/ShareReportModal';
import ShareManagementModal from '../../components/ShareManagementModal';
import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true
});

const renderMarkdown = (content) => {
  if (!content) return '';
  try {
    return marked.parse(String(content));
  } catch (e) {
    return String(content);
  }
};

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
  const { user, loading: authLoading, openLoginModal } = useAuth();

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

  // 1. 任务数据与分页
  const [tasks, setTasks] = useState([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(8);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTaskForAuth, setSelectedTaskForAuth] = useState(null);
  const [syncingTaskId, setSyncingTaskId] = useState(null);

  // 2. 报告资产数据与分页
  const [reports, setReports] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(8);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportKeyword, setReportKeyword] = useState('');
  const [reportRiskFilter, setReportRiskFilter] = useState('');

  // 3. 分享与管理状态
  const [selectedReportForShare, setSelectedReportForShare] = useState(null);
  const [openShareManagement, setOpenShareManagement] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedReports, setExpandedReports] = useState({});

  const fetchTasks = async (p = taskPage, ps = taskPageSize, isSilent = false) => {
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) {
      setTasks([]);
      setTaskTotal(0);
      setLoadingTasks(false);
      return;
    }
    // 仅在无既有数据且非静默时展示骨架加载态，彻底避免定时轮询时列表频繁闪烁
    if (!isSilent && tasks.length === 0) {
      setLoadingTasks(true);
    }
    try {
      const res = await apiClient.get(`/v1/tasks/list?exclude_completed=true&page=${p}&page_size=${ps}`);
      const list = (res.items || res.data || []).filter(t => t.status !== 'completed');
      setTasks(list);
      setTaskTotal(typeof res.total === 'number' ? res.total : list.length);
    } catch (err) {
      console.error('获取任务列表失败:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const fetchReports = async (p = reportPage, ps = reportPageSize, kw = reportKeyword, isSilent = false) => {
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) {
      setReports([]);
      setReportTotal(0);
      setLoadingReports(false);
      return;
    }
    // 仅在无既有报告且非静默时展示骨架加载态
    if (!isSilent && reports.length === 0) {
      setLoadingReports(true);
    }
    try {
      let url = `/v1/reports/list?page=${p}&page_size=${ps}&`;
      if (kw) url += `keyword=${encodeURIComponent(kw.trim())}&`;
      if (reportRiskFilter) url += `risk_level=${encodeURIComponent(reportRiskFilter)}&`;
      const res = await apiClient.get(url);
      const list = res.items || res.data || [];
      // 严格保证按生成时间从新到旧 (最新在前) 倒序排列
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setReports(list);
      setReportTotal(typeof res.total === 'number' ? res.total : list.length);
    } catch (err) {
      console.error('获取报告列表失败:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  // 统一的手动平滑刷新（保持当前数据在屏，仅旋转按钮图标，无白屏闪烁）
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchTasks(taskPage, taskPageSize, true),
        fetchReports(reportPage, reportPageSize, reportKeyword, true)
      ]);
      message.success('已刷新最新尽调数据');
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
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
            fetchReports();
          }
        } catch (err) {
          message.error('删除任务失败: ' + (err.response?.data?.detail || err.message));
        }
      }
    });
  };

  // 用户认证就绪或过滤条件变更时，同时拉取两边数据，确保两边 Tab 徽标实时准确
  useEffect(() => {
    if (authLoading) return;
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) {
      setTasks([]);
      setTaskTotal(0);
      setReports([]);
      setReportTotal(0);
      setLoadingTasks(false);
      setLoadingReports(false);
      return;
    }
    fetchTasks(taskPage, taskPageSize);
    fetchReports(reportPage, reportPageSize);
  }, [user, authLoading, reportRiskFilter]);

  // 切换 Tab 或分页时定向刷新当前 Tab
  useEffect(() => {
    if (authLoading) return;
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) return;

    if (activeTab === 'tasks') {
      fetchTasks(taskPage, taskPageSize);
    } else {
      fetchReports(reportPage, reportPageSize);
    }
  }, [activeTab, taskPage, taskPageSize, reportPage, reportPageSize]);

  // 定时静默轮询：无论当前在哪个 Tab，每 4 秒定时静默拉取最新尽调任务与报告列表，实时同步最新数据且绝无全屏闪烁
  useEffect(() => {
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) return;

    const interval = setInterval(() => {
      // 保持进行中尽调任务与历史报告数据实时同步，不打扰用户操作
      fetchTasks(taskPage, taskPageSize, true);
      fetchReports(reportPage, reportPageSize, reportKeyword, true);
    }, 4000);

    return () => clearInterval(interval);
  }, [user, taskPage, taskPageSize, reportPage, reportPageSize, reportKeyword]);

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
          await fetchTasks(taskPage, taskPageSize, true);
          await fetchReports(reportPage, reportPageSize, reportKeyword, true);
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

  // 监听轮询微风企授权是否在其他窗口/手机完成
  useEffect(() => {
    if (!selectedTaskForAuth || selectedTaskForAuth.status !== 'waiting_auth') return;
    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/v1/tasks/${selectedTaskForAuth.id}`);
        if (res.code === 0 && res.data?.auth_status === 'authorized') {
          message.success('已接收到微风企授权完成回调！AI 全景尽调流水线已启动。');
          setSelectedTaskForAuth(null);
          await fetchTasks(taskPage, taskPageSize, true);
          await fetchReports(reportPage, reportPageSize, reportKeyword, true);
        }
      } catch (err) {
        console.debug(err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedTaskForAuth, taskPage, taskPageSize, reportPage, reportPageSize, reportKeyword]);

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

  if (!authLoading && !user) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-20 text-center">
        <div className="max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-white/80 backdrop-blur-xl border border-white/90 shadow-glass space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-cyan-50 border border-cyan-200/80 text-[#0096DB] flex items-center justify-center shadow-xs">
            <FolderLock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-bold text-slate-950">请先登录账号</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              任务与报告资产中心需登录后调阅您名下的尽调任务、授权状态及已出具的历史报告。
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={openLoginModal}
              className="shadcn-button-primary inline-flex items-center justify-center gap-2 w-full py-2.5 text-xs font-semibold shadow-xs cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>立即登录 / 注册</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 text-slate-900">
      
      {/* 头部标题与操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200/80">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-950 flex items-center gap-2 tracking-tight">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-sky-400 to-[#0ea5e9] text-white flex items-center justify-center shadow-xs border border-white/50 backdrop-blur-md shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <span>尽调任务与报告资产中心</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            一站式管理：实时处理进行中的尽调授权，随时调阅历史全量尽调报告与存证底稿
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setOpenShareManagement(true)}
            className="shadcn-button-outline text-xs py-1.5 px-2.5 sm:px-3 flex items-center gap-1.5 hover:border-[#0ea5e9] hover:text-[#0284c7] shadow-xs"
            title="查看与管理我创建的报告加密分享"
          >
            <FolderLock className="w-3.5 h-3.5 text-[#0ea5e9]" />
            <span>分享管理</span>
          </button>

          <button 
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="shadcn-button-outline text-xs py-1.5 px-2.5 sm:px-3 shadow-xs hover:border-[#0ea5e9] hover:text-[#0284c7] cursor-pointer flex items-center gap-1.5"
            title="刷新最新数据"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin text-[#0096DB]' : ''}`} />
            <span>刷新</span>
          </button>

          <Link
            to="/app"
            className="shadcn-button-primary text-xs py-1.5 px-3 sm:px-3.5"
          >
            <span>发起新尽调</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 玻璃拟态 Tabs 胶囊切换栏 */}
      <div className="mt-4 sm:mt-6 flex items-center bg-slate-200/60 backdrop-blur-xl p-1 rounded-xl w-full sm:w-fit border border-white/60 shadow-xs">
        <button
          type="button"
          onClick={() => switchTab('tasks')}
          className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-white text-[#0284c7] font-semibold shadow-xs border border-white/80 backdrop-blur-md'
              : 'text-slate-600 hover:text-[#0ea5e9] hover:bg-white/40 border border-transparent'
          }`}
        >
          <Activity className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'tasks' ? 'text-[#0ea5e9]' : 'text-slate-500'}`} />
          <span className="whitespace-nowrap">进行中的尽调</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${
            activeTab === 'tasks' ? 'bg-cyan-50 text-[#0284c7] border border-cyan-200/60' : 'bg-slate-300/80 text-slate-700'
          }`}>
            {taskTotal ?? activeTasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('reports')}
          className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-white text-[#0284c7] font-semibold shadow-xs border border-white/80 backdrop-blur-md'
              : 'text-slate-600 hover:text-[#0ea5e9] hover:bg-white/40 border border-transparent'
          }`}
        >
          <FileText className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'reports' ? 'text-[#0ea5e9]' : 'text-slate-500'}`} />
          <span className="whitespace-nowrap">历史尽调报告</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${
            activeTab === 'reports' ? 'bg-cyan-50 text-[#0284c7] border border-cyan-200/60' : 'bg-slate-300/80 text-slate-700'
          }`}>
            {reportTotal ?? reports.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 进行中的尽调任务 */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="mt-6 space-y-4">
          {loadingTasks && tasks.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0096DB]" />
              <span>正在加载进行中的尽调任务...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="shadcn-card p-12 text-center bg-white/80 backdrop-blur-xl space-y-4 border border-white/80 shadow-glass">
              <div className="w-12 h-12 rounded-lg bg-cyan-50/80 border border-cyan-100 flex items-center justify-center mx-auto text-[#0096DB] shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">当前暂无进行中的尽调任务</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                所有已生成的尽调报告均已自动归档至【历史尽调报告资产库】中，可随时调阅或导出。
              </p>
              <Link 
                to="/app"
                className="shadcn-button-primary inline-flex items-center gap-1.5 text-xs py-2 px-4 shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>发起新的企业尽调</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {tasks.map((task) => (
                  <div key={task.id} className="shadcn-card-hover p-5 bg-white/80 backdrop-blur-xl space-y-4 border border-white/85 shadow-glass hover:shadow-glass-hover">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-base font-bold text-slate-950 flex items-center gap-2">
                            <Building className="w-4 h-4 text-[#0096DB]" />
                            {task.company_name}
                          </h3>
                          {getStatusBadge(task.status)}
                        </div>
                        <p className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>任务单号: <strong className="text-slate-800">{task.task_no || task.id}</strong></span>
                          <span>统一代码: <strong className="text-slate-800">{task.credit_code}</strong></span>
                          <span>创建时间: {formatLocalTime(task.created_at)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {/* 状态操作按钮 */}
                        {task.status === 'waiting_auth' && (
                          <button
                            type="button"
                            onClick={() => setSelectedTaskForAuth(task)}
                            className="shadcn-button-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>查看授权码 / 二维码</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleSyncTask(task)}
                          disabled={syncingTaskId === task.id}
                          className="shadcn-button-outline text-xs py-1.5 px-2.5 flex items-center gap-1.5 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs"
                          title="刷新/同步三方授权状态"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingTaskId === task.id ? 'animate-spin text-[#0096DB]' : 'text-slate-500'}`} />
                          <span>同步状态</span>
                        </button>
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
                ))}
              </div>

              {/* 任务列表分页组件 */}
              {taskTotal > 0 && (
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80">
                  <span className="text-xs text-slate-500 font-mono">
                    共计 <strong className="text-slate-800 font-semibold">{taskTotal}</strong> 个尽调任务
                  </span>
                  <Pagination
                    current={taskPage}
                    pageSize={taskPageSize}
                    total={taskTotal}
                    showSizeChanger={true}
                    responsive={false}
                    pageSizeOptions={['8', '16', '32', '50']}
                    onChange={(p, ps) => {
                      setTaskPage(p);
                      setTaskPageSize(ps);
                    }}
                    size="small"
                  />
                </div>
              )}
            </div>
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
            <form onSubmit={(e) => { e.preventDefault(); setReportPage(1); fetchReports(1, reportPageSize); }} className="flex items-center w-full bg-white/60 backdrop-blur-md rounded-md px-3 py-1.5 border border-slate-200/80 focus-within:border-[#0096DB] focus-within:ring-2 focus-within:ring-[#0096DB]/20 transition-all">
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
                  onClick={() => { setReportKeyword(''); setReportPage(1); fetchReports(1, reportPageSize, ''); }}
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
          {loadingReports && reports.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0096DB]" />
              <span>正在加载企业尽调报告...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="shadcn-card p-12 text-center bg-white/80 backdrop-blur-xl space-y-3 border border-white/80 shadow-glass">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">未检索到历史尽调报告</h3>
              <p className="text-xs text-slate-500">发起新尽调并完成法人授权后，生成的报告将永久留存于此资产库中。</p>
            </div>
          ) : (
            <div className="space-y-4">
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

                      <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* 6位密码加密分享入口 */}
                        <button
                          type="button"
                          onClick={() => setSelectedReportForShare(report)}
                          className="flex-1 sm:flex-initial shadcn-button-outline text-xs py-1.5 px-2.5 sm:px-3 flex items-center justify-center gap-1 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs"
                          title="设置 6 位密码加密分享此报告"
                        >
                          <Share2 className="w-3.5 h-3.5 text-[#0096DB]" />
                          <span>分享</span>
                        </button>

                        <a
                          href={report.pdf_url || '/sample_report.pdf'}
                          download={`${report.company_name}_尽调报告.pdf`}
                          className="flex-1 sm:flex-initial shadcn-button-outline text-xs py-1.5 px-2.5 sm:px-3 flex items-center justify-center gap-1 shadow-xs hover:border-[#0096DB] hover:text-[#0096DB]"
                        >
                          <Download className="w-3.5 h-3.5 text-slate-600" />
                          <span>下载PDF</span>
                        </a>

                        <Link
                          to={`/app/reports/${report.id}`}
                          className="w-full sm:w-auto shadcn-button-primary text-xs py-1.5 px-3.5 flex items-center justify-center gap-1.5"
                        >
                          <span>在线查阅</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* AI 综合画像可视化速览卡片 (默认最多显示约 3 行，支持一键展开/收起) */}
                    {report.summary_ai_comment && (() => {
                      const isExpanded = !!expandedReports[report.id];
                      return (
                        <div className="p-3 sm:p-3.5 bg-gradient-to-br from-cyan-50/30 via-slate-50/60 to-white rounded-xl border border-cyan-100/80 shadow-2xs space-y-1.5">
                          <div className="flex items-center justify-between border-b border-cyan-100/60 pb-1.5">
                            <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-md bg-[#0096DB] text-white flex items-center justify-center shadow-2xs shrink-0">
                                <Sparkles className="w-2.5 h-2.5 text-white animate-pulse" />
                              </div>
                              <span>AI 全景综合尽调研判画像结论</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="hidden sm:inline-block text-[10px] text-[#0070a4] font-medium bg-cyan-100/60 px-1.5 py-0.5 rounded border border-cyan-200/50">
                                智评大模型
                              </span>
                              <button
                                type="button"
                                onClick={() => setExpandedReports(prev => ({ ...prev, [report.id]: !prev[report.id] }))}
                                className="text-[11px] text-[#0096DB] hover:text-[#0070a4] font-medium flex items-center gap-0.5 cursor-pointer select-none px-1 py-0.5 rounded hover:bg-cyan-50"
                              >
                                <span>{isExpanded ? '收起' : '展开全文'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          <div className="relative">
                            <div 
                              className={`ai-markdown-content text-xs text-slate-700 leading-snug transition-all duration-200 ${
                                isExpanded ? '' : 'max-h-[4.2rem] overflow-hidden line-clamp-3'
                              }`}
                              dangerouslySetInnerHTML={{ __html: renderMarkdown(report.summary_ai_comment) }}
                            />
                            {!isExpanded && (
                              <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-white/90 to-transparent pointer-events-none" />
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {/* 报告资产库分页换页组件 */}
              {reportTotal > 0 && (
                <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-200/80">
                  <span className="text-xs text-slate-500 font-mono">
                    共计 <strong className="text-slate-800 font-semibold">{reportTotal}</strong> 份企业尽调报告
                  </span>
                  <Pagination
                    current={reportPage}
                    pageSize={reportPageSize}
                    total={reportTotal}
                    showSizeChanger={true}
                    responsive={false}
                    pageSizeOptions={['8', '16', '32', '50']}
                    onChange={(p, ps) => {
                      setReportPage(p);
                      setReportPageSize(ps);
                    }}
                    size="small"
                  />
                </div>
              )}
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
                if (currentHost && currentHost !== 'localhost' && currentHost !== '127.0.0.1' && !currentHost.startsWith('198.18.')) {
                  return url.replace(/127\.0\.0\.1|localhost|198\.18\.\d+\.\d+/g, currentHost);
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
