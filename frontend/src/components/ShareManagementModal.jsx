import React, { useState, useEffect } from 'react';
import { 
  FolderLock, 
  KeyRound, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  X,
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Layers,
  Search,
  Sparkles,
  Calendar
} from 'lucide-react';
import { Modal, message, Tooltip } from 'antd';
import apiClient from '../api/client';

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

const EXP_OPTIONS = [
  { label: '1 天', value: 1 },
  { label: '7 天', value: 7 },
  { label: '15 天', value: 15 },
  { label: '30 天', value: 30 },
  { label: '永久有效', value: 0 },
];

export default function ShareManagementModal({ open, onClose }) {
  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingShare, setEditingShare] = useState(null);
  const [newPin, setNewPin] = useState('');
  const [editingExpDays, setEditingExpDays] = useState(15);
  const [visiblePins, setVisiblePins] = useState({});
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (open) {
      fetchShares();
    }
  }, [open]);

  const fetchShares = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/v1/shares/my');
      setShares(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePinVisibility = (shareId) => {
    setVisiblePins(prev => ({
      ...prev,
      [shareId]: !prev[shareId]
    }));
  };

  const handleRevokeShare = async (shareId) => {
    try {
      await apiClient.post(`/v1/shares/${shareId}/revoke`);
      message.success('已关闭并撤销该分享链接');
      fetchShares();
    } catch (err) {
      message.error(err.response?.data?.detail || '操作失败');
    }
  };

  const handleActivateShare = async (shareId) => {
    try {
      await apiClient.post(`/v1/shares/${shareId}/activate`);
      message.success('已重新开启该分享链接');
      fetchShares();
    } catch (err) {
      message.error(err.response?.data?.detail || '操作失败');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingShare) return;
    const pin = newPin.trim();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      message.error('请设置严格 6 位纯数字访问密码');
      return;
    }
    try {
      // 1. 更新密码
      await apiClient.post(`/v1/shares/${editingShare.id}/update-password`, {
        access_code: pin
      });
      // 2. 更新有效期
      await apiClient.post(`/v1/shares/${editingShare.id}/update-expiration`, {
        expire_days: editingExpDays
      });
      message.success('分享配置与 6 位密码已更新！');
      setEditingShare(null);
      setNewPin('');
      fetchShares();
    } catch (err) {
      message.error(err.response?.data?.detail || '更新失败');
    }
  };

  const copyShareInfo = async (share) => {
    const shareUrl = `${window.location.origin}/share/${share.share_code}`;
    const expText = share.expires_in_text || (share.expire_at ? `有效期至 ${share.expire_at}` : '永久有效 (不过期)');
    const text = `【享宇AI智评 · 企业深度尽调报告加密查阅】\n🏢 企业名称：${share.company_name}\n📌 统一代码：${share.credit_code}\n🔗 访问链接：${shareUrl}\n🔑 6 位访问密码：${share.access_code}\n🕒 分享有效期：${expText}`;
    const ok = await copyText(text);
    if (ok) {
      message.success(`已复制【${share.company_name}】的分享链接与 6 位密码！`);
    } else {
      message.error('复制失败，请手动选择复制');
    }
  };

  const filteredShares = shares.filter(s => {
    if (!keyword) return true;
    return s.company_name?.includes(keyword) || s.credit_code?.includes(keyword) || s.share_code?.includes(keyword);
  });

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={820}
      title={
        <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-400 to-[#0ea5e9] text-white flex items-center justify-center shadow-xs border border-white/50 backdrop-blur-md">
              <FolderLock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950">报告加密分享管理中心</h3>
              <p className="text-[11px] font-normal text-slate-500">
                集中管理我创建的所有报告加密外链、6 位访问密码与有效期限
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchShares}
            className="shadcn-button-outline text-xs py-1.5 px-3 flex items-center gap-1.5 hover:border-[#0ea5e9] hover:text-[#0284c7] shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>刷新列表</span>
          </button>
        </div>
      }
    >
      <div className="py-3 space-y-4 text-slate-900">
        
        {/* 顶部搜索过滤 */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索企业全称或统一社会信用代码..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-md bg-white/80 backdrop-blur-md border border-slate-200/90 focus:bg-white focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20 transition-all shadow-2xs"
            />
          </div>
          <span className="text-xs text-slate-500 shrink-0 font-mono">
            共 {filteredShares.length} 条分享记录
          </span>
        </div>

        {/* 分享列表 */}
        {loading ? (
          <div className="text-center py-16 text-xs text-slate-400">正在加载分享记录...</div>
        ) : filteredShares.length === 0 ? (
          <div className="p-12 text-center bg-white/75 backdrop-blur-xl rounded-lg border border-white/80 space-y-2 shadow-glass">
            <FolderLock className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">暂无已创建的报告分享</p>
            <p className="text-xs text-slate-500">在尽调报告资产库或报告阅读器中点击【分享报告】即可生成加密外链。</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
            {filteredShares.map((share) => {
              const isExpired = share.is_expired || share.status === 'expired';
              const isRevoked = share.status === 'revoked';
              const shareUrl = `${window.location.origin}/share/${share.share_code}`;
              const isPinVisible = visiblePins[share.id];

              return (
                <div 
                  key={share.id}
                  className={`p-4 rounded-lg border transition-all ${
                    isExpired
                      ? 'bg-slate-50/60 border-slate-200/70 opacity-75'
                      : isRevoked
                      ? 'bg-amber-50/40 border-amber-200/70'
                      : 'bg-white/85 backdrop-blur-xl border-white/90 shadow-glass hover:shadow-glass-hover hover:border-[#0ea5e9]/40'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    
                    {/* 左侧：企业与状态 */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-950 truncate max-w-sm">
                          {share.company_name}
                        </h4>
                        
                        {/* 状态徽标 */}
                        {isExpired ? (
                          <span className="inline-flex items-center px-2 py-0.2 rounded-md text-[10px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" /> 分享链接已失效
                          </span>
                        ) : isRevoked ? (
                          <span className="inline-flex items-center px-2 py-0.2 rounded-md text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Ban className="w-3 h-3 mr-1 text-amber-600" /> 已暂停分享
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.2 rounded-md text-[10px] font-medium bg-cyan-50/80 text-[#0284c7] border border-cyan-200/60 backdrop-blur-sm">
                            <CheckCircle2 className="w-3 h-3 mr-1 text-[#0ea5e9]" />
                            {share.expire_at ? `生效中 (剩余 ${share.remaining_days} 天)` : '永久有效'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-mono">
                        <span>代码: {share.credit_code}</span>
                        <span>有效期: <strong className="text-slate-800">{share.expires_in_text || (share.expire_at ? `至 ${share.expire_at}` : '永久有效')}</strong></span>
                        <span>累计查阅: <strong className="text-[#0284c7] font-bold">{share.view_count || 0}</strong> 次</span>
                      </div>
                    </div>

                    {/* 右侧：6 位访问密码 */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                      <div className="flex items-center gap-1.5 bg-slate-100/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-200/80 shadow-2xs">
                        <KeyRound className="w-3.5 h-3.5 text-[#0ea5e9]" />
                        <span className="text-xs font-mono font-bold tracking-widest text-slate-950">
                          {isPinVisible ? share.access_code : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePinVisibility(share.id)}
                          className="text-slate-400 hover:text-[#0ea5e9] p-0.5 cursor-pointer ml-1"
                          title={isPinVisible ? '隐藏密码' : '显示密码'}
                        >
                          {isPinVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingShare(share);
                          setNewPin(share.access_code);
                          setEditingExpDays(share.remaining_days || 15);
                        }}
                        className="text-[11px] text-[#0ea5e9] hover:text-[#0284c7] font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        配置 / 改密
                      </button>
                    </div>

                  </div>

                  {/* 底部操作条 */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="text-slate-400 text-[11px]">
                      创建于 {share.created_at || '近期'} · 最近查阅: {share.last_accessed_at || '未查阅'}
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shadcn-button-outline text-[11px] py-1 px-2.5 flex items-center gap-1 hover:border-[#0ea5e9] hover:text-[#0ea5e9] shadow-2xs"
                        title="外部打开查看"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>访问外链</span>
                      </a>

                      {!isExpired && (
                        <>
                          <button
                            type="button"
                            onClick={() => copyShareInfo(share)}
                            className="shadcn-button-primary text-[11px] py-1 px-3 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>复制口令</span>
                          </button>

                          {isRevoked ? (
                            <button
                              type="button"
                              onClick={() => handleActivateShare(share.id)}
                              className="text-[11px] text-[#0ea5e9] hover:text-[#0284c7] font-medium cursor-pointer"
                            >
                              重新开启
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRevokeShare(share.id)}
                              className="text-[11px] text-rose-600 hover:text-rose-800 font-medium cursor-pointer"
                            >
                              暂停分享
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* 底部关闭按钮 */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="shadcn-button-outline text-xs py-1.5 px-4 shadow-xs"
          >
            关闭管理中心
          </button>
        </div>

      </div>

      {/* 修改配置与 6 位密码嵌套弹窗 */}
      <Modal
        open={!!editingShare}
        onCancel={() => setEditingShare(null)}
        footer={null}
        width={440}
        title={
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <KeyRound className="w-4 h-4 text-[#0ea5e9]" />
            修改【{editingShare?.company_name}】分享配置
          </div>
        }
      >
        <div className="py-3 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">新 6 位数字访问密码 (PIN):</label>
            <input
              type="text"
              maxLength={6}
              value={newPin}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                setNewPin(val);
              }}
              placeholder="请输入 6 位数字"
              className="w-full text-center text-lg tracking-[0.3em] font-mono font-bold py-2.5 px-4 rounded-md bg-white/90 border border-slate-200/90 focus:border-[#0ea5e9] focus:ring-2 focus:ring-[#0ea5e9]/20 transition-all text-slate-950 shadow-xs"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800">有效期限调整:</label>
            <div className="grid grid-cols-5 gap-2">
              {EXP_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setEditingExpDays(opt.value)}
                  className={`py-1 px-1.5 text-xs font-medium rounded-md border transition-all cursor-pointer text-center ${
                    editingExpDays === opt.value
                      ? 'bg-gradient-to-r from-sky-400 to-[#0ea5e9] text-white border-[#0ea5e9] font-semibold shadow-xs'
                      : 'bg-white/80 backdrop-blur-sm border-slate-200/80 text-slate-700 hover:border-[#0ea5e9] hover:text-[#0ea5e9]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setEditingShare(null)}
              className="shadcn-button-outline text-xs py-1.5 px-3.5 shadow-xs"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={newPin.length !== 6}
              className="shadcn-button-primary text-xs py-1.5 px-4 disabled:opacity-50"
            >
              保存修改
            </button>
          </div>
        </div>
      </Modal>

    </Modal>
  );
}
