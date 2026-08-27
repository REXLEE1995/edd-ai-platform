import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Compass, 
  ShieldCheck, 
  Layers, 
  FileText, 
  Zap, 
  User as UserIcon, 
  LogOut, 
  CreditCard,
  LayoutDashboard,
  Users,
  Receipt,
  Settings,
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
  const isPortalPath = pathname === '/';

  // 1. 后台管理系统独立导航
  if (isAdminPath) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-slate-300 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          <div className="flex items-center space-x-6">
            <Link to="/admin/dashboard" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-sm bg-white border border-slate-300 shadow-2xs flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-sky-700" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                  享宇智评 Admin
                  <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">
                    运营管控
                  </span>
                </span>
                <span className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block font-medium">企业尽调平台运营管控中心</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
              <Link 
                to="/admin/dashboard" 
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                  pathname === '/admin/dashboard' ? 'text-sky-900 bg-sky-50 font-bold border-b-2 border-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                运营大盘
              </Link>
              <Link 
                to="/admin/users" 
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                  pathname === '/admin/users' ? 'text-sky-900 bg-sky-50 font-bold border-b-2 border-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                注册用户管理
              </Link>
              <Link 
                to="/admin/quota" 
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                  pathname === '/admin/quota' ? 'text-sky-900 bg-sky-50 font-bold border-b-2 border-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                额度调控流水
              </Link>
              <Link 
                to="/admin/orders" 
                className={`px-3 py-1.5 rounded-sm text-xs font-semibold transition-colors ${
                  pathname === '/admin/orders' ? 'text-sky-900 bg-sky-50 font-bold border-b-2 border-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                订单与财务
              </Link>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {admin ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-700 hidden sm:inline">
                  管理员: <strong className="text-sky-800 font-mono">{admin.username || 'admin'}</strong>
                </span>
                <button
                  onClick={() => {
                    adminLogout();
                    navigate('/admin/login');
                  }}
                  className="px-3 py-1.5 rounded-sm text-xs font-semibold bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1" />
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="px-3.5 py-1.5 rounded-sm text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-2xs"
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
      <header className="sticky top-0 z-50 w-full border-b border-slate-300 bg-white/95 backdrop-blur-md shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-6">
            <Link to="/app" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-sm bg-white p-1 border border-slate-300 shadow-2xs flex items-center justify-center overflow-hidden">
                <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                  享宇智评尽调平台
                  <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">
                    商业版
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block font-medium">企业全景尽调与报告查阅平台</span>
              </div>
            </Link>

            {/* 顶栏主菜单：只保留「发起尽调」与「任务中心」 */}
            <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
              <Link 
                to="/app" 
                className={`px-4 py-2 rounded-sm text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname === '/app' ? 'text-sky-900 bg-sky-50 font-bold border-b-2 border-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-sky-700" />
                发起尽调
              </Link>
              <Link 
                to="/app/tasks" 
                className={`px-4 py-2 rounded-sm text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  pathname.startsWith('/app/tasks') || pathname.startsWith('/app/reports') ? 'text-sky-900 bg-sky-50 font-bold border-b-2 border-sky-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-sky-700" />
                任务中心 (含历史报告)
              </Link>
            </nav>
          </div>

          {/* 右侧：额度胶囊与个人中心头像下拉 */}
          <div className="flex items-center space-x-3">
            {user && (
              <Link 
                to="/app/profile?tab=billing" 
                className="flex items-center space-x-2 px-3 py-1.5 rounded-sm bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 text-xs font-semibold transition-colors group shadow-2xs"
                title="点击前往额度充值"
              >
                <span className={`w-2 h-2 rounded-full ${(user.balance_quota ?? 0) > 0 ? 'bg-teal-500' : 'bg-amber-500'}`}></span>
                <span>剩余额度:</span>
                <span className="font-mono text-sm text-sky-800 font-bold">
                  {user.balance_quota ?? 0}
                </span>
                <span className="text-[10px] text-sky-700">次</span>
                <CreditCard className="w-3.5 h-3.5 text-sky-700 ml-1" />
              </Link>
            )}

            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center space-x-2 p-1.5 rounded-sm border border-slate-300 hover:bg-slate-50 bg-white transition-colors text-xs shadow-2xs"
                >
                  <div className="w-7 h-7 rounded-xs bg-sky-700 flex items-center justify-center font-extrabold text-white text-xs">
                    雄
                  </div>
                  <div className="text-left hidden sm:block">
                    <span className="text-slate-900 font-bold block leading-none">大雄</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{user.phone}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdown && (
                  <div className="absolute right-0 mt-1.5 w-56 rounded-sm bg-white border border-slate-300 shadow-lg py-1.5 z-50 text-xs divide-y divide-slate-100">
                    <div className="px-4 py-2.5 bg-slate-50 text-slate-600">
                      <p className="font-extrabold text-slate-900 truncate">大雄</p>
                      <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{user.phone} · 个人实名用户</p>
                    </div>
                    <div className="py-1">
                      <Link 
                        to="/app/profile?tab=profile" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-4 py-2 text-slate-700 hover:text-sky-800 hover:bg-sky-50 transition-colors font-medium"
                      >
                        <UserIcon className="w-3.5 h-3.5 mr-2.5 text-sky-700" />
                        个人中心
                      </Link>
                      <Link 
                        to="/app/profile?tab=billing" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-4 py-2 text-slate-700 hover:text-sky-800 hover:bg-sky-50 transition-colors font-medium"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-2.5 text-sky-700" />
                        额度充值加油包
                      </Link>
                      <Link 
                        to="/app/profile?tab=transactions" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-4 py-2 text-slate-700 hover:text-sky-800 hover:bg-sky-50 transition-colors font-medium"
                      >
                        <Receipt className="w-3.5 h-3.5 mr-2.5 text-sky-700" />
                        额度变动流水明细
                      </Link>
                    </div>
                    <button 
                      onClick={() => {
                        userLogout();
                        setUserDropdown(false);
                        navigate('/auth/login');
                      }}
                      className="w-full text-left flex items-center px-4 py-2 text-rose-700 hover:bg-rose-50 transition-colors font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5 mr-2.5" />
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/auth/login"
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-sm text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-2xs transition-colors"
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
    <header className="sticky top-0 z-50 w-full border-b border-slate-300 bg-white/95 backdrop-blur-md shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        <div className="flex items-center space-x-6">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-sm bg-white p-1 border border-slate-300 shadow-2xs flex items-center justify-center">
              <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                享宇智评尽调平台
                <span className="text-[10px] px-1.5 py-0.2 rounded-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">v2.1</span>
              </span>
              <span className="text-[11px] text-slate-500 -mt-0.5 hidden sm:block font-medium">企业全景尽调与报告查阅平台</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <Link 
              to="/app"
              className="inline-flex items-center justify-center px-4 py-2 rounded-sm text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-2xs transition-colors gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              进入尽调工作台
            </Link>
          ) : (
            <div className="flex items-center space-x-2">
              <Link 
                to="/auth/login"
                className="px-3.5 py-1.5 rounded-sm text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                登录
              </Link>
              <Link 
                to="/app"
                className="inline-flex items-center justify-center px-4 py-1.5 rounded-sm text-xs font-bold bg-sky-700 hover:bg-sky-800 text-white shadow-2xs transition-colors"
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
