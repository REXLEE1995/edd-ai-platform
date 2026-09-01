import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Zap, 
  User as UserIcon, 
  LogOut, 
  CreditCard,
  Receipt,
  Clock,
  ChevronDown,
  LayoutDashboard,
  Users,
  Sliders,
  Sparkles,
  Bot
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
      <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-2xl border-b border-slate-200/90 shadow-[0_4px_24px_-2px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[66px] flex items-center justify-between">
          
          <div className="flex items-center space-x-6">
            <Link to="/admin/dashboard" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-white p-1.5 border border-slate-200/80 shadow-xs flex items-center justify-center backdrop-blur-md overflow-hidden group-hover:border-[#0ea5e9]/50 transition-colors">
                <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[15px] tracking-tight text-slate-950">
                  享宇AI智评 Admin
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-cyan-50 text-[#0084c2] border border-cyan-200/80">
                  运营管控
                </span>
              </div>
            </Link>

            {/* Apple 风格 Segmented 导航切换栏 */}
            <nav className="hidden lg:flex items-center bg-slate-100/85 p-1 rounded-xl border border-slate-200/70 shadow-inner space-x-1">
              {[
                { to: '/admin/dashboard', label: '运营大盘', icon: LayoutDashboard },
                { to: '/admin/users', label: '用户管理', icon: Users },
                { to: '/admin/quota', label: '额度调控', icon: Sliders },
                { to: '/admin/orders', label: '订单财务', icon: Receipt },
                { to: '/admin/settings', label: 'AI 模型与 Token 配置', icon: Bot }
              ].map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.to;
                return (
                  <Link 
                    key={item.to}
                    to={item.to} 
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-white text-[#0070a4] shadow-xs border border-slate-200/80 font-bold' 
                        : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#0096DB]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {admin ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100/70 border border-slate-200/60 text-xs">
                  <span className="text-slate-500">管理员:</span>
                  <strong className="text-slate-900 font-mono font-bold">{admin.username || 'admin'}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    adminLogout();
                    navigate('/admin/login');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200/80 transition-all cursor-pointer shadow-xs"
                >
                  <LogOut className="w-3.5 h-3.5 inline mr-1 text-slate-400 group-hover:text-rose-600" />
                  退出
                </button>
              </div>
            ) : (
              <Link
                to="/admin/login"
                className="shadcn-button-primary px-4 py-2 text-xs font-semibold shadow-xs"
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
      <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-2xl border-b border-slate-200/90 shadow-[0_4px_24px_-2px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[66px] flex items-center justify-between">
          
          {/* Logo 与主导航 */}
          <div className="flex items-center space-x-6">
            <Link to="/app" className="flex items-center space-x-3 group">
              <div className="w-9 h-9 rounded-xl bg-white p-1.5 border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden group-hover:border-[#0ea5e9]/50 transition-colors">
                <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-[15px] tracking-tight text-slate-950">
                享宇AI智评
              </span>
            </Link>

            {/* Apple 风格 Segmented 导航切换栏：只保留「发起尽调」与「任务中心」 */}
            <nav className="hidden md:flex items-center bg-slate-100/85 p-1 rounded-xl border border-slate-200/70 shadow-inner space-x-1">
              <Link 
                to="/app" 
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname === '/app' 
                    ? 'bg-white text-[#0070a4] shadow-xs border border-slate-200/80 font-bold' 
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
              >
                <Zap className={`w-3.5 h-3.5 ${pathname === '/app' ? 'text-[#0ea5e9]' : 'text-slate-400'}`} />
                <span>发起尽调</span>
              </Link>
              <Link 
                to="/app/tasks" 
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  pathname.startsWith('/app/tasks') || pathname.startsWith('/app/reports') 
                    ? 'bg-white text-[#0070a4] shadow-xs border border-slate-200/80 font-bold' 
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                }`}
              >
                <Clock className={`w-3.5 h-3.5 ${(pathname.startsWith('/app/tasks') || pathname.startsWith('/app/reports')) ? 'text-[#0ea5e9]' : 'text-slate-400'}`} />
                <span>任务中心 (含历史报告)</span>
              </Link>
            </nav>
          </div>

          {/* 右侧：额度胶囊与个人中心头像下拉 */}
          <div className="flex items-center space-x-3">
            {user && (
              <Link 
                to="/app/profile?tab=billing" 
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-50/90 to-sky-50/90 hover:from-cyan-100 hover:to-sky-100 border border-cyan-200/80 text-[#0070a4] text-xs font-semibold transition-all shadow-xs group"
                title="点击前往额度充值"
              >
                <span className={`w-2 h-2 rounded-full ${(user.balance_quota ?? 0) > 0 ? 'bg-[#0ea5e9] shadow-sm shadow-[#0ea5e9]/50 animate-pulse' : 'bg-amber-500'}`}></span>
                <span className="text-slate-600 font-medium">剩余额度:</span>
                <span className="font-mono text-xs text-[#0070a4] font-extrabold">
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
                  className="flex items-center space-x-2.5 p-1 pl-2 pr-3 rounded-xl bg-white hover:bg-slate-50 transition-all border border-slate-200/80 hover:border-slate-300 shadow-xs cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-400 to-[#29B47D] text-white flex items-center justify-center font-bold text-xs shadow-xs border border-white/40">
                    {user.phone ? user.phone.slice(-2) : 'XY'}
                  </div>
                  <span className="text-xs font-semibold text-slate-800 hidden sm:inline font-mono">
                    {user.phone ? user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '用户'}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {userDropdown && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/90 py-2 z-50 text-xs animate-in fade-in slide-in-from-top-1"
                    onMouseLeave={() => setUserDropdown(false)}
                  >
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="font-bold text-slate-950 text-sm">{user.company_name || '个人用户'}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{user.phone}</p>
                    </div>
                    <div className="py-1.5 space-y-0.5 px-1.5">
                      <Link 
                        to="/app/profile?tab=profile" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3 py-2 rounded-lg text-slate-700 hover:text-[#0070a4] hover:bg-cyan-50/60 transition-colors font-semibold"
                      >
                        <UserIcon className="w-4 h-4 mr-2.5 text-[#0ea5e9]" />
                        个人中心
                      </Link>
                      <Link 
                        to="/app/profile?tab=billing" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3 py-2 rounded-lg text-slate-700 hover:text-[#0070a4] hover:bg-cyan-50/60 transition-colors font-semibold"
                      >
                        <CreditCard className="w-4 h-4 mr-2.5 text-[#0ea5e9]" />
                        额度充值加油包
                      </Link>
                      <Link 
                        to="/app/profile?tab=transactions" 
                        onClick={() => setUserDropdown(false)}
                        className="flex items-center px-3 py-2 rounded-lg text-slate-700 hover:text-[#0070a4] hover:bg-cyan-50/60 transition-colors font-semibold"
                      >
                        <Receipt className="w-4 h-4 mr-2.5 text-[#0ea5e9]" />
                        额度变动流水明细
                      </Link>
                    </div>
                    <div className="pt-1.5 mt-1 border-t border-slate-100 px-1.5">
                      <button 
                        type="button"
                        onClick={() => {
                          userLogout();
                          setUserDropdown(false);
                          navigate('/auth/login');
                        }}
                        className="w-full text-left flex items-center px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors font-semibold cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 mr-2.5 text-rose-500" />
                        退出登录
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link 
                to="/auth/login"
                className="shadcn-button-primary px-4 py-2 text-xs font-semibold shadow-xs"
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
    <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-2xl border-b border-slate-200/90 shadow-[0_4px_24px_-2px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[66px] flex items-center justify-between">
        
        <div className="flex items-center space-x-5">
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-white p-1.5 border border-slate-200/80 shadow-xs flex items-center justify-center backdrop-blur-md overflow-hidden group-hover:border-[#0ea5e9]/50 transition-colors">
              <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-slate-950">
              享宇AI智评
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          {user ? (
            <Link 
              to="/app"
              className="shadcn-button-primary px-4 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-200" />
              进入工作台
            </Link>
          ) : (
            <div className="flex items-center space-x-2">
              <Link 
                to="/auth/login"
                className="shadcn-button-primary px-4 py-2 text-xs font-semibold shadow-xs"
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
