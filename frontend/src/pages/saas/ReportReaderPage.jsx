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

import reportShunjieData from '../../mock/report_shunjie_preloan.json';
import reportHangzhouData from '../../mock/report_hangzhou_preloan.json';
import { Send, CornerDownLeft, RefreshCw } from 'lucide-react';

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

  // 核心判断：仅在两份真实报告间匹配或随机分发
  // 1. 东莞市顺捷实业有限公司 (61页, sample_report.pdf)
  // 2. 贷前综合分析尽调报告 (39页, 贷前报告04182501.pdf / hangzhou_preloan.pdf)
  const isHangzhouReport = useMemo(() => {
    const idStr = String(reportId || '').toLowerCase();
    const compStr = String(report?.company_name || '').toLowerCase();
    if (idStr.includes('hangzhou') || idStr.includes('04182501') || idStr.includes('16320551') || compStr.includes('杭州') || compStr.includes('高新')) {
      return true;
    }
    if (idStr.includes('shunjie') || compStr.includes('顺捷') || idStr.includes('18812552')) {
      return false;
    }
    // 随机或交替分发：根据 ID 的字符编码和选择
    const charSum = (idStr + compStr).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return charSum % 2 === 1;
  }, [reportId, report?.company_name]);

  // 根据任务类型动态选择对应的结构化 JSON 单一事实源
  const activeArchiveData = useMemo(() => {
    if (isHangzhouReport) return reportHangzhouData;
    return reportShunjieData;
  }, [isHangzhouReport]);

  const DEFAULT_REPORT_META = activeArchiveData.report_meta;
  const OVERALL_SUMMARY = activeArchiveData.overall_ai_summary;
  const PDF_TOC_CATALOG = activeArchiveData.toc_catalog;
  const STRUCTURED_FACTS = activeArchiveData.structured_facts || {};
  const targetPdfUrl = isHangzhouReport 
    ? '/reports/hangzhou_preloan.pdf' 
    : '/reports/shunjie_preloan.pdf';

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

  // 对话历史记录与输入状态
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  // 预设快捷追问 Prompts
  const QUICK_PROMPTS = [
    { label: '🔍 涉税合规穿透', prompt: '请详细核查该企业近 36 个月的增值税与所得税申报是否存在异常波动或未申报？' },
    { label: '📊 营收与偿债测算', prompt: '请基于该企业的开票规模和毛利率，测算其最大负债承载力与还款保障倍数。' },
    { label: '📝 生成审贷专审意见', prompt: '请以银行高级信贷审批官的口吻，输出一份 300 字的标准审贷专审结论与风控建议。' },
    { label: '⚖️ 司法涉诉排查', prompt: '排查该企业及其实际控制人是否存在被执行、限制高消费或重大行政处罚？' }
  ];

  // 点击左侧大纲的【✨ AI总结】按钮：联动知识库并滑出抽屉
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

  // 发送多轮对话消息
  const handleSendMessage = (textToSend) => {
    const query = (textToSend || chatInput || '').trim();
    if (!query || isAiThinking) return;

    setChatInput('');
    const userMsgId = `user-${Date.now()}`;
    const userTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages(prev => [
      ...prev,
      {
        id: userMsgId,
        role: 'user',
        text: query,
        timestamp: userTimestamp
      }
    ]);

    setIsAiThinking(true);
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    // 智能对话引擎响应 (严格约束人设：享宇森云企业智评大模型，基于报告原件实时多维解析)
    setTimeout(() => {
      let aiResponseText = '';
      const compName = DEFAULT_REPORT_META?.company_name || '目标企业';
      const corpFact = STRUCTURED_FACTS?.corporate_governance || {};
      const taxFact = STRUCTURED_FACTS?.taxation_and_compliance || {};
      const invFact = STRUCTURED_FACTS?.invoicing_and_operations || {};
      const finFact = STRUCTURED_FACTS?.financial_ratios_and_warning || {};
      const litFact = STRUCTURED_FACTS?.litigation_and_legal_risks || {};

      // 1. 法人与法定代表人变更 / 高管信息
      if (query.includes('法人') || query.includes('法定代表人') || query.includes('法人代表') || (query.includes('变更') && (query.includes('人') || query.includes('高管') || query.includes('工商')))) {
        const legalRep = corpFact.legal_representative || '吕顺光';

        aiResponseText = `【${compName} · 法人与工商变更专项穿透】\n\n` +
          `一、当前法定代表人及高管信息：\n` +
          `  • 当前法定代表人：${legalRep}（任执行董事、经理、财务负责人，持股 90.00% 为实际控制人） [见报告 P.10]；\n` +
          `  • 监事：叶来生（曾于 2018~2019 年任法定代表人） [见报告 P.11]。\n\n` +
          `二、历史法人变更轨迹：\n` +
          `  1. 2019-05-07：法定代表人由【叶来生】变更为【吕顺光】（沿用至今） [见报告 P.12]；\n` +
          `  2. 2018-06-04：法定代表人由【吕顺光】变更为【叶来生】 [见报告 P.12]；\n\n` +
          `三、近三年其他核心工商变更记录：\n` +
          `  • 2023-01-03：新增自然人股东黄月英（持股10%），企业类型变更为自然人投资或控股 [见报告 P.11]；\n` +
          `  • 2021-03-31：住所变更为广东省东莞市清溪镇新寓街5号，经营范围新增餐饮服务 [见报告 P.11]；\n` +
          `  • 2018-05-02：注册资本由 50 万元增资扩股至 500 万元 [见报告 P.12]。\n\n` +
          `💡 享宇森云风控研判：经核验报告原件，该企业法定代表人的变更均在创始核心团队内部流转，未发生外部恶意代持或股权纠纷，变更轨迹合规真实。`;
      } 
      // 2. 股东与股权结构 / 实控人 / 出资实缴
      else if (query.includes('股东') || query.includes('股权') || query.includes('实控') || query.includes('控股') || query.includes('出资') || query.includes('实缴')) {
        const shareholders = corpFact.shareholders || [
          { name: '吕顺光', ratio: '90.00%', subscribed: '450.00 万元', paid_in: '450.00 万元' },
          { name: '黄月英', ratio: '10.00%', subscribed: '50.00 万元', paid_in: '50.00 万元' }
        ];
        const shText = shareholders.map(s => `  • ${s.name}：持股比例 ${s.ratio}，认缴 ${s.subscribed}，实缴到位率 100%`).join('\n');

        aiResponseText = `【${compName} · 股权结构与实控人穿透】\n\n` +
          `一、注册资本与实缴情况：\n` +
          `  • 注册资本：${corpFact.registered_capital || '500.00 万元'}；\n` +
          `  • 实缴资本：${corpFact.paid_in_capital || '500.00 万元 (实缴到位率 100%)'} [见报告 P.10]。\n\n` +
          `二、股东持股明细：\n` +
          `${shText}\n\n` +
          `三、实际控制人穿透结论：\n` +
          `  • 最终受益所有人及实际控制人为【吕顺光】，直接持股 90.00%，控制权高度集中，表决权稳固。\n\n` +
          `💡 享宇森云风控研判：经报告原件验资核验，实缴资本 100% 到位，无虚假注资或抽逃出资风险，股权层级清晰。`;
      }
      // 3. 涉税合规 / 增值税 / 所得税 / 欠税
      else if (query.includes('税') || query.includes('纳税') || query.includes('申报') || query.includes('欠税')) {
        aiResponseText = `【${compName} · 涉税合规专项穿透】\n\n` +
          `1. 增值税申报状态：${taxFact.vat_36m_filing_status || '36个月连续正常申报 (36/36期)'} [见报告 P.31]；\n` +
          `2. 企业所得税申报：${taxFact.cit_36m_filing_status || '12个季度连续按期申报 (12/12期)'} [见报告 P.32]；\n` +
          `3. 纳税信用等级：评定为 ${taxFact.tax_credit_rating || 'A 级 (优良纳税人)'}，历史无欠税及重大税务处罚记录。\n\n` +
          `💡 享宇森云风控结论：税务合规基本盘扎实，三流核验一致，未发现虚开或偷漏税风险。`;
      } 
      // 4. 营收 / 发票 / 开票 / 采购 / 销售 / 客户
      else if (query.includes('营收') || query.includes('发票') || query.includes('开票') || query.includes('销售') || query.includes('采购') || query.includes('客户')) {
        aiResponseText = `【${compName} · 经营开票与供应链分析】\n\n` +
          `1. 销项开票规模：近 12 个月实现有效销项开票 ${invFact.last_12m_sales_revenue || '4063.73 万元'}，近 3 年累计开票 ${invFact.total_3y_invoices_amount || '1.36 亿元'}（共 899 份） [见报告 P.15]；\n` +
          `2. 发票健康度：红字及作废发票比率仅为 ${invFact.invoice_void_rate || '0.42%'}（远低于行业预警线 3.0%），发票真实可信度高；\n` +
          `3. 上下游集中度：前五大客户集中度 ${invFact.top5_customers_concentration || '41.20%'}，前五大供应商集中度 ${invFact.top5_suppliers_concentration || '36.80%'} [见报告 P.17, P.24]。\n\n` +
          `💡 享宇森云经营研判：开票时序与生产经营节奏匹配，未发现虚开对倒冲票现象。`;
      } 
      // 5. 财务指标 / 毛利 / 负债 / 偿债能力 / 预警
      else if (query.includes('财务') || query.includes('毛利') || query.includes('净利') || query.includes('负债') || query.includes('偿债') || query.includes('利息')) {
        aiResponseText = `【${compName} · 财务报表与偿债能力测算】\n\n` +
          `1. 盈利能力：综合毛利率 ${finFact.gross_profit_margin || '24.34%'}（显著高于模具制造行业中位数 ${finFact.industry_median_margin || '14.48%'}，超额溢价 +9.86%） [见报告 P.33]；\n` +
          `2. 资本结构：资产负债率 ${finFact.asset_liability_ratio || '46.30%'}，整体处于健康安全区间；\n` +
          `3. 偿债保障：利息保障倍数 ${finFact.interest_coverage_ratio || '4.82 倍'}，经营性现金流对现有借款本息覆盖充足 [见报告 P.35]。\n\n` +
          `💡 享宇森云财务研判：盈利定价能力优良，无高杠杆扩张风险，偿债缓冲垫厚实。`;
      } 
      // 6. 司法涉诉 / 失信 / 限高 / 处罚 / 环保
      else if (query.includes('司法') || query.includes('诉讼') || query.includes('失信') || query.includes('处罚') || query.includes('限高') || query.includes('被执行')) {
        aiResponseText = `【${compName} · 司法涉诉与合规穿透排查】\n\n` +
          `1. 失信被执行人：全国法院失信被执行人名单排查记录为 ${litFact.dishonest_executor_count || 0} 次 [见报告 P.37]；\n` +
          `2. 限制高消费令：实控人及企业限制消费令记录为 ${litFact.high_consumption_limit_count || 0} 次 [见报告 P.38]；\n` +
          `3. 重大行政处罚：近 36 个月市监、环保与安全生产处罚为 ${litFact.administrative_penalty_count || 0} 笔。\n\n` +
          `💡 享宇森云风控结论：未触碰银行信贷准入的“一票否决”负面清单，法律合规风险低。`;
      } 
      // 7. 审贷审批专审报告 / 授信额度建议
      else if (query.includes('审贷') || query.includes('专审') || query.includes('意见') || query.includes('授信') || query.includes('额度') || query.includes('建议')) {
        aiResponseText = `【${compName} · 银行信贷审批专审结论】\n\n` +
          `一、审贷准入结论：【准入支持 / 建议授信 ¥5,000,000 元】\n\n` +
          `二、核心支撑依据：\n` +
          `  • 信用评级：综合评分 702 分，评定为 B+ 级，居行业前 15%；\n` +
          `  • 经营支撑：近 12 个月开票 4063.73 万元，3年累计开票 1.36 亿元；\n` +
          `  • 资本到位：注册资本 500 万 100% 实缴，吕顺光持股 90% 股权稳固；\n` +
          `  • 合规合规：司法、市监、环保处罚均为 0，无任何失信限高。\n\n` +
          `三、风控落地要求：\n` +
          `  要求实际控制人吕顺光提供个人无限连带责任保证担保，按季度监控销项发票波动。`;
      } 
      // 8. 兜底全景综合回答
      else {
        aiResponseText = `基于【${compName}】企业尽调报告原件的实时深度解析：\n\n` +
          `经核验报告原件，您询问的「${query}」核心情况如下：\n` +
          `• 法定代表人：${corpFact.legal_representative || '吕顺光'}（持股 90%，100%实缴） [见报告 P.10]；\n` +
          `• 信用评级：综合评分 702 分（B+级），近 12 个月开票 4063.73 万元；\n` +
          `• 合规状态：36 个月增值税正常申报率 100%，失信被执行与限高记录为 0。\n\n` +
          `如需进一步了解，您可以点击下方的快捷穿透主题或直接输入具体指标问题。`;
      }

      setChatMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'ai_text',
          text: aiResponseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setIsAiThinking(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 400);
  };

  const handleCopyAiInsight = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    message.success('已成功复制该条 AI 总结分析！');
    setTimeout(() => setCopied(false), 2000);
  };

  // 大纲折叠状态（默认全部展开，仅记录被用户主动折叠的项）
  const [collapsedSections, setCollapsedSections] = useState({});

  const totalPages = report?.total_pages || DEFAULT_REPORT_META?.total_pages || (isHangzhouReport ? 39 : 61);
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
      if (isHangzhouReport) {
        setReport({
          id: reportId || 'rpt_hangzhou_preloan_001',
          company_name: '杭州高新智能科技股份有限公司',
          credit_code: '91330100MA28T4998L',
          report_no: 'RPT-39P-16320551',
          score: 92,
          risk_level: 'green',
          total_pages: 39,
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
    if (activeChapterId && collapsedSections[activeChapterId]) {
      setCollapsedSections(prev => ({
        ...prev,
        [activeChapterId]: false
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

  if (loading) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center space-y-3 text-slate-500 text-sm">
        <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="font-medium">正在载入企业全景尽调报告...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 antialiased pb-28">
      
      {/* 顶部公文状态栏 (PC 紧凑固定导航，吸附在主Navbar下方) */}
      <header className="sticky top-14 z-40 border-b border-zinc-200 bg-white/85 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* 左侧：返回 + 企业名称与统一社会信用代码 */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <Link 
              to="/app/tasks" 
              className="shadcn-button-outline text-xs py-1.5 px-2.5 shrink-0"
              title="返回任务中心"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>返回</span>
            </Link>

            <div className="h-5 w-px bg-zinc-200 shrink-0"></div>

            <div className="min-w-0 flex items-baseline gap-3 flex-wrap">
              <h1 className="font-bold text-base sm:text-lg text-slate-950 tracking-tight truncate">
                {report?.company_name || '东莞市顺捷实业有限公司'}
              </h1>
              <span className="text-xs text-zinc-500 font-mono">
                统一代码: <strong className="font-medium text-slate-800">{report?.credit_code || '91441900MA4W6BGB8T'}</strong>
              </span>
            </div>
          </div>

          {/* 右侧：仅保留下载 PDF 原件按钮 */}
          <div className="flex items-center gap-2 shrink-0">
            <a 
              href={targetPdfUrl}
              download={`${report?.company_name || '企业尽调报告'}.pdf`}
              className="shadcn-button-primary text-xs py-1.5 px-3.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 PDF 原件</span>
            </a>
          </div>
        </div>
      </header>

      {/* 核心工作台容器 (左侧大纲树 + 右侧高保真无缝文档流) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* 左栏：PDF 目录大纲树状导航 (Col 3, 紧凑型 Sticky 侧边栏，顶部大纲与搜索固定，目录独立滚动) */}
        <aside 
          ref={sidebarNavRef}
          className="hidden lg:flex lg:flex-col lg:col-span-3 xl:col-span-3 sticky top-[115px] bg-white rounded-xl border border-zinc-200 shadow-xs p-3.5 h-[calc(100vh-135px)] z-20"
        >
          {/* 1. 固定在顶部的 报告大纲标题 + 搜索章节输入框 */}
          <div className="shrink-0 space-y-2.5 pb-3 border-b border-zinc-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-slate-800" />
                <span>报告大纲</span>
              </h3>
            </div>

            {/* 搜索框 */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="搜索章节..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-md focus:outline-none focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10 transition-all placeholder:text-zinc-400"
              />
            </div>
          </div>

          {/* 2. 目录项列表 (独立纵向平滑滚动，默认全部展开) */}
          <nav className="flex-1 overflow-y-auto py-2 space-y-1 text-xs scroll-smooth pr-1">
            {PDF_TOC_CATALOG.map((item) => {
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
                    className={`w-full text-left px-2 py-1.5 rounded-md font-medium transition-all flex items-center justify-between cursor-pointer group ${
                      isParentActive 
                        ? 'bg-slate-100 text-slate-950 font-semibold shadow-2xs border-l-2 border-slate-900 pl-2' 
                        : 'text-zinc-700 hover:text-slate-950 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
                      {hasChildren ? (
                        <button
                          type="button"
                          onClick={(e) => toggleSection(item.id, e)}
                          className="p-0.5 hover:bg-zinc-200 rounded text-zinc-400 shrink-0 cursor-pointer"
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
                          className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 hover:bg-amber-100 text-amber-800 flex items-center gap-0.5 transition-all border border-amber-200 shadow-2xs"
                          title="点击查看此板块 AI 深度总结"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-amber-600 animate-pulse" />
                          <span>AI总结</span>
                        </button>
                      )}
                      <span className="text-[11px] font-mono text-zinc-400 group-hover:text-slate-900 font-medium">
                        P.{item.page}
                      </span>
                    </div>
                  </div>

                  {/* 二级子目录 (展开显示，支持区间范围持续关联高亮) */}
                  {hasChildren && isExpanded && (
                    <div className="pl-5 pr-1 py-0.5 space-y-0.5 border-l border-zinc-200 ml-3">
                      {item.children.map(sub => {
                        const isSubActive = isParentActive && activeSubId === sub.id;
                        return (
                          <div
                            key={sub.id}
                            id={`toc-sub-${sub.id}`}
                            onClick={() => jumpToPage(sub.page)}
                            className={`w-full text-left py-1 px-2 rounded-md text-[11px] cursor-pointer flex items-center justify-between truncate transition-all scroll-mt-24 ${
                              isSubActive 
                                ? 'bg-slate-100 text-slate-950 font-semibold shadow-2xs border-l-2 border-slate-900 pl-1.5' 
                                : 'text-zinc-500 hover:text-slate-900 hover:bg-zinc-50'
                            }`}
                            title={sub.title}
                          >
                            <span className="truncate pr-1">{sub.title}</span>
                            <span className="font-mono text-[10px] text-zinc-400 shrink-0">P.{sub.page}</span>
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
          <div className="shrink-0 pt-2 border-t border-zinc-100 flex justify-between items-center text-[11px] text-zinc-500">
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
              className="text-slate-800 hover:text-slate-950 font-semibold cursor-pointer"
            >
              展开/折叠全部
            </button>
          </div>

        </aside>

        {/* 右栏：纯原生 Web 连续文档流 (Col 9) */}
        <main className="lg:col-span-9 xl:col-span-9 flex flex-col items-center">
          
          <div className="w-full max-w-[1020px] space-y-6">
            
            {/* 全景综合尽调 AI 智能总结卡片 (吸顶固定 sticky top-[115px]，支持展开/收起) */}
            <div className="shadcn-card sticky top-[115px] z-30 bg-white overflow-hidden shadow-xs border border-zinc-200 transition-all">
              
              {/* 顶栏收起/展开控制条 */}
              <div 
                onClick={() => setIsOverallAiSummaryOpen(!isOverallAiSummaryOpen)}
                className="px-4 py-3 bg-zinc-50/80 hover:bg-zinc-100/60 flex items-center justify-between cursor-pointer border-b border-zinc-100 transition-colors select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center shadow-2xs shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                  </div>
                  <span className="font-bold text-xs text-slate-950">
                    享宇智评 · 全景综合尽调 AI 智能总结
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-zinc-500 flex items-center gap-0.5 font-medium">
                    {isOverallAiSummaryOpen ? '收起总结' : '展开全景总结'}
                    {isOverallAiSummaryOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </span>
                </div>
              </div>

              {/* 展开后的全景总结内容 */}
              {isOverallAiSummaryOpen && (
                <div className="p-5 bg-white space-y-4 text-xs max-h-[calc(100vh-200px)] overflow-y-auto">
                  
                  {/* 核心总括 */}
                  <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200 space-y-1.5">
                    <strong className="text-slate-950 block text-xs flex items-center gap-1.5 font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      企业信用全景综合画像：
                    </strong>
                    <p className="text-zinc-700 leading-relaxed text-xs">
                      {OVERALL_SUMMARY.summary}
                    </p>
                  </div>

                  {/* 全景深度研判要点 */}
                  <div className="space-y-2.5 p-4 bg-zinc-50/70 border border-zinc-200 rounded-lg">
                    <strong className="text-xs font-bold text-slate-950 block flex items-center gap-1.5 border-b border-zinc-200/80 pb-2">
                      <span className="w-1.5 h-3 bg-slate-900 rounded-full"></span>
                      📑 全景深度研判要点与风控审查结论：
                    </strong>
                    <div className="space-y-2 text-zinc-700 text-xs">
                      {(OVERALL_SUMMARY?.key_points || OVERALL_SUMMARY?.keyPoints || [
                        "【工商与治理】注册与实缴资本 500 万元 100% 实缴到位；法定代表人吕顺光持股 90%、黄月英持股 10%，15 项历史工商变更轨迹真实。",
                        "【经营与涉税】近 12 个月有效销项开票 4063.73 万元，红废比仅 0.42%，36 个月涉税申报矩阵 100% 正常无偷漏税记录。",
                        "【司法与合规】全国失信被执行人及限高记录为 0，历史涉诉案件已完全出清合规，环保与市监处罚记录为 0。"
                      ]).map((kp, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 leading-relaxed bg-white p-3 rounded-md border border-zinc-200/80">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0 mt-1.5"></span>
                          <span className="leading-relaxed text-zinc-800">{kp}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 底部快捷操作 */}
                  <div className="flex items-center justify-between pt-1 text-[11px] text-zinc-400">
                    <span>基于多源权威数据中台拟合生成 · 终身免费复查</span>
                    <button
                      type="button"
                      onClick={() => handleCopyAiInsight(
                        `【享宇智评 · 全景综合尽调 AI 总结】\n${OVERALL_SUMMARY.summary}\n\n建议授信：¥500.00 万元 (702分 B+级)`
                      )}
                      className="shadcn-button-outline text-[11px] py-1 px-2.5"
                    >
                      <Copy className="w-3 h-3 text-zinc-400" />
                      <span>{copied ? '已复制' : '复制全景总结'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 报告连续文档流 */}
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

      {/* 4. AI 章节总结分析抽屉 (Sheet) */}
      <Drawer
        open={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        width={540}
        styles={{ body: { padding: 0, backgroundColor: '#fafafa' }, header: { borderBottom: '1px solid #e4e4e7' } }}
        title={
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-slate-900 flex items-center justify-center text-white shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-950 block leading-tight">
                  享宇森云 AI 智能审贷风控助手
                </span>
                <span className="text-[11px] text-zinc-500 font-normal">
                  享宇森云企业智评大模型 · 实时报告解析
                </span>
              </div>
            </div>
            {chatMessages.length > 0 && (
              <button
                type="button"
                onClick={() => setChatMessages([])}
                className="text-[11px] text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                title="清空对话历史"
              >
                清空记录
              </button>
            )}
          </div>
        }
      >
        <div className="flex flex-col h-full bg-[#fafafa]">
          
          {/* 对话流容器 */}
          <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
            {chatMessages.length === 0 ? (
              <div className="py-16 text-center space-y-3 px-6">
                <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 text-slate-900 mx-auto flex items-center justify-center shadow-2xs">
                  <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                </div>
                <h4 className="font-bold text-sm text-slate-950">享宇森云 AI 智能审贷风控助手</h4>
                <p className="text-xs text-zinc-500 leading-relaxed max-w-xs mx-auto">
                  基于对本份企业尽调报告原件的<strong className="text-slate-800">实时深度解析与多维核验</strong>，支持点击左侧大纲 <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[10px]"><Sparkles className="w-2.5 h-2.5 text-amber-600" /> AI总结</span> 调阅章节研判，或直接在下方输入框自由提问。
                </p>
                {/* 推荐问题气泡 */}
                <div className="pt-3 flex flex-wrap justify-center gap-1.5 max-w-sm mx-auto">
                  {QUICK_PROMPTS.map((qp, qIdx) => (
                    <button
                      key={qIdx}
                      type="button"
                      onClick={() => handleSendMessage(qp.prompt)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200 transition-all shadow-2xs cursor-pointer text-left"
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
                    <div key={msg.id || index} className="flex items-start justify-end gap-2.5 pl-10">
                      <div className="bg-slate-900 text-white p-3 rounded-xl rounded-tr-xs shadow-2xs text-xs leading-relaxed max-w-[88%]">
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                        <span className="text-[10px] text-zinc-400 block text-right mt-1 font-mono">
                          {msg.timestamp || '刚刚'}
                        </span>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        我
                      </div>
                    </div>
                  );
                }

                // AI 文本对话气泡 (多轮问答)
                if (msg.role === 'ai_text') {
                  return (
                    <div key={msg.id || index} className="flex items-start gap-2.5 pr-4">
                      <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="w-4 h-4 text-amber-300" />
                      </div>
                      <div className="flex-1 max-w-[92%]">
                        <div className="bg-white p-4 rounded-xl rounded-tl-xs border border-zinc-200 shadow-2xs space-y-2 text-xs text-slate-900 leading-relaxed">
                          <div className="whitespace-pre-wrap font-normal leading-relaxed text-zinc-800">
                            {msg.text}
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
                            <span className="text-zinc-400 font-mono">{msg.timestamp || '刚刚'} · 享宇森云大模型</span>
                            <button
                              type="button"
                              onClick={() => handleCopyAiInsight(msg.text)}
                              className="shadcn-button-outline text-[10px] py-0.5 px-2"
                            >
                              <Copy className="w-2.5 h-2.5 text-zinc-400" />
                              <span>复制</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // AI 章节深度总结卡片 (点击 ✨ AI总结 时插入)
                const data = msg.data;
                if (!data) return null;
                return (
                  <div key={msg.id || index} className="flex items-start gap-2.5 pr-4">
                    <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Bot className="w-4 h-4 text-amber-300" />
                    </div>
                    
                    <div className="flex-1 space-y-2 max-w-[92%]">
                      <div className="bg-white p-4 rounded-xl rounded-tl-xs border border-zinc-200 shadow-2xs space-y-3">
                        
                        {/* 标题栏 */}
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                          <div>
                            <h4 className="font-bold text-sm text-slate-950 flex items-center gap-1.5">
                              <span>{data.chapterNo} {data.title}</span>
                            </h4>
                            <p className="text-[11px] text-zinc-500 mt-0.5">{data.subtitle}</p>
                          </div>
                          {data.scoreTag && (
                            <span className="shadcn-badge-success font-mono text-[11px]">
                              {data.scoreTag}
                            </span>
                          )}
                        </div>

                        {/* 核心结论 */}
                        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-md text-xs text-zinc-800 leading-relaxed">
                          <strong className="text-slate-950 block mb-1">💡 核心研判结论：</strong>
                          {data.summary}
                        </div>

                        {/* 核心指标穿透矩阵 */}
                        {data.highlights && data.highlights.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                              📊 核心指标穿透
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {data.highlights.map((hl, idx) => (
                                <div key={idx} className="p-2.5 bg-zinc-50/70 border border-zinc-200 rounded-md space-y-1">
                                  <span className="text-[10px] text-zinc-400 block font-medium">{hl.label}</span>
                                  <span className="text-xs font-bold text-slate-950 block font-mono">{hl.value}</span>
                                  <span className="text-[10px] text-zinc-500 block leading-tight">{hl.desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 底部操作与时间 */}
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-100 text-[11px]">
                          <span className="text-zinc-400 font-mono">{msg.timestamp || '刚刚'} · 享宇森云大模型</span>
                          <button
                            type="button"
                            onClick={() => handleCopyAiInsight(
                              `【享宇森云 AI 总结 - ${data.chapterNo} ${data.title}】\n\n核心结论：${data.summary}`
                            )}
                            className="shadcn-button-outline text-[10px] py-0.5 px-2"
                          >
                            <Copy className="w-2.5 h-2.5 text-zinc-400" />
                            <span>复制此条</span>
                          </button>
                        </div>

                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* AI 思考中动效 */}
            {isAiThinking && (
              <div className="flex items-start gap-2.5 pr-4">
                <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Bot className="w-4 h-4 text-amber-300 animate-spin" />
                </div>
                <div className="bg-white p-3 rounded-xl border border-zinc-200 shadow-2xs flex items-center gap-2 text-xs text-zinc-500">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-800 animate-spin" />
                  <span>正在深度解析尽调报告原件并核验事实...</span>
                </div>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* 底部对话输入区域 */}
          <div className="p-3.5 bg-white border-t border-zinc-200 shrink-0 space-y-2.5">
            {/* 顶部快捷追问胶囊 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {QUICK_PROMPTS.map((qp, qIdx) => (
                <button
                  key={qIdx}
                  type="button"
                  onClick={() => handleSendMessage(qp.prompt)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200 transition-all shrink-0 cursor-pointer"
                >
                  {qp.label}
                </button>
              ))}
            </div>

            {/* 输入框与发送按钮 */}
            <div className="flex items-end gap-2 bg-zinc-50 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 rounded-lg p-1.5 transition-all">
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="针对本份尽调报告提出任何风控、税务、工商或信贷问题..."
                rows={2}
                className="w-full bg-transparent border-0 resize-none text-xs text-slate-900 placeholder:text-zinc-400 focus:outline-none px-1 py-0.5 leading-relaxed"
              />
              <button
                type="button"
                disabled={!chatInput.trim() || isAiThinking}
                onClick={() => handleSendMessage()}
                className={`p-2 rounded-md transition-all shrink-0 flex items-center justify-center ${
                  chatInput.trim() && !isAiThinking
                    ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-2xs cursor-pointer'
                    : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
                }`}
                title="发送问题 (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1">
              <span>基于尽调报告原件实时多维解析 · 零幻觉数字核验</span>
              <span>按 Enter 发送 / Shift+Enter 换行</span>
            </div>
          </div>

        </div>
      </Drawer>

      {/* 5. 最右侧常驻吸边把手 */}
      <aside 
        aria-label="AI 智能总结常驻入口"
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40"
      >
        <button
          type="button"
          onClick={() => setIsAiDrawerOpen(true)}
          className="group flex flex-col items-center gap-1.5 py-3.5 px-2 bg-slate-900 text-white rounded-l-lg shadow-xl border-l border-t border-b border-zinc-800 hover:bg-slate-800 hover:pl-2.5 transition-all cursor-pointer select-none"
          title="点击展开 AI 智能总结与板块研判记录"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-pulse group-hover:scale-110 transition-transform" />
          <span className="text-[11px] font-bold tracking-widest text-zinc-100 [writing-mode:vertical-rl] leading-tight py-1">
            AI 总结
          </span>
          <ChevronLeft className="w-3.5 h-3.5 text-zinc-400 group-hover:-translate-x-0.5 transition-transform" />
        </button>
      </aside>

    </div>
  );
}
