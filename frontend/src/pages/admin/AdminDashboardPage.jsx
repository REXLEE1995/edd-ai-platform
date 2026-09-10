import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  CreditCard, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  FileCheck,
  Receipt,
  Settings
} from 'lucide-react';
import apiClient from '../../api/client';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await apiClient.get('/admin/dashboard/metrics');
        setMetrics(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-slate-900">
      
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-950 tracking-tight">运营管理总览看板</h1>
            <span className="shadcn-badge-secondary">
              Admin Console
            </span>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-zinc-500">
            全站注册用户、尽调任务执行量、充值收入与额度资产负债大盘
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/settings"
            className="shadcn-button-outline text-xs py-2 px-3.5"
          >
            <Settings className="w-3.5 h-3.5 text-slate-700" />
            系统与短信配置
          </Link>
          <Link
            to="/admin/users"
            className="shadcn-button-outline text-xs py-2 px-3.5"
          >
            <Users className="w-3.5 h-3.5 text-slate-700" />
            用户管理
          </Link>
          <Link
            to="/admin/quota"
            className="shadcn-button-primary text-xs py-2 px-3.5"
          >
            <Zap className="w-3.5 h-3.5" />
            人工精准调额
          </Link>
        </div>
      </div>

      {/* 核心指标矩阵 (shadcn Stat Cards) */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="shadcn-card bg-white p-5 border border-zinc-200 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium block">平台注册用户总数</span>
            <div className="text-2xl font-bold text-slate-950 font-mono">
              {metrics?.total_users ?? 0}
            </div>
            <span className="text-[11px] text-emerald-700 block font-medium">持续平稳增长</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
            <Users className="w-4 h-4" />
          </div>
        </div>

        <div className="shadcn-card bg-white p-5 border border-zinc-200 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium block">全景尽调任务总发起量</span>
            <div className="text-2xl font-bold text-slate-950 font-mono">
              {metrics?.total_tasks ?? 0}
            </div>
            <span className="text-[11px] text-zinc-500 block">已完成: {metrics?.completed_tasks ?? 0} 份报告</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
            <Clock className="w-4 h-4" />
          </div>
        </div>

        <div className="shadcn-card bg-white p-5 border border-zinc-200 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium block">累计充值交易总额</span>
            <div className="text-2xl font-bold text-emerald-700 font-mono">
              ¥ {metrics?.total_revenue?.toFixed(2) ?? '0.00'}
            </div>
            <span className="text-[11px] text-zinc-500 block">线上微信/支付宝及对公</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
            <CreditCard className="w-4 h-4" />
          </div>
        </div>

        <div className="shadcn-card bg-white p-5 border border-zinc-200 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium block">全站剩余可用额度负债</span>
            <div className="text-2xl font-bold text-slate-950 font-mono">
              {metrics?.total_balance_quota ?? 0} <span className="text-xs text-zinc-500 font-normal">次</span>
            </div>
            <span className="text-[11px] text-zinc-500 block">用户账户内尚未消耗的点数</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
            <Zap className="w-4 h-4" />
          </div>
        </div>

        <div className="shadcn-card bg-white p-5 border border-zinc-200 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium block">平台累计消耗点数</span>
            <div className="text-2xl font-bold text-slate-950 font-mono">
              {metrics?.total_consumed_quota ?? 0} <span className="text-xs text-zinc-500 font-normal">次</span>
            </div>
            <span className="text-[11px] text-zinc-500 block">真实转化为尽调成果的点数</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
            <FileCheck className="w-4 h-4" />
          </div>
        </div>

        <div className="shadcn-card bg-white p-5 border border-zinc-200 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-xs text-zinc-500 font-medium block">系统风控安全状态</span>
            <div className="text-base font-bold text-emerald-700 flex items-center gap-1.5 mt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              正常运转中
            </div>
            <span className="text-[11px] text-zinc-500 block">事务行级锁与审计全开</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-slate-900">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* 快捷业务工作台卡片 */}
      <div className="mt-12">
        <h3 className="text-sm font-bold text-slate-900 mb-4 tracking-tight">核心管理服务快速通道</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/admin/users"
            className="shadcn-card bg-white hover:bg-zinc-50/50 p-6 border border-zinc-200 hover:border-slate-400 transition-all block group"
          >
            <Users className="w-5 h-5 text-slate-900 mb-3" />
            <h4 className="font-bold text-sm text-slate-950 group-hover:text-slate-800 transition-colors">注册用户全景画像管理</h4>
            <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
              查询注册用户详情、实名认证状态、历史尽调任务、冻结/解冻账号及运营打标。
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-slate-900 font-semibold group-hover:translate-x-0.5 transition-transform">
              进入用户管理 <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/quota"
            className="shadcn-card bg-white hover:bg-zinc-50/50 p-6 border border-zinc-200 hover:border-slate-400 transition-all block group"
          >
            <Zap className="w-5 h-5 text-slate-900 mb-3" />
            <h4 className="font-bold text-sm text-slate-950 group-hover:text-slate-800 transition-colors">额度精准调控与全量流水</h4>
            <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
              支持对公汇款人工加额、客诉补偿，实时查看不可篡改的全局变动流水台账。
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-slate-900 font-semibold group-hover:translate-x-0.5 transition-transform">
              进入额度中心 <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/orders"
            className="shadcn-card bg-white hover:bg-zinc-50/50 p-6 border border-zinc-200 hover:border-slate-400 transition-all block group"
          >
            <Receipt className="w-5 h-5 text-slate-900 mb-3" />
            <h4 className="font-bold text-sm text-slate-950 group-hover:text-slate-800 transition-colors">线上订单与财务对账</h4>
            <p className="mt-2 text-xs text-zinc-600 leading-relaxed">
              微信/支付宝线上支付流水监控，大客户线下转账凭证审核与核销。
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-slate-900 font-semibold group-hover:translate-x-0.5 transition-transform">
              进入订单财务 <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
