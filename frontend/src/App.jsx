import React, { useState, useEffect, useRef } from "react";
import Chat from "./Chat.jsx";
import Profile from "./Profile.jsx";
import GlucoseRecords from "./GlucoseRecords.jsx";
import WeeklyReport from "./WeeklyReport.jsx";
import GlucoseVisualization from "./GlucoseVisualization.jsx";
import TrendAnalysis from "./TrendAnalysis.jsx";
import Reminders from "./Reminders.jsx";
import DataExport from "./DataExport.jsx";
import Login from "./Login.jsx";
import { isAuthenticated, getToken, clearToken, authFetch } from "./auth";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("chat");
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  // 确保初始状态：未认证（无论是否有token，都需要先登录）
  const [authenticated, setAuthenticated] = useState(false);
  const [theme, setTheme] = useState(() => {
    // 从localStorage读取主题，如果没有则检测系统主题
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatKey, setChatKey] = useState(0); // 用于强制重新挂载Chat组件
  const prevActiveTabRef = useRef("chat");

  // 应用主题
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 检测系统主题变化
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      if (!localStorage.getItem("theme")) {
        setTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // 初始化：无论是否有token，都先显示登录页面（强制要求登录）
  useEffect(() => {
    console.log("应用初始化：强制显示登录页面，等待用户登录");
    // 明确设置未认证状态
    setAuthenticated(false);
    setUserId(null);
    setUsername("");
    setLoading(false);
    // 注意：不进行任何自动认证检查，必须用户明确登录
  }, []); // 只在组件挂载时运行一次

  const handleLogin = async (data) => {
    console.log("handleLogin被调用，收到数据:", data);
    setLoading(true);
    
    try {
      // 检查数据是否有效
      if (!data || !data.access_token) {
        throw new Error("登录响应数据无效，缺少access_token");
      }
      
      // 保存token和用户信息
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("user_id", data.user_id.toString());
      localStorage.setItem("username", data.username);
      console.log("Token和用户信息已保存到localStorage");
      
      // 验证token是否有效（确保后续API调用能正常工作）
      console.log("开始验证token...");
      const response = await authFetch("/api/auth/me");
      console.log("Token验证响应状态:", response.status);
      
      if (response.ok) {
        const userData = await response.json();
        console.log("Token验证成功，用户数据:", userData);
        setUserId(userData.id);
        setUsername(userData.username || data.username);
        setAuthenticated(true);
        console.log("登录流程完成，已设置authenticated=true");
      } else {
        console.error("Token验证失败:", response.status);
        // 尝试获取错误信息
        let errorMessage = "Token验证失败";
        try {
          const errorText = await response.text();
          console.error("验证失败的错误信息:", errorText);
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || errorMessage;
          } catch (e) {
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          console.error("无法读取验证错误:", e);
        }
        
        // Token验证失败，清除token并保持登录页面
        clearToken();
        setAuthenticated(false);
        alert(`登录失败: ${errorMessage}`);
      }
    } catch (error) {
      console.error("登录处理错误:", error);
      // 登录失败，清除token并保持登录页面
      clearToken();
      setAuthenticated(false);
      const errorMessage = error.message || "登录失败，请重试";
      alert(`登录失败: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearToken();
    setAuthenticated(false);
    setUserId(null);
    setUsername("");
  };

  // 调试：输出当前状态
  useEffect(() => {
    console.log("当前认证状态:", {
      loading,
      authenticated,
      hasToken: !!getToken(),
      userId,
      username
    });
  }, [loading, authenticated, userId, username]);

  // 监听activeTab变化，当从其他tab切换到chat时，强制重新挂载Chat组件以创建新对话
  useEffect(() => {
    const prevTab = prevActiveTabRef.current;
    // 如果从非chat切换到chat，且已经认证，则强制重新挂载Chat组件
    // 这样会触发Chat组件重新初始化，保存当前对话并创建新对话
    if (prevTab !== "chat" && activeTab === "chat" && authenticated && userId) {
      // 延迟一下，确保之前的Chat组件已经卸载并保存了数据
      setTimeout(() => {
        setChatKey(prev => prev + 1);
      }, 100);
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab, authenticated, userId]);

  // 加载中：显示加载提示
  if (loading) {
    return (
      <div className="app-container" style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "var(--bg-color)"
      }}>
        <div className="loading">加载中...</div>
      </div>
    );
  }

  // 未认证：显示登录页面
  if (!authenticated) {
    console.log("显示登录页面");
    return <Login onLogin={handleLogin} />;
  }

  console.log("显示主页面");

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <div className="app-container">
      {/* 移动端菜单按钮 */}
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label="菜单"
      >
        ☰
      </button>

      <div className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-header">
          <h1>糖小智</h1>
          <p className="subtitle">血糖健康助手</p>
          {username && (
            <div className="user-info">
              <span>👤 {username}</span>
            </div>
          )}
        </div>
        <nav className="sidebar-nav">
          <button
            className={activeTab === "chat" ? "active" : ""}
            onClick={() => {
              setActiveTab("chat");
              setMobileMenuOpen(false);
            }}
          >
            💬 对话助手
          </button>
          <button
            className={activeTab === "profile" ? "active" : ""}
            onClick={() => {
              setActiveTab("profile");
              setMobileMenuOpen(false);
            }}
          >
            👤 个人档案
          </button>
          <button
            className={activeTab === "records" ? "active" : ""}
            onClick={() => {
              setActiveTab("records");
              setMobileMenuOpen(false);
            }}
          >
            📊 血糖记录
          </button>
          <button
            className={activeTab === "visualization" ? "active" : ""}
            onClick={() => {
              setActiveTab("visualization");
              setMobileMenuOpen(false);
            }}
          >
            📈 数据可视化
          </button>
          <button
            className={activeTab === "trend" ? "active" : ""}
            onClick={() => {
              setActiveTab("trend");
              setMobileMenuOpen(false);
            }}
          >
            📉 趋势分析
          </button>
          <button
            className={activeTab === "report" ? "active" : ""}
            onClick={() => {
              setActiveTab("report");
              setMobileMenuOpen(false);
            }}
          >
            📋 周报分析
          </button>
          <button
            className={activeTab === "reminders" ? "active" : ""}
            onClick={() => {
              setActiveTab("reminders");
              setMobileMenuOpen(false);
            }}
          >
            ⏰ 提醒管理
          </button>
          <button
            className={activeTab === "export" ? "active" : ""}
            onClick={() => {
              setActiveTab("export");
              setMobileMenuOpen(false);
            }}
          >
            💾 数据导出
          </button>
        </nav>
        <div className="sidebar-footer">
          <button
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === "light" ? "切换到暗色主题" : "切换到亮色主题"}
          >
            {theme === "light" ? "🌙" : "☀️"}
          </button>
          <button className="logout-btn" onClick={handleLogout}>
            退出登录
          </button>
        </div>
      </div>

      {/* 移动端遮罩 */}
      {mobileMenuOpen && (
        <div
          className="mobile-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="main-content">
        <div className="content-header">
          <h2>
            {activeTab === "chat" && "💬 对话助手"}
            {activeTab === "profile" && "👤 个人档案"}
            {activeTab === "records" && "📊 血糖记录"}
            {activeTab === "visualization" && "📈 数据可视化"}
            {activeTab === "trend" && "📉 趋势分析"}
            {activeTab === "report" && "📋 周报分析"}
            {activeTab === "reminders" && "⏰ 提醒管理"}
            {activeTab === "export" && "💾 数据导出"}
          </h2>
        </div>

        <div className="content-body">
          {activeTab === "chat" && <Chat key={chatKey} userId={userId} />}
          {activeTab === "profile" && <Profile userId={userId} />}
          {activeTab === "records" && <GlucoseRecords userId={userId} />}
          {activeTab === "visualization" && <GlucoseVisualization userId={userId} />}
          {activeTab === "trend" && <TrendAnalysis userId={userId} />}
          {activeTab === "report" && <WeeklyReport userId={userId} />}
          {activeTab === "reminders" && <Reminders userId={userId} />}
          {activeTab === "export" && <DataExport userId={userId} />}
        </div>
      </div>
    </div>
  );
}

export default App;
