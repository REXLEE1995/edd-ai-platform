import axios from 'axios';
import { message } from 'antd';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.APP_CONFIG?.API_BASE_URL) {
    return window.APP_CONFIG.API_BASE_URL;
  }
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

// 生成全局唯一请求 ID (Trace ID) 工具函数 (规范格式: req-YYYYMMDDHHMMSS-6位随机码)
export function generateRequestId(prefix = 'req') {
  const now = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${randomStr}`;
}

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
});

// 判断该 API 请求是否属于管理端专属接口
const isExplicitAdminApi = (url) => {
  if (!url) return false;
  return url.startsWith('/admin') || url.includes('/admin/') || url.includes('admin-') || url.includes('/admin-progress');
};

// 请求拦截器：严格按 API 路由注入对应凭据，并注入 X-Request-ID 分布式链路追踪头
apiClient.interceptors.request.use((config) => {
  const url = config.url || '';
  const adminToken = localStorage.getItem('edd_admin_token');
  const userToken = localStorage.getItem('edd_user_token');
  const inAdminArea = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  const preferAdmin = isExplicitAdminApi(url) || inAdminArea;

  // 1. 认证鉴权凭据注入
  if (preferAdmin) {
    // 处于管理后台区域或请求管理接口，优先使用 adminToken
    if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    } else {
      delete config.headers.Authorization;
    }
  } else {
    // 普通用户 C 端前台页面
    if (userToken) {
      config.headers.Authorization = `Bearer ${userToken}`;
    } else if (adminToken) {
      config.headers.Authorization = `Bearer ${adminToken}`;
    } else {
      delete config.headers.Authorization;
    }
  }

  // 2. 注入 X-Request-ID 链路追踪头（若调用处未显式传入，自动根据路由特征生成全局唯一 Trace ID）
  if (!config.headers['X-Request-ID'] && !config.headers['x-request-id']) {
    let prefix = 'req';
    if (url.includes('/retry')) prefix = 'req-retry';
    else if (url.includes('/create')) prefix = 'req-create';
    config.headers['X-Request-ID'] = generateRequestId(prefix);
  }

  return config;
}, (error) => {
  return Promise.reject(error);
});

// 响应拦截器：提取并透传后端响应的 X-Request-ID
apiClient.interceptors.response.use((response) => {
  const resData = response.data;
  const traceId = response.headers?.['x-request-id'] || response.headers?.['x-trace-id'] || response.config?.headers?.['X-Request-ID'];
  if (resData && typeof resData === 'object' && traceId && !resData.request_id) {
    resData.request_id = traceId;
  }
  return resData;
}, (error) => {
  const url = error.config?.url || '';
  const isAuthProbe = url.includes('/auth/me');

  if (error.response?.status === 401) {
    if (typeof window !== 'undefined') {
      const isCurrentAdminPage = window.location.pathname.startsWith('/admin');

      // 只有当请求的是真正的管理端专属 API (如 /admin/auth/me, /admin/users 等) 发生 401 时，才确认管理员凭据失效
      if (isExplicitAdminApi(url)) {
        localStorage.removeItem('edd_admin_token');
        window.dispatchEvent(new Event('auth:admin_unauthorized'));
      } else if (!isCurrentAdminPage) {
        // 在前台业务页面时，任何 C 端接口返回 401 说明登录态已过期或被黑名单注销，立即清理本地凭据并派发事件
        localStorage.removeItem('edd_user_token');
        localStorage.removeItem('edd_user_profile_cached');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.dispatchEvent(new Event('auth:user_unauthorized'));
        window.dispatchEvent(new Event('auth:user_logout'));
      }
    }
    if (isAuthProbe) {
      // 静默身份探测返回 401 属正常未登录分支，不输出错误日志
      return Promise.reject(error);
    }
    const warnMsg = error.response?.data?.detail || '登录状态已失效或已注销，请重新登录';
    message.warning(warnMsg);
    return Promise.reject(error);
  }

  // 403：越权访问他人数据 / 租户数据安全隔离 / 账户冻结
  if (error.response?.status === 403) {
    const forbiddenMsg = error.response?.data?.detail || '无权访问该资源或资产已被限制';
    message.error(forbiddenMsg);
    return Promise.reject(error);
  }

  const msg = error.response?.data?.detail || error.message || '请求处理失败';
  console.error('[API Error]:', msg);
  return Promise.reject(error);
});

// 全局并发 GET 请求去重器（自动合并相同 URL、参数与凭据的并发 Pending 请求，避免重复网络往返）
const originalGet = apiClient.get.bind(apiClient);
const inFlightGetRequests = new Map();

apiClient.get = function (url, config = {}) {
  if (config?.skipDedupe) {
    return originalGet(url, config);
  }

  const token = localStorage.getItem('edd_user_token') || localStorage.getItem('edd_admin_token') || '';
  const paramsStr = config?.params ? JSON.stringify(config.params) : '';
  const dedupeKey = `GET:${url}:${paramsStr}:${token}`;

  if (inFlightGetRequests.has(dedupeKey)) {
    return inFlightGetRequests.get(dedupeKey);
  }

  const reqPromise = originalGet(url, config)
    .finally(() => {
      inFlightGetRequests.delete(dedupeKey);
    });

  inFlightGetRequests.set(dedupeKey, reqPromise);
  return reqPromise;
};

export default apiClient;
