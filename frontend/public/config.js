// 前端运行期动态配置文件 (无需重新打包编译即可覆盖后端服务地址)
window.APP_CONFIG = {
  // 如果为空，默认使用 Vite 开发代理或环境变量 VITE_API_BASE_URL
  // 生产环境可配置为完整后端 URL，例如: "http://192.168.110.234:8000/api"
  API_BASE_URL: ""
};
