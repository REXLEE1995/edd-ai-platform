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

// 全景综合尽调 AI 总结与研判大纲 (企业全景总括)
const OVERALL_SUMMARY = {
  id: 'overall',
  chapterNo: '全景',
  title: '企业全景尽调综合研判',
  subtitle: '东莞市顺捷实业有限公司 · 全景尽调总括报告',
  scoreTag: '702分 · B+ 信用等级 · 建议授信 500 万',
  summary: '目标企业经营存续 7.9 年，社保连续缴纳 76 人，近 12 个月实现有效开票营收 4063.73 万元，综合毛利率 24.34%（高于同行业中位值 14.48%）。企业股权穿透清晰（实缴 500 万到位率 100%），司法排查无任何失信或限高记录，36 个月涉税申报矩阵 100% 正常，整体经营与合规基本面扎实，符合信贷支持标准。',
  highlights: [
    { label: '综合评分', value: '702 分 (B+级)', desc: '定量多维拟合，居塑料制造细分前 15%' },
    { label: '年均营收', value: '4063.73 万元', desc: '近3年累计有效开票 1.36 亿元 (899份)' },
    { label: '综合毛利率', value: '24.34%', desc: '显著高于行业中位值 14.48% (溢价+9.86%)' },
    { label: '建议授信', value: '¥5,000,000 元', desc: '建议采用实控人无限连带责任保证授信' }
  ],
  keyPoints: [
    '【工商与治理】注册与实缴资本 500 万元 100% 实缴到位；法定代表人吕顺光持股 90%、黄月英持股 10%，15 项历史工商变更轨迹真实。',
    '【经营与供应链】近 3 年销项有效发票 1.36 亿元，红废率仅 0.61%，水电能耗与生产吻合；核心大客户东莞环旭合作黏性强。',
    '【涉税与合规】36 个月增值税与所得税申报日历 100% 正常；利息保障倍数达 40.71 倍；无失信被执行记录，2起历史行政处罚均已办结。'
  ]
};

