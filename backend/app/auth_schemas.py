"""
认证相关的Pydantic模式
"""
from typing import Optional
from pydantic import BaseModel


class UserRegister(BaseModel):
    """用户注册请求"""
    username: str
    email: str
    password: str
    verify_code: str  # 验证码


class EmailVerifyRequest(BaseModel):
    """获取验证码请求"""
    email: str


class UserLogin(BaseModel):
    """用户登录请求"""
    username: str
    password: str


class Token(BaseModel):
    """Token响应"""
    access_token: str
    token_type: str
    user_id: int
    username: str


class UserInfo(BaseModel):
    """用户信息响应"""
    id: int
    username: str
    email: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    diagnosis_type: Optional[str] = None
    fasting_target_min: Optional[float] = None
    fasting_target_max: Optional[float] = None
    post_meal_target_max: Optional[float] = None

