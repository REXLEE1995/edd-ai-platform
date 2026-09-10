// 前端运行期动态配置文件 (无需重新打包编译即可覆盖后端服务地址)
window.APP_CONFIG = {
  // 默认使用相对路径 /api，由 Nginx 或开发服务器反向代理至后端服务
  // 若使用跨域独立域名，可修改为绝对地址，如 "https://api.yourdomain.com/api"
  API_BASE_URL: "/api"
};
