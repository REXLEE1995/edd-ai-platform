import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/client';
import LoginModal from '../components/LoginModal';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const openLoginModal = () => setIsLoginModalOpen(true);
  const closeLoginModal = () => setIsLoginModalOpen(false);

  // 初始化加载当前用户与管理员信息 (直连真实后端，401 失效时坚决清空，严禁复用旧缓存)
  const refreshUserProfile = async () => {
    const token = localStorage.getItem('edd_user_token');
    if (!token) {
      localStorage.removeItem('edd_user_profile_cached');
      setUser(null);
      return;
    }

    try {
      const res = await apiClient.get('/v1/auth/me');
      if (res && (res.id || res.phone)) {
        setUser(res);
        localStorage.setItem('edd_user_profile_cached', JSON.stringify(res));
      } else {
        throw new Error('未获取到有效用户信息');
      }
    } catch (e) {
      // 只要后端返回 401 或请求异常，坚决清除前端登录凭证与缓存，彻底置为未登录状态
      localStorage.removeItem('edd_user_token');
      localStorage.removeItem('edd_user_profile_cached');
      setUser(null);
      console.warn('[Auth] 前台登录凭证已过期或失效，已彻底清空登录状态');
    }
  };

  const refreshAdminProfile = async () => {
    // 运营端/SaaS业务端与移动端绝不请求后台管理端接口，仅在用户访问 /admin 路由时才校验管理员凭证
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
      return;
    }
    const adminToken = localStorage.getItem('edd_admin_token');
    if (!adminToken) {
      setAdmin(null);
      return;
    }
    try {
      const res = await apiClient.get('/admin/auth/me');
      if (res && res.id) {
        setAdmin(res);
      } else {
        localStorage.removeItem('edd_admin_token');
        setAdmin(null);
      }
    } catch (e) {
      localStorage.removeItem('edd_admin_token');
      setAdmin(null);
      console.debug('后台管理凭证已失效');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      if (isAdminRoute) {
        await Promise.allSettled([refreshAdminProfile()]);
      } else {
        await Promise.allSettled([refreshUserProfile()]);
      }
      setLoading(false);
    };
    initAuth();

    const handleUserUnauth = () => {
      localStorage.removeItem('edd_user_token');
      localStorage.removeItem('edd_user_profile_cached');
      setUser(null);
      window.dispatchEvent(new Event('auth:user_logout'));
      if (!window.location.pathname.startsWith('/admin')) {
        openLoginModal();
      }
    };
    const handleAdminUnauth = () => {
      localStorage.removeItem('edd_admin_token');
      setAdmin(null);
      if (window.location.pathname.startsWith('/admin') && window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    };
    window.addEventListener('auth:user_unauthorized', handleUserUnauth);
    window.addEventListener('auth:admin_unauthorized', handleAdminUnauth);
    return () => {
      window.removeEventListener('auth:user_unauthorized', handleUserUnauth);
      window.removeEventListener('auth:admin_unauthorized', handleAdminUnauth);
    };
  }, []);

  // 用户登录 (纯真实接口，无任何 mock 假数据)
  const userLogin = async (phone, code = '123456', password = null) => {
    const res = await apiClient.post('/v1/auth/login', { phone, code, password });
    if (res && res.access_token) {
      localStorage.setItem('edd_user_token', res.access_token);
      let loggedUser = res.user;
      if (loggedUser) {
        setUser(loggedUser);
        localStorage.setItem('edd_user_profile_cached', JSON.stringify(loggedUser));
      } else {
        await refreshUserProfile();
        loggedUser = res.user || null;
      }
      window.dispatchEvent(new CustomEvent('auth:user_login', { detail: loggedUser }));
      return res;
    }
    throw new Error(res?.message || '登录异常，未获取到访问令牌');
  };

  const userLogout = async () => {
    try {
      await apiClient.post('/v1/auth/logout');
    } catch (e) {
      console.warn('Logout notification failed, clearing local token anyway:', e);
    } finally {
      localStorage.removeItem('edd_user_token');
      localStorage.removeItem('edd_user_profile_cached');
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      setUser(null);
      window.dispatchEvent(new Event('auth:user_logout'));
    }
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

  const adminLogout = async () => {
    try {
      await apiClient.post('/admin/auth/logout');
    } catch (e) {
      console.debug('后台退出登录接口调用完成或跳过:', e);
    } finally {
      localStorage.removeItem('edd_admin_token');
      setAdmin(null);
    }
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
      refreshAdminProfile,
      isLoginModalOpen,
      openLoginModal,
      closeLoginModal
    }}>
      {children}
      <LoginModal />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
