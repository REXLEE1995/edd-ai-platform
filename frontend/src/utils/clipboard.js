/**
 * 全平台、全协议、全浏览器高兼容性剪贴板复制工具
 * 
 * 解决痛点：
 * 1. 局域网 IP / 非 HTTPS (如 http://192.168.x.x:5173) 下 navigator.clipboard 为 undefined 的报错
 * 2. Mac Safari / iOS 移动端环境对软键盘和 Range 选区的特殊限制
 * 3. 异步 Promise 拒绝时的平滑兜底
 */
export async function copyToClipboard(text) {
  if (text === null || text === undefined) {
    return false;
  }
  const stringToCopy = String(text);
  if (!stringToCopy) {
    return false;
  }

  // 1. 首选: 现代异步 Clipboard API (在 HTTPS 或 localhost 安全上下文可用)
  if (typeof window !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(stringToCopy);
      return true;
    } catch (err) {
      console.warn('[clipboard] navigator.clipboard.writeText error, falling back:', err);
    }
  }

  // 2. 强力降级: 动态创建隐藏 textarea 借助 document.execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = stringToCopy;
      // 样式防御: 防止移动端弹起键盘或引起页面滚动位移
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.width = '1px';
      textarea.style.height = '1px';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0';
      textarea.style.pointerEvents = 'none';

      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (successful) {
        return true;
      }
    } catch (fallbackErr) {
      console.error('[clipboard] execCommand fallback error:', fallbackErr);
    }
  }

  return false;
}
