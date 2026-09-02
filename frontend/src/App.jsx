import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import AppRoutes from './routes/AppRoutes';

dayjs.locale('zh-cn');

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0ea5e9',
          colorBgBase: '#ffffff',
          colorBgContainer: '#ffffff',
          colorBgLayout: '#f8fafc',
          colorBorder: 'rgba(226, 232, 240, 0.8)',
          colorBorderSecondary: 'rgba(241, 245, 249, 0.9)',
          colorText: '#0f172a',
          colorTextSecondary: '#64748b',
          borderRadius: 6,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          controlHeight: 36,
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTop />
          <div className="relative flex flex-col min-h-screen bg-[#f8fafc] text-[#0f172a] selection:bg-cyan-100 selection:text-cyan-900 overflow-x-clip">
            {/* Ambient Lighting Gradient Orbs fusing Azure #0ea5e9, Teal #29B47D, and Green #5AB331 */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              <div className="absolute -top-32 right-10 w-[520px] h-[520px] bg-gradient-to-br from-[#0ea5e9]/18 via-[#29B47D]/14 to-[#5AB331]/10 rounded-full blur-[110px]" />
              <div className="absolute top-1/3 -left-32 w-[480px] h-[480px] bg-gradient-to-tr from-[#29B47D]/16 via-[#5AB331]/12 to-[#0ea5e9]/10 rounded-full blur-[100px]" />
              <div className="absolute -bottom-32 right-1/3 w-[520px] h-[520px] bg-gradient-to-t from-[#0ea5e9]/14 via-[#29B47D]/12 to-[#5AB331]/10 rounded-full blur-[110px]" />
            </div>

            <div className="relative z-10 flex flex-col flex-1">
              <Navbar />
              <main className="flex-1 pb-16 md:pb-0">
                <AppRoutes />
              </main>
              <Footer />
            </div>
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
