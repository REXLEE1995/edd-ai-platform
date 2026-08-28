import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, Sparkles, ArrowRight } from 'lucide-react';
import { message } from 'antd';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { userLogin } = useAuth();
  const [phone, setPhone] = useState('13800138000');
  const [code, setCode] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 11) {
      message.warning('请输入有效的 11 位手机号码');
      return;
    }

    setLoading(true);
    try {
      await userLogin(phone, code);
      message.success('登录成功！已赠送 2 次免费尽调体验额度');
      navigate('/app');
    } catch (err) {
      message.error(err.response?.data?.detail || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 text-slate-900">
      <div className="max-w-md w-full shadcn-card p-8 bg-white space-y-6 shadow-sm border border-zinc-200">
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-lg bg-zinc-100 border border-zinc-200 mx-auto flex items-center justify-center text-slate-900 mb-2 shadow-2xs">
            <img src="/brand_logo.png" alt="享宇智评" className="w-6 h-6 object-contain" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">企业工作台登录 / 快速认证</h2>
          <p className="text-xs text-zinc-500">
            新用户手机号直登，即赠送 2 次完整 AI 全景尽调额度
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">手机号码</label>
            <div className="flex items-center bg-white rounded-md px-3.5 py-2.5 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
              <Phone className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-zinc-400"
                maxLength={11}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">短信验证码</label>
            <div className="flex items-center bg-white rounded-md px-3.5 py-2.5 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
              <Lock className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="验证码 (本地默认 123456)"
                className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-zinc-400"
                required
              />
              <button
                type="button"
                onClick={() => message.info('测试验证码为: 123456')}
                className="text-xs text-slate-700 hover:text-slate-900 font-medium shrink-0 ml-2 hover:underline cursor-pointer"
              >
                获取验证码
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="shadcn-button-primary w-full py-2.5 text-xs font-semibold shadow-xs"
          >
            {loading ? '身份校验中...' : '立即登录工作台'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-zinc-100 text-center text-xs text-zinc-400">
          <span>登录即代表同意并遵守</span>
          <span className="text-zinc-600 hover:underline mx-1 cursor-pointer">《用户服务协议》</span>
          <span>与</span>
          <span className="text-zinc-600 hover:underline mx-1 cursor-pointer">《金融级隐私政策》</span>
        </div>
      </div>
    </div>
  );
}
