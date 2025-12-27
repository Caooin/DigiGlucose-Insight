# 兼容不同版本的 LangChain tools 导入
try:
    from langchain.tools import tool
except ImportError:
    try:
        from langchain_core.tools import tool
    except ImportError:
        from langchain.agents import tool

from .agents import (
    DataLoggingAgent,
    InstantAnalysisAgent,
    EducationAgent,
    EmotionalSupportAgent,
    extract_glucose_value,
)

logger = DataLoggingAgent()
analyzer = InstantAnalysisAgent()
educator = EducationAgent()
supporter = EmotionalSupportAgent()

USER_ID = 1  # 示例用户ID，生产应从会话鉴权获得


@tool
def log_glucose_reading(text: str) -> str:
    """当用户想要记录血糖数值时调用。输入应该是用户的原始问话。"""
    result = logger.log_glucose(USER_ID, text)
    if isinstance(result, dict):
        return result.get("message", str(result))
    return str(result)


@tool
def log_meal_entry(text: str) -> str:
    """当用户想要记录他们吃了什么时调用。输入应该是描述食物的原始文本。"""
    result = logger.log_meal(USER_ID, text)
    if isinstance(result, dict):
        return result.get("message", str(result))
    return str(result)


@tool
def analyze_current_glucose(text: str) -> str:
    """当用户记录完血糖后，询问这个数值怎么样时调用。"""
    value = extract_glucose_value(text)
    if value is not None:
        result = analyzer.analyze_glucose(USER_ID, value)
        if isinstance(result, dict):
            # 格式化分析结果
            parts = [result.get("conclusion", "")]
            if result.get("reasoning"):
                parts.append(f"依据：{result['reasoning']}")
            if result.get("suggestions"):
                parts.append("建议：\n" + "\n".join(f"• {s}" for s in result["suggestions"]))
            return "\n".join(parts)
        return str(result)
    return "请先告诉我您的血糖数值是多少。"


@tool
def answer_general_health_question(question: str) -> str:
    """当用户询问血糖/糖尿病管理的科普问题时调用。"""
    result = educator.answer_question(question)
    if isinstance(result, dict):
        return result.get("answer", str(result))
    return str(result)


@tool
def provide_emotional_support(text: str) -> str:
    """当用户的言语中透露出沮丧或开心的情绪时调用。"""
    result = supporter.provide_support(text)
    if isinstance(result, dict):
        parts = []
        if result.get("empathy"):
            parts.append(result["empathy"])
        if result.get("encouragement"):
            parts.append(result["encouragement"])
        if result.get("next_steps"):
            parts.append("建议：\n" + "\n".join(f"• {s}" for s in result["next_steps"]))
        return "\n".join(parts) if parts else str(result)
    return str(result)


agent_tools = [
    log_glucose_reading,
    log_meal_entry,
    analyze_current_glucose,
    answer_general_health_question,
    provide_emotional_support,
]

