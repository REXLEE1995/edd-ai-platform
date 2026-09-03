import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, Lock, ArrowRight } from 'lucide-react';
import { message } from 'antd';
import apiClient from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { userLogin } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      message.warning('请先输入有效的 11 位手机号码');
      return;
    }
    setSendLoading(true);
    try {
      const res = await apiClient.post('/v1/auth/send-code', { phone, scene: 'login' });
      setCountdown(60);
      message.success(res?.message || '短信验证码已成功发送至您的手机，5分钟内有效，请查收！');
    } catch (err) {
      message.error(err.response?.data?.detail || '短信发送失败，请稍后重试');
    } finally {
      setSendLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 11) {
      message.warning('请输入有效的 11 位手机号码');
      return;
    }
    if (!code) {
      message.warning('请输入短信验证码');
      return;
    }

    setLoading(true);
    try {
      const res = await userLogin(phone, code);
      if (res?.is_new_user) {
        message.success('注册并登录成功！已为您赠送 1 次免费尽调体验额度');
      } else {
        message.success(res?.message || '登录成功，欢迎回到工作台！');
      }
      navigate('/app');
    } catch (err) {
      message.error(err.response?.data?.detail || '认证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 text-slate-900">
      <div className="max-w-md w-full shadcn-card p-8 bg-white space-y-6 shadow-sm border border-zinc-200">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto flex items-center justify-center mb-2">
            <img src="/brand_logo.png" alt="享宇AI智评" className="w-10 h-10 object-contain" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">手机快捷 注册/登录</h2>
          <p className="text-xs text-zinc-500">
            未注册手机号将自动创建账号并赠送 1 次免费 AI 全景尽调额度
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
                placeholder="请输入 11 位手机号"
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
                placeholder="请输入 6 位短信验证码"
                className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-zinc-400"
                maxLength={6}
                required
              />
              <button
                type="button"
                disabled={countdown > 0}
                onClick={handleSendCode}
                className={`text-xs font-medium shrink-0 ml-2 cursor-pointer transition-colors ${
                  countdown > 0 ? 'text-zinc-400 cursor-not-allowed' : 'text-[#0096DB] hover:text-[#007cb3] hover:underline'
                }`}
              >
                {countdown > 0 ? `${countdown}s 后重试` : '获取验证码'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="shadcn-button-primary w-full py-2.5 text-xs font-semibold shadow-xs"
          >
            {loading ? '正在核验身份...' : '注册/登录'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-zinc-100 text-center text-xs text-zinc-400">
          <span>登录/注册即代表同意并遵守</span>
          <span className="text-zinc-600 hover:underline mx-1 cursor-pointer">《用户服务协议》</span>
          <span>与</span>
          <span className="text-zinc-600 hover:underline mx-1 cursor-pointer">《金融级隐私政策》</span>
        </div>
      </div>
    </div>
  );
}
