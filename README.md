# 享宇AI智评 - 企业全景尽调与智能风控平台

> **版本**：v2.1  
> **特性**：零外部强依赖（内置 SQLite + 内存缓存抽象），开箱即用，支持一键发起全景尽调、个人实名送免费额度、大纲目录定位、章节 AI 深度研判与 A4 PDF 原件下载。

---

## 1. 架构总览

平台由三大核心子系统构成：
1. **宣传营销官网 (`/`)**：DeepSeek 极简科技风，面向公网获客，包含动态企业联想搜索首屏与报告交互 Demo。
2. **尽调 SaaS 工作台 (`/app`)**：全端自适应，支持一键发起全景尽调、个人公安实名核验与额度赠送、章节 AI 研判抽屉、三栏高清报告阅读器、纯份数阶梯加油包充值。
3. **后台运营管理服务 (`/admin`)**：面向运营、风控与财务人员，统一采用金融科技风设计，提供注册用户 360° 全景画像透视、账号状态管控（冻结/解冻/重置密码）、额度精准人工调控（带凭据与工单审计）、全生命周期额度流水对账及线上订单管理。

---

## 2. 极简本地运行方式

### 方式一：Windows 一键双击启动 (推荐)
直接双击根目录下的 **`start_dev.bat`** 即可自动分别启动后端与前端服务。

### 方式二：手动命令行启动

#### 1. 启动后端 (FastAPI)
```powershell
cd backend
# 首次运行安装依赖 (如已安装可跳过)
python -m pip install -r requirements.txt

# 启动后端服务 (首次启动将自动创建 SQLite 数据库并预置测试数据)
python main.py
```
- 后端服务地址：`http://127.0.0.1:8000`
- Swagger API 文档：`http://127.0.0.1:8000/docs`

#### 2. 启动前端 (Vite + React 18)
```powershell
cd frontend
# 首次运行安装依赖
npm install

# 启动前端开发服务器
npm run dev
```
- 前端访问入口：`http://localhost:5173`

---

## 3. 预置演示账号与测试数据

系统在首次启动时会自动在本地 SQLite 数据库中预置以下账号：

| 角色类型 | 登录入口 | 账号 | 密码 | 默认权益 |
| :--- | :--- | :--- | :--- | :--- |
| **前台演示企业用户** | `http://localhost:5173/auth/login` | `13800138000` | `123456` (或验证码 `123456`) | 预置 12 次可用额度、包含已完成的腾讯科技尽调报告 |
| **后台超级管理员** | `http://localhost:5173/admin/login` | `admin` | `admin123` | 全站最高运营管理权限、人工调额与流水导出 |
| **后台运营专员** | `http://localhost:5173/admin/login` | `operation` | `admin123` | 用户管理、工单调额、订单审核 |

---

## 4. 轻量版到生产版平滑演进指南 (100% 零代码修改)

当后续项目上线部署到云服务器（如阿里云/腾讯云）时，**无需修改任何一行业务代码**，仅需修改 `backend/.env` 环境变量：

```env
# 1. 切换数据库为云端 PostgreSQL
DATABASE_URL=postgresql+asyncpg://postgres:your_password@pg-host:5432/edd_db

# 2. 切换缓存与任务锁为云端 Redis
CACHE_DRIVER=redis
REDIS_URL=redis://:your_redis_password@redis-host:6379/0

# 3. 切换中台与微风企为生产真实数据接口
DATA_PROVIDER=real
ZHONGTAI_API_KEY=your_production_key
WEIFENGQI_API_KEY=your_production_key

# 4. 配置生产大模型 Key
LLM_PROVIDER=deepseek
OPENAI_API_KEY=sk-your-deepseek-api-key
```

前端构建打包：
```powershell
cd frontend
npm run build
```
将生成的 `dist` 目录交由 Nginx 托管并反代 `/api` 至后端 Gunicorn/FastAPI 即可！
