# 享宇AI智评 (XYZP AI Platform)

企业商业尽调与智能风控决策 SaaS 平台 (v2.2.0)。

---

## 一、核心依赖服务端口与架构规划

| 依赖服务 | 推荐端口 | 作用说明 | 生产环境配置方式 |
| :--- | :--- | :--- | :--- |
| **New API** | `3000` | 大模型聚合调度网关与 Token 密钥池 | 通过 `.env` 注入 `NEW_API_BASE_URL` 与 `NEW_API_KEY` |
| **MySQL** | `3306 / 3308` | 生产关系型数据库 (持久化存储) | 通过 `.env` 注入 `DATABASE_URL` |
| **Redis** | `6379` | 缓存与分布式限流锁 | 通过 `.env` 注入 `REDIS_URL` |
| **MinIO** | `9000` | 对象存储与不可篡改数字存证 | 通过 `.env` 注入 `MINIO_*` |
| **Backend API** | `8000` | FastAPI 异步高性能后端服务 | 由 Nginx 反向代理，不对外直接暴露端口 |
| **Frontend Web** | `80 / 5173` | React/Vite 前端应用 | 由 Nginx 托管静态资源并反代 `/api` 与 `/s/` |

---

## 二、部署运行快速指南

### 1. 本地轻量启动 (开发沙箱模式)
- Windows 环境直接双击运行根目录下的 `start_dev.bat`；
- Linux / macOS 环境执行 `bash start_dev.sh`。

### 2. 生产 Docker 容器化部署

#### 步骤 1：配置环境变量
复制后端配置模版并填写真实生产密钥：
```bash
cp backend/.env.example backend/.env
# 使用 vim 编辑并配置生产 MySQL、Redis、MinIO、正式域名及三方生产接口密钥
vim backend/.env
```

#### 步骤 2：启动支撑中间件
```bash
# 示例：运行 New API 聚合网关 (连接 MySQL 与 Redis)
docker run --name new-api -d --restart always \
  -p 3000:3000 \
  --network new-api-network \
  -e SQL_DSN="<MYSQL_USER>:<MYSQL_PASSWORD>@tcp(<MYSQL_HOST>:<MYSQL_PORT>)/oneapi?charset=utf8mb4&parseTime=True&loc=Local" \
  -e REDIS_CONN_STRING="redis://:<REDIS_PASSWORD>@<REDIS_HOST>:6379" \
  -e TZ=Asia/Shanghai \
  -v ./new-api-data:/data \
  calciumion/new-api:latest
```

#### 步骤 3：构建并运行后端服务
```bash
cd backend
docker build -t xyzp-backend:v2.2.0 .
docker run -d --name xyzp-backend --restart always \
  -p 8000:8000 \
  --env-file .env \
  xyzp-backend:v2.2.0
```

#### 步骤 4：构建并运行前端服务
```bash
cd frontend
docker build -t xyzp-frontend:v2.2.0 .
docker run -d --name xyzp-frontend --restart always \
  -p 80:80 \
  xyzp-frontend:v2.2.0
```

---

## 三、系统安全规范

1. **密钥与凭证隔离**：严禁在 Git 仓库代码中直接提交明文 AppKey、Token、数据库密码。所有敏感凭证一律通过 `.env` 或运维 CI/CD 环境变量注入。
2. **生产访问控制**：线上环境仅开放 HTTP(80)/HTTPS(443) 端口给公网用户，MySQL、Redis、MinIO 控制台与后端端口均应置于内网或配置严格的防火墙安全组策略。