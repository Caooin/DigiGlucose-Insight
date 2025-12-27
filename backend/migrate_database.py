"""
数据库迁移脚本：添加email_verified字段和email_verify_codes表
"""
import sqlite3
import os
import sys

# 获取数据库路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
db_path = os.path.join(project_root, "health_management.db")

print("=" * 60)
print("数据库迁移脚本")
print("=" * 60)
print(f"数据库路径: {db_path}")
print(f"数据库文件存在: {os.path.exists(db_path)}")
print()

if not os.path.exists(db_path):
    print("错误: 数据库文件不存在！")
    sys.exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # 1. 检查users表是否存在email_verified列
    cursor.execute("PRAGMA table_info(users)")
    columns = [row[1] for row in cursor.fetchall()]
    
    print("检查users表结构...")
    print(f"现有列: {', '.join(columns)}")
    
    if 'email_verified' not in columns:
        print("\n添加email_verified列到users表...")
        cursor.execute("""
            ALTER TABLE users 
            ADD COLUMN email_verified BOOLEAN DEFAULT 0 NOT NULL
        """)
        print("[OK] email_verified列已添加")
    else:
        print("[OK] email_verified列已存在")
    
    # 2. 检查email_verify_codes表是否存在
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='email_verify_codes'
    """)
    table_exists = cursor.fetchone() is not None
    
    if not table_exists:
        print("\n创建email_verify_codes表...")
        cursor.execute("""
            CREATE TABLE email_verify_codes (
                id INTEGER NOT NULL PRIMARY KEY,
                email VARCHAR(100) NOT NULL,
                code VARCHAR(10) NOT NULL,
                expire_time DATETIME NOT NULL,
                is_used BOOLEAN NOT NULL DEFAULT 0,
                ip_address VARCHAR(50),
                create_time DATETIME NOT NULL
            )
        """)
        
        # 创建索引
        cursor.execute("""
            CREATE INDEX ix_email_verify_codes_email ON email_verify_codes (email)
        """)
        cursor.execute("""
            CREATE INDEX ix_email_verify_codes_expire_time ON email_verify_codes (expire_time)
        """)
        
        print("[OK] email_verify_codes表已创建")
        print("[OK] 索引已创建")
    else:
        print("[OK] email_verify_codes表已存在")
    
    # 3. 更新现有用户的email_verified字段
    # 如果用户有email，则设置为已验证（因为之前注册时没有验证码流程）
    print("\n更新现有用户的email_verified状态...")
    cursor.execute("""
        UPDATE users 
        SET email_verified = 1 
        WHERE email IS NOT NULL AND email != ''
    """)
    updated_count = cursor.rowcount
    print(f"[OK] 已更新 {updated_count} 个用户的email_verified状态")
    
    # 提交更改
    conn.commit()
    
    print("\n" + "=" * 60)
    print("数据库迁移完成！")
    print("=" * 60)
    
except Exception as e:
    conn.rollback()
    print(f"\n错误: {str(e)}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    conn.close()

