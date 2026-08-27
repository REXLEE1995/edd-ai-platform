import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  QrCode, 
  Copy, 
  ExternalLink, 
  RefreshCw, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  FileText,
  Activity,
  Bot,
  Search,
  Download,
  XCircle,
  AlertTriangle,
  Layers,
  Lock,
  Building,
  Check
} from 'lucide-react';
import { message, Modal } from 'antd';
import apiClient from '../../api/client';

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
      const res = await apiClient.post(`/v1/tasks/${taskId}/authorize`);
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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5 mr-1 text-amber-700 animate-spin" /> 等待法人扫码授权
        </span>
      );
    }
    if (status === 'pulling_data' || status === 'ai_analyzing') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">
          <Sparkles className="w-3.5 h-3.5 mr-1 text-sky-700 animate-spin" /> 数据清洗与 AI 研判中...
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-teal-50 text-teal-800 border border-teal-300">
        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-teal-700" /> 已生成并存入历史
      </span>
    );
  };

  const getRiskBadge = (level, score) => {
    if (level === 'green') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-teal-50 text-teal-800 border border-teal-300">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-teal-700" /> 高信用评分 ({score}分 · 仅供参考)
        </span>
      );
    }
    if (level === 'yellow') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-amber-700" /> 中等/一般信用 ({score}分 · 仅供参考)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-xs text-xs font-bold bg-rose-50 text-rose-800 border border-rose-300">
        <XCircle className="w-3.5 h-3.5 mr-1 text-rose-700" /> 预警关注 ({score}分 · 仅供参考)
      </span>
    );
  };

  // 仅在「进行中的任务」列表中展示未完成的任务
  const activeTasks = tasks.filter(t => t.status !== 'completed');

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-slate-800">
      
      {/* 头部标题与操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-sky-700" />
            尽调任务与报告资产中心
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            一站式管理：实时处理进行中的尽调授权，随时调阅历史全量尽调报告与存证底稿
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => {
              if (activeTab === 'tasks') fetchTasks();
              else fetchReports();
            }}
            className="px-3.5 py-1.5 rounded-sm bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            刷新
          </button>

          <Link
            to="/app"
            className="px-4 py-1.5 rounded-sm bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors shadow-2xs flex items-center gap-1"
          >
            <span>发起新尽调</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* 2 大合并 Tab 导航条 */}
      <div className="mt-6 flex border-b border-slate-300 space-x-2 sm:space-x-4">
        <button
          onClick={() => switchTab('tasks')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'tasks'
              ? 'border-sky-700 text-sky-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Activity className={`w-4 h-4 ${activeTab === 'tasks' ? 'text-sky-700' : 'text-slate-400'}`} />
          <span>进行中的尽调任务</span>
          {activeTasks.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 font-mono">
              {activeTasks.length}
            </span>
          )}
        </button>

        <button
          onClick={() => switchTab('reports')}
          className={`pb-3 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'reports'
              ? 'border-sky-700 text-sky-900 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FileText className={`w-4 h-4 ${activeTab === 'reports' ? 'text-sky-700' : 'text-slate-400'}`} />
          <span>历史尽调报告资产库 ({reports.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 仅展示进行中的尽调任务 (无思考流日志，完成后自动归入历史) */}
      {/* ========================================================================= */}
      {activeTab === 'tasks' && (
        <div className="mt-6 space-y-4">
          {loadingTasks ? (
            <div className="text-center py-16 text-slate-400 text-sm">正在加载进行中的尽调任务...</div>
          ) : activeTasks.length === 0 ? (
            <div className="bg-white rounded-sm p-12 text-center border border-slate-300 shadow-2xs space-y-3">
              <CheckCircle2 className="w-12 h-12 text-teal-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">当前暂无进行中的尽调任务</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                所有已生成的尽调报告均已自动归档至【历史尽调报告资产库】中，可随时调阅或导出。
              </p>
              <div className="pt-3 flex items-center justify-center gap-3">
                <button
                  onClick={() => switchTab('reports')}
                  className="px-4 py-2 rounded-sm bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 font-bold text-xs transition-colors shadow-2xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-sky-700" />
                  查看历史尽调报告 ({reports.length} 份)
                </button>
                <Link 
                  to="/app" 
                  className="inline-flex items-center px-4 py-2 rounded-sm bg-sky-700 hover:bg-sky-800 text-white font-semibold text-xs transition-colors shadow-2xs"
                >
                  发起新企业尽调
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              </div>
            </div>
          ) : (
            activeTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-sm p-6 border border-slate-300 shadow-2xs space-y-4">
                
                {/* 头部企业与状态栏 */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-extrabold text-slate-900">{task.company_name}</h3>
                      {getStatusBadge(task.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 font-mono">
                      <span>任务编号: <strong className="text-slate-700">{task.task_no}</strong></span>
                      <span>统一代码: <strong className="text-slate-700">{task.credit_code}</strong></span>
                      <span>尽调类型: <strong className="text-slate-700">企业全量授权尽调</strong></span>
                      <span>创建时间: {task.created_at}</span>
                    </div>
                  </div>

                  {/* 快捷操作 */}
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === 'waiting_auth' && (
                      <button
                        onClick={() => setSelectedTaskForAuth(task)}
                        className="px-3.5 py-1.5 rounded-sm bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                      >
                        <QrCode className="w-3.5 h-3.5 text-amber-700" />
                        扫码授权协同
                      </button>
                    )}
                  </div>
                </div>

                {/* 金税等待授权提示条 */}
                {task.status === 'waiting_auth' && (
                  <div className="p-4 rounded-sm bg-amber-50/80 border border-amber-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950">
                    <div className="flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>企业法人金税授权待签署。请将授权二维码发送给企业法人或进行模拟授权。</span>
                    </div>
                    <button 
                      onClick={() => handleSimulateAuth(task.id)}
                      className="px-3 py-1 rounded-sm bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors shadow-2xs self-start sm:self-auto"
                    >
                      ⚡ 一键模拟法人扫码授权
                    </button>
                  </div>
                )}

                {/* 进行中状态提示条 */}
                {(task.status === 'pulling_data' || task.status === 'ai_analyzing') && (
                  <div className="p-4 rounded-sm bg-sky-50/80 border border-sky-300 flex items-center justify-between text-xs text-sky-950">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-700 shrink-0 animate-spin" />
                      <span>正在调用享宇数据中台聚合工商主体、司法合规、金税发票与生产三费数据，并执行 AI 深度量化研判，完成后将自动移入【历史尽调报告资产库】...</span>
                    </div>
                    <span className="text-sky-800 font-mono font-bold animate-pulse">处理中</span>
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
          <div className="bg-white rounded-sm p-3.5 border border-slate-300 shadow-2xs">
            <form onSubmit={(e) => { e.preventDefault(); fetchReports(); }} className="flex items-center w-full bg-slate-50 rounded-sm px-3.5 py-2 border border-slate-300 focus-within:border-sky-600 focus-within:bg-white transition-colors">
              <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={reportKeyword}
                onChange={(e) => setReportKeyword(e.target.value)}
                placeholder="搜索企业名称或统一社会信用代码..."
                className="w-full bg-transparent border-0 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              {reportKeyword && (
                <button
                  type="button"
                  onClick={() => { setReportKeyword(''); }}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer font-mono mr-2"
                >
                  清空
                </button>
              )}
              <button
                type="submit"
                className="px-3.5 py-1 rounded-xs bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer"
              >
                检索
              </button>
            </form>
          </div>

          {/* 报告卡片列表 */}
          <div className="space-y-3">
            {loadingReports ? (
              <div className="text-center py-16 text-slate-400 text-sm">正在加载报告资产库...</div>
            ) : reports.length === 0 ? (
              <div className="bg-white rounded-sm p-12 text-center border border-slate-300 shadow-2xs">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700">未找到匹配的尽调报告</h3>
                <p className="text-xs text-slate-400 mt-1">请尝试修改筛选条件或发起新的企业尽调</p>
              </div>
            ) : (
              reports.map((rpt) => (
                <div
                  key={rpt.id}
                  className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs hover:border-sky-600 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold text-slate-900">{rpt.company_name}</h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-mono">
                      <span>统一代码: <strong className="text-slate-700">{rpt.credit_code}</strong></span>
                      <span className="text-slate-300">|</span>
                      <span>出具时间: <span className="text-slate-600">{rpt.created_at}</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    <Link
                      to={`/app/reports/${rpt.id}`}
                      className="px-4 py-2 rounded-sm bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                    >
                      <span>查看全景报告</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                    <a
                      href="/sample_report.pdf"
                      download={`${rpt.company_name || '企业尽调报告'}.pdf`}
                      className="p-2 rounded-sm bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
                      title="下载 PDF 原件"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>

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
            企业金税发票与财税申报授权通道
          </div>
        }
        width={480}
      >
        {selectedTaskForAuth && (
          <div className="py-4 text-center space-y-4 text-slate-800">
            <p className="text-xs text-slate-600">
              请使用企业法定代表人微信扫描下方二维码完成实名认证与金税授权：
            </p>

            <div className="inline-block p-3 bg-white border border-slate-300 rounded-sm shadow-2xs">
              <img 
                src={selectedTaskForAuth.auth_qrcode_url} 
                alt="企业金税授权二维码"
                className="w-48 h-48 mx-auto" 
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-sm border border-slate-200 text-xs text-slate-700 font-mono space-y-1 text-left">
              <div>授权企业: <strong>{selectedTaskForAuth.company_name}</strong></div>
              <div>统一代码: <span>{selectedTaskForAuth.credit_code}</span></div>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedTaskForAuth.auth_link);
                  message.success('授权链接已复制！');
                }}
                className="px-4 py-2 rounded-sm bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
              >
                复制授权链接
              </button>

              <button
                onClick={() => handleSimulateAuth(selectedTaskForAuth.id)}
                className="px-4 py-2 rounded-sm bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold transition-colors shadow-2xs"
              >
                模拟法人一键授权通过
              </button>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
