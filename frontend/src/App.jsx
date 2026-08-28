import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#0f172a',
          colorBgBase: '#ffffff',
          colorBgContainer: '#ffffff',
          colorBgLayout: '#fafafa',
          colorBorder: '#e4e4e7',
          colorBorderSecondary: '#f4f4f5',
          colorText: '#09090b',
          colorTextSecondary: '#71717a',
          borderRadius: 8,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          controlHeight: 36,
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="flex flex-col min-h-screen bg-[#fafafa] text-[#09090b] selection:bg-slate-200 selection:text-slate-900">
            <Navbar />
            <main className="flex-1">
              <AppRoutes />
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
