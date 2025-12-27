import React, { useEffect, useRef, useState } from "react";
import { authFetch } from "./auth";
import "./Chat.css";

// 获取北京时间（精确到秒）
const getBeijingTime = () => {
  const now = new Date();
  const beijingTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Shanghai" }));
  const year = beijingTime.getFullYear();
  const month = String(beijingTime.getMonth() + 1).padStart(2, "0");
  const day = String(beijingTime.getDate()).padStart(2, "0");
  const hours = String(beijingTime.getHours()).padStart(2, "0");
  const minutes = String(beijingTime.getMinutes()).padStart(2, "0");
  const seconds = String(beijingTime.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

// 从localStorage获取对话历史
const getChatHistory = (userId) => {
  const key = `chat_history_${userId}`;
  const history = localStorage.getItem(key);
  return history ? JSON.parse(history) : [];
};

// 保存对话历史到localStorage
const saveChatHistory = (userId, history) => {
  const key = `chat_history_${userId}`;
  localStorage.setItem(key, JSON.stringify(history));
};

// 获取当前活跃对话ID
const getCurrentSessionId = (userId) => {
  return localStorage.getItem(`current_session_${userId}`);
};

// 保存当前活跃对话ID
const saveCurrentSessionId = (userId, sessionId) => {
  localStorage.setItem(`current_session_${userId}`, sessionId);
};

// 保存当前对话消息
const saveCurrentSession = (userId, sessionId, messages) => {
  const key = `current_session_data_${userId}`;
  localStorage.setItem(key, JSON.stringify({ sessionId, messages }));
};

// 获取当前对话消息
const getCurrentSession = (userId) => {
  const key = `current_session_data_${userId}`;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const Chat = ({ userId }) => {
  const [messages, setMessages] = useState([
    { from: "bot", text: "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。" },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef(null);
  const isInitializedRef = useRef(false);
  const lastVisitTimeRef = useRef(null);
  const shouldCreateNewOnMountRef = useRef(false);
  
  // 检查是否应该创建新对话
  // 当组件挂载时，如果localStorage中有当前对话数据，说明可能是从其他tab切换回来的
  // 此时应该保存当前对话并创建新对话
  useEffect(() => {
    if (userId) {
      const savedSession = getCurrentSession(userId);
      const savedSessionId = getCurrentSessionId(userId);
      // 如果有保存的对话且不是首次初始化，说明是从其他tab切换回来的
      if (savedSession && savedSessionId === savedSession.sessionId && !isInitializedRef.current) {
        const currentMessages = savedSession.messages.filter(msg => 
          msg.from !== "bot" || msg.text !== "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。"
        );
        // 如果当前对话有内容，标记需要创建新对话（保存当前对话）
        if (currentMessages.length > 0) {
          shouldCreateNewOnMountRef.current = true;
        }
      }
    }
  }, [userId]);

  // 生成新的session ID
  const generateNewSessionId = () => {
    return crypto.randomUUID ? crypto.randomUUID() : `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // 保存当前对话到历史记录
  const saveCurrentToHistory = () => {
    if (!userId || !currentSessionId) return;
    
    const currentMessages = messages.filter(msg => 
      msg.from !== "bot" || msg.text !== "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。"
    );
    
    // 如果只有初始消息，不保存
    if (currentMessages.length === 0) return;

    const history = getChatHistory(userId);
    const sessionName = getBeijingTime();
    
    // 检查是否已存在相同的sessionId（更新现有记录）
    const existingIndex = history.findIndex(h => h.sessionId === currentSessionId);
    if (existingIndex >= 0) {
      history[existingIndex] = {
        sessionId: currentSessionId,
        name: history[existingIndex].name, // 保持原有名称
        messages: currentMessages,
        updatedAt: Date.now(),
      };
    } else {
      // 添加新记录
      history.push({
        sessionId: currentSessionId,
        name: sessionName,
        messages: currentMessages,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    
    // 按更新时间倒序排列
    history.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    saveChatHistory(userId, history);
    setChatHistory(history);
  };

  // 创建新对话
  const createNewSession = () => {
    if (!userId) return;
    
    // 保存当前对话到历史记录
    saveCurrentToHistory();
    
    // 标记不创建新对话（因为我们是主动创建的）
    shouldCreateNewOnMountRef.current = false;
    
    // 创建新的session
    const newSessionId = generateNewSessionId();
    setCurrentSessionId(newSessionId);
    saveCurrentSessionId(userId, newSessionId);
    
    // 重置消息为初始消息
    const initialMessages = [
      { from: "bot", text: "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。" },
    ];
    setMessages(initialMessages);
    saveCurrentSession(userId, newSessionId, initialMessages);
  };

  // 加载历史对话
  const loadHistoryConversation = (sessionItem) => {
    if (!userId) return;
    
    // 保存当前对话到历史记录
    saveCurrentToHistory();
    
    // 标记不创建新对话
    shouldCreateNewOnMountRef.current = false;
    
    // 加载选中的历史对话
    setCurrentSessionId(sessionItem.sessionId);
    saveCurrentSessionId(userId, sessionItem.sessionId);
    setMessages(sessionItem.messages);
    saveCurrentSession(userId, sessionItem.sessionId, sessionItem.messages);
    setShowHistory(false);
  };

  // 初始化：检查是否需要创建新对话或恢复当前对话
  useEffect(() => {
    if (!userId) return;

    // 加载历史记录
    const history = getChatHistory(userId);
    setChatHistory(history);

    // 获取保存的当前对话
    const savedSession = getCurrentSession(userId);
    const savedSessionId = getCurrentSessionId(userId);
    const now = Date.now();
    
    // 检查是否是首次加载（通过检查是否有历史记录）
    const isFirstLoad = history.length === 0 && !isInitializedRef.current;
    
    // 如果标记需要创建新对话（从其他tab切换回来），保存当前对话并创建新对话
    if (shouldCreateNewOnMountRef.current) {
      // 先保存当前对话到历史（如果有且不是空的）
      if (savedSession && savedSessionId === savedSession.sessionId) {
        const currentMessages = savedSession.messages.filter(msg => 
          msg.from !== "bot" || msg.text !== "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。"
        );
        if (currentMessages.length > 0) {
          const history = getChatHistory(userId);
          const sessionName = getBeijingTime();
          const existingIndex = history.findIndex(h => h.sessionId === savedSessionId);
          if (existingIndex >= 0) {
            // 更新现有历史记录
            history[existingIndex] = {
              sessionId: savedSessionId,
              name: history[existingIndex].name,
              messages: currentMessages,
              updatedAt: now,
            };
          } else {
            // 添加新历史记录
            history.push({
              sessionId: savedSessionId,
              name: sessionName,
              messages: currentMessages,
              createdAt: now,
              updatedAt: now,
            });
          }
          history.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          saveChatHistory(userId, history);
          setChatHistory(history);
        }
      }
      
      // 创建新对话
      const newSessionId = generateNewSessionId();
      setCurrentSessionId(newSessionId);
      saveCurrentSessionId(userId, newSessionId);
      const initialMessages = [
        { from: "bot", text: "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。" },
      ];
      setMessages(initialMessages);
      saveCurrentSession(userId, newSessionId, initialMessages);
      
      shouldCreateNewOnMountRef.current = false;
    } else if (isFirstLoad && savedSession && savedSessionId === savedSession.sessionId) {
      // 首次加载时，恢复当前对话（如果有）
      setCurrentSessionId(savedSession.sessionId);
      setMessages(savedSession.messages || [
        { from: "bot", text: "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。" },
      ]);
    } else if (isFirstLoad) {
      // 首次加载且没有保存的对话，创建新对话
      const newSessionId = generateNewSessionId();
      setCurrentSessionId(newSessionId);
      saveCurrentSessionId(userId, newSessionId);
      const initialMessages = [
        { from: "bot", text: "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。" },
      ];
      setMessages(initialMessages);
      saveCurrentSession(userId, newSessionId, initialMessages);
    } else {
      // 非首次加载（组件重新挂载），保存当前对话并创建新对话
      if (savedSession && savedSessionId === savedSession.sessionId) {
        const currentMessages = savedSession.messages.filter(msg => 
          msg.from !== "bot" || msg.text !== "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。"
        );
        if (currentMessages.length > 0) {
          const history = getChatHistory(userId);
          const sessionName = getBeijingTime();
          const existingIndex = history.findIndex(h => h.sessionId === savedSessionId);
          if (existingIndex >= 0) {
            history[existingIndex] = {
              sessionId: savedSessionId,
              name: history[existingIndex].name,
              messages: currentMessages,
              updatedAt: now,
            };
          } else {
            history.push({
              sessionId: savedSessionId,
              name: sessionName,
              messages: currentMessages,
              createdAt: now,
              updatedAt: now,
            });
          }
          history.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
          saveChatHistory(userId, history);
          setChatHistory(history);
        }
      }
      
      // 创建新对话
      const newSessionId = generateNewSessionId();
      setCurrentSessionId(newSessionId);
      saveCurrentSessionId(userId, newSessionId);
      const initialMessages = [
        { from: "bot", text: "您好！我是您的血糖健康助手「糖小智」，随时可以向我提问或记录您的数据。" },
      ];
      setMessages(initialMessages);
      saveCurrentSession(userId, newSessionId, initialMessages);
    }

    // 更新访问时间
    lastVisitTimeRef.current = now;
    isInitializedRef.current = true;
  }, [userId]);

  // 当组件卸载时，保存当前对话
  useEffect(() => {
    return () => {
      if (userId && currentSessionId) {
        saveCurrentToHistory();
      }
    };
  }, [userId, currentSessionId]);

  // 监听消息变化，自动保存当前对话
  useEffect(() => {
    if (!userId || !currentSessionId) return;
    
    // 延迟保存，避免频繁写入
    const timeoutId = setTimeout(() => {
      saveCurrentSession(userId, currentSessionId, messages);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [messages, userId, currentSessionId]);

  // 组件卸载时保存当前对话到历史记录
  useEffect(() => {
    return () => {
      if (userId && currentSessionId) {
        saveCurrentToHistory();
      }
    };
  }, [userId, currentSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentSessionId) return;

    const userMessage = { from: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      const response = await authFetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: currentInput, session_id: currentSessionId }),
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          // 401错误由auth.js处理，这里不需要额外处理
          return;
        }
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(`服务器错误: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      const botMessage = { from: "bot", text: data.reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error fetching response:", error);
      const errorMessage = { 
        from: "bot", 
        text: `抱歉，服务暂时出现问题：${error.message}。请检查后端是否正常运行。` 
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-wrapper">
      {/* 历史对话侧边栏 */}
      <div className={`chat-history-sidebar ${showHistory ? "show" : ""}`}>
        <div className="chat-history-header">
          <h3>历史对话</h3>
          <button 
            className="close-history-btn"
            onClick={() => setShowHistory(false)}
            title="关闭"
          >
            ×
          </button>
        </div>
        <div className="chat-history-actions">
          <button 
            className="new-chat-btn"
            onClick={createNewSession}
            title="新建对话"
          >
            + 新建对话
          </button>
        </div>
        <div className="chat-history-list">
          {chatHistory.length === 0 ? (
            <div className="no-history">暂无历史对话</div>
          ) : (
            chatHistory.map((item) => (
              <div
                key={item.sessionId}
                className={`history-item ${currentSessionId === item.sessionId ? "active" : ""}`}
                onClick={() => loadHistoryConversation(item)}
                title={item.name}
              >
                <div className="history-item-name">{item.name}</div>
                <div className="history-item-preview">
                  {item.messages.length > 0 
                    ? item.messages[item.messages.length - 1].text.substring(0, 30) + "..."
                    : "空对话"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 主聊天区域 */}
      <div className="chat-container">
        <div className="chat-header">
          <button 
            className="history-toggle-btn"
            onClick={() => setShowHistory(!showHistory)}
            title="历史对话"
          >
            ☰
          </button>
          <h3 className="chat-title">对话助手</h3>
          <button 
            className="new-chat-header-btn"
            onClick={createNewSession}
            title="新建对话"
          >
            + 新建
          </button>
        </div>
        <div className="chat-window">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.from}`}>
              <p>{msg.text}</p>
            </div>
          ))}
          {isLoading && (
            <div className="message bot">
              <p>糖小智正在思考...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请输入您的问题或数据..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading}>
            发送
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
