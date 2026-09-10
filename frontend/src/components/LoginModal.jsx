import React, { useState, useEffect } from 'react';
import { Modal, message } from 'antd';
import { Phone, Lock, ArrowRight, X, Sparkles } from 'lucide-react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function LoginModal() {
  const { isLoginModalOpen, closeLoginModal, userLogin, refreshUserProfile } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // 关闭时重置部分瞬态状态
  const handleCancel = () => {
    closeLoginModal();
  };

  const handleSendCode = async () => {
    if (!phone || phone.length < 11) {
      message.warning('请先输入有效的 11 位手机号码');
      return;
    }
    setSendLoading(true);
    try {
      const res = await apiClient.post('/v1/auth/send-code', { phone, scene: 'login' });
      setCountdown(60);
      message.success(res?.message || '短信验证码已成功发送至您的手机，5分钟内有效，请查收！');
    } catch (err) {
      message.error(err.response?.data?.detail || '短信发送失败，请稍后重试');
    } finally {
      setSendLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!phone || phone.length < 11) {
      message.warning('请输入有效的 11 位手机号码');
      return;
    }
    if (!code) {
      message.warning('请输入短信验证码');
      return;
    }

    setLoading(true);
    try {
      const res = await userLogin(phone, code);
      if (res?.is_new_user) {
        message.success('注册并登录成功！已为您开启平台企业全景尽调权限');
      } else {
        message.success(res?.message || '登录成功，欢迎回到工作台！');
      }
      await refreshUserProfile();
      closeLoginModal();
      window.dispatchEvent(new CustomEvent('auth:user_login', { detail: res?.user }));
    } catch (err) {
      message.error(err.response?.data?.detail || '认证失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isLoginModalOpen}
      onCancel={handleCancel}
      footer={null}
      centered
      destroyOnHidden
      width={420}
      className="login-modal-custom"
      styles={{
        content: {
          padding: 0,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }
      }}
    >
      <div className="p-6 sm:p-7 text-slate-900 space-y-5">
        
        {/* 头部品牌与说明 */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-12 h-12 mx-auto flex items-center justify-center">
            <img src="/brand_logo.png" alt="享宇AI智评" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-950 tracking-tight">手机快捷 注册/登录</h3>
            <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
              未注册手机号将自动创建账号并开启 AI 尽调权限
            </p>
          </div>
        </div>

        {/* 表单 */}
        <form onSubmit={handleLogin} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">手机号码</label>
            <div className="flex items-center bg-slate-50/80 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-[#0096DB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0096DB]/15 transition-all">
              <Phone className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入 11 位手机号码"
                className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-slate-400"
                maxLength={11}
                autoFocus
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-700">短信验证码</label>
            <div className="flex items-center bg-slate-50/80 rounded-xl px-3.5 py-2.5 border border-slate-200 focus-within:border-[#0096DB] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#0096DB]/15 transition-all">
              <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入 6 位验证码"
                className="w-full bg-transparent border-0 text-xs text-slate-900 focus:outline-none font-mono placeholder:text-slate-400"
                maxLength={6}
                required
              />
              <button
                type="button"
                disabled={countdown > 0 || sendLoading}
                onClick={handleSendCode}
                className={`text-xs font-semibold shrink-0 ml-2 cursor-pointer transition-colors ${
                  countdown > 0 || sendLoading 
                    ? 'text-slate-400 cursor-not-allowed' 
                    : 'text-[#0084c2] hover:text-[#0070a4] hover:underline'
                }`}
              >
                {countdown > 0 ? `${countdown}s 后重试` : (sendLoading ? '发送中...' : '获取验证码')}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="shadcn-button-primary w-full py-2.5 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            {loading ? (
              <span>正在核验身份...</span>
            ) : (
              <>
                <span>立即注册 / 登录</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* 底部协议提示 */}
        <div className="pt-2 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <span>登录/注册即代表同意并遵守</span>
          <span className="text-slate-600 hover:underline mx-1 cursor-pointer">《用户服务协议》</span>
          <span>与</span>
          <span className="text-slate-600 hover:underline mx-1 cursor-pointer">《金融级隐私政策》</span>
        </div>

      </div>
    </Modal>
  );
}
