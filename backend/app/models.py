import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from .database import Base


class MealType(enum.Enum):
    """餐次类型"""
    BREAKFAST = "breakfast"  # 早餐
    LUNCH = "lunch"  # 午餐
    DINNER = "dinner"  # 晚餐
    SNACK = "snack"  # 加餐
    OTHER = "other"  # 其他


class MeasurementContext(enum.Enum):
    """测量上下文"""
    FASTING = "fasting"  # 空腹
    POST_MEAL = "post_meal"  # 餐后
    PRE_MEAL = "pre_meal"  # 餐前
    BEFORE_EXERCISE = "before_exercise"  # 运动前
    AFTER_EXERCISE = "after_exercise"  # 运动后
    RANDOM = "random"  # 随机


class RiskLevel(enum.Enum):
    """风险等级"""
    LOW = "low"  # 低风险
    NORMAL = "normal"  # 正常
    MODERATE = "moderate"  # 中等风险
    HIGH = "high"  # 高风险
    CRITICAL = "critical"  # 紧急


class User(Base):
    """用户档案"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)  # 邮箱（唯一索引）
    hashed_password = Column(String, nullable=False)  # 密码哈希
    email_verified = Column(Boolean, default=False, nullable=False)  # 邮箱是否已验证
    age = Column(Integer, nullable=True)
    gender = Column(String, nullable=True)  # male, female, other
    diagnosis_type = Column(String, nullable=True)  # normal, prediabetes, diabetes_type1, diabetes_type2, gestational
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # 医生设定的目标区间
    fasting_target_min = Column(Float, nullable=True)  # 空腹目标最小值 (mmol/L)
    fasting_target_max = Column(Float, nullable=True)  # 空腹目标最大值 (mmol/L)
    post_meal_target_max = Column(Float, nullable=True)  # 餐后2h目标最大值 (mmol/L)
    
    # 生活习惯偏好
    preferences = Column(Text, nullable=True)  # JSON格式存储偏好设置
    
    # 关系
    glucose_readings = relationship("GlucoseReading", back_populates="user", cascade="all, delete-orphan")
    meal_entries = relationship("MealEntry", back_populates="user", cascade="all, delete-orphan")
    exercise_records = relationship("ExerciseRecord", back_populates="user", cascade="all, delete-orphan")
    medication_records = relationship("MedicationRecord", back_populates="user", cascade="all, delete-orphan")
    conversation_states = relationship("ConversationState", back_populates="user", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="user", cascade="all, delete-orphan")


class GlucoseReading(Base):
    """血糖测量记录"""
    __tablename__ = "glucose_readings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    value = Column(Float, nullable=False)  # 血糖值
    unit = Column(String, default="mmol/L", nullable=False)  # 单位: mmol/L 或 mg/dL
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    
    # 测量上下文
    context = Column(String, nullable=True)  # 空腹/餐后等
    meal_type = Column(String, nullable=True)  # 餐次类型
    hours_after_meal = Column(Float, nullable=True)  # 餐后小时数
    
    # 关联信息
    meal_id = Column(Integer, ForeignKey("meal_entries.id"), nullable=True)  # 关联的餐饮记录
    exercise_id = Column(Integer, ForeignKey("exercise_records.id"), nullable=True)  # 关联的运动记录
    medication_id = Column(Integer, ForeignKey("medication_records.id"), nullable=True)  # 关联的药物记录
    
    # 上下文标签
    stress_level = Column(Integer, nullable=True)  # 压力水平 1-5
    sleep_hours = Column(Float, nullable=True)  # 睡眠小时数
    
    # 分析结果
    risk_level = Column(String, nullable=True)  # 风险等级
    analysis_notes = Column(Text, nullable=True)  # 分析备注
    
    notes = Column(Text, nullable=True)  # 用户备注
    
    # 关系
    user = relationship("User", back_populates="glucose_readings")
    meal = relationship("MealEntry", foreign_keys=[meal_id], post_update=True)
    exercise = relationship("ExerciseRecord", foreign_keys=[exercise_id], post_update=True)
    medication = relationship("MedicationRecord", foreign_keys=[medication_id], post_update=True)


class MealEntry(Base):
    """餐饮记录"""
    __tablename__ = "meal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    meal_type = Column(String, nullable=False)  # 餐次类型
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    
    # 食物信息
    description = Column(Text, nullable=False)  # 食物描述
    food_items = Column(Text, nullable=True)  # JSON格式存储食物列表
    portion_size = Column(String, nullable=True)  # 份量描述
    
    # 营养估算
    estimated_carbs = Column(Float, nullable=True)  # 估算碳水化合物(g)
    estimated_gi = Column(Float, nullable=True)  # 估算GI值
    estimated_gl = Column(Float, nullable=True)  # 估算GL值
    
    notes = Column(Text, nullable=True)  # 备注
    
    # 关系
    user = relationship("User", back_populates="meal_entries")


class ExerciseRecord(Base):
    """运动记录"""
    __tablename__ = "exercise_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    exercise_type = Column(String, nullable=False)  # 运动类型
    duration_minutes = Column(Integer, nullable=True)  # 运动时长(分钟)
    intensity = Column(String, nullable=True)  # 强度: low, moderate, high
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    
    # 与餐次关系
    meal_type = Column(String, nullable=True)  # 餐前/餐后
    hours_after_meal = Column(Float, nullable=True)  # 餐后小时数
    
    notes = Column(Text, nullable=True)  # 备注
    
    # 关系
    user = relationship("User", back_populates="exercise_records")


class MedicationRecord(Base):
    """药物记录"""
    __tablename__ = "medication_records"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    medication_name = Column(String, nullable=False)  # 药物名称
    dosage = Column(String, nullable=True)  # 剂量
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    
    # 用药时间类型
    medication_type = Column(String, nullable=True)  # 长效/短效/速效等
    
    notes = Column(Text, nullable=True)  # 备注
    
    # 关系
    user = relationship("User", back_populates="medication_records")


class ConversationState(Base):
    """对话状态"""
    __tablename__ = "conversation_states"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String, nullable=False, index=True)  # 会话ID
    
    # 当前状态
    current_topic = Column(String, nullable=True)  # 当前主题
    intent = Column(String, nullable=True)  # 意图
    sentiment = Column(String, nullable=True)  # 情感: positive, negative, neutral, anxious, frustrated
    
    # 槽位信息 (JSON格式)
    slots = Column(Text, nullable=True)  # 未填槽位信息
    
    # 待办事项
    pending_tasks = Column(Text, nullable=True)  # JSON格式存储待办事项
    
    # 用户偏好
    response_style = Column(String, default="normal", nullable=True)  # 简洁/详细
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="conversation_states")


class AnalysisEvent(Base):
    """分析事件与建议"""
    __tablename__ = "analysis_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    glucose_reading_id = Column(Integer, ForeignKey("glucose_readings.id"), nullable=True)
    
    # 分析结果
    risk_level = Column(String, nullable=False)  # 风险等级
    conclusion = Column(Text, nullable=True)  # 结论
    reasoning = Column(Text, nullable=True)  # 依据
    suggestions = Column(Text, nullable=True)  # 建议 (JSON格式)
    
    # 趋势分析
    trend_direction = Column(String, nullable=True)  # 趋势方向: up, down, stable
    comparison_period = Column(String, nullable=True)  # 对比周期: 7d, 14d, 30d
    average_value = Column(Float, nullable=True)  # 对比平均值
    
    # 时间戳
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)
    
    # 通知状态
    notified = Column(Boolean, default=False)  # 是否已通知
    notification_sent_at = Column(DateTime, nullable=True)


class WeeklyReport(Base):
    """周报记录"""
    __tablename__ = "weekly_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # 报告周期
    week_start = Column(DateTime, nullable=False, index=True)
    week_end = Column(DateTime, nullable=False)
    
    # 统计数据
    total_measurements = Column(Integer, default=0)
    average_glucose = Column(Float, nullable=True)
    fasting_average = Column(Float, nullable=True)
    post_meal_average = Column(Float, nullable=True)
    
    # 达标情况
    target_compliance_rate = Column(Float, nullable=True)  # 目标达标率
    
    # 模式识别
    patterns = Column(Text, nullable=True)  # JSON格式存储识别出的模式
    
    # 建议清单
    action_items = Column(Text, nullable=True)  # JSON格式存储行动建议
    
    # 正面进展
    positive_progress = Column(Text, nullable=True)  # JSON格式存储正面进展
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    # 阅读状态
    read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)


class Reminder(Base):
    """提醒记录"""
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # 提醒类型
    reminder_type = Column(String, nullable=False)  # glucose_measurement, medication, diet_control, appointment
    title = Column(String, nullable=False)  # 提醒标题
    content = Column(Text, nullable=True)  # 提醒内容
    
    # 提醒时间
    reminder_time = Column(String, nullable=False)  # 时间，格式：HH:MM
    reminder_date = Column(DateTime, nullable=True)  # 单次提醒的日期（可选）
    
    # 重复设置
    repeat_type = Column(String, nullable=False, default="daily")  # daily, weekly, monthly, once
    repeat_days = Column(String, nullable=True)  # 周几重复，格式：1,3,5 (周一到周五)
    
    # 状态
    enabled = Column(Boolean, default=True)  # 是否启用
    completed = Column(Boolean, default=False)  # 是否已完成
    completed_at = Column(DateTime, nullable=True)  # 完成时间
    
    # 时间戳
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # 关系
    user = relationship("User", back_populates="reminders")


class EmailVerifyCode(Base):
    """邮箱验证码表"""
    __tablename__ = "email_verify_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), nullable=False, index=True)  # 接收验证码的邮箱
    code = Column(String(10), nullable=False)  # 验证码（6位数字）
    expire_time = Column(DateTime, nullable=False, index=True)  # 过期时间
    is_used = Column(Boolean, default=False, nullable=False)  # 是否已使用
    ip_address = Column(String(50), nullable=True)  # 获取验证码的IP地址（防刷）
    create_time = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)  # 创建时间
