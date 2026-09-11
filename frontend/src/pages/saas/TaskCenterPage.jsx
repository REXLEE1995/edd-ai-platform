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
  FolderLock,
  RotateCw,
  Loader2,
  LogIn,
  ChevronDown,
  ChevronUp,
  Settings,
  Key,
  Eye
} from 'lucide-react';
import { message, Modal, Pagination, Alert } from 'antd';
import apiClient, { generateRequestId } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatLocalTime } from '../../utils/date';
import { marked } from 'marked';

// 4 步标准尽调全流程节点配置（C端友好展示）
const DD_STEPS = [
  {
    step: 1,
    title: '授权信息',
    status_desc: '专属实名授权通道已就绪，等待法定代表人完成授权认证...',
    percentage: 25,
    icon: Key,
    emoji: '🔑'
  },
  {
    step: 2,
    title: '数据获取',
    status_desc: '法人授权核验通过！正在自适应归集企业涉税及风控底册（通常耗时 1~10 分钟，可离开页面）...',
    percentage: 50,
    icon: Download,
    emoji: '📥'
  },
  {
    step: 3,
    title: 'AI 研判',
    status_desc: '正在进行坐标布局对齐与大纲解析，大模型正在并行计算 AI 风险洞察...',
    percentage: 75,
    icon: Sparkles,
    emoji: '🤖'
  },
  {
    step: 4,
    title: '报告生成',
    status_desc: '尽调分析报告与 Markdown 知识库构建完毕，已安全归档存证。',
    percentage: 100,
    icon: CheckCircle2,
    emoji: '✅'
  }
];

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

  // 3. 已读报告追踪（服务端数据库落库持久化 + 前端内存乐观即时更新）
  const [localReadIds, setLocalReadIds] = useState([]);

  const markReportAsRead = async (reportId) => {
    if (!reportId) return;
    const strId = String(reportId);

    // 1. 内存与列表状态乐观更新：即刻消除红点，无任何 UI 卡顿
    setLocalReadIds(prev => (prev.includes(strId) ? prev : [...prev, strId]));
    setReports(prev =>
      prev.map(r =>
        String(r.id) === strId || String(r.report_no) === strId || String(r.task_id) === strId
          ? { ...r, is_read: true }
          : r
      )
    );

    // 2. 异步上报后端数据库落库，确保强刷浏览器缓存及跨设备状态完全同步
    try {
      await apiClient.post(`/v1/reports/${encodeURIComponent(strId)}/read`);
    } catch (err) {
      console.debug('异步上报报告已读状态异常 (静默容错):', err);
    }
  };

  const isNewReport = (report) => {
    if (!report) return false;
    // 若服务端数据库已记录为已读，则绝不显示“新”标识
    if (report.is_read) return false;
    const rId = String(report.id || '');
    const rNo = String(report.report_no || '');
    const tId = String(report.task_id || '');
    if (
      (rId && localReadIds.includes(rId)) ||
      (rNo && localReadIds.includes(rNo)) ||
      (tId && localReadIds.includes(tId))
    ) {
      return false;
    }
    return true;
  };

  const fetchTaskTotalOnly = async () => {
    try {
      const res = await apiClient.get('/v1/tasks/list?exclude_completed=true&page=1&page_size=1');
      const rawList = res?.items || (Array.isArray(res?.data) ? res.data : res?.data?.items) || [];
      const total = typeof res?.total === 'number'
        ? res.total
        : (typeof res?.data?.total === 'number' ? res.data.total : rawList.length);
      setTaskTotal(total);
    } catch (err) {
      console.debug('获取任务总数失败:', err);
    }
  };

  const fetchReportTotalOnly = async () => {
    try {
      const res = await apiClient.get('/v1/reports/list?page=1&page_size=1');
      const rawList = res?.items || (Array.isArray(res?.data) ? res.data : res?.data?.items) || [];
      const total = typeof res?.total === 'number'
        ? res.total
        : (typeof res?.data?.total === 'number' ? res.data.total : rawList.length);
      setReportTotal(total);
    } catch (err) {
      console.debug('获取报告总数失败:', err);
    }
  };

  const switchTab = (tabKey) => {
    setActiveTab(tabKey);
    navigate(`/app/tasks?tab=${tabKey}`, { replace: true });
    if (tabKey === 'tasks') {
      lastTaskReqKeyRef.current = '';
      fetchTasks(taskPage, taskPageSize, false);
      fetchReportTotalOnly();
    } else if (tabKey === 'reports') {
      lastReportReqKeyRef.current = '';
      fetchReports(reportPage, reportPageSize, reportKeyword, false);
      fetchTaskTotalOnly();
    }
  };

  const remoteApiHost = (typeof window !== 'undefined' && window.APP_CONFIG?.API_BASE_URL)
    ? window.APP_CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')
    : 'http://192.168.110.234:8000';

  // 1. 任务数据与分页
  const [tasks, setTasks] = useState([]);
  const [taskTotal, setTaskTotal] = useState(0);
  const [taskPage, setTaskPage] = useState(1);
  const [taskPageSize, setTaskPageSize] = useState(8);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [selectedTaskForAuth, setSelectedTaskForAuth] = useState(null);
  const [syncingTaskId, setSyncingTaskId] = useState(null);
  const [retryingAnalysisTaskId, setRetryingAnalysisTaskId] = useState(null);
  const [reauthingTaskId, setReauthingTaskId] = useState(null);
  const [cancellingTaskId, setCancellingTaskId] = useState(null);

  // 2. 报告资产数据与分页
  const [reports, setReports] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(8);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportKeyword, setReportKeyword] = useState('');
  const [reportRiskFilter, setReportRiskFilter] = useState('');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedReports, setExpandedReports] = useState({});
  const [expandedTaskLogs, setExpandedTaskLogs] = useState({});
  const [taskProgressMap, setTaskProgressMap] = useState({});

  const toggleTaskLogs = (taskId) => {
    setExpandedTaskLogs(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const isFetchingTasksRef = useRef(false);
  const isFetchingReportsRef = useRef(false);

  const fetchTasks = async (p = taskPage, ps = taskPageSize, isSilent = false) => {
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) {
      setTasks([]);
      setTaskTotal(0);
      setLoadingTasks(false);
      return;
    }
    if (isFetchingTasksRef.current) return;
    isFetchingTasksRef.current = true;

    // 仅在无既有数据且非静默时展示骨架加载态，彻底避免定时轮询时列表频繁闪烁
    if (!isSilent && tasks.length === 0) {
      setLoadingTasks(true);
    }
    try {
      const res = await apiClient.get(`/v1/tasks/list?exclude_completed=true&page=${p}&page_size=${ps}`);
      const rawList = res?.items || (Array.isArray(res?.data) ? res.data : res?.data?.items) || [];
      const list = Array.isArray(rawList) ? rawList : [];
      const newTotal = typeof res?.total === 'number' 
        ? res.total 
        : (typeof res?.data?.total === 'number' ? res.data.total : list.length);
      
      setTasks(list);
      setTaskTotal(newTotal);
    } catch (err) {
      console.error('获取任务列表失败:', err);
    } finally {
      setLoadingTasks(false);
      isFetchingTasksRef.current = false;
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
    if (isFetchingReportsRef.current) return;
    isFetchingReportsRef.current = true;

    // 仅在无既有报告且非静默时展示骨架加载态
    if (!isSilent && reports.length === 0) {
      setLoadingReports(true);
    }
    try {
      let url = `/v1/reports/list?page=${p}&page_size=${ps}&`;
      if (kw) url += `keyword=${encodeURIComponent(kw.trim())}&`;
      if (reportRiskFilter) url += `risk_level=${encodeURIComponent(reportRiskFilter)}&`;
      const res = await apiClient.get(url);
      const rawList = res?.items || (Array.isArray(res?.data) ? res.data : res?.data?.items) || [];
      const list = Array.isArray(rawList) ? [...rawList] : [];
      // 严格保证按生成时间从新到旧 (最新在前) 倒序排列
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setReports(list);
      const newTotal = typeof res?.total === 'number' 
        ? res.total 
        : (typeof res?.data?.total === 'number' ? res.data.total : list.length);
      setReportTotal(newTotal);
    } catch (err) {
      console.error('获取报告列表失败:', err);
    } finally {
      setLoadingReports(false);
      isFetchingReportsRef.current = false;
    }
  };

  // 统一的手动平滑刷新（仅针对当前活动 Tab 进行平滑刷新，绝不触碰另一 Tab）
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (activeTab === 'tasks') {
        await fetchTasks(taskPage, taskPageSize, true);
        message.success('已刷新进行中的尽调数据');
      } else {
        await fetchReports(reportPage, reportPageSize, reportKeyword, true);
        message.success('已刷新历史尽调报告');
      }
    } catch (err) {
      console.error('刷新失败:', err);
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // 智能推断任务当前执行节点序号 (1: 授权信息 25%, 2: 数据获取 50%, 3: AI 研判 75%, 4: 报告生成 100%)
  const inferTaskStep = (data) => {
    if (!data) return 1;

    // 1. 已完成状态或已有报告 -> 100% 报告生成完毕
    if (
      data.is_completed ||
      data.status === 'completed' ||
      data.report_id ||
      (typeof data.percentage === 'number' && data.percentage >= 100 && data.status !== 'failed')
    ) {
      return 4;
    }

    // 2. 授权相关状态 -> 固定步骤 1
    if (data.status === 'waiting_auth' || data.status === 'auth_failed') {
      return 1;
    }

    // 3. 明确给出了可重试步骤序号 next_retry_step (1 ~ 4)
    if (typeof data.next_retry_step === 'number' && data.next_retry_step >= 1 && data.next_retry_step <= 4) {
      return data.next_retry_step;
    }

    // 4. 显式重试步骤标题 / 步骤标题判断
    const titleCandidates = [data.next_retry_step_title, data.step_title].filter(Boolean);
    for (const t of titleCandidates) {
      if (/AI|研判|大模型|智能体|审贷/i.test(t)) return 3;
      if (/报告|全景底稿|生成/i.test(t)) return 4;
      if (/数据|获取|涉税|工商|底册|归集/i.test(t)) return 2;
      if (/授权/i.test(t)) return 1;
    }

    // 5. 进行中状态显式匹配
    if (data.status === 'ai_analyzing') return 3;
    if (data.status === 'pulling_data') return 2;
    if (data.status === 'generating_report') return 4;

    // 6. 明确给出了当前步骤序号 (1 ~ 4)
    if (typeof data.step === 'number' && data.step >= 1 && data.step <= 4) {
      return data.step;
    }

    // 7. 按上一成功节点推断 (失败/中断时的下一待重试节点 = last_successful_step + 1)
    if (typeof data.last_successful_step === 'number' && data.last_successful_step >= 1 && data.last_successful_step < 4) {
      return Math.min(4, data.last_successful_step + 1);
    }
    if (data.last_successful_step_title) {
      if (/数据|获取|涉税|工商/i.test(data.last_successful_step_title)) return 3;
      if (/授权/i.test(data.last_successful_step_title)) return 2;
      if (/AI|研判/i.test(data.last_successful_step_title)) return 4;
    }

    // 8. 结合最新思维日志或错误文案关键词推断
    const allLogs = [
      ...(Array.isArray(data.thinking_logs) ? data.thinking_logs : []),
      ...(Array.isArray(data.raw_thinking_logs) ? data.raw_thinking_logs : []),
      ...(Array.isArray(data.sanitized_logs) ? data.sanitized_logs : []),
      ...(Array.isArray(data.logs) ? data.logs : [])
    ];
    const lastLogText = allLogs.slice(-3).map(l => (typeof l === 'string' ? l : (l?.content || ''))).join(' ');
    const contextText = `${data.error_message || ''} ${data.error || ''} ${data.status_desc || ''} ${lastLogText}`;
    if (/AI|研判|大模型|智能体|审贷|模型推理|Prompt|Token/i.test(contextText)) return 3;
    if (/涉税|工商|归集|底册|拉取数据|数据通道/i.test(contextText)) return 2;

    // 9. 失败状态下兜底：尽调任务失败通常发生在 AI 研判阶段
    if (data.status === 'failed') {
      if (typeof data.percentage === 'number') {
        if (data.percentage >= 70) return 3;
        if (data.percentage >= 40) return 2;
      }
      return 3;
    }

    // 10. 按已有的百分比推断
    if (typeof data.percentage === 'number') {
      if (data.percentage >= 90) return 4;
      if (data.percentage >= 70) return 3;
      if (data.percentage >= 40) return 2;
      return 1;
    }

    return 2;
  };

  // 1. 重新发起报告分析（针对 status === 'failed' 或 can_retry === true，按 V2.0 规范从断点节点继续执行）
  const handleRetryAnalysis = async (task) => {
    setRetryingAnalysisTaskId(task.id);
    const resumeStep = inferTaskStep(task);
    const resumeStepTitle = task?.next_retry_step_title || DD_STEPS[resumeStep - 1]?.title || (resumeStep === 3 ? 'AI 研判' : (resumeStep === 4 ? '报告生成' : '数据获取'));
    const retryReqId = generateRequestId('req-retry');

    // 立即乐观更新本地状态为进行中，让节点立刻进入【转圈加载进行中】状态，提供零延迟视觉反馈
    setTaskProgressMap(prev => ({
      ...prev,
      [task.id]: {
        ...(prev[task.id] || {}),
        status: resumeStep === 3 ? 'ai_analyzing' : (resumeStep === 4 ? 'generating_report' : 'pulling_data'),
        step: resumeStep,
        step_title: resumeStepTitle,
        percentage: DD_STEPS[resumeStep - 1]?.percentage || 75,
        can_retry: false,
        error_message: null,
        latest_request_id: retryReqId,
        status_desc: `正在从【${resumeStepTitle}】节点继续执行风控流水线...`
      }
    }));

    try {
      const res = await apiClient.post(
        `/v1/tasks/${task.id}/retry-analysis`,
        {},
        { headers: { 'X-Request-ID': retryReqId } }
      );
      if (res.code === 0 || res.status === 'success' || !res.code) {
        message.success(res.message || `任务已重新启动，将从【${resumeStepTitle}】节点继续执行！`);
        // 立即刷新任务列表，直接根据列表数据驱动展示最新节点
        await fetchTasks(taskPage, taskPageSize, true);
      } else {
        message.error(res.message || '重新发起报告分析失败');
        await fetchTasks(taskPage, taskPageSize, true);
      }
    } catch (err) {
      console.error('重试分析失败:', err);
      const errDetail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || '重试分析失败，请检查网络或尽调额度';
      message.error(errDetail);
      await fetchTasks(taskPage, taskPageSize, true);
    } finally {
      setRetryingAnalysisTaskId(null);
      // 清理临时乐观状态，使页面完全由最新拉取到的服务端真实状态接管，杜绝脏状态残留
      setTaskProgressMap(prev => {
        if (!prev[task.id]) return prev;
        const next = { ...prev };
        delete next[task.id];
        return next;
      });
    }
  };

  // 2. 重新发起授权（针对 status === 'waiting_auth' 或 'auth_failed'，重新获取专属授权链接与二维码）
  const handleReauthTask = async (task) => {
    setReauthingTaskId(task.id);
    try {
      const res = await apiClient.post(`/v1/tasks/${task.id}/reauth`);
      if (res.code === 0 || res.status === 'success' || !res.code) {
        message.success(res.message || '已重新生成法人专属实名授权链接与二维码！');
        const updatedTask = res.data ? { ...task, ...res.data, status: 'waiting_auth' } : { ...task, status: 'waiting_auth' };
        setSelectedTaskForAuth(updatedTask);
        await fetchTasks(taskPage, taskPageSize, true);
      } else {
        message.error(res.message || '重新发起授权失败');
      }
    } catch (err) {
      console.error('重新发起授权失败:', err);
      const errDetail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || '重新发起授权失败';
      message.error(errDetail);
    } finally {
      setReauthingTaskId(null);
    }
  };

  // 3. 取消任务并退还额度（针对 waiting_auth 或 auth_failed，流转为 cancelled 并退还额度）
  const handleCancelTask = async (task) => {
    Modal.confirm({
      title: '确认取消此尽调任务？',
      content: `企业主体：${task.company_name}（单号: ${task.task_no || task.id}），取消后任务将停止等待并归档为已取消状态，未消耗的尽调额度将原路退还至您的账户。`,
      okText: '确认取消',
      okType: 'danger',
      cancelText: '暂不取消',
      onOk: async () => {
        setCancellingTaskId(task.id);
        try {
          const res = await apiClient.post(`/v1/tasks/${task.id}/cancel`);
          if (res.code === 0 || res.status === 'success' || !res.code) {
            message.success(res.message || '任务已取消，尽调额度已退还');
            if (selectedTaskForAuth && selectedTaskForAuth.id === task.id) {
              setSelectedTaskForAuth(null);
            }
            await fetchTasks(taskPage, taskPageSize, true);
          } else {
            message.error(res.message || '取消任务失败');
          }
        } catch (err) {
          console.error('取消任务失败:', err);
          const errDetail = err?.response?.data?.detail || err?.response?.data?.message || err?.message || '取消任务失败';
          message.error(errDetail);
        } finally {
          setCancellingTaskId(null);
        }
      }
    });
  };

  // 严格按当前活动 Tab 定向拉取与防重签名：
  // 1) 处于 reports Tab 时只查报告列表，杜绝向后端发送 tasks 接口；
  // 2) 处于 tasks Tab 时只查任务列表，杜绝向后端发送 reports 接口；
  const lastTaskReqKeyRef = useRef('');
  const lastReportReqKeyRef = useRef('');

  // 1. 任务列表数据加载（进入 tasks Tab 时拉取最新数据）
  useEffect(() => {
    if (authLoading || activeTab !== 'tasks') return;
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) {
      setTasks([]);
      setTaskTotal(0);
      setLoadingTasks(false);
      return;
    }

    fetchTasks(taskPage, taskPageSize);
    fetchReportTotalOnly();
  }, [activeTab, taskPage, taskPageSize, user?.id, authLoading]);

  // 2. 报告列表数据加载（进入 reports Tab 时拉取最新数据）
  useEffect(() => {
    if (authLoading || activeTab !== 'reports') return;
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) {
      setReports([]);
      setReportTotal(0);
      setLoadingReports(false);
      return;
    }

    fetchReports(reportPage, reportPageSize, reportKeyword);
    fetchTaskTotalOnly();
  }, [activeTab, reportPage, reportPageSize, reportRiskFilter, reportKeyword, user?.id, authLoading]);

  // 3. 监听全局用户登录/登出事件：登录时仅刷新当前活动 Tab，登出时清空数据
  useEffect(() => {
    const handleLoginEvent = () => {
      lastTaskReqKeyRef.current = '';
      lastReportReqKeyRef.current = '';
      taskCountQueriedRef.current = false;
      reportCountQueriedRef.current = false;
      const token = localStorage.getItem('edd_user_token');
      if (token) {
        if (activeTab === 'tasks') {
          setTaskPage(1);
          fetchTasks(1, taskPageSize, false);
        } else {
          setReportPage(1);
          fetchReports(1, reportPageSize, reportKeyword, false);
        }
      }
    };
    const handleLogoutEvent = () => {
      lastTaskReqKeyRef.current = '';
      lastReportReqKeyRef.current = '';
      taskCountQueriedRef.current = false;
      reportCountQueriedRef.current = false;
      setTasks([]);
      setTaskTotal(0);
      setReports([]);
      setReportTotal(0);
      setLoadingTasks(false);
      setLoadingReports(false);
    };

    window.addEventListener('auth:user_login', handleLoginEvent);
    window.addEventListener('auth:user_logout', handleLogoutEvent);
    return () => {
      window.removeEventListener('auth:user_login', handleLoginEvent);
      window.removeEventListener('auth:user_logout', handleLogoutEvent);
    };
  }, [activeTab, taskPageSize, reportPageSize, reportKeyword]);

  // 4. 各 Tab 独立心跳轮询机制（严格按当前活动 Tab 定向静默心跳，且若正在请求中则不重复堆叠）：
  // - 处于「进行中的尽调 (tasks)」Tab 时：每 5 秒心跳静默刷新任务进度，严格只查任务，绝不查报告
  // - 处于「历史尽调报告 (reports)」Tab 时：每 5 秒心跳静默刷新报告资产，严格只查报告，绝不查任务
  useEffect(() => {
    const token = localStorage.getItem('edd_user_token');
    if (!user && !token) return;

    const interval = setInterval(() => {
      if (activeTab === 'tasks' && !isFetchingTasksRef.current) {
        fetchTasks(taskPage, taskPageSize, true);
      } else if (activeTab === 'reports' && !isFetchingReportsRef.current) {
        fetchReports(reportPage, reportPageSize, reportKeyword, true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, activeTab, taskPage, taskPageSize, reportPage, reportPageSize, reportKeyword]);



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

  const getTaskLatestLog = (task) => {
    const pData = taskProgressMap[task?.id];
    const candidateSources = [
      task?.raw_thinking_logs,
      task?.sanitized_logs,
      task?.thinking_logs,
      task?.logs,
      task?.raw_logs,
      task?.step_history,
      pData?.thinking_logs,
      pData?.logs
    ];

    for (const src of candidateSources) {
      if (Array.isArray(src) && src.length > 0) {
        for (let i = src.length - 1; i >= 0; i--) {
          const item = src[i];
          const content = typeof item === 'string' ? item : (item?.content || item?.it || item?.text || item?.message || item?.msg || item?.title || '');
          if (content && typeof content === 'string' && content.trim()) {
            return {
              time: item?.time || '',
              content: content.trim()
            };
          }
        }
      } else if (typeof src === 'string' && src.trim().length > 0) {
        const lines = src.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length > 0) {
          return {
            time: '',
            content: lines[lines.length - 1]
          };
        }
      }
    }

    if (task?.error_message || task?.error) {
      return { time: '', content: task.error_message || task.error };
    }
    if (task?.status === 'pulling_data') {
      return { time: '', content: '正在向涉税中台拉取尽调底稿数据通道，建立安全密文传输管道...' };
    }
    if (task?.status === 'ai_analyzing') {
      return { time: '', content: '启动全景风控大模型智能体，执行全维度审贷逻辑推理与综合风控裁决...' };
    }
    if (task?.status === 'waiting_auth') {
      return { time: '', content: '已生成专属实名数据授权通道，等待企业法定代表人微信扫码确认授权。' };
    }
    return { time: '', content: '正在调度智能风控流水线...' };
  };

  const getTaskErrorMessage = (task) => {
    if (!task) return '尽调任务执行遇到异常，系统已自动全额退还您的尽调额度。';
    if (task.error_message || task.error) return task.error_message || task.error;
    if (task.status === 'auth_failed') {
      return '法定代表人实名授权二维码已过期或授权未在时效内完成，您可以重新发起授权获取新二维码。';
    }
    return '尽调任务执行遇到异常，系统已自动全额退还您的尽调额度。您可以点击【一键重试分析】快速恢复，或核对企业信息后重新发起。';
  };

  const getTaskProgressInfo = (task) => {
    const pData = taskProgressMap[task?.id];
    // 直接根据任务列表数据驱动，合并本地临时操作状态 (如重试点击的瞬间视觉反馈)
    const data = { ...task, ...pData };

    const isRetrying = retryingAnalysisTaskId === task?.id;

    const isCompleted = Boolean(
      !isRetrying && (
        data.is_completed || 
        data.status === 'completed' || 
        data.report_id || 
        (typeof data.percentage === 'number' && data.percentage >= 100 && data.status !== 'failed')
      )
    );

    const isFailed = !isRetrying && (data.status === 'failed' || data.status === 'auth_failed');
    // canRetry 专用于数据获取、AI 研判与报告组装等计算流水线断点重试，排除实名授权失效（auth_failed 走专属授权重试逻辑）
    const canRetry = Boolean(!isRetrying && data.status !== 'auth_failed' && (data.can_retry || data.status === 'failed'));
    const isWaitingAuth = !isRetrying && (data.status === 'waiting_auth');

    // 智能推断当前步骤序号 (1: 授权信息 25%, 2: 数据获取 50%, 3: AI 研判 75%, 4: 报告生成 100%)
    const currentStep = isCompleted ? 4 : inferTaskStep(data);
    const stepConfig = DD_STEPS[currentStep - 1] || DD_STEPS[0];
    const title = stepConfig.title;

    // 确定进度百分比 (25, 50, 75, 100)，严格与步骤对齐，彻底杜绝百分比与节点标题错位
    let percentage = stepConfig.percentage;
    if (isCompleted) {
      percentage = 100;
    }

    let statusDesc = isRetrying
      ? `正在重新启动风控流水线，即将从【${title}】继续执行...`
      : (data.status_desc || stepConfig.status_desc);

    // 过滤底层堆栈报错代码，展示人性化文案
    if (statusDesc && typeof statusDesc === 'string') {
      const isTechError = 
        statusDesc.includes('Error code') ||
        statusDesc.includes('Traceback') ||
        statusDesc.includes('Exception') ||
        statusDesc.includes('model_not_found') ||
        statusDesc.includes('new_api_error') ||
        statusDesc.includes('{') ||
        statusDesc.includes('}');
      if (isTechError || isFailed) {
        if (isFailed) {
          if (currentStep === 3) {
            statusDesc = 'AI 研判大模型推理服务产生波动，上一成功节点【数据获取】已安全存证，请点击重试继续。';
          } else if (currentStep === 2) {
            statusDesc = '跨源归集企业工商涉税数据遇到网络通道波动，上一成功节点【授权信息】已保存，请点击重试继续。';
          } else if (currentStep === 4) {
            statusDesc = '报告组装生成阶段遇到暂时波动，AI 研判结论已完整保存，请点击重试继续生成报告。';
          } else {
            statusDesc = '分析过程中服务产生波动，上一成功节点已安全保存，请点击重试继续。';
          }
        } else {
          statusDesc = stepConfig.status_desc;
        }
      }
    }

    // 上一成功节点
    const lastSuccessfulStep = typeof data.last_successful_step === 'number'
      ? data.last_successful_step
      : (isCompleted ? 4 : (currentStep > 1 ? currentStep - 1 : 0));
    const lastSuccessfulStepTitle = data.last_successful_step_title || (lastSuccessfulStep > 0 ? DD_STEPS[lastSuccessfulStep - 1]?.title : '');

    // 重试节点信息 (当前失败步骤即为待重试步骤)
    const nextRetryStep = (typeof data.next_retry_step === 'number' && data.next_retry_step >= 1) ? data.next_retry_step : currentStep;
    const nextRetryStepTitle = data.next_retry_step_title || (DD_STEPS[nextRetryStep - 1]?.title || title);

    const errorMessage = data.error_message || (isFailed ? statusDesc : null);
    const latestRequestId = data.latest_request_id || task.latest_request_id || data.request_id || task.request_id || null;

    return {
      currentStep,
      percentage,
      title,
      statusDesc,
      isCompleted,
      isFailed,
      isWaitingAuth,
      isRetrying,
      canRetry,
      lastSuccessfulStep,
      lastSuccessfulStepTitle,
      nextRetryStep,
      nextRetryStepTitle,
      errorMessage,
      latestRequestId,
      authQrcodeUrl: data.auth_qrcode_url,
      authLink: data.auth_link,
      reportId: data.report_id || task?.report_id
    };
  };

  const getStatusBadge = (status, progInfo = null) => {
    if (progInfo?.isRetrying) {
      const stepName = progInfo?.title || '当前节点';
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-[#0070a4] border border-sky-200/80 shadow-2xs">
          <Loader2 className="w-3.5 h-3.5 mr-1 text-[#0096DB] animate-spin" /> 重试执行中 (步骤 {progInfo.currentStep}: {stepName})
        </span>
      );
    }
    if (progInfo?.canRetry || status === 'failed') {
      const stepName = progInfo?.nextRetryStepTitle || '当前节点';
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80 shadow-2xs">
          <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> 任务中断 (待从【{stepName}】重试)
        </span>
      );
    }
    if (status === 'waiting_auth') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50/80 backdrop-blur-sm text-amber-800 border border-amber-200/60 shadow-2xs">
          <Clock className="w-3.5 h-3.5 mr-1 text-amber-600 animate-pulse" /> 等待法定代表人扫码授权
        </span>
      );
    }
    if (status === 'auth_failed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50/90 backdrop-blur-sm text-rose-800 border border-rose-200/80 shadow-2xs">
          <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" /> 授权失效 / 失败
        </span>
      );
    }
    if (status === 'pulling_data') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-sky-50 text-sky-800 border border-sky-200/60 shadow-2xs">
          <Download className="w-3.5 h-3.5 mr-1 text-[#0096DB] animate-pulse" /> 步骤 2: 数据获取中 (50%)
        </span>
      );
    }
    if (status === 'ai_analyzing') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-cyan-50 text-[#0084c2] border border-cyan-200/60 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-[#0096DB] animate-spin" /> 步骤 3: AI 研判中 (75%)
        </span>
      );
    }
    if (progInfo?.isCompleted || status === 'completed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> 步骤 4: 报告生成完毕 (100%)
        </span>
      );
    }
    if (status === 'cancelled') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-slate-500" /> 已取消
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
        <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" /> 进行中
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

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
          <button 
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="shadcn-button-outline text-xs py-2 sm:py-1.5 px-2 sm:px-3 shadow-xs hover:border-[#0ea5e9] hover:text-[#0284c7] cursor-pointer flex items-center justify-center gap-1 sm:gap-1.5"
            title="刷新最新数据"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 shrink-0 ${isRefreshing ? 'animate-spin text-[#0096DB]' : ''}`} />
            <span>刷新</span>
          </button>

          <Link
            to="/app"
            className="shadcn-button-primary text-xs py-2 sm:py-1.5 px-2 sm:px-3.5 flex items-center justify-center gap-1 sm:gap-1.5"
          >
            <span className="truncate">发起尽调</span>
            <ArrowRight className="w-3.5 h-3.5 shrink-0 hidden xs:inline" />
          </Link>
        </div>
      </div>

      {/* 玻璃拟态 Tabs 胶囊切换栏 */}
      <div className="mt-4 sm:mt-6 flex items-center bg-slate-100/90 p-1 rounded-xl w-full sm:w-fit border border-slate-200/70 shadow-[inset_0_1px_2px_rgba(0,0,0,0.03)]">
        <button
          type="button"
          onClick={() => switchTab('tasks')}
          className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
            activeTab === 'tasks'
              ? 'bg-white text-[#0084c2] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60 border border-transparent'
          }`}
        >
          <Activity className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'tasks' ? 'text-[#0096DB]' : 'text-slate-400'}`} />
          <span className="whitespace-nowrap">进行中的尽调</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${
            activeTab === 'tasks' ? 'bg-cyan-50 text-[#0084c2] border border-cyan-200/70' : 'bg-slate-200/80 text-slate-600'
          }`}>
            {taskTotal ?? activeTasks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => switchTab('reports')}
          className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 sm:gap-2 transition-all cursor-pointer ${
            activeTab === 'reports'
              ? 'bg-white text-[#0084c2] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)] border border-slate-200/80 font-bold'
              : 'text-slate-600 hover:text-slate-950 hover:bg-white/60 border border-transparent'
          }`}
        >
          <FileText className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'reports' ? 'text-[#0096DB]' : 'text-slate-400'}`} />
          <span className="whitespace-nowrap">历史尽调报告</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-bold font-mono ${
            activeTab === 'reports' ? 'bg-cyan-50 text-[#0084c2] border border-cyan-200/70' : 'bg-slate-200/80 text-slate-600'
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
                {tasks.map((task) => {
                  const progInfo = getTaskProgressInfo(task);
                  return (
                  <div key={task.id} className="shadcn-card-hover p-4 sm:p-5 bg-white/90 backdrop-blur-xl space-y-3.5 sm:space-y-4 border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="text-sm sm:text-base font-bold text-slate-950 flex items-center gap-1.5 sm:gap-2 break-all">
                            <Building className="w-4 h-4 text-[#0096DB] shrink-0" />
                            <span>{task.company_name}</span>
                          </h3>
                          {getStatusBadge(task.status, progInfo)}
                        </div>
                        <p className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1">
                          <span>任务单号: <strong className="text-slate-800 break-all">{task.task_no || task.id}</strong></span>
                          <span>统一代码: <strong className="text-slate-800">{task.credit_code}</strong></span>
                          <span>创建时间: {formatLocalTime(task.created_at)}</span>
                          {progInfo.latestRequestId && (
                            <span className="inline-flex items-center gap-1 bg-slate-100/90 hover:bg-slate-200/70 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200/90 text-[11px] transition-colors">
                              <span>追踪ID: <strong className="text-slate-800 font-mono">{progInfo.latestRequestId}</strong></span>
                              <button
                                type="button"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  const ok = await copyToClipboard(progInfo.latestRequestId);
                                  if (ok) {
                                    message.success('请求追踪ID已复制到剪贴板');
                                  } else {
                                    message.error('复制失败，请手动选择复制');
                                  }
                                }}
                                className="text-slate-400 hover:text-[#0096DB] p-0.5 transition-colors cursor-pointer"
                                title="复制请求追踪ID"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* 状态操作按钮 */}
                        {task.status === 'waiting_auth' && (
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => setSelectedTaskForAuth(task)}
                              className="w-full sm:w-auto justify-center shadcn-button-primary text-xs py-2 sm:py-1.5 px-3 flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>查看授权码 / 二维码</span>
                            </button>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                              <button
                                type="button"
                                onClick={() => handleReauthTask(task)}
                                disabled={reauthingTaskId === task.id}
                                className="flex-1 sm:flex-initial justify-center shadcn-button-outline text-xs py-2 sm:py-1.5 px-2.5 flex items-center gap-1.5 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs cursor-pointer"
                                title="重新获取授权链接与二维码"
                              >
                                <RotateCw className={`w-3.5 h-3.5 ${reauthingTaskId === task.id ? 'animate-spin text-[#0096DB]' : 'text-slate-500'}`} />
                                <span>重新发起授权</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSyncTask(task)}
                                disabled={syncingTaskId === task.id}
                                className="flex-1 sm:flex-initial justify-center shadcn-button-outline text-xs py-2 sm:py-1.5 px-2.5 flex items-center gap-1.5 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs cursor-pointer"
                                title="刷新/同步三方授权状态"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${syncingTaskId === task.id ? 'animate-spin text-[#0096DB]' : 'text-slate-500'}`} />
                                <span>同步状态</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {task.status === 'auth_failed' && (
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleReauthTask(task)}
                              disabled={reauthingTaskId === task.id}
                              className="w-full sm:w-auto justify-center shadcn-button-primary bg-[#0096DB] hover:bg-[#0084c2] text-xs py-2 sm:py-1.5 px-3 flex items-center gap-1.5 shadow-xs cursor-pointer font-semibold"
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${reauthingTaskId === task.id ? 'animate-spin' : ''}`} />
                              <span>重新发起授权</span>
                            </button>
                          </div>
                        )}

                        {(progInfo.canRetry || task.status === 'failed') && task.status !== 'auth_failed' && (
                          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() => handleRetryAnalysis(task)}
                              disabled={retryingAnalysisTaskId === task.id}
                              className="w-full sm:w-auto justify-center shadcn-button-primary bg-[#0096DB] hover:bg-[#0084c2] text-xs py-2 sm:py-1.5 px-3.5 flex items-center gap-1.5 shadow-xs cursor-pointer font-semibold"
                              title={`从【${progInfo.nextRetryStepTitle}】阶段重新触发流水线`}
                            >
                              <RotateCw className={`w-3.5 h-3.5 ${retryingAnalysisTaskId === task.id ? 'animate-spin text-white' : ''}`} />
                              <span>{retryingAnalysisTaskId === task.id ? '正在重新触发...' : `从【${progInfo.nextRetryStepTitle}】重试`}</span>
                            </button>

                            <Link
                              to={`/app?company=${encodeURIComponent(task.company_name)}&code=${encodeURIComponent(task.credit_code)}`}
                              className="flex-1 sm:flex-initial justify-center shadcn-button-outline text-xs py-2 sm:py-1.5 px-3 flex items-center gap-1.5 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs"
                              title="全新发起新尽调"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                              <span>重新发起尽调</span>
                            </Link>
                          </div>
                        )}

                        {!progInfo.canRetry && (task.status === 'pulling_data' || task.status === 'ai_analyzing') && (
                          <button
                            type="button"
                            onClick={() => handleSyncTask(task)}
                            disabled={syncingTaskId === task.id}
                            className="w-full sm:w-auto justify-center shadcn-button-outline text-xs py-2 sm:py-1.5 px-2.5 flex items-center gap-1.5 hover:border-[#0096DB] hover:text-[#0096DB] shadow-xs cursor-pointer"
                            title="刷新/同步三方授权状态"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingTaskId === task.id ? 'animate-spin text-[#0096DB]' : 'text-slate-500'}`} />
                            <span>同步状态</span>
                          </button>
                        )}

                        {(progInfo.isCompleted || task.status === 'completed' || task.report_id) && (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            {(task.report_id || progInfo.reportId) && (
                              <Link
                                to={`/app/reports/${task.report_id || progInfo.reportId}`}
                                state={{ from: `${location.pathname}${location.search || '?tab=tasks'}` }}
                                onClick={() => markReportAsRead(task.report_id || progInfo.reportId)}
                                className="w-full sm:w-auto justify-center shadcn-button-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2 sm:py-1.5 px-3 flex items-center gap-1.5 shadow-xs font-semibold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>查阅报告 →</span>
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 横向 4 步标准尽调全流程动态进度与节点图（全终端自适应） */}
                    {(() => {
                      const isFailed = progInfo.isFailed;
                      const isWaitingAuth = progInfo.isWaitingAuth;
                      const pData = taskProgressMap[task.id];
                      const logs = (Array.isArray(pData?.thinking_logs) && pData.thinking_logs.length > 0)
                        ? pData.thinking_logs
                        : (Array.isArray(pData?.raw_thinking_logs) && pData.raw_thinking_logs.length > 0)
                        ? pData.raw_thinking_logs
                        : (Array.isArray(task.thinking_logs) && task.thinking_logs.length > 0)
                        ? task.thinking_logs
                        : (Array.isArray(task.raw_thinking_logs) && task.raw_thinking_logs.length > 0)
                        ? task.raw_thinking_logs
                        : (Array.isArray(task.sanitized_logs) && task.sanitized_logs.length > 0)
                        ? task.sanitized_logs
                        : (Array.isArray(task.logs) && task.logs.length > 0)
                        ? task.logs
                        : (Array.isArray(task.raw_logs) && task.raw_logs.length > 0)
                        ? task.raw_logs
                        : (Array.isArray(pData?.sanitized_logs) && pData.sanitized_logs.length > 0)
                        ? pData.sanitized_logs
                        : [];
                      const isExpanded = !!expandedTaskLogs[task.id];

                      return (
                        <div className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border space-y-3.5 sm:space-y-4 backdrop-blur-md transition-all shadow-xs ${
                          isFailed
                            ? 'bg-rose-50/40 border-rose-200/80'
                            : isWaitingAuth
                            ? 'bg-amber-50/40 border-amber-200/80'
                            : 'bg-gradient-to-br from-slate-50/80 via-sky-50/30 to-white border-slate-200/80'
                        }`}>
                          {/* 1. 顶部当前状态与百分比指示 */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                            <div className="flex items-start gap-2.5 sm:gap-3 flex-1 min-w-0">
                              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-xs ${
                                isFailed
                                  ? 'bg-rose-100 text-rose-600 border border-rose-200'
                                  : isWaitingAuth
                                  ? 'bg-amber-100 text-amber-700 border border-amber-200 animate-pulse'
                                  : progInfo.percentage >= 100
                                  ? 'bg-emerald-100 text-emerald-600 border border-emerald-200'
                                  : 'bg-sky-100 text-[#0096DB] border border-sky-200'
                              }`}>
                                {isFailed ? (
                                  <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                ) : isWaitingAuth ? (
                                  <Key className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                ) : progInfo.percentage >= 100 ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                ) : (
                                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-[#0096DB]" />
                                )}
                              </div>

                              <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <span className="font-bold text-xs sm:text-sm text-slate-950">
                                    步骤 {progInfo.currentStep} / 4 · {progInfo.title}
                                  </span>
                                  <span className={`text-[9.5px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.2 rounded-full border ${
                                    isFailed
                                      ? 'bg-rose-100/80 text-rose-700 border-rose-200'
                                      : isWaitingAuth
                                      ? 'bg-amber-100/80 text-amber-800 border-amber-200'
                                      : task.status === 'pulling_data'
                                      ? 'bg-sky-100/90 text-[#0070a4] border-sky-300 animate-pulse'
                                      : progInfo.percentage >= 100
                                      ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
                                      : 'bg-sky-100/80 text-[#0070a4] border-sky-200'
                                  }`}>
                                    {isFailed ? '异常中断' : isWaitingAuth ? '等待法人实名授权' : task.status === 'pulling_data' ? '数据归集中 (预计1~10分钟)' : progInfo.percentage >= 100 ? '已完成' : '实时执行中'}
                                  </span>
                                </div>
                                <p className="text-[11.5px] sm:text-xs text-slate-600 font-normal leading-relaxed break-words">
                                  {progInfo.statusDesc || DD_STEPS[progInfo.currentStep - 1]?.status_desc}
                                </p>
                              </div>
                            </div>

                            {/* 进度百分比胶囊 */}
                            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                              <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl font-mono text-xs sm:text-sm font-black flex items-center gap-1.5 shadow-2xs border ${
                                isFailed
                                  ? 'bg-rose-100/80 text-rose-700 border-rose-200'
                                  : isWaitingAuth
                                  ? 'bg-amber-100/80 text-amber-800 border-amber-200'
                                  : progInfo.percentage >= 100
                                  ? 'bg-emerald-100/80 text-emerald-700 border-emerald-200'
                                  : 'bg-sky-100/80 text-[#0284c7] border-sky-200'
                              }`}>
                                <Activity className={`w-3.5 h-3.5 ${!isFailed ? 'animate-pulse' : ''}`} />
                                <span>{progInfo.percentage}%</span>
                              </div>
                            </div>
                          </div>

                          {/* 2. 4 步横向流程一体化动态进度 Stepper（节点与进度条严丝合缝 100% 对齐） */}
                          <div className="pt-2 sm:pt-3 pb-1">
                            <div className="w-full relative flex items-center justify-between">
                              {/* 贯穿底层的背景连接轨道（精确对齐 Node 1 中心点 12.5% 至 Node 4 中心点 87.5%） */}
                              <div className="absolute top-3.5 sm:top-4 -translate-y-1/2 left-[12.5%] right-[12.5%] h-1 sm:h-1.5 bg-slate-200/90 rounded-full z-0 pointer-events-none" />

                              {/* 动态激活的彩色高亮进度条（依步骤精确填充满至当前节点中心，0% -> 33.3% -> 66.7% -> 100%） */}
                              <div className="absolute top-3.5 sm:top-4 -translate-y-1/2 left-[12.5%] right-[12.5%] h-1 sm:h-1.5 rounded-full z-0 overflow-hidden pointer-events-none">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ease-out ${
                                    isFailed
                                      ? 'bg-gradient-to-r from-rose-400 to-rose-600'
                                      : isWaitingAuth
                                      ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                                      : progInfo.percentage >= 100
                                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                                      : 'bg-gradient-to-r from-sky-400 via-[#0ea5e9] to-[#0096DB]'
                                  }`}
                                  style={{
                                    width: `${((Math.max(1, Math.min(4, progInfo.currentStep)) - 1) / 3) * 100}%`
                                  }}
                                />
                              </div>

                              {/* 4 个流程节点 */}
                              {DD_STEPS.map((stepItem) => {
                                const stepNum = stepItem.step;
                                const IconComponent = stepItem.icon;
                                // 1. 已完成的过去节点：整单任务完成，或该节点严格在当前正在执行的节点之前
                                const isPast = progInfo.isCompleted || (stepNum < progInfo.currentStep);
                                // 2. 当前正在进行的节点：任务未完成，且节点正好是当前进行中的步骤
                                const isCurrent = !progInfo.isCompleted && (stepNum === progInfo.currentStep);
                                // 3. 未来未到达的节点
                                const isFuture = !progInfo.isCompleted && (stepNum > progInfo.currentStep);

                                let nodeColor = 'bg-white text-slate-400 border-slate-200 shadow-2xs';

                                if (isPast) {
                                  nodeColor = 'bg-emerald-500 text-white border-emerald-500 ring-2 sm:ring-4 ring-white shadow-xs';
                                } else if (isCurrent) {
                                  if (isFailed) {
                                    nodeColor = 'bg-rose-500 text-white border-rose-500 ring-2 sm:ring-4 ring-rose-100 shadow-md animate-pulse';
                                  } else if (isWaitingAuth) {
                                    nodeColor = 'bg-amber-500 text-white border-amber-500 ring-2 sm:ring-4 ring-amber-100 shadow-md animate-pulse';
                                  } else {
                                    // 进行中 / 重试中 的节点：高亮品牌蓝背景 + 外部呼吸光环 + 内部转圈加载
                                    nodeColor = 'bg-[#0096DB] text-white border-[#0096DB] ring-4 ring-sky-200 shadow-md shadow-sky-300 animate-pulse';
                                  }
                                }

                                return (
                                  <div key={stepNum} className="flex-1 flex flex-col items-center relative z-10 px-0.5 sm:px-1">
                                    {/* 节点圆形图标（高亮外环遮挡底层进度条，呈现自然穿透效果） */}
                                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${nodeColor}`}>
                                      {isPast ? (
                                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                                      ) : isCurrent && isFailed ? (
                                        <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                                      ) : isCurrent && isWaitingAuth ? (
                                        <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                                      ) : isCurrent ? (
                                        <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin text-white stroke-[2.5]" />
                                      ) : (
                                        <IconComponent className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
                                      )}
                                    </div>

                                    {/* 步骤标题与百分比 */}
                                    <div className="mt-1.5 sm:mt-2 text-center space-y-0.5">
                                      <div className={`text-[10px] sm:text-xs tracking-tight flex items-center justify-center gap-0.5 ${
                                        isCurrent 
                                          ? (isFailed ? 'font-bold text-rose-600' : isWaitingAuth ? 'font-bold text-amber-700' : 'font-bold text-[#0096DB]')
                                          : isPast
                                          ? 'font-medium text-slate-800'
                                          : 'text-slate-400 font-normal'
                                      }`}>
                                        <span>{stepItem.title}</span>
                                        {isCurrent && !isFailed && !isWaitingAuth && (
                                          <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[#0096DB] animate-ping" />
                                        )}
                                      </div>
                                      <div className={`text-[9px] sm:text-[10px] font-mono ${
                                        isCurrent
                                          ? (isFailed ? 'text-rose-500 font-bold' : 'text-[#0ea5e9] font-bold')
                                          : isPast
                                          ? 'text-emerald-600 font-medium'
                                          : 'text-slate-400'
                                      }`}>
                                        {stepItem.percentage}%
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* 4. 辅助状态提示与展开日志 */}
                          {/* 等待授权引导区 */}
                          {isWaitingAuth && (
                            <div className="pt-2 border-t border-amber-200/60 flex items-center gap-2 bg-amber-50/60 p-2.5 sm:p-3 rounded-xl text-xs text-amber-900">
                              <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
                              <span>已生成专属实名数据授权通道，请让企业法定代表人通过微信扫码完成实名授权。</span>
                            </div>
                          )}

                          {/* 授权失败/超时区 */}
                          {task.status === 'auth_failed' && (
                            <div className="pt-2 border-t border-amber-200/60 space-y-2">
                              <div className="flex items-start gap-2 bg-amber-50/80 p-2.5 sm:p-3 rounded-xl border border-amber-200/80 text-xs">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div className="space-y-1 flex-1 min-w-0">
                                  <div className="font-bold text-amber-950">实名授权失效或未通过</div>
                                  <p className="text-amber-800 leading-relaxed font-normal">
                                    法定代表人实名授权二维码已过期或授权未在时效内完成，您可以重新发起授权获取新二维码。
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 报告分析失败与断点重试提示区 (信息提示，重试主操作统一在右上角) */}
                          {progInfo.canRetry && task.status !== 'auth_failed' && (
                            <div className="pt-2 border-t border-rose-200/60">
                              <div className="p-3 sm:p-3.5 bg-rose-50/90 border border-rose-200/80 rounded-xl shadow-2xs flex items-start gap-2.5">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <div className="text-xs space-y-1 min-w-0 flex-1">
                                  <div className="font-bold text-rose-950">任务在【{progInfo.title}】阶段暂停</div>
                                  <div className="text-rose-800 leading-relaxed break-words">{progInfo.errorMessage || '服务产生微小波动，上一成功节点已安全保存，请点击右上角重试按钮继续。'}</div>
                                  {progInfo.lastSuccessfulStepTitle && (
                                    <div className="text-[11px] text-slate-500">
                                      已安全保存节点：<strong className="text-slate-700">【{progInfo.lastSuccessfulStepTitle}】</strong>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 思考流日志折叠按钮与时间线 */}
                          {logs.length > 0 && (
                            <div className="pt-2 border-t border-slate-200/60 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                                  <Activity className="w-3.5 h-3.5 text-[#0096DB]" />
                                  <span>流水线实时执行日志</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleTaskLogs(task.id)}
                                  className="text-[11px] font-medium text-[#0096DB] hover:text-[#0070a4] bg-sky-50 hover:bg-sky-100/80 px-2.5 py-1 rounded-md border border-sky-200/60 transition-all cursor-pointer flex items-center gap-1 shadow-2xs select-none"
                                >
                                  <span>{isExpanded ? '收起步骤流' : `展开全流程日志 (${logs.length}步)`}</span>
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="bg-white/90 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5 max-h-60 overflow-y-auto font-mono text-[11px] shadow-2xs">
                                  {logs.map((log, idx) => {
                                    const isLast = idx === logs.length - 1;
                                    const timeStr = typeof log === 'string' ? '' : (log.time || '');
                                    let textStr = typeof log === 'string' ? log : (log.content || log.it || log.text || log.message || '');
                                    
                                    // 提取与清洗 request_id 追踪标签
                                    let logReqId = typeof log === 'object' ? log.request_id : null;
                                    const reqMatch = textStr.match(/\[ReqID:\s*([^\]]+)\]/i);
                                    if (reqMatch) {
                                      logReqId = logReqId || reqMatch[1].trim();
                                      textStr = textStr.replace(/\[ReqID:\s*[^\]]+\]\s*/i, '').trim();
                                    }

                                    return (
                                      <div key={idx} className="flex items-start gap-2.5">
                                        <div className="flex flex-col items-center mt-1">
                                          <div className={`w-2 h-2 rounded-full shrink-0 ${
                                            isLast && !isFailed
                                              ? 'bg-[#0096DB] animate-ping'
                                              : isLast && isFailed
                                              ? 'bg-rose-500'
                                              : 'bg-slate-300'
                                          }`} />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-0.5">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            {timeStr && <span className="text-[10px] text-slate-400 font-bold">[{timeStr}]</span>}
                                            {logReqId && (
                                              <span 
                                                className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-50 text-sky-700 border border-sky-200/80 cursor-pointer hover:bg-sky-100 select-none"
                                                onClick={async () => {
                                                  const ok = await copyToClipboard(logReqId);
                                                  if (ok) {
                                                    message.success(`已复制请求追踪ID: ${logReqId}`);
                                                  } else {
                                                    message.error('复制失败，请手动选择复制');
                                                  }
                                                }}
                                                title="点击复制此步骤的请求追踪 ID"
                                              >
                                                trace: {logReqId.length > 20 ? `${logReqId.slice(0, 10)}...${logReqId.slice(-6)}` : logReqId}
                                              </span>
                                            )}
                                          </div>
                                          <div className={`${
                                            isLast
                                              ? (isFailed ? 'text-rose-900 font-semibold' : 'text-slate-900 font-semibold')
                                              : 'text-slate-600'
                                          } break-all`}>
                                            {textStr}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                );
              })}
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
                    responsive={true}
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
          <div className="shadcn-card p-2 sm:p-2.5 bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-xs rounded-xl">
            <form onSubmit={(e) => { e.preventDefault(); setReportPage(1); fetchReports(1, reportPageSize); }} className="flex items-center w-full bg-white rounded-lg px-3 py-1.5 sm:py-2 border border-slate-300/80 focus-within:border-[#0096DB] focus-within:ring-4 focus-within:ring-[#0096DB]/15 transition-all shadow-xs">
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
                className="shadcn-button-primary text-xs py-1.5 px-3.5 shrink-0 shadow-xs cursor-pointer active:scale-[0.98]"
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
            <div className="shadcn-card p-12 text-center bg-white/90 backdrop-blur-xl space-y-3 border border-slate-200/80 shadow-xs rounded-2xl">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">未检索到历史尽调报告</h3>
              <p className="text-xs text-slate-500">发起新尽调并完成法人授权后，生成的报告将永久留存于此资产库中。</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {reports.map((report) => (
                  <div key={report.id} className="shadcn-card-hover p-4 sm:p-5 bg-white/90 backdrop-blur-xl space-y-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all rounded-xl sm:rounded-2xl">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                          <h3 className="text-base font-bold text-slate-950 hover:text-[#0096DB] transition-colors flex items-center gap-2">
                            <Link 
                              to={`/app/reports/${report.id}`}
                              state={{ from: `${location.pathname}${location.search || '?tab=reports'}` }}
                              onClick={() => markReportAsRead(report.id)}
                            >
                              {report.company_name}
                            </Link>
                          </h3>
                          {isNewReport(report) && (
                            <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] sm:text-[11px] font-bold bg-rose-500 text-white rounded-md shadow-xs animate-pulse select-none" title="新生成的报告（点击查阅后标记已读）">
                              新
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span>任务单号: <strong className="text-slate-800">{report.task_no || report.task_id || report.report_no}</strong></span>
                          <span>统一代码: <strong className="text-slate-800">{report.credit_code}</strong></span>
                          <span>生成时间: {formatLocalTime(report.created_at)}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        {/* 6位密码加密分享入口 */}

                        {(() => {
                          const token = localStorage.getItem('edd_user_token') || localStorage.getItem('token') || '';
                          const pdfUrl = `${remoteApiHost}/api/v1/reports/${report.id}/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
                          return (
                            <a
                              href={pdfUrl}
                              download={`${report.company_name}_尽调报告.pdf`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => markReportAsRead(report.id)}
                              className="flex-1 sm:flex-initial shadcn-button-outline text-xs py-1.5 px-2.5 sm:px-3 flex items-center justify-center gap-1 shadow-xs hover:border-[#0096DB] hover:text-[#0096DB]"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" />
                              <span>下载PDF</span>
                            </a>
                          );
                        })()}

                        <Link
                          to={`/app/reports/${report.id}`}
                          state={{ from: `${location.pathname}${location.search || '?tab=reports'}` }}
                          onClick={() => markReportAsRead(report.id)}
                          className="w-full sm:w-auto shadcn-button-primary text-xs py-1.5 px-3.5 flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
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
                    responsive={true}
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

      {/* 官方系统授权弹窗 */}
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

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
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
                      className="w-full sm:w-auto shadcn-button-outline px-4 py-2 text-xs font-semibold"
                    >
                      复制授权短链
                    </button>

                    <button
                      type="button"
                      disabled={reauthingTaskId === selectedTaskForAuth.id}
                      onClick={() => handleReauthTask(selectedTaskForAuth)}
                      className="w-full sm:w-auto px-3.5 py-2 rounded-md border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-semibold transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                      title="重新生成并刷新法人授权二维码"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${reauthingTaskId === selectedTaskForAuth.id ? 'animate-spin text-sky-700' : 'text-sky-700'}`} />
                      <span>{reauthingTaskId === selectedTaskForAuth.id ? '正在生成...' : '刷新二维码'}</span>
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


    </div>
  );
}
