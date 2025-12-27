"""
简化版的 MCP 实现，不依赖复杂的 Agent 框架
直接使用 LLM 和工具调用
"""
import os
from typing import List
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

from .tools import agent_tools

system_prompt = """
你是一个顶级的血糖健康管理助手，名字叫"糖小智"。你是总协调中心(MCP)，需要理解用户意图并按需调用专业工具。

工作流程：
1) 友好问候与理解用户意图、情绪。
2) 拆解任务，按需调用合适的工具（可多次调用）。
3) 将工具结果整合成温暖、专业、鼓励性的回答，不要直接回显工具原文。
4) 记住对话历史，保持连贯。

可用工具：
- log_glucose_reading: 记录血糖数值（当用户说"血糖X.X"或"记录血糖"时调用）
- log_meal_entry: 记录饮食（当用户描述吃了什么时调用）
- analyze_current_glucose: 分析血糖数值（当用户询问血糖值怎么样时调用）
- answer_general_health_question: 回答健康科普问题（当用户问GI值、碳水等问题时调用）
- provide_emotional_support: 提供情感支持（当用户表达情绪时调用）
"""

# 使用云雾 API 配置
YUNWU_API_KEY = os.getenv("YUNWU_API_KEY", "sk-YyCYXQPvPUKViIaX8wrbtjVatojJh9L25Ov82Mh36QuS0e6V")
YUNWU_BASE_URL = os.getenv("YUNWU_BASE_URL", "https://api.yunwu.ai/v1")

# 尝试不同的模型名称（根据云雾API支持情况）
# 常见选项：gpt-4, gpt-4-turbo, gpt-4o, gpt-4o-mini, gpt-3.5-turbo-16k
llm = ChatOpenAI(
    model="claude-opus-4-5-20251101-thinking",  # 改为 gpt-4，如果还不行可以尝试 gpt-4-turbo 或 gpt-4o
    temperature=0,
    api_key=YUNWU_API_KEY,
    base_url=YUNWU_BASE_URL,
    timeout=30,
)

# 简单的内存管理
class ConversationBufferMemory:
    def __init__(self, memory_key="chat_history", return_messages=True):
        self.memory_key = memory_key
        self.return_messages = return_messages
        self.messages: List = []
    
    def add_message(self, role: str, content: str):
        if role == "user":
            self.messages.append(HumanMessage(content=content))
        elif role == "assistant":
            self.messages.append(AIMessage(content=content))
    
    def get_messages(self):
        return self.messages
    
    def clear(self):
        self.messages = []


def create_memory() -> ConversationBufferMemory:
    """创建内存对象"""
    return ConversationBufferMemory(memory_key="chat_history", return_messages=True)


def get_mcp_response(user_input: str, memory: ConversationBufferMemory) -> str:
    """简化的 MCP 响应函数"""
    try:
        # 添加用户消息到历史
        memory.add_message("user", user_input)
        
        # 构建消息列表
        messages = [SystemMessage(content=system_prompt)] + memory.get_messages()
        
        # 先尝试调用相关工具
        tool_results = []
        
        # 检查是否需要调用工具
        user_lower = user_input.lower()
        
        # 记录血糖
        if ("血糖" in user_input or "记录" in user_input) and any(char.isdigit() for char in user_input):
            try:
                result = agent_tools[0](user_input)  # log_glucose_reading
                tool_results.append(result)
            except Exception as e:
                print(f"Tool error: {e}")
        
        # 记录饮食
        if "吃了" in user_input or "饮食" in user_input or "餐" in user_input:
            try:
                result = agent_tools[1](user_input)  # log_meal_entry
                tool_results.append(result)
            except Exception as e:
                print(f"Tool error: {e}")
        
        # 分析血糖
        if ("怎么样" in user_input or "分析" in user_input) and "血糖" in user_input:
            try:
                result = agent_tools[2](user_input)  # analyze_current_glucose
                tool_results.append(result)
            except Exception as e:
                print(f"Tool error: {e}")
        
        # 健康问题
        if "gi" in user_lower or "碳水" in user_lower or "糖尿病" in user_lower or "是什么" in user_input:
            try:
                result = agent_tools[3](user_input)  # answer_general_health_question
                if result:
                    tool_results.append(result)
            except Exception as e:
                print(f"Tool error: {e}")
        
        # 情感支持
        try:
            result = agent_tools[4](user_input)  # provide_emotional_support
            if result:
                tool_results.append(result)
        except Exception as e:
            print(f"Tool error: {e}")
        
        # 如果有工具结果，添加到系统提示中
        if tool_results:
            tool_context = "\n\n工具执行结果：\n" + "\n".join(tool_results)
            messages[-1] = SystemMessage(content=system_prompt + tool_context)
        
        # 调用 LLM
        response = llm.invoke(messages)
        reply = response.content if hasattr(response, 'content') else str(response)
        
        # 添加助手回复到历史
        memory.add_message("assistant", reply)
        
        return reply
        
    except Exception as e:
        import traceback
        print(f"MCP Error: {str(e)}")
        print(traceback.format_exc())
        error_msg = str(e).lower()
        if "api" in error_msg or "connection" in error_msg or "timeout" in error_msg:
            return "抱歉，无法连接到AI服务。请检查网络连接和API配置。"
        elif "model" in error_msg or "not found" in error_msg:
            return "抱歉，AI模型配置有误。请检查模型名称是否正确。"
        else:
            return f"处理您的请求时出现错误：{str(e)}"