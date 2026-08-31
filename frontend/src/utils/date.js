/**
 * 通用时间时区转换工具类
 * 将后端数据库中的 UTC 时间转换为用户浏览器所在本地时区时间进行展示
 */
export function formatLocalTime(utcDateStr, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!utcDateStr) return '-';

  try {
    let dateObj;
    if (typeof utcDateStr === 'number') {
      dateObj = new Date(utcDateStr);
    } else if (typeof utcDateStr === 'string') {
      let cleanStr = utcDateStr.trim();
      // 若已有 Z 或时区偏移量，直接解析；若没有，按标准 UTC 解析
      if (!cleanStr.endsWith('Z') && !cleanStr.includes('+') && !cleanStr.includes('GMT')) {
        cleanStr = cleanStr.replace(' ', 'T') + 'Z';
      }
      dateObj = new Date(cleanStr);
    } else if (utcDateStr instanceof Date) {
      dateObj = utcDateStr;
    } else {
      return String(utcDateStr);
    }

    if (isNaN(dateObj.getTime())) {
      return utcDateStr;
    }

    const pad = (n) => String(n).padStart(2, '0');
    const year = dateObj.getFullYear();
    const month = pad(dateObj.getMonth() + 1);
    const day = pad(dateObj.getDate());
    const hours = pad(dateObj.getHours());
    const minutes = pad(dateObj.getMinutes());
    const seconds = pad(dateObj.getSeconds());

    if (format === 'YYYY-MM-DD') {
      return `${year}-${month}-${day}`;
    }
    if (format === 'HH:mm:ss') {
      return `${hours}:${minutes}:${seconds}`;
    }

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return utcDateStr;
  }
}
