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
          colorPrimary: '#2563eb',
          colorBgBase: '#ffffff',
          colorBgContainer: '#ffffff',
          colorBorder: '#e2e8f0',
          colorText: '#1e293b',
          colorTextSecondary: '#64748b',
          borderRadius: 10,
        },
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <div className="flex flex-col min-h-screen bg-slate-50 text-slate-800">
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
