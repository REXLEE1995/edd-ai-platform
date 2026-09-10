import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  KeyRound, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Activity, 
  Zap, 
  Clock, 
  Save, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Check, 
  Terminal, 
  SlidersHorizontal, 
  Power,
  ShieldCheck,
  Server
} from 'lucide-react';
import { message, Tooltip, Switch } from 'antd';
import apiClient from '../../api/client';

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // 表单状态 (严格对应后端真实接口字段)
  const [formData, setFormData] = useState({
    llm_provider: 'newapi',
    new_api_base_url: '',
    new_api_key: '',
    new_api_key_masked: '',
    has_key: false,
    new_api_model: '',
    temperature: 0.3,
    timeout_seconds: 60,
    is_enabled: true
  });

  // 初始数据备份，用于比对是否有未保存的变更
  const [initialData, setInitialData] = useState(null);

  // 连通性测试诊断结果 (真实探针返回数据)
  const [testResult, setTestResult] = useState(null);

  // 1. 从后端真实接口读取当前 AI 配置
  const fetchAiSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/settings/ai');
      const d = res?.data?.data || res?.data || res;
      if (d) {
        const loadedData = {
          llm_provider: d.llm_provider || 'newapi',
          new_api_base_url: d.new_api_base_url || '',
          new_api_key: '', // 用户输入的明文 Key，初始为空
          new_api_key_masked: d.new_api_key_masked || '',
          has_key: Boolean(d.has_key),
          new_api_model: d.new_api_model || '',
          temperature: typeof d.temperature === 'number' ? d.temperature : 0.3,
          timeout_seconds: typeof d.timeout_seconds === 'number' ? d.timeout_seconds : 60,
          is_enabled: d.is_enabled !== undefined ? Boolean(d.is_enabled) : true,
        };

        setFormData(loadedData);
        setInitialData(loadedData);

        // 如果后端有上次探针测试的记录，则回显
        if (d.last_test_status) {
          setTestResult({
            success: d.last_test_status === 'success',
            latency_ms: d.last_test_latency_ms || 0,
            reply: d.last_test_msg,
            tested_at: d.last_test_at,
            model: d.new_api_model,
            base_url: d.new_api_base_url
          });
        }
      }
    } catch (err) {
      console.error('获取 AI 配置失败:', err);
      message.error(err?.response?.data?.detail || err?.response?.data?.message || '获取 AI 配置失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiSettings();
  }, []);

  // 判断是否有未保存的修改
  const isDirty = initialData && (
    formData.llm_provider !== initialData.llm_provider ||
    formData.new_api_base_url !== initialData.new_api_base_url ||
    formData.new_api_key.trim().length > 0 ||
    formData.new_api_model !== initialData.new_api_model ||
    formData.temperature !== initialData.temperature ||
    formData.timeout_seconds !== initialData.timeout_seconds ||
    formData.is_enabled !== initialData.is_enabled
  );

  // 2. 保存配置到后端数据库 (真实接口 POST /admin/settings/ai)
  const handleSave = async () => {
    if (!formData.new_api_base_url.trim()) {
      message.warning('请填写 API 基础端点 URL');
      return;
    }
    if (!formData.new_api_model.trim()) {
      message.warning('请填写模型名称');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        llm_provider: formData.llm_provider,
        new_api_base_url: formData.new_api_base_url.trim(),
        new_api_model: formData.new_api_model.trim(),
        temperature: parseFloat(formData.temperature),
        timeout_seconds: parseInt(formData.timeout_seconds, 10),
        is_enabled: Boolean(formData.is_enabled)
      };

      // 仅当用户输入了新的 API Key 时才传递，否则留空不覆盖现有密钥
      if (formData.new_api_key.trim()) {
        payload.new_api_key = formData.new_api_key.trim();
      }

      const res = await apiClient.post('/admin/settings/ai', payload);
      message.success(res?.data?.message || 'AI 接口配置保存成功并已即刻生效');
      
      // 重新拉取以同步脱敏 Key 及后端状态
      await fetchAiSettings();
    } catch (err) {
      console.error('保存 AI 配置失败:', err);
      message.error(err?.response?.data?.detail || err?.response?.data?.message || '保存失败，请检查网络或参数格式');
    } finally {
      setSaving(false);
    }
  };

  // 3. 真实探针连通性测试 (真实接口 POST /admin/settings/ai/test)
  const handleTest = async () => {
    if (!formData.new_api_base_url.trim()) {
      message.warning('请先输入端点 URL 后再进行测试');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const payload = {
        base_url: formData.new_api_base_url.trim(),
        model: formData.new_api_model.trim() || undefined,
        provider: formData.llm_provider || undefined
      };

      // 如果用户输入了新 Key，则以新 Key 测试；未输入则由后端使用库中保存的密钥
      if (formData.new_api_key.trim()) {
        payload.api_key = formData.new_api_key.trim();
      }

      const startTime = Date.now();
      const res = await apiClient.post('/admin/settings/ai/test', payload);
      const latency = Date.now() - startTime;
      const data = res?.data?.data || res?.data || {};

      const success = Boolean(data.success);
      setTestResult({
        success,
        latency_ms: data.latency_ms || latency,
        reply: data.reply || data.message || (success ? '连通性正常，探针握手成功。' : '无返回内容'),
        error: data.error,
        tested_at: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        model: formData.new_api_model,
        base_url: formData.new_api_base_url
      });

      if (success) {
        message.success(`连通测试通过！延迟 ${data.latency_ms || latency} ms`);
      } else {
        message.error(data.error || '连通测试未通过，请检查端点、密钥或模型名称');
      }
    } catch (err) {
      console.error('连通测试异常:', err);
      const errMsg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || '测试请求失败';
      setTestResult({
        success: false,
        latency_ms: 0,
        reply: null,
        error: errMsg,
        tested_at: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        model: formData.new_api_model,
        base_url: formData.new_api_base_url
      });
      message.error(`测试失败: ${errMsg}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-slate-900">
      {/* 顶部 Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200/80 flex items-center justify-center text-[#0096DB] shadow-xs">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-950 tracking-tight">
                AI 接口配置
              </h1>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                生产环境直连
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              配置系统用于尽调全景分析、报告智能生成以及业务问答的大模型网关端点、密钥与推理参数。
            </p>
          </div>
        </div>

        {/* 顶栏操作区 */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={fetchAiSettings}
            disabled={loading || testing || saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-700 bg-white border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 transition-all disabled:opacity-50 shadow-xs"
            title="重新加载当前服务端生效的配置"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={loading || testing || saving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-[#0070a4] bg-cyan-50 hover:bg-cyan-100/70 border border-cyan-200/80 transition-all disabled:opacity-50 shadow-xs"
          >
            <Zap className={`w-3.5 h-3.5 ${testing ? 'animate-pulse text-amber-500' : ''}`} />
            {testing ? '正在测试连通性...' : '测试连通性'}
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={loading || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-[#0096DB] hover:bg-[#0084c2] transition-all disabled:opacity-50 shadow-xs active:scale-[0.99]"
          >
            <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
            {saving ? '正在保存...' : '保存配置'}
          </button>
        </div>
      </div>

      {/* 主体表单内容 */}
      <div className="space-y-6">
        {loading ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-xs">
            <RefreshCw className="w-8 h-8 text-[#0096DB] animate-spin mx-auto mb-3" />
            <p className="text-xs text-zinc-500 font-medium">正在读取真实后端 AI 网关配置...</p>
          </div>
        ) : (
          <>
            {/* 运行状态与开关横幅 */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                  formData.is_enabled 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200/70' 
                    : 'bg-amber-50 text-amber-600 border-amber-200/70'
                }`}>
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-950">AI 报告生成与问答服务</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      formData.is_enabled 
                        ? 'bg-emerald-100/80 text-emerald-800' 
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {formData.is_enabled ? '已开启' : '已暂停'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {formData.is_enabled 
                      ? '系统当前正常调度大模型生成全景尽调研判报告。' 
                      : '服务已关闭，尽调报告创建与 AI 问答将暂停调用大模型。'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                <span className="text-xs font-semibold text-slate-700">服务启用状态</span>
                <Switch 
                  checked={formData.is_enabled}
                  onChange={(checked) => setFormData(prev => ({ ...prev, is_enabled: checked }))}
                  className={formData.is_enabled ? 'bg-[#0096DB]' : 'bg-slate-300'}
                />
              </div>
            </div>

            {/* 核心配置表单栅格 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* 左侧两列：参数设置 */}
              <div className="lg:col-span-2 space-y-6">

                {/* 卡片 1: 端点与协议 */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                    <Globe className="w-4 h-4 text-[#0096DB]" />
                    <h2 className="text-sm font-bold text-slate-950">网关端点与服务商</h2>
                  </div>

                  <div className="space-y-4">
                    {/* 提供商协议 */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        大模型提供商协议 (llm_provider) <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.llm_provider}
                        onChange={(e) => setFormData(prev => ({ ...prev, llm_provider: e.target.value }))}
                        className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100 transition-all font-medium"
                      >
                        <option value="newapi">New-API / One-API 聚合分发网关 (newapi)</option>
                        <option value="deepseek">DeepSeek 官方协议 (deepseek)</option>
                        <option value="openai">OpenAI 官方及标准兼容接口 (openai)</option>
                      </select>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        指定底层 HTTP 请求适配格式与鉴权 Header 解析规则。
                      </p>
                    </div>

                    {/* Base URL */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        API 基础端点 (new_api_base_url) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.new_api_base_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_api_base_url: e.target.value }))}
                        placeholder="例如 https://model-router.edu-aliyun.com/v1 或 https://api.deepseek.com/v1"
                        className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100 transition-all font-mono"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        必须为完整的 HTTP / HTTPS 根地址，通常包含版本前缀（例如 <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded">/v1</code>）。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 卡片 2: 鉴权密钥凭据 */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#0096DB]" />
                      <h2 className="text-sm font-bold text-slate-950">API Key 凭据管理</h2>
                    </div>

                    <div className="flex items-center gap-2">
                      {formData.has_key ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          已配置有效密钥
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          尚未配置密钥
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* 当前已配置的脱敏 Key 展示 */}
                    {formData.has_key && (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                        <span className="text-zinc-500 font-medium">当前库中生效密钥:</span>
                        <code className="font-mono text-slate-900 bg-white px-2 py-1 rounded border border-slate-200 text-[11px]">
                          {formData.new_api_key_masked || 'sk-••••••••••••'}
                        </code>
                      </div>
                    )}

                    {/* 输入新 Key */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        {formData.has_key ? '更新 API Key (留空保持原密钥)' : '配置 API Key'}
                      </label>
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={formData.new_api_key}
                          onChange={(e) => setFormData(prev => ({ ...prev, new_api_key: e.target.value }))}
                          placeholder={formData.has_key ? "输入新 Key 以覆盖更新，若不需要修改请留空" : "请输入 API Key (例如 sk-...)"}
                          className="w-full pl-3.5 pr-10 py-2 text-xs text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100 transition-all font-mono"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-slate-700 transition-colors"
                          title={showApiKey ? "隐藏明文" : "显示明文"}
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        为保障系统安全，后端对敏感 Token 实行密文存储与脱敏传输。若无需更新密钥，保持输入框为空即可。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 卡片 3: 模型与推理参数 */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
                    <SlidersHorizontal className="w-4 h-4 text-[#0096DB]" />
                    <h2 className="text-sm font-bold text-slate-950">模型名称与推理控制</h2>
                  </div>

                  <div className="space-y-4">
                    {/* 模型名称 */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        模型名称 (new_api_model) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.new_api_model}
                        onChange={(e) => setFormData(prev => ({ ...prev, new_api_model: e.target.value }))}
                        placeholder="例如 qwen/qwen3.7-plus, deepseek-chat 等"
                        className="w-full px-3.5 py-2 text-xs text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100 transition-all font-mono"
                      />
                      <p className="text-[11px] text-zinc-500 mt-1">
                        调用的目标大模型真实名称或网关映射别名。
                      </p>
                    </div>

                    {/* 采样温度 Temperature */}
                    <div className="pt-2 border-t border-zinc-100">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-800">
                          采样温度 (temperature)
                        </label>
                        <span className="text-xs font-mono font-bold text-[#0096DB] bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200/60">
                          {Number(formData.temperature).toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0.0"
                          max="1.5"
                          step="0.05"
                          value={formData.temperature}
                          onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                          className="flex-1 accent-[#0096DB] h-2 bg-slate-100 rounded-lg cursor-pointer"
                        />
                        <input
                          type="number"
                          min="0.0"
                          max="2.0"
                          step="0.05"
                          value={formData.temperature}
                          onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0 }))}
                          className="w-16 px-2 py-1 text-xs text-center font-mono border border-zinc-200 rounded-lg"
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                        <span>0.0 (最严谨/低幻觉，推荐尽调场景)</span>
                        <span>0.7 (通用平衡)</span>
                        <span>1.5 (强发散)</span>
                      </div>
                    </div>

                    {/* 超时时间 Timeout */}
                    <div className="pt-2 border-t border-zinc-100">
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        单次生成超时时间 (timeout_seconds)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="5"
                          max="300"
                          value={formData.timeout_seconds}
                          onChange={(e) => setFormData(prev => ({ ...prev, timeout_seconds: parseInt(e.target.value, 10) || 60 }))}
                          className="w-32 px-3 py-2 text-xs text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100 transition-all font-mono"
                        />
                        <span className="text-xs text-zinc-500 font-medium">秒 (建议范围 30 ~ 120 秒)</span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        长篇尽调多维报告推理时间较长，建议保持在 60 秒以上，避免客户端超时断连。
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              {/* 右侧一列：连通性实时诊断面板 */}
              <div className="space-y-6">
                
                {/* 诊断卡片 */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-[#0096DB]" />
                      <h2 className="text-sm font-bold text-slate-950">真实连通性测试</h2>
                    </div>

                    {testResult && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        testResult.success 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {testResult.success ? '测试通过' : '测试失败'}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed">
                    点击测试后，后端将直接向当前配置的目标大模型端点发送轻量连通性握手探针，并返回真实响应时间与回复文本。
                  </p>

                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={testing || loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-xl text-white bg-slate-900 hover:bg-slate-800 transition-all disabled:opacity-50 shadow-xs active:scale-[0.99]"
                  >
                    <Zap className={`w-3.5 h-3.5 ${testing ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
                    {testing ? '正在执行握手诊断...' : '执行连通性诊断测试'}
                  </button>

                  {/* 探针回显结果 */}
                  {testResult && (
                    <div className="space-y-3 pt-3 border-t border-zinc-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-500">探针网络延迟:</span>
                        <span className={`font-mono font-bold ${testResult.success ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {testResult.latency_ms} ms
                        </span>
                      </div>

                      {testResult.tested_at && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-500">最近测试时间:</span>
                          <span className="font-mono text-slate-700 text-[11px]">{testResult.tested_at}</span>
                        </div>
                      )}

                      {testResult.reply && (
                        <div>
                          <span className="text-[11px] font-semibold text-zinc-500 block mb-1">大模型真实应答内容:</span>
                          <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono whitespace-pre-wrap max-h-48 overflow-y-auto border border-slate-800 leading-relaxed shadow-inner">
                            {testResult.reply}
                          </div>
                        </div>
                      )}

                      {testResult.error && (
                        <div>
                          <span className="text-[11px] font-semibold text-rose-500 block mb-1">错误详情:</span>
                          <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-[11px] font-mono whitespace-pre-wrap border border-rose-200 leading-relaxed">
                            {testResult.error}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {!testResult && !testing && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-zinc-400">
                      尚未进行测试。点击上方按钮可随时验证配置是否可用。
                    </div>
                  )}
                </div>

                {/* 说明卡片 */}
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                    <ShieldCheck className="w-4 h-4 text-[#0096DB]" />
                    <span>上线生产部署须知</span>
                  </div>
                  <ul className="text-[11px] text-zinc-500 space-y-2 list-disc pl-4 leading-relaxed">
                    <li>配置直接持久化于后端数据库，尽调任务及问答模块将实时读取此配置生效。</li>
                    <li>API Key 提交保存后将以掩码展示，请妥善保管外部平台密钥。</li>
                    <li>若大模型更换，请务必先点击“测试连通性”确认网络通畅与 Token 额度充足。</li>
                  </ul>
                </div>

              </div>

            </div>
          </>
        )}
      </div>

      {/* 底部浮动保存条 (有未保存修改时突出提示) */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-medium text-slate-200">配置已发生更改，尚未保存至数据库</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAiSettings}
              disabled={saving}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              放弃修改
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl text-white bg-[#0096DB] hover:bg-[#0084c2] transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
              {saving ? '保存中...' : '立即保存'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