// 享宇智评各章节 AI 深度总结与关键指标提炼
const AI_CHAPTER_INSIGHTS = {
  'overall': OVERALL_SUMMARY,
  'sec-ch1': {
    chapterNo: '01',
    title: '信用等级及风险提示',
    subtitle: '享宇智评综合评分与信贷决策指引',
    scoreTag: '702分 · B+级',
    summary: '该企业综合评分 702 分，处于 B+ 信用评级区间，属于信贷支持类客户。整体履约合规性极强，生产经营稳定，建议给予 ¥500.00 万元预授信额度。',
    highlights: [
      { label: '综合评级', value: '702分 (B+级)', desc: '定量评分结合专家经验，评级居同行业前 15%' },
      { label: '建议额度', value: '¥5,000,000 元', desc: '基于 4063 万年开票与净资产综合拟合' },
      { label: '履约合规', value: '92 分', desc: '无失信被执行记录，无未结案被执行事项' },
      { label: '盈利能力', value: '86 分', desc: '近12个月综合毛利率 24.34%，高于行业中位值' }
    ]
  },
  'sec-ch2': {
    chapterNo: '02',
    title: '企业信用风险概览',
    subtitle: '四大维度 20+ 项宏观风控关键指标穿透',
    scoreTag: '四维稳健 · 风险可控',
    summary: '企业基本面极其扎实，经营存续 7.9 年，社保连续缴纳 76 人，纳税信用等级 A 级。进销项发票流水与用电能耗真实匹配，无欠税与失信记录。',
    highlights: [
      { label: '经营稳定性', value: '7.9 年', desc: '24 个月内法定代表人与股东 0 变更' },
      { label: '社保用工', value: '76 人', desc: '连续在保员工 76 人，用工规模真实' },
      { label: '进销项匹配', value: '92.32%', desc: '进销比健康，不存在异常虚开发票特征' },
      { label: '红废发票率', value: '0.61%', desc: '远低于行业 3% 风险预警红线' }
    ]
  },
  'sec-ch3': {
    chapterNo: '03',
    title: '企业基本信息与治理',
    subtitle: '市监工商照面、股权穿透与 15 条历史变更轨迹',
    scoreTag: '股权清晰 · 权责明确',
    summary: '企业股权结构高度集中且穿透清晰，实缴出资到位率 100%。管理层结构稳定，历史变更记录真实体现了企业由初创到规模化经营的演进历程。',
    highlights: [
      { label: '注册与实缴', value: '500.00 万元', desc: '注册资本 500 万，实缴 500 万 (100%到位)' },
      { label: '核心控股人', value: '吕顺光 (90%)', desc: '执行董事兼总经理，实际控制人' },
      { label: '少数股东', value: '黄月英 (10%)', desc: '持股 10%，出资 50 万元' },
      { label: '历史变更', value: '15 项', desc: '增资、迁址与范围变更轨迹清晰连续' }
    ]
  },
  'sec-ch4': {
    chapterNo: '04',
    title: '行业环境及产业链',
    subtitle: '行业基尼系数集中度与 12 季度毛利率对标',
    scoreTag: '毛利溢价 · 议价强',
    summary: '企业所处塑料制品与精密模具制造行业，主营产品占比达 85.57% 以上。近 12 个季度毛利率均值显著高于同行业中位值，展现较强的成本控制与产品溢价能力。',
    highlights: [
      { label: '主营业务占比', value: '85.57%', desc: '塑料制品及配件，业务聚焦度高' },
      { label: '最新季度毛利', value: '24.34%', desc: '2024Q4 综合毛利率达 24.34%' },
      { label: '行业毛利中位', value: '14.48%', desc: '同行业可比企业中位值为 14.48%' },
      { label: '毛利超额溢价', value: '+9.86%', desc: '产品附加值与工艺壁垒带来稳定溢价' }
    ]
  },
  'sec-ch5': {
    chapterNo: '05',
    title: '企业经营情况 (开票与客商)',
    subtitle: '1.36 亿开票流水、客商结构与真实能耗拟合',
    scoreTag: '4063万/年 · 经营活跃',
    summary: '近 3 年有效开票总额 1.36 亿元，进项采购 1.18 亿元。主要客户合作稳定，前十大客户年贡献营收 3693 万元；生产用电与租金支出真实印证实体生产。',
    highlights: [
      { label: '年均销售收入', value: '4063.73 万元', desc: '近12个月有效开票，营收规模扎实' },
      { label: '年均采购进项', value: '3751.61 万元', desc: '原料采购与外协加工流水充沛' },
      { label: '第一大客户', value: '东莞环旭 (78.72%)', desc: '长期核心合作伙伴，合作金额超 3199 万元' },
      { label: '实体能耗支出', value: '381.91 万元', desc: '东莞供电局电费支出占比 10.18%，生产真实' }
    ]
  },
  'sec-ch6': {
    chapterNo: '06',
    title: '企业财务分析 (8大预警)',
    subtitle: '36 个月申报矩阵与企业偿债营运预警检测',
    scoreTag: '合规申报 · 偿债充足',
    summary: '近 36 个月增值税与所得税申报日历矩阵 100% 正常。利息保障倍数达 40.71 倍，偿付利息能力极高。动态财务预警中主要关注短期借款到期匹配。',
    highlights: [
      { label: '纳税申报合规', value: '100% 正常', desc: '36 个月申报代码矩阵均为正常申报 (*)' },
      { label: '利息保障倍数', value: '40.71 倍', desc: '息税前利润充沛，债务偿付安全性极高' },
      { label: '流动比率', value: '1.04', desc: '流动资产足以覆盖短期流动负债' },
      { label: '资产周转效率', value: '正常', desc: '应收账款与存货周转处于制造业合理区间' }
    ]
  },
  'sec-ch7': {
    chapterNo: '07',
    title: '企业信用情况 (司法合规)',
    subtitle: '涉诉裁判分类、失信被执行与行政监管全景穿透',
    scoreTag: '司法清洁 · 无失信执行',
    summary: '全网司法涉诉深度排查显示，企业当前无任何未结案被告涉诉记录，无失信被执行、限制高消费等严重违法记录。历史诉讼多为维权起诉，行政处罚均已办结。',
    highlights: [
      { label: '失信被执行人', value: '0 起', desc: '未被列入全国失信被执行人名录' },
      { label: '限制高消费令', value: '0 起', desc: '法人与企业均未受任何限高制约' },
      { label: '未结被告案件', value: '0 起', desc: '当前无任何处于审理或执行中的被告诉讼' },
      { label: '历史诉讼结案', value: '22 起全部结案', desc: '历史劳动与买卖纠纷已全部履行归档' }
    ]
  },
  'sec-ch8': {
    chapterNo: '08',
    title: '附件 (原始明细底册)',
    subtitle: '三年一期财务大表、发票明细流水与社保凭证',
    scoreTag: '底册完整 · 存证可溯',
    summary: '本附件包含 7 组原始数据底册，包括近三年资产负债表与利润表科目明细、48 个月增值税发票月度流水、月度能耗三费与社保月度缴费明细，作为全景尽调核验底稿。',
    highlights: [
      { label: '财务底册', value: '三年一期', desc: '资产负债表与利润表全部科目明细' },
      { label: '发票明细', value: '48 个月', desc: '连续 48 个月进销项开票流水总览' },
      { label: '能耗凭据', value: '水电运费', desc: '月度开票销售额与生产能耗真实匹配' },
      { label: '社保明细', value: '月度参保', desc: '连续在保员工人数及社保缴纳档案' }
    ]
  }
};

