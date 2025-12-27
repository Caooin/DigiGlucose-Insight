import os
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# 加载环境变量
load_dotenv()

# 获取项目根目录（Health Management目录）
# 从backend/app/database.py向上两级到项目根目录
# 实际路径结构：Health Management/backend/app/database.py
# parent = Health Management/backend/app
# parent.parent = Health Management/backend
# parent.parent.parent = Health Management (项目根目录)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "health_management.db"

# 调试：打印路径信息
print(f"数据库文件路径: {DB_PATH}")
print(f"数据库文件是否存在: {DB_PATH.exists()}")

# 确保目录存在
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

# 使用绝对路径的SQLite数据库
DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLite 特殊参数
# 增加连接池大小和超时设置，防止连接泄漏
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30},
    pool_size=10,  # 连接池大小
    max_overflow=20,  # 最大溢出连接数
    pool_pre_ping=True,  # 连接前检查连接是否有效
    pool_recycle=3600,  # 连接回收时间（秒）
    echo=False,  # 设置为True可以看到SQL语句
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

