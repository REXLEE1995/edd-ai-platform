import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Zap, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  RefreshCw, 
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { Modal, message } from 'antd';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function RechargeModal({ open, onClose, onSuccess }) {
  const { user, refreshUserProfile } = useAuth();
  
  const [packages, setPackages] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // 订单与支付状态
  const [step, setStep] = useState(1); // 1: 选择套餐, 2: 扫码收银台
  const [payingOrder, setPayingOrder] = useState(null);
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    if (open) {
      setStep(1);
      setPayingOrder(null);
      fetchPackages();
    }
  }, [open]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/v1/billing/packages');
      const list = res.data || [];
      setPackages(list);
      if (list.length > 0) {
        // 默认选中推荐档位或中间档位
        const popular = list.find(p => p.id === 'pack_50' || p.id === 'pack_10') || list[0];
        setSelectedPkg(popular);
      }
    } catch (err) {
      console.error("Fetch packages error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async (pkg) => {
    const targetPkg = pkg || selectedPkg;
    if (!targetPkg) return;
    
    setCreatingOrder(true);
    try {
      const res = await apiClient.post('/v1/billing/orders/create', {
        package_id: targetPkg.id,
        pay_type: 'wechat'
      });
      setPayingOrder(res.data);
      setStep(2);
    } catch (err) {
      message.error(err.response?.data?.detail || '创建充值订单失败');
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleMockPaySuccess = async () => {
    if (!payingOrder) return;
    setIsProcessingPay(true);
    try {
      const res = await apiClient.post(`/v1/billing/orders/${payingOrder.order_id}/mock-pay`);
      message.success(res.message || '充值成功！尽调额度已即时到账');
      await refreshUserProfile();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      message.error(err.response?.data?.detail || '支付处理失败');
    } finally {
      setIsProcessingPay(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
      destroyOnClose
      styles={{
        content: {
          padding: '24px',
          borderRadius: '16px',
          background: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.05)'
        }
      }}
    >
      {step === 1 ? (
        <div className="space-y-5">
          {/* 弹窗头部 */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 pr-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-[#0096DB] text-white flex items-center justify-center shadow-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-950 tracking-tight">尽调额度充值加油包</h3>
                <p className="text-xs text-slate-500">按次计费 · 永久有效 · 生成后随时调阅不重复计费</p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">当前可用额度</span>
              <span className="font-mono text-sm font-bold text-[#0070a4]">
                {user?.balance_quota ?? 0} <span className="text-xs font-normal text-slate-500">次</span>
              </span>
            </div>
          </div>

          {/* 套餐列表 */}
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-[#0096DB]" />
              <span>正在获取最新优惠套餐...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packages.map((pkg) => {
                const isSelected = selectedPkg?.id === pkg.id;
                const isPopular = pkg.id === 'pack_50' || pkg.id === 'pack_10';
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#0096DB] bg-cyan-50/40 shadow-xs ring-2 ring-[#0096DB]/10'
                        : 'border-slate-200/90 bg-white hover:border-slate-300'
                    }`}
                  >
                    {isPopular && (
                      <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold bg-gradient-to-r from-sky-500 to-[#0096DB] text-white shadow-2xs">
                        推荐
                      </span>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-slate-900">{pkg.name}</span>
                        <span className="text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                          {pkg.quota_points || pkg.quota_count} 次
                        </span>
                      </div>

                      <div className="font-mono pt-1">
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-xs font-bold text-slate-600">¥</span>
                          <span className="text-2xl font-extrabold text-slate-950">
                            {pkg.price || pkg.price_cny}
                          </span>
                        </div>
                        {(pkg.original_price || pkg.original_price_cny) && (
                          <span className="text-[10px] text-slate-400 line-through">
                            原价 ¥{pkg.original_price || pkg.original_price_cny}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 leading-tight">
                        {pkg.desc || pkg.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                      <span>单次低至 ¥{Math.round((pkg.price || pkg.price_cny) / (pkg.quota_points || pkg.quota_count))}</span>
                      <div className={`w-4 h-4 rounded-full flex items-center justify-center ${isSelected ? 'bg-[#0096DB] text-white' : 'border border-slate-300'}`}>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 权益保障提示 */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>官方中台直连 · 包含工商、司法、股权与全景 PDF 原件导出</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">即买即用 · 实时到账</span>
          </div>

          {/* 底部结算按钮 */}
          <div className="pt-2 flex items-center justify-between gap-3">
            <div className="text-xs text-slate-500 font-mono">
              已选: <strong className="text-slate-900 font-bold">{selectedPkg?.name || '请选择套餐'}</strong>
              {selectedPkg && (
                <span className="ml-2 font-bold text-base text-[#0096DB]">
                  ¥{selectedPkg.price || selectedPkg.price_cny}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="shadcn-button-outline text-xs py-2 px-4"
              >
                取消
              </button>
              <button
                type="button"
                disabled={!selectedPkg || creatingOrder}
                onClick={() => handleCreateOrder()}
                className="shadcn-button-primary text-xs py-2 px-5 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {creatingOrder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>正在创建订单...</span>
                  </>
                ) : (
                  <>
                    <span>立即充值</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Step 2: 扫码收银台 */
        payingOrder && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 pr-10">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>返回重新选择套餐</span>
              </button>
              <span className="text-xs font-mono text-slate-400">单号: {payingOrder.order_no}</span>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-44 h-44 mx-auto bg-white p-2.5 border border-slate-200 rounded-xl shadow-xs flex items-center justify-center">
                <img src={payingOrder.pay_qrcode_url} alt="微信支付二维码" className="w-full h-full object-contain" />
              </div>
              <div className="font-mono space-y-0.5">
                <span className="text-xs text-slate-500 block">应付金额 (微信支付)</span>
                <span className="text-3xl font-extrabold text-slate-950">¥{payingOrder.amount}</span>
                <p className="text-xs text-slate-600 mt-1 font-sans">
                  {payingOrder.package_name} (入账 +{payingOrder.quota_points} 次尽调额度)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleMockPaySuccess}
                disabled={isProcessingPay}
                className="shadcn-button-primary w-full py-2.5 text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5"
              >
                {isProcessingPay ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>正在结算入账...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-cyan-200" />
                    <span>⚡ 模拟微信扫码支付成功 (开发测试通道)</span>
                  </>
                )}
              </button>
              <p className="text-center text-[11px] text-slate-400 font-mono">
                支付完成后系统将秒级入账，请勿重复支付
              </p>
            </div>
          </div>
        )
      )}
    </Modal>
  );
}
