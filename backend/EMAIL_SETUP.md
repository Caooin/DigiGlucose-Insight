# 邮箱验证码功能配置说明

## 功能概述

本系统已实现完整的邮箱验证注册流程，包括：
- 邮箱唯一性验证（数据库唯一索引 + 业务层双重校验）
- 验证码生成、发送、校验
- 防刷机制（1分钟内1次，24小时内最多5次）
- 验证码有效期10分钟，一次性使用

## 邮件服务配置

### 开发环境（默认）

如果不配置SMTP，系统会在控制台输出验证码，方便开发测试。

### 生产环境配置

在项目根目录创建 `.env` 文件，添加以下配置：

```env
# SMTP邮件服务器配置
SMTP_HOST=smtp.qq.com          # QQ邮箱SMTP服务器（或其他邮箱服务商）
SMTP_PORT=587                   # SMTP端口（通常为587或465）
SMTP_USER=your_email@qq.com     # 发件人邮箱
SMTP_PASSWORD=your_auth_code    # 邮箱授权码（不是登录密码）
SMTP_FROM_NAME=糖小智血糖健康助手  # 发件人名称
```

### 常见邮箱服务商配置

#### QQ邮箱
```env
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your_email@qq.com
SMTP_PASSWORD=你的QQ邮箱授权码  # 需要在QQ邮箱设置中生成授权码
```

#### 163邮箱
```env
SMTP_HOST=smtp.163.com
SMTP_PORT=25
SMTP_USER=your_email@163.com
SMTP_PASSWORD=你的163邮箱授权码
```

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=你的Gmail应用专用密码
```

#### 企业邮箱（以腾讯企业邮箱为例）
```env
SMTP_HOST=smtp.exmail.qq.com
SMTP_PORT=587
SMTP_USER=your_email@yourdomain.com
SMTP_PASSWORD=你的企业邮箱密码或授权码
```

## 获取邮箱授权码

### QQ邮箱
1. 登录QQ邮箱
2. 点击"设置" -> "账户"
3. 找到"POP3/IMAP/SMTP服务"，开启服务
4. 点击"生成授权码"，按提示操作
5. 将生成的授权码复制到 `.env` 文件的 `SMTP_PASSWORD`

### 163邮箱
1. 登录163邮箱
2. 点击"设置" -> "POP3/SMTP/IMAP"
3. 开启"POP3/SMTP服务"和"IMAP/SMTP服务"
4. 点击"生成授权码"，按提示操作
5. 将生成的授权码复制到 `.env` 文件的 `SMTP_PASSWORD`

## 数据库迁移

系统已添加以下新表和字段：

1. **User表新增字段**：
   - `email_verified` (Boolean): 邮箱是否已验证

2. **新增EmailVerifyCode表**：
   - `id`: 主键
   - `email`: 接收验证码的邮箱
   - `code`: 验证码（6位数字）
   - `expire_time`: 过期时间
   - `is_used`: 是否已使用
   - `ip_address`: 获取验证码的IP地址
   - `create_time`: 创建时间

数据库表会在应用启动时自动创建。如果已有数据库，需要手动迁移：

```python
# 在Python环境中执行
from backend.app.database import engine
from backend.app import models

# 创建新表和字段
models.Base.metadata.create_all(bind=engine)
```

## 测试验证码功能

### 开发环境测试

1. 不配置SMTP，直接启动后端服务
2. 在前端注册页面输入邮箱，点击"获取验证码"
3. 查看后端控制台输出，获取验证码
4. 输入验证码完成注册

### 生产环境测试

1. 配置好 `.env` 文件中的SMTP信息
2. 启动后端服务
3. 在前端注册页面输入邮箱，点击"获取验证码"
4. 检查邮箱收件箱，找到验证码邮件
5. 输入验证码完成注册

## 注意事项

1. **邮箱唯一性**：系统通过数据库唯一索引和业务层双重校验确保一个邮箱只能注册一个账号
2. **验证码安全**：
   - 验证码有效期10分钟
   - 验证码使用后立即失效，不可重复使用
   - 验证码通过HTTPS传输（生产环境建议）
3. **防刷机制**：
   - 同一邮箱1分钟内只能获取1次验证码
   - 同一邮箱24小时内最多获取5次验证码
   - 记录IP地址，可用于进一步的风控
4. **密码强度**：注册时密码必须至少8位，包含大小写字母和数字
5. **现有账号保留**：已存在的账号和数据会保留，新注册流程只影响新用户

## 故障排查

### 验证码发送失败

1. 检查 `.env` 文件配置是否正确
2. 检查邮箱授权码是否有效
3. 检查网络连接和防火墙设置
4. 查看后端日志中的错误信息

### 验证码收不到

1. 检查垃圾邮件文件夹
2. 确认邮箱地址输入正确
3. 检查SMTP配置是否正确
4. 查看后端日志确认是否发送成功

### 验证码校验失败

1. 确认验证码未过期（10分钟有效期）
2. 确认验证码未被使用过
3. 确认输入的验证码正确（6位数字）
4. 检查数据库中的验证码记录

