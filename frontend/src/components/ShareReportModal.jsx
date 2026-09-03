import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Share2, 
  KeyRound, 
  Copy, 
  Check, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  X,
  ExternalLink,
  Ban,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Modal, message, Tooltip } from 'antd';
import apiClient from '../api/client';

// 兼容全平台全协议剪贴板复制工具函数
const copyText = async (text) => {
  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {}
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.left = '-999999px';
    document.body.appendChild(el);
    el.focus();
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch (err) {
    return false;
  }
};

// 随机生成 6 位数字
const generateRandomPin = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const EXPIRATION_OPTIONS = [
  { label: '1 天', value: 1 },
  { label: '7 天', value: 7 },
  { label: '15 天', value: 15 },
  { label: '30 天', value: 30 },
  { label: '永久有效', value: 0 },
  { label: '自定义', value: 'custom' },
];

export default function ShareReportModal({ report, open, onClose, onShareUpdated }) {
  const [loading, setLoading] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [expireOption, setExpireOption] = useState(15);
  const [customDays, setCustomDays] = useState(15);
  const [copied, setCopied] = useState(false);

  // 打开弹窗时获取或初始化分享配置
  useEffect(() => {
    if (open && report?.id) {
      loadShareStatus();
    } else {
      setShareData(null);
      setAccessCode('');
      setExpireOption(15);
      setCustomDays(15);
      setCopied(false);
    }
  }, [open, report?.id]);

  const loadShareStatus = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/v1/shares/reports/${report.id}/current`);
      if (res.data) {
        setShareData(res.data);
        setAccessCode(res.data.access_code);
        if (res.data.expire_at === null) {
          setExpireOption(0);
        } else if (res.data.remaining_days) {
          const rem = res.data.remaining_days;
          if ([1, 7, 15, 30].includes(rem)) {
            setExpireOption(rem);
          } else {
            setExpireOption('custom');
            setCustomDays(rem);
          }
        }
      } else {
        // 若尚未创建分享，初始化一个 6 位随机密码
        setAccessCode(generateRandomPin());
        setExpireOption(15);
      }
    } catch (err) {
      console.error(err);
      setAccessCode(generateRandomPin());
    } finally {
      setLoading(false);
    }
  };

  const getCalculatedExpireDays = () => {
    if (expireOption === 'custom') {
      return Math.max(1, parseInt(customDays) || 1);
    }
    return expireOption;
  };

  const handleCreateOrUpdateShare = async () => {
    const pin = accessCode.trim();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      message.error('请设置严格 6 位纯数字访问密码');
      return;
    }

    const days = getCalculatedExpireDays();

    setLoading(true);
    try {
      const res = await apiClient.post(`/v1/shares/reports/${report.id}/create`, {
        access_code: pin,
        expire_days: days
      });
      message.success(res.message || '6 位密码加密分享已生成！');
      setShareData(res.data);
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      message.error(err.response?.data?.detail || '生成分享失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async () => {
    if (!shareData?.id) return;
    setLoading(true);
    try {
      await apiClient.post(`/v1/shares/${shareData.id}/revoke`);
      message.success('已关闭并撤销该分享链接');
      setShareData(prev => prev ? { ...prev, status: 'revoked' } : null);
      if (onShareUpdated) onShareUpdated();
    } catch (err) {
      message.error(err.response?.data?.detail || '撤销失败');
    } finally {
      setLoading(false);
    }
  };

  const shareCode = shareData?.share_code || 'sh_preview';
  const shareUrl = `${window.location.origin}/share/${shareCode}`;

  const copyFullShareText = async () => {
    const expiryText = shareData?.expires_in_text || (getCalculatedExpireDays() === 0 ? '永久有效 (不过期)' : `${getCalculatedExpireDays()} 天内有效`);
    const text = `【享宇AI智评 · 企业深度尽调报告加密查阅】\n🏢 企业名称：${report?.company_name || '目标企业'}\n📌 统一代码：${report?.credit_code || ''}\n🔗 访问链接：${shareUrl}\n🔑 6 位访问密码：${accessCode || shareData?.access_code || '888666'}\n🕒 分享有效期：${expiryText}`;
    const ok = await copyText(text);
    if (ok) {
      setCopied(true);
      message.success('已复制专属分享链接与 6 位访问密码！');
      setTimeout(() => setCopied(false), 3000);
    } else {
      message.error('复制失败，请手动选择复制');
    }
  };

  const isExpired = shareData?.is_expired;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={540}
      title={
        <div className="flex items-center gap-2.5 text-base font-bold text-slate-950 pb-2 border-b border-slate-100/80 pr-10">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-[#0ea5e9] text-white flex items-center justify-center shadow-xs border border-white/50 backdrop-blur-md">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h3>报告安全加密分享</h3>
            <p className="text-[11px] font-normal text-slate-500">
              设置 6 位访问密码与专属失效期限，生成受控的外部分享链接与二维码
            </p>
          </div>
        </div>
      }
    >
      <div className="py-3 space-y-4 text-slate-900">
        
        {/* 企业基本信息卡片 */}
        <div className="p-3.5 bg-cyan-50/60 backdrop-blur-md rounded-xl border border-cyan-100/70 flex items-center justify-between gap-3 shadow-2xs">
          <div>
            <h4 className="text-sm font-bold text-slate-950">{report?.company_name}</h4>
            <p className="text-xs text-slate-500 font-mono mt-0.5">统一社会信用代码: {report?.credit_code}</p>
          </div>
          {shareData && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 border backdrop-blur-sm ${
              isExpired
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : shareData.status === 'revoked'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-cyan-50 text-[#0284c7] border-cyan-200/80'
            }`}>
              {isExpired ? (
                <>
                  <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" /> 分享链接已失效
                </>
              ) : shareData.status === 'revoked' ? (
                <>
                  <Ban className="w-3 h-3 mr-1 text-amber-600" /> 分享已暂停
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 mr-1 text-[#0ea5e9]" />
                  {shareData.expire_at ? `剩余 ${shareData.remaining_days} 天` : '永久有效'}
                </>
              )}
            </span>
          )}
        </div>

        {/* 1. 6 位数字访问密码配置 */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <span>设置 6 位数字访问密码 (PIN) *</span>
            </span>
            <button
              type="button"
              onClick={() => setAccessCode(generateRandomPin())}
              className="text-xs text-[#0ea5e9] hover:text-[#0284c7] font-medium flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              随机生成
            </button>
          </label>

          <input
            type="text"
            maxLength={6}
            value={accessCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setAccessCode(val);
            }}
            placeholder="如: 888666"
            className="w-full text-center text-lg tracking-[0.3em] font-mono font-bold py-2.5 px-4 rounded-md bg-white/90 backdrop-blur-md border border-slate-200/90 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20 transition-all text-slate-950 shadow-xs"
          />
          <p className="text-[11px] text-slate-500">外部人员访问分享链接时必须输入此 6 位密码方可解锁查阅。</p>
        </div>

        {/* 2. 分享链接失效时间选择 */}
        <div className="space-y-2 pt-1 border-t border-slate-100/80">
          <label className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#0ea5e9]" />
              <span>分享链接有效期限 *</span>
            </span>
            {shareData?.expires_in_text && (
              <span className="text-[11px] font-normal text-[#0284c7] font-mono">
                当前: {shareData.expires_in_text}
              </span>
            )}
          </label>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {EXPIRATION_OPTIONS.map((opt) => {
              const isSelected = expireOption === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setExpireOption(opt.value)}
                  className={`py-1.5 px-2 text-xs font-medium rounded-md border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-gradient-to-r from-sky-400 to-[#0ea5e9] text-white border-[#0ea5e9] font-semibold shadow-xs'
                      : 'bg-white/80 backdrop-blur-sm border-slate-200/80 text-slate-700 hover:border-[#0ea5e9] hover:text-[#0284c7]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {expireOption === 'custom' && (
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-600 shrink-0">自定义有效天数:</span>
              <input
                type="number"
                min={1}
                max={365}
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                className="w-24 px-3 py-1.5 text-xs rounded-md bg-white/90 border border-slate-200/90 focus:border-[#0ea5e9] focus:ring-1 focus:ring-[#0ea5e9] font-mono font-bold"
              />
              <span className="text-xs text-slate-500">天 (1~365 天)</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCreateOrUpdateShare}
              disabled={loading || accessCode.length !== 6}
              className="w-full shadcn-button-primary text-xs py-2.5 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{shareData ? '更新分享配置与密码' : '立即生成加密分享链接'}</span>
            </button>
          </div>
        </div>

        {/* 3. 分享链接与二维码展示区 */}
        {shareData && shareData.status === 'active' && (
          <div className="p-4 bg-white/80 backdrop-blur-xl rounded-lg border border-white/90 space-y-4 shadow-glass">
            
            {/* 链接展示与一键复制 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0ea5e9]" />
                  专属加密分享链接:
                </span>
                <span className="text-[11px] text-[#0284c7] font-medium bg-cyan-50/80 px-2 py-0.2 rounded-md border border-cyan-200/60 font-mono">
                  已查阅 {shareData.view_count || 0} 次
                </span>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={shareUrl}
                  className="w-full text-xs font-mono py-2 px-3 rounded-md bg-white/90 border border-slate-200/90 text-slate-800 select-all"
                />
                <button
                  type="button"
                  onClick={copyFullShareText}
                  className="shadcn-button-primary text-xs py-2 px-3.5 shrink-0 flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? '已复制' : '复制全套'}</span>
                </button>
              </div>
            </div>

            {/* 二维码与移动端预览 */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="space-y-1 text-xs text-slate-600">
                <p className="font-semibold text-slate-900">微信/手机扫码直接查阅：</p>
                <p className="text-[11px] text-slate-500">扫码后打开安全解锁页面，输入 6 位密码即刻阅读。</p>
                <div className="pt-1 flex items-center gap-2">
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[#0ea5e9] hover:text-[#0284c7] font-medium flex items-center gap-1 inline-block"
                  >
                    <ExternalLink className="w-3 h-3" />
                    在新标签页中测试访问
                  </a>
                </div>
              </div>

              <div className="p-2 bg-white rounded-md border border-slate-200/80 shrink-0 shadow-xs">
                <QRCodeSVG value={shareUrl} size={88} level="M" />
              </div>
            </div>

          </div>
        )}

        {/* 已撤销状态提示 */}
        {shareData && shareData.status === 'revoked' && (
          <div className="p-4 bg-amber-50/80 backdrop-blur-sm border border-amber-200/80 rounded-lg text-xs text-amber-900 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <Ban className="w-4 h-4 text-amber-700" />
              <span>该报告分享链接当前处于【已关闭/已撤销】状态</span>
            </div>
            <p className="text-slate-600">外部访客打开该链接将提示分享已关闭。如需重新分享，请点击上方重新生成激活。</p>
          </div>
        )}

        {/* 底部操作栏 */}
        <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between">
          <div>
            {shareData && shareData.status === 'active' && !isExpired && (
              <button
                type="button"
                onClick={handleRevokeShare}
                disabled={loading}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium flex items-center gap-1 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" />
                关闭/撤销此分享
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="shadcn-button-outline text-xs py-1.5 px-3.5 shadow-xs"
            >
              关闭
            </button>
            {shareData && shareData.status === 'active' && !isExpired && (
              <button
                type="button"
                onClick={copyFullShareText}
                className="shadcn-button-primary text-xs py-1.5 px-4"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>复制分享口令</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </Modal>
  );
}
