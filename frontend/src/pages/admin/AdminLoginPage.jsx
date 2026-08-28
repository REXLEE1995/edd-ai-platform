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
      <div className="max-w-md w-full shadcn-card bg-white p-8 space-y-6 border border-zinc-200 shadow-sm">
        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 rounded-lg bg-zinc-100 border border-zinc-200 mx-auto flex items-center justify-center text-slate-900 mb-2 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-slate-800" />
          </div>
          <h2 className="text-xl font-bold text-slate-950 tracking-tight">运营管理后台登录</h2>
          <p className="text-xs text-zinc-500">
            享宇智评尽调平台 · 运营/风控/财务管控中心
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">管理员账号</label>
            <div className="flex items-center bg-white rounded-md px-3.5 py-2.5 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
              <User className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
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
            <div className="flex items-center bg-white rounded-md px-3.5 py-2.5 border border-zinc-200 focus-within:border-slate-900 focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
              <Lock className="w-4 h-4 text-zinc-400 mr-2.5 shrink-0" />
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

          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs text-zinc-600">
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

        <div className="pt-4 border-t border-zinc-100 text-center text-xs">
          <Link to="/" className="text-zinc-500 hover:text-slate-900 transition-colors font-medium">
            ← 返回前台工作台
          </Link>
        </div>
      </div>
    </div>
  );
}
