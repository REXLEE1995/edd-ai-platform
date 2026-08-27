import os
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any
from jose import jwt, JWTError
from app.core.config import settings

def get_password_hash(password: str) -> str:
    """
    使用 Python 内置标准库 PBKDF2-HMAC-SHA256 哈希密码，零版本兼容问题
    """
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
    return f"{salt}${key}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    校验密码哈希
    """
    if plain_password == hashed_password:
        return True
    try:
        if "$" in hashed_password:
            salt, key = hashed_password.split("$", 1)
            new_key = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt.encode('utf-8'), 100000).hex()
            return new_key == key
        return False
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], token_type: str = "user", expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "type": token_type
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
