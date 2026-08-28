import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Download, 
  Share2, 
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
  Check
} from 'lucide-react';
import { message, Drawer, Modal, Tooltip } from 'antd';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import reportXiangyuData from '../../mock/report_xiangyu_agri.json';
import reportShunjieData from '../../mock/report_shunjie_preloan.json';
import reportArchiveData from '../../mock/report_catalog_archive.json';

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
      className={`bg-white rounded-sm border shadow-2xs overflow-hidden transition-all duration-300 relative ${
        isCurrentVisible ? 'border-sky-500 ring-2 ring-sky-300/40' : 'border-slate-300'
      }`}
    >
      {/* 单页头部页码标尺 (企业全景尽调规范) */}
      <div className="px-4 py-2 bg-slate-900 text-white flex items-center justify-between text-xs border-b border-slate-800 select-none">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-xs bg-sky-600 text-white flex items-center justify-center font-mono font-bold text-[10px]">
            {String(pageNum).padStart(2, '0')}
          </span>
          <span className="font-bold tracking-wide">
            {pageNum === 1 ? '报告封面' : (pageNum <= 5 ? '报告目录与声明' : '企业深度尽调底稿')}
          </span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            PDF 原生矢量 Canvas · P.{pageNum}
          </span>
        </div>
      </div>

      {/* 原生 HTML5 Canvas 渲染区域 */}
      <div className="w-full bg-white relative flex items-center justify-center min-h-[700px]">
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

// PDF 文档全局单例 Promise 缓存池 (避免 React StrictMode 或重新挂载时重复发起网络 Fetch)
const pdfDocPromiseCache = new Map();

function getCachedPdfDocument(url) {
  if (!pdfDocPromiseCache.has(url)) {
    const loadingTask = pdfjsLib.getDocument({
      url,
      disableRange: false,
      disableStream: false,
      disableAutoFetch: false
    });
    pdfDocPromiseCache.set(url, loadingTask.promise);
  }
  return pdfDocPromiseCache.get(url);
}

