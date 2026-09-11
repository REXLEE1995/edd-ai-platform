import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Sliders, 
  Receipt, 
  Settings, 
  ExternalLink, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight, 
  ShieldCheck, 
  Globe, 
  Activity, 
  Sparkles,
  ChevronLeft,
  Bot,
  MessageSquare
} from 'lucide-react';
import { Drawer, Tooltip } from 'antd';
import { useAuth } from '../context/AuthContext';

const NAV_ITEMS = [
  {
    group: '核心运营业务',
    items: [
      { 
        to: '/admin/dashboard', 
        label: '运营大盘', 
        icon: LayoutDashboard, 
        badge: '指标',
        desc: '全站运营与任务指标总览' 
      },
      { 
        to: '/admin/users', 
        label: '用户管理', 
        icon: Users, 
        badge: '客群',
        desc: '注册用户画像与额度管控' 
      },
      { 
        to: '/admin/tasks', 
        label: '任务中心', 
        icon: Activity, 
        badge: '调度',
        desc: '全站尽调任务与执行进度总控' 
      },
      { 
        to: '/admin/quota', 
        label: '额度调控', 
        icon: Sliders, 
        badge: '资产',
        desc: '人工精准调额与记账流水' 
      },
      { 
        to: '/admin/orders', 
        label: '订单财务', 
        icon: Receipt, 
        badge: '对账',
        desc: '线上充值订单与消费明细' 
      },
    ]
  },
  {
    group: '系统服务与集成',
    items: [
      { 
        to: '/admin/settings?tab=ai', 
        label: '大模型配置', 
        icon: Bot, 
        badge: '推理',
        desc: '大模型引擎、Token密钥与推理参数' 
      },
      { 
        to: '/admin/settings?tab=sms', 
        label: '短信网关', 
        icon: MessageSquare, 
        badge: '外发',
        desc: '短信商户账号、签名与外发设置' 
      },
    ]
  }
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { admin, adminLogout, loading } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 路由变动时自动关闭移动端抽屉
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  // 登录态拦截：未登录则自动重定向至管理员登录页
  const token = localStorage.getItem('edd_admin_token');
  if (!loading && !admin && !token) {
    return <Navigate to="/admin/login" replace />;
  }

  // 计算当前面包屑与页面标题
  const currentNav = NAV_ITEMS.flatMap(g => g.items).find(i => {
    if (i.to.includes('?')) {
      const [path, query] = i.to.split('?');
      if (location.pathname === path) {
        if (location.search === '?' + query) return true;
        if (!location.search && query === 'tab=ai') return true;
      }
      return false;
    }
    return location.pathname === i.to;
  }) || {
    label: '运营后台',
    desc: '享宇智评商业化运营管控中心'
  };

  // 侧边栏内容组件 (复用于桌面侧栏与移动端抽屉)
  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full bg-white text-slate-900 select-none">
      
      {/* 1. 顶部品牌区域 */}
      <div className={`flex items-center justify-between border-b border-slate-200/80 px-4 h-16 shrink-0 ${
        sidebarCollapsed && !isMobile ? 'px-3 justify-center' : ''
      }`}>
        <Link to="/admin/dashboard" className="flex items-center gap-3 group overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center p-1.5 shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <img src="/brand_logo.png" alt="Logo" className="w-full h-full object-contain filter invert" />
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-950 tracking-tight truncate">
                  享宇智评
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-[#0084c2] border border-cyan-200/80 leading-none">
                  Admin
                </span>
              </div>
              <span className="text-[11px] text-slate-600 truncate mt-0.5">
                商业运营总控中心
              </span>
            </div>
          )}
        </Link>

        {/* 桌面端折叠切换按钮 */}
        {!isMobile && (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 rounded-md text-slate-600 hover:text-slate-800 hover:bg-slate-100 transition-colors hidden lg:block cursor-pointer"
            title={sidebarCollapsed ? "展开侧边栏" : "折叠侧边栏"}
          >
            <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${sidebarCollapsed ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* 2. 菜单导航列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {NAV_ITEMS.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            {(!sidebarCollapsed || isMobile) && (
              <div className="px-3 pb-1 text-[11px] font-semibold text-slate-600 tracking-wider">
                {group.group}
              </div>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.to.includes('?')
                  ? (location.pathname === item.to.split('?')[0] && 
                     (location.search === '?' + item.to.split('?')[1] || (!location.search && item.to.endsWith('tab=ai'))))
                  : (location.pathname === item.to);
                
                const linkContent = (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group relative ${
                      isActive
                        ? 'bg-cyan-50/90 text-[#0070a4] font-bold shadow-xs border border-cyan-200/70'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100/80'
                    } ${sidebarCollapsed && !isMobile ? 'justify-center px-2 py-3' : ''}`}
                  >
                    {/* 左侧高亮活动条 */}
                    {isActive && (
                      <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#0096DB] rounded-r-full" />
                    )}
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#0096DB]' : 'text-slate-600 group-hover:text-slate-800'
                    }`} />
                    
                    {(!sidebarCollapsed || isMobile) && (
                      <div className="flex items-center justify-between flex-1 min-w-0">
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                            isActive 
                              ? 'bg-[#0096DB]/10 text-[#0070a4]' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                    )}
                  </Link>
                );

                if (sidebarCollapsed && !isMobile) {
                  return (
                    <Tooltip key={item.to} title={item.label} placement="right">
                      {linkContent}
                    </Tooltip>
                  );
                }
                return linkContent;
              })}
            </div>
          </div>
        ))}

        {/* 快捷外链区 */}
        <div className="pt-2 border-t border-slate-100 space-y-1">
          {(!sidebarCollapsed || isMobile) && (
            <div className="px-3 pb-1 text-[11px] font-semibold text-slate-600 tracking-wider">
              快捷通道
            </div>
          )}
          <Link
            to="/app"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all group ${
              sidebarCollapsed && !isMobile ? 'justify-center px-2' : ''
            }`}
          >
            <ExternalLink className="w-4 h-4 text-slate-600 group-hover:text-slate-800 shrink-0" />
            {(!sidebarCollapsed || isMobile) && (
              <span className="truncate">访问尽调前台 SaaS</span>
            )}
          </Link>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 transition-all group ${
              sidebarCollapsed && !isMobile ? 'justify-center px-2' : ''
            }`}
          >
            <Globe className="w-4 h-4 text-slate-600 group-hover:text-slate-800 shrink-0" />
            {(!sidebarCollapsed || isMobile) && (
              <span className="truncate">Swagger 接口文档</span>
            )}
          </a>
        </div>
      </div>

      {/* 3. 底部管理员身份与退出 */}
      <div className="border-t border-slate-200/80 p-3 bg-slate-50/50 shrink-0">
        {(!sidebarCollapsed || isMobile) ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 text-[#0084c2] flex items-center justify-center font-bold text-xs shrink-0">
                {admin?.username?.slice(0, 1).toUpperCase() || 'A'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {admin?.username || 'admin'}
                </span>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  超级管理员
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                adminLogout();
                navigate('/admin/login');
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Tooltip title={`退出登录 (${admin?.username || 'admin'})`} placement="right">
            <button
              type="button"
              onClick={() => {
                adminLogout();
                navigate('/admin/login');
              }}
              className="w-full py-2 flex items-center justify-center rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </Tooltip>
        )}
      </div>

    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#f8fafc] text-slate-900">
      
      {/* 桌面端左侧固定侧边栏 */}
      <aside className={`hidden lg:flex flex-col shrink-0 border-r border-slate-200/90 bg-white/95 backdrop-blur-xl h-screen sticky top-0 z-30 transition-all duration-300 shadow-[2px_0_12px_rgba(0,0,0,0.02)] ${
        sidebarCollapsed ? 'w-18' : 'w-64'
      }`}>
        {renderSidebarContent(false)}
      </aside>

      {/* 移动端侧边栏抽屉 (Drawer) */}
      <Drawer
        placement="left"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        width={270}
        styles={{ body: { padding: 0 } }}
        headerStyle={{ display: 'none' }}
      >
        {renderSidebarContent(true)}
      </Drawer>

      {/* 右侧主内容区域 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* 顶部主工作台顶栏 */}
        <header className="sticky top-0 z-20 h-16 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-3">
            {/* 移动端汉堡切换按钮 */}
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* 面包屑导航与页面名称 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600 hidden sm:inline">运营管理</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300 hidden sm:inline" />
              <h1 className="text-sm sm:text-[15px] font-bold text-slate-950 tracking-tight">
                {currentNav.label}
              </h1>
              <span className="hidden md:inline text-xs text-slate-600">
                — {currentNav.desc}
              </span>
            </div>
          </div>

          {/* 顶栏右侧快捷工具与状态 */}
          <div className="flex items-center gap-3">
            {/* 局域网/环境标识 */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-[11px] font-mono text-slate-600 border border-slate-200/70">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>192.168.110.234</span>
            </div>

            {/* 进入前台工作台按钮 */}
            <Link
              to="/app"
              className="shadcn-button-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>前台尽调</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            {/* 管理员快速退出 */}
            <button
              type="button"
              onClick={() => {
                adminLogout();
                navigate('/admin/login');
              }}
              className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer lg:hidden"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* 页面内容挂载点 */}
        <main className="flex-1">
          <Outlet />
        </main>

      </div>

    </div>
  );
}
