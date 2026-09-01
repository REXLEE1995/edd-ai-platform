@echo off
chcp 65001 > nul
title 享宇AI智评 本地开发启动器

echo ========================================================
echo   享宇AI智评 - 企业尽调系统 (轻量版本地一键启动)
echo ========================================================
echo.
echo [1/3] 检查运行环境...
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请确保 Python 3.11 已安装并配置环境变量。
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Node.js / NPM，请确保 Node.js 已安装并配置环境变量。
    pause
    exit /b 1
)

echo [2/3] 启动 FastAPI 异步后端服务 (http://127.0.0.1:8000)...
start "EDD AI Backend (FastAPI)" cmd /k "cd backend && python main.py"

echo [3/3] 启动 Vite 前端服务 (http://localhost:5173)...
start "EDD AI Frontend (Vite)" cmd /k "cd frontend && npm run dev"

echo.
echo ========================================================
echo   服务已成功启动！
echo   - 宣传官网与 SaaS 尽调工作台: http://localhost:5173
echo   - 运营管理后台 (Admin):     http://localhost:5173/admin
echo   - 后端 Swagger API 接口文档:  http://127.0.0.1:8000/docs
echo ========================================================
echo.
pause
