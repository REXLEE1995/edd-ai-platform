import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Zap, 
  User as UserIcon, 
  LogOut, 
  CreditCard,
  LayoutDashboard,
  Receipt,
  Clock,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, admin, userLogout, adminLogout } = useAuth();
  const [userDropdown, setUserDropdown] = useState(false);

  const pathname = location.pathname;
  const isSaaSPath = pathname.startsWith('/app');
  const isAdminPath = pathname.startsWith('/admin');
  const isSharePath = pathname.startsWith('/share');

  // 分享报告页面具有专属单体顶栏
  if (isSharePath) {
    return null;
  }

  // 1. 后台管理系统独立导航
  if (isAdminPath) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_4px_20px_-2px_rgba(0,150,219,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          <div className="flex items-center space-x-5">
            <Link to="/admin/dashboard" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-md bg-white/80 p-1 border border-slate-200/80 shadow-xs flex items-center justify-center backdrop-blur-md overflow-hidden">
                <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-900">
                  享宇AI智评 Admin
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-cyan-50/80 text-[#0084c2] border border-cyan-200/60 backdrop-blur-sm">
                  运营管控
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200/70">
              {[
                { to: '/admin/dashboard', label: '运营大盘' },
                { to: '/admin/users', label: '用户管理' },
                { to: '/admin/quota', label: '额度调控' },
                { to: '/admin/orders', label: '订单财务' },
                { to: '/admin/settings', label: 'AI 模型与 Token 配置' }
              ].map((item) => (
                <Link 
                  key={item.to}
                  to={item.to} 
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    pathname === item.to 
                      ? 'bg-cyan-50/80 text-[#0084c2] font-semibold border border-cyan-200/60 shadow-xs' 
                      : 'text-slate-600 hover:text-[#0096DB] hover:bg-white/60'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {admin ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-600 hidden sm:inline">
                  管理员: <strong className="text-slate-900 font-mono">{admin.username || 'admin'}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    adminLogout();
                    navigate('/admin/login');
                  }}
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-white/70 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200/80 transition-all cursor-pointer backdrop-blur-md"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1" />
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="shadcn-button-primary px-3 py-1.5 text-xs"
              >
                管理员登录
              </Link>
            )}
          </div>

        </div>
      </header>
    );
  }

  // 2. 发起尽调平台专属导航
  if (isSaaSPath) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_4px_20px_-2px_rgba(0,150,219,0.03)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-5">
            <Link to="/app" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-md bg-white/80 p-1 border border-white/80 shadow-xs flex items-center justify-center overflow-hidden backdrop-blur-md">
                <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-sm tracking-tight text-slate-900">
                享宇AI智评
              </span>
            </Link>

            {/* 顶栏主菜单：只保留「发起尽调」与「任务中心」 */}
            <nav className="hidden md:flex items-center space-x-1.5 pl-4 border-l border-slate-200/70">
              <Link 
                to="/app" 
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  pathname === '/app' 
                    ? 'bg-cyan-50/90 text-[#0284c7] font-semibold border border-cyan-200/70 shadow-xs backdrop-blur-md' 
                    : 'text-slate-600 hover:text-[#0ea5e9] hover:bg-white/60'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-[#0ea5e9]" />
                发起尽调
              </Link>
              <Link 
                to="/app/tasks" 
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  pathname.startsWith('/app/tasks') || pathname.startsWith('/app/reports') 
                    ? 'bg-cyan-50/90 text-[#0284c7] font-semibold border border-cyan-200/70 shadow-xs backdrop-blur-md' 
                    : 'text-slate-600 hover:text-[#0ea5e9] hover:bg-white/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-[#0ea5e9]" />
                任务中心 (含历史报告)
              </Link>
            </nav>
          </div>

          {/* 右侧：额度胶囊与个人中心头像下拉 */}
          <div className="flex items-center space-x-3">
            {user && (
              <Link 
                to="/app/profile?tab=billing" 
                className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-cyan-50/70 hover:bg-cyan-100/70 border border-cyan-200/60 text-[#0284c7] text-xs font-medium transition-all backdrop-blur-md shadow-xs group"
                title="点击前往额度充值"
              >
                <span className={`w-2 h-2 rounded-full ${(user.balance_quota ?? 0) > 0 ? 'bg-[#0ea5e9] shadow-sm shadow-[#0ea5e9]/40' : 'bg-amber-500'}`}></span>
                <span className="text-[#0284c7]">剩余额度:</span>
                <span className="font-mono text-xs text-[#0284c7] font-bold">
                  {user.balance_quota ?? 0} 次
                </span>
              </Link>
            )}

            {/* 用户菜单下拉 */}
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center space-x-2 p-1 pl-2 pr-2.5 rounded-md hover:bg-white/80 transition-all border border-transparent hover:border-slate-200/70 cursor-pointer backdrop-blur-md"
                >
                  <div className="w-7 h-7 rounded-md bg-gradient-to-br from-sky-400 to-[#29B47D] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white/40">
                    {user.phone ? user.phone.slice(-2) : 'XY'}
                  </div>
                  <span className="text-xs font-medium text-slate-700 hidden sm:inline font-mono">
                    {user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '用户'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdown && (
                  <div 
                    className="absolute right-0 mt-2 w-52 bg-white/80 backdrop-blur-2xl rounded-xl shadow-xl border border-white/85 py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                    onMouseLeave={() => setUserDropdown(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-slate-100/80">
                      <p className="font-bold text-slate-950">{user.company_name || '个人用户'}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user.phone}</p>
                    </div>
                    <div className="py-1">
                      <Link 
                        to="/app/profile?tab=profile" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3.5 py-2 text-slate-700 hover:text-[#0284c7] hover:bg-cyan-50/50 transition-colors font-medium"
                      >
                        <UserIcon className="w-3.5 h-3.5 mr-2 text-[#0ea5e9]" />
                        个人中心
                      </Link>
                      <Link 
                        to="/app/profile?tab=billing" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3.5 py-2 text-slate-700 hover:text-[#0284c7] hover:bg-cyan-50/50 transition-colors font-medium"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-2 text-[#0ea5e9]" />
                        额度充值加油包
                      </Link>
                      <Link 
                        to="/app/profile?tab=transactions" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3.5 py-2 text-slate-700 hover:text-[#0284c7] hover:bg-cyan-50/50 transition-colors font-medium"
                      >
                        <Receipt className="w-3.5 h-3.5 mr-2 text-[#0ea5e9]" />
                        额度变动流水明细
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-slate-100/80">
                      <button 
                        type="button"
                        onClick={() => {
                          userLogout();
                          setUserDropdown(false);
                          navigate('/auth/login');
                        }}
                        className="w-full text-left flex items-center px-3.5 py-2 text-rose-600 hover:bg-rose-50/80 transition-colors font-medium cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 mr-2" />
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/auth/login"
                className="shadcn-button-primary px-3.5 py-1.5 text-xs"
              >
                注册/登录
              </Link>
            )}
          </div>

        </div>
      </header>
    );
  }

  // 3. 宣传官网专属导航
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/70 bg-white/70 backdrop-blur-xl shadow-[0_4px_20px_-2px_rgba(0,150,219,0.03)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        <div className="flex items-center space-x-5">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-md bg-white/80 p-1 border border-slate-200/80 shadow-xs flex items-center justify-center backdrop-blur-md overflow-hidden">
              <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              享宇AI智评
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-2.5">
          {user ? (
            <Link 
              to="/app"
              className="shadcn-button-primary px-3.5 py-1.5 text-xs shadow-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              进入工作台
            </Link>
          ) : (
            <div className="flex items-center space-x-2">
              <Link 
                to="/auth/login"
                className="shadcn-button-primary px-3.5 py-1.5 text-xs shadow-xs"
              >
                注册/登录
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
