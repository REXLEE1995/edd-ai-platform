import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
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
  const msg = error.response?.data?.detail || error.message || '请求处理失败';
  console.error('[API Error]:', msg);
  return Promise.reject(error);
});

export default apiClient;
