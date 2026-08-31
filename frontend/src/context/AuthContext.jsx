import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  // 初始化加载当前用户与管理员信息 (仅在存在对应凭证时静默刷新，避免控制台 401 告警)
  const refreshUserProfile = async () => {
    const token = localStorage.getItem('edd_user_token');
    if (!token) return;
    try {
      const res = await apiClient.get('/v1/auth/me');
      if (res && res.id) {
        setUser(res);
      }
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('edd_user_token');
        setUser(null);
      }
      console.debug('前台登录凭证已失效');
    }
  };

  const refreshAdminProfile = async () => {
    const adminToken = localStorage.getItem('edd_admin_token');
    if (!adminToken) return;
    try {
      const res = await apiClient.get('/admin/auth/me');
      if (res && res.id) {
        setAdmin(res);
      }
    } catch (e) {
      if (e.response?.status === 401) {
        localStorage.removeItem('edd_admin_token');
        setAdmin(null);
      }
      console.debug('后台管理凭证已失效');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      await Promise.allSettled([refreshUserProfile(), refreshAdminProfile()]);
      setLoading(false);
    };
    initAuth();
  }, []);

  // 用户登录
  const userLogin = async (phone, code = '123456', password = null) => {
    const res = await apiClient.post('/v1/auth/login', { phone, code, password });
    if (res.access_token) {
      localStorage.setItem('edd_user_token', res.access_token);
      setUser(res.user);
      return res;
    }
  };

  const userLogout = () => {
    localStorage.removeItem('edd_user_token');
    setUser(null);
  };

  // 管理员登录
  const adminLogin = async (username, password) => {
    const res = await apiClient.post('/admin/auth/login', { username, password });
    if (res.access_token) {
      localStorage.setItem('edd_admin_token', res.access_token);
      setAdmin(res.user);
      return res;
    }
  };

  const adminLogout = () => {
    localStorage.removeItem('edd_admin_token');
    setAdmin(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      admin,
      loading,
      userLogin,
      userLogout,
      adminLogin,
      adminLogout,
      refreshUserProfile,
      refreshAdminProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
