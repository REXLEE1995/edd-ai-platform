import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Key, 
  Download, 
  Sparkles, 
  Trash2, 
  RotateCw, 
  Loader2,
  Eye, 
  FileText, 
  Database, 
  Terminal, 
  Copy, 
  Check, 
  ChevronRight, 
  User, 
  Building2, 
  Layers, 
  ExternalLink,
  ShieldCheck,
  Cpu,
  Flame,
  FileCode,
  Code2,
  Maximize2,
  ArrowDown,
  FileQuestion
} from 'lucide-react';
import { message, Drawer, Modal, Pagination, Tag, Tooltip } from 'antd';
import { marked } from 'marked';
import apiClient, { generateRequestId } from '../../api/client';
import { formatLocalTime } from '../../utils/date';
import { copyToClipboard } from '../../utils/clipboard';

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

// 4 步标准尽调全流程节点定义
const DD_STEPS = [
  { step: 1, title: '授权信息', percentage: 25, icon: Key },
  { step: 2, title: '数据获取', percentage: 50, icon: Download },
  { step: 3, title: 'AI 研判', percentage: 75, icon: Sparkles },
  { step: 4, title: '报告生成', percentage: 100, icon: CheckCircle2 }
];

export default function AdminTasksPage() {
  const remoteApiHost = (typeof window !== 'undefined' && window.APP_CONFIG?.API_BASE_URL)
    ? window.APP_CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')
    : 'http://192.168.110.234:8000';

  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // 工业级监控详情抽屉状态
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [adminProgressData, setAdminProgressData] = useState(null);
  const [loadingAdminProgress, setLoadingAdminProgress] = useState(false);
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'error' | 'artifacts'
  const [copiedLog, setCopiedLog] = useState(false);
  const logsContainerRef = useRef(null);

  // 滚动日志至底部函数
  const scrollToLogsBottom = (smooth = true) => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTo({
        top: logsContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
    }
  };

  // 中间产物与知识库在线查阅预览弹窗状态
  const [artifactModalOpen, setArtifactModalOpen] = useState(false);
  const [artifactModalType, setArtifactModalType] = useState('knowledge_base'); // 'knowledge_base' | 'content_text' | 'catalog' | 'pdf'
  const [artifactModalTitle, setArtifactModalTitle] = useState('');
  const [artifactModalTag, setArtifactModalTag] = useState('');
  const [artifactModalContent, setArtifactModalContent] = useState('');
  const [artifactModalJson, setArtifactModalJson] = useState(null);
  const [artifactModalError, setArtifactModalError] = useState(null);
  const [artifactRawUrl, setArtifactRawUrl] = useState('');
  const [artifactLoading, setArtifactLoading] = useState(false);
  const [artifactViewTab, setArtifactViewTab] = useState('rendered'); // 'rendered' | 'raw'
  const [copiedArtifact, setCopiedArtifact] = useState(false);

  // 4 个底层产物状态探测字典 (明确标注哪些已就绪、哪些未生成)
  const [artifactStatuses, setArtifactStatuses] = useState({
    pdf: { exists: false, tag: '未生成', desc: '尚未生成 PDF 底稿，等待法人授权' },
    content_text: { exists: false, tag: '未提取', desc: '待步骤 3 物理排版解析完成后提取' },
    catalog: { exists: false, tag: '未解析', desc: '待步骤 2 目录大纲智能抽取完成后生成' },
    knowledge_base: { exists: false, tag: '待研判生成', desc: '待步骤 4/5 AI 算力研判完成后生成' },
  });

  // 介入操作进行中的 TaskId
  const [actionTaskId, setActionTaskId] = useState(null);

  // 移动端屏幕自适应响应状态
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 拉取全平台所有用户的尽调任务流水（真实数据中台聚合）
  const fetchTasks = async (isSilent = false) => {
    if (!isSilent && tasks.length === 0) {
      setLoading(true);
    }
    try {
      // 1. 获取全平台用户列表
      const usersRes = await apiClient.get('/admin/users/list?page=1&page_size=100');
      const userList = usersRes?.data?.items || usersRes?.items || [];
      
      // 2. 并发调取各用户名下尽调任务
      const userDetailPromises = userList.map(u =>
        apiClient.get(`/admin/users/${u.id}/detail`).catch(() => null)
      );
      const userDetails = await Promise.all(userDetailPromises);

      const allTasksMap = new Map();
      userDetails.forEach((ud, idx) => {
        const u = userList[idx];
        const userTasks = ud?.data?.tasks || ud?.tasks || [];
        userTasks.forEach(t => {
          if (t && t.id && !allTasksMap.has(t.id)) {
            allTasksMap.set(t.id, {
              ...t,
              user_id: u?.id,
              user_phone: u?.phone,
              user_company: u?.company_name
            });
          }
        });
      });

      const allTasksList = Array.from(allTasksMap.values());
      // 按创建时间倒序排列 (最新在前)
      allTasksList.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

      setTasks(allTasksList);
      setTotal(allTasksList.length);
    } catch (err) {
      console.error('获取尽调流水失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 拉取指定任务的实时监控/思考流进度 (从真实后端接口并发拉取完整 admin-progress 与 task 详情)
  const fetchAdminProgress = async (taskId, isSilent = false, fallbackTask = null) => {
    if (!taskId) return;
    if (!isSilent) {
      setLoadingAdminProgress(true);
    }
    const currentTask = fallbackTask || selectedTask;
    try {
      // 严格仅调取当前任务专属接口 (admin-progress、任务详情、总结)，绝不跨请求串入已有报告数据
      const [adminProgRes, detailRes, sumRes] = await Promise.allSettled([
        apiClient.get(`/v1/tasks/${taskId}/admin-progress`),
        apiClient.get(`/v1/tasks/${taskId}`),
        apiClient.get(`/v1/tasks/${taskId}/summary`)
      ]);

      let backendError = '';
      if (adminProgRes.status === 'rejected') {
        const errObj = adminProgRes.reason;
        backendError = errObj?.response?.data?.detail || errObj?.response?.data?.message || errObj?.message || '后台监控接口响应异常 (500 Internal Server Error)';
      }

      const adminData = adminProgRes.status === 'fulfilled' ? (adminProgRes.value?.data || adminProgRes.value) : {};
      const detailData = detailRes.status === 'fulfilled' ? (detailRes.value?.data || detailRes.value) : {};
      const sumData = sumRes.status === 'fulfilled' ? (sumRes.value?.data || sumRes.value) : {};

      const hasError = Boolean(backendError || adminData?.error_message || detailData?.error_message || adminData?.status === 'failed' || detailData?.status === 'failed' || currentTask?.status === 'failed');

      const merged = {
        ...(currentTask || {}),
        ...detailData,
        ...adminData,
        ...sumData,
        status: hasError ? 'failed' : (adminData?.status || detailData?.status || currentTask?.status || 'pulling_data'),
        raw_thinking_logs: adminData?.raw_thinking_logs || detailData?.raw_thinking_logs || currentTask?.raw_thinking_logs,
        sanitized_logs: adminData?.sanitized_logs || detailData?.sanitized_logs || currentTask?.sanitized_logs,
        thinking_logs: adminData?.thinking_logs || detailData?.thinking_logs || currentTask?.thinking_logs,
        raw_logs: adminData?.raw_logs || detailData?.raw_logs || sumData?.raw_logs || currentTask?.raw_logs,
        logs: adminData?.logs || detailData?.logs || currentTask?.logs,
        step_history: adminData?.step_history || detailData?.step_history || currentTask?.step_history,
        execution_logs: adminData?.execution_logs || detailData?.execution_logs || currentTask?.execution_logs,
        error_message: backendError || adminData?.error_message || detailData?.error_message || currentTask?.error_message || sumData?.error || ''
      };

      setAdminProgressData(merged);
    } catch (err) {
      console.error('获取任务监控进度失败:', err);
      // 降级使用既有元数据并标记异常
      setAdminProgressData(prev => ({
        ...(fallbackTask || selectedTask || {}),
        status: 'failed',
        error_message: err?.message || '网络连接异常'
      }));
    } finally {
      setLoadingAdminProgress(false);
    }
  };

  // 初始拉取尽调流水
  useEffect(() => {
    fetchTasks();
  }, []);

  // 自动刷新轮询 (每 5 秒轮询一次，保持静默刷新不闪烁)
  useEffect(() => {
    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchTasks(true);
      if (detailDrawerOpen && selectedTask?.id) {
        fetchAdminProgress(selectedTask.id, true, selectedTask);
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [autoRefresh, detailDrawerOpen, selectedTask]);

  // 当日志 Tab 激活、抽屉打开或思考日志数据更新时，自动平滑滚动至日志底部
  useEffect(() => {
    if (activeTab === 'logs' && detailDrawerOpen) {
      const t1 = setTimeout(() => scrollToLogsBottom(false), 50);
      const t2 = setTimeout(() => scrollToLogsBottom(true), 250);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [activeTab, detailDrawerOpen, adminProgressData]);

  // 探测并更新当前任务的 4 大产物就绪情况（完全由真实后端接口响应驱动）
  const updateArtifactStatuses = async (task) => {
    if (!task) return;
    const isCompleted = task.status === 'completed' || Boolean(task.report_id);
    const isFailed = isTaskFailed(task);
    const hasPdf = Boolean(task.report_id || task.wfq_pdf_url || task.stored_files?.some(f => f.file_type === 'wfq_preloan_pdf'));

    // 1. 设置初始状态
    setArtifactStatuses({
      pdf: {
        exists: hasPdf,
        tag: hasPdf ? '已就绪 (PDF 凭证)' : '未生成',
        desc: hasPdf ? '微风企/享宇中台下发的高保真带章凭证与全景涉税报表底稿 (已存入 MinIO)' : '尚未生成 PDF 底稿，等待法人授权回调'
      },
      content_text: {
        exists: false,
        tag: '探测中...',
        desc: '步骤 3 物理坐标几何对齐抽取的结构化纯文本知识源'
      },
      catalog: {
        exists: false,
        tag: '探测中...',
        desc: '从 PDF 目录页精准解析的章节树与真实物理页码映射表'
      },
      knowledge_base: {
        exists: false,
        tag: '探测中...',
        desc: '步骤 4/5 AI 算力研判生成的标准 Markdown 知识库'
      }
    });

    // 2. 真实异步调取当前任务的专属接口 (严格按当前 task.id 精准查询，绝不跨任务/报告串读)
    try {
      const [textRes, catRes, kbRes] = await Promise.allSettled([
        apiClient.get(`/v1/tasks/${task.id}/content-text`),
        apiClient.get(`/v1/tasks/${task.id}/catalog`),
        apiClient.get(`/v1/tasks/${task.id}/knowledge-base`)
      ]);

      const textVal = textRes.status === 'fulfilled' ? textRes.value : null;
      const catVal = catRes.status === 'fulfilled' ? (catRes.value?.data || catRes.value) : null;
      const kbVal = kbRes.status === 'fulfilled' ? (typeof kbRes.value === 'string' ? kbRes.value : (kbRes.value?.data || '')) : null;

      // 严格校验是否是当前任务真实有效内容 (彻底排除 404、detail 错误提示、fallback 假数据)
      const textContent = (typeof textVal === 'string' && !textVal.startsWith('{"detail"') && !textVal.includes('未找到')) 
        ? textVal 
        : (textVal?.data && typeof textVal.data === 'string' && !textVal.data.startsWith('{"detail"') && !textVal.data.includes('未找到')) 
        ? textVal.data 
        : '';
      const textLength = textContent ? textContent.length : 0;

      const tocs = (catVal && !catVal.detail && catVal.source !== 'fallback' && Array.isArray(catVal.toc_catalog)) 
        ? catVal.toc_catalog 
        : (Array.isArray(catVal) && !catVal.some(c => c?.detail) ? catVal : []);

      const kbHasContent = Boolean(
        kbVal && 
        typeof kbVal === 'string' && 
        kbVal.trim().length > 20 && 
        !kbVal.includes('{"detail"') && 
        !kbVal.includes('未找到')
      );

      setArtifactStatuses(prev => ({
        ...prev,
        content_text: {
          exists: textLength > 0,
          tag: textLength > 0 ? `已就绪 (${(textLength / 10000).toFixed(1)}万字)` : '未提取 (接口 404)',
          desc: textLength > 0 ? `当前任务步骤 3 物理排版解析完成，提取 ${textLength.toLocaleString()} 字符纯文本底稿` : '当前任务尚未生成纯文本解析存证文件 (接口 404)'
        },
        catalog: {
          exists: tocs.length > 0,
          tag: tocs.length > 0 ? `已就绪 (${tocs.length}个一级章节)` : '未解析 (接口 404)',
          desc: tocs.length > 0 ? `当前任务已从 PDF 目录解析 ${tocs.length} 个章节大纲与物理页码对应表` : '当前任务尚未生成目录结构大纲存证 (接口 404)'
        },
        knowledge_base: {
          exists: kbHasContent,
          tag: kbHasContent ? '已就绪 (Markdown)' : isFailed ? '未生成 (AI研判中断)' : '未生成 (接口 404)',
          desc: kbHasContent ? '当前任务步骤 4 AI 算力清洗后形成的标准 Markdown 知识库' : isFailed ? '当前任务步骤 3 AI 研判异常中断，未生成 knowledge_base.md' : '当前任务尚未生成 AI Markdown 知识库存证 (接口 404)'
        }
      }));
    } catch (_) {}
  };

  // 提取任务思考流日志 (严格基于真实接口返回数据，100% 杜绝任何虚构/Mock步骤日志)
  const extractThinkingLogs = (data, task) => {
    const candidateSources = [
      data?.raw_thinking_logs,
      data?.sanitized_logs,
      data?.thinking_logs,
      data?.raw_logs,
      data?.logs,
      data?.step_history,
      data?.execution_logs,
      task?.raw_thinking_logs,
      task?.sanitized_logs,
      task?.thinking_logs,
      task?.raw_logs,
      task?.logs,
      task?.step_history,
      task?.execution_logs
    ];

    let rawLogItems = null;
    for (const src of candidateSources) {
      if (Array.isArray(src) && src.length > 0) {
        rawLogItems = src;
        break;
      }
      if (typeof src === 'string' && src.trim().length > 0) {
        rawLogItems = src.split('\n').map(l => l.trim()).filter(Boolean);
        break;
      }
    }

    const formattedList = [];
    if (rawLogItems && rawLogItems.length > 0) {
      rawLogItems.forEach(item => {
        if (!item) return;
        if (typeof item === 'string') {
          const str = item.trim();
          if (!str) return;
          // 解析常见日志时间戳格式 [YYYY-MM-DD HH:mm:ss] / [HH:mm:ss] / YYYY-MM-DD HH:mm:ss
          const match = str.match(/^\[?(\d{4}[-/]\d{2}[-/]\d{2}[\sT])?(\d{2}:\d{2}:\d{2}(?:\.\d+)?)\]?\s*(.*)$/);
          if (match) {
            formattedList.push({
              time: match[2].split('.')[0],
              content: match[3] || str
            });
          } else {
            formattedList.push({
              time: '',
              content: str
            });
          }
        } else if (typeof item === 'object') {
          let time = item.time || item.timestamp || item.created_at || item.datetime || '';
          if (time && typeof time === 'string') {
            if (time.includes('T')) {
              time = formatLocalTime(time).split(' ')[1] || time;
            } else if (time.includes(' ')) {
              time = time.split(' ')[1] || time;
            }
          }
          const content = item.content || item.msg || item.message || item.text || item.log || item.detail || item.title || item.status_desc;
          if (content) {
            formattedList.push({
              time: time || '',
              content: typeof content === 'string' ? content : JSON.stringify(content)
            });
          }
        }
      });
    }

    // 若有真实错误消息，且未包含在日志列表中，则作为真实错误日志追加在末尾
    const errMsg = data?.error_message || data?.error || task?.error_message || task?.error;
    if (errMsg && typeof errMsg === 'string' && errMsg.trim()) {
      const isAlreadyInLogs = formattedList.some(l => l.content && (l.content.includes(errMsg) || l.content.includes('[失败]') || l.content.includes('异常中断')));
      if (!isAlreadyInLogs) {
        const errTime = task?.completed_at || task?.updated_at || data?.updated_at;
        formattedList.push({
          time: errTime ? formatLocalTime(errTime).split(' ')[1] : '',
          content: `[异常中断] ${errMsg}`
        });
      }
    }

    return formattedList;
  };

  // 统一定义纯真实接口底稿产物获取器 (严格按当前 task.id 精准调取，绝不跨任务串读)
  const fetchArtifactContent = async (type, task) => {
    if (!task) return { title: '', tag: '', content: '', json: null, rawUrl: '', error: '任务信息为空' };
    const taskId = task.id;

    if (type === 'pdf') {
      const adminToken = localStorage.getItem('edd_admin_token') || '';
      const baseUrl = task?.report_id 
        ? `${remoteApiHost}/api/v1/reports/${task.report_id}/pdf` 
        : `${remoteApiHost}/api/v1/tasks/${taskId}/pdf`;
      const rawUrl = `${baseUrl}${adminToken ? `?token=${encodeURIComponent(adminToken)}` : ''}`;
      return {
        title: '原始尽调 PDF 底稿 (高保真凭证)',
        tag: task.company_name ? `${task.company_name}_尽调底稿.pdf` : '尽调底稿.pdf',
        content: '',
        json: null,
        rawUrl,
        error: null
      };
    }

    if (type === 'content_text') {
      let content = '';
      try {
        const textRes = await apiClient.get(`/v1/tasks/${taskId}/content-text`);
        if (typeof textRes === 'string' && !textRes.startsWith('{"detail"') && !textRes.includes('未找到')) {
          content = textRes;
        } else if (textRes?.data && typeof textRes.data === 'string' && !textRes.data.startsWith('{"detail"') && !textRes.data.includes('未找到')) {
          content = textRes.data;
        }
      } catch (err) {
        // 404
      }

      if (!content || !content.trim()) {
        return {
          title: '坐标对齐纯文本 (几何排版提取)',
          tag: 'full_text_content.txt',
          content: '',
          json: null,
          rawUrl: `/api/v1/tasks/${taskId}/content-text`,
          error: '后端未找到该任务的解析纯文本存证文件 (接口响应 404 Not Found)'
        };
      }
      return {
        title: '坐标对齐纯文本 (几何排版提取)',
        tag: 'full_text_content.txt',
        content,
        json: null,
        rawUrl: `/api/v1/tasks/${taskId}/content-text`,
        error: null
      };
    }

    if (type === 'catalog') {
      let catData = null;
      try {
        const catRes = await apiClient.get(`/v1/tasks/${taskId}/catalog`);
        catData = catRes?.data || catRes;
      } catch (err) {
        // 404
      }

      const tocs = (catData && !catData.detail && catData.source !== 'fallback' && Array.isArray(catData.toc_catalog)) 
        ? catData.toc_catalog 
        : (Array.isArray(catData) && !catData.some(c => c?.detail) ? catData : []);

      if (tocs.length > 0) {
        return {
          title: '目录结构大纲 (物理页码索引)',
          tag: 'pdf_toc_catalog.json',
          content: JSON.stringify(catData, null, 2),
          json: catData,
          rawUrl: `/api/v1/tasks/${taskId}/catalog`,
          error: null
        };
      } else {
        return {
          title: '目录结构大纲 (物理页码索引)',
          tag: 'pdf_toc_catalog.json',
          content: '',
          json: null,
          rawUrl: `/api/v1/tasks/${taskId}/catalog`,
          error: '后端未找到该任务的目录结构存证文件 (未生成或接口响应 404)'
        };
      }
    }

    if (type === 'knowledge_base') {
      let directMd = null;
      try {
        const directRes = await apiClient.get(`/v1/tasks/${taskId}/knowledge-base`);
        if (typeof directRes === 'string' && directRes.trim().length > 20 && !directRes.startsWith('{"detail"') && !directRes.includes('未找到')) {
          directMd = directRes;
        } else if (directRes?.data && typeof directRes.data === 'string' && directRes.data.trim().length > 20 && !directRes.data.startsWith('{"detail"') && !directRes.data.includes('未找到')) {
          directMd = directRes.data;
        }
      } catch (_) {}

      if (directMd) {
        return {
          title: '标准 Markdown 知识库 (AI 清洗构建)',
          tag: 'knowledge_base.md',
          content: directMd,
          json: null,
          rawUrl: `/api/v1/tasks/${taskId}/knowledge-base`,
          error: null
        };
      }

      return {
        title: '标准 Markdown 知识库 (AI 清洗构建)',
        tag: 'knowledge_base.md',
        content: '',
        json: null,
        rawUrl: `/api/v1/tasks/${taskId}/knowledge-base`,
        error: '后端未找到该任务的 AI Markdown 知识库存证文件 (接口响应 404 Not Found)'
      };
    }

    return { title: '', tag: '', content: '', json: null, rawUrl: '', error: '未知产物类型' };
  };

  // 在新窗口打开完整富文本或格式化代码 (杜绝 404 裸接口)
  const handleOpenInNewWindow = async (type, task, content) => {
    if (type === 'pdf') {
      const adminToken = localStorage.getItem('edd_admin_token') || '';
      const baseUrl = task?.report_id 
        ? `${remoteApiHost}/api/v1/reports/${task.report_id}/pdf` 
        : `${remoteApiHost}/api/v1/tasks/${task?.id}/pdf`;
      const url = `${baseUrl}${adminToken ? `?token=${encodeURIComponent(adminToken)}` : ''}`;
      window.open(url, '_blank');
      return;
    }

    const win = window.open('', '_blank');
    if (!win) {
      message.warning('弹窗被浏览器拦截，请允许弹出新窗口');
      return;
    }

    const titleMap = {
      knowledge_base: `标准 Markdown 知识库 - ${task?.company_name || '企业尽调'}`,
      content_text: `坐标对齐纯文本 - ${task?.company_name || '企业尽调'}`,
      catalog: `目录结构大纲 - ${task?.company_name || '企业尽调'}`
    };

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${titleMap[type] || '尽调底稿存证'}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            background-color: #f8fafc;
            color: #0f172a;
            margin: 0;
            padding: 40px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div style="font-size: 14px; color: #64748b;">正在加载真实数据中台存证底稿...</div>
      </body>
      </html>
    `);

    let finalContent = content;
    let finalError = null;
    if (!finalContent || !finalContent.trim()) {
      const res = await fetchArtifactContent(type, task);
      finalContent = res.content;
      finalError = res.error;
    }

    if (finalError || !finalContent) {
      win.document.body.innerHTML = `
        <div style="max-width: 600px; margin: 60px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px 24px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
          <div style="font-size: 36px; margin-bottom: 12px;">⚠️</div>
          <h2 style="font-size: 16px; font-weight: bold; color: #0f172a; margin: 0 0 8px;">未找到该存证文件</h2>
          <p style="font-size: 13px; color: #64748b; margin: 0 0 16px;">${finalError || '后端接口响应 404 Not Found，该任务尚未生成该存证文件。'}</p>
          <div style="font-family: monospace; font-size: 11px; color: #94a3b8; background: #f8fafc; padding: 6px 12px; border-radius: 6px; display: inline-block; border: 1px solid #e2e8f0;">404 Not Found</div>
        </div>
      `;
      return;
    }

    const renderedHtml = type === 'knowledge_base' ? renderMarkdown(finalContent) : '';
    const bodyContent = type === 'knowledge_base'
      ? `<div class="content">${renderedHtml}</div>`
      : `<pre class="raw-pre">${String(finalContent).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>`;

    win.document.body.innerHTML = `
      <div class="container">
        <div class="header">
          <div>
            <div class="title">${titleMap[type] || '尽调底稿存证'}</div>
            <div class="subtitle">单号: ${task?.task_no || task?.id} | 主体: ${task?.company_name || '目标企业'}</div>
          </div>
          <div class="tools">
            <button onclick="window.print()">打印 / 另存为 PDF</button>
          </div>
        </div>
        ${bodyContent}
      </div>
    `;

    const styleEl = win.document.createElement('style');
    styleEl.innerHTML = `
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        background-color: #f8fafc;
        color: #0f172a;
        margin: 0;
        padding: 24px 16px;
        line-height: 1.7;
        text-align: left;
      }
      .container {
        max-width: 920px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 32px 40px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.04);
      }
      .header {
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 16px;
        margin-bottom: 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .title { font-size: 18px; font-weight: bold; color: #0f172a; }
      .subtitle { font-size: 12px; color: #64748b; font-family: monospace; margin-top: 4px; }
      .tools button {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 12px;
        cursor: pointer;
        color: #334155;
        font-weight: 500;
      }
      .tools button:hover { background: #e2e8f0; }
      .content h1 { font-size: 20px; margin-top: 0; color: #0f172a; border-bottom: 2px solid #0096db; padding-bottom: 8px; }
      .content h2 { font-size: 16px; margin-top: 24px; margin-bottom: 12px; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
      .content h3 { font-size: 14px; margin-top: 18px; margin-bottom: 8px; color: #0284c7; }
      .content table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
      .content th, .content td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
      .content th { background: #f8fafc; font-weight: 600; color: #334155; }
      .content blockquote { border-left: 4px solid #0096db; margin: 12px 0; padding: 10px 16px; background: #f0f9ff; color: #0369a1; border-radius: 0 8px 8px 0; }
      .content ul, .content ol { padding-left: 20px; }
      .content li { margin-bottom: 4px; font-size: 13.5px; color: #334155; }
      .raw-pre {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 16px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-all;
        color: #1e293b;
        line-height: 1.6;
      }
      @media print {
        body { background: #fff; padding: 0; }
        .container { border: none; box-shadow: none; padding: 0; }
        .tools { display: none; }
      }
    `;
    win.document.head.appendChild(styleEl);
  };

  // 中间产物与知识库在线查阅预览处理
  const handleOpenArtifact = async (type, task = selectedTask) => {
    if (!task) return;
    setArtifactModalType(type);
    setArtifactModalOpen(true);
    setArtifactLoading(true);
    setArtifactModalContent('');
    setArtifactModalJson(null);
    setArtifactModalError(null);
    setArtifactViewTab('rendered');
    setCopiedArtifact(false);

    try {
      const res = await fetchArtifactContent(type, task);
      setArtifactModalTitle(res.title);
      setArtifactModalTag(res.tag);
      setArtifactModalContent(res.content);
      setArtifactModalJson(res.json);
      setArtifactRawUrl(res.rawUrl);
      setArtifactModalError(res.error || null);
    } catch (err) {
      console.error('获取底稿产物失败:', err);
      setArtifactModalError('【读取异常】拉取真实接口数据失败: ' + (err.message || '网络或服务端异常'));
    } finally {
      setArtifactLoading(false);
    }
  };

  // 复制产物内容
  const handleCopyArtifact = async () => {
    if (!artifactModalContent) return;
    const ok = await copyToClipboard(artifactModalContent);
    if (ok) {
      setCopiedArtifact(true);
      message.success('已复制到剪贴板');
      setTimeout(() => setCopiedArtifact(false), 2000);
    } else {
      message.error('复制失败，请手动选择复制');
    }
  };

  // 下载产物文件
  const handleDownloadArtifact = () => {
    if (!artifactModalContent) return;
    const ext = artifactModalType === 'knowledge_base' ? 'md' : artifactModalType === 'catalog' ? 'json' : 'txt';
    const blob = new Blob([artifactModalContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${artifactModalType}_${selectedTask?.task_no || selectedTask?.id || 'export'}.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(`已保存下载: ${link.download}`);
  };

  // 打开任务详情抽屉
  const handleOpenDetail = (task) => {
    setSelectedTask(task);
    setAdminProgressData(task); // 优先立即呈现已知基础元数据，杜绝白屏/跳登
    updateArtifactStatuses(task);
    setDetailDrawerOpen(true);
    setActiveTab('logs');
    fetchAdminProgress(task.id, false, task);
  };

  // 管理员介入操作 1: 模拟/强制确认授权 (POST /v1/tasks/{task_id}/authorize)
  const handleAuthorizeTask = async (task) => {
    Modal.confirm({
      title: '确认手动模拟/确认授权？',
      content: `将强制将任务【${task.company_name}】(单号: ${task.task_no || task.id}) 标记为法人已授权通过，并立即拉起后端全流程 AI 尽调流水线。`,
      okText: '确认强制通过',
      okType: 'primary',
      cancelText: '取消',
      onOk: async () => {
        setActionTaskId(task.id);
        try {
          const res = await apiClient.post(`/v1/tasks/${task.id}/authorize`);
          message.success(res.message || '已成功强制确认授权，尽调流水线已启动！');
          await fetchTasks(true);
          if (detailDrawerOpen && selectedTask?.id === task.id) {
            fetchAdminProgress(task.id);
          }
        } catch (err) {
          message.error(err.response?.data?.detail || err.message || '操作失败');
        } finally {
          setActionTaskId(null);
        }
      }
    });
  };

  // 管理员介入操作 2: 一键重试分析 (POST /v1/tasks/{task_id}/retry-analysis)
  const handleRetryAnalysis = async (task) => {
    setActionTaskId(task.id);
    const retryReqId = generateRequestId('req-admin-retry');
    // 立即乐观更新当前任务状态为 ai_analyzing 并稳固锁定在步骤 3 (AI 研判, 75%)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'ai_analyzing', is_retrying: true, latest_request_id: retryReqId } : t));
    if (selectedTask?.id === task.id) {
      setSelectedTask(prev => ({ ...prev, status: 'ai_analyzing', is_retrying: true, latest_request_id: retryReqId }));
    }
    try {
      const res = await apiClient.post(
        `/v1/tasks/${task.id}/retry-analysis`,
        {},
        { headers: { 'X-Request-ID': retryReqId } }
      );
      message.success(res.message || '已重新从报告分析环节拉起 AI 研判！');
      await fetchTasks(true);
      if (detailDrawerOpen && selectedTask?.id === task.id) {
        fetchAdminProgress(task.id);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || err.message || '重试分析失败');
    } finally {
      setActionTaskId(null);
    }
  };

  // 管理员介入操作 3: 重新发起授权 (POST /v1/tasks/{task_id}/reauth)
  const handleReauthTask = async (task) => {
    setActionTaskId(task.id);
    try {
      const res = await apiClient.post(`/v1/tasks/${task.id}/reauth`);
      message.success(res.message || '已重新生成法人授权链接与二维码！');
      await fetchTasks(true);
      if (detailDrawerOpen && selectedTask?.id === task.id) {
        fetchAdminProgress(task.id);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || err.message || '重新发起授权失败');
    } finally {
      setActionTaskId(null);
    }
  };

  // 管理员介入操作 4: 同步三方授权状态 (POST /v1/tasks/{task_id}/sync)
  const handleSyncTask = async (task) => {
    setActionTaskId(task.id);
    try {
      const res = await apiClient.post(`/v1/tasks/${task.id}/sync`);
      if (res.code === 0) {
        if (res.data?.authorized) {
          message.success(res.message || '三方微风企授权核验成功！');
        } else {
          message.warning(res.message || '三方未检测到法人实名授权完成');
        }
      }
      await fetchTasks(true);
      if (detailDrawerOpen && selectedTask?.id === task.id) {
        fetchAdminProgress(task.id);
      }
    } catch (err) {
      message.error(err.response?.data?.detail || '校验授权状态失败');
    } finally {
      setActionTaskId(null);
    }
  };

  // 管理员介入操作 5: 取消任务并退还额度 (POST /v1/tasks/{task_id}/cancel)
  const handleCancelTask = async (task) => {
    Modal.confirm({
      title: '确认人工取消该尽调任务？',
      content: `取消后任务【${task.company_name}】将置为已取消状态，未消耗的尽调额度将自动原路退还至用户账户。`,
      okText: '确认取消任务',
      okType: 'danger',
      cancelText: '暂不取消',
      onOk: async () => {
        setActionTaskId(task.id);
        try {
          const res = await apiClient.post(`/v1/tasks/${task.id}/cancel`);
          message.success(res.message || '任务已取消，额度已退还');
          await fetchTasks(true);
          if (detailDrawerOpen && selectedTask?.id === task.id) {
            setDetailDrawerOpen(false);
          }
        } catch (err) {
          message.error(err.response?.data?.detail || '取消失败');
        } finally {
          setActionTaskId(null);
        }
      }
    });
  };

  // 管理员介入操作 6: 删除任务 (DELETE /v1/tasks/{task_id})
  const handleDeleteTask = async (task) => {
    Modal.confirm({
      title: '确认彻底删除该任务记录？',
      content: `企业主体：${task.company_name}（单号: ${task.task_no || task.id}），删除后记录不可恢复。`,
      okText: '确认删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        setActionTaskId(task.id);
        try {
          await apiClient.delete(`/v1/tasks/${task.id}`);
          message.success('任务记录已彻底删除');
          await fetchTasks(true);
          if (detailDrawerOpen && selectedTask?.id === task.id) {
            setDetailDrawerOpen(false);
          }
        } catch (err) {
          message.error(err.response?.data?.detail || '删除失败');
        } finally {
          setActionTaskId(null);
        }
      }
    });
  };

  // 复制全量真实日志
  const handleCopyLogs = async (logs) => {
    if (!logs || (Array.isArray(logs) && logs.length === 0)) {
      message.warning('当前暂无日志可复制');
      return;
    }
    let text = '';
    if (typeof logs === 'string') {
      text = logs;
    } else if (Array.isArray(logs)) {
      text = logs.map((l, idx) => {
        if (typeof l === 'string') return `[${idx + 1}] ${l}`;
        const timeStr = l.time ? `[${l.time}] ` : '';
        return `[${idx + 1}] ${timeStr}${l.content || JSON.stringify(l)}`;
      }).join('\n');
    } else {
      text = JSON.stringify(logs, null, 2);
    }
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedLog(true);
      message.success('已复制全量诊断日志');
      setTimeout(() => setCopiedLog(false), 2000);
    } else {
      message.error('复制失败，请手动选择复制');
    }
  };

  // 过滤任务
  const filteredTasks = tasks.filter(t => {
    // 关键词过滤
    if (keyword) {
      const kw = keyword.toLowerCase().trim();
      const matchComp = (t.company_name || '').toLowerCase().includes(kw);
      const matchCode = (t.credit_code || '').toLowerCase().includes(kw);
      const matchNo = (t.task_no || t.id || '').toLowerCase().includes(kw);
      const matchPhone = (t.user_phone || '').toLowerCase().includes(kw);
      if (!matchComp && !matchCode && !matchNo && !matchPhone) return false;
    }
    // 状态过滤
    if (statusFilter) {
      if (statusFilter === 'running') {
        return t.status === 'pulling_data' || t.status === 'ai_analyzing';
      }
      if (statusFilter === 'waiting') {
        return t.status === 'waiting_auth' || t.status === 'auth_failed';
      }
      if (statusFilter === 'failed') {
        return t.status === 'failed' || t.status === 'auth_failed';
      }
      return t.status === statusFilter;
    }
    return true;
  });

  // 分页截取
  const paginatedTasks = filteredTasks.slice((page - 1) * pageSize, page * pageSize);

  // KPI 统计
  const kpiTotal = tasks.length;
  const kpiRunning = tasks.filter(t => t.status === 'pulling_data' || t.status === 'ai_analyzing').length;
  const kpiWaiting = tasks.filter(t => t.status === 'waiting_auth' || t.status === 'auth_failed').length;
  const kpiFailed = tasks.filter(t => t.status === 'failed').length;
  const kpiCompleted = tasks.filter(t => t.status === 'completed').length;

  // 判断任务是否实质处于失败/异常中断状态 (全面检测状态、错误信息以及全量日志)
  const isTaskFailed = (task, progressData = null) => {
    if (!task) return false;
    if (task.status === 'failed') return true;
    if (task.error_message && !task.is_retrying && actionTaskId !== task.id) return true;
    
    // 检查 progressData 或 task 中的各类日志
    const allLogs = [
      ...(Array.isArray(progressData?.sanitized_logs) ? progressData.sanitized_logs : []),
      ...(Array.isArray(progressData?.raw_thinking_logs) ? progressData.raw_thinking_logs : []),
      ...(Array.isArray(progressData?.raw_logs) ? progressData.raw_logs : []),
      ...(Array.isArray(progressData?.logs) ? progressData.logs : []),
      ...(Array.isArray(task?.sanitized_logs) ? task.sanitized_logs : []),
      ...(Array.isArray(task?.raw_thinking_logs) ? task.raw_thinking_logs : []),
      ...(Array.isArray(task?.raw_logs) ? task.raw_logs : []),
      ...(Array.isArray(task?.logs) ? task.logs : [])
    ];

    if (allLogs.length > 0) {
      for (let i = allLogs.length - 1; i >= 0; i--) {
        const item = allLogs[i];
        const content = typeof item === 'string' ? item : (item?.content || item?.text || item?.message || '');
        if (content.includes('用户重新发起报告分析') || content.includes('正在重新启动')) {
          return false; // 刚发起了重试，正在进行中
        }
        if (content.includes('[失败]') || content.includes('异常中断') || content.includes('大模型提取失败') || content.includes('model_not_found') || content.includes('503')) {
          return true;
        }
      }
    }
    return false;
  };

  // 标准化进度与步骤解析 (1 授权 25% -> 2 数据获取 50% -> 3 AI 研判 75% -> 4 报告生成 100%)
  const getTaskStepInfo = (task, progressData = null) => {
    if (!task) return { step: 1, percentage: 25, title: '授权信息' };

    const pData = progressData || (selectedTask?.id === task?.id ? adminProgressData : null);
    const data = { ...task, ...pData };

    const isFailed = isTaskFailed(task, progressData);

    if (data.status === 'completed' || data.is_completed || data.report_id || (data.percentage >= 100 && !isFailed)) {
      return { step: 4, percentage: 100, title: '报告生成' };
    }

    if (data.status === 'waiting_auth' || data.status === 'auth_failed') {
      return { step: 1, percentage: 25, title: '授权信息' };
    }

    // 优先使用明确的 step (1~4)
    if (typeof data.step === 'number' && data.step >= 1 && data.step <= 4) {
      const stepConfig = DD_STEPS[data.step - 1];
      const percentage = typeof data.percentage === 'number' ? data.percentage : stepConfig.percentage;
      return {
        step: data.step,
        percentage,
        title: data.step_title || stepConfig.title
      };
    }

    // 根据 status 映射
    if (data.status === 'pulling_data') {
      return { step: 2, percentage: 50, title: '数据获取' };
    }

    if (data.status === 'ai_analyzing' || data.is_retrying || actionTaskId === data.id) {
      return { step: 3, percentage: 75, title: 'AI 研判' };
    }

    if (data.status === 'generating_report') {
      return { step: 4, percentage: 75, title: '报告生成' };
    }

    // 若有上一成功节点 last_successful_step，当前步骤为 last_successful_step + 1
    if (typeof data.last_successful_step === 'number') {
      const nextStep = Math.min(4, Math.max(1, data.last_successful_step + 1));
      const stepConfig = DD_STEPS[nextStep - 1] || DD_STEPS[0];
      return {
        step: nextStep,
        percentage: stepConfig.percentage,
        title: stepConfig.title
      };
    }

    if (isFailed) {
      return { step: 3, percentage: 75, title: 'AI 研判' };
    }

    return { step: 2, percentage: 50, title: '数据获取' };
  };

  // 状态 Badge 渲染
  const renderStatusBadge = (status, task = null, progressData = null) => {
    const isFailed = isTaskFailed(task, progressData) || status === 'failed';

    if (task?.is_retrying || actionTaskId === task?.id) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-cyan-50 text-[#0084c2] border border-cyan-200 shadow-2xs">
          <Sparkles className="w-3 h-3 mr-1 text-[#0096DB] animate-spin" /> 执行中 (重试)
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
          <XCircle className="w-3 h-3 mr-1 text-rose-600" /> 任务中断 / 待重试
        </span>
      );
    }
    if (status === 'completed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" /> 报告生成完毕
        </span>
      );
    }
    if (status === 'ai_analyzing') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-cyan-50 text-[#0084c2] border border-cyan-200 shadow-2xs">
          <Sparkles className="w-3 h-3 mr-1 text-[#0096DB] animate-spin" /> AI 研判中
        </span>
      );
    }
    if (status === 'pulling_data') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-[#0070a4] border border-sky-200 shadow-2xs">
          <Download className="w-3 h-3 mr-1 text-[#0096DB] animate-pulse" /> 数据获取中
        </span>
      );
    }
    if (status === 'waiting_auth') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
          <Clock className="w-3 h-3 mr-1 text-amber-600 animate-pulse" /> 等待授权
        </span>
      );
    }
    if (status === 'auth_failed') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200 shadow-2xs">
          <XCircle className="w-3 h-3 mr-1 text-rose-600" /> 授权失效
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs">
        <Clock className="w-3 h-3 mr-1 text-slate-500" /> 进行中
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 text-slate-900">
      
      {/* 1. 顶部标题栏与全局刷新 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-950 flex items-center gap-2 tracking-tight">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-[#0096DB]" />
              尽调任务监控与介入中心
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold bg-sky-50 text-[#0084c2] border border-sky-200">
              Admin Ops
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            全网实时监控所有企业尽调流水线、工业级思考流诊断、大模型执行报错与人工介入管控
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto flex-wrap">
          {/* 自动轮询开关 */}
          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
              autoRefresh 
                ? 'bg-sky-50 border-sky-200 text-[#0070a4] font-semibold' 
                : 'bg-white border-zinc-200 text-zinc-500'
            }`}
            title="每 8 秒自动拉取最新进度"
          >
            <span className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-[#0096DB] animate-pulse' : 'bg-zinc-300'}`} />
            <span>自动刷新 {autoRefresh ? '开' : '关'}</span>
          </button>

          {/* 手动即时刷新 */}
          <button
            type="button"
            onClick={() => fetchTasks()}
            disabled={loading}
            className="p-1.5 sm:p-2 px-2.5 sm:px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer flex items-center gap-1 text-xs"
            title="立即刷新"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin text-[#0096DB]' : ''}`} />
            <span>刷新数据</span>
          </button>
        </div>
      </div>

      {/* 2. 核心指标卡片 (KPI Summary) */}
      <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3.5">
        <div className="bg-white p-3 sm:p-4 rounded-xl border border-zinc-200 shadow-2xs space-y-1">
          <div className="text-xs font-medium text-zinc-500 flex items-center justify-between">
            <span>总任务数</span>
            <Layers className="w-3.5 h-3.5 text-zinc-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-950">{kpiTotal}</div>
          <div className="text-[10px] text-zinc-400">全量尽调发起记录</div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-sky-100 bg-sky-50/20 shadow-2xs space-y-1">
          <div className="text-xs font-medium text-[#0084c2] flex items-center justify-between">
            <span>实时进行中</span>
            <Activity className="w-3.5 h-3.5 text-[#0096DB] animate-pulse" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-[#0070a4]">{kpiRunning}</div>
          <div className="text-[10px] text-[#0084c2]/80">数据归集 / AI研判中</div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-amber-100 bg-amber-50/20 shadow-2xs space-y-1">
          <div className="text-xs font-medium text-amber-800 flex items-center justify-between">
            <span>等待授权</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-amber-700">{kpiWaiting}</div>
          <div className="text-[10px] text-amber-600/80">待法定代表人扫码</div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-rose-100 bg-rose-50/20 shadow-2xs space-y-1">
          <div className="text-xs font-medium text-rose-700 flex items-center justify-between">
            <span>异常中断</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-rose-700">{kpiFailed}</div>
          <div className="text-[10px] text-rose-600/80">需重试或管理员介入</div>
        </div>

        <div className="bg-white p-3 sm:p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-emerald-800 flex items-center justify-between">
            <span>报告生成成功</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-black font-mono text-emerald-700">{kpiCompleted}</div>
          <div className="text-[10px] text-emerald-600/80">已归档报告资产库</div>
        </div>
      </div>

      {/* 3. 检索与分类过滤器 */}
      <div className="mt-4 sm:mt-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 sm:gap-3.5 bg-white p-3 sm:p-3.5 rounded-xl border border-zinc-200 shadow-2xs">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); }} className="flex items-center w-full md:w-96 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-200 focus-within:border-[#0096DB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0096DB]/20 transition-all">
          <Search className="w-4 h-4 text-zinc-400 mr-2 shrink-0" />
          <input
            type="text"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            placeholder="搜索企业主体、税号、任务单号、用户手机号..."
            className="w-full bg-transparent border-0 text-xs text-slate-900 placeholder:text-zinc-400 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { key: '', label: '全部' },
            { key: 'running', label: '执行中' },
            { key: 'waiting', label: '待授权' },
            { key: 'failed', label: '异常中断' },
            { key: 'completed', label: '已完成' },
            { key: 'cancelled', label: '已取消' }
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => { setStatusFilter(item.key); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === item.key
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. 任务列表容器：PC 端表格视图 + 移动端卡片视图 */}
      <div className="mt-4 bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-2xs">
        
        {/* 未登录或空状态统一提示 */}
        {!localStorage.getItem('edd_admin_token') ? (
          <div className="py-16 text-center text-zinc-500 space-y-3 p-4">
            <ShieldCheck className="w-10 h-10 mx-auto text-amber-500" />
            <div>
              <p className="font-semibold text-slate-800 text-sm">需要管理员权限访问监控大盘</p>
              <p className="text-xs text-zinc-400 mt-1">检测到您尚未登录管理后台或凭证已过期</p>
            </div>
            <div>
              <a
                href="/admin/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-all"
              >
                <Key className="w-3.5 h-3.5" />
                立即登录管理后台
              </a>
            </div>
          </div>
        ) : loading && tasks.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-2 p-4">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0096DB]" />
            <p className="text-xs">正在同步全量用户尽调任务流水...</p>
          </div>
        ) : paginatedTasks.length === 0 ? (
          <div className="py-16 text-center text-zinc-400 space-y-1.5 p-4">
            <Layers className="w-8 h-8 mx-auto text-zinc-300" />
            <p className="font-medium text-slate-700">未检索到匹配的尽调任务</p>
            <p className="text-[11px]">请更换搜索关键字或调整状态过滤条件</p>
          </div>
        ) : (
          <>
            {/* 🖥️ PC / 平板端：经典 6 列大盘表格视图 (md:block) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold select-none">
                    <th className="py-3 px-4">任务单号 / 目标企业</th>
                    <th className="py-3 px-4">归属用户</th>
                    <th className="py-3 px-4">当前进度节点</th>
                    <th className="py-3 px-4">运行状态</th>
                    <th className="py-3 px-4">发起时间</th>
                    <th className="py-3 px-4 text-right">管理员介入操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paginatedTasks.map((t) => {
                    const stepInfo = getTaskStepInfo(t);
                    const isProcessing = actionTaskId === t.id;

                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60 transition-colors group">
                        {/* 企业与单号 */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-950 text-[13px] flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-[#0096DB] shrink-0" />
                              <span>{t.company_name || '未命名企业'}</span>
                            </div>
                            <div className="text-[10.5px] font-mono text-zinc-400 flex items-center gap-2">
                              <span>单号: {t.task_no || t.id}</span>
                              {t.credit_code && <span className="text-zinc-500">· {t.credit_code}</span>}
                            </div>
                          </div>
                        </td>

                        {/* 归属用户 */}
                        <td className="py-3 px-4">
                          <div className="space-y-0.5">
                            <div className="font-mono font-semibold text-slate-900 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              <span>{t.user_phone || '系统创建'}</span>
                            </div>
                            {t.user_quota !== undefined && (
                              <div className="text-[10px] text-zinc-400">
                                剩余额度: <strong className="font-mono text-slate-700">{t.user_quota}</strong> 次
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 当前进度节点 */}
                        <td className="py-3 px-4">
                          <div className="w-36 space-y-1">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-800">
                                步骤 {stepInfo.step}/4 · {stepInfo.title}
                              </span>
                              <span className="font-mono font-bold text-[#0084c2]">
                                {stepInfo.percentage}%
                              </span>
                            </div>
                            {/* Mini 进度条 */}
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  t.status === 'failed'
                                    ? 'bg-rose-500'
                                    : t.status === 'completed'
                                    ? 'bg-emerald-500'
                                    : t.status === 'waiting_auth'
                                    ? 'bg-amber-500'
                                    : 'bg-[#0096DB]'
                                }`}
                                style={{ width: `${stepInfo.percentage}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* 运行状态 */}
                        <td className="py-3 px-4">
                          {renderStatusBadge(t.status, t)}
                        </td>

                        {/* 发起时间 */}
                        <td className="py-3 px-4 text-zinc-500 font-mono text-[11px]">
                          {formatLocalTime(t.created_at)}
                        </td>

                        {/* 管理员介入操作栏 */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* 1. 查看详细进度与工业级日志 */}
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(t)}
                              className="p-1.5 rounded-md border border-zinc-200 bg-white hover:bg-sky-50 hover:text-[#0084c2] hover:border-sky-200 text-slate-700 transition-all cursor-pointer shadow-2xs text-xs flex items-center gap-1 font-medium"
                              title="查看工业级执行进度与原始日志"
                            >
                              <Terminal className="w-3.5 h-3.5 text-[#0096DB]" />
                              <span>监控详情</span>
                            </button>

                            {/* 2. 介入操作: 模拟通过授权 */}
                            {(t.status === 'waiting_auth' || t.status === 'auth_failed') && (
                              <button
                                type="button"
                                onClick={() => handleAuthorizeTask(t)}
                                disabled={isProcessing}
                                className="p-1.5 rounded-md border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-all cursor-pointer shadow-2xs text-xs flex items-center gap-1 font-semibold"
                                title="手动模拟通过微风企实名授权并启动流水线"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-700" />
                                <span>模拟授权</span>
                              </button>
                            )}

                            {/* 3. 介入操作: 一键重试分析 */}
                            {t.status === 'failed' && (
                              <button
                                type="button"
                                onClick={() => handleRetryAnalysis(t)}
                                disabled={isProcessing}
                                className="p-1.5 rounded-md border border-sky-300 bg-sky-50 hover:bg-sky-100 text-[#0070a4] transition-all cursor-pointer shadow-2xs text-xs flex items-center gap-1 font-semibold"
                                title="从断点阶段重新触发流水线"
                              >
                                <RotateCw className={`w-3.5 h-3.5 text-[#0096DB] ${isProcessing ? 'animate-spin' : ''}`} />
                                <span>重试</span>
                              </button>
                            )}

                            {/* 4. 介入操作: 同步三方状态 */}
                            {(t.status === 'pulling_data' || t.status === 'waiting_auth') && (
                              <button
                                type="button"
                                onClick={() => handleSyncTask(t)}
                                disabled={isProcessing}
                                className="p-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-all cursor-pointer shadow-2xs"
                                title="向三方微风企同步授权与数据状态"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-[#0096DB]' : ''}`} />
                              </button>
                            )}

                            {/* 5. 介入操作: 重新发起授权 */}
                            {t.status === 'auth_failed' && (
                              <button
                                type="button"
                                onClick={() => handleReauthTask(t)}
                                disabled={isProcessing}
                                className="p-1.5 rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition-all cursor-pointer shadow-2xs"
                                title="重新生成授权二维码"
                              >
                                <RotateCw className="w-3.5 h-3.5 text-amber-600" />
                              </button>
                            )}

                            {/* 6. 取消任务 */}
                            {(t.status === 'waiting_auth' || t.status === 'auth_failed') && (
                              <button
                                type="button"
                                onClick={() => handleCancelTask(t)}
                                disabled={isProcessing}
                                className="p-1.5 rounded-md border border-zinc-200 bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all cursor-pointer"
                                title="取消任务并退还额度"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* 8. 彻底删除 */}
                            <button
                              type="button"
                              onClick={() => handleDeleteTask(t)}
                              disabled={isProcessing}
                              className="p-1.5 rounded-md border border-zinc-200 bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-all cursor-pointer"
                              title="彻底删除此任务记录"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 📱 移动端专属：高保真响应式任务卡片列表 (block md:hidden) */}
            <div className="block md:hidden divide-y divide-zinc-100">
              {paginatedTasks.map((t) => {
                const stepInfo = getTaskStepInfo(t);
                const isProcessing = actionTaskId === t.id;

                return (
                  <div key={t.id} className="p-3.5 space-y-3 hover:bg-slate-50/70 transition-colors">
                    
                    {/* 头部：企业名称、单号与状态标签 */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="font-bold text-slate-950 text-sm flex items-center gap-1.5 truncate">
                          <Building2 className="w-4 h-4 text-[#0096DB] shrink-0" />
                          <span className="truncate">{t.company_name || '未命名企业'}</span>
                        </div>
                        <div className="text-[11px] font-mono text-zinc-400 truncate">
                          单号: {t.task_no || t.id}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {renderStatusBadge(t.status, t)}
                      </div>
                    </div>

                    {/* 元数据行：归属用户与发起时间 */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{t.user_phone || '系统用户'}</span>
                      </div>
                      <div>{formatLocalTime(t.created_at)}</div>
                    </div>

                    {/* 4 步进度可视化胶囊条 */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">
                          步骤 {stepInfo.step}/4 · {stepInfo.title}
                        </span>
                        <span className="font-mono font-bold text-[#0084c2]">
                          {stepInfo.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            t.status === 'failed'
                              ? 'bg-rose-500'
                              : t.status === 'completed'
                              ? 'bg-emerald-500'
                              : t.status === 'waiting_auth'
                              ? 'bg-amber-500'
                              : 'bg-[#0096DB]'
                          }`}
                          style={{ width: `${stepInfo.percentage}%` }}
                        />
                      </div>
                    </div>

                    {/* 移动端操作按钮组 */}
                    <div className="flex items-center gap-2 pt-0.5 flex-wrap">
                      {/* 1. 监控详情 (全宽或主要) */}
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(t)}
                        className="flex-1 min-w-[100px] py-1.5 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-sky-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <Terminal className="w-3.5 h-3.5 text-[#0096DB]" />
                        <span>监控详情</span>
                      </button>

                      {/* 2. 模拟授权 */}
                      {(t.status === 'waiting_auth' || t.status === 'auth_failed') && (
                        <button
                          type="button"
                          onClick={() => handleAuthorizeTask(t)}
                          disabled={isProcessing}
                          className="py-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                          <span>模拟授权</span>
                        </button>
                      )}

                      {/* 3. 一键重试 */}
                      {t.status === 'failed' && (
                        <button
                          type="button"
                          onClick={() => handleRetryAnalysis(t)}
                          disabled={isProcessing}
                          className="py-1.5 px-3 rounded-lg bg-[#0096DB] hover:bg-[#0084c2] text-white text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs cursor-pointer"
                        >
                          <RotateCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                          <span>重试</span>
                        </button>
                      )}

                      {/* 4. 辅助操作：同步状态 */}
                      {(t.status === 'pulling_data' || t.status === 'waiting_auth') && (
                        <button
                          type="button"
                          onClick={() => handleSyncTask(t)}
                          disabled={isProcessing}
                          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 shadow-2xs cursor-pointer"
                          title="同步状态"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin text-[#0096DB]' : ''}`} />
                        </button>
                      )}

                      {/* 6. 取消任务 */}
                      {(t.status === 'waiting_auth' || t.status === 'auth_failed') && (
                        <button
                          type="button"
                          onClick={() => handleCancelTask(t)}
                          disabled={isProcessing}
                          className="p-1.5 rounded-lg border border-zinc-200 bg-white text-rose-600 hover:bg-rose-50 shadow-2xs cursor-pointer"
                          title="取消任务"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* 7. 删除 */}
                      <button
                        type="button"
                        onClick={() => handleDeleteTask(t)}
                        disabled={isProcessing}
                        className="p-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-400 hover:text-rose-600 hover:bg-rose-50 shadow-2xs cursor-pointer"
                        title="删除记录"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 分页控制 */}
        <div className="p-3 sm:p-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div>
            共 <strong className="text-slate-900 font-mono">{filteredTasks.length}</strong> 笔尽调任务记录
          </div>
          <Pagination
            current={page}
            pageSize={pageSize}
            total={filteredTasks.length}
            onChange={(p, ps) => {
              setPage(p);
              setPageSize(ps);
            }}
            showSizeChanger={!isMobile}
            pageSizeOptions={['10', '20', '50']}
            size="small"
          />
        </div>
      </div>

      {/* 5. 工业级任务详细监控与介入抽屉 (Admin Progress Drawer) */}
      <Drawer
        title={null}
        placement="right"
        width={isMobile ? '100%' : 760}
        onClose={() => setDetailDrawerOpen(false)}
        open={detailDrawerOpen}
        className="admin-task-drawer"
        styles={{ body: { padding: 0 } }}
      >
        {selectedTask && (() => {
          const effectiveTask = {
            ...selectedTask,
            ...(adminProgressData?.task_id === selectedTask.id ? {
              status: adminProgressData.status || selectedTask.status,
              step: adminProgressData.step ?? selectedTask.step,
              error_message: adminProgressData.error_message || adminProgressData.error || selectedTask.error_message,
              raw_logs: adminProgressData.raw_logs || selectedTask.raw_logs
            } : {})
          };
          const isFailed = isTaskFailed(effectiveTask);
          const sInfo = getTaskStepInfo(effectiveTask);

          return (
            <div className="flex flex-col h-full bg-slate-50 text-slate-900">
              {/* Drawer 顶栏 */}
              <div className="p-4 sm:p-5 bg-white border-b border-zinc-200 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-sm sm:text-base font-bold text-slate-950 flex items-center gap-1.5 truncate">
                        <Building2 className="w-4 h-4 text-[#0096DB] shrink-0" />
                        <span className="truncate">{effectiveTask.company_name}</span>
                      </h2>
                      {renderStatusBadge(effectiveTask.status, effectiveTask)}
                    </div>
                    <div className="text-[11px] sm:text-xs font-mono text-zinc-400 flex items-center gap-2 sm:gap-3 flex-wrap">
                      <span>单号: {effectiveTask.task_no || effectiveTask.id}</span>
                      {effectiveTask.credit_code && <span className="hidden sm:inline">税号: {effectiveTask.credit_code}</span>}
                      {(effectiveTask.latest_request_id || effectiveTask.request_id) && (
                        <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200 text-[10px]">
                          <span>追踪ID: <strong className="font-mono text-slate-800">{effectiveTask.latest_request_id || effectiveTask.request_id}</strong></span>
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const ok = await copyToClipboard(effectiveTask.latest_request_id || effectiveTask.request_id);
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
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right space-y-0.5 hidden xs:block">
                      <div className="text-[11px] sm:text-xs font-mono text-slate-700">
                        用户: <strong>{effectiveTask.user_phone}</strong>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {formatLocalTime(effectiveTask.created_at)}
                      </div>
                    </div>
                    {/* 关闭抽屉按钮 (移动端极度友好) */}
                    <button
                      type="button"
                      onClick={() => setDetailDrawerOpen(false)}
                      className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-slate-900 cursor-pointer"
                      title="关闭详情"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* 4 步流程一体化连接进度条 */}
                <div className="pt-2">
                  <div className="w-full relative flex items-center justify-between">
                    {/* 背景轨道 */}
                    <div className="absolute top-3 sm:top-3.5 -translate-y-1/2 left-[12.5%] right-[12.5%] h-1 bg-slate-200 rounded-full z-0" />
                    {/* 彩色激活轨道 */}
                    <div className="absolute top-3 sm:top-3.5 -translate-y-1/2 left-[12.5%] right-[12.5%] h-1 rounded-full z-0 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isFailed
                            ? 'bg-rose-500'
                            : (effectiveTask.status === 'completed' && !isFailed)
                            ? 'bg-emerald-500'
                            : 'bg-gradient-to-r from-sky-400 to-[#0096DB]'
                        }`}
                        style={{ width: `${((sInfo.step - 1) / 3) * 100}%` }}
                      />
                    </div>

                    {DD_STEPS.map((stepItem) => {
                      const stepNum = stepItem.step;
                      const isPast = (effectiveTask.status === 'completed' && !isFailed) || (stepNum < sInfo.step);
                      const isCurrent = !(effectiveTask.status === 'completed' && !isFailed) && (stepNum === sInfo.step);
                      const Icon = stepItem.icon;

                      let colorStyle = 'bg-white text-slate-400 border-slate-200';
                      if (isPast) {
                        colorStyle = 'bg-emerald-500 text-white border-emerald-500 ring-2 ring-white';
                      } else if (isCurrent) {
                        if (isFailed) {
                          colorStyle = 'bg-rose-500 text-white border-rose-500 ring-2 ring-rose-100 animate-pulse';
                        } else if (effectiveTask.status === 'waiting_auth') {
                          colorStyle = 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-100 animate-pulse';
                        } else {
                          colorStyle = 'bg-[#0096DB] text-white border-[#0096DB] ring-2 ring-sky-200 animate-pulse';
                        }
                      }

                      return (
                        <div key={stepNum} className="flex-1 flex flex-col items-center relative z-10">
                          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 flex items-center justify-center text-xs transition-all ${colorStyle}`}>
                            {isPast ? (
                              <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                            ) : (isCurrent && isFailed) ? (
                              <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[2.5]" />
                            ) : (isCurrent && effectiveTask.status === 'waiting_auth') ? (
                              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                            ) : isCurrent ? (
                              <Loader2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 animate-spin text-white stroke-[2.5]" />
                            ) : (
                              <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-300" />
                            )}
                          </div>
                          <div className="mt-1 text-center">
                            <div className={`text-[10px] sm:text-[11px] ${isCurrent ? (isFailed ? 'font-bold text-rose-600' : 'font-bold text-[#0070a4]') : isPast ? 'text-slate-800 font-medium' : 'text-zinc-400'}`}>
                              {stepItem.title}
                            </div>
                            <div className={`text-[8px] sm:text-[9px] font-mono ${isCurrent ? (isFailed ? 'text-rose-500 font-bold' : 'text-sky-600 font-bold') : isPast ? 'text-emerald-600 font-medium' : 'text-zinc-400'}`}>
                              {stepItem.percentage}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 抽屉内管理介入快捷操作栏 */}
                <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100 flex-wrap">
                  <span className="text-xs font-semibold text-zinc-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0096DB]" />
                    <span>管理员介入:</span>
                  </span>
                  
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(effectiveTask.status === 'waiting_auth' || effectiveTask.status === 'auth_failed') && (
                      <button
                        type="button"
                        onClick={() => handleAuthorizeTask(effectiveTask)}
                        disabled={actionTaskId === effectiveTask.id}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <Key className="w-3 h-3" />
                        <span>强制通过授权</span>
                      </button>
                    )}

                    {isFailed && (
                      <button
                        type="button"
                        onClick={() => handleRetryAnalysis(effectiveTask)}
                        disabled={actionTaskId === effectiveTask.id}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0096DB] hover:bg-[#0084c2] text-white shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCw className={`w-3 h-3 ${actionTaskId === effectiveTask.id ? 'animate-spin' : ''}`} />
                        <span>重试</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleSyncTask(effectiveTask)}
                      disabled={actionTaskId === effectiveTask.id}
                      className="px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-zinc-50 text-slate-700 border border-zinc-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>同步状态</span>
                    </button>

                    {(effectiveTask.status === 'waiting_auth' || effectiveTask.status === 'auth_failed') && (
                      <button
                        type="button"
                        onClick={() => handleCancelTask(effectiveTask)}
                        disabled={actionTaskId === effectiveTask.id}
                        className="px-2.5 py-1 rounded-md text-xs font-medium bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>取消任务退额</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Tab 导航 (思考流日志 | 异常诊断 | 产物底稿) */}
            <div className="px-3 sm:px-5 bg-white border-b border-zinc-200 flex items-center gap-4 sm:gap-6 text-xs overflow-x-auto scrollbar-none">
              {[
                { key: 'logs', label: '思考流实时日志', icon: Terminal },
                { key: 'error', label: '异常诊断与调用链', icon: AlertTriangle },
                { key: 'artifacts', label: '产物与底层底稿', icon: Database }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`py-2.5 sm:py-3 flex items-center gap-1.5 border-b-2 font-semibold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                      isActive 
                        ? 'border-[#0096DB] text-[#0070a4]' 
                        : 'border-transparent text-zinc-500 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* 抽屉正文内容 */}
            <div className="flex-1 p-3.5 sm:p-5 overflow-y-auto space-y-4">
              {loadingAdminProgress ? (
                <div className="py-20 text-center text-zinc-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#0096DB]" />
                  <p className="text-xs">正在调取实时思考日志与存证流...</p>
                </div>
              ) : (
                <>
                  {/* TAB 1: 思考流实时日志 */}
                  {activeTab === 'logs' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-[#0096DB]" />
                          <span>全流程 Thinking Logs</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => scrollToLogsBottom(true)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-zinc-50 text-slate-700 border border-zinc-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                            title="快速滚动到最新日志底部"
                          >
                            <ArrowDown className="w-3 h-3 text-[#0096DB]" />
                            <span>快速置底</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyLogs(extractThinkingLogs(adminProgressData, selectedTask))}
                            className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white hover:bg-zinc-50 text-slate-700 border border-zinc-200 shadow-2xs flex items-center gap-1 cursor-pointer"
                          >
                            {copiedLog ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                            <span>{copiedLog ? '已复制' : '复制全量日志'}</span>
                          </button>
                        </div>
                      </div>

                      {/* 日志容器 - 浅色专业工程底色 (支持自动置底与快速置底) */}
                      <div 
                        ref={logsContainerRef}
                        className="bg-slate-50 text-slate-800 rounded-xl p-3.5 sm:p-4 font-mono text-[10.5px] sm:text-[11px] space-y-2.5 max-h-[380px] sm:max-h-[480px] overflow-y-auto border border-slate-200 shadow-2xs scroll-smooth"
                      >
                        {(() => {
                          const logs = extractThinkingLogs(adminProgressData, selectedTask);
                          
                          if (!logs || logs.length === 0) {
                            return (
                              <div className="py-12 text-center text-slate-400 space-y-2">
                                <FileQuestion className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                                <div className="text-xs font-medium text-slate-500">暂无底层思考流日志</div>
                                <div className="text-[11px] text-slate-400">后端接口尚未产生或未返回该任务的执行流水日志。</div>
                              </div>
                            );
                          }

                          return logs.map((log, idx) => {
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

                            const isErr = textStr.includes('[异常中断]') || textStr.includes('[失败]') || textStr.includes('失败') || textStr.includes('503') || textStr.includes('error') || textStr.includes('Error');
                            const isSucc = textStr.includes('[完成]') || textStr.includes('成功');
                            
                            return (
                              <div key={idx} className="flex items-start gap-1.5 sm:gap-2 leading-relaxed">
                                <span className="text-slate-400 select-none shrink-0 font-medium">[{idx + 1}]</span>
                                {timeStr && <span className="text-[#0084c2] font-semibold select-none shrink-0">[{timeStr}]</span>}
                                {logReqId && (
                                  <span 
                                    className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-sky-50 text-sky-700 border border-sky-200/80 cursor-pointer hover:bg-sky-100 select-none shrink-0"
                                    onClick={async () => {
                                      const ok = await copyToClipboard(logReqId);
                                      if (ok) {
                                        message.success(`已复制请求ID: ${logReqId}`);
                                      } else {
                                        message.error('复制失败，请手动选择复制');
                                      }
                                    }}
                                    title="点击复制此步骤的请求追踪 ID"
                                  >
                                    trace: {logReqId.length > 18 ? `${logReqId.slice(0, 10)}...${logReqId.slice(-6)}` : logReqId}
                                  </span>
                                )}
                                <span className={`flex-1 break-all ${isErr ? 'text-rose-700 font-semibold' : isSucc ? 'text-emerald-700 font-semibold' : isLast ? 'text-slate-900 font-medium' : 'text-slate-700'}`}>
                                  {textStr}
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: 异常诊断与调用链 */}
                  {activeTab === 'error' && (
                    <div className="space-y-4">
                      {isTaskFailed(selectedTask, adminProgressData) || selectedTask.status === 'failed' || adminProgressData?.error_message || adminProgressData?.error ? (
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 sm:p-4 space-y-3">
                          <div className="flex items-center gap-2 text-rose-900 font-bold text-xs">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>尽调任务异常中断详情</span>
                          </div>

                          <div className="bg-white/90 p-3 rounded-lg border border-rose-200/80 font-mono text-xs text-rose-950 break-words leading-relaxed space-y-1">
                            <div className="text-rose-600 font-semibold text-[11px]">报错详情 / Stacktrace:</div>
                            <div>
                              {adminProgressData?.error_message || 
                               adminProgressData?.error_detail || 
                               adminProgressData?.error || 
                               selectedTask.error_message || 
                               '任务执行遇到异常中断，请点击上方【重试】或检查模型服务与网络连通性'}
                            </div>
                          </div>

                          <div className="space-y-1 text-xs text-rose-800">
                            <div className="font-semibold">💡 管理员处置建议：</div>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] sm:text-[11.5px] text-rose-700">
                              <li>企业底稿数据已安全保全，无需用户重新授权。</li>
                              <li>点击上方【重试】可原地重新调用大模型生成研判报告与知识库。</li>
                              <li>如重试多次失败，请在【系统配置】核对大模型 API Key 与网络连通性。</li>
                            </ul>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                          <div className="font-bold text-emerald-950 text-sm">流水线运行健康，无异常中断记录</div>
                          <p className="text-xs text-emerald-700">各阶段数据通信、模型调用与状态回调均处于正常流转状态。</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: 产物与底层底稿 */}
                  {activeTab === 'artifacts' && (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-[#0096DB]" />
                          <span>底层中间产物与 MinIO 对象存储底稿 (真实接口调取)</span>
                        </div>
                        <span className="text-[11px] font-normal text-slate-500">直接展示各环节产物生成就绪状态</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                        {/* 1. 原始高保真尽调 PDF */}
                        {artifactStatuses.pdf.exists ? (
                          <div 
                            onClick={() => handleOpenArtifact('pdf', selectedTask)}
                            className="bg-white p-3 sm:p-3.5 rounded-xl border border-rose-200 bg-rose-50/10 shadow-2xs space-y-2 cursor-pointer hover:border-rose-400 hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-rose-600" /> 原始尽调 PDF 底稿
                              </span>
                              <Tag color="green">
                                {artifactStatuses.pdf.tag}
                              </Tag>
                            </div>
                            <p className="text-[11px] text-zinc-500">{artifactStatuses.pdf.desc}</p>
                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>在线查阅 PDF</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInNewWindow('pdf', selectedTask);
                                }}
                                className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-[#0084c2] cursor-pointer"
                                title="在新窗口打开 PDF"
                              >
                                <span>新窗口</span> <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-none space-y-2 opacity-60 select-none cursor-not-allowed">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-500 flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-slate-400" /> 原始尽调 PDF 底稿
                              </span>
                              <Tag color="default">
                                {artifactStatuses.pdf.tag}
                              </Tag>
                            </div>
                            <p className="text-[11px] text-slate-400">{artifactStatuses.pdf.desc}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <FileQuestion className="w-3.5 h-3.5" /> 暂未就绪 / 404
                              </span>
                              <span className="text-[11px] text-slate-300">无存证</span>
                            </div>
                          </div>
                        )}

                        {/* 2. 纯文本 full_text_content */}
                        {artifactStatuses.content_text.exists ? (
                          <div 
                            onClick={() => handleOpenArtifact('content_text', selectedTask)}
                            className="bg-white p-3 sm:p-3.5 rounded-xl border border-sky-200 bg-sky-50/10 shadow-2xs space-y-2 cursor-pointer hover:border-sky-400 hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <Terminal className="w-4 h-4 text-sky-600" /> 坐标对齐纯文本
                              </span>
                              <Tag color="blue">
                                {artifactStatuses.content_text.tag}
                              </Tag>
                            </div>
                            <p className="text-[11px] text-zinc-500">{artifactStatuses.content_text.desc}</p>
                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>在线查阅文本源</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInNewWindow('content_text', selectedTask);
                                }}
                                className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-[#0084c2] cursor-pointer"
                                title="在新窗口查看完整文本"
                              >
                                <span>新窗口</span> <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-none space-y-2 opacity-60 select-none cursor-not-allowed">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-500 flex items-center gap-1.5">
                                <Terminal className="w-4 h-4 text-slate-400" /> 坐标对齐纯文本
                              </span>
                              <Tag color="default">
                                {artifactStatuses.content_text.tag}
                              </Tag>
                            </div>
                            <p className="text-[11px] text-slate-400">{artifactStatuses.content_text.desc}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <FileQuestion className="w-3.5 h-3.5" /> 暂未提取 / 404
                              </span>
                              <span className="text-[11px] text-slate-300">无存证</span>
                            </div>
                          </div>
                        )}

                        {/* 3. 目录大纲 catalog */}
                        {artifactStatuses.catalog.exists ? (
                          <div 
                            onClick={() => handleOpenArtifact('catalog', selectedTask)}
                            className="bg-white p-3 sm:p-3.5 rounded-xl border border-amber-200 bg-amber-50/10 shadow-2xs space-y-2 cursor-pointer hover:border-amber-400 hover:shadow-xs transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-amber-600" /> 目录结构大纲
                              </span>
                              <Tag color="orange">
                                {artifactStatuses.catalog.tag}
                              </Tag>
                            </div>
                            <p className="text-[11px] text-zinc-500">{artifactStatuses.catalog.desc}</p>
                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>在线查阅大纲树</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInNewWindow('catalog', selectedTask);
                                }}
                                className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-[#0084c2] cursor-pointer"
                                title="在新窗口查看大纲树"
                              >
                                <span>新窗口</span> <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-none space-y-2 opacity-60 select-none cursor-not-allowed">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-500 flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-slate-400" /> 目录结构大纲
                              </span>
                              <Tag color="default">
                                {artifactStatuses.catalog.tag}
                              </Tag>
                            </div>
                            <p className="text-[11px] text-slate-400">{artifactStatuses.catalog.desc}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <FileQuestion className="w-3.5 h-3.5" /> 暂未解析 / 404
                              </span>
                              <span className="text-[11px] text-slate-300">无存证</span>
                            </div>
                          </div>
                        )}

                        {/* 4. Markdown 知识库 */}
                        {artifactStatuses.knowledge_base.exists ? (
                          <div 
                            onClick={() => handleOpenArtifact('knowledge_base', selectedTask)}
                            className="bg-white p-3 sm:p-3.5 rounded-xl border border-purple-200 bg-purple-50/20 shadow-2xs space-y-2 cursor-pointer hover:border-purple-400 hover:shadow-xs transition-all ring-1 ring-purple-100"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-purple-600" /> 标准 Markdown 知识库
                              </span>
                              <Tag color="purple">
                                {artifactStatuses.knowledge_base.tag}
                              </Tag>
                            </div>
                            <p className="text-[11px] text-zinc-500">{artifactStatuses.knowledge_base.desc}</p>
                            <div className="flex items-center justify-between pt-1">
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>在线打开知识库 (Markdown)</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenInNewWindow('knowledge_base', selectedTask);
                                }}
                                className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-[#0084c2] cursor-pointer"
                                title="在新窗口打开完整 Markdown 知识库"
                              >
                                <span>新窗口</span> <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-slate-100/70 p-3 sm:p-3.5 rounded-xl border border-slate-200/80 shadow-none space-y-2 opacity-60 select-none cursor-not-allowed">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-xs text-slate-500 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4 text-slate-400" /> 标准 Markdown 知识库
                              </span>
                              <Tag color="default">
                                {artifactStatuses.knowledge_base.tag}
                              </Tag>
                            </div>
                            <p className="text-[11px] text-slate-400">{artifactStatuses.knowledge_base.desc}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                <FileQuestion className="w-3.5 h-3.5" /> 暂未生成 / 404
                              </span>
                              <span className="text-[11px] text-slate-300">无存证</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        );
      })()}
    </Drawer>

      {/* 底层产物与知识库高保真在线查阅/预览弹窗 */}
      <Modal
        open={artifactModalOpen}
        onCancel={() => setArtifactModalOpen(false)}
        footer={null}
        width={isMobile ? '96%' : 920}
        style={{ top: 20 }}
        styles={{ body: { padding: 0 } }}
        destroyOnHidden
      >
        <div className="flex flex-col h-[82vh] bg-slate-50 rounded-2xl overflow-hidden text-slate-900">
          {/* Modal Header */}
          <div className="px-5 py-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {artifactModalType === 'knowledge_base' && <Sparkles className="w-5 h-5 text-purple-600 shrink-0" />}
              {artifactModalType === 'content_text' && <Terminal className="w-5 h-5 text-sky-600 shrink-0" />}
              {artifactModalType === 'catalog' && <Layers className="w-5 h-5 text-amber-600 shrink-0" />}
              {artifactModalType === 'pdf' && <FileText className="w-5 h-5 text-rose-600 shrink-0" />}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-sm text-slate-900">{artifactModalTitle}</span>
                  <Tag color={artifactModalType === 'knowledge_base' ? 'purple' : artifactModalType === 'content_text' ? 'blue' : artifactModalType === 'catalog' ? 'orange' : 'magenta'}>
                    {artifactModalTag}
                  </Tag>
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  企业主体: {selectedTask?.company_name || '目标企业'} (单号: {selectedTask?.task_no || selectedTask?.id})
                </div>
              </div>
            </div>

            {/* Header Action Tools */}
            <div className="flex items-center gap-1.5 shrink-0">
              {artifactModalType !== 'pdf' && !artifactModalError && (
                <>
                  <button
                    onClick={handleCopyArtifact}
                    disabled={artifactLoading || !artifactModalContent}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {copiedArtifact ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedArtifact ? '已复制' : '复制全文'}</span>
                  </button>
                  <button
                    onClick={handleDownloadArtifact}
                    disabled={artifactLoading || !artifactModalContent}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 font-medium transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>导出文件</span>
                  </button>
                </>
              )}
              <button
                onClick={() => handleOpenInNewWindow(artifactModalType, selectedTask, artifactModalContent)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs text-slate-700 font-medium transition-colors cursor-pointer"
                title="在新窗口以独立全屏阅读器查看"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>新窗口打开</span>
              </button>
            </div>
          </div>

          {/* Subheader Toolbar (Tab switcher for Markdown / JSON / Tree) */}
          {!artifactModalError && (artifactModalType === 'knowledge_base' || artifactModalType === 'catalog') && (
            <div className="px-5 py-2 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setArtifactViewTab('rendered')}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    artifactViewTab === 'rendered'
                      ? 'bg-white shadow-xs text-slate-900 border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {artifactModalType === 'knowledge_base' ? '📖 标准渲染视图' : '🌳 目录树可视化'}
                </button>
                <button
                  onClick={() => setArtifactViewTab('raw')}
                  className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
                    artifactViewTab === 'raw'
                      ? 'bg-white shadow-xs text-slate-900 border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {artifactModalType === 'knowledge_base' ? '📝 Markdown 源码' : '📄 JSON 原始数据'}
                </button>
              </div>

              <span className="text-[11px] text-slate-500 font-mono">
                {artifactModalType === 'knowledge_base' ? '真实数据中台实时聚合存证' : 'PDF 目录页精准解析'}
              </span>
            </div>
          )}

          {/* Modal Body Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50">
            {artifactLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3 py-20 text-slate-400">
                <div className="w-8 h-8 border-3 border-[#0096DB] border-t-transparent rounded-full animate-spin"></div>
                <div className="text-xs font-mono text-slate-600">正在调取真实接口与 MinIO 存证底稿...</div>
              </div>
            ) : artifactModalError ? (
              <div className="bg-white rounded-xl p-8 border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-2xs">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-slate-800 text-sm">存证文件未就绪 / 404 Not Found</div>
                  <div className="text-xs text-rose-600 font-mono leading-relaxed">{artifactModalError}</div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  该任务在底层知识库生成阶段未产出此文件或任务在提取阶段异常中断。系统严格遵循真实接口响应，不使用任何 Mock 伪造数据。
                </p>
              </div>
            ) : artifactModalType === 'pdf' ? (
              <div className="w-full h-full min-h-[600px] bg-white rounded-xl border border-slate-200 overflow-hidden shadow-inner">
                <iframe
                  src={artifactRawUrl}
                  title="PDF Preview"
                  className="w-full h-full min-h-[600px] border-0"
                />
              </div>
            ) : artifactModalType === 'knowledge_base' ? (
              artifactViewTab === 'rendered' ? (
                <div className="bg-white rounded-xl p-5 sm:p-8 border border-slate-200 shadow-xs">
                  <div 
                    className="ai-markdown-content text-slate-900 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(artifactModalContent) }} 
                  />
                </div>
              ) : (
                <pre className="bg-white border border-slate-200 text-slate-800 p-4 sm:p-5 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-2xs">
                  {artifactModalContent}
                </pre>
              )
            ) : artifactModalType === 'catalog' ? (
              artifactViewTab === 'rendered' && artifactModalJson?.toc_catalog ? (
                <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-3">
                  <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>报告章节树大纲 ({artifactModalJson.toc_catalog.length} 个一级章节)</span>
                    <span className="font-normal text-[11px] text-slate-500">数据来源: 真实目录解析流</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {artifactModalJson.toc_catalog.map((item, idx) => (
                      <div key={item.id || idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 font-bold flex items-center justify-center text-[11px] shrink-0 border border-amber-200">
                            {idx + 1}
                          </span>
                          <span className="font-semibold text-slate-800">{item.title}</span>
                          {item.has_ai_summary && (
                            <Tag color="purple" className="text-[10px] scale-90 origin-left">
                              AI 研判
                            </Tag>
                          )}
                        </div>
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            P.{item.start_page || item.page || '-'} ~ P.{item.end_page || item.page || '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <pre className="bg-white border border-slate-200 text-slate-800 p-4 sm:p-5 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-2xs">
                  {artifactModalContent}
                </pre>
              )
            ) : (
              <pre className="bg-white border border-slate-200 text-slate-800 p-4 sm:p-5 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-2xs">
                {artifactModalContent}
              </pre>
            )}
          </div>
        </div>
      </Modal>

    </div>
  );
}
