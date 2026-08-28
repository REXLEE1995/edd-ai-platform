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

  // 1. 后台管理系统独立导航
  if (isAdminPath) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/85 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          <div className="flex items-center space-x-5">
            <Link to="/admin/dashboard" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-md bg-white border border-zinc-200 shadow-2xs flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-slate-900" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-900">
                  享宇智评 Admin
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                  运营管控
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-zinc-200">
              {[
                { to: '/admin/dashboard', label: '运营大盘' },
                { to: '/admin/users', label: '用户管理' },
                { to: '/admin/quota', label: '额度调控' },
                { to: '/admin/orders', label: '订单财务' }
              ].map((item) => (
                <Link 
                  key={item.to}
                  to={item.to} 
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    pathname === item.to 
                      ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
                  className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-zinc-200 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1" />
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-2xs"
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
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/85 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-5">
            <Link to="/app" className="flex items-center space-x-2.5 group">
              <div className="w-8 h-8 rounded-md bg-white p-1 border border-zinc-200 shadow-2xs flex items-center justify-center overflow-hidden">
                <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-tight text-slate-900">
                  享宇智评尽调平台
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                  商业版
                </span>
              </div>
            </Link>

            {/* 顶栏主菜单：只保留「发起尽调」与「任务中心」 */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-zinc-200">
              <Link 
                to="/app" 
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/app' 
                    ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-slate-700" />
                发起尽调
              </Link>
              <Link 
                to="/app/tasks" 
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/app/tasks') || pathname.startsWith('/app/reports') 
                    ? 'bg-slate-100 text-slate-900 font-semibold shadow-2xs' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-slate-700" />
                任务中心 (含历史报告)
              </Link>
            </nav>
          </div>

          {/* 右侧：额度胶囊与个人中心头像下拉 */}
          <div className="flex items-center space-x-3">
            {user && (
              <Link 
                to="/app/profile?tab=billing" 
                className="flex items-center space-x-2 px-3 py-1.5 rounded-md bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 text-slate-800 text-xs font-medium transition-colors shadow-2xs"
                title="点击前往额度充值"
              >
                <span className={`w-2 h-2 rounded-full ${(user.balance_quota ?? 0) > 0 ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                <span className="text-slate-500">剩余额度:</span>
                <span className="font-mono text-xs text-slate-900 font-bold">
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
                  className="flex items-center space-x-2 p-1 pl-2 pr-2.5 rounded-md hover:bg-zinc-100 transition-colors border border-transparent hover:border-zinc-200 cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user.phone ? user.phone.slice(-2) : 'XY'}
                  </div>
                  <span className="text-xs font-medium text-slate-700 hidden sm:inline font-mono">
                    {user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '用户'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdown && (
                  <div 
                    className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-zinc-200 py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                    onMouseLeave={() => setUserDropdown(false)}
                  >
                    <div className="px-3.5 py-2 border-b border-zinc-100">
                      <p className="font-bold text-slate-900">{user.company_name || '个人用户'}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user.phone}</p>
                    </div>
                    <div className="py-1">
                      <Link 
                        to="/app/profile?tab=profile" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-zinc-50 transition-colors font-medium"
                      >
                        <UserIcon className="w-3.5 h-3.5 mr-2 text-slate-500" />
                        个人中心
                      </Link>
                      <Link 
                        to="/app/profile?tab=billing" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-zinc-50 transition-colors font-medium"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-2 text-slate-500" />
                        额度充值加油包
                      </Link>
                      <Link 
                        to="/app/profile?tab=transactions" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3.5 py-2 text-slate-700 hover:text-slate-900 hover:bg-zinc-50 transition-colors font-medium"
                      >
                        <Receipt className="w-3.5 h-3.5 mr-2 text-slate-500" />
                        额度变动流水明细
                      </Link>
                    </div>
                    <div className="pt-1 border-t border-zinc-100">
                      <button 
                        type="button"
                        onClick={() => {
                          userLogout();
                          setUserDropdown(false);
                          navigate('/auth/login');
                        }}
                        className="w-full text-left flex items-center px-3.5 py-2 text-rose-600 hover:bg-rose-50 transition-colors font-medium cursor-pointer"
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
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors"
              >
                登录工作台
              </Link>
            )}
          </div>

        </div>
      </header>
    );
  }

  // 3. 宣传官网专属导航
  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/85 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        
        <div className="flex items-center space-x-5">
          <Link to="/" className="flex items-center space-x-2.5 group">
            <div className="w-8 h-8 rounded-md bg-white p-1 border border-zinc-200 shadow-2xs flex items-center justify-center">
              <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-slate-900">
                享宇智评 · XY AI Platform
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-zinc-100 text-zinc-700 border border-zinc-200">
                v2.1
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-2.5">
          {user ? (
            <Link 
              to="/app"
              className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              进入工作台
            </Link>
          ) : (
            <div className="flex items-center space-x-2">
              <Link 
                to="/auth/login"
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-zinc-100 transition-colors"
              >
                登录
              </Link>
              <Link 
                to="/app"
                className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-md text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-colors"
              >
                免费体验
              </Link>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
