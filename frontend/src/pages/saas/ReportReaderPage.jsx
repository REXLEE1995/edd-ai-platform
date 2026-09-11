import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  ShieldCheck, 
  AlertTriangle, 
  FileText, 
  TrendingUp, 
  Building2, 
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Database,
  Users,
  Scale,
  DollarSign,
  Activity,
  Award,
  BarChart3,
  Building,
  HelpCircle,
  AlertCircle,
  Search,
  ExternalLink,
  Paperclip,
  Bookmark,
  ChevronLeft,
  ChevronsRight,
  Eye,
  Layers,
  ArrowUp,
  Sparkles,
  Bot,
  MessageSquare,
  Copy,
  Check,
  Clock
} from 'lucide-react';
import { message, Drawer, Modal, Tooltip, Popconfirm } from 'antd';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatLocalTime } from '../../utils/date';
import { copyToClipboard } from '../../utils/clipboard';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import Navbar from '../../components/Navbar';
import { Send, CornerDownLeft, RefreshCw, X, ArrowDown, Columns, PanelRight } from 'lucide-react';
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

// 极简微核 HTML5 Canvas 逐页流式渲染组件 (纯矢量直接从 sample_report.pdf 读取，0 图片依赖)
function PdfCanvasPage({ pdfDoc, pageNum, isCurrentVisible }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading] = useState(true);
  const renderTaskRef = useRef(null);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    let isMounted = true;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !rendered) {
          renderPage();
        }
      },
      { rootMargin: '600px 0px', threshold: 0.01 }
    );

    observer.observe(containerRef.current);

    async function renderPage() {
      try {
        setLoading(true);
        const page = await pdfDoc.getPage(pageNum);
        if (!isMounted || !canvasRef.current) return;

        const outputScale = window.devicePixelRatio || 1.5;
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = '100%';
        canvas.style.height = 'auto';

        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch (e) {}
        }

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform,
          viewport: viewport
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;

        if (isMounted) {
          setRendered(true);
          setLoading(false);
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNum}:`, err);
        }
      }
    }

    return () => {
      isMounted = false;
      observer.disconnect();
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch (e) {}
      }
    };
  }, [pdfDoc, pageNum, rendered]);

  return (
    <div 
      ref={containerRef}
      id={`pdf-page-${pageNum}`}
      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 relative ${
        isCurrentVisible ? 'border-[#0ea5e9] ring-2 ring-[#0ea5e9]/20 shadow-md' : 'border-slate-200/80'
      }`}
    >
      {/* 原生 HTML5 Canvas 渲染区域：采用严格固定的标准 A4 页面比例 (aspect-[595/842]) 杜绝异步渲染过程中的高度突变与页码跳动 */}
      <div className="w-full bg-white relative flex items-center justify-center aspect-[595/842] min-h-[500px]">
        {loading && !rendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 text-slate-400 space-y-2">
            <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-mono">第 {pageNum} 页矢量解析渲染中...</span>
          </div>
        )}
        <canvas 
          ref={canvasRef} 
          className={`w-full h-auto block select-none ${rendered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
        />
      </div>
    </div>
  );
}

// 统一标准的 PDF 文件流加载方法 (使用原生 fetch/xhr + Authorization 头部，并挂载本地 CMap/标准字体库支持中文字符与宋体/黑体完整渲染)
function loadPdfDocument(url, token = '') {
  const httpHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const loadingTask = pdfjsLib.getDocument({
    url,
    httpHeaders,
    cMapUrl: `${origin}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${origin}/standard_fonts/`,
    disableRange: false,
    disableStream: false,
    disableAutoFetch: false
  });
  return loadingTask.promise;
}

export default function ReportReaderPage() {
  const params = useParams();
  const reportId = params.id || params.reportId;
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authLoading, openLoginModal } = useAuth();

  // 灵活后退逻辑：优先返回来源页面（例如从任务列表进入则精准退回该列表与Tab），其次基于浏览器栈，兜底任务中心
  const handleGoBack = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/app/tasks?tab=tasks');
  };
  
  const [report, setReport] = useState(null);
  const [catalogData, setCatalogData] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [highlightedSourceKey, setHighlightedSourceKey] = useState('raw_ic');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [selectedAiChapterId, setSelectedAiChapterId] = useState('overall');
  const [copied, setCopied] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [isOverallAiSummaryOpen, setIsOverallAiSummaryOpen] = useState(false);
  const [mobileTocOpen, setMobileTocOpen] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const sidebarNavRef = useRef(null);
  const chatBottomRef = useRef(null);

  // 统一提取报告大纲目录：仅从真实接口 GET /api/v1/reports/{report_id}/catalog 或 report 详情中获取，绝无本地 Mock 伪造
  const PDF_TOC_CATALOG = useMemo(() => {
    if (catalogData?.toc_catalog && Array.isArray(catalogData.toc_catalog) && catalogData.toc_catalog.length > 0) {
      return catalogData.toc_catalog;
    }
    if (report?.content?.toc_catalog && Array.isArray(report.content.toc_catalog) && report.content.toc_catalog.length > 0) {
      return report.content.toc_catalog;
    }
    return [];
  }, [catalogData, report]);

  // 研判总结数据 (严格从真实接口 GET /api/v1/reports/{report_id}/summary 或 catalog 中加载，若远程无数据则为 null，严禁假数据展示)
  const OVERALL_SUMMARY = useMemo(() => {
    if (summaryData) {
      const profile = summaryData.enterprise_profile;
      const riskList = Array.isArray(summaryData.risk_assessment) ? summaryData.risk_assessment : [];
      if (profile || riskList.length > 0) {
        return {
          chapterNo: "00",
          title: "全景综合尽调总结",
          subtitle: "企业综合画像与全景深度风控研判",
          summary: profile || '',
          key_points: riskList,
          keyPoints: riskList
        };
      }
    }
    if (catalogData?.overall_ai_summary) {
      return catalogData.overall_ai_summary;
    }
    if (report?.content?.overall_ai_summary) {
      return report.content.overall_ai_summary;
    }
    return null;
  }, [summaryData, catalogData, report]);

  // 严格从真实远程后端与 MinIO 服务端点加载该笔任务的真实 PDF 存证文件流 (携带 Token 进行多通道安全鉴权)
  const remoteApiHost = (typeof window !== 'undefined' && window.APP_CONFIG?.API_BASE_URL)
    ? window.APP_CONFIG.API_BASE_URL.replace(/\/api\/?$/, '')
    : 'http://192.168.110.234:8000';

  const userToken = useMemo(() => {
    return localStorage.getItem('edd_user_token') || localStorage.getItem('token') || '';
  }, [user]);

  const targetPdfUrl = useMemo(() => {
    if (!reportId) return null;
    const tokenParam = userToken ? `token=${encodeURIComponent(userToken)}` : '';
    // 优先使用 report 详情返回的指定 pdf_url，否则统一使用标准 REST 接口 /api/v1/reports/{report_id}/pdf
    const rawPdf = report?.pdf_url || `/api/v1/reports/${reportId}/pdf`;
    const fullUrl = rawPdf.startsWith('http') 
      ? rawPdf 
      : `${remoteApiHost}${rawPdf.startsWith('/') ? '' : '/'}${rawPdf}`;
    const sep = fullUrl.includes('?') ? '&' : '?';
    return tokenParam ? `${fullUrl}${sep}${tokenParam}` : fullUrl;
  }, [reportId, remoteApiHost, userToken, report?.pdf_url]);

  // 动态构建各章节 AI 深度研判字典 (仅在真实存在总结时注入)
  const AI_CHAPTER_INSIGHTS = useMemo(() => {
    const insights = {};
    if (OVERALL_SUMMARY) {
      insights['overall'] = OVERALL_SUMMARY;
    }
    PDF_TOC_CATALOG
      .filter(item => item.has_ai_summary && item.ai_insight)
      .forEach(item => {
        insights[item.id] = item.ai_insight;
      });
    return insights;
  }, [OVERALL_SUMMARY, PDF_TOC_CATALOG]);

  // 异步流式加载 PDF 原生文件 (统一使用 loadPdfDocument，直接连接 MinIO 流式存证输出)
  const lastLoadedPdfUrlRef = useRef(null);
  useEffect(() => {
    if (!targetPdfUrl) return;
    if (lastLoadedPdfUrlRef.current === targetPdfUrl) return;
    lastLoadedPdfUrlRef.current = targetPdfUrl;

    let isMounted = true;
    setPdfDoc(null);
    setPdfLoadError(false);
    loadPdfDocument(targetPdfUrl, userToken)
      .then((doc) => {
        if (isMounted) {
          setPdfDoc(doc);
        }
      })
      .catch((err) => {
        console.warn(`[PDF MinIO] 未找到或加载 PDF 存证流失败 (${targetPdfUrl}):`, err?.message);
        if (isMounted) {
          setPdfLoadError(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [targetPdfUrl, userToken]);

  // 响应式屏幕检测 (1024px 以下切换为移动端抽屉，1024px 及以上分栏并排工作台)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 对话历史记录与输入状态
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // AI 助手展现模式：'drawer' (默认展开在顶层浮层，不挤压报告) | 'docked' (分栏平铺并排，铺满屏幕右侧)
  const [aiViewMode, setAiViewMode] = useState('drawer');
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const isUserAtBottomRef = useRef(true);
  const chatScrollContainerRef = useRef(null);
  const pdfScrollContainerRef = useRef(null);

  // 平滑或直接滚动至对话最新底部 (默认置底)
  const scrollToBottom = (smooth = false) => {
    isUserAtBottomRef.current = true;
    setShowScrollBottomBtn(false);
    setTimeout(() => {
      if (chatBottomRef.current) {
        chatBottomRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      }
    }, 30);
  };

  // 监听对话流滚动：用户向上拉动时不强行拉回底部，且显示“回到底部”悬浮按钮
  const handleChatScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    const atBottom = distanceToBottom < 60;
    isUserAtBottomRef.current = atBottom;
    setShowScrollBottomBtn(!atBottom);
  };

  // 每次打开 AI 面板或切换视图模式时，默认平稳置底
  useEffect(() => {
    if (isAiDrawerOpen) {
      scrollToBottom(false);
    }
  }, [isAiDrawerOpen, aiViewMode]);

  // 50 次全局提问额度管理
  const MAX_USER_QUESTIONS = 50;
  const userQuestionsCount = useMemo(() => {
    return chatMessages.filter(m => m.role === 'user').length;
  }, [chatMessages]);
  const remainingQuestions = Math.max(0, MAX_USER_QUESTIONS - userQuestionsCount);
  const isQuotaExceeded = userQuestionsCount >= MAX_USER_QUESTIONS;

  // 输入框自适应高度拉伸 Ref
  const textareaRef = useRef(null);

  // 输入变化时动态自适应拉伸高度 (最小 38px，最高可拉伸至 160px，超高后平滑滚动)
  const handleInputChange = (e) => {
    setChatInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 38), 160)}px`;
    }
  };

  // 统一复制方法 (支持提问内容与 AI 回复，全协议/全浏览器兼容器)
  const handleCopyText = async (text, type = '内容', msgId = null) => {
    if (!text) {
      message.warning('暂无内容可复制');
      return;
    }
    const success = await copyToClipboard(text);
    if (success) {
      if (msgId) {
        setCopiedMsgId(msgId);
        setTimeout(() => setCopiedMsgId(null), 2000);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      message.success(`已复制该条${type}！`);
    } else {
      message.error('复制失败，浏览器未开放剪贴板权限，请手动选择文本复制');
    }
  };

  // 预设快捷追问 Prompts (去除 emoji icon，保持视觉纯粹简洁)
  const QUICK_PROMPTS = [
    { label: '涉税合规穿透', prompt: '请详细核查该企业近 36 个月的增值税与所得税申报是否存在异常波动或未申报？' },
    { label: '营收与偿债测算', prompt: '请基于该企业的开票规模和毛利率，测算其最大负债承载力与还款保障倍数。' },
    { label: '生成审贷专审意见', prompt: '请以银行高级信贷审批官的口吻，输出一份 300 字的标准审贷专审结论与风控建议。' },
    { label: '司法涉诉排查', prompt: '排查该企业及其实际控制人是否存在被执行、限制高消费或重大行政处罚？' }
  ];

  const abortControllerRef = useRef(null);

  // 1. 发起报告 AI 流式问答 (POST /api/v1/reports/{report_id}/chat/stream - SSE 协议)
  const handleStreamChat = async ({
    queryType = 'DEFAULT',
    catalogKey = null,
    catalogName = null,
    content
  }) => {
    if (!content || isAiThinking) return;

    // 校验 50 次提问配额
    if (userQuestionsCount >= MAX_USER_QUESTIONS) {
      message.warning('当前报告提问次数已达到 50 次上限，无法继续发起提问');
      return;
    }

    // 若有未完成的流式任务，主动中止
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMsgId = `user-${Date.now()}`;
    const aiMsgId = `ai-${Date.now() + 1}`;
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

    const newUserMsg = {
      id: userMsgId,
      role: 'user',
      text: content,
      timestamp: currentTime,
      query_type: queryType,
      catalog_name: catalogName
    };

    const newAiMsg = {
      id: aiMsgId,
      role: 'assistant',
      text: '',
      isStreaming: true,
      timestamp: currentTime,
      query_type: queryType,
      catalog_name: catalogName
    };

    // 提取多轮历史上下文 (最多取最近 6 条)
    const historyPayload = chatMessages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-6)
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.text || ''
      }));

    setChatMessages(prev => [...prev, newUserMsg, newAiMsg]);
    setIsAiDrawerOpen(true);
    setIsAiThinking(true);

    // 提问时默认平稳置底
    scrollToBottom(false);

    try {
      const apiBase = (typeof window !== 'undefined' && window.APP_CONFIG?.API_BASE_URL)
        ? window.APP_CONFIG.API_BASE_URL
        : '/api';
      const streamUrl = `${apiBase.replace(/\/$/, '')}/v1/reports/${reportId}/chat/stream`;

      const token = localStorage.getItem('edd_user_token') || localStorage.getItem('edd_admin_token');
      const headers = {
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(streamUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query_type: queryType,
          catalog_key: catalogKey,
          catalog_name: catalogName,
          content: content,
          history: historyPayload
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || errData.message || `请求失败 (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.delta) {
              setChatMessages(prev =>
                prev.map(m =>
                  m.id === aiMsgId ? { ...m, text: (m.text || '') + parsed.delta } : m
                )
              );
              // 仅当用户未上拉时，才随打字自动滚到底部
              if (isUserAtBottomRef.current) {
                chatBottomRef.current?.scrollIntoView({ behavior: 'auto' });
              }
            }
            if (parsed.status === 'done') {
              break;
            }
          } catch (e) {
            // 忽略单帧 JSON 解析异常
          }
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.log('Stream request aborted');
      } else {
        console.error('Chat stream failed:', err);
        setChatMessages(prev =>
          prev.map(m =>
            m.id === aiMsgId
              ? { ...m, text: (m.text || '') + `\n\n*(请求异常: ${err.message || '网络连接中断'})*` }
              : m
          )
        );
      }
    } finally {
      setIsAiThinking(false);
      setChatMessages(prev =>
        prev.map(m => (m.id === aiMsgId ? { ...m, isStreaming: false } : m))
      );
      if (isUserAtBottomRef.current) {
        scrollToBottom(true);
      }
    }
  };

  // 2. 目录章节定向解读 (用户点击左侧大纲的【✨ AI总结】)
  const handleOpenAiChapter = (chapterId) => {
    setSelectedAiChapterId(chapterId);
    const chapterItem = PDF_TOC_CATALOG.find(item => item.id === chapterId);
    const chNum = chapterItem?.chapter_no || chapterItem?.chapterNo || '';
    const chTitle = chapterItem?.title || '目标章节';
    const catalogName = `${chNum ? chNum + ' ' : ''}${chTitle}`.trim();

    const promptContent = `请仅根据知识库中【${catalogName}】这部分的目录进行总结回答，不要超出该目录下的内容，不衍生额外问题。`;

    handleStreamChat({
      queryType: 'CATALOG_SPECIFIC',
      catalogKey: chapterId,
      catalogName: catalogName,
      content: promptContent
    });
  };

  // 3. 自由问答 (用户在底部输入框输入自定义问题，或点击快捷胶囊)
  const handleSendMessage = (textToSend) => {
    const query = (textToSend || chatInput || '').trim();
    if (!query || isAiThinking) return;

    if (userQuestionsCount >= MAX_USER_QUESTIONS) {
      message.warning('当前报告提问次数已达到 50 次上限，无法继续发起提问');
      return;
    }

    setChatInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    handleStreamChat({
      queryType: 'DEFAULT',
      catalogKey: null,
      catalogName: null,
      content: query
    });
  };

  // 4. 加载当前报告的历史会话现场 (GET /api/v1/reports/{report_id}/chat/history)
  const fetchChatHistory = async () => {
    if (!reportId) return;
    try {
      const res = await apiClient.get(`/v1/reports/${reportId}/chat/history`);
      if (res && res.code === 200 && Array.isArray(res.data)) {
        const mapped = res.data.map(item => ({
          id: item.id || `hist-${Date.now()}-${Math.random()}`,
          role: item.role === 'assistant' ? 'assistant' : 'user',
          text: item.content || '',
          timestamp: item.created_at ? item.created_at.slice(11, 19) : '',
          query_type: item.query_type,
          catalog_name: item.catalog_name
        }));
        setChatMessages(mapped);
      }
    } catch (err) {
      console.warn(`[Chat History] 拉取历史对话失败 (${reportId}):`, err?.message);
    }
  };

  // 5. 清空当前报告的历史会话现场 (DELETE /api/v1/reports/{report_id}/chat/history)
  const handleClearHistory = async () => {
    try {
      await apiClient.delete(`/v1/reports/${reportId}/chat/history`);
      setChatMessages([]);
      message.success('该报告的历史对话已成功清空');
    } catch (err) {
      console.error('清空历史对话失败:', err);
      message.error('清空失败，请稍后重试');
    }
  };

  const handleCopyAiInsight = async (text) => {
    if (!text) return;
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(true);
      message.success('已成功复制该条 AI 总结分析！');
      setTimeout(() => setCopied(false), 2000);
    } else {
      message.error('复制失败，请手动选中文本复制');
    }
  };

  // 大纲折叠状态（默认全部展开，仅记录被用户主动折叠的项）
  const [collapsedSections, setCollapsedSections] = useState({});

  // 动态感知实际 MinIO PDF 物理文件的真实页数 (严格以真实 PDF 与后端元数据为准，0 伪造页数)
  const totalPages = pdfDoc?.numPages || report?.total_pages || catalogData?.report_meta?.total_pages || 0;
  const pagesArray = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

  const lastLoadedReportIdRef = useRef(null);
  const isFetchingReportRef = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem('edd_user_token') || localStorage.getItem('token');
    const isAuthed = !!(user || token);
    if (!reportId || !isAuthed) {
      if (!isAuthed && !authLoading) {
        setLoading(false);
      }
      return;
    }

    // 严格杜绝同个 reportId 重复发起批量请求 (包括多次重渲染与依赖变动)
    if (lastLoadedReportIdRef.current === reportId || isFetchingReportRef.current) {
      return;
    }

    lastLoadedReportIdRef.current = reportId;
    isFetchingReportRef.current = true;

    // 优先调取主报告详情接口 (自动提取内嵌大纲与研判总结，缺省时才自动补全)，同时拉取问答历史
    Promise.allSettled([
      fetchReportDetail(),
      fetchChatHistory()
    ]).finally(() => {
      isFetchingReportRef.current = false;
    });
  }, [reportId, user?.id, authLoading]);

  useEffect(() => {
    const handleLogout = () => {
      lastLoadedReportIdRef.current = null;
      lastLoadedPdfUrlRef.current = null;
    };
    window.addEventListener('auth:user_logout', handleLogout);
    return () => window.removeEventListener('auth:user_logout', handleLogout);
  }, []);

  const fetchReportDetail = async () => {
    setLoading(true);
    setReportError(null);
    try {
      const res = await apiClient.get(`/v1/reports/${reportId}`);
      let reportData = null;
      if (res && res.data) {
        reportData = res.data;
      } else if (res && res.id) {
        reportData = res;
      }

      if (reportData) {
        setReport(reportData);

        // 如果主详情接口中已包含大纲目录，直接解析复用，绝不重复调用独立 /catalog 接口
        const detailCatalog = (reportData.content?.toc_catalog && Array.isArray(reportData.content.toc_catalog) && reportData.content.toc_catalog.length > 0)
          ? reportData.content.toc_catalog
          : (Array.isArray(reportData.toc_catalog) && reportData.toc_catalog.length > 0 ? reportData.toc_catalog : null);

        if (detailCatalog) {
          setCatalogData(reportData.content || reportData);
        } else {
          // 仅在主接口未包含目录时才按需调取独立 /catalog 接口
          fetchReportCatalog();
        }

        // 如果主详情接口中已包含研判总结，直接解析复用，绝不重复调用独立 /summary 接口
        const detailSummary = reportData.content?.overall_ai_summary
          || reportData.enterprise_profile
          || reportData.summary
          || (Array.isArray(reportData.risk_assessment) && reportData.risk_assessment.length > 0);

        if (detailSummary) {
          setSummaryData(reportData.content || reportData);
        } else {
          // 仅在主接口未包含总结时才按需调取独立 /summary 接口
          fetchReportSummary();
        }
      } else {
        setReportError('未查询到该尽调报告资产');
      }
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      if (status === 404) {
        setReportError(detail || '未查询到该尽调报告资产或已被删除');
      } else if (status === 403) {
        setReportError(detail || '无权访问该报告资产（多租户数据隔离保护，仅限出具方企业或授权机构调阅）');
      } else if (status === 401) {
        setReportError('登录凭证已失效，请重新登录');
      } else {
        setReportError(detail || '加载报告资产失败，请稍后重试');
      }
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  // 大纲目录数据 (GET /api/v1/reports/{report_id}/catalog - 从 MinIO 读取真实 pdf_toc_json)
  const fetchReportCatalog = async () => {
    if (!reportId) {
      setCatalogData(null);
      return;
    }
    setLoadingCatalog(true);
    try {
      const res = await apiClient.get(`/v1/reports/${reportId}/catalog`);
      if (res && res.code === 0 && res.data) {
        setCatalogData(res.data);
      } else if (res && res.toc_catalog) {
        setCatalogData(res);
      } else {
        setCatalogData(null);
      }
    } catch (err) {
      console.warn(`[Catalog API] 远程接口拉取大纲目录失败 (${reportId}):`, err?.message);
      setCatalogData(null);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // 研判总结数据 (步骤 5 产物 - GET /api/v1/reports/{report_id}/summary)
  const fetchReportSummary = async () => {
    if (!reportId) {
      setSummaryData(null);
      return;
    }
    setLoadingSummary(true);
    try {
      const res = await apiClient.get(`/v1/reports/${reportId}/summary`);
      // 严格检查真实接口返回
      if (res && res.code === 0 && res.data) {
        setSummaryData(res.data);
      } else if (res && (res.enterprise_profile || (Array.isArray(res.risk_assessment) && res.risk_assessment.length > 0))) {
        setSummaryData(res);
      } else {
        setSummaryData(null);
      }
    } catch (err) {
      console.warn(`[Summary API] 远程接口无总结数据或未生成 (${reportId}):`, err?.response?.status || err?.message);
      setSummaryData(null);
    } finally {
      setLoadingSummary(false);
    }
  };

  // 核心区间定位算法：根据当前 activePage 动态计算当前活跃的父章节和子导航项 (跨页保持持续高亮)
  const { activeChapterId, activeSubId } = useMemo(() => {
    if (!PDF_TOC_CATALOG || PDF_TOC_CATALOG.length === 0) {
      return { activeChapterId: null, activeSubId: null };
    }

    let matchedChapter = PDF_TOC_CATALOG[0];
    for (let i = PDF_TOC_CATALOG.length - 1; i >= 0; i--) {
      if (activePage >= PDF_TOC_CATALOG[i].page) {
        matchedChapter = PDF_TOC_CATALOG[i];
        break;
      }
    }

    let matchedSub = null;
    if (matchedChapter?.children && matchedChapter.children.length > 0) {
      // 优先精准匹配当前页对应的小节 (若当前页有多个小节，取该页第一个)
      const exactMatches = matchedChapter.children.filter(c => c.page === activePage);
      if (exactMatches.length > 0) {
        matchedSub = exactMatches[0];
      } else {
        for (let k = matchedChapter.children.length - 1; k >= 0; k--) {
          if (activePage >= matchedChapter.children[k].page) {
            matchedSub = matchedChapter.children[k];
            break;
          }
        }
      }
      if (!matchedSub) {
        matchedSub = matchedChapter.children[0];
      }
    }

    return {
      activeChapterId: matchedChapter.id,
      activeSubId: matchedSub ? matchedSub.id : null
    };
  }, [PDF_TOC_CATALOG, activePage]);

  // 当进入新章节时，确保该章节在左侧大纲中处于展开状态
  useEffect(() => {
    if (activeChapterId && collapsedSections[activeChapterId]) {
      setCollapsedSections(prev => ({
        ...prev,
        [activeChapterId]: false
      }));
    }
  }, [activeChapterId]);

  // 100% 可靠的精准平滑滚动跳转至指定 PDF 页面 (利用恒定静态 offsetTop 差值，绝不受帧间插值或动态加载干扰)
  const jumpToPage = (pageNum) => {
    const p = Math.max(1, Math.min(totalPages, Number(pageNum) || 1));
    setActivePage(p);

    const targetEl = document.getElementById(`pdf-page-${p}`);
    const pdfContainer = pdfScrollContainerRef.current;
    if (targetEl && pdfContainer) {
      const stickyHeader = pdfContainer.querySelector('.sticky');
      const stickyHeight = stickyHeader ? stickyHeader.offsetHeight : 0;
      // targetEl.offsetTop 与 pdfContainer.offsetTop 处于完全一致的静态文档流坐标系，永不随滚动状态发生任何帧间波动
      const targetScroll = Math.max(0, targetEl.offsetTop - pdfContainer.offsetTop - stickyHeight - 8);
      pdfContainer.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    } else if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // 监听中栏独立滚动或全局滚动，实时感知当前视口中的页码
  useEffect(() => {
    const container = pdfScrollContainerRef.current;
    const handleScroll = () => {
      const scrollPosition = (container ? container.scrollTop : window.scrollY) + 180;
      for (let p = totalPages; p >= 1; p--) {
        const el = document.getElementById(`pdf-page-${p}`);
        if (el && scrollPosition >= el.offsetTop) {
          setActivePage(p);
          break;
        }
      }
    };

    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [totalPages]);

  // 核心随动：当 activeSubId 或 activeChapterId 变化时，左侧侧边栏内部自动跟随滚动，保持高亮项可见 (不影响主页面滚动)
  useEffect(() => {
    const targetId = activeSubId ? `toc-sub-${activeSubId}` : `toc-item-${activeChapterId}`;
    const targetEl = document.getElementById(targetId);
    const navEl = sidebarNavRef.current;
    if (targetEl && navEl) {
      const navRect = navEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();
      if (targetRect.top < navRect.top || targetRect.bottom > navRect.bottom) {
        navEl.scrollTop += (targetRect.top - navRect.top - 40);
      }
    }
  }, [activeChapterId, activeSubId]);

  const toggleSection = (secId, e) => {
    if (e) e.stopPropagation();
    setCollapsedSections(prev => ({
      ...prev,
      [secId]: !prev[secId]
    }));
  };

  // 章节顶部锚点标题标签映射
  const getChapterHeaderTag = (pageNum) => {
    switch (pageNum) {
      case 1: return { title: '报告封面', badge: 'Cover' };
      case 2: return { title: '声明与释义', badge: 'Statement' };
      case 3: return { title: '报告目录索引', badge: 'Catalogue' };
      case 6: return { title: '01 信用等级及风险提示 · 享宇智评分卡', badge: 'Chapter 01' };
      case 7: return { title: '02 企业信用风险概览 (4组KPI)', badge: 'Chapter 02' };
      case 9: return { title: '03 企业基本信息 (工商治理)', badge: 'Chapter 03' };
      case 14: return { title: '04 行业环境及产业链 (毛利对标)', badge: 'Chapter 04' };
      case 17: return { title: '05 企业经营情况 (三年开票流水)', badge: 'Chapter 05' };
      case 33: return { title: '06 企业财务分析 (申报矩阵与8大预警)', badge: 'Chapter 06' };
      case 37: return { title: '07 企业信用情况 (司法涉诉穿透)', badge: 'Chapter 07' };
      case 51: return { title: '08 附件 (原始明细底册总览)', badge: 'Chapter 08' };
      default: return null;
    }
  };

  // 渲染 AI 智能问答对话面板 (支持桌面端分栏平铺与顶层浮层共用)
  const renderAiChatContent = () => (
    <div className="flex flex-col h-full bg-[#fafafa]">
      {/* 顶部 Header */}
      <div className="flex items-center justify-between px-3.5 py-3 bg-white border-b border-zinc-200 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-[#0096DB] flex items-center justify-center text-white shadow-2xs shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-slate-950 truncate leading-tight">
                享宇森云 AI 智能审贷风控助手
              </span>
            </div>
            <span className="text-xs text-zinc-500 block truncate">
              享宇森云企业智评大模型 · 实时报告解析
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* 提问额度徽标 (不能超过100次) */}
          <span 
            className={`text-xs font-mono px-2.5 py-0.5 rounded-full border ${
              remainingQuestions <= 10 
                ? 'bg-amber-50 text-amber-700 border-amber-200 font-semibold' 
                : 'bg-slate-50 text-slate-600 border-slate-200 font-medium'
            }`} 
            title={`当前报告提问额度：已提问 ${userQuestionsCount} 次 / 上限 ${MAX_USER_QUESTIONS} 次`}
          >
            提问 {userQuestionsCount}/{MAX_USER_QUESTIONS}
          </span>

          {/* 视图模式切换按钮 (平铺 ⇋ 浮层) */}
          {!isMobile && (
            <button
              type="button"
              onClick={() => setAiViewMode(prev => prev === 'docked' ? 'drawer' : 'docked')}
              className="px-2.5 py-1 rounded-lg text-slate-700 hover:text-[#0096DB] hover:bg-cyan-50 border border-slate-200/90 transition-all cursor-pointer flex items-center gap-1 text-xs shadow-2xs font-medium"
              title={aiViewMode === 'docked' ? "切换为顶层浮层 (抽屉覆盖)" : "切换为分栏平铺 (左右并排)"}
            >
              {aiViewMode === 'docked' ? (
                <>
                  <PanelRight className="w-3.5 h-3.5 text-[#0096DB]" />
                  <span>浮层</span>
                </>
              ) : (
                <>
                  <Columns className="w-3.5 h-3.5 text-[#0096DB]" />
                  <span>平铺</span>
                </>
              )}
            </button>
          )}

          {chatMessages.length > 0 && (
            <Popconfirm
              title="清空对话历史"
              description="确定清空当前报告的所有 AI 对话记录吗？"
              onConfirm={handleClearHistory}
              okText="确定清空"
              cancelText="取消"
              okButtonProps={{ danger: true }}
              placement="bottomRight"
            >
              <button
                type="button"
                className="text-xs text-zinc-500 hover:text-rose-600 transition-colors cursor-pointer px-2 py-1 font-medium rounded-lg hover:bg-rose-50"
                title="清空当前报告对话历史"
              >
                清空
              </button>
            </Popconfirm>
          )}

          {/* 收起面板按钮 */}
          <button
            type="button"
            onClick={() => setIsAiDrawerOpen(false)}
            className="p-1 rounded-md text-zinc-400 hover:text-slate-800 hover:bg-zinc-100 transition-colors cursor-pointer"
            title="收起 AI 问答面板"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 对话流容器 (支持内部独立滚动、上拉浏览不被强制滚底) */}
      <div 
        ref={chatScrollContainerRef}
        onScroll={handleChatScroll}
        className="flex-1 p-3.5 space-y-3.5 overflow-y-auto overscroll-contain min-h-0 relative scrollbar-thin"
      >
        {chatMessages.length === 0 ? (
          <div className="py-12 text-center space-y-3 px-4">
            <div className="w-10 h-10 rounded-full bg-cyan-50 border border-cyan-100 text-[#0096DB] mx-auto flex items-center justify-center shadow-2xs">
              <Sparkles className="w-5 h-5 text-[#0096DB] animate-pulse" />
            </div>
            <h4 className="font-bold text-sm sm:text-base text-slate-950">享宇森云 AI 智能审贷风控助手</h4>
            <p className="text-xs sm:text-sm text-zinc-500 leading-relaxed max-w-xs mx-auto">
              已与左侧尽调报告原件实现<strong className="text-slate-800">同屏联动解析</strong>，支持点击目录旁 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-cyan-50 text-[#0084c2] border border-cyan-200 font-medium text-xs"><Sparkles className="w-3 h-3 text-[#0096DB]" /> AI总结</span> 调阅章节研判，或直接在下方输入框自由提问。
            </p>
            {/* 推荐问题气泡 (无 icon，更简洁现代且字体舒适) */}
            <div className="pt-2 flex flex-wrap justify-center gap-2 max-w-sm mx-auto">
              {QUICK_PROMPTS.map((qp, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => handleSendMessage(qp.prompt)}
                  disabled={isQuotaExceeded || isAiThinking}
                  className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-white hover:bg-cyan-50 hover:text-[#0084c2] hover:border-cyan-200 text-slate-700 border border-slate-200 transition-all shadow-2xs cursor-pointer text-left disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chatMessages.map((msg, index) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id || index} className="flex items-start justify-end gap-2 pl-8">
                  <div className="bg-[#0096DB] text-white p-3.5 sm:p-4 rounded-xl rounded-tr-xs shadow-2xs text-sm sm:text-base leading-relaxed max-w-[90%] group">
                    {msg.catalog_name && msg.query_type === 'CATALOG_SPECIFIC' && (
                      <div className="text-xs text-white/95 font-medium mb-1.5 flex items-center gap-1.5">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">目录章节</span>
                        <span>{msg.catalog_name}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {/* 用户提问支持直接复制 */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/20 text-xs sm:text-sm text-white/80">
                      <span className="font-mono">{msg.timestamp || '刚刚'}</span>
                      <button
                        type="button"
                        onClick={() => handleCopyText(msg.text || msg.content || '', '提问内容', msg.id || index)}
                        className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-white/15"
                        title="复制此条提问"
                      >
                        {copiedMsgId === (msg.id || index) ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                            <span className="text-emerald-300 font-medium">已复制</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>复制</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0 mt-0.5 shadow-2xs">
                    我
                  </div>
                </div>
              );
            }

            // AI 回复渲染 (纯 Markdown 格式 + 沉浸式思考加载状态 + 流式打字机光标 + 直接复制)
            const aiContent = msg.text || '';
            return (
              <div key={msg.id || index} className="flex items-start gap-2.5 pr-2">
                <div className="w-8 h-8 rounded-lg bg-[#0096DB] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 max-w-[94%]">
                  <div className="bg-white p-4 sm:p-5 rounded-xl rounded-tl-xs border border-zinc-200 shadow-2xs space-y-2.5 text-sm sm:text-base text-slate-900 leading-relaxed">
                    {aiContent ? (
                      <div 
                        className="ai-markdown-content"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(aiContent) }}
                      />
                    ) : (
                      <div className="py-3 px-1 space-y-2.5">
                        <div className="flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-800">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0096DB]"></span>
                          </span>
                          <span>享宇森云 AI 正在深入研判本题...</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600 pl-3.5 py-2 bg-cyan-50/60 rounded-lg border border-cyan-100">
                          <div className="flex space-x-1">
                            <span className="w-1.5 h-1.5 bg-[#0096DB] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                            <span className="w-1.5 h-1.5 bg-[#0096DB] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                            <span className="w-1.5 h-1.5 bg-[#0096DB] rounded-full animate-bounce"></span>
                          </div>
                          <span className="text-zinc-700 font-mono text-xs sm:text-sm">
                            正在检索知识库 · 核验涉税工商及财务底稿
                          </span>
                        </div>
                      </div>
                    )}
                    {msg.isStreaming && aiContent && (
                      <span className="inline-block w-2 h-4.5 ml-1 bg-[#0096DB] animate-pulse align-middle rounded-xs" />
                    )}
                    <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-xs sm:text-sm text-zinc-500">
                      <span className="font-mono">{msg.timestamp || '刚刚'} · 享宇森云大模型</span>
                      {aiContent && (
                        <button
                          type="button"
                          onClick={() => handleCopyText(aiContent, 'AI 总结与分析', msg.id || index)}
                          className="shadcn-button-outline text-xs sm:text-sm py-1 px-3 flex items-center gap-1.5 cursor-pointer hover:border-[#0096DB] hover:text-[#0096DB]"
                          title="复制该条 AI 研判结果"
                        >
                          {copiedMsgId === (msg.id || index) ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">已复制</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-zinc-400" />
                              <span>复制此条</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* 用户上拉浏览时呈现快速回到底部按钮 */}
        {showScrollBottomBtn && (
          <div className="sticky bottom-2 flex justify-center w-full pointer-events-none z-30">
            <button
              type="button"
              onClick={() => scrollToBottom(true)}
              className="pointer-events-auto flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-md text-slate-700 text-xs font-medium rounded-full shadow-md border border-slate-200 hover:text-[#0096DB] hover:border-cyan-300 hover:shadow-lg transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-150"
              title="滚动回最新对话底部"
            >
              <ArrowDown className="w-3.5 h-3.5 text-[#0096DB]" />
              <span>回到底部</span>
            </button>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* 底部对话输入区域 */}
      <div className="p-3 bg-white border-t border-zinc-200 shrink-0 space-y-2">
        {/* 顶部快捷追问胶囊 (无 icon，样式优化为更轻量质感的圆角标签，更舒适易触达) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_PROMPTS.map((qp, qIdx) => (
            <button
              key={qIdx}
              type="button"
              disabled={isQuotaExceeded || isAiThinking}
              onClick={() => handleSendMessage(qp.prompt)}
              className="px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium bg-slate-100 hover:bg-cyan-50 hover:text-[#0070a4] hover:border-cyan-300 text-slate-700 border border-slate-200 transition-all shrink-0 cursor-pointer shadow-2xs active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* 自动拉伸输入框与发送按钮 */}
        <div className={`flex items-end gap-2 bg-zinc-50 border rounded-xl p-1.5 sm:p-2 transition-all ${
          isQuotaExceeded 
            ? 'border-amber-200 bg-amber-50/30' 
            : 'border-zinc-200 focus-within:border-[#0096DB] focus-within:ring-2 focus-within:ring-[#0096DB]/20 focus-within:bg-white'
        }`}>
          <textarea
            ref={textareaRef}
            value={chatInput}
            onChange={handleInputChange}
            disabled={isQuotaExceeded || isAiThinking}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              isQuotaExceeded 
                ? '当前报告提问已达到 100 次上限' 
                : '输入风控、税务、工商或信贷等研判问题...'
            }
            rows={1}
            style={{ minHeight: '36px', maxHeight: '140px' }}
            className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm text-slate-900 placeholder:text-zinc-400 placeholder:text-[11px] sm:placeholder:text-xs placeholder:leading-tight focus:outline-none px-2 py-1 leading-relaxed overflow-y-auto transition-[height] duration-75 disabled:cursor-not-allowed disabled:text-zinc-400"
          />
          <button
            type="button"
            disabled={!chatInput.trim() || isAiThinking || isQuotaExceeded}
            onClick={() => handleSendMessage()}
            className={`p-2 rounded-lg transition-all shrink-0 flex items-center justify-center ${
              chatInput.trim() && !isAiThinking && !isQuotaExceeded
                ? 'bg-[#0096DB] text-white shadow-2xs cursor-pointer hover:bg-[#0084c2] active:scale-95'
                : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
            }`}
            title={isQuotaExceeded ? '提问次数已达上限' : '发送提问 (Enter)'}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 底部状态提示条 */}
        <div className="flex items-center justify-between text-[11px] sm:text-xs text-slate-500 px-1 pt-0.5 font-medium">
          <span>基于尽调报告原件实时多维解析</span>
          <span className="font-mono">
            剩余提问: <strong className={remainingQuestions <= 5 ? 'text-amber-600 font-bold' : 'text-slate-800 font-bold'}>{remainingQuestions}</strong>/{MAX_USER_QUESTIONS} 次
          </span>
        </div>
      </div>
    </div>
  );

  // 1. 登录凭证身份初始化中
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center space-y-3 text-slate-500 text-sm">
        <div className="w-8 h-8 border-2 border-[#0096DB] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium">正在校验账号身份凭证...</p>
      </div>
    );
  }

  // 2. 未登录拦截：必须先登录才能调阅企业报告资产与目录，严禁未登录展示或调用假数据
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 bg-sky-50 rounded-2xl flex items-center justify-center mx-auto text-[#0096DB] shadow-xs">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">请先登录账号</h2>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          企业尽调报告与原件存证需登录后调阅您名下的正式报告与数据底稿。
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={openLoginModal}
            className="shadcn-button-primary text-sm py-2 px-6 cursor-pointer"
          >
            立即登录 / 注册
          </button>
          <Link
            to="/app/tasks"
            className="shadcn-button-outline text-sm py-2 px-5"
          >
            返回任务中心
          </Link>
        </div>
      </div>
    );
  }

  // 3. 报告未找到或报错提示 (404/403/500 等真实错误)
  if (reportError && !loading) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">报告调阅失败</h2>
        <p className="text-sm text-slate-500">
          {reportError}
        </p>
        <div className="pt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleGoBack}
            className="shadcn-button-primary text-sm py-2 px-6 inline-flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  // 4. 报告拉取加载中
  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-3 text-slate-500 text-sm">
        <div className="w-8 h-8 border-2 border-[#0096DB] border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium">正在载入企业全景尽调报告与存证大纲...</p>
      </div>
    );
  }

  const currentCompanyName = report?.company_name || catalogData?.company_name || '企业尽调报告';
  const currentCreditCode = report?.credit_code || catalogData?.credit_code || '';

  return (
    <div className="h-[calc(100vh-60px)] sm:h-[calc(100vh-66px)] flex flex-col overflow-hidden bg-[#f8fafc] text-slate-900 antialiased">
      
      {/* 顶部公文状态栏 (固定紧凑顶栏，不占页面滚动，宽度与工作台保持一致) */}
      <header className="shrink-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-2xl shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]">
        <div className={`mx-auto px-3 sm:px-6 lg:px-8 py-2 sm:py-2.5 flex items-center justify-between gap-2 sm:gap-4 transition-all duration-200 ${
          isAiDrawerOpen && aiViewMode === 'docked' && !isMobile ? 'w-full' : 'max-w-7xl'
        }`}>
          
          {/* 左侧：返回 + 企业名称与统一社会信用代码 (移动端隐藏企业名称，保障返回按钮绝对完整可见) */}
          <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
            <button 
              type="button"
              onClick={handleGoBack} 
              className="shadcn-button-outline text-xs sm:text-sm py-1.5 px-2.5 sm:px-3.5 shrink-0 hover:border-[#0096DB] hover:text-[#0084c2] shadow-xs flex items-center gap-1.5 active:scale-[0.98] cursor-pointer"
              title="返回上一页"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="inline font-medium">返回</span>
            </button>

            {/* 企业主体信息：在桌面/平板端显示，移动端隐藏避免挤压按钮 */}
            <div className="max-sm:!hidden sm:flex items-center gap-3 min-w-0">
              <div className="h-4 sm:h-5 w-px bg-slate-200/80 shrink-0"></div>
              <div className="min-w-0 flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3">
                <h1 className="font-bold text-sm sm:text-base lg:text-lg text-slate-950 tracking-tight truncate max-w-xs md:max-w-md">
                  {currentCompanyName}
                </h1>
                {currentCreditCode && (
                  <span className="text-xs sm:text-sm text-slate-500 font-mono truncate">
                    <span>统一代码: </span><strong className="font-medium text-slate-800">{currentCreditCode}</strong>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：AI问答分栏快捷开关 + 目录抽屉按钮(移动端专享) + 分享报告 + 下载 PDF 原件 */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {/* AI 问答分栏快捷开关 (移动端使用 max-sm:!hidden 强行隐藏此按钮，避免被全局按钮样式 display:inline-flex 覆盖) */}
            <button
              type="button"
              onClick={() => setIsAiDrawerOpen(prev => !prev)}
              className={`max-sm:!hidden sm:flex shadcn-button-outline text-xs sm:text-sm py-1.5 px-2.5 sm:px-3.5 items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-[0.98] ${
                isAiDrawerOpen 
                  ? 'bg-cyan-50/90 border-cyan-300 text-[#0070a4] font-semibold' 
                  : 'text-slate-700 hover:border-[#0096DB] hover:text-[#0084c2]'
              }`}
              title={isAiDrawerOpen ? "收起 AI 问答分栏" : "展开 AI 问答分栏 (与报告同屏并排查看)"}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#0096DB]" />
              <span>AI 助手</span>
              <span className="text-xs font-mono text-zinc-400">({userQuestionsCount}/100)</span>
            </button>

            {/* 📱 移动端专属：大纲目录抽屉展开按钮 */}
            <button
              type="button"
              onClick={() => setMobileTocOpen(true)}
              className="lg:hidden shadcn-button-outline text-xs sm:text-sm py-1.5 px-3 flex items-center gap-1.5 shadow-xs hover:border-[#0096DB] hover:text-[#0084c2] cursor-pointer active:scale-[0.98]"
              title="查看报告大纲目录"
            >
              <Bookmark className="w-3.5 h-3.5 text-[#0096DB]" />
              <span>目录</span>
            </button>


            <a 
              href={targetPdfUrl}
              download={`${report?.company_name || '企业尽调报告'}.pdf`}
              className="shadcn-button-primary text-xs sm:text-sm py-1.5 px-2.5 sm:px-3.5 whitespace-nowrap flex items-center gap-1.5 font-medium shadow-xs active:scale-[0.98]"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">下载 PDF</span>
              <span className="sm:hidden">下载</span>
            </a>
          </div>
        </div>
      </header>

      {/* 核心工作台容器 (填满视口剩余全部高度，三栏独立滚动，零下边距留白，零双滚动条) */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <div className={`h-full mx-auto flex items-stretch gap-3 lg:gap-4 p-2 sm:p-3 lg:p-4 transition-all duration-200 ${
          isAiDrawerOpen && aiViewMode === 'docked' && !isMobile 
            ? 'w-full' 
            : 'max-w-7xl'
        }`}>
        
          {/* 左栏：PDF 目录大纲树状导航 (独立内部纵向滚动，不干扰中栏文档与右栏AI) */}
          <aside 
            className={`hidden lg:flex lg:flex-col shrink-0 bg-white/90 backdrop-blur-xl rounded-xl border border-slate-200/80 shadow-xs p-3 h-full z-20 transition-all duration-200 ${
              isAiDrawerOpen && aiViewMode === 'docked' ? 'w-56 xl:w-60' : 'w-64 xl:w-72'
            }`}
          >
          {/* 1. 固定在顶部的 报告大纲标题 + 搜索章节输入框 */}
          <div className="shrink-0 space-y-2.5 pb-3 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-[#0096DB]" />
                <span>报告大纲</span>
              </h3>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索章节..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs sm:text-sm bg-white/70 backdrop-blur-md border border-slate-200/80 rounded-lg focus:outline-none focus:border-[#0096DB] focus:bg-white/90 focus:ring-2 focus:ring-[#0096DB]/15 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* 2. 目录项列表 (独立纵向平滑滚动，默认全部展开) */}
          <nav ref={sidebarNavRef} className="flex-1 overflow-y-auto py-2 space-y-1 text-xs sm:text-sm scroll-smooth pr-1">
            {loadingCatalog ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0096DB] mx-auto" />
                <span>正在从存证底稿拉取真实大纲...</span>
              </div>
            ) : PDF_TOC_CATALOG.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                <Layers className="w-6 h-6 text-slate-300 mx-auto" />
                <p>暂无结构化章节大纲</p>
              </div>
            ) : (
              PDF_TOC_CATALOG.map((item) => {
              const isExpanded = !collapsedSections[item.id];
              const isParentActive = activeChapterId === item.id;
              const hasChildren = item.children && item.children.length > 0;
              
              // 搜索过滤
              if (searchKeyword.trim()) {
                const kw = searchKeyword.trim().toLowerCase();
                const matchesParent = item.title.toLowerCase().includes(kw);
                const matchesChild = item.children && item.children.some(c => c.title.toLowerCase().includes(kw));
                if (!matchesParent && !matchesChild) return null;
              }

              return (
                <div key={item.id} id={`toc-item-${item.id}`} className="space-y-0.5 scroll-mt-24">
                  <div
                    onClick={() => jumpToPage(item.page)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg font-medium transition-all flex items-center justify-between cursor-pointer group ${
                      isParentActive 
                        ? 'bg-cyan-50/90 text-[#0070a4] font-semibold shadow-2xs border-l-3 border-[#0096DB] pl-2' 
                        : 'text-slate-700 hover:text-[#0084c2] hover:bg-cyan-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => toggleSection(item.id, e)}
                          className="p-0.5 hover:bg-slate-200/60 rounded text-slate-400 shrink-0 cursor-pointer"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <span className="w-3.5 h-3.5 inline-block shrink-0" />
                      )}
                      <span className="truncate text-xs sm:text-sm" title={item.title}>{item.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.has_ai_summary && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAiChapter(item.id);
                          }}
                          className="px-2 py-0.5 rounded-md text-xs font-semibold bg-cyan-50 hover:bg-cyan-100 text-[#0084c2] flex items-center gap-0.5 transition-all border border-cyan-200/90 shadow-2xs cursor-pointer"
                          title="点击查看此板块 AI 深度总结"
                        >
                          <Sparkles className="w-3 h-3 text-[#0096DB]" />
                          <span>AI总结</span>
                        </button>
                      )}
                      <span className="text-xs font-mono text-zinc-400 group-hover:text-[#0084c2] font-medium">
                        P.{item.page}
                      </span>
                    </div>
                  </div>

                  {/* 二级子目录 (展开显示，支持区间范围持续关联高亮) */}
                  {hasChildren && isExpanded && (
                    <div className="pl-5 pr-1 py-0.5 space-y-0.5 border-l border-slate-300 ml-3">
                      {item.children.map(sub => {
                        const isSubActive = isParentActive && activeSubId === sub.id;
                        return (
                          <div
                            key={sub.id}
                            id={`toc-sub-${sub.id}`}
                            onClick={() => jumpToPage(sub.page)}
                            className={`w-full text-left py-1 px-2 rounded-md text-xs sm:text-[13px] cursor-pointer flex items-center justify-between truncate transition-all scroll-mt-24 ${
                              isSubActive 
                                ? 'bg-cyan-50 text-slate-950 font-semibold shadow-2xs border-l-2 border-[#0096DB] pl-1.5' 
                                : 'text-slate-600 hover:text-[#0096DB] hover:bg-cyan-50/40'
                            }`}
                            title={sub.title}
                          >
                            <span className="truncate pr-1">{sub.title}</span>
                            <span className="font-mono text-xs text-zinc-400 shrink-0">P.{sub.page}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }))}
          </nav>

          {/* 3. 固定在底部的 展开/折叠全部 */}
          <div className="shrink-0 pt-2 border-t border-slate-200 flex justify-between items-center text-xs text-zinc-500">
            <span>共 {totalPages} 页</span>
            <button
              type="button"
              onClick={() => {
                const hasAnyCollapsed = Object.values(collapsedSections).some(Boolean);
                if (hasAnyCollapsed) {
                  setCollapsedSections({}); // 全部展开
                } else {
                  const allCollapsed = {};
                  PDF_TOC_CATALOG.forEach(c => { allCollapsed[c.id] = true; });
                  setCollapsedSections(allCollapsed); // 全部折叠
                }
              }}
              className="text-[#0084c2] hover:text-[#0096DB] font-semibold cursor-pointer"
            >
              展开/折叠全部
            </button>
          </div>

        </aside>

        {/* 中栏：PDF 连续阅读器 (独立内部纵向滚动，与左侧大纲和右侧 AI 助手互不干扰) */}
        <main 
          ref={pdfScrollContainerRef}
          className="flex-1 min-w-0 h-full overflow-y-auto overscroll-contain flex flex-col items-center py-2 px-1 sm:px-2 rounded-xl bg-slate-100/50 border border-slate-200/60 shadow-2xs scrollbar-thin"
        >
          
          <div className="w-full max-w-[1020px] space-y-4">
            
            {/* 全景综合尽调 AI 智能总结卡片 (sticky top-0 紧贴阅读器顶部，不再留出 115px 白条空洞) */}
            {OVERALL_SUMMARY && (
              <div className="shadcn-card sticky top-0 z-20 bg-white/95 backdrop-blur-xl overflow-hidden shadow-sm border border-slate-200/80 rounded-xl transition-all">
                
                {/* 顶栏收起/展开控制条 */}
                <div 
                  onClick={() => setIsOverallAiSummaryOpen(!isOverallAiSummaryOpen)}
                  className={`px-4 py-3 bg-cyan-50/40 backdrop-blur-md hover:bg-cyan-50/60 flex items-center justify-between cursor-pointer ${isOverallAiSummaryOpen ? 'border-b border-cyan-100/70' : ''} transition-colors select-none`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-gradient-to-br from-sky-400 to-[#0ea5e9] text-white flex items-center justify-center shadow-2xs shrink-0">
                      <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-slate-950">
                      享宇AI智评 · 全景综合尽调 AI 智能总结
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs sm:text-sm text-zinc-500 flex items-center gap-0.5 font-medium">
                      {isOverallAiSummaryOpen ? '收起总结' : '展开全景总结'}
                      {isOverallAiSummaryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                  </div>
                </div>

                {/* 展开后的全景总结内容 (紧凑排版，收缩行距与边距，提升移动端与大屏阅读舒适度) */}
                {isOverallAiSummaryOpen && (
                  <div className="p-3 sm:p-4 bg-white/75 backdrop-blur-xl space-y-3 text-xs sm:text-sm max-h-[calc(100vh-220px)] overflow-y-auto border-t border-slate-100/80">
                    
                    {/* 核心总括 */}
                    {OVERALL_SUMMARY.summary && (
                      <div className="p-2.5 sm:p-3 bg-cyan-50/45 backdrop-blur-md rounded-lg border border-cyan-100/80 space-y-1">
                        <strong className="text-slate-950 block text-xs sm:text-sm flex items-center gap-1.5 font-bold">
                          <Sparkles className="w-3.5 h-3.5 text-[#0ea5e9]" />
                          企业信用全景综合画像：
                        </strong>
                        <p className="text-zinc-700 leading-relaxed text-xs sm:text-sm">
                          {OVERALL_SUMMARY.summary}
                        </p>
                      </div>
                    )}

                    {/* 全景深度研判要点 */}
                    {OVERALL_SUMMARY.key_points && OVERALL_SUMMARY.key_points.length > 0 && (
                      <div className="space-y-2 p-2.5 sm:p-3 bg-slate-50/70 backdrop-blur-md border border-slate-200/70 rounded-lg">
                        <strong className="text-xs sm:text-sm font-bold text-slate-950 block flex items-center gap-1.5 border-b border-slate-200/70 pb-1.5">
                          <span className="w-1.5 h-3 bg-[#0ea5e9] rounded-full"></span>
                          📑 全景深度研判要点与风控审查结论：
                        </strong>
                        <div className="space-y-1.5 text-zinc-700 text-xs sm:text-sm">
                          {OVERALL_SUMMARY.key_points.map((kp, idx) => (
                            <div key={idx} className="flex items-start gap-2 bg-white/90 backdrop-blur-md py-1.5 px-2.5 rounded-md border border-white/95 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#0ea5e9] shrink-0 mt-1.5"></span>
                              <span className="leading-relaxed text-zinc-800 text-xs sm:text-sm">{kp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 底部快捷操作 */}
                    <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
                      <span>基于多源权威数据中台拟合生成 · 支持随时调阅</span>
                      <button
                        type="button"
                        onClick={() => {
                          const pointsText = (OVERALL_SUMMARY.key_points || []).map((p, i) => `${i + 1}. ${p}`).join('\n');
                          handleCopyAiInsight(
                            `【享宇AI智评 · 全景综合尽调 AI 总结】\n\n【企业信用全景综合画像】\n${OVERALL_SUMMARY.summary}\n\n【全景深度研判要点与风控审查结论】\n${pointsText}\n\n（来源：官方中台与全息档案数据）`
                          );
                        }}
                        className="shadcn-button-outline text-xs py-1 px-2.5 flex items-center gap-1.5"
                      >
                        <Copy className="w-3 h-3 text-zinc-400" />
                        <span>{copied ? '已复制' : '复制全景总结'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 报告连续文档流 */}
            <div className="space-y-4 w-full">
              {pdfLoadError ? (
                <div className="bg-white rounded-xl border border-slate-200/80 p-8 sm:p-12 text-center space-y-3 shadow-xs">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">PDF 原件正在由中台合成存证中</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    该尽调任务已完成多维数据清洗与合规审计，PDF 矢量底稿正写入对象存储。您仍可点击左侧章节大纲调阅结构化数据，或在右侧 AI 助手发起全维度信贷研判问答。
                  </p>
                </div>
              ) : pagesArray.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200/80 p-12 text-center space-y-2 shadow-xs">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">暂无页码数据</p>
                </div>
              ) : (
                pagesArray.map((pageNum) => {
                  const isCurrentVisible = activePage === pageNum;

                  return (
                    <PdfCanvasPage
                      key={pageNum}
                      pdfDoc={pdfDoc}
                      pageNum={pageNum}
                      isCurrentVisible={isCurrentVisible}
                    />
                  );
                })
              )}
            </div>
          </div>
        </main>

        {/* 右栏：AI 智能风控对话助手 (分栏平铺模式下，在桌面端作为第 3 栏并排呈现，铺满右侧无留白) */}
        {isAiDrawerOpen && !isMobile && aiViewMode === 'docked' && (
          <aside className="flex flex-col shrink-0 w-[420px] xl:w-[480px] bg-white rounded-2xl border border-slate-200/80 shadow-glass h-full z-20 overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200 mr-0">
            {renderAiChatContent()}
          </aside>
        )}
      </div>
    </div>

    {/* 4. 顶层浮层抽屉模式 (默认展开在顶层，或移动端全屏，mask={false} 无暗色阻断遮罩，可边看报告边问答) */}
    {isAiDrawerOpen && (isMobile || aiViewMode === 'drawer') && (
      <Drawer
        open={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        width={isMobile ? '100%' : 500}
        closable={false}
        mask={false}
        styles={{ 
          body: { padding: 0, backgroundColor: '#fafafa' },
          wrapper: { boxShadow: '-8px 0 24px -4px rgba(0, 0, 0, 0.14)' }
        }}
      >
        {renderAiChatContent()}
      </Drawer>
    )}

    {/* 5. 最右侧常驻吸边把手 (仅在 AI 面板收起时展现，一键并排呼出) */}
    {!isAiDrawerOpen && (
      <aside 
        aria-label="AI 智能问答常驻入口"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-30"
      >
        <button
          type="button"
          onClick={() => setIsAiDrawerOpen(true)}
          className="group flex flex-col items-center gap-1.5 py-3.5 px-2.5 bg-gradient-to-b from-sky-400 to-[#0ea5e9] text-white rounded-l-xl shadow-lg border-l border-t border-b border-white/60 backdrop-blur-md hover:from-sky-300 hover:to-[#38bdf8] hover:pl-3 transition-all cursor-pointer select-none"
          title="展开 AI 智能问答 (与报告并排同屏查看)"
        >
          <Sparkles className="w-4 h-4 text-white animate-pulse group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold tracking-widest text-white [writing-mode:vertical-rl] leading-tight py-1">
            AI 问答
          </span>
          <ChevronLeft className="w-3.5 h-3.5 text-white/80 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </aside>
    )}

      {/* 📱 移动端专属：报告大纲目录抽屉 */}
      <Drawer
        title={
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-[#0096DB]" />
              报告大纲目录
            </span>
            <span className="text-xs font-mono text-slate-400">共 {totalPages} 页</span>
          </div>
        }
        placement="left"
        width={320}
        open={mobileTocOpen}
        onClose={() => setMobileTocOpen(false)}
        styles={{ body: { padding: '12px' } }}
      >
        <div className="space-y-1 text-xs sm:text-sm">
          {PDF_TOC_CATALOG.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              暂无结构化章节大纲
            </div>
          ) : (
            PDF_TOC_CATALOG.map((item) => {
            const isParentActive = activeChapterId === item.id;
            return (
              <div key={item.id} className="space-y-0.5">
                <div
                  onClick={() => {
                    jumpToPage(item.page);
                    setMobileTocOpen(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-xl font-medium transition-all flex items-center justify-between cursor-pointer ${
                    isParentActive 
                      ? 'bg-cyan-50 text-[#0070a4] font-bold border-l-3 border-[#0096DB]' 
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="truncate pr-1.5 flex-1 text-xs sm:text-sm" title={item.title}>{item.title}</span>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {item.has_ai_summary && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileTocOpen(false);
                          handleOpenAiChapter(item.id);
                        }}
                        className="px-2 py-0.5 rounded-md text-xs font-semibold bg-cyan-50 hover:bg-cyan-100 text-[#0084c2] flex items-center gap-0.5 transition-all border border-cyan-200/90 shadow-2xs cursor-pointer"
                        title="点击查看此板块 AI 深度总结"
                      >
                        <Sparkles className="w-3 h-3 text-[#0096DB]" />
                        <span>AI总结</span>
                      </button>
                    )}
                    <span className="text-xs font-mono text-slate-400 font-medium">
                      P.{item.page}
                    </span>
                  </div>
                </div>

                {item.children && item.children.length > 0 && (
                  <div className="pl-3 space-y-0.5 border-l border-slate-200 ml-2">
                    {item.children.map((child) => (
                      <div
                        key={child.id}
                        onClick={() => {
                          jumpToPage(child.page);
                          setMobileTocOpen(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs sm:text-[13px] flex items-center justify-between cursor-pointer ${
                          activeSubId === child.id
                            ? 'text-[#0084c2] font-bold bg-cyan-50/60'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate pr-1">{child.title}</span>
                        <span className="text-xs font-mono text-slate-400 shrink-0">P.{child.page}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          }))}
        </div>
      </Drawer>


    </div>
  );
}
