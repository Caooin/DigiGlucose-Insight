"""
邮件发送服务
"""
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.header import Header
from email.utils import formataddr
from typing import Optional
import logging
from dotenv import load_dotenv
import pathlib

# 加载.env文件（从项目根目录）
# 获取项目根目录（backend的父目录）
project_root = pathlib.Path(__file__).parent.parent.parent
env_path = project_root / '.env'
load_dotenv(env_path)

logger = logging.getLogger(__name__)

# 邮件配置（从环境变量读取，如果没有则使用默认值）
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.qq.com")  # 默认使用QQ邮箱SMTP
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")  # 发件人邮箱
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")  # 发件人邮箱授权码
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "糖小智血糖健康助手")


def send_verification_code_email(email: str, code: str) -> bool:
    """
    发送验证码邮件
    
    Args:
        email: 接收邮箱
        code: 验证码
        
    Returns:
        bool: 发送是否成功
    """
    try:
        print(f"\n{'='*50}")
        print(f"开始发送验证码邮件")
        print(f"SMTP_HOST: {SMTP_HOST}")
        print(f"SMTP_PORT: {SMTP_PORT}")
        print(f"SMTP_USER: {SMTP_USER}")
        print(f"收件人: {email}")
        print(f"验证码: {code}")
        print(f"{'='*50}\n")
        
        # 如果没有配置SMTP，使用控制台输出（开发环境）
        if not SMTP_USER or not SMTP_PASSWORD:
            logger.warning(f"SMTP未配置，验证码将输出到控制台: {code}")
            print(f"\n{'='*50}")
            print(f"【开发模式】验证码邮件")
            print(f"收件人: {email}")
            print(f"验证码: {code}")
            print(f"有效期: 10分钟")
            print(f"{'='*50}\n")
            return True
        
        # 创建邮件对象
        msg = MIMEMultipart()
        # 修复From字段格式，确保符合RFC5322标准
        # 使用formataddr函数来正确格式化From字段（自动处理编码）
        if SMTP_FROM_NAME and SMTP_FROM_NAME != SMTP_USER:
            # 使用formataddr自动处理中文名称的编码
            msg['From'] = formataddr((SMTP_FROM_NAME, SMTP_USER))
        else:
            # 否则直接使用邮箱地址（最安全的方式）
            msg['From'] = SMTP_USER
        msg['To'] = email
        msg['Subject'] = Header("【糖小智】邮箱验证码", 'utf-8')
        
        # 邮件正文
        html_content = f"""
        <html>
        <head>
            <meta charset="UTF-8">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c3e50;">糖小智血糖健康助手</h2>
                <p>您好！</p>
                <p>您正在注册糖小智账号，验证码为：</p>
                <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                    <h1 style="color: #3498db; font-size: 32px; margin: 0; letter-spacing: 5px;">{code}</h1>
                </div>
                <p style="color: #e74c3c; font-weight: bold;">验证码有效期为 10 分钟，请及时使用。</p>
                <p>如果这不是您的操作，请忽略此邮件。</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">此邮件由系统自动发送，请勿回复。</p>
            </div>
        </body>
        </html>
        """
        
        msg.attach(MIMEText(html_content, 'html', 'utf-8'))
        
        # 163 VIP邮箱可能需要使用SSL或不同的连接方式
        # 尝试不同的连接方式
        print(f"正在连接SMTP服务器 {SMTP_HOST}:{SMTP_PORT}...")
        
        # 根据端口选择连接方式
        if SMTP_PORT == 465 or SMTP_PORT == 994:
            # 使用SSL连接
            print("使用SSL连接...")
            server = smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, timeout=10)
        elif SMTP_PORT == 25:
            # 端口25通常不需要TLS（标准SMTP）
            print("使用标准SMTP连接（端口25，无需TLS）...")
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
        else:
            # 端口587或其他端口使用STARTTLS
            print(f"使用STARTTLS连接（端口{SMTP_PORT}）...")
            server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10)
            server.starttls()
        
        print("正在登录...")
        server.login(SMTP_USER, SMTP_PASSWORD)
        print("登录成功，正在发送邮件...")
        
        server.send_message(msg)
        server.quit()
        
        print(f"验证码邮件发送成功: {email}")
        logger.info(f"验证码邮件发送成功: {email}")
        return True
        
    except smtplib.SMTPAuthenticationError as e:
        error_msg = f"SMTP认证失败: {str(e)}"
        print(f"错误: {error_msg}")
        logger.error(error_msg)
        print("可能的原因：邮箱或授权码错误")
        return False
    except smtplib.SMTPConnectError as e:
        error_msg = f"SMTP连接失败: {str(e)}"
        print(f"错误: {error_msg}")
        logger.error(error_msg)
        print(f"无法连接到 {SMTP_HOST}:{SMTP_PORT}，请检查网络和SMTP配置")
        return False
    except smtplib.SMTPException as e:
        error_msg = f"SMTP错误: {str(e)}"
        print(f"错误: {error_msg}")
        logger.error(error_msg)
        import traceback
        traceback.print_exc()
        return False
    except Exception as e:
        error_msg = f"发送验证码邮件失败: {str(e)}"
        print(f"错误: {error_msg}")
        logger.error(error_msg)
        import traceback
        traceback.print_exc()
        # 开发环境：即使发送失败，也输出验证码到控制台
        print(f"\n{'='*50}")
        print(f"【开发模式】验证码邮件（发送失败，但提供验证码）")
        print(f"收件人: {email}")
        print(f"验证码: {code}")
        print(f"有效期: 10分钟")
        print(f"{'='*50}\n")
        return False

