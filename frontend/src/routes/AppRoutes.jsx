import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// 官网
import HomePage from '../pages/portal/HomePage';

// SaaS 尽调工作台
import DDHomePage from '../pages/saas/DDHomePage';
import TaskCenterPage from '../pages/saas/TaskCenterPage';
import UserCenterPage from '../pages/saas/UserCenterPage';
import ReportReaderPage from '../pages/saas/ReportReaderPage';
import SharedReportPage from '../pages/saas/SharedReportPage';

// 认证
import LoginPage from '../pages/auth/LoginPage';
import AdminLoginPage from '../pages/admin/AdminLoginPage';

// 后台 Admin 运营管理
import AdminLayout from '../layouts/AdminLayout';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminUsersPage from '../pages/admin/AdminUsersPage';
import AdminTasksPage from '../pages/admin/AdminTasksPage';
import AdminQuotaPage from '../pages/admin/AdminQuotaPage';
import AdminOrdersPage from '../pages/admin/AdminOrdersPage';
import AdminSettingsPage from '../pages/admin/AdminSettingsPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* 宣传官网 */}
      <Route path="/" element={<HomePage />} />

      {/* 外部加密分享查阅页 (免登录 6 位密码安全解锁) */}
      <Route path="/share/:shareCode" element={<SharedReportPage />} />

      {/* 认证 */}
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />

      {/* SaaS 尽调工作台 */}
      <Route path="/app" element={<DDHomePage />} />
      <Route path="/app/tasks" element={<TaskCenterPage />} />
      <Route path="/app/profile" element={<UserCenterPage />} />
      <Route path="/app/reports" element={<Navigate to="/app/tasks?tab=reports" replace />} />
      <Route path="/app/billing" element={<Navigate to="/app/profile?tab=billing" replace />} />
      <Route path="/app/reports/:id" element={<ReportReaderPage />} />

      {/* 后台运营管理服务 (Admin Console - 左侧菜单导航架构) */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="tasks" element={<AdminTasksPage />} />
        <Route path="quota" element={<AdminQuotaPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
