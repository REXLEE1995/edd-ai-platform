import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, User, Lock, ArrowRight } from 'lucide-react';
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-sm p-8 border border-slate-300 shadow-2xs relative overflow-hidden">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xs bg-sky-50 border border-sky-300 mx-auto flex items-center justify-center text-sky-700 mb-4 shadow-2xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">运营管理后台登录</h2>
          <p className="text-xs text-slate-500 mt-1.5 font-medium">
            享宇智评尽调平台 · 运营/风控/财务管控中心
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-8 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">管理员账号</label>
            <div className="flex items-center bg-slate-50 rounded-sm px-3 py-2.5 border border-slate-300 focus-within:border-sky-500 focus-within:bg-white transition-all">
              <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入管理员账号"
                className="w-full bg-transparent border-0 text-xs text-slate-800 focus:outline-none font-mono font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">登录密码</label>
            <div className="flex items-center bg-slate-50 rounded-sm px-3 py-2.5 border border-slate-300 focus-within:border-sky-500 focus-within:bg-white transition-all">
              <Lock className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码 (默认 admin123)"
                className="w-full bg-transparent border-0 text-xs text-slate-800 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-3 rounded-sm bg-sky-50 border border-sky-300 text-[11px] text-sky-800 font-medium">
            <span>默认演示账号: <strong className="font-mono">admin</strong> | 密码: <strong className="font-mono">admin123</strong></span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 rounded-sm bg-sky-700 hover:bg-sky-800 text-xs font-bold text-white shadow-2xs transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? '验证中...' : '进入管理系统'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center text-[11px] text-slate-500">
          <Link to="/" className="text-slate-500 hover:text-slate-900 transition-colors font-medium">
            ← 返回前台工作台
          </Link>
        </div>
      </div>
    </div>
  );
}
