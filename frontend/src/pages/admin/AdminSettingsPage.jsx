import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  Clock, 
  MessageSquare, 
  Send, 
  Save,
  Bot,
  FileText,
  Eye, 
  EyeOff, 
  Sparkles, 
  Check, 
  Terminal, 
  SlidersHorizontal, 
  Power
} from 'lucide-react';
import { message, Tooltip, Switch } from 'antd';
import apiClient from '../../api/client';

export default function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'ai';

  // =========================================================================
  // 1. AI 大模型配置状态与诊断
  // =========================================================================
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

  // =========================================================================
  // 2. 短信服务配置状态与诊断
  // =========================================================================
  const [smsSettings, setSmsSettings] = useState({
    sms_provider: 'xct',
    url: 'http://api.xct.com/sms/send',
    name: '',
    key_masked: '',
    sign: '成都享宇森云科技',
    is_open: false,
    max_error_count: 5,
    expire_seconds: 300,
    available_templates: []
  });
  const [smsForm, setSmsForm] = useState({
    name: '',
    key: '',
    sign: '成都享宇森云科技',
    url: 'http://api.xct.com/sms/send',
    is_open: false
  });
  const [initialSmsData, setInitialSmsData] = useState(null);
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestResult, setSmsTestResult] = useState(null);
  const [showSmsKey, setShowSmsKey] = useState(false);

  // =========================================================================
  // 数据获取
  // =========================================================================
  const fetchAiSettings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/admin/settings/ai');
      const d = res?.data?.data || res?.data || res;
      if (d) {
        const loadedData = {
          llm_provider: d.llm_provider || 'newapi',
          new_api_base_url: d.new_api_base_url || '',
          new_api_key: '',
          new_api_key_masked: d.new_api_key_masked || '',
          has_key: Boolean(d.has_key),
          new_api_model: d.new_api_model || '',
          temperature: typeof d.temperature === 'number' ? d.temperature : 0.3,
          timeout_seconds: typeof d.timeout_seconds === 'number' ? d.timeout_seconds : 60,
          is_enabled: d.is_enabled !== undefined ? Boolean(d.is_enabled) : true,
        };

        setFormData(loadedData);
        setInitialData(loadedData);

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

  const fetchSmsSettings = async () => {
    try {
      const res = await apiClient.get('/admin/settings/sms');
      const d = res?.data?.data || res?.data || res;
      if (d) {
        setSmsSettings(d);
        const loadedSms = {
          name: d.name || '',
          key: '',
          sign: d.sign || '成都享宇森云科技',
          url: d.url || 'http://api.xct.com/sms/send',
          is_open: Boolean(d.is_open)
        };
        setSmsForm(loadedSms);
        setInitialSmsData(loadedSms);
      }
    } catch (err) {
      console.error('获取短信配置失败:', err);
    }
  };

  useEffect(() => {
    fetchAiSettings();
    fetchSmsSettings();
  }, []);

  const isDirty = initialData && (
    formData.llm_provider !== initialData.llm_provider ||
    formData.new_api_base_url !== initialData.new_api_base_url ||
    formData.new_api_key.trim().length > 0 ||
    formData.new_api_model !== initialData.new_api_model ||
    formData.temperature !== initialData.temperature ||
    formData.timeout_seconds !== initialData.timeout_seconds ||
    formData.is_enabled !== initialData.is_enabled
  );

  const isSmsDirty = initialSmsData && (
    smsForm.name !== initialSmsData.name ||
    smsForm.key.trim().length > 0 ||
    smsForm.sign !== initialSmsData.sign ||
    smsForm.url !== initialSmsData.url ||
    smsForm.is_open !== initialSmsData.is_open
  );

  // =========================================================================
  // AI 保存与测试
  // =========================================================================
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

      if (formData.new_api_key.trim()) {
        payload.new_api_key = formData.new_api_key.trim();
      }

      const res = await apiClient.post('/admin/settings/ai', payload);
      message.success(res?.data?.message || res?.message || 'AI 接口配置保存成功并已即刻生效');
      await fetchAiSettings();
    } catch (err) {
      console.error('保存 AI 配置失败:', err);
      message.error(err?.response?.data?.detail || err?.response?.data?.message || '保存失败，请检查网络或参数格式');
    } finally {
      setSaving(false);
    }
  };

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

  // =========================================================================
  // 短信 保存与测试
  // =========================================================================
  const handleSaveSmsSettings = async (e) => {
    if (e) e.preventDefault();
    setSmsSaving(true);
    try {
      const payload = {
        name: smsForm.name.trim(),
        sign: smsForm.sign.trim(),
        url: smsForm.url.trim(),
        is_open: Boolean(smsForm.is_open)
      };
      if (smsForm.key && smsForm.key.trim() && !smsForm.key.includes('••••')) {
        payload.key = smsForm.key.trim();
      }
      const res = await apiClient.post('/admin/settings/sms', payload);
      message.success(res?.data?.message || res?.message || '短信配置（商户账号、密码、短信签名）已成功保存并生效！');
      await fetchSmsSettings();
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || '保存失败';
      message.error('保存短信配置失败: ' + errMsg);
    } finally {
      setSmsSaving(false);
    }
  };

  const handleTestSms = async () => {
    if (!smsTestPhone || smsTestPhone.trim().length !== 11) {
      message.warning('请输入有效的 11 位测试接收手机号码');
      return;
    }
    setSmsTesting(true);
    try {
      const res = await apiClient.post('/admin/settings/sms/test', {
        phone: smsTestPhone.trim(),
        scene: 'login'
      });
      const resData = res?.data || res;
      if (resData?.code !== 0 && resData?.code !== undefined) {
        message.error(resData?.message || '测试短信发送失败');
        setSmsTestResult({
          success: false,
          msg: resData?.message || '发送失败',
          data: resData?.data
        });
        return;
      }
      message.success(resData?.message || '测试短信发送成功！');
      setSmsTestResult({
        success: true,
        msg: resData?.message || '发送成功',
        data: resData?.data
      });
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || '测试失败';
      message.error('测试短信发送失败: ' + errMsg);
      setSmsTestResult({
        success: false,
        msg: errMsg
      });
    } finally {
      setSmsTesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 text-slate-900">
      
      {/* 顶部 Page Header 与 选项卡切换 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 tracking-tight">
              系统服务与外部集成配置
            </h1>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              生产环境热生效
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            独立可视化调优大模型网关参数与短信服务通道，配置改动实时持久化生效。
          </p>
        </div>

        {/* 顶部选项卡切换 */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'ai' })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-white text-[#0070a4] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <Bot className="w-4 h-4 text-[#0096DB]" />
            <span>AI 大模型配置</span>
            <span className={`w-1.5 h-1.5 rounded-full ${formData.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></span>
          </button>

          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'sms' })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'sms'
                ? 'bg-white text-[#0070a4] shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-950 hover:bg-white/50'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-[#0096DB]" />
            <span>享畅通短信网关</span>
            <span className={`w-1.5 h-1.5 rounded-full ${smsSettings.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模块 1: AI 大模型配置面板                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'ai' && (
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
                          placeholder="例如 http://192.168.110.234:3000/v1 或 https://api.deepseek.com/v1"
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
                          <span className="text-zinc-500 font-medium">当前生效密钥 (掩码):</span>
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
                          placeholder="例如 xyzp-ai 或 deepseek-chat"
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
                          <span>0.3 (尽调报告标准推荐)</span>
                          <span>1.0 (通用创意)</span>
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
      )}

      {/* ========================================================================= */}
      {/* 模块 2: 享畅通短信网关与签名配置面板                                      */}
      {/* ========================================================================= */}
      {activeTab === 'sms' && (
        <div className="space-y-6">
          
          {/* 短信网关参数配置卡片 */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#0096DB]" />
                <h2 className="font-bold text-sm text-slate-950">
                  享畅通短信网关与签名配置 (商户账号、密码与签名协同配置)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  smsSettings.is_open 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${smsSettings.is_open ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
                  {smsSettings.is_open ? '真实短信外发已开启' : '挡板拦截模式 (零资费)'}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  动态配置热生效
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveSmsSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 商户账号 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">商户账号 (Name)</label>
                  <input
                    type="text"
                    value={smsForm.name}
                    onChange={(e) => setSmsForm({ ...smsForm, name: e.target.value })}
                    placeholder="请输入享畅通分配的商户账号"
                    className="w-full text-xs font-mono px-3.5 py-2 text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100"
                  />
                </div>

                {/* 商户密码/密钥 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">商户密码/密钥 (Key / Secret)</label>
                  <div className="relative">
                    <input
                      type={showSmsKey ? 'text' : 'password'}
                      value={smsForm.key}
                      onChange={(e) => setSmsForm({ ...smsForm, key: e.target.value })}
                      placeholder={smsSettings.has_key ? (smsSettings.key_masked || '已配置，留空保持不变') : '请输入商户通信密钥'}
                      className="w-full text-xs font-mono pl-3.5 pr-10 py-2 text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmsKey(!showSmsKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-slate-700 transition-colors"
                      title={showSmsKey ? "隐藏明文" : "显示明文"}
                    >
                      {showSmsKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 短信签名 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    短信签名 (与商户账号密码统一配置)
                  </label>
                  <input
                    type="text"
                    value={smsForm.sign}
                    onChange={(e) => setSmsForm({ ...smsForm, sign: e.target.value })}
                    placeholder="例如: 成都享宇森云科技"
                    className="w-full text-xs font-semibold px-3.5 py-2 text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100"
                  />
                  <p className="text-[10px] text-zinc-400">系统自动清洗中英文括号，严格以【签名】格式组装发送</p>
                </div>

                {/* 网关 URL */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700">网关 URL</label>
                  <input
                    type="text"
                    value={smsForm.url}
                    onChange={(e) => setSmsForm({ ...smsForm, url: e.target.value })}
                    placeholder="http://api.xct.com/sms/send"
                    className="w-full text-xs font-mono px-3.5 py-2 text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100"
                  />
                  <p className="text-[10px] text-zinc-400">服务商分配的生产 HTTP GET 网关地址（通常需配置服务器公网 IP 白名单）</p>
                </div>

                {/* 发送开关 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">短信外发模式</label>
                  <select
                    value={smsForm.is_open ? 'true' : 'false'}
                    onChange={(e) => setSmsForm({ ...smsForm, is_open: e.target.value === 'true' })}
                    className="w-full text-xs px-3.5 py-2 text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100"
                  >
                    <option value="false">挡板拦截模式 (开发/测试推荐，0资费模拟成功)</option>
                    <option value="true">正式外发模式 (生产环境真实调用服务商扣费发送)</option>
                  </select>
                </div>

              </div>

              {/* 保存操作条 */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <div className="text-[11px] text-zinc-500">
                  支持的 4 大报备场景：<span className="font-mono text-slate-800">login (登录)</span>、<span className="font-mono text-slate-800">register (注册)</span>、<span className="font-mono text-slate-800">change_pwd (改密)</span>、<span className="font-mono text-slate-800">reset_pwd (找回密码)</span>
                </div>
                <button
                  type="submit"
                  disabled={smsSaving}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-white bg-[#0096DB] hover:bg-[#0084c2] transition-all disabled:opacity-50 shadow-xs active:scale-[0.99] flex items-center gap-1.5"
                >
                  <Save className={`w-3.5 h-3.5 ${smsSaving ? 'animate-spin' : ''}`} />
                  <span>{smsSaving ? '正在保存...' : '保存短信配置'}</span>
                </button>
              </div>
            </form>

            {/* 短信发送连通性探针测试 */}
            <div className="pt-4 border-t border-zinc-100 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#0096DB]" />
                <span>短信网关与签名连通性测试探针</span>
              </h3>
              <div className="flex items-center gap-3">
                <input
                  type="tel"
                  maxLength={11}
                  value={smsTestPhone}
                  onChange={(e) => setSmsTestPhone(e.target.value)}
                  placeholder="请输入接收测试短信的 11 位手机号"
                  className="flex-1 max-w-sm text-xs font-mono px-3.5 py-2 text-slate-900 bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:border-[#0096DB] focus:ring-2 focus:ring-cyan-100"
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  disabled={smsTesting}
                  className="text-xs py-2 px-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${smsTesting ? 'animate-spin' : ''}`} />
                  <span>{smsTesting ? '正在发送...' : '发送测试短信'}</span>
                </button>
              </div>

              {smsTestResult && (
                <div className={`p-3 rounded-xl text-xs ${
                  smsTestResult.success 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {smsTestResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{smsTestResult.msg} (测试凭证已生成并存入流水)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{smsTestResult.msg}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>

          {/* 预审短信模版一览表 */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h2 className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#0096DB]" />
                <span>享畅通已过审短信模版清单 (100% 精确复用)</span>
              </h2>
              <span className="text-xs text-zinc-400">已报备审核通过</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 font-medium">
                    <th className="py-2.5 px-3">场景代码 (Scene)</th>
                    <th className="py-2.5 px-3">业务用途</th>
                    <th className="py-2.5 px-3">模版实际下发内容</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">login</td>
                    <td className="py-3 px-3 font-medium text-slate-700">登录身份核验</td>
                    <td className="py-3 px-3 text-zinc-600 font-mono text-[11px]">
                      【{smsForm.sign || '成都享宇森云科技'}】您正在进行登录操作，验证码为：${'{validCode}'}，5分钟内有效，请勿向他人泄露。如非本人操作，请忽略！
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">register</td>
                    <td className="py-3 px-3 font-medium text-slate-700">新用户注册开户</td>
                    <td className="py-3 px-3 text-zinc-600 font-mono text-[11px]">
                      【{smsForm.sign || '成都享宇森云科技'}】您正在进行注册账号操作，验证码为：${'{validCode}'}，5分钟内有效，请勿向他人泄露。如非本人操作，请忽略！
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">change_pwd</td>
                    <td className="py-3 px-3 font-medium text-slate-700">修改登录密码</td>
                    <td className="py-3 px-3 text-zinc-600 font-mono text-[11px]">
                      【{smsForm.sign || '成都享宇森云科技'}】您正在进行修改密码操作，验证码为：${'{validCode}'}，5分钟内有效，请勿向他人泄露。如非本人操作，请忽略！
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">reset_pwd</td>
                    <td className="py-3 px-3 font-medium text-slate-700">找回重置密码</td>
                    <td className="py-3 px-3 text-zinc-600 font-mono text-[11px]">
                      【{smsForm.sign || '成都享宇森云科技'}】您正在进行找回密码操作，验证码为：${'{validCode}'}，5分钟内有效，请勿向他人泄露。如非本人操作，请忽略！
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 底部浮动保存条 (AI 配置有未保存修改时) */}
      {activeTab === 'ai' && isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-medium text-slate-200">AI 配置已发生更改，尚未保存至数据库</span>
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

      {/* 底部浮动保存条 (短信配置有未保存修改时) */}
      {activeTab === 'sms' && isSmsDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl bg-slate-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center justify-between animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span className="font-medium text-slate-200">短信配置已发生更改，尚未保存至数据库</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchSmsSettings}
              disabled={smsSaving}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              放弃修改
            </button>
            <button
              type="button"
              onClick={handleSaveSmsSettings}
              disabled={smsSaving}
              className="px-4 py-1.5 text-xs font-semibold rounded-xl text-white bg-[#0096DB] hover:bg-[#0084c2] transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className={`w-3.5 h-3.5 ${smsSaving ? 'animate-spin' : ''}`} />
              {smsSaving ? '保存中...' : '立即保存'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
