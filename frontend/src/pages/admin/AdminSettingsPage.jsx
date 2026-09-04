import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  KeyRound, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sliders, 
  Activity,
  Server,
  Zap,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // 接口返回的真实配置状态
  const [settings, setSettings] = useState({
    llm_provider: 'newapi',
    new_api_base_url: 'http://192.168.110.234:3000/v1',
    new_api_key_masked: 'sk-••••••••••••••••',
    has_key: true,
    new_api_model: 'xyzp-ai',
    temperature: 0.3,
    timeout_seconds: 60,
    is_enabled: true,
  });

  // 测试诊断结果
  const [testResult, setTestResult] = useState(null);

  // 获取当前后端大模型配置信息
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/settings/ai');
      const d = res?.data || res;
      if (d) {
        setSettings({
          llm_provider: d.llm_provider || 'newapi',
          new_api_base_url: d.new_api_base_url || 'http://127.0.0.1:3000/v1',
          new_api_key_masked: d.new_api_key_masked || '',
          has_key: d.has_key ?? false,
          new_api_model: d.new_api_model || 'deepseek-chat',
          temperature: d.temperature ?? 0.3,
          timeout_seconds: d.timeout_seconds ?? 60,
          is_enabled: d.is_enabled ?? true,
        });

        if (d.last_test_status) {
          setTestResult({
            success: d.last_test_status === 'success',
            latency_ms: d.last_test_latency_ms,
            reply: d.last_test_msg,
            tested_at: d.last_test_at
          });
        }
      }
    } catch (err) {
      console.error('获取 AI 配置失败:', err);
      message.error('获取系统 AI 配置失败，请检查后端运行状态');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // 测试连通性
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await apiClient.post('/admin/settings/ai/test', {});
      const data = res?.data || res;
      
      const isSuccess = Boolean(data?.success);
      const latency = data?.latency_ms || 0;
      const errorDetail = data?.error ? (typeof data.error === 'object' ? JSON.stringify(data.error) : String(data.error)) : '';
      const replyDetail = data?.reply ? String(data.reply) : '';

      const nowStr = new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).replace(/\//g, '-');

      if (isSuccess) {
        message.success(`连通性测试通过！响应耗时: ${latency} ms`);
        setTestResult({
          success: true,
          latency_ms: latency,
          reply: replyDetail || '连通测试成功，模型响应正常',
          model: data?.model || settings.new_api_model,
          tested_at: nowStr
        });
      } else {
        message.error(`连通测试未通过: ${errorDetail || res?.message || '连接失败'}`);
        setTestResult({
          success: false,
          latency_ms: latency,
          error: errorDetail || res?.message || '连接被拒绝或模型未授权',
          model: data?.model || settings.new_api_model,
          tested_at: nowStr
        });
      }
    } catch (err) {
      console.error('测试异常:', err);
      const errMsg = err.response?.data?.message || err.response?.data?.detail || err.message || '测试请求发送失败';
      message.error(`连通测试失败: ${errMsg}`);
      setTestResult({
        success: false,
        latency_ms: 0,
        error: errMsg,
        tested_at: new Date().toLocaleTimeString()
      });
    } finally {
      setTesting(false);
    }
  };

  const getProviderName = (p) => {
    if (p === 'newapi') return 'New-API 网关';
    if (p === 'deepseek') return 'DeepSeek 官方';
    if (p === 'openai') return 'OpenAI 兼容';
    return p || '标准 API 网关';
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-900">
      {/* 主体工作区 */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* 页面标题与操作条 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-950 tracking-tight">
                AI 大模型引擎与网关信息
              </h1>
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                settings.is_enabled 
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                  : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${settings.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></span>
                {settings.is_enabled ? '接口实时调用中' : '已暂停调用'}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              当前后端服务调用的 AI 大模型配置、接口端点与实时连通诊断状态（直接展示）
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || loading}
              className="shadcn-button-primary text-xs py-2 px-4 flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
              <span>{testing ? '正在诊断连通性...' : '⚡ 测试连通性'}</span>
            </button>
          </div>
        </div>

        {/* 核心信息卡片 */}
        <div className="grid grid-cols-1 gap-6">
          
          {/* 大模型基本信息与端点参数 */}
          <div className="shadcn-card bg-white p-6 border border-zinc-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0096DB]" />
                <span>当前调用大模型参数</span>
              </h2>
              <span className="text-[11px] font-mono text-zinc-400">
                后端服务实时同步
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* 模型名称 */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#0096DB]" />
                  <span>调用模型名称 (Model)</span>
                </div>
                <div className="text-sm font-bold font-mono text-slate-950 pt-0.5">
                  {settings.new_api_model || 'xyzp-ai'}
                </div>
              </div>

              {/* 服务提供商 */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#0096DB]" />
                  <span>服务提供商 (Provider)</span>
                </div>
                <div className="text-sm font-bold text-slate-950 pt-0.5">
                  {getProviderName(settings.llm_provider)}
                </div>
              </div>

              {/* 令牌状态 */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>API Key 令牌凭证</span>
                </div>
                <div className="text-xs font-mono font-semibold text-slate-800 pt-1 flex items-center justify-between">
                  <span>{settings.new_api_key_masked || 'sk-••••••••••••••••'}</span>
                  {settings.has_key && (
                    <span className="text-[10px] bg-emerald-100/80 text-emerald-800 font-sans font-semibold px-1.5 py-0.2 rounded">
                      已配置
                    </span>
                  )}
                </div>
              </div>

              {/* API Base URL */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1 sm:col-span-2">
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-[#0096DB]" />
                  <span>AI 服务端点 URL (Base URL)</span>
                </div>
                <div className="text-xs font-mono text-slate-900 font-semibold select-all pt-0.5 break-all">
                  {settings.new_api_base_url || 'http://127.0.0.1:3000/v1'}
                </div>
              </div>

              {/* 推理参数 */}
              <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <div className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-[#0096DB]" />
                  <span>推理参数配置</span>
                </div>
                <div className="text-xs text-slate-800 font-medium pt-1 flex items-center gap-3">
                  <span>温度: <strong className="font-mono text-[#0096DB]">{settings.temperature}</strong></span>
                  <span className="text-zinc-300">|</span>
                  <span>超时: <strong className="font-mono text-slate-900">{settings.timeout_seconds}s</strong></span>
                </div>
              </div>

            </div>
          </div>

          {/* 连通性诊断与响应探针 */}
          <div className="shadcn-card bg-white p-6 border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0096DB]" />
                <span>大模型连通性与响应探针诊断</span>
              </h2>
              {testResult?.tested_at && (
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>诊断时间: {testResult.tested_at}</span>
                </span>
              )}
            </div>

            {testResult ? (
              <div className={`p-4 rounded-xl border space-y-3 ${
                testResult.success 
                  ? 'bg-emerald-50/60 border-emerald-200' 
                  : 'bg-rose-50/60 border-rose-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold flex items-center gap-2 text-slate-950">
                    {testResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-rose-600" />
                    )}
                    <span>{testResult.success ? '网关与模型连通正常' : '连通异常 / 模型未响应'}</span>
                  </span>
                  {testResult.latency_ms > 0 && (
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-white px-2.5 py-1 rounded border border-emerald-200/80 shadow-2xs">
                      {testResult.latency_ms} ms
                    </span>
                  )}
                </div>

                {testResult.success ? (
                  <div className="text-xs text-zinc-700 bg-white/90 p-3 rounded-lg border border-emerald-100 space-y-1">
                    <span className="text-[11px] text-zinc-400 block font-medium">模型响应探针返回:</span>
                    <p className="font-mono text-slate-900 leading-relaxed break-words">{testResult.reply || '正常回应'}</p>
                  </div>
                ) : (
                  <div className="text-xs text-rose-700 bg-white/90 p-3 rounded-lg border border-rose-100 space-y-1">
                    <span className="text-[11px] text-rose-400 block font-medium">错误信息:</span>
                    <p className="font-mono text-rose-800 break-words leading-relaxed">{testResult.error || '连接被拒绝或模型未响应，请点击右上角「⚡ 测试连通性」重新诊断'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                <Activity className="w-6 h-6 text-zinc-300 mx-auto" />
                <p className="text-xs text-zinc-500">点击右上角「⚡ 测试连通性」可即时向后端大模型发送探测请求并展示实时延迟与状态</p>
              </div>
            )}
          </div>

        </div>

      </main>
    </div>
  );
}
