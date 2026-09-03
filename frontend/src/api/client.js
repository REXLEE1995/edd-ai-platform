import axios from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.APP_CONFIG?.API_BASE_URL) {
    return window.APP_CONFIG.API_BASE_URL;
  }
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
});

// 请求拦截器：注入用户或管理员 Token
apiClient.interceptors.request.use((config) => {
  const isAdminRequest = config.url && config.url.includes('/admin');
  const token = isAdminRequest 
    ? localStorage.getItem('edd_admin_token')
    : (localStorage.getItem('edd_user_token') || localStorage.getItem('edd_admin_token'));
    
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 响应拦截器
apiClient.interceptors.response.use((response) => {
  return response.data;
}, (error) => {
  const isAuthProbe = error.config?.url && error.config.url.includes('/auth/me');
  if (error.response?.status === 401) {
    if (typeof window !== 'undefined') {
      const isAdminReq = error.config?.url && error.config.url.includes('/admin');
      if (isAdminReq) {
        localStorage.removeItem('edd_admin_token');
        window.dispatchEvent(new Event('auth:admin_unauthorized'));
      } else {
        const uToken = localStorage.getItem('edd_user_token');
        if (!uToken || !uToken.startsWith('mock_user_token_')) {
          localStorage.removeItem('edd_user_token');
          window.dispatchEvent(new Event('auth:user_unauthorized'));
        }
      }
    }
    if (isAuthProbe) {
      // 静默身份探测返回 401 属正常未登录分支，不输出错误日志
      return Promise.reject(error);
    }
  }
  const msg = error.response?.data?.detail || error.message || '请求处理失败';
  console.error('[API Error]:', msg);
  return Promise.reject(error);
});

export default apiClient;
