import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Compass, Phone, Lock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
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
      message.warning('请输入有效的11位手机号码');
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 text-slate-800">
      <div className="max-w-md w-full bg-white rounded-sm p-8 border border-slate-300 shadow-2xs relative">
        <div className="text-center">
          <div className="w-12 h-12 rounded-sm bg-sky-50 border border-sky-300 mx-auto flex items-center justify-center text-sky-700 mb-3 shadow-2xs">
            <img src="/brand_logo.png" alt="享宇智评" className="w-7 h-7 object-contain" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900">企业工作台登录 / 快速认证</h2>
          <p className="text-xs text-slate-500 mt-1">
            新用户手机号直登，即赠送 2 次完整 AI 全景尽调额度
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">手机号码</label>
            <div className="flex items-center bg-slate-50 rounded-sm px-3.5 py-2.5 border border-slate-300 focus-within:border-sky-600 focus-within:bg-white transition-colors">
              <Phone className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入手机号"
                className="w-full bg-transparent border-0 text-xs text-slate-800 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">短信验证码</label>
            <div className="flex items-center bg-slate-50 rounded-sm px-3.5 py-2.5 border border-slate-300 focus-within:border-sky-600 focus-within:bg-white transition-colors">
              <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="验证码 (本地默认 123456)"
                className="w-full bg-transparent border-0 text-xs text-slate-800 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => message.info('测试验证码为: 123456')}
                className="text-xs text-sky-700 hover:text-sky-800 font-semibold shrink-0 ml-2"
              >
                获取验证码
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 rounded-sm bg-sky-700 hover:bg-sky-800 text-xs font-bold text-white shadow-2xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? '身份校验中...' : '立即登录工作台'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-xs text-slate-400">
          <span>登录即代表同意并遵守</span>
          <span className="text-slate-600 hover:underline mx-1 cursor-pointer">《用户服务协议》</span>
          <span>与</span>
          <span className="text-slate-600 hover:underline mx-1 cursor-pointer">《金融级隐私政策》</span>
        </div>
      </div>
    </div>
  );
}
