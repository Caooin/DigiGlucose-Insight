"""
对话协调Agent（Orchestrator）：意图识别、槽位管理、路由策略、响应聚合
"""
import datetime
import re
import json
from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import and_

from . import models, database
from .agents import (
    DataLoggingAgent,
    InstantAnalysisAgent,
    EducationAgent,
    EmotionalSupportAgent,
)


class OrchestratorAgent:
    """对话协调Agent"""
    
    def __init__(self):
        self.data_logger = DataLoggingAgent()
        self.analyzer = InstantAnalysisAgent()
        self.educator = EducationAgent()
        self.supporter = EmotionalSupportAgent()
    
    def _get_db(self) -> Session:
        """获取数据库会话（使用上下文管理器确保连接关闭）"""
        return database.SessionLocal()
    
    def process_message(
        self,
        user_id: int,
        session_id: str,
        message: str,
    ) -> Dict:
        """
        处理用户消息
        
        返回: {
            "reply": str,
            "intent": str,
            "sentiment": str,
            "actions_taken": List[str],
            "needs_clarification": List[str]
        }
        """
        # 1. 意图识别
        intent = self._classify_intent(message)
        
        # 2. 情感识别
        sentiment = self._detect_sentiment(message)
        
        # 3. 槽位抽取
        slots = self._extract_slots(message)
        
        # 4. 更新对话状态
        self._update_conversation_state(user_id, session_id, intent, sentiment, slots)
        
        # 5. 路由到专业Agent
        reply_parts = []
        actions_taken = []
        needs_clarification = []
        
        # 根据意图和优先级处理
        if intent == "record_glucose":
            result = self._handle_record_glucose(user_id, message, slots)
            reply_parts.append(result["message"])
            actions_taken.append("记录血糖")
            if result.get("missing_info"):
                needs_clarification.extend(result["missing_info"])
            
            # 自动触发分析
            if result.get("reading_id"):
                analysis = self.analyzer.analyze_glucose(
                    user_id,
                    result["value"],
                    result.get("context"),
                    result["reading_id"]
                )
                reply_parts.append(self._format_analysis(analysis))
                actions_taken.append("分析血糖")
        
        elif intent == "record_meal":
            result = self.data_logger.log_meal(user_id, message)
            reply_parts.append(result["message"])
            actions_taken.append("记录饮食")
            if result.get("missing_info"):
                needs_clarification.extend(result["missing_info"])
        
        elif intent == "record_exercise":
            result = self.data_logger.log_exercise(user_id, message)
            reply_parts.append(result["message"])
            actions_taken.append("记录运动")
        
        elif intent == "record_medication":
            result = self.data_logger.log_medication(user_id, message)
            reply_parts.append(result["message"])
            actions_taken.append("记录用药")
        
        elif intent == "ask_value_status":
            result = self._handle_ask_value_status(user_id, message)
            reply_parts.append(result["message"])
            actions_taken.append("分析血糖状态")
        
        elif intent == "ask_education":
            result = self.educator.answer_question(message, user_id)
            reply_parts.append(result["answer"])
            if result.get("personalized"):
                reply_parts.append(result["personalized"])
            actions_taken.append("科普教育")
        
        elif intent == "emotional_support":
            result = self.supporter.provide_support(message, user_id)
            reply_parts.append(result["empathy"])
            reply_parts.append(result["encouragement"])
            if result.get("next_steps"):
                reply_parts.append("建议：\n" + "\n".join(f"• {step}" for step in result["next_steps"]))
            actions_taken.append("情感支持")
        
        elif intent == "weekly_report":
            result = self._handle_weekly_report(user_id)
            reply_parts.append(result["message"])
            actions_taken.append("生成周报")
        
        elif intent == "risk_alert":
            # 风险告警已在记录血糖时自动处理
            reply_parts.append("已检测到风险情况，请查看上述分析建议。")
            actions_taken.append("风险告警")
        
        else:
            # 默认：尝试理解并给出建议
            reply_parts.append("我理解您的问题。")
            if "血糖" in message:
                reply_parts.append("如果您想记录血糖，可以说\"我测了血糖X.X\"；如果想询问数值，可以说\"这个数值高吗？\"")
            else:
                reply_parts.append("我可以帮您：记录血糖/饮食/运动，分析血糖状态，回答健康问题，提供情感支持。请告诉我您需要什么帮助。")
        
        # 6. 情感支持（如果检测到负面情绪）
        if sentiment in ["negative", "anxious", "frustrated"]:
            support = self.supporter.provide_support(message, user_id)
            if support.get("empathy"):
                reply_parts.insert(1, support["empathy"])  # 在开头插入共情
        
        # 7. 聚合响应
        reply = "\n\n".join(filter(None, reply_parts))
        
        # 8. 安全检查：添加免责声明（如果涉及医疗建议）
        if intent in ["ask_value_status", "risk_alert"] or "建议" in reply:
            reply += "\n\n⚠️ 重要提示：以上建议仅供参考，不能替代专业医疗诊断。如有紧急情况或持续异常，请及时联系医生。"
        
        return {
            "reply": reply,
            "intent": intent,
            "sentiment": sentiment,
            "actions_taken": actions_taken,
            "needs_clarification": needs_clarification
        }
    
    def _classify_intent(self, message: str) -> str:
        """意图分类"""
        message_lower = message.lower()
        
        # 记录血糖
        if ("血糖" in message or "测了" in message or "测量" in message) and any(c.isdigit() for c in message):
            return "record_glucose"
        
        # 记录饮食
        if "吃了" in message or "饮食" in message or ("餐" in message and ("记录" in message or "吃" in message)):
            return "record_meal"
        
        # 记录运动
        if "运动" in message or "锻炼" in message or "跑步" in message or "走路" in message:
            return "record_exercise"
        
        # 记录用药
        if "用药" in message or "吃药" in message or "药物" in message:
            return "record_medication"
        
        # 询问数值状态
        if ("怎么样" in message or "高吗" in message or "低吗" in message or "正常吗" in message) and "血糖" in message:
            return "ask_value_status"
        
        # 周报
        if "周报" in message or "这周" in message or "本周" in message or "复盘" in message:
            return "weekly_report"
        
        # 教育科普
        if "是什么" in message or "什么意思" in message or "gi" in message_lower or "解释" in message:
            return "ask_education"
        
        # 情感支持
        negative_keywords = ["沮丧", "控制不好", "又高了", "失败", "担心", "焦虑"]
        positive_keywords = ["控制得很好", "达标", "开心", "进步"]
        if any(kw in message for kw in negative_keywords + positive_keywords):
            return "emotional_support"
        
        # 风险告警（在记录时自动检测）
        if "低血糖" in message or "高血糖" in message or "紧急" in message:
            return "risk_alert"
        
        return "general"
    
    def _detect_sentiment(self, message: str) -> str:
        """情感识别"""
        message_lower = message.lower()
        
        anxious_keywords = ["担心", "害怕", "焦虑", "紧张"]
        negative_keywords = ["沮丧", "控制不好", "又高了", "失败", "失望"]
        positive_keywords = ["控制得很好", "达标", "开心", "顺利", "进步"]
        
        if any(kw in message_lower for kw in anxious_keywords):
            return "anxious"
        elif any(kw in message_lower for kw in negative_keywords):
            return "negative"
        elif any(kw in message_lower for kw in positive_keywords):
            return "positive"
        else:
            return "neutral"
    
    def _extract_slots(self, message: str) -> Dict:
        """槽位抽取"""
        slots = {}
        
        # 提取血糖值
        from .agents import extract_glucose_value
        value = extract_glucose_value(message)
        if value:
            slots["glucose_value"] = value
        
        # 提取单位
        from .agents import detect_unit
        unit = detect_unit(message)
        if unit:
            slots["unit"] = unit
        
        # 提取时间
        # 简化：实际应使用更复杂的NLP
        
        # 提取餐次
        from .agents import detect_meal_type_from_text
        meal_type = detect_meal_type_from_text(message)
        if meal_type:
            slots["meal_type"] = meal_type
        
        # 提取餐后时长
        from .agents import extract_hours_after_meal
        hours = extract_hours_after_meal(message)
        if hours:
            slots["hours_after_meal"] = hours
        
        return slots
    
    def _update_conversation_state(
        self,
        user_id: int,
        session_id: str,
        intent: str,
        sentiment: str,
        slots: Dict,
    ):
        """更新对话状态"""
        db = self._get_db()
        try:
            state = db.query(models.ConversationState).filter(
                and_(
                    models.ConversationState.user_id == user_id,
                    models.ConversationState.session_id == session_id
                )
            ).first()
            
            if not state:
                state = models.ConversationState(
                    user_id=user_id,
                    session_id=session_id,
                    current_topic=intent,
                    intent=intent,
                    sentiment=sentiment,
                    slots=json.dumps(slots, ensure_ascii=False),
                )
                db.add(state)
            else:
                state.current_topic = intent
                state.intent = intent
                state.sentiment = sentiment
                state.slots = json.dumps(slots, ensure_ascii=False)
                state.updated_at = datetime.datetime.utcnow()
            
            db.commit()
        except Exception as e:
            db.rollback()
            raise e
        finally:
            db.close()
    
    def _handle_record_glucose(
        self,
        user_id: int,
        message: str,
        slots: Dict,
    ) -> Dict:
        """处理记录血糖"""
        from .agents import extract_glucose_value, detect_unit, detect_meal_type_from_text, extract_hours_after_meal
        
        value = slots.get("glucose_value") or extract_glucose_value(message)
        unit = slots.get("unit") or detect_unit(message)
        meal_type = slots.get("meal_type") or detect_meal_type_from_text(message)
        hours_after_meal = slots.get("hours_after_meal") or extract_hours_after_meal(message)
        
        # 判断上下文（使用口语识别函数）
        from .agents import detect_context_from_colloquial
        context = detect_context_from_colloquial(message)
        if context is None:
            # 如果口语识别失败，使用标准关键词
            if "空腹" in message or "fasting" in message.lower():
                context = "fasting"
            elif "餐后" in message or hours_after_meal is not None:
                context = "post_meal"
            elif "餐前" in message or "pre" in message.lower():
                context = "pre_meal"
        
        result = self.data_logger.log_glucose(
            user_id=user_id,
            text=message,
            unit=unit,
            context=context,
            meal_type=meal_type,
            hours_after_meal=hours_after_meal,
        )
        
        return result
    
    def _handle_ask_value_status(self, user_id: int, message: str) -> Dict:
        """处理询问数值状态"""
        db = self._get_db()
        
        # 获取最近一次测量
        latest_reading = db.query(models.GlucoseReading).filter(
            models.GlucoseReading.user_id == user_id
        ).order_by(models.GlucoseReading.timestamp.desc()).first()
        
        if not latest_reading:
            return {
                "message": "抱歉，我没有找到您最近的血糖记录。请先记录一次血糖测量。"
            }
        
        # 分析
        analysis = self.analyzer.analyze_glucose(
            user_id,
            latest_reading.value,
            latest_reading.context,
            latest_reading.id
        )
        
        message_parts = [
            f"您最近的血糖值是 {latest_reading.value:.1f} mmol/L",
            self._format_analysis(analysis)
        ]
        
        return {
            "message": "\n\n".join(message_parts)
        }
    
    def _format_analysis(self, analysis: Dict) -> str:
        """格式化分析结果"""
        parts = []
        
        parts.append(f"【分析结果】{analysis['conclusion']}")
        
        if analysis.get('reasoning'):
            parts.append(f"依据：{analysis['reasoning']}")
        
        if analysis.get('suggestions'):
            parts.append("建议：")
            for suggestion in analysis['suggestions']:
                parts.append(f"  • {suggestion}")
        
        if analysis.get('trend', {}).get('message'):
            parts.append(f"趋势：{analysis['trend']['message']}")
        
        return "\n".join(parts)
    
    def _handle_weekly_report(self, user_id: int) -> Dict:
        """处理周报请求"""
        from .weekly_report import generate_weekly_report
        
        report = generate_weekly_report(user_id)
        
        return {
            "message": report["content"]
        }



