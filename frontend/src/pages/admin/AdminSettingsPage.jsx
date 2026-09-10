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
  FileText
} from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';

export default function AdminSettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'ai';

  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // 1. AI 大模型配置状态
  const [settings, setSettings] = useState({
    llm_provider: 'newapi',
    new_api_base_url: 'http://192.168.110.234:3000/v1',
    new_api_key_masked: '',
    has_key: false,
    new_api_model: 'xyzp-ai',
    temperature: 0.3,
    timeout_seconds: 60,
    is_enabled: true,
  });

  const [aiForm, setAiForm] = useState({
    llm_provider: 'newapi',
    new_api_base_url: 'http://192.168.110.234:3000/v1',
    new_api_key: '',
    new_api_model: 'xyzp-ai',
    temperature: 0.3,
    timeout_seconds: 60,
    is_enabled: true
  });
  const [aiSaving, setAiSaving] = useState(false);

  // AI 连通性测试诊断结果
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
          new_api_model: d.new_api_model || 'xyzp-ai',
          temperature: d.temperature ?? 0.3,
          timeout_seconds: d.timeout_seconds ?? 60,
          is_enabled: d.is_enabled ?? true,
        });

        setAiForm({
          llm_provider: d.llm_provider || 'newapi',
          new_api_base_url: d.new_api_base_url || 'http://127.0.0.1:3000/v1',
          new_api_key: '',
          new_api_model: d.new_api_model || 'xyzp-ai',
          temperature: d.temperature ?? 0.3,
          timeout_seconds: d.timeout_seconds ?? 60,
          is_enabled: d.is_enabled ?? true
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

  // 保存大模型配置 (单独修改)
  const handleSaveAiSettings = async (e) => {
    if (e) e.preventDefault();
    setAiSaving(true);
    try {
      const payload = {
        llm_provider: aiForm.llm_provider,
        new_api_base_url: aiForm.new_api_base_url,
        new_api_model: aiForm.new_api_model,
        temperature: parseFloat(aiForm.temperature),
        timeout_seconds: parseInt(aiForm.timeout_seconds, 10),
        is_enabled: Boolean(aiForm.is_enabled)
      };
      if (aiForm.new_api_key && !aiForm.new_api_key.includes('••••')) {
        payload.new_api_key = aiForm.new_api_key.trim();
      }
      const res = await apiClient.post('/admin/settings/ai', payload);
      message.success(res?.message || 'AI 大模型配置已成功保存并实时生效！');
      fetchSettings();
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || '保存失败';
      message.error('保存大模型配置失败: ' + errMsg);
    } finally {
      setAiSaving(false);
    }
  };

  // 2. 短信服务配置状态
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
  const [smsSaving, setSmsSaving] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsTestPhone, setSmsTestPhone] = useState('');
  const [smsTestResult, setSmsTestResult] = useState(null);

  // 获取当前短信配置
  const fetchSmsSettings = async () => {
    try {
      const res = await apiClient.get('/admin/settings/sms');
      const d = res?.data || res;
      if (d) {
        setSmsSettings(d);
        setSmsForm({
          name: d.name || '',
          key: d.key_masked || '',
          sign: d.sign || '成都享宇森云科技',
          url: d.url || 'http://api.xct.com/sms/send',
          is_open: Boolean(d.is_open)
        });
      }
    } catch (err) {
      console.error('获取短信配置失败:', err);
    }
  };

  // 保存短信配置 (商户账号、密码、短信签名一并保存)
  const handleSaveSmsSettings = async (e) => {
    if (e) e.preventDefault();
    setSmsSaving(true);
    try {
      const payload = {
        name: smsForm.name,
        sign: smsForm.sign,
        url: smsForm.url,
        is_open: smsForm.is_open
      };
      if (smsForm.key && !smsForm.key.includes('••••')) {
        payload.key = smsForm.key;
      }
      const res = await apiClient.post('/admin/settings/sms', payload);
      message.success('短信配置（商户账号、密码、短信签名）已成功保存并生效！');
      fetchSmsSettings();
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || '保存失败';
      message.error('保存短信配置失败: ' + errMsg);
    } finally {
      setSmsSaving(false);
    }
  };

  // 发送测试短信探针
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
      if (res?.code !== 0) {
        message.error(res?.message || '测试短信发送失败');
        setSmsTestResult({
          success: false,
          msg: res?.message || '发送失败',
          data: res?.data
        });
        return;
      }
      message.success(res?.message || '测试短信发送成功！');
      setSmsTestResult({
        success: true,
        msg: res?.message || '发送成功',
        data: res?.data
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

  useEffect(() => {
    fetchSettings();
    fetchSmsSettings();
  }, []);

  // 测试连通性
  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const payload = {
        provider: aiForm.llm_provider,
        base_url: aiForm.new_api_base_url,
        model: aiForm.new_api_model
      };
      if (aiForm.new_api_key && !aiForm.new_api_key.includes('••••')) {
        payload.api_key = aiForm.new_api_key.trim();
      }
      const res = await apiClient.post('/admin/settings/ai/test', payload);
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
          model: data?.model || aiForm.new_api_model,
          tested_at: nowStr
        });
      } else {
        message.error(`连通测试未通过: ${errorDetail || res?.message || '连接失败'}`);
        setTestResult({
          success: false,
          latency_ms: latency,
          error: errorDetail || res?.message || '连接被拒绝或模型未授权',
          model: data?.model || aiForm.new_api_model,
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

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6 text-slate-900">
      
      {/* 顶部标签页切换导航 (支持大模型配置与短信配置单独直达) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div>
          <h1 className="text-xl font-bold text-slate-950 tracking-tight flex items-center gap-2">
            <span>系统服务与外部集成配置</span>
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            可视化单独修改大模型推理参数与短信服务网关，支持数据库热更新与零停机生效
          </p>
        </div>

        {/* 顶部 Apple 风格选项卡切换 */}
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
            <span className={`w-1.5 h-1.5 rounded-full ${settings.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></span>
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
      {/* 模块 1: AI 大模型配置面板 (单独修改表单 + 实时诊断探针)                     */}
      {/* ========================================================================= */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          
          {/* 大模型编辑与保存卡片 */}
          <div className="shadcn-card bg-white p-6 border border-zinc-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#0096DB]" />
                <h2 className="font-bold text-sm text-slate-950">
                  AI 大模型引擎与参数设置 (可单独修改并保存)
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  settings.is_enabled 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${settings.is_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`}></span>
                  {settings.is_enabled ? '接口实时调用中' : '已暂停调用'}
                </span>
                <span className="text-[11px] font-mono text-zinc-400">
                  动态配置热生效
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveAiSettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* 1. 服务提供商 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-[#0096DB]" />
                    <span>服务提供商 (Provider)</span>
                  </label>
                  <select
                    value={aiForm.llm_provider}
                    onChange={(e) => setAiForm({ ...aiForm, llm_provider: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB] bg-white font-medium"
                  >
                    <option value="newapi">New-API 网关聚合调度 (推荐)</option>
                    <option value="deepseek">DeepSeek 官方直连 (OpenAI 协议)</option>
                    <option value="openai">OpenAI 官方兼容模式</option>
                    <option value="mock">本地拟真 Mock (离线开发/不调接口)</option>
                  </select>
                  <p className="text-[10px] text-zinc-400">推荐使用 New-API，自动实现多 Key 负载均衡与重试</p>
                </div>

                {/* 2. 调用模型名称 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#0096DB]" />
                    <span>调用模型名称 (Model)</span>
                  </label>
                  <input
                    type="text"
                    value={aiForm.new_api_model}
                    onChange={(e) => setAiForm({ ...aiForm, new_api_model: e.target.value })}
                    placeholder="例如: xyzp-ai 或 deepseek-chat"
                    className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                    required
                  />
                  <p className="text-[10px] text-zinc-400">业务统一调用代号，由网关重定向至真实模型</p>
                </div>

                {/* 3. API Key 令牌密钥 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>API Key 令牌密钥 (Token)</span>
                  </label>
                  <input
                    type="password"
                    value={aiForm.new_api_key}
                    onChange={(e) => setAiForm({ ...aiForm, new_api_key: e.target.value })}
                    placeholder={settings.has_key ? (settings.new_api_key_masked || '已配置，留空保持不变') : '请输入 API Key (sk-...)'}
                    className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                  />
                  <p className="text-[10px] text-zinc-400">
                    {settings.has_key ? '已配置有效密钥；输入新密钥会更新，留空保持原值' : '尚未配置 API Key'}
                  </p>
                </div>

                {/* 4. AI 服务端点 URL */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#0096DB]" />
                    <span>AI 服务端点 URL (Base URL)</span>
                  </label>
                  <input
                    type="text"
                    value={aiForm.new_api_base_url}
                    onChange={(e) => setAiForm({ ...aiForm, new_api_base_url: e.target.value })}
                    placeholder="http://192.168.110.234:3000/v1"
                    className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                    required
                  />
                  <p className="text-[10px] text-zinc-400">New-API 或 OpenAI 协议服务端点，例如: http://192.168.110.234:3000/v1</p>
                </div>

                {/* 5. 采样温度 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#0096DB]" />
                    <span>采样温度 (Temperature: {aiForm.temperature})</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={aiForm.temperature}
                    onChange={(e) => setAiForm({ ...aiForm, temperature: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                  />
                  <p className="text-[10px] text-zinc-400">企业尽调严谨场景建议 0.2 ~ 0.4</p>
                </div>

                {/* 6. 超时时间 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>请求超时时间 (秒)</span>
                  </label>
                  <input
                    type="number"
                    step="5"
                    min="5"
                    max="300"
                    value={aiForm.timeout_seconds}
                    onChange={(e) => setAiForm({ ...aiForm, timeout_seconds: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                  />
                  <p className="text-[10px] text-zinc-400">长文本尽调生成建议 60 ~ 120 秒</p>
                </div>

                {/* 7. 调用开关 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">网关调用开关</label>
                  <select
                    value={aiForm.is_enabled ? 'true' : 'false'}
                    onChange={(e) => setAiForm({ ...aiForm, is_enabled: e.target.value === 'true' })}
                    className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB] bg-white font-medium"
                  >
                    <option value="true">开启大模型调用 (生产模式)</option>
                    <option value="false">暂停调用 (自动触发本地保底拟真)</option>
                  </select>
                </div>

              </div>

              {/* 保存操作栏 */}
              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <div className="text-[11px] text-zinc-500">
                  修改后点击保存立即热生效至全站尽调生成与报告会话模块，无需重启后端服务
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={testing || loading}
                    className="shadcn-button-outline text-xs py-2 px-4 flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
                    <span>{testing ? '诊断中...' : '测试当前参数'}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={aiSaving}
                    className="shadcn-button-primary text-xs py-2 px-5 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Save className={`w-3.5 h-3.5 ${aiSaving ? 'animate-spin' : ''}`} />
                    <span>{aiSaving ? '正在保存...' : '保存大模型配置'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* 连通性诊断与响应探针卡片 */}
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
                    <p className="font-mono text-rose-800 break-words leading-relaxed">{testResult.error || '连接被拒绝或模型未响应，请检查服务端点或 Token'}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center space-y-2 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
                <Activity className="w-6 h-6 text-zinc-300 mx-auto" />
                <p className="text-xs text-zinc-500">点击右上角「⚡ 测试当前参数」可即时向后端大模型发送探测请求并展示实时延迟与状态</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 模块 2: 享畅通短信网关与签名配置面板                                      */}
      {/* ========================================================================= */}
      {activeTab === 'sms' && (
        <div className="space-y-6">
          
          {/* 短信网关参数配置卡片 */}
          <div className="shadcn-card bg-white p-6 border border-zinc-200 shadow-xs space-y-6">
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
                    className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                  />
                </div>

                {/* 商户密码/密钥 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">商户密码/密钥 (Key / Secret)</label>
                  <input
                    type="password"
                    value={smsForm.key}
                    onChange={(e) => setSmsForm({ ...smsForm, key: e.target.value })}
                    placeholder={smsSettings.has_key ? '已配置，留空保持不变' : '请输入商户通信密钥'}
                    className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                  />
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
                    className="w-full text-xs font-semibold px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
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
                    placeholder="https://sms-api.xxx.com/sms/send"
                    className="w-full text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                  />
                  <p className="text-[10px] text-zinc-400">服务商分配的生产 HTTP GET 网关地址（通常需配置服务器公网 IP 白名单）</p>
                </div>

                {/* 发送开关 */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">短信外发模式</label>
                  <select
                    value={smsForm.is_open ? 'true' : 'false'}
                    onChange={(e) => setSmsForm({ ...smsForm, is_open: e.target.value === 'true' })}
                    className="w-full text-xs px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB] bg-white"
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
                  className="shadcn-button-primary text-xs py-2 px-4 flex items-center gap-1.5 cursor-pointer shadow-xs"
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
                  className="flex-1 max-w-sm text-xs font-mono px-3 py-2 border border-zinc-200 rounded-lg focus:outline-none focus:border-[#0096DB]"
                />
                <button
                  type="button"
                  onClick={handleTestSms}
                  disabled={smsTesting}
                  className="text-xs py-2 px-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${smsTesting ? 'animate-spin' : ''}`} />
                  <span>{smsTesting ? '正在发送...' : '发送测试短信'}</span>
                </button>
              </div>

              {smsTestResult && (
                <div className={`p-3 rounded-lg text-xs ${
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
          <div className="shadcn-card bg-white p-6 border border-zinc-200 shadow-xs space-y-4">
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

    </div>
  );
}