export default function ReportReaderPage() {
  const params = useParams();
  const reportId = params.id || params.reportId;
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState(1);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [highlightedSourceKey, setHighlightedSourceKey] = useState('raw_ic');
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [selectedAiChapterId, setSelectedAiChapterId] = useState('overall');
  const [copied, setCopied] = useState(false);
  const [isOverallAiSummaryOpen, setIsOverallAiSummaryOpen] = useState(false);
  const sidebarNavRef = useRef(null);
  const chatBottomRef = useRef(null);

  // 核心判断：当前任务是否为四川享宇科技有限公司任务
  const isXiangyuReport = useMemo(() => {
    const idStr = String(reportId || '').toLowerCase();
    const compStr = String(report?.company_name || '').toLowerCase();
    return idStr.includes('xiangyu') || idStr.includes('agri') || compStr.includes('享宇科技') || compStr.includes('xiangyu');
  }, [reportId, report?.company_name]);

  // 根据任务类型动态选择对应的结构化 JSON 单一事实源
  const activeArchiveData = useMemo(() => {
    return isXiangyuReport ? reportXiangyuData : reportShunjieData;
  }, [isXiangyuReport]);

  const DEFAULT_REPORT_META = activeArchiveData.report_meta;
  const OVERALL_SUMMARY = activeArchiveData.overall_ai_summary;
  const PDF_TOC_CATALOG = activeArchiveData.toc_catalog;
  const targetPdfUrl = isXiangyuReport ? '/reports/xiangyu_agri.pdf' : '/reports/shunjie_preloan.pdf';

  // 动态构建各章节 AI 深度研判字典
  const AI_CHAPTER_INSIGHTS = useMemo(() => ({
    'overall': OVERALL_SUMMARY,
    ...Object.fromEntries(
      PDF_TOC_CATALOG
        .filter(item => item.has_ai_summary && item.ai_insight)
        .map(item => [item.id, item.ai_insight])
    )
  }), [OVERALL_SUMMARY, PDF_TOC_CATALOG]);

  // 异步流式加载 PDF 原生文件 (带单例缓存，按任务 PDF 路径分发)
  useEffect(() => {
    let isMounted = true;
    setPdfDoc(null);
    getCachedPdfDocument(targetPdfUrl)
      .then((doc) => {
        if (isMounted) {
          setPdfDoc(doc);
        }
      })
      .catch((err) => {
        console.error(`Failed to load ${targetPdfUrl} via pdfjs:`, err);
      });

    return () => {
      isMounted = false;
    };
  }, [targetPdfUrl]);

  // 对话历史记录
  const [chatMessages, setChatMessages] = useState([]);

  const handleOpenAiChapter = (chapterId) => {
    setSelectedAiChapterId(chapterId);
    const insight = AI_CHAPTER_INSIGHTS[chapterId];
    if (!insight) return;
    const chNum = insight.chapter_no || insight.chapterNo || '';
    const userPrompt = `请帮我针对【${chNum ? chNum + ' ' : ''}${insight.title}】板块进行深度总结与关键指标提炼。`;

    setChatMessages(prev => [
      ...prev,
      {
        id: `user-${Date.now()}`,
        role: 'user',
        text: userPrompt,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: `ai-${Date.now() + 1}`,
        role: 'ai',
        insightKey: chapterId,
        data: insight,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setIsAiDrawerOpen(true);
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleCopyAiInsight = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    message.success('已成功复制该条 AI 总结分析！');
    setTimeout(() => setCopied(false), 2000);
  };

  const [expandedSections, setExpandedSections] = useState({
    'sec-cover': true,
    'sec-ch1': true,
    'sec-ch2': true,
    'sec-ch3': true,
    'sec-ch4': true,
    'sec-ch5': true,
    'sec-ch6': true,
    'sec-ch7': true,
    'sec-ch8': true
  });

  const totalPages = report?.total_pages || DEFAULT_REPORT_META?.total_pages || (isXiangyuReport ? 37 : 61);
  const pagesArray = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

  useEffect(() => {
    if (reportId) {
      fetchReportDetail();
    } else {
      setLoading(false);
    }
  }, [reportId]);

  const fetchReportDetail = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/v1/reports/${reportId}`);
      setReport(res.data || res);
    } catch (err) {
      // 缺省回退
      if (String(reportId).includes('xiangyu') || String(reportId).includes('agri')) {
        setReport({
          id: reportId || 'rpt_xiangyu_agri_001',
          company_name: '四川享宇科技有限公司',
          credit_code: '91510100MA6C9XYZ10',
          report_no: 'XY-AGRI-20260828-001',
          score: 95,
          risk_level: 'green',
          total_pages: 37,
          content: { is_locked: false, is_public_only: false }
        });
      } else {
        setReport({
          id: reportId || 'rpt_shunjie_preloan_001',
          company_name: '东莞市顺捷实业有限公司',
          credit_code: '91441900MA4W6BGB8T',
          report_no: 'RNO1881255253482991616',
          score: 702,
          risk_level: 'B+',
          total_pages: 61,
          content: { is_locked: false, is_public_only: false }
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // 核心区间定位算法：根据当前 activePage 动态计算当前活跃的父章节和子导航项 (跨页保持持续高亮)
  const { activeChapterId, activeSubId } = useMemo(() => {
    let matchedChapter = PDF_TOC_CATALOG[0];
    for (let i = PDF_TOC_CATALOG.length - 1; i >= 0; i--) {
      if (activePage >= PDF_TOC_CATALOG[i].page) {
        matchedChapter = PDF_TOC_CATALOG[i];
        break;
      }
    }

    let matchedSub = null;
    if (matchedChapter.children && matchedChapter.children.length > 0) {
      for (let k = matchedChapter.children.length - 1; k >= 0; k--) {
        if (activePage >= matchedChapter.children[k].page) {
          matchedSub = matchedChapter.children[k];
          break;
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
  }, [activePage]);

  // 当进入新章节时，确保该章节在左侧大纲中处于展开状态
  useEffect(() => {
    if (activeChapterId) {
      setExpandedSections(prev => ({
        ...prev,
        [activeChapterId]: true
      }));
    }
  }, [activeChapterId]);

  // 100% 可靠的精准平滑滚动跳转至指定 PDF 页面
  const jumpToPage = (pageNum) => {
    const p = Math.max(1, Math.min(totalPages, Number(pageNum) || 1));
    setActivePage(p);

    const targetEl = document.getElementById(`pdf-page-${p}`);
    if (targetEl) {
      const headerOffset = isOverallAiSummaryOpen ? 240 : 185; // 顶部全局导航(64px) + 报告状态栏(56px) + 吸顶AI智能总结条 + 边距偏移
      const elementPosition = targetEl.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // 监听右侧页面滚动，实时感知当前视口中的页码
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 180;
      for (let p = totalPages; p >= 1; p--) {
        const el = document.getElementById(`pdf-page-${p}`);
        if (el && scrollPosition >= el.offsetTop) {
          setActivePage(p);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 核心随动：当 activeSubId 或 activeChapterId 变化时，左侧侧边栏自动跟随滚动，保持高亮项可见！
  useEffect(() => {
    const targetId = activeSubId ? `toc-sub-${activeSubId}` : `toc-item-${activeChapterId}`;
    const targetEl = document.getElementById(targetId);
    if (targetEl && sidebarNavRef.current) {
      targetEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }, [activeChapterId, activeSubId]);

  const toggleSection = (secId, e) => {
    e.stopPropagation();
    setExpandedSections(prev => ({
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

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-3 text-slate-500 text-sm">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium">正在载入企业全景尽调报告...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef1f5] text-slate-800 antialiased pb-28">
      
      {/* 顶部公文状态栏 (PC 紧凑固定导航，吸附在主Navbar 64px下方，容器宽度与顶栏严格对齐) */}
      <header className="sticky top-16 z-40 border-b border-slate-300 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* 左侧：返回 + 企业名称与统一社会信用代码 */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <Link 
              to="/app/tasks" 
              className="px-3 py-1.5 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-300 flex items-center gap-1.5 text-xs font-semibold shrink-0"
              title="返回任务中心"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>返回</span>
            </Link>

            <div className="h-6 w-px bg-slate-200 shrink-0"></div>

            <div className="min-w-0 flex items-baseline gap-3 flex-wrap">
              <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight truncate">
                {report?.company_name || '东莞市顺捷实业有限公司'}
              </h1>
              <span className="text-xs text-slate-500 font-mono">
                统一代码: <strong className="font-semibold text-slate-700">{report?.credit_code || '91441900MA4W6BGB8T'}</strong>
              </span>
            </div>
          </div>

          {/* 右侧：仅保留下载 PDF 原件按钮 */}
          <div className="flex items-center gap-2 shrink-0">
            <a 
              href={targetPdfUrl}
              download={`${report?.company_name || '企业尽调报告'}.pdf`}
              className="px-4 py-2 rounded-sm bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>下载 PDF 原件</span>
            </a>
          </div>
        </div>
      </header>

      {/* 核心工作台容器 (左侧大纲树 + 右侧高保真无缝文档流，与顶栏严格对齐) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* 左栏：PDF 目录大纲树状导航 (Col 3, 紧凑型 Sticky 侧边栏，顶部大纲与搜索固定，目录独立滚动) */}
        <aside 
          ref={sidebarNavRef}
          className="hidden lg:flex lg:flex-col lg:col-span-3 xl:col-span-3 sticky top-[125px] bg-white rounded-sm border border-slate-300 shadow-2xs p-3 h-[calc(100vh-145px)] z-20"
        >
          {/* 1. 固定在顶部的 报告大纲标题 + 搜索章节输入框 */}
          <div className="shrink-0 space-y-2.5 pb-2.5 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-sky-700" />
                <span>报告大纲</span>
              </h3>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索章节..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-sm focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* 2. 目录项列表 (独立纵向平滑滚动) */}
          <nav className="flex-1 overflow-y-auto py-2 space-y-1 text-xs scroll-smooth pr-1">
            {PDF_TOC_CATALOG.map((item) => {
              const isExpanded = Boolean(expandedSections[item.id]);
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
                    className={`w-full text-left px-2 py-1.5 rounded-sm font-medium transition-colors flex items-center justify-between cursor-pointer group ${
                      isParentActive 
                        ? 'bg-sky-50 text-sky-900 font-bold border-l-3 border-sky-700 pl-1.5' 
                        : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                      {hasChildren ? (
                        <button
                          onClick={(e) => toggleSection(item.id, e)}
                          className="p-0.5 hover:bg-slate-200 rounded text-slate-400 shrink-0"
                        >
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </button>
                      ) : (
                        <span className="w-3.5 h-3.5 inline-block shrink-0" />
                      )}
                      <span className="truncate" title={item.title}>{item.title}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.has_ai_summary && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAiChapter(item.id);
                          }}
                          className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-sky-100 hover:bg-sky-200 text-sky-800 flex items-center gap-0.5 transition-all border border-sky-300 shadow-2xs hover:scale-105"
                          title="点击查看此板块 AI 深度总结"
                        >
                          <Sparkles className="w-3 h-3 text-sky-600 animate-pulse" />
                          <span>AI总结</span>
                        </button>
                      )}
                      <span className="text-[11px] font-mono text-slate-400 group-hover:text-sky-700 font-semibold">
                        P.{item.page}
                      </span>
                    </div>
                  </div>

                  {/* 二级子目录 (展开显示，支持区间范围持续关联高亮) */}
                  {hasChildren && isExpanded && (
                    <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l border-slate-200 ml-3">
                      {item.children.map(sub => {
                        const isSubActive = isParentActive && activeSubId === sub.id;
                        return (
                          <div
                            key={sub.id}
                            id={`toc-sub-${sub.id}`}
                            onClick={() => jumpToPage(sub.page)}
                            className={`w-full text-left py-1 px-2 rounded text-[11px] cursor-pointer flex items-center justify-between truncate transition-all scroll-mt-24 ${
                              isSubActive 
                                ? 'bg-sky-100 text-sky-900 font-bold shadow-2xs border-l-2 border-sky-600 pl-1.5' 
                                : 'text-slate-500 hover:text-sky-800 hover:bg-slate-100'
                            }`}
                            title={sub.title}
                          >
                            <span className="truncate pr-1">{sub.title}</span>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">P.{sub.page}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* 3. 固定在底部的 展开/折叠全部 */}
          <div className="shrink-0 pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
            <span>共 {totalPages} 页</span>
            <button
              onClick={() => {
                const allOpen = {};
                PDF_TOC_CATALOG.forEach(c => { allOpen[c.id] = true; });
                setExpandedSections(prev => Object.keys(prev).length ? {} : allOpen);
              }}
              className="text-sky-700 hover:text-sky-900 font-bold cursor-pointer"
            >
              展开/折叠全部
            </button>
          </div>

        </aside>

        {/* 右栏：纯原生 Web 连续文档流 (Col 9) */}
        <main className="lg:col-span-9 xl:col-span-9 flex flex-col items-center">
          
          <div className="w-full max-w-[1020px] space-y-6">
            
            {/* 全景综合尽调 AI 智能总结卡片 (吸顶固定 sticky top-[125px]，支持展开/收起) */}
            <div className="sticky top-[125px] z-30 bg-white rounded-sm border border-slate-300 shadow-2xs overflow-hidden transition-all">
              
              {/* 顶栏收起/展开控制条 */}
              <div 
                onClick={() => setIsOverallAiSummaryOpen(!isOverallAiSummaryOpen)}
                className="px-4 py-2.5 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 hover:bg-sky-100/50 flex items-center justify-between cursor-pointer border-b border-slate-200 transition-colors select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-xs bg-sky-700 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <span className="font-extrabold text-xs text-slate-900">
                    享宇智评 · 全景综合尽调 AI 智能总结
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-slate-500 flex items-center gap-0.5 font-medium">
                    {isOverallAiSummaryOpen ? '收起总结' : '展开全景总结'}
                    {isOverallAiSummaryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </div>

              {/* 展开后的全景总结内容 (结构化提炼，支持限制高度并内部滚动) */}
              {isOverallAiSummaryOpen && (
                <div className="p-5 bg-slate-50/50 space-y-4 text-xs max-h-[calc(100vh-220px)] overflow-y-auto">
                  
                  {/* 核心总括 */}
                  <div className="p-3.5 bg-white border border-sky-200 rounded-sm shadow-2xs space-y-1.5">
                    <strong className="text-sky-950 block text-xs flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      企业信用全景综合画像：
                    </strong>
                    <p className="text-slate-700 leading-relaxed text-xs">
                      {OVERALL_SUMMARY.summary}
                    </p>
                  </div>

                  {/* 四大核心量化指标 */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {(OVERALL_SUMMARY?.keyMetrics || OVERALL_SUMMARY?.highlights || []).map((km, idx) => (
                      <div key={idx} className="p-3 bg-white border border-slate-200 rounded-sm shadow-2xs space-y-1">
                        <span className="text-[10px] text-slate-400 block font-medium">{km.label}</span>
                        <span className="text-xs font-extrabold text-slate-900 block font-mono">{km.value}</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">{km.desc}</span>
                      </div>
                    ))}
                  </div>

                  {/* 六大风控研判要点 */}
                  <div className="space-y-1.5 p-3.5 bg-white border border-slate-200 rounded-sm shadow-2xs">
                    <strong className="text-xs font-bold text-slate-900 block mb-1">📑 全景深度研判要点：</strong>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700 text-[11px]">
                      {(OVERALL_SUMMARY?.keyPoints || []).map((kp, idx) => (
                        <div key={idx} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-sky-600 shrink-0 mt-1.5"></span>
                          <span>{kp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 底部快捷操作 */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
                    <span>基于多源权威数据中台拟合生成 · 终身免费复查</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAiInsight(
                        `【享宇智评 · 全景综合尽调 AI 总结】\n${OVERALL_SUMMARY.summary}\n\n建议授信：¥500.00 万元 (702分 B+级)`
                      )}
                      className="px-2.5 py-1 rounded-xs text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Copy className="w-3 h-3 text-slate-400" />
                      <span>{copied ? '已复制' : '复制全景总结'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 报告连续文档流 (原生 HTML5 Canvas 极简微核矢量流式渲染 61 页全景报告) */}
            <div className="space-y-4 w-full">
              {pagesArray.map((pageNum) => {
                const isCurrentVisible = activePage === pageNum;

                return (
                  <PdfCanvasPage
                    key={pageNum}
                    pdfDoc={pdfDoc}
                    pageNum={pageNum}
                    isCurrentVisible={isCurrentVisible}
                  />
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* 4. AI 章节总结分析抽屉 (仅展示板块深度总结流，不包含全景总括) */}
      <Drawer
        open={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        width={560}
        styles={{ body: { padding: 0, backgroundColor: '#f8fafc' }, header: { borderBottom: '1px solid #e2e8f0' } }}
        title={
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-sky-600 to-indigo-700 flex items-center justify-center text-white shadow-2xs">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block leading-tight">
                  享宇智评 AI 深度总结分析
                </span>
                <span className="text-[11px] text-slate-500 font-normal">
                  风控大模型引擎 · 板块研判流 ({chatMessages.filter(m => m.role === 'ai').length} 条记录)
                </span>
              </div>
            </div>
            {chatMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setChatMessages([])}
                className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="清空对话历史"
              >
                清空记录
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-col h-full justify-between">
          
          {/* 对话流容器 (仅展示板块总结历史，支持向下滚动) */}
          <div className="p-5 space-y-6 overflow-y-auto max-h-[calc(100vh-120px)]">
            {chatMessages.length === 0 ? (
              <div className="py-24 text-center space-y-3 px-6">
                <div className="w-12 h-12 rounded-full bg-sky-50 border border-sky-200 text-sky-700 mx-auto flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-6 h-6 text-sky-600 animate-pulse" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-800">暂无板块总结研判记录</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  请在左侧报告目录大纲中，点击任意章节旁的 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 font-bold text-[10px]"><Sparkles className="w-2.5 h-2.5 text-sky-600" /> AI总结</span> 按钮，即可在此处实时调阅该板块的深度研判与指标穿透结论。
                </p>
              </div>
            ) : (
              chatMessages.map((msg, index) => {
                if (msg.role === 'user') {
                  return (
                    <div key={msg.id || index} className="flex items-start justify-end gap-2.5 pl-10">
                      <div className="bg-sky-700 text-white p-3 rounded-lg rounded-tr-none shadow-2xs text-xs leading-relaxed max-w-[85%]">
                        <p>{msg.text}</p>
                        <span className="text-[10px] text-sky-200 block text-right mt-1 font-mono">
                          {msg.timestamp || '刚刚'}
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        我
                      </div>
                    </div>
                  );
                }

                // AI 回复气泡 (章节深度总结卡片)
                const data = msg.data;
                if (!data) return null;
                return (
                  <div key={msg.id || index} className="flex items-start gap-2.5 pr-4">
                    <div className="w-7 h-7 rounded-full bg-sky-700 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 space-y-2 max-w-[92%]">
                      <div className="bg-white p-4 rounded-lg rounded-tl-none border border-slate-200 shadow-2xs space-y-3">
                        
                        {/* 标题栏 */}
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <div>
                            <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                              <span>{data.chapterNo} {data.title}</span>
                            </h4>
                            <p className="text-[11px] text-slate-500 mt-0.5">{data.subtitle}</p>
                          </div>
                          {data.scoreTag && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-xs bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                              {data.scoreTag}
                            </span>
                          )}
                        </div>

                        {/* 核心结论 */}
                        <div className="p-3 bg-sky-50/70 border border-sky-100 rounded-sm text-xs text-slate-700 leading-relaxed">
                          <strong className="text-sky-950 block mb-1">💡 核心研判结论：</strong>
                          {data.summary}
                        </div>

                        {/* 核心指标穿透矩阵 */}
                        {data.highlights && data.highlights.length > 0 && (
                          <div>
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                              📊 核心指标穿透
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {data.highlights.map((hl, idx) => (
                                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-sm space-y-1">
                                  <span className="text-[10px] text-slate-400 block font-medium">{hl.label}</span>
                                  <span className="text-xs font-extrabold text-slate-900 block font-mono">{hl.value}</span>
                                  <span className="text-[10px] text-slate-500 block leading-tight">{hl.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 底部操作与时间 */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px]">
                          <span className="text-slate-400 font-mono">{msg.timestamp || '刚刚'} · 享宇智评风控大模型引擎</span>
                          <button
                            type="button"
                            onClick={() => handleCopyAiInsight(
                              `【享宇智评 AI 总结 - ${data.chapterNo} ${data.title}】\n\n核心结论：${data.summary}`
                            )}
                            className="px-2.5 py-1 rounded-xs text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-slate-400" />
                            <span>复制此条</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatBottomRef} />
          </div>

        </div>
      </Drawer>

      {/* 5. 最右侧常驻吸边把手 (支持吸边、常驻悬浮、一键展开 AI 对话抽屉) */}
      <aside 
        aria-label="AI 智能总结常驻入口"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
      >
        <button
          type="button"
          onClick={() => setIsAiDrawerOpen(true)}
          className="group flex flex-col items-center gap-1.5 py-3.5 px-2 bg-gradient-to-b from-sky-700 to-sky-900 text-white rounded-l-md shadow-2xl border-l border-t border-b border-sky-400/30 hover:bg-sky-800 hover:pl-2.5 transition-all cursor-pointer select-none"
          title="点击展开 AI 智能总结与板块研判记录"
        >
          <Sparkles className="w-4 h-4 text-sky-200 animate-pulse group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-extrabold tracking-widest text-sky-100 [writing-mode:vertical-rl] leading-tight py-1">
            AI 总结
          </span>
          <ChevronLeft className="w-3.5 h-3.5 text-sky-300 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </aside>

    </div>
  );
}
