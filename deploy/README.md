# 享宇AI智评平台 - 生产级集群容器化部署总览

本目录（`deploy/`）集成了 **享宇AI智评平台 (Xiangyu AI SmartScore)** 的全套生产级部署资产，包含 Kubernetes (K8s) 编排清单、前后端 Dockerfile、Nginx 网关配置以及生产运维实战手册。

---

## 1. 目录结构

```
deploy/
├── README.md                      # 📖 本文档（K8s 生产部署完整指南与运维手册）
├── docker/                        # 🐳 容器镜像构建资产
│   ├── backend.Dockerfile         # 后端 Python 3.11-slim + PyMuPDF 多进程镜像构建文件
│   ├── frontend.Dockerfile        # 前端 Node.js 多阶段编译 + Nginx 镜像构建文件
│   └── nginx.conf                 # 前端 SPA 路由与 Gzip 生产级 Nginx 配置
└── k8s/                           # ☸️ Kubernetes 生产编排清单 (YAML)
    ├── 01-namespace-and-configs.yaml  # 命名空间、ConfigMap (参数) 与 Secret (加密密钥)
    ├── 02-backend-deployment.yaml     # 后端 FastAPI 3副本高可用部署 + 存活/就绪探针 + ClusterIP
    ├── 03-frontend-deployment.yaml    # 前端 React 2副本部署 + ClusterIP
    ├── 04-ingress.yaml                # 生产 Ingress 统一入口网关路由分发 (/api, /docs, /)
    └── 05-hpa.yaml                    # CPU/内存动态弹性扩缩容策略 (3~10 副本)
```

---

## 2. 部署拓扑与流量路径

```
                           ┌───────────────────────────────┐
                           │   Internet / 客户端浏览器       │
                           └───────────────┬───────────────┘
                                           │ HTTPS (443) / HTTP (80)
                                           ▼
                           ┌───────────────────────────────┐
                           │    K8s Ingress Controller     │
                           │      (Nginx Ingress / ALB)    │
                           └───────┬───────────────┬───────┘
                                   │               │
            /api/*, /docs, /openapi.json           │ /* (SPA 静态前端)
                                   │               │
                                   ▼               ▼
           ┌─────────────────────────────┐ ┌─────────────────────────────┐
           │ Service: xiangyu-backend    │ │ Service: xiangyu-frontend   │
           │ (ClusterIP: 8000)           │ │ (ClusterIP: 80)             │
           └──────────────┬──────────────┘ └──────────────┬──────────────┘
                          │                               │
                          ▼                               ▼
           ┌─────────────────────────────┐ ┌─────────────────────────────┐
           │ Pod: xiangyu-backend        │ │ Pod: xiangyu-frontend       │
           │ (FastAPI + Uvicorn 异步服务)│ │ (Nginx 反向代理 + SPA 静态资源)│
           └──────┬───────┬───────┬──────┘ └─────────────────────────────┘
                  │       │       │
                  ▼       ▼       ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │ MySQL 8.0 (RDS) │ │ Redis 7.x 缓存池│ │ MinIO / S3 对象 │
    │ 核心业务与流水表│ │ 异步锁与防重频控│ │ PDF底稿与存证桶 │
    └─────────────────┘ └─────────────────┘ └─────────────────┘
```

---

## 3. 生产部署实战 4 步走

### 步骤 1：构建并推送 Docker 镜像
```bash
# 1. 登录企业私有容器镜像仓库 (如阿里云 ACR 或 私有 Harbor)
docker login --username=your_username registry.cn-hangzhou.aliyuncs.com

# 2. 构建并推送后端镜像
docker build -t registry.cn-hangzhou.aliyuncs.com/xiangyu-ai/backend:v2.1.0 -f deploy/docker/backend.Dockerfile ./backend
docker push registry.cn-hangzhou.aliyuncs.com/xiangyu-ai/backend:v2.1.0

# 3. 构建并推送前端镜像
docker build -t registry.cn-hangzhou.aliyuncs.com/xiangyu-ai/frontend:v2.1.0 -f deploy/docker/frontend.Dockerfile ./frontend
docker push registry.cn-hangzhou.aliyuncs.com/xiangyu-ai/frontend:v2.1.0
```

---

### 步骤 2：初始化 MySQL 生产数据库与账号
在生产 MySQL 8.0 实例中执行以下 SQL 进行库与用户授权：
```sql
CREATE DATABASE IF NOT EXISTS edd_db DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xiangyu_app'@'%' IDENTIFIED BY 'AppPassword2026';
GRANT ALL PRIVILEGES ON edd_db.* TO 'xiangyu_app'@'%';
FLUSH PRIVILEGES;
```
> 后端启动时将通过 `init_db()` 自动检查建表并预置种子数据，亦可通过 `docs/database_schema.sql` 提前建表。

---

### 步骤 3：一键应用 K8s 资源清单
```bash
# 1. 切换到 k8s 清单目录
cd deploy/k8s

# 2. 依次应用命名空间、配置、服务与 Ingress
kubectl apply -f 01-namespace-and-configs.yaml
kubectl apply -f 02-backend-deployment.yaml
kubectl apply -f 03-frontend-deployment.yaml
kubectl apply -f 04-ingress.yaml
kubectl apply -f 05-hpa.yaml
```

---

### 步骤 4：检查集群运行状态
```bash
# 查看命名空间下的 Pod 状态 (需全为 Running 且 READY 1/1)
kubectl get pods -n xiangyu-ai -o wide

# 查看 Service 与 Ingress 分发状态
kubectl get svc,ingress -n xiangyu-ai

# 查看后端实时业务日志流
kubectl logs -f -l app=xiangyu-backend -n xiangyu-ai --tail=100
```

---

## 4. 生产运维常用指令速查

| 运维场景 | 执行指令 |
| :--- | :--- |
| **无损滚动重启后端** | `kubectl rollout restart deployment/xiangyu-backend -n xiangyu-ai` |
| **查看滚动更新状态** | `kubectl rollout status deployment/xiangyu-backend -n xiangyu-ai` |
| **回滚到上一版本** | `kubectl rollout undo deployment/xiangyu-backend -n xiangyu-ai` |
| **进入后端容器排查** | `kubectl exec -it deployment/xiangyu-backend -n xiangyu-ai -- /bin/bash` |
| **集群内健康检测** | `kubectl exec -it deployment/xiangyu-frontend -n xiangyu-ai -- wget -qO- http://xiangyu-backend-service:8000/api/v1/health` |
