# 血糖健康管理助手 - 后端文档

## 项目概述

基于多Agent协同、对话驱动的血糖健康管理助手后端系统。

## 功能特性

### 1. 多Agent系统
- **对话协调Agent (Orchestrator)**: 意图识别、槽位管理、路由策略、响应聚合
- **数据记录Agent**: 结构化抽取与入库（血糖、饮食、运动、药物）
- **即时分析Agent**: 个体化基线对比、趋势判断、风险分层
- **教育科普Agent**: 医学概念解释、关联用户场景
- **激励与情感支持Agent**: 共情反馈、鼓励机制、行为激励

### 2. 数据模型
- 用户档案（User）
- 血糖测量记录（GlucoseReading）
- 餐饮记录（MealEntry）
- 运动记录（ExerciseRecord）
- 药物记录（MedicationRecord）
- 对话状态（ConversationState）
- 分析事件（AnalysisEvent）
- 周报记录（WeeklyReport）

### 3. 核心功能
- 血糖记录与单位转换（mmol/L ↔ mg/dL）
- 个体化目标设定与达标率计算
- 趋势分析与模式识别
- 风险分层与告警
- 周报生成与复盘
- 情感支持与激励

## 数据库配置

数据库文件存储在项目根目录：`Health Management/health_management.db`

### 初始化数据库

```bash
cd backend
python init_db.py
```

或者在启动应用时自动创建（main.py中已包含）。

## API端点

### 对话接口
- `POST /api/chat` - 与助手对话

### 数据查询
- `GET /api/users/{user_id}/glucose-readings` - 获取血糖记录
- `GET /api/users/{user_id}/weekly-report` - 获取周报
- `GET /api/users/{user_id}/profile` - 获取用户档案
- `PUT /api/users/{user_id}/profile` - 更新用户档案

### 健康检查
- `GET /api/healthz` - 健康检查
- `GET /api/test-llm` - 测试LLM连接

## 启动服务

```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

或使用提供的启动脚本：
```powershell
.\start.ps1
```

## 环境变量

创建 `.env` 文件（可选，用于LLM功能）：
```
YUNWU_API_KEY=your_api_key
YUNWU_BASE_URL=https://api.yunwu.ai/v1
```

## 使用示例

### 记录血糖
```json
POST /api/chat
{
  "message": "我刚测了血糖，7.8",
  "session_id": "user123"
}
```

### 记录饮食
```json
POST /api/chat
{
  "message": "我午餐吃了牛肉面",
  "session_id": "user123"
}
```

### 询问数值
```json
POST /api/chat
{
  "message": "这个数值高吗？",
  "session_id": "user123"
}
```

### 获取周报
```json
GET /api/users/1/weekly-report
```

## 技术栈

- FastAPI - Web框架
- SQLAlchemy - ORM
- SQLite - 数据库
- LangChain - LLM集成（可选）

## 注意事项

1. 数据库文件会自动创建在项目根目录
2. 首次使用会自动创建默认用户
3. 所有医疗建议仅供参考，不能替代专业医疗诊断
4. 紧急情况请及时联系医生

