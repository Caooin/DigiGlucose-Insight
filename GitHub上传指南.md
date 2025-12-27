# GitHub 上传指南

## 📋 不应该上传到 GitHub 的文件和文件夹

### 🔒 敏感信息（绝对不能上传）

1. **环境变量文件**
   - `.env` - 包含API密钥、数据库密码等敏感信息
   - `.env.local`
   - `.env.production`

2. **数据库文件**
   - `health_management.db` - 包含用户数据
   - `*.db`
   - `*.sqlite`
   - `*.sqlite3`

3. **密钥和证书**
   - `*.key`
   - `*.pem`
   - `*.cert`
   - `secrets/` 目录

### 🗑️ 依赖和构建产物

1. **Python 虚拟环境**
   - `backend/.venv/`
   - `venv/`
   - `.venv/`
   - `ENV/`
   - `env/`

2. **Node.js 依赖**
   - `frontend/node_modules/`
   - `node_modules/`

3. **Python 缓存**
   - `__pycache__/` - Python字节码缓存
   - `*.pyc`
   - `*.pyo`
   - `*.pyd`

4. **构建输出**
   - `dist/`
   - `build/`
   - `frontend/dist/`
   - `frontend/build/`

### 📝 临时和日志文件

1. **日志文件**
   - `*.log`
   - `logs/`
   - `npm-debug.log*`
   - `yarn-debug.log*`

2. **临时文件**
   - `*.tmp`
   - `*.temp`
   - `*.swp`
   - `*.swo`
   - `*~`
   - `.cache/`

3. **备份文件**
   - `*.bak`
   - `*.backup`
   - `*.old`

### 💻 IDE 和编辑器配置

1. **VS Code**
   - `.vscode/`
   - `*.code-workspace`

2. **PyCharm**
   - `.idea/`

3. **其他编辑器**
   - `*.sublime-project`
   - `*.sublime-workspace`

### 🖥️ 操作系统文件

1. **Windows**
   - `Thumbs.db`
   - `Desktop.ini`
   - `$RECYCLE.BIN/`

2. **macOS**
   - `.DS_Store`
   - `.AppleDouble`

3. **Linux**
   - `.directory`
   - `.Trash-*`

### 📊 测试和覆盖率

1. **测试覆盖率**
   - `.coverage`
   - `htmlcov/`
   - `.pytest_cache/`

2. **测试输出**
   - `.tox/`
   - `.hypothesis/`

## ✅ 应该上传的文件

### 📄 源代码
- ✅ 所有 `.py` 文件
- ✅ 所有 `.jsx` 文件
- ✅ 所有 `.js` 文件
- ✅ 所有 `.css` 文件
- ✅ `requirements.txt`
- ✅ `package.json`
- ✅ `package-lock.json`

### 📚 文档
- ✅ `README.md`
- ✅ `*.md` 文档文件（除了敏感信息）
- ✅ `backend/EMAIL_SETUP.md`
- ✅ `backend/README_BACKEND.md`

### ⚙️ 配置文件
- ✅ `vite.config.js`
- ✅ `.gitignore`（这个文件本身）
- ✅ `frontend/index.html`

### 🔧 工具脚本
- ✅ `backend/migrate_database.py`

## 🚀 上传到 GitHub 的步骤

### 1. 创建 .gitignore 文件

项目根目录已创建 `.gitignore` 文件，包含了所有不应该上传的文件和文件夹。

### 2. 初始化 Git 仓库（如果还没有）

```powershell
# 在项目根目录执行
git init
```

### 3. 添加文件到 Git

```powershell
# 添加所有文件（.gitignore会自动排除不需要的文件）
git add .

# 查看将要提交的文件（确认没有敏感信息）
git status
```

### 4. 提交文件

```powershell
# 提交文件
git commit -m "Initial commit: 血糖健康管理助手项目"
```

### 5. 创建 GitHub 仓库并推送

```powershell
# 添加远程仓库（替换为你的GitHub仓库地址）
git remote add origin https://github.com/your-username/your-repo-name.git

# 推送代码
git branch -M main
git push -u origin main
```

## ⚠️ 重要注意事项

### 1. 检查敏感信息

上传前务必检查：
- ✅ 没有 `.env` 文件
- ✅ 没有数据库文件（`.db`）
- ✅ 没有API密钥硬编码在代码中
- ✅ 没有密码或令牌

### 2. 环境变量模板

如果项目需要环境变量，创建一个 `.env.example` 文件作为模板：

```env
# .env.example
YUNWU_API_KEY=your_api_key_here
YUNWU_BASE_URL=https://api.yunwu.ai/v1
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASSWORD=your_password_here
SMTP_FROM_NAME=糖小智血糖健康助手
```

### 3. README 中的配置说明

确保 README.md 中说明了如何配置环境变量，但**不要**包含实际的密钥或密码。

### 4. 如果已经上传了敏感信息

如果意外上传了敏感信息：

1. **立即删除敏感信息**：
   ```powershell
   git rm --cached .env
   git rm --cached health_management.db
   ```

2. **更新 .gitignore**：
   确保 `.gitignore` 包含这些文件

3. **提交更改**：
   ```powershell
   git commit -m "Remove sensitive files"
   ```

4. **如果已经推送到GitHub**：
   - 需要更改所有已泄露的密钥和密码
   - 考虑使用 GitHub 的敏感信息扫描功能
   - 如果密钥已泄露，立即更换

## 📋 上传前检查清单

- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] `health_management.db` 已添加到 `.gitignore`
- [ ] `backend/.venv/` 已添加到 `.gitignore`
- [ ] `frontend/node_modules/` 已添加到 `.gitignore`
- [ ] `__pycache__/` 已添加到 `.gitignore`
- [ ] 代码中没有硬编码的API密钥或密码
- [ ] 已创建 `.env.example` 模板文件（可选）
- [ ] README.md 中说明了如何配置环境变量
- [ ] 运行 `git status` 确认没有敏感文件

## 🔍 验证 .gitignore 是否生效

```powershell
# 检查哪些文件会被忽略
git status --ignored

# 或者查看特定文件是否被忽略
git check-ignore -v .env
git check-ignore -v health_management.db
git check-ignore -v backend/.venv/
```

## 📝 总结

**绝对不能上传**：
- ❌ `.env` 文件
- ❌ 数据库文件（`.db`）
- ❌ 虚拟环境（`.venv/`）
- ❌ `node_modules/`
- ❌ `__pycache__/`
- ❌ 任何包含密钥、密码的文件

**应该上传**：
- ✅ 源代码（`.py`, `.jsx`, `.js`, `.css`）
- ✅ 配置文件（`requirements.txt`, `package.json`）
- ✅ 文档（`README.md`, `*.md`）
- ✅ `.gitignore` 文件本身

