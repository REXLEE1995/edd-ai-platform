import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  KeyRound, 
  Globe, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink, 
  Save, 
  Zap, 
  Eye, 
  EyeOff, 
  Sliders, 
  Activity,
  Layers,
  Server
} from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // 表单状态
  const [provider, setProvider] = useState('newapi');
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:3000/v1');
  const [apiKey, setApiKey] = useState('');
  const [hasKey, setHasKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [temperature, setTemperature] = useState(0.3);
  const [timeoutSeconds, setTimeoutSeconds] = useState(60);
  const [isEnabled, setIsEnabled] = useState(true);

  // 测试诊断结果
  const [testResult, setTestResult] = useState(null);

  // 获取当前配置
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/settings/ai');
      const d = res?.data || res;
      if (d) {
        setProvider(d.llm_provider || 'newapi');
        setBaseUrl(d.new_api_base_url || 'http://127.0.0.1:3000/v1');
        setMaskedKey(d.new_api_key_masked || '');
        setApiKey(d.new_api_key_masked || '');
        setHasKey(d.has_key || false);
        setModel(d.new_api_model || 'deepseek-chat');
        setTemperature(d.temperature ?? 0.3);
        setTimeoutSeconds(d.timeout_seconds ?? 60);
        setIsEnabled(d.is_enabled ?? true);

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

  // 快捷设置预置参数
  const applyPreset = (presetType) => {
    if (presetType === 'newapi_local') {
      setProvider('newapi');
      setBaseUrl('http://127.0.0.1:3000/v1');
      setModel('deepseek-chat');
      message.info('已应用【本地 New-API Token池网关】配置预设');
    } else if (presetType === 'deepseek_official') {
      setProvider('deepseek');
      setBaseUrl('https://api.deepseek.com/v1');
      setModel('deepseek-chat');
      message.info('已应用【DeepSeek 官方 API】配置预设');
    } else if (presetType === 'openai_official') {
      setProvider('openai');
      setBaseUrl('https://api.openai.com/v1');
      setModel('gpt-4o-mini');
      message.info('已应用【OpenAI 官方 API】配置预设');
    }
  };

  // 保存配置
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!baseUrl.trim()) {
      message.warning('请填写 API 基础端点 URL');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        llm_provider: provider,
        new_api_base_url: baseUrl.trim(),
        new_api_key: apiKey,
        new_api_model: model.trim(),
        temperature: parseFloat(temperature),
        timeout_seconds: parseInt(timeoutSeconds, 10),
        is_enabled: isEnabled
      };

      const res = await apiClient.post('/admin/settings/ai', payload);
      const resData = res?.data || res;
      if (res?.code === 0 || resData?.llm_provider) {
        message.success('AI 网关与 Token 配置已成功更新并生效！');
        if (resData?.new_api_key_masked) {
          setMaskedKey(resData.new_api_key_masked);
          setApiKey(resData.new_api_key_masked);
          setHasKey(resData.has_key);
        }
      } else {
        message.error(res?.message || '保存失败');
      }
    } catch (err) {
      console.error('保存失败:', err);
      message.error('保存配置失败，请检查网络或权限');
    } finally {
      setSaving(false);
    }
  };

  // 测试连通性
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const payload = {
        base_url: baseUrl.trim(),
        api_key: apiKey,
        model: model.trim(),
        provider: provider
      };

      const res = await apiClient.post('/admin/settings/ai/test', payload);
      const data = res?.data || res;
      if (data?.success) {
        message.success(`连通性测试通过！响应耗时: ${data.latency_ms} ms`);
        setTestResult({
          success: true,
          latency_ms: data.latency_ms,
          reply: data.reply,
          model: data.model,
          tested_at: '刚刚'
        });
      } else {
        message.error(`连通测试失败: ${data?.error || '未知错误'}`);
        setTestResult({
          success: false,
          latency_ms: data?.latency_ms || 0,
          error: data?.error || '连接被拒绝或令牌无效',
          tested_at: '刚刚'
        });
      }
    } catch (err) {
      console.error('测试异常:', err);
      message.error('测试请求发送失败');
      setTestResult({
        success: false,
        latency_ms: 0,
        error: err.response?.data?.detail || err.message,
        tested_at: '刚刚'
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col text-slate-900">
      {/* 主体工作区 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* 页面标题与操作条 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-950 tracking-tight">
                AI 大模型引擎与 Token 网关配置
              </h1>
              <span className="shadcn-badge-secondary font-mono text-[11px]">
                {isEnabled ? '🟢 已启用实时调用' : '🔴 已暂停'}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              在此配置 New-API Token 资源池网关、API Base URL、访问令牌与默认推理模型，全站尽调生成、章节总结与智能风控对话均即时生效
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || saving}
              className="shadcn-button-outline text-xs py-2 px-3.5 flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-[#0096DB]' : ''}`} />
              <span>{testing ? '正在测试连通性...' : '⚡ 测试连通性'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving || testing}
              className="shadcn-button-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? '正在保存...' : '保存并即时生效'}</span>
            </button>
          </div>
        </div>

        {/* 核心两栏布局 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* 左栏：配置核心表单 (Col 8) */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* 1. 提供商与模式选择 */}
            <div className="shadcn-card bg-white p-6 border border-zinc-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#0096DB]" />
                  <span>服务提供商模式 (Provider)</span>
                </h3>
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-zinc-400">快速预设:</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('newapi_local')}
                    className="text-[#0096DB] hover:underline px-1.5 py-0.5 text-[11px]"
                  >
                    本地 New-API
                  </button>
                  <span className="text-zinc-300">|</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('deepseek_official')}
                    className="text-zinc-600 hover:underline px-1.5 py-0.5 text-[11px]"
                  >
                    DeepSeek 官方
                  </button>
                  <span className="text-zinc-300">|</span>
                  <button
                    type="button"
                    onClick={() => applyPreset('openai_official')}
                    className="text-zinc-600 hover:underline px-1.5 py-0.5 text-[11px]"
                  >
                    OpenAI
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  onClick={() => { setProvider('newapi'); setBaseUrl('http://127.0.0.1:3000/v1'); }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    provider === 'newapi'
                      ? 'border-[#0096DB] bg-cyan-50/40 shadow-xs'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-950">New-API 网关</span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-semibold">推荐</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                    聚合本地 Token 资源池，支持批量轮询与故障重试
                  </p>
                </div>

                <div
                  onClick={() => { setProvider('deepseek'); setBaseUrl('https://api.deepseek.com/v1'); }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    provider === 'deepseek'
                      ? 'border-[#0096DB] bg-cyan-50/40 shadow-xs'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-950">DeepSeek 官方</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                    直接连接 DeepSeek 官方开放平台端点
                  </p>
                </div>

                <div
                  onClick={() => { setProvider('openai'); setBaseUrl('https://api.openai.com/v1'); }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    provider === 'openai'
                      ? 'border-[#0096DB] bg-cyan-50/40 shadow-xs'
                      : 'border-zinc-200 hover:border-zinc-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-950">通用 OpenAI 兼容</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                    支持 OneAPI、Ollama、vLLM 或标准 API
                  </p>
                </div>
              </div>
            </div>

            {/* 2. 核心 URL 与 API Key 参数 */}
            <div className="shadcn-card bg-white p-6 border border-zinc-200 shadow-xs space-y-5">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Globe className="w-4 h-4 text-[#0096DB]" />
                <span>接口端点与令牌凭证 (URL & API Key)</span>
              </h3>

              {/* Base URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  AI 服务端点 URL (Base URL) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder="http://127.0.0.1:3000/v1"
                    className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-zinc-200 focus:border-[#0096DB] focus:ring-1 focus:ring-[#0096DB] outline-none"
                  />
                </div>
                <p className="text-[11px] text-zinc-400">
                  如使用本地 New-API 服务，请填入 <code className="text-zinc-700 bg-zinc-100 px-1 py-0.5 rounded">http://127.0.0.1:3000/v1</code>
                </p>
              </div>

              {/* API Key */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-800 block">
                    API Token 密钥 (API Key) <span className="text-rose-500">*</span>
                  </label>
                  {hasKey && (
                    <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      当前已配置有效令牌
                    </span>
                  )}
                </div>
                
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3.5 py-2 pr-10 text-xs font-mono rounded-lg border border-zinc-200 focus:border-[#0096DB] focus:ring-1 focus:ring-[#0096DB] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-slate-700"
                    title={showKey ? '隐藏密钥' : '显示明文'}
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-zinc-400">
                  可在此直接粘贴 New-API 后台生成的总控令牌，或者 DeepSeek/OpenAI 的 API Key。密钥将在保存时自动加密并脱敏展示。
                </p>
              </div>

              {/* 调用模型名称 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-800 block">
                  调用模型名称 (Model) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="deepseek-chat"
                  className="w-full px-3.5 py-2 text-xs font-mono rounded-lg border border-zinc-200 focus:border-[#0096DB] focus:ring-1 focus:ring-[#0096DB] outline-none"
                />
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="text-[11px] text-zinc-400">常用模型快速选择:</span>
                  {['deepseek-chat', 'deepseek-reasoner', 'gpt-4o-mini', 'gpt-4o', 'qwen-plus'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setModel(m)}
                      className={`text-[11px] px-2 py-0.5 rounded-md border font-mono transition-colors ${
                        model === m
                          ? 'bg-sky-50 text-[#0096DB] border-sky-300 font-semibold'
                          : 'bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* 3. 高级推理控制 */}
            <div className="shadcn-card bg-white p-6 border border-zinc-200 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-950 flex items-center gap-2 border-b border-zinc-100 pb-3">
                <Sliders className="w-4 h-4 text-[#0096DB]" />
                <span>高级推理参数控制</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">采样温度 (Temperature)</span>
                    <span className="font-mono text-[#0096DB] font-bold">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-[#0096DB]"
                  />
                  <span className="text-[10px] text-zinc-400 block">
                    金融风控报告建议 0.1 ~ 0.3（保证严谨性与确定性）
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">请求超时时间 (Timeout)</span>
                    <span className="font-mono text-slate-700 font-bold">{timeoutSeconds} 秒</span>
                  </div>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={timeoutSeconds}
                    onChange={(e) => setTimeoutSeconds(parseInt(e.target.value, 10) || 60)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-zinc-200 focus:border-[#0096DB] outline-none"
                  />
                  <span className="text-[10px] text-zinc-400 block">
                    遇到超大篇幅全文综合总结建议设为 60~120 秒
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* 右栏：测试诊断与 New-API 本地网关指引 (Col 4) */}
          <div className="lg:col-span-4 space-y-5">
            
            {/* 1. 连通性测试诊断看板 */}
            <div className="shadcn-card bg-white p-5 border border-zinc-200 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2.5">
                <h3 className="font-bold text-xs text-slate-950 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#0096DB]" />
                  <span>连通性诊断与响应探针</span>
                </h3>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing}
                  className="text-xs text-[#0096DB] hover:underline flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${testing ? 'animate-spin' : ''}`} />
                  <span>{testing ? '测试中' : '重新测试'}</span>
                </button>
              </div>

              {testResult ? (
                <div className={`p-4 rounded-xl border space-y-2.5 ${
                  testResult.success 
                    ? 'bg-emerald-50/60 border-emerald-200' 
                    : 'bg-rose-50/60 border-rose-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1.5 text-slate-900">
                      {testResult.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span>{testResult.success ? '网关与模型连通正常' : '连通异常'}</span>
                    </span>
                    {testResult.latency_ms > 0 && (
                      <span className="text-xs font-mono font-bold text-emerald-700 bg-white/80 px-2 py-0.5 rounded border border-emerald-200/60">
                        {testResult.latency_ms} ms
                      </span>
                    )}
                  </div>

                  {testResult.success ? (
                    <div className="text-xs text-zinc-700 bg-white/80 p-2.5 rounded-lg border border-emerald-100 space-y-1">
                      <span className="text-[11px] text-zinc-400 block font-medium">模型响应探针:</span>
                      <p className="font-mono text-slate-900">{testResult.reply || '正常回应'}</p>
                    </div>
                  ) : (
                    <div className="text-xs text-rose-700 bg-white/80 p-2.5 rounded-lg border border-rose-100 space-y-1">
                      <span className="text-[11px] text-rose-400 block font-medium">错误原因:</span>
                      <p className="font-mono text-rose-800 break-words">{testResult.error}</p>
                    </div>
                  )}

                  <span className="text-[10px] text-zinc-400 block pt-1">
                    测试时间: {testResult.tested_at}
                  </span>
                </div>
              ) : (
                <div className="py-8 text-center space-y-2 px-2 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                  <Sparkles className="w-6 h-6 text-zinc-300 mx-auto" />
                  <p className="text-xs text-zinc-500">点击“⚡ 测试连通性”验证当前 URL 与 API Key 是否可用</p>
                </div>
              )}
            </div>

            {/* 2. New-API 本地服务管理卡片 */}
            <div className="shadcn-card bg-gradient-to-br from-cyan-50/50 to-sky-50/30 p-5 border border-cyan-100 rounded-xl space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-[#0096DB] text-white flex items-center justify-center text-xs font-bold">
                    N
                  </div>
                  <span className="font-bold text-xs text-slate-950">本地 New-API 资源池</span>
                </div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded font-bold">
                  🟢 运行中 :3000
                </span>
              </div>

              <p className="text-xs text-zinc-600 leading-relaxed">
                New-API 已直接在您的 Mac 上原生运行。您可登录 New-API 控制台批量管理并轮询您的几十上百个 Token。
              </p>

              <div className="p-3 bg-white/80 rounded-lg border border-cyan-200/60 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">控制台地址:</span>
                  <a
                    href="http://localhost:3000"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#0096DB] font-mono hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>http://localhost:3000</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">默认管理账号:</span>
                  <span className="font-mono text-slate-800">root / 123456</span>
                </div>
              </div>

              <a
                href="http://localhost:3000"
                target="_blank"
                rel="noreferrer"
                className="shadcn-button-primary text-xs py-2 w-full flex items-center justify-center gap-1.5"
              >
                <span>进入 New-API 渠道与令牌管理</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* 3. 尽调系统调用链路说明 */}
            <div className="shadcn-card bg-white p-5 border border-zinc-200 shadow-xs space-y-2.5 text-xs text-zinc-600">
              <h4 className="font-bold text-slate-950 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0096DB]" />
                <span>尽调系统 AI 联动说明</span>
              </h4>
              <ul className="space-y-1.5 pl-3 list-disc text-zinc-500 text-[11px] leading-relaxed">
                <li>本页面保存后，<strong>无需重启任何服务</strong>，后端 AI 智能体将即时读取最新配置。</li>
                <li>涵盖尽调流水线生成（任务分析）、PDF 全文综合画像、章节 AI 研判及风控对话助手。</li>
                <li>若 Token 欠费或失效，New-API 网关将自动切换下一可用 Key；如全部异常系统将自动优雅降级兜底。</li>
              </ul>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
}
