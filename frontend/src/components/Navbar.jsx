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
  Bot,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RechargeModal from './RechargeModal';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, admin, userLogout, adminLogout } = useAuth();
  const [userDropdown, setUserDropdown] = useState(false);
  const [mobileAdminMenu, setMobileAdminMenu] = useState(false);
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false);

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
      <>
        <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-2xl border-b border-slate-200/90 shadow-[0_4px_24px_-2px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-[60px] sm:h-[66px] flex items-center justify-between">
            
            <div className="flex items-center space-x-3 sm:space-x-6">
              <Link to="/admin/dashboard" className="flex items-center space-x-2.5 sm:space-x-3 group">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-1 sm:p-1.5 border border-slate-200/80 shadow-xs flex items-center justify-center backdrop-blur-md overflow-hidden group-hover:border-[#0ea5e9]/50 transition-colors">
                  <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="font-bold text-sm sm:text-[15px] tracking-tight text-slate-950">
                    享宇智评 Admin
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-cyan-50 text-[#0084c2] border border-cyan-200/80">
                    运营
                  </span>
                </div>
              </Link>

              {/* PC 端 Apple 风格 Segmented 导航切换栏 */}
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

            <div className="flex items-center space-x-2 sm:space-x-3">
              {admin ? (
                <div className="flex items-center gap-2 sm:gap-3">
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
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200/80 transition-all cursor-pointer shadow-xs"
                  >
                    <LogOut className="w-3.5 h-3.5 inline mr-1 text-slate-400 group-hover:text-rose-600" />
                    <span className="hidden sm:inline">退出</span>
                  </button>
                  {/* 移动端菜单切换 */}
                  <button
                    type="button"
                    onClick={() => setMobileAdminMenu(!mobileAdminMenu)}
                    className="lg:hidden p-2 rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-700"
                  >
                    {mobileAdminMenu ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <Link
                  to="/admin/login"
                  className="shadcn-button-primary px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold shadow-xs"
                >
                  管理员登录
                </Link>
              )}
            </div>

          </div>

          {/* 移动端 Admin 折叠菜单 */}
          {mobileAdminMenu && admin && (
            <div className="lg:hidden border-t border-slate-200/80 bg-white/95 backdrop-blur-2xl px-4 py-3 space-y-1 animate-in fade-in slide-in-from-top-2">
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
                    onClick={() => setMobileAdminMenu(false)}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive 
                        ? 'bg-cyan-50 text-[#0070a4] font-bold border border-cyan-200/60' 
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0096DB]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </header>
      </>
    );
  }

  // 2. 发起尽调平台专属导航
  if (isSaaSPath) {
    return (
      <>
        <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-2xl border-b border-slate-200/90 shadow-[0_4px_24px_-2px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-[60px] sm:h-[66px] flex items-center justify-between">
            
            {/* Logo 与 PC 端主导航 */}
            <div className="flex items-center space-x-3 sm:space-x-6">
              <Link to="/app" className="flex items-center space-x-2.5 sm:space-x-3 group shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-1 sm:p-1.5 border border-slate-200/80 shadow-xs flex items-center justify-center overflow-hidden group-hover:border-[#0ea5e9]/50 transition-colors">
                  <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
                </div>
                <span className="font-bold text-sm sm:text-[15px] tracking-tight text-slate-950">
                  享宇AI智评
                </span>
              </Link>

              {/* PC 端 Apple 风格 Segmented 导航切换栏 */}
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

            {/* 右侧：额度胶囊与个人中心 */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {user && (
                <button 
                  type="button"
                  onClick={() => setRechargeModalOpen(true)}
                  className="flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-gradient-to-r from-cyan-50/90 to-sky-50/90 hover:from-cyan-100 hover:to-sky-100 border border-cyan-200/80 text-[#0070a4] text-xs font-semibold transition-all shadow-xs group cursor-pointer"
                  title="点击弹出充值加油包"
                >
                  <span className={`w-2 h-2 rounded-full ${(user.balance_quota ?? 0) > 0 ? 'bg-[#0ea5e9] shadow-sm shadow-[#0ea5e9]/50 animate-pulse' : 'bg-amber-500'}`}></span>
                  <span className="text-slate-600 font-medium hidden xs:inline">剩余额度:</span>
                  <span className="font-mono text-xs text-[#0070a4] font-extrabold">
                    {user.balance_quota ?? 0} <span className="font-normal text-[11px]">次</span>
                  </span>
                </button>
              )}

              {/* 用户菜单下拉 (移动端已通过底部导航进入个人中心，仅在 PC/平板 显示) */}
              {user ? (
                <div className="hidden md:block relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdown(!userDropdown)}
                    className="flex items-center space-x-1.5 sm:space-x-2 py-1.5 px-3 rounded-xl bg-white hover:bg-slate-50 transition-all border border-slate-200/80 hover:border-slate-300 shadow-xs cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-slate-800 font-mono">
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
                        <p className="font-bold text-slate-950 text-sm font-mono">{user.phone || '未设置手机号'}</p>
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
                        <button 
                          type="button"
                          onClick={() => {
                            setUserDropdown(false);
                            setRechargeModalOpen(true);
                          }}
                          className="w-full text-left flex items-center px-3 py-2 rounded-lg text-slate-700 hover:text-[#0070a4] hover:bg-cyan-50/60 transition-colors font-semibold cursor-pointer"
                        >
                          <CreditCard className="w-4 h-4 mr-2.5 text-[#0ea5e9]" />
                          额度充值加油包
                        </button>
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
                  className="shadcn-button-primary px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold shadow-xs"
                >
                  注册/登录
                </Link>
              )}
            </div>

          </div>
        </header>

        {/* 📱 移动端 iOS 风格悬浮毛玻璃底部导航栏 (Bottom Navigation Bar) */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur-2xl border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-3 py-1.5 flex items-center justify-around">
          <Link
            to="/app"
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all ${
              pathname === '/app'
                ? 'text-[#0070a4] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname === '/app' ? 'bg-cyan-50 text-[#0096DB]' : ''}`}>
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5">发起尽调</span>
          </Link>

          <Link
            to="/app/tasks"
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all ${
              pathname.startsWith('/app/tasks') || pathname.startsWith('/app/reports')
                ? 'text-[#0070a4] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname.startsWith('/app/tasks') || pathname.startsWith('/app/reports') ? 'bg-cyan-50 text-[#0096DB]' : ''}`}>
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5">任务与报告</span>
          </Link>

          <Link
            to="/app/profile"
            className={`flex flex-col items-center justify-center py-1 px-4 rounded-xl transition-all ${
              pathname.startsWith('/app/profile')
                ? 'text-[#0070a4] font-bold'
                : 'text-slate-500 hover:text-slate-900 font-medium'
            }`}
          >
            <div className={`p-1 rounded-lg ${pathname.startsWith('/app/profile') ? 'bg-cyan-50 text-[#0096DB]' : ''}`}>
              <UserIcon className="w-4 h-4" />
            </div>
            <span className="text-[10px] mt-0.5">我的/充值</span>
          </Link>
        </nav>

        {/* 全局快捷额度充值加油包浮窗 */}
        <RechargeModal 
          open={rechargeModalOpen} 
          onClose={() => setRechargeModalOpen(false)} 
        />
      </>
    );
  }

  // 3. 宣传官网专属导航
  return (
    <header className="sticky top-0 z-50 w-full bg-white/85 backdrop-blur-2xl border-b border-slate-200/90 shadow-[0_4px_24px_-2px_rgba(15,23,42,0.06),0_1px_2px_rgba(15,23,42,0.04)] transition-all">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-[60px] sm:h-[66px] flex items-center justify-between">
        
        <div className="flex items-center space-x-3 sm:space-x-5">
          <Link to="/" className="flex items-center space-x-2.5 sm:space-x-3 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white p-1 sm:p-1.5 border border-slate-200/80 shadow-xs flex items-center justify-center backdrop-blur-md overflow-hidden group-hover:border-[#0ea5e9]/50 transition-colors">
              <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-sm sm:text-[15px] tracking-tight text-slate-950">
              享宇AI智评
            </span>
          </Link>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-3">
          {user ? (
            <Link 
              to="/app"
              className="shadcn-button-primary px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-200" />
              进入工作台
            </Link>
          ) : (
            <div className="flex items-center space-x-2">
              <Link 
                to="/auth/login"
                className="shadcn-button-primary px-3.5 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold shadow-xs"
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
