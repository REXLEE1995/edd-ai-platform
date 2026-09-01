import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, User, Lock, ArrowRight } from 'lucide-react';
import { message } from 'antd';
import { useAuth } from '../../context/AuthContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { adminLogin } = useAuth();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminLogin(username, password);
      message.success('管理后台登录成功！');
      navigate('/admin/dashboard');
    } catch (err) {
      message.error(err.response?.data?.detail || '登录失败，请检查账号密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 text-slate-900">
      <div className="max-w-md w-full shadcn-card bg-white/85 backdrop-blur-2xl p-8 space-y-6 border border-white/90 shadow-glass">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-lg bg-white/80 p-1.5 border border-slate-200/80 mx-auto flex items-center justify-center mb-2 shadow-xs backdrop-blur-md overflow-hidden">
            <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">运营管理后台登录</h2>
          <p className="text-xs text-slate-500">
            享宇AI智评 · 运营/风控/财务管控中心
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">管理员账号</label>
            <div className="flex items-center bg-white/90 rounded-md px-3.5 py-2.5 border border-slate-200/90 focus-within:border-[#0096DB] focus-within:ring-2 focus-within:ring-[#0096DB]/20 transition-all">
              <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入管理员账号"
                className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">登录密码</label>
            <div className="flex items-center bg-white/90 rounded-md px-3.5 py-2.5 border border-slate-200/90 focus-within:border-[#0096DB] focus-within:ring-2 focus-within:ring-[#0096DB]/20 transition-all">
              <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码 (默认 admin123)"
                className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="p-3 rounded-md bg-cyan-50/60 border border-cyan-100 text-xs text-slate-600">
            <span>默认演示账号: <strong className="font-mono text-slate-900">admin</strong> | 密码: <strong className="font-mono text-slate-900">admin123</strong></span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="shadcn-button-primary w-full py-2.5 text-xs font-semibold"
          >
            {loading ? '验证中...' : '进入管理系统'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs">
          <Link to="/" className="text-slate-500 hover:text-[#0084c2] transition-colors font-medium">
            ← 返回前台工作台
          </Link>
        </div>
      </div>
    </div>
  );
}
