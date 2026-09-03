import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import fs from 'fs'

// 解决 Windows 桌面路径符号链接/多盘符映射 (C:\Users\... -> D:\Users\...) 导致的路径与 React 单例分裂问题
try {
  const realCwd = fs.realpathSync(process.cwd());
  if (process.cwd() !== realCwd) {
    process.chdir(realCwd);
  }
} catch (e) {}

const realDir = fs.realpathSync(__dirname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, realDir, '');
  const apiTarget = env.VITE_API_TARGET || process.env.VITE_API_TARGET || 'http://192.168.110.234:8000';

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom', 'antd'],
      alias: {
        'react': path.resolve(realDir, 'node_modules/react'),
        'react-dom': path.resolve(realDir, 'node_modules/react-dom'),
      }
    },
    root: realDir,
    server: {
      port: 5173,
      host: true,
      fs: {
        strict: false,
        allow: [realDir, __dirname]
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    }
  }
})
