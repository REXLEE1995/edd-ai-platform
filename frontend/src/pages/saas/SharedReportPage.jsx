import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  KeyRound, 
  ShieldCheck, 
  Clock, 
  AlertTriangle, 
  Download, 
  Bookmark, 
  Search, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Ban, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  Lock,
  ArrowRight,
  RefreshCw,
  Eye,
  Bot
} from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.js?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import reportShunjieData from '../../mock/report_shunjie_preloan.json';
import reportHangzhouData from '../../mock/report_hangzhou_preloan.json';

// Canvas 逐页流式渲染单页
function SharedPdfCanvasPage({ pdfDoc, pageNum }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [rendered, setRendered] = useState(false);
  const [loading, setLoading] = useState(true);

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

        const transform = outputScale !== 1 
          ? [outputScale, 0, 0, outputScale, 0, 0] 
          : null;

        const renderContext = {
          canvasContext: ctx,
          transform: transform,
          viewport: viewport
        };

        await page.render(renderContext).promise;

        if (isMounted) {
          setRendered(true);
          setLoading(false);
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Page ${pageNum} render failed:`, err);
        }
      }
    }

    return () => {
      isMounted = false;
      observer.disconnect();
    };
  }, [pdfDoc, pageNum, rendered]);

  return (
    <div 
      ref={containerRef}
      id={`shared-page-${pageNum}`}
      className="bg-white rounded-xl shadow-xs overflow-hidden transition-all duration-200 border border-slate-200/80 relative"
    >
      <div className="w-full relative min-h-[400px] flex items-center justify-center bg-slate-100/50">
        {loading && !rendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-50/80 z-10">
            <RefreshCw className="w-5 h-5 text-slate-700 animate-spin" />
            <span className="text-xs text-zinc-400 font-mono">加载第 {pageNum} 页矢量图层...</span>
          </div>
        )}
        <canvas ref={canvasRef} className="block w-full h-auto bg-white" />
      </div>
    </div>
  );
}

export default function SharedReportPage() {
  const { shareCode } = useParams();
  
  // 状态管理
  const [initLoading, setInitLoading] = useState(true);
  const [shareInfo, setShareInfo] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 解锁后的报告数据
  const [report, setReport] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [summaryExpanded, setSummaryExpanded] = useState(true);

  // 1. 初始化拉取分享卡片前置信息
  useEffect(() => {
    fetchSharePublicInfo();
  }, [shareCode]);

  const fetchSharePublicInfo = async () => {
    setInitLoading(true);
    setErrorMsg('');
    try {
      const res = await apiClient.get(`/v1/shares/info/${shareCode}`);
      setShareInfo(res.data);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || '分享链接不存在或已失效');
    } finally {
      setInitLoading(false);
    }
  };

  // 2. 提交 6 位密码校验并解锁
  const handleVerifyPassword = async (e) => {
    if (e) e.preventDefault();
    const pin = accessCode.trim();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      message.error('请输入完整的 6 位数字访问密码');
      return;
    }

    setVerifying(true);
    setErrorMsg('');
    try {
      const res = await apiClient.post('/v1/shares/verify', {
        share_code: shareCode,
        access_code: pin
      });

      message.success('密码校验通过！正在加载报告内容...');
      setReport(res.data.report);
      if (res.data.share_info) {
        setShareInfo(res.data.share_info);
      }
      setUnlocked(true);

      // 加载 PDF
      const pdfUrl = res.data.report.pdf_url || '/reports/shunjie_preloan.pdf';
      loadPdfDocument(pdfUrl);

      // 默认展开所有章节
      const isHangzhou = (res.data.report?.id || '').includes('hangzhou');
      const catalog = (isHangzhou ? reportHangzhouData.toc_catalog : reportShunjieData.toc_catalog) || [];
      const initialExpanded = {};
      catalog.forEach((sec, idx) => {
        initialExpanded[idx] = true;
      });
      setExpandedSections(initialExpanded);

    } catch (err) {
      const detail = err.response?.data?.detail || '密码验证失败，请重试';
      setErrorMsg(detail);
      message.error(detail);
    } finally {
      setVerifying(false);
    }
  };

  const loadPdfDocument = async (url) => {
    try {
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });
      const doc = await loadingTask.promise;
      setPdfDoc(doc);
      setTotalPages(doc.numPages);
    } catch (err) {
      console.warn("加载远程 PDF 失败，使用备用 PDF:", err);
      try {
        const fallbackDoc = await pdfjsLib.getDocument('/sample_report.pdf').promise;
        setPdfDoc(fallbackDoc);
        setTotalPages(fallbackDoc.numPages);
      } catch (e) {
        console.error("Fallback PDF also failed:", e);
      }
    }
  };

  const scrollToPage = (pageNum) => {
    const el = document.getElementById(`shared-page-${pageNum}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const isHangzhou = (report?.id || '').includes('hangzhou');
  const catalogTree = (isHangzhou ? reportHangzhouData.toc_catalog : reportShunjieData.toc_catalog) || [];

  const filteredCatalog = catalogTree.filter(sec => {
    if (!catalogQuery) return true;
    const q = catalogQuery.toLowerCase();
    const itemsMatch = (sec.children || []).some(sub => (sub.title || '').toLowerCase().includes(q));
    return titleMatch || itemsMatch;
  });

  // =========================================================================
  // 页面渲染分支
  // =========================================================================

  // 1. 初始化加载中
  if (initLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] relative flex items-center justify-center text-slate-800">
        <div className="text-center space-y-3 relative z-10">
          <RefreshCw className="w-8 h-8 text-[#0096DB] animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-mono">正在检索加密分享存证通道...</p>
        </div>
      </div>
    );
  }

  // 2. 分享链接失效 / 已过期 / 已撤销
  if (errorMsg && !unlocked && !shareInfo) {
    return (
      <div className="min-h-screen bg-[#f8fafc] relative flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/80 backdrop-blur-xl rounded-2xl p-8 border border-white/90 shadow-glass text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100/80 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-950">分享链接不存在或已失效</h2>
            <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
          </div>
          <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/80 text-xs text-slate-600 text-left space-y-1">
            <p>• 该分享链接已超过发起人设定的有效期限或已被撤销关闭。</p>
            <p>• 如需查阅，请联系发起人重新生成有效分享链接。</p>
          </div>
          <Link
            to="/"
            className="shadcn-button-primary text-xs py-2.5 px-6 inline-block w-full"
          >
            返回平台首页
          </Link>
        </div>
      </div>
    );
  }

  // 3. 锁定状态：展示 6 位访问密码解锁卡片
  if (!unlocked) {
    const isExpired = shareInfo?.is_expired || shareInfo?.status === 'expired';
    const isRevoked = shareInfo?.status === 'revoked';

    return (
      <div className="min-h-screen bg-[#f8fafc] relative flex flex-col justify-between overflow-hidden">
        
        {/* Ambient Light Orbs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute -top-32 right-10 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/35 to-sky-200/25 rounded-full blur-[100px]" />
          <div className="absolute top-1/3 -left-32 w-[450px] h-[450px] bg-gradient-to-tr from-sky-100/30 to-blue-100/20 rounded-full blur-[90px]" />
          <div className="absolute -bottom-32 right-1/3 w-[500px] h-[500px] bg-gradient-to-t from-slate-200/25 to-blue-100/30 rounded-full blur-[100px]" />
        </div>

        {/* 顶部简易 Navbar */}
        <header className="relative z-10 px-6 py-4 flex items-center justify-between border-b border-white/60 bg-white/70 backdrop-blur-xl shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-white p-0.5 border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden">
              <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm text-slate-900 tracking-tight">享宇AI智评</span>
          </div>
          <span className="text-xs text-[#0084c2] bg-cyan-50/80 px-2.5 py-0.5 rounded-md border border-cyan-200/60 font-mono backdrop-blur-sm">
            加密分享查阅通道
          </span>
        </header>

        {/* 密码验证核心卡片 */}
        <main className="relative z-10 max-w-md w-full mx-auto px-4 py-8">
          <div className="bg-white/80 backdrop-blur-2xl rounded-xl p-8 border border-white/90 shadow-[0_20px_60px_-15px_rgba(0,150,219,0.12)] space-y-6">
            
            {/* 卡片头部 */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-lg bg-[#0096DB] text-white flex items-center justify-center mx-auto shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-slate-950">输入 6 位访问密码查阅报告</h2>
              <p className="text-xs text-slate-500">
                本报告受商业机密及金融合规加密保护，需凭发起人提供的 6 位访问密码解锁
              </p>
            </div>

            {/* 目标企业摘要信息 */}
            <div className="p-4 bg-cyan-50/40 backdrop-blur-md rounded-lg border border-cyan-100/70 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">目标尽调主体:</span>
                <strong className="text-slate-950 font-semibold">{shareInfo?.company_name}</strong>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500">统一信用代码:</span>
                <span className="text-slate-800">{shareInfo?.credit_code}</span>
              </div>
              <div className="pt-2 border-t border-cyan-100/60 flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#0096DB]" />
                  <span>分享有效期限:</span>
                </span>
                {isExpired ? (
                  <span className="text-rose-600 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> 分享链接已失效
                  </span>
                ) : (
                  <span className="text-[#0084c2] font-medium font-mono">
                    {shareInfo?.expires_in_text || (shareInfo?.expire_at ? `至 ${shareInfo?.expire_at}` : '永久有效 (不过期)')}
                  </span>
                )}
              </div>
            </div>

            {isExpired ? (
              <div className="p-4 bg-rose-50/80 backdrop-blur-sm border border-rose-200 rounded-lg text-center space-y-2 text-rose-900 text-xs">
                <p className="font-bold">⚠️ 该分享链接已超过有效期限</p>
                <p className="text-[11px] text-rose-700">根据发起人设定的有效期，分享链接已自动失效注销，无法解锁。</p>
              </div>
            ) : isRevoked ? (
              <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200 rounded-lg text-center space-y-2 text-amber-900 text-xs">
                <p className="font-bold">⚠️ 发起人已暂停关闭此分享</p>
                <p className="text-[11px] text-amber-700">如需查阅，请联系发起人重新生成有效分享链接。</p>
              </div>
            ) : (
              /* 6 位数字输入表单 */
              <form onSubmit={handleVerifyPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 block text-center">
                    请输入 6 位纯数字访问密码 (PIN)
                  </label>
                  <input
                    type="password"
                    maxLength={6}
                    autoFocus
                    value={accessCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setAccessCode(val);
                      setErrorMsg('');
                    }}
                    placeholder="••••••"
                    className="w-full text-center text-2xl tracking-[0.4em] font-mono font-bold py-3.5 px-4 rounded-md bg-white/90 border border-slate-200/90 focus:bg-white focus:border-[#0096DB] focus:ring-4 focus:ring-[#0096DB]/15 transition-all text-slate-950 placeholder:text-slate-300 shadow-xs"
                  />
                </div>

                {errorMsg && (
                  <p className="text-xs text-rose-600 font-medium text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{errorMsg}</span>
                  </p>
                )}

                <button
                  type="submit"
                  disabled={verifying || accessCode.length !== 6}
                  className="shadcn-button-primary text-sm py-3 px-4 w-full flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {verifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>正在验证加密存证...</span>
                    </>
                  ) : (
                    <>
                      <span>解锁并查阅尽调报告</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center text-[11px] text-slate-400 font-mono">
              享宇AI智评 · 企业信用深度尽调合规存证系统
            </div>

          </div>
        </main>

        <footer className="relative z-10 py-4 text-center text-xs text-slate-400">
          © 2026 享宇AI智评. All rights reserved.
        </footer>

      </div>
    );
  }

  // =========================================================================
  // 4. 已解锁状态：进入受控的全景报告阅读器
  // =========================================================================
  const targetPdfUrl = report?.pdf_url || '/reports/shunjie_preloan.pdf';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans pb-16 relative">
      
      {/* 顶部安全加密查阅横幅 */}
      <div className="bg-[#0096DB] text-white px-4 py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#0084c2] shadow-xs">
        <div className="flex items-center gap-2 flex-wrap">
          <ShieldCheck className="w-4 h-4 text-white shrink-0" />
          <span className="font-medium">您正在加密查阅企业尽调报告：<strong>{report?.company_name}</strong></span>
          <span className="text-white/80">（统一代码: {report?.credit_code}）</span>
        </div>

        <div className="flex items-center gap-3 text-white/90 font-mono">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-white" />
            <span>分享有效期限: <strong>{shareInfo?.expires_in_text || (shareInfo?.expire_at ? `至 ${shareInfo?.expire_at}` : '永久有效')}</strong></span>
          </span>
        </div>
      </div>

      {/* 顶部二级导航 */}
      <header className="sticky top-0 z-40 border-b border-white/70 bg-white/70 backdrop-blur-xl shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-md bg-white/80 p-0.5 border border-white/80 shadow-xs flex items-center justify-center overflow-hidden backdrop-blur-md">
              <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg text-slate-950 tracking-tight truncate">
                {report?.company_name}
              </h1>
              <p className="text-xs text-slate-500 font-mono">
                信用评分: <strong className="text-[#0ea5e9] font-bold">{report?.score}分</strong> · 建议授信: {report?.suggested_quota_min}~{report?.suggested_quota_max} 万元
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={targetPdfUrl}
              download={`${report?.company_name}_企业尽调报告.pdf`}
              className="shadcn-button-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>下载 PDF 原件</span>
            </a>
          </div>
        </div>
      </header>

      {/* 核心工作台内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* 左侧：报告大纲侧边栏 (Col 3) */}
        <aside className="hidden lg:flex lg:flex-col lg:col-span-3 sticky top-[115px] bg-white/75 backdrop-blur-xl rounded-2xl border border-white/80 shadow-glass p-3.5 h-[calc(100vh-135px)] z-20">
          <div className="shrink-0 space-y-2.5 pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <span>报告大纲</span>
            </h3>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="搜索章节..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white/70 backdrop-blur-md border border-slate-200/80 focus:bg-white/90 focus:border-[#0ea5e9] focus:outline-none"
              />
            </div>
          </div>

          {/* 目录列表 */}
          <div className="flex-1 overflow-y-auto pt-2 space-y-1 pr-1">
            {filteredCatalog.map((sec, idx) => {
              const isExpanded = expandedSections[idx];
              return (
                <div key={sec.id || idx} className="space-y-0.5">
                  <div
                    onClick={() => scrollToPage(sec.start_page || 1)}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-800 hover:bg-cyan-50/70 hover:text-[#0ea5e9] cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {sec.children?.length > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));
                          }}
                          className="text-slate-400 hover:text-[#0ea5e9]"
                        >
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      )}
                      <span className="truncate">{sec.title}</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 shrink-0">P.{sec.start_page || 1}</span>
                  </div>

                  {isExpanded && sec.children?.map((sub, sIdx) => (
                    <div
                      key={sub.id || sIdx}
                      onClick={() => scrollToPage(sub.page)}
                      className="ml-5 px-2 py-1 rounded-md text-xs text-slate-600 hover:text-[#0ea5e9] hover:bg-cyan-50/50 cursor-pointer flex items-center justify-between"
                    >
                      <span className="truncate">{sub.title}</span>
                      <span className="text-[10px] font-mono text-slate-400">P.{sub.page}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          <div className="shrink-0 pt-2 border-t border-slate-100 text-xs text-slate-400 font-mono flex items-center justify-between">
            <span>共 {totalPages || 61} 页</span>
            <span className="text-[#0ea5e9] font-semibold">加密查阅模式</span>
          </div>
        </aside>

        {/* 右侧：AI 深度研判总结 + 高保真 PDF Canvas (Col 9) */}
        <main className="col-span-1 lg:col-span-9 space-y-4">
          
          {/* AI 全景深度研判总结卡片 */}
          <div className="shadcn-card bg-white/75 backdrop-blur-xl border border-white/80 shadow-glass overflow-hidden rounded-2xl">
            <div 
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="p-4 bg-cyan-50/40 backdrop-blur-md border-b border-cyan-100/70 flex items-center justify-between cursor-pointer hover:bg-cyan-50/60 transition-colors"
            >
              <div className="flex items-center gap-2 font-bold text-sm text-slate-950">
                <Sparkles className="w-4 h-4 text-[#0ea5e9]" />
                <span>享宇AI智评 · 全景综合尽调 AI 智能研判综述</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span>{summaryExpanded ? '收起总结' : '展开总结'}</span>
                {summaryExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </div>
            </div>

            {summaryExpanded && (
              <div className="p-5 space-y-4 text-xs text-slate-800 leading-relaxed">
                
                {/* 评分与授信量化指标条 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-white/70 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">综合量化评分</span>
                    <strong className="text-lg font-bold font-mono text-[#0096DB]">{report?.score || 88} 分</strong>
                  </div>
                  <div className="p-3.5 bg-white/70 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">建议授信区间</span>
                    <strong className="text-lg font-bold font-mono text-slate-900">{report?.suggested_quota_min || 300}~{report?.suggested_quota_max || 500} 万</strong>
                  </div>
                  <div className="p-3.5 bg-white/70 backdrop-blur-md rounded-xl border border-slate-200/80 shadow-2xs">
                    <span className="text-slate-500 block text-[11px]">风控准入评级</span>
                    <strong className="text-base font-bold text-[#0096DB]">建议准入 (低风险)</strong>
                  </div>
                </div>

                {/* 核心研判要点 */}
                <div className="p-4 bg-slate-50/70 backdrop-blur-md rounded-xl border border-slate-200/70 space-y-2 shadow-2xs">
                  <h4 className="font-bold text-slate-950 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-[#0096DB]" />
                    <span>核心研判要点综述:</span>
                  </h4>
                  <p className="text-slate-700">
                    目标企业【{report?.company_name}】工商主体依法存续，实缴出资到位率高，无严重经营异常。近 24 个月金税增值税申报及开票流水稳健，开票集中度适中，未发生断票或突增异动。全网司法与失信被执行人排查未见执行限制或重大涉诉红线，整体信用表现良好。
                  </p>
                </div>

              </div>
            )}
          </div>

          {/* PDF 逐页高保真矢量渲染画布流 */}
          <div className="space-y-4">
            {Array.from({ length: totalPages || 61 }, (_, i) => i + 1).map((pageNum) => (
              <SharedPdfCanvasPage
                key={pageNum}
                pdfDoc={pdfDoc}
                pageNum={pageNum}
              />
            ))}
          </div>

        </main>

      </div>

    </div>
  );
}
