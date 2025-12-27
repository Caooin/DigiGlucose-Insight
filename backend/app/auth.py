"""
用户认证模块：JWT token生成和验证
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from . import database, models

# OAuth2 scheme (用于从请求头获取token)
# 注意：tokenUrl只是用于文档，实际token从Authorization header获取
# auto_error=False 表示如果没有token，不会自动抛出错误，而是返回None
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

# 备用方案：直接从请求头提取token
security = HTTPBearer(auto_error=False)

# JWT配置
SECRET_KEY = "your-secret-key-change-in-production"  # 生产环境应使用环境变量
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30天


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """验证密码"""
    try:
        if not plain_password or not hashed_password:
            print("密码或哈希值为空")
            return False
        
        # 确保密码是字节类型
        if isinstance(plain_password, str):
            password_bytes = plain_password.encode('utf-8')
        else:
            password_bytes = plain_password
        
        # bcrypt限制72字节
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        
        # 确保hashed_password是字节类型
        # bcrypt哈希通常是字符串格式，需要编码
        if isinstance(hashed_password, str):
            # 检查是否是有效的bcrypt哈希格式（以$2b$、$2a$或$2y$开头）
            if not hashed_password.startswith(('$2a$', '$2b$', '$2y$')):
                print(f"无效的bcrypt哈希格式: {hashed_password[:20]}...")
                return False
            hashed_bytes = hashed_password.encode('utf-8')
        else:
            hashed_bytes = hashed_password
        
        result = bcrypt.checkpw(password_bytes, hashed_bytes)
        return result
    except Exception as e:
        print(f"Password verification error: {e}")
        import traceback
        traceback.print_exc()
        return False


def get_password_hash(password: str) -> str:
    """生成密码哈希"""
    # 确保密码是字节类型
    if isinstance(password, str):
        password_bytes = password.encode('utf-8')
    else:
        password_bytes = password
    
    # bcrypt限制密码长度不超过72字节
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    
    # 生成salt并哈希密码
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    
    # 返回字符串格式
    return hashed.decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """创建JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_token_from_header(request: Request) -> Optional[str]:
    """从请求头手动提取token"""
    authorization = request.headers.get("Authorization")
    if authorization:
        try:
            scheme, token = authorization.split()
            if scheme.lower() == "bearer":
                return token
        except ValueError:
            pass
    return None


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(database.get_db)
) -> models.User:
    """从token获取当前用户"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="无法验证凭据",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # 如果OAuth2PasswordBearer没有提取到token，尝试手动提取
    if not token:
        token = get_token_from_header(request)
    
    if not token:
        print("No token provided")
        raise credentials_exception
    
    try:
        print(f"Verifying token: {token[:20]}...")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id_str = payload.get("sub")
        if user_id_str is None:
            print("No user_id in token payload")
            raise credentials_exception
        # JWT的subject是字符串，需要转换为整数
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            print(f"Invalid user_id format: {user_id_str}")
            raise credentials_exception
        print(f"Token verified, user_id: {user_id}")
    except JWTError as e:
        print(f"JWT decode error: {e}")
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        print(f"User not found: {user_id}")
        raise credentials_exception
    return user


def get_current_active_user(current_user: models.User = Depends(get_current_user)) -> models.User:
    """获取当前活跃用户"""
    return current_user

