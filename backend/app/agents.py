"""
多Agent系统：数据记录、即时分析、教育科普、激励与情感支持
"""
import datetime
import re
import json
from typing import Optional, Dict, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_

from . import models, database


# ==================== 工具函数 ====================

def extract_glucose_value(text: str) -> Optional[float]:
    """从文本中提取血糖数值"""
    # 匹配数字，支持小数
    patterns = [
        r"(\d+(?:\.\d+)?)\s*(?:mmol|mg)",
        r"血糖[是\s]*(\d+(?:\.\d+)?)",
        r"(\d+(?:\.\d+)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))
    return None


def detect_unit(text: str) -> str:
    """检测单位：mmol/L 或 mg/dL"""
    text_lower = text.lower()
    if "mg" in text_lower or "mg/dl" in text_lower:
        return "mg/dL"
    return "mmol/L"  # 默认


def convert_glucose_unit(value: float, from_unit: str, to_unit: str) -> float:
    """单位转换：mg/dL ↔ mmol/L"""
    if from_unit == to_unit:
        return value
    if from_unit == "mg/dL" and to_unit == "mmol/L":
        return value / 18.0
    elif from_unit == "mmol/L" and to_unit == "mg/dL":
        return value * 18.0
    return value


def infer_meal_type(timestamp: datetime.datetime) -> str:
    """根据时间推断餐次类型"""
    hour = timestamp.hour
    if 6 <= hour < 10:
        return "breakfast"
    elif 10 <= hour < 14:
        return "lunch"
    elif 14 <= hour < 18:
        return "snack"
    elif 18 <= hour < 22:
        return "dinner"
    else:
        return "other"


def detect_meal_type_from_text(text: str) -> Optional[str]:
    """从文本中识别餐次"""
    text_lower = text.lower()
    if "早餐" in text_lower or "早饭" in text_lower or "breakfast" in text_lower:
        return "breakfast"
    elif "午餐" in text_lower or "午饭" in text_lower or "lunch" in text_lower:
        return "lunch"
    elif "晚餐" in text_lower or "晚饭" in text_lower or "dinner" in text_lower:
        return "dinner"
    elif "加餐" in text_lower or "snack" in text_lower:
        return "snack"
    return None


def extract_hours_after_meal(text: str) -> Optional[float]:
    """提取餐后小时数"""
    patterns = [
        r"餐后[(\s]*(\d+(?:\.\d+)?)\s*小时",
        r"(\d+(?:\.\d+)?)\s*小时[后]",
        r"(\d+(?:\.\d+)?)h",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return float(match.group(1))
    return None


def detect_context_from_colloquial(text: str) -> Optional[str]:
    """
    从口语化表述中识别血糖测量场景（上下文）
    
    标准类型「空腹」对应的口语表述：
    - 没吃饭的时候测的、饿了一晚上之后测的、没吃早饭那会测的、肚子空着的时候测的
    
    标准类型「餐后」对应的口语表述：
    - 吃完饭后测的、刚吃完饭那阵儿测的、吃饱东西之后测的、用餐结束后测的
    
    标准类型「餐前」对应的口语表述：
    - 吃饭前测的、准备开饭的时候测的、没吃饭之前测的、要吃饭了先测的
    
    标准类型「随机」对应的口语表述：
    - 随便啥时候测的、想起来就测的时候、没固定时间测的、任意时候测的
    """
    text_lower = text.lower()
    
    # 空腹场景的口语表述（优先级最高，因为空腹场景较常见）
    # 匹配：没吃饭的时候测的、饿了一晚上之后测的、没吃早饭那会测的、肚子空着的时候测的
    fasting_keywords = [
        r"没吃饭.*时候.*测",
        r"没吃饭.*测",
        r"饿.*一晚上.*测",
        r"饿.*晚上.*测",
        r"没吃早饭.*测",
        r"没吃早餐.*测",
        r"肚子空.*时候.*测",
        r"肚子空.*测",
        r"空腹",
        r"fasting",
        r"饿着.*测",
        r"空着.*测",
    ]
    for pattern in fasting_keywords:
        if re.search(pattern, text_lower):
            return "fasting"
    
    # 餐前场景的口语表述（在餐后之前检查，避免冲突）
    # 匹配：吃饭前测的、准备开饭的时候测的、没吃饭之前测的、要吃饭了先测的
    pre_meal_keywords = [
        r"吃饭前.*测",
        r"准备开饭.*时候.*测",
        r"准备开饭.*测",
        r"没吃饭之前.*测",
        r"要吃饭.*先测",
        r"餐前",
        r"pre.*meal",
        r"饭前",
    ]
    for pattern in pre_meal_keywords:
        if re.search(pattern, text_lower):
            return "pre_meal"
    
    # 餐后场景的口语表述
    # 匹配：吃完饭后测的、刚吃完饭那阵儿测的、吃饱东西之后测的、用餐结束后测的
    post_meal_keywords = [
        r"吃完.*饭后.*测",
        r"刚吃完.*饭.*测",
        r"吃饱.*东西.*测",
        r"吃饱.*测",
        r"用餐结束.*测",
        r"餐后",
        r"post.*meal",
        r"饭后",
        r"吃完.*测",
    ]
    for pattern in post_meal_keywords:
        if re.search(pattern, text_lower):
            return "post_meal"
    
    # 随机场景的口语表述（优先级最低）
    # 匹配：随便啥时候测的、想起来就测的时候、没固定时间测的、任意时候测的
    random_keywords = [
        r"随便.*时候.*测",
        r"想起来.*测",
        r"没固定时间.*测",
        r"任意时候.*测",
        r"随机",
        r"random",
        r"随便.*测",
        r"任意.*测",
    ]
    for pattern in random_keywords:
        if re.search(pattern, text_lower):
            return "random"
    
    return None


# ==================== 数据记录 Agent ====================

class DataLoggingAgent:
    """数据记录Agent：结构化抽取与入库"""
    
    def _get_db(self) -> Session:
        """获取数据库会话（使用上下文管理器确保连接关闭）"""
        db_gen = database.get_db()
        db = next(db_gen)
        # 注意：这里不能直接返回，需要在finally中关闭
        # 更好的方式是使用上下文管理器
        return db
    
    def _get_db_safe(self):
        """安全获取数据库会话（使用上下文管理器）"""
        from contextlib import contextmanager
        @contextmanager
        def db_session():
            db = database.SessionLocal()
            try:
                yield db
            finally:
                db.close()
        return db_session()
    
    def log_glucose(
        self,
        user_id: int,
        text: str,
        timestamp: Optional[datetime.datetime] = None,
        unit: Optional[str] = None,
        context: Optional[str] = None,
        meal_type: Optional[str] = None,
        hours_after_meal: Optional[float] = None,
    ) -> Dict:
        """
        记录血糖测量
        
        返回: {
            "success": bool,
            "message": str,
            "reading_id": int,
            "value": float,
            "unit": str,
            "missing_info": List[str]
        }
        """
        missing_info = []
        
        # 提取数值
        value = extract_glucose_value(text)
        if value is None:
            return {
                "success": False,
                "message": "抱歉，我没有在您的话里找到血糖数值，请再说一次，比如\"血糖8.5\"。",
                "missing_info": ["血糖数值"]
            }
        
        # 检测单位
        if unit is None:
            unit = detect_unit(text)
        
        # 统一转换为mmol/L存储
        if unit == "mg/dL":
            value_mmol = convert_glucose_unit(value, "mg/dL", "mmol/L")
        else:
            value_mmol = value
        
        # 时间推断
        if timestamp is None:
            timestamp = datetime.datetime.utcnow()
        
        # 餐次推断
        if meal_type is None:
            meal_type = detect_meal_type_from_text(text)
            if meal_type is None:
                meal_type = infer_meal_type(timestamp)
        
        # 上下文推断：先尝试从口语化表述中识别
        if context is None:
            # 首先尝试识别口语化表述
            context = detect_context_from_colloquial(text)
            
            # 如果口语识别失败，再尝试标准关键词
            if context is None:
                if "空腹" in text or "fasting" in text.lower():
                    context = "fasting"
                elif "餐后" in text or "post" in text.lower() or hours_after_meal is not None:
                    context = "post_meal"
                    if hours_after_meal is None:
                        hours_after_meal = extract_hours_after_meal(text)
                        if hours_after_meal is None:
                            missing_info.append("餐后时长")
                elif "餐前" in text or "pre" in text.lower():
                    context = "pre_meal"
            
            # 如果仍然无法识别，根据时间推断
            if context is None:
                # 根据时间推断：早上可能是空腹
                if timestamp.hour < 10:
                    context = "fasting"
                else:
                    context = "random"
                    missing_info.append("测量上下文（空腹/餐后）")
        
        # 使用上下文管理器确保连接关闭
        db = database.SessionLocal()
        try:
            # 创建记录
            reading = models.GlucoseReading(
                user_id=user_id,
                value=value_mmol,
                unit="mmol/L",  # 统一存储为mmol/L
                timestamp=timestamp,
                context=context,
                meal_type=meal_type,
                hours_after_meal=hours_after_meal,
            )
            
            db.add(reading)
            db.commit()
            db.refresh(reading)
            
            reading_id = reading.id
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
        message = f"已为您记录血糖值：{value} {unit}（{value_mmol:.1f} mmol/L）"
        if context:
            message += f"，测量类型：{context}"
        if missing_info:
            message += f"。还需要补充：{', '.join(missing_info)}"
        
        return {
            "success": True,
            "message": message,
            "reading_id": reading_id,
            "value": value_mmol,
            "unit": "mmol/L",
            "missing_info": missing_info
        }
    
    def log_meal(
        self,
        user_id: int,
        text: str,
        timestamp: Optional[datetime.datetime] = None,
        meal_type: Optional[str] = None,
        portion_size: Optional[str] = None,
    ) -> Dict:
        """
        记录餐饮
        
        返回: {
            "success": bool,
            "message": str,
            "meal_id": int,
            "missing_info": List[str]
        }
        """
        missing_info = []
        
        if timestamp is None:
            timestamp = datetime.datetime.utcnow()
        
        if meal_type is None:
            meal_type = detect_meal_type_from_text(text)
            if meal_type is None:
                meal_type = infer_meal_type(timestamp)
        
        # 估算营养信息（简化版，实际应调用营养库）
        estimated_carbs, estimated_gi, estimated_gl = self._estimate_nutrition(text)
        
        # 使用上下文管理器确保连接关闭
        db = database.SessionLocal()
        try:
            meal = models.MealEntry(
                user_id=user_id,
                meal_type=meal_type,
                timestamp=timestamp,
                description=text,
                portion_size=portion_size,
                estimated_carbs=estimated_carbs,
                estimated_gi=estimated_gi,
                estimated_gl=estimated_gl,
            )
            
            db.add(meal)
            db.commit()
            db.refresh(meal)
            
            meal_id = meal.id
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
        message = f"已为您记录饮食：{text}"
        if portion_size is None:
            missing_info.append("份量")
            message += "。如需更准确的分析，请补充份量信息。"
        
        return {
            "success": True,
            "message": message,
            "meal_id": meal_id,
            "missing_info": missing_info
        }
    
    def log_exercise(
        self,
        user_id: int,
        text: str,
        timestamp: Optional[datetime.datetime] = None,
        exercise_type: Optional[str] = None,
        duration_minutes: Optional[int] = None,
        intensity: Optional[str] = None,
    ) -> Dict:
        """记录运动"""
        if timestamp is None:
            timestamp = datetime.datetime.utcnow()
        
        if exercise_type is None:
            # 简单识别运动类型
            text_lower = text.lower()
            if "跑步" in text_lower or "run" in text_lower:
                exercise_type = "跑步"
            elif "走路" in text_lower or "walk" in text_lower:
                exercise_type = "走路"
            elif "游泳" in text_lower or "swim" in text_lower:
                exercise_type = "游泳"
            else:
                exercise_type = text
        
        if duration_minutes is None:
            # 尝试提取时长
            match = re.search(r"(\d+)\s*分钟", text)
            if match:
                duration_minutes = int(match.group(1))
        
        if intensity is None:
            intensity = "moderate"  # 默认中等强度
        
        # 使用上下文管理器确保连接关闭
        db = database.SessionLocal()
        try:
            exercise = models.ExerciseRecord(
                user_id=user_id,
                exercise_type=exercise_type,
                duration_minutes=duration_minutes,
                intensity=intensity,
                timestamp=timestamp,
            )
            
            db.add(exercise)
            db.commit()
            db.refresh(exercise)
            
            exercise_id = exercise.id
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
        return {
            "success": True,
            "message": f"已记录运动：{exercise_type}",
            "exercise_id": exercise_id
        }
    
    def log_medication(
        self,
        user_id: int,
        text: str,
        timestamp: Optional[datetime.datetime] = None,
        medication_name: Optional[str] = None,
        dosage: Optional[str] = None,
    ) -> Dict:
        """记录药物"""
        if timestamp is None:
            timestamp = datetime.datetime.utcnow()
        
        if medication_name is None:
            medication_name = text
        
        # 使用上下文管理器确保连接关闭
        db = database.SessionLocal()
        try:
            medication = models.MedicationRecord(
                user_id=user_id,
                medication_name=medication_name,
                dosage=dosage,
                timestamp=timestamp,
            )
            
            db.add(medication)
            db.commit()
            db.refresh(medication)
            
            medication_id = medication.id
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
        return {
            "success": True,
            "message": f"已记录用药：{medication_name}",
            "medication_id": medication_id
        }
    
    def _estimate_nutrition(self, text: str) -> Tuple[Optional[float], Optional[float], Optional[float]]:
        """估算营养信息（简化版）"""
        # 这里应该调用营养库，现在用简单规则
        text_lower = text.lower()
        
        # 简单估算（实际应使用营养库）
        carbs = None
        gi = None
        gl = None
        
        # 常见食物估算（示例）
        if "面" in text_lower:
            carbs = 50.0  # 假设一份面约50g碳水
            gi = 60.0
        elif "米饭" in text_lower or "米" in text_lower:
            carbs = 40.0
            gi = 70.0
        elif "面包" in text_lower:
            carbs = 30.0
            gi = 70.0
        
        if carbs and gi:
            gl = carbs * gi / 100.0
        
        return carbs, gi, gl


# ==================== 即时分析 Agent ====================

class InstantAnalysisAgent:
    """即时分析Agent：个体化基线对比、趋势判断、风险分层"""
    
    def analyze_glucose(
        self,
        user_id: int,
        current_value: float,
        context: Optional[str] = None,
        reading_id: Optional[int] = None,
    ) -> Dict:
        """
        分析血糖数值
        
        返回: {
            "risk_level": str,
            "conclusion": str,
            "reasoning": str,
            "suggestions": List[str],
            "trend": Dict,
            "comparison": Dict
        }
        """
        # 使用上下文管理器确保连接关闭
        db = database.SessionLocal()
        try:
            # 获取用户档案和目标
            user = db.query(models.User).filter(models.User.id == user_id).first()
            if not user:
                return {
                    "risk_level": "unknown",
                    "conclusion": "未找到用户信息",
                    "reasoning": "",
                    "suggestions": []
                }
            
            # 获取个体化目标
            target_min, target_max = self._get_target_range(user, context)
            
            # 风险分层
            risk_level, conclusion, reasoning, suggestions = self._assess_risk(
                current_value, target_min, target_max, context
            )
            
            # 趋势分析
            trend = self._analyze_trend(db, user_id, current_value, context)
            
            # 对比分析
            comparison = self._compare_with_history(db, user_id, current_value, context)
            
            # 保存分析事件
            if reading_id:
                analysis_event = models.AnalysisEvent(
                    user_id=user_id,
                    glucose_reading_id=reading_id,
                    risk_level=risk_level,
                    conclusion=conclusion,
                    reasoning=reasoning,
                    suggestions=json.dumps(suggestions, ensure_ascii=False),
                    trend_direction=trend.get("direction"),
                    comparison_period=comparison.get("period"),
                    average_value=comparison.get("average"),
                )
                db.add(analysis_event)
                
                # 更新血糖记录的risk_level
                reading = db.query(models.GlucoseReading).filter(
                    models.GlucoseReading.id == reading_id
                ).first()
                if reading:
                    reading.risk_level = risk_level
                    reading.analysis_notes = reasoning
                
                db.commit()
            
            result = {
                "risk_level": risk_level,
                "conclusion": conclusion,
                "reasoning": reasoning,
                "suggestions": suggestions,
                "trend": trend,
                "comparison": comparison
            }
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
        
        return result
    
    def _get_target_range(self, user: models.User, context: Optional[str]) -> Tuple[float, float]:
        """获取个体化目标区间"""
        if context == "fasting":
            if user.fasting_target_min and user.fasting_target_max:
                return user.fasting_target_min, user.fasting_target_max
            # 默认空腹目标：4.4-7.2 mmol/L
            return 4.4, 7.2
        elif context == "post_meal":
            if user.post_meal_target_max:
                return 0, user.post_meal_target_max
            # 默认餐后2h目标：<10.0 mmol/L（或更严格<7.8）
            return 0, 10.0
        else:
            # 随机测量：使用较宽范围
            return 3.9, 11.1
    
    def _assess_risk(
        self,
        value: float,
        target_min: float,
        target_max: float,
        context: Optional[str],
    ) -> Tuple[str, str, str, List[str]]:
        """风险评估"""
        # 紧急情况
        if value < 3.9:
            return (
                "critical",
                "低血糖风险",
                f"您的血糖值{value:.1f} mmol/L低于安全阈值3.9 mmol/L，属于低血糖。",
                [
                    "请立即补充速效碳水化合物（如糖果、果汁、葡萄糖片）",
                    "15分钟后复测血糖",
                    "如症状持续或加重，请立即就医",
                    "注意：本建议仅供参考，紧急情况请及时联系医生"
                ]
            )
        elif value >= 16.7:
            return (
                "critical",
                "极高血糖风险",
                f"您的血糖值{value:.1f} mmol/L非常高，需要立即关注。",
                [
                    "请多喝水，保持水分",
                    "密切监测症状",
                    "建议尽快联系医生或前往医院",
                    "注意：本建议仅供参考，紧急情况请及时就医"
                ]
            )
        elif value >= 11.1:
            return (
                "high",
                "血糖偏高",
                f"您的血糖值{value:.1f} mmol/L偏高。",
                [
                    "建议多喝水",
                    "适当增加运动",
                    "检查最近的饮食和用药情况",
                    "如持续偏高，建议咨询医生"
                ]
            )
        elif value < target_min:
            return (
                "moderate",
                "血糖偏低",
                f"您的血糖值{value:.1f} mmol/L略低于目标范围。",
                [
                    "注意监测，避免低血糖",
                    "适当调整饮食"
                ]
            )
        elif target_min <= value <= target_max:
            return (
                "normal",
                "血糖在目标范围内",
                f"您的血糖值{value:.1f} mmol/L在目标范围内，控制得很好！",
                [
                    "继续保持当前的饮食和运动习惯",
                    "定期监测血糖"
                ]
            )
        else:
            return (
                "moderate",
                "血糖略高于目标",
                f"您的血糖值{value:.1f} mmol/L略高于目标范围。",
                [
                    "注意饮食搭配",
                    "适当增加运动",
                    "继续监测"
                ]
            )
    
    def _analyze_trend(
        self,
        db: Session,
        user_id: int,
        current_value: float,
        context: Optional[str],
    ) -> Dict:
        """趋势分析"""
        # 获取最近7天的数据
        week_ago = datetime.datetime.utcnow() - datetime.timedelta(days=7)
        query = db.query(models.GlucoseReading).filter(
            and_(
                models.GlucoseReading.user_id == user_id,
                models.GlucoseReading.timestamp >= week_ago
            )
        )
        
        if context:
            query = query.filter(models.GlucoseReading.context == context)
        
        recent_readings = query.all()
        
        if len(recent_readings) < 2:
            return {
                "direction": "insufficient_data",
                "message": "数据不足，无法分析趋势"
            }
        
        # 计算平均值
        avg_value = sum(r.value for r in recent_readings) / len(recent_readings)
        
        # 判断趋势
        if current_value > avg_value * 1.1:
            direction = "up"
            message = f"较近7天平均值({avg_value:.1f} mmol/L)有所上升"
        elif current_value < avg_value * 0.9:
            direction = "down"
            message = f"较近7天平均值({avg_value:.1f} mmol/L)有所下降"
        else:
            direction = "stable"
            message = f"与近7天平均值({avg_value:.1f} mmol/L)基本一致"
        
        return {
            "direction": direction,
            "message": message,
            "average": avg_value,
            "period": "7d"
        }
    
    def _compare_with_history(
        self,
        db: Session,
        user_id: int,
        current_value: float,
        context: Optional[str],
    ) -> Dict:
        """与历史数据对比"""
        # 获取不同周期的平均值
        now = datetime.datetime.utcnow()
        periods = {
            "7d": now - datetime.timedelta(days=7),
            "14d": now - datetime.timedelta(days=14),
            "30d": now - datetime.timedelta(days=30),
        }
        
        results = {}
        for period_name, start_date in periods.items():
            query = db.query(func.avg(models.GlucoseReading.value)).filter(
                and_(
                    models.GlucoseReading.user_id == user_id,
                    models.GlucoseReading.timestamp >= start_date
                )
            )
            if context:
                query = query.filter(models.GlucoseReading.context == context)
            
            avg = query.scalar()
            if avg:
                results[period_name] = float(avg)
        
        # 选择有数据的最近周期
        period = "7d"
        if "7d" in results:
            avg = results["7d"]
        elif "14d" in results:
            avg = results["14d"]
            period = "14d"
        elif "30d" in results:
            avg = results["30d"]
            period = "30d"
        else:
            avg = None
        
        return {
            "period": period,
            "average": avg,
            "all_periods": results
        }


# ==================== 教育科普 Agent ====================

class EducationAgent:
    """教育科普Agent：医学概念解释、关联用户场景"""
    
    def __init__(self):
        self.knowledge_base = {
            "gi": {
                "concept": "GI（血糖生成指数）",
                "explanation": "GI值衡量食物导致血糖升高的速度和程度。范围0-100，数值越高，血糖升高越快。",
                "classification": {
                    "低GI": "≤55，血糖升高缓慢，适合糖尿病患者",
                    "中GI": "56-69，血糖升高中等",
                    "高GI": "≥70，血糖升高快速，应适量控制"
                },
                "examples": {
                    "低GI": "燕麦、全麦面包、苹果、豆类",
                    "高GI": "白米饭、白面包、糖果、果汁"
                }
            },
            "gl": {
                "concept": "GL（血糖负荷）",
                "explanation": "GL值综合考虑了GI值和食物份量，更能反映实际对血糖的影响。GL = GI × 碳水化合物含量(g) / 100",
                "classification": {
                    "低GL": "≤10",
                    "中GL": "11-19",
                    "高GL": "≥20"
                }
            },
            "空腹血糖": {
                "concept": "空腹血糖",
                "explanation": "空腹血糖是指至少8小时未进食后测量的血糖值，通常在早晨起床后测量。",
                "正常范围": "正常：3.9-6.1 mmol/L；糖尿病前期：6.1-7.0 mmol/L；糖尿病：≥7.0 mmol/L",
                "意义": "空腹血糖反映基础胰岛素分泌功能和肝脏葡萄糖输出情况。"
            },
            "餐后血糖": {
                "concept": "餐后血糖",
                "explanation": "餐后血糖是指进食后测量的血糖值，通常测量餐后2小时血糖。",
                "正常范围": "正常：<7.8 mmol/L；糖尿病前期：7.8-11.1 mmol/L；糖尿病：≥11.1 mmol/L",
                "意义": "餐后血糖反映餐后胰岛素分泌和葡萄糖处理能力。"
            },
            "hba1c": {
                "concept": "HbA1c（糖化血红蛋白）",
                "explanation": "HbA1c反映过去2-3个月的平均血糖水平，是评估长期血糖控制的重要指标。",
                "正常范围": "正常：<5.7%；糖尿病前期：5.7-6.4%；糖尿病：≥6.5%",
                "意义": "不受单次测量波动影响，更能反映整体血糖控制情况。"
            },
            "监测频率": {
                "concept": "血糖监测频率",
                "explanation": "根据病情和治疗方案，监测频率不同。",
                "建议": {
                    "新诊断或调整治疗方案": "每天4-7次（三餐前后+睡前）",
                    "稳定期": "每周2-4次（不同时间点）",
                    "特殊情况": "运动前后、感觉不适时增加监测"
                }
            }
        }
    
    def answer_question(self, question: str, user_id: Optional[int] = None) -> Dict:
        """
        回答科普问题
        
        返回: {
            "answer": str,
            "related_info": str,
            "personalized": str
        }
        """
        question_lower = question.lower()
        
        # 匹配知识库
        matched_topic = None
        for keyword, info in self.knowledge_base.items():
            if keyword in question_lower or keyword.replace("值", "") in question_lower:
                matched_topic = (keyword, info)
                break
        
        if not matched_topic:
            # 通用回答
            return {
                "answer": "这个问题我还在学习中。关于血糖管理，建议关注：低GI饮食、控制总能量、规律运动、定期监测。如有具体问题，可以详细描述。",
                "related_info": "",
                "personalized": ""
            }
        
        keyword, info = matched_topic
        
        # 构建回答
        answer_parts = [f"【{info['concept']}】"]
        answer_parts.append(info['explanation'])
        
        # 添加分类信息
        if 'classification' in info:
            answer_parts.append("\n分类标准：")
            for level, desc in info['classification'].items():
                answer_parts.append(f"  • {level}：{desc}")
        
        # 添加示例
        if 'examples' in info:
            answer_parts.append("\n常见食物示例：")
            for level, foods in info['examples'].items():
                answer_parts.append(f"  • {level}：{foods}")
        
        # 添加其他信息
        for key in ['正常范围', '意义', '建议']:
            if key in info:
                if isinstance(info[key], dict):
                    answer_parts.append(f"\n{key}：")
                    for k, v in info[key].items():
                        answer_parts.append(f"  • {k}：{v}")
                else:
                    answer_parts.append(f"\n{key}：{info[key]}")
        
        answer = "\n".join(answer_parts)
        
        # 个性化关联（如果有用户数据）
        personalized = ""
        if user_id:
            personalized = self._personalize_advice(keyword, user_id)
        
        return {
            "answer": answer,
            "related_info": f"更多关于{info['concept']}的信息，可以继续提问。",
            "personalized": personalized
        }
    
    def _personalize_advice(self, topic: str, user_id: int) -> str:
        """个性化建议（关联用户当前情境）"""
        # 这里可以根据用户的历史数据给出个性化建议
        # 简化实现
        return ""


# ==================== 激励与情感支持 Agent ====================

class EmotionalSupportAgent:
    """激励与情感支持Agent：共情反馈、鼓励机制、行为激励"""
    
    def __init__(self):
        self.positive_keywords = [
            "控制得很好", "达标", "开心", "顺利", "进步", "改善", "好多了",
            "成功", "坚持", "努力", "加油"
        ]
        self.negative_keywords = [
            "沮丧", "控制不好", "又高了", "失败", "担心", "焦虑", "失望",
            "没效果", "没用", "放弃", "太难了"
        ]
        self.anxious_keywords = [
            "担心", "害怕", "焦虑", "紧张", "不安", "恐惧"
        ]
    
    def provide_support(self, text: str, user_id: Optional[int] = None) -> Dict:
        """
        提供情感支持
        
        返回: {
            "sentiment": str,
            "empathy": str,
            "encouragement": str,
            "next_steps": List[str]
        }
        """
        text_lower = text.lower()
        
        # 情感识别
        sentiment = "neutral"
        if any(kw in text_lower for kw in self.anxious_keywords):
            sentiment = "anxious"
        elif any(kw in text_lower for kw in self.negative_keywords):
            sentiment = "negative"
        elif any(kw in text_lower for kw in self.positive_keywords):
            sentiment = "positive"
        
        # 根据情感提供支持
        if sentiment == "positive":
            return {
                "sentiment": sentiment,
                "empathy": "看到您的进步，我也为您感到高兴！",
                "encouragement": "继续保持当前的良好习惯，您的努力正在带来积极的变化。",
                "next_steps": [
                    "记录下今天的成功经验",
                    "继续保持规律的监测",
                    "与医生分享您的进步"
                ]
            }
        elif sentiment == "negative":
            return {
                "sentiment": sentiment,
                "empathy": "我理解您的沮丧，血糖管理确实是一个长期的过程，偶尔的波动是正常的。",
                "encouragement": "不要因为一次的结果而气馁，重要的是持续的努力和调整。",
                "next_steps": [
                    "让我们一起复盘最近的数据，找出可以改进的地方",
                    "设定一个小的、可执行的目标",
                    "记住：进步是渐进的，不是一蹴而就的"
                ]
            }
        elif sentiment == "anxious":
            return {
                "sentiment": sentiment,
                "empathy": "我理解您的担心，这是很正常的。让我们一步步来，不要给自己太大压力。",
                "encouragement": "焦虑是正常的，但我们可以通过科学的管理和监测来减少不确定性。",
                "next_steps": [
                    "定期监测可以帮助您更好地了解自己的血糖模式",
                    "与医生沟通您的担忧",
                    "记住：您不是一个人在战斗"
                ]
            }
        else:
            return {
                "sentiment": sentiment,
                "empathy": "",
                "encouragement": "继续坚持，您正在做正确的事情。",
                "next_steps": []
            }
    
    def provide_positive_feedback(
        self,
        user_id: int,
        achievement: str,
    ) -> str:
        """提供正向反馈"""
        feedbacks = [
            f"太棒了！{achievement}，这是您坚持努力的成果！",
            f"恭喜您！{achievement}，继续保持！",
            f"做得很好！{achievement}，您的进步值得肯定！",
        ]
        import random
        return random.choice(feedbacks)
    
    def set_smart_goal(
        self,
        user_id: int,
        goal_description: str,
    ) -> Dict:
        """设定SMART目标"""
        # 简化实现
        return {
            "success": True,
            "message": f"已为您设定目标：{goal_description}",
            "reminder": "我会定期提醒您关注目标进展。"
        }
