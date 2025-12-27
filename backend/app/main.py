from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback

from . import api, models
from .database import engine

app = FastAPI(title="Blood Sugar Health Assistant API")

# 在应用启动时创建表
@app.on_event("startup")
async def startup_event():
    """应用启动时执行"""
    try:
        models.Base.metadata.create_all(bind=engine)
        print("✓ 数据库表创建/检查完成")
    except Exception as e:
        print(f"✗ 数据库表创建错误: {str(e)}")
        print(traceback.format_exc())

# 添加全局异常处理
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """全局异常处理器"""
    print(f"未捕获的异常: {str(exc)}")
    print(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": "服务器内部错误，请稍后重试"}
    )

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # 前端地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "Welcome to the Blood Sugar Health Assistant!"}

