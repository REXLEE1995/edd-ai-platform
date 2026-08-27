import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  Clock, 
  CreditCard, 
  Zap, 
  TrendingUp, 
  ArrowRight, 
  ShieldAlert, 
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* 头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-300">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">运营管理总览看板</h1>
            <span className="text-xs px-2 py-0.5 rounded-xs font-bold bg-sky-50 text-sky-800 border border-sky-300">
              Admin Console
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">
            全站注册用户、尽调任务执行量、充值收入与额度资产负债大盘
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/admin/users"
            className="px-3.5 py-1.5 rounded-sm bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <Users className="w-3.5 h-3.5 text-sky-700" />
            用户管理
          </Link>
          <Link
            to="/admin/quota"
            className="px-3.5 py-1.5 rounded-sm bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all"
          >
            <Zap className="w-3.5 h-3.5" />
            人工精准调额
          </Link>
        </div>
      </div>

      {/* 核心指标矩阵 */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">平台注册用户总数</span>
            <div className="mt-2 text-2xl font-extrabold text-slate-900 font-mono">
              {metrics?.total_users ?? 0}
            </div>
            <span className="text-[11px] text-teal-700 mt-1 block font-semibold">持续平稳增长</span>
          </div>
          <div className="w-9 h-9 rounded-xs bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <Users className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">全景尽调任务总发起量</span>
            <div className="mt-2 text-2xl font-extrabold text-sky-700 font-mono">
              {metrics?.total_tasks ?? 0}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block font-medium">已完成: {metrics?.completed_tasks ?? 0} 份报告</span>
          </div>
          <div className="w-9 h-9 rounded-xs bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <Clock className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">累计充值交易总额</span>
            <div className="mt-2 text-2xl font-extrabold text-teal-700 font-mono">
              ¥ {metrics?.total_revenue?.toFixed(2) ?? '0.00'}
            </div>
            <span className="text-[11px] text-slate-500 mt-1 block font-medium">线上微信/支付宝及对公</span>
          </div>
          <div className="w-9 h-9 rounded-xs bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <CreditCard className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">全站剩余可用额度负债</span>
            <div className="mt-2 text-2xl font-extrabold text-sky-800 font-mono">
              {metrics?.total_balance_quota ?? 0} <span className="text-xs text-slate-400 font-normal">次</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1.5 block font-medium">用户账户内尚未消耗的点数</span>
          </div>
          <div className="w-9 h-9 rounded-xs bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
            <Zap className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">平台累计消耗点数</span>
            <div className="mt-2 text-2xl font-extrabold text-slate-800 font-mono">
              {metrics?.total_consumed_quota ?? 0} <span className="text-xs text-slate-400 font-normal">次</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-1.5 block font-medium">真实转化为尽调成果的点数</span>
          </div>
          <div className="w-9 h-9 rounded-xs bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
            <FileCheck className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white rounded-sm p-5 border border-slate-300 shadow-2xs flex items-start justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">系统风控安全状态</span>
            <div className="mt-2 text-lg font-bold text-teal-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-600"></span>
              正常运转中
            </div>
            <span className="text-[11px] text-slate-500 mt-1.5 block font-medium">事务行级锁与审计全开</span>
          </div>
          <div className="w-9 h-9 rounded-xs bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* 快捷业务工作台卡片 */}
      <div className="mt-10">
        <h3 className="text-sm font-bold text-slate-900 mb-4 tracking-tight">核心管理服务快速通道</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            to="/admin/users"
            className="bg-white hover:bg-slate-50 rounded-sm p-6 border border-slate-300 hover:border-sky-600 shadow-2xs transition-all block group"
          >
            <Users className="w-6 h-6 text-sky-700 mb-3" />
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-sky-800 transition-colors">注册用户全景画像管理</h4>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              查询注册用户详情、实名认证状态、历史尽调任务、冻结/解冻账号及运营打标。
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-sky-700 font-bold group-hover:translate-x-0.5 transition-transform">
              进入用户管理 <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/quota"
            className="bg-white hover:bg-slate-50 rounded-sm p-6 border border-slate-300 hover:border-sky-600 shadow-2xs transition-all block group"
          >
            <Zap className="w-6 h-6 text-sky-700 mb-3" />
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-sky-800 transition-colors">额度精准调控与全量流水</h4>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              支持对公汇款人工加额、客诉补偿，实时查看不可篡改的全局变动流水台账。
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-sky-700 font-bold group-hover:translate-x-0.5 transition-transform">
              进入额度中心 <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          <Link
            to="/admin/orders"
            className="bg-white hover:bg-slate-50 rounded-sm p-6 border border-slate-300 hover:border-sky-600 shadow-2xs transition-all block group"
          >
            <Receipt className="w-6 h-6 text-teal-700 mb-3" />
            <h4 className="font-bold text-sm text-slate-900 group-hover:text-teal-800 transition-colors">线上订单与财务对账</h4>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              微信/支付宝线上支付流水监控，大客户线下转账凭证审核与核销。
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs text-teal-700 font-bold group-hover:translate-x-0.5 transition-transform">
              进入订单财务 <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
