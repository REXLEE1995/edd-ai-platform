import socket
import logging
from typing import Optional, Any
from fastapi import Request
from app.core.config import settings

logger = logging.getLogger("xyzp.network")

def get_server_real_lan_ip() -> str:
    """
    智能解析服务端在物理局域网中的真实服务 IP：
    优先提取 192.168.* 或 10.* 或 172.16-31.* 的真实物理/WLAN/以太网 IP，
    严格排除 127.0.0.1 (回环)、198.18.* (TUN/VPN虚拟代理网卡)、169.254.* 等不可被外部移动设备访问的虚地址。
    """
    # 1. 若在配置或环境变量中显式指定了 PUBLIC_BASE_URL (如 http://192.168.110.234:8000 或域名)
    if settings.PUBLIC_BASE_URL:
        return settings.PUBLIC_BASE_URL.rstrip("/")

    hostname = socket.gethostname()
    candidate_ips = []
    try:
        addr_infos = socket.getaddrinfo(hostname, None)
        for item in addr_infos:
            ip = item[4][0]
            if ':' not in ip and not ip.startswith('127.'):
                if ip not in candidate_ips:
                    candidate_ips.append(ip)
    except Exception as e:
        logger.warning(f"[Network] Failed to getaddrinfo for hostname {hostname}: {e}")

    # 优先级别 1: 真实局域网常用网段 (192.168.* 或 10.*)
    lan_ips = [ip for ip in candidate_ips if ip.startswith('192.168.') or ip.startswith('10.')]
    if lan_ips:
        return lan_ips[0]

    # 优先级别 2: 排除已知虚拟代理网卡 (198.18.*, 169.254.*) 后的其他有效 IP
    other_valid_ips = [ip for ip in candidate_ips if not ip.startswith('198.18.') and not ip.startswith('169.254.')]
    if other_valid_ips:
        return other_valid_ips[0]

    return candidate_ips[0] if candidate_ips else "127.0.0.1"


def get_public_base_url(request: Optional[Request] = None) -> str:
    """
    获取供外部移动端、扫码设备与三方网关回调访问的真实统一 Base URL (协议://真实IP:端口)
    """
    if settings.PUBLIC_BASE_URL:
        return settings.PUBLIC_BASE_URL.rstrip("/")

    real_ip = get_server_real_lan_ip()
    port = 8000

    if request:
        # 如果请求头里带有明确的外部 Host (非 localhost, 127.0.0.1, 198.18.*)，优先以客户端实际访问的 Host 为准
        host_header = request.headers.get("x-forwarded-host") or request.headers.get("host") or ""
        if host_header and not any(h in host_header for h in ["localhost", "127.0.0.1", "198.18."]):
            proto = request.headers.get("x-forwarded-proto") or request.url.scheme or "http"
            return f"{proto}://{host_header}".rstrip("/")

        if request.url.port:
            port = request.url.port

    return f"http://{real_ip}:{port}"