// PDF 完整目录大纲与真实物理起始页码映射 (共 61 页)
const PDF_TOC_CATALOG = [
  {
    id: 'sec-cover',
    title: '报告封面与声明',
    page: 1,
    children: [
      { id: 'sec-cover-1', title: '报告首页', page: 1 },
      { id: 'sec-cover-statement', title: '声明与名词释义', page: 2 },
      { id: 'sec-cover-catalogue', title: '报告目录索引', page: 3 }
    ]
  },
  {
    id: 'sec-ch1',
    title: '01 信用等级及风险提示',
    page: 6,
    icon: Award,
    children: [
      { id: 'sec-1-1', title: '1.1 模型说明与评分卡 (325~900分)', page: 6 }
    ]
  },
  {
    id: 'sec-ch2',
    title: '02 企业信用风险概览',
    page: 7,
    icon: Activity,
    children: [
      { id: 'sec-2-1', title: '2.1 基本情况 (7.9年/76人/纳税A级)', page: 7 },
      { id: 'sec-2-2', title: '2.2 经营风险 (连续性好/集中I型)', page: 7 },
      { id: 'sec-2-3', title: '2.3 财务风险 (总资产5337万/负债87%)', page: 8 },
      { id: 'sec-2-4', title: '2.4 信用风险 (欠税0元/处罚2次/无失信)', page: 8 }
    ]
  },
  {
    id: 'sec-ch3',
    title: '03 企业基本信息',
    page: 9,
    icon: Building2,
    children: [
      { id: 'sec-3-1', title: '3.1 工商基础信息 (照面详情)', page: 9 },
      { id: 'sec-3-2', title: '3.2 股权结构 (90%/10% 出资穿透)', page: 10 },
      { id: 'sec-3-3', title: '3.3 主要管理人员 (董监高)', page: 11 },
      { id: 'sec-3-4', title: '3.4 关联企业情况', page: 11 },
      { id: 'sec-3-5', title: '3.5 分支机构', page: 11 },
      { id: 'sec-3-6', title: '3.6 变更信息 (15条完整时间轴)', page: 12 }
    ]
  },
  {
    id: 'sec-ch4',
    title: '04 行业环境及产业链',
    page: 14,
    icon: TrendingUp,
    children: [
      { id: 'sec-4-1', title: '4.1.1 行业销售额基尼系数 (0.70~0.78)', page: 14 },
      { id: 'sec-4-2', title: '4.1.2 Top3 主营商品走势 (塑料/模具)', page: 14 },
      { id: 'sec-4-3', title: '4.1.3 近12季度毛利率 vs 行业中位对标', page: 15 }
    ]
  },
  {
    id: 'sec-ch5',
    title: '05 企业经营情况',
    page: 17,
    icon: BarChart3,
    children: [
      { id: 'sec-5-1', title: '5.1 经营概览 (断票27天/红废0.61%)', page: 17 },
      { id: 'sec-5-2', title: '5.2 销售情况分析 (Top10客户/地域分布)', page: 20 },
      { id: 'sec-5-3', title: '5.3 采购情况分析 (Top10供应商/原材料)', page: 24 },
      { id: 'sec-5-4', title: '5.4 纳税情况分析 (三年走势/税收强拟合)', page: 31 }
    ]
  },
  {
    id: 'sec-ch6',
    title: '06 企业财务分析',
    page: 33,
    icon: DollarSign,
    children: [
      { id: 'sec-6-1', title: '6.1 财务规范性 (36个月申报代码矩阵*)', page: 33 },
      { id: 'sec-6-2', title: '6.2 近3年度主要财务指标大表', page: 34 },
      { id: 'sec-6-3', title: '6.3 动态财务预警检测 (8项指标信号灯)', page: 35 }
    ]
  },
  {
    id: 'sec-ch7',
    title: '07 企业信用情况',
    page: 37,
    icon: Scale,
    children: [
      { id: 'sec-7-1', title: '7.1 36个月内负面信息概述', page: 37 },
      { id: 'sec-7-6', title: '7.6 行政处罚明细 (消防1万+应急2万)', page: 38 },
      { id: 'sec-7-10', title: '7.10 司法裁判与立案记录 (22起已结案)', page: 39 },
      { id: 'sec-7-11', title: '7.11 环保处罚信息', page: 51 }
    ]
  },
  {
    id: 'sec-ch8',
    title: '08 附件 (原始明细底册)',
    page: 51,
    icon: Paperclip,
    children: [
      { id: 'sec-att-1', title: '附件一：三年一期重点科目总览 (资产负债/利润表)', page: 51 },
      { id: 'sec-att-2', title: '附件二：企业经营月报总览 (48个月发票流水)', page: 53 },
      { id: 'sec-att-3', title: '附件三：月开票销售额与水电燃气运费', page: 56 },
      { id: 'sec-att-4', title: '附件四：社保信息汇总表 (三年一期汇总)', page: 57 },
      { id: 'sec-att-5', title: '附件五：月社保信息明细表', page: 59 },
      { id: 'sec-att-6', title: '附件六/七：关联企业与变更完整底册', page: 60 }
    ]
  }
];

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

  // 异步流式加载 PDF 原生文件 (带单例缓存，确保全局只请求 1 次)
  useEffect(() => {
    let isMounted = true;
    getCachedPdfDocument('/sample_report.pdf')
      .then((doc) => {
        if (isMounted) {
          setPdfDoc(doc);
        }
      })
      .catch((err) => {
        console.error('Failed to load /sample_report.pdf via pdfjs:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 对话历史记录 (仅包含用户点击特定板块的 AI 总结流，不包含全景总括)
  const [chatMessages, setChatMessages] = useState([]);

  const handleOpenAiChapter = (chapterId) => {
    setSelectedAiChapterId(chapterId);
    const insight = AI_CHAPTER_INSIGHTS[chapterId];
    if (!insight) return;
    const userPrompt = `请帮我针对【${insight.chapterNo} ${insight.title}】板块进行深度总结与关键指标提炼。`;

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

  const totalPages = 61;
  const pagesArray = Array.from({ length: totalPages }, (_, i) => i + 1);

  useEffect(() => {
    if (reportId) {
      fetchReportDetail();
    }
  }, [reportId]);

  const fetchReportDetail = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/v1/reports/${reportId}`);
      setReport(res.data || res);
    } catch (err) {
      // 缺省回退到顺捷实业高保真实时默认数据
      setReport({
        id: reportId || 'rep_mock_shunjie',
        company_name: '东莞市顺捷实业有限公司',
        credit_code: '91441900MA4W6BGB8T',
        report_no: 'RNO1881255253482991616',
        score: 702,
        risk_level: 'B+',
        content: { is_locked: false, is_public_only: false }
      });
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
      const headerOffset = 135; // 顶部全局导航(64px) + 报告状态栏(56px) + 边距偏移
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
              href="/sample_report.pdf"
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
        
        {/* 左栏：PDF 目录大纲树状导航 (Col 3, 紧凑型 Sticky 侧边栏，支持全区间关联高亮与自动随动) */}
        <aside 
          ref={sidebarNavRef}
          className="hidden lg:block lg:col-span-3 xl:col-span-3 sticky top-36 bg-white rounded-sm border border-slate-300 shadow-2xs p-3 space-y-3 max-h-[calc(100vh-160px)] overflow-y-auto scroll-smooth"
        >
          
          <div className="pb-2.5 border-b border-slate-200 flex items-center justify-between">
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

          {/* 目录项列表 */}
          <nav className="space-y-1 text-xs">
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
                      {AI_CHAPTER_INSIGHTS[item.id] && (
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

          {/* 底部展开/折叠全部 */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px] text-slate-500">
            <span>共 61 页</span>
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
            
            {/* 全景综合尽调 AI 智能总结卡片 (默认收起状态，支持展开查看全景总结与历史记录) */}
            <div className="bg-white rounded-sm border border-slate-300 shadow-2xs overflow-hidden transition-all">
              
              {/* 顶栏收起/展开控制条 */}
              <div 
                onClick={() => setIsOverallAiSummaryOpen(!isOverallAiSummaryOpen)}
                className="px-4 py-3 bg-gradient-to-r from-sky-50 via-white to-sky-50/50 hover:bg-sky-100/50 flex items-center justify-between cursor-pointer border-b border-slate-200 transition-colors"
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

              {/* 展开后的全景总结内容 (结构化提炼) */}
              {isOverallAiSummaryOpen && (
                <div className="p-5 bg-slate-50/50 space-y-4 text-xs">
                  
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
                    {OVERALL_SUMMARY.keyMetrics.map((km, idx) => (
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
                      {OVERALL_SUMMARY.keyPoints.map((kp, idx) => (
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
