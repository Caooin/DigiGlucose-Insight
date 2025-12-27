import React, { useState } from "react";
import "./Login.css";

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    verifyCode: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifyCodeLoading, setVerifyCodeLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);  // 倒计时秒数

  const handleChange = (e) => {
    const { name, value } = e.target;
    // 验证码输入框只允许数字，最多6位
    if (name === "verifyCode") {
      const numericValue = value.replace(/\D/g, "").slice(0, 6);
      setFormData({
        ...formData,
        [name]: numericValue,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
    setError("");
  };

  // 验证邮箱格式
  const validateEmail = (email) => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
  };

  // 获取验证码
  const handleGetVerifyCode = async () => {
    if (!formData.email) {
      setError("请先输入邮箱");
      return;
    }

    if (!validateEmail(formData.email)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    setVerifyCodeLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/send-verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "获取验证码失败");
      }

      const data = await response.json();
      // 开始60秒倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      alert(data.message || "验证码已发送至您的邮箱，请查收");
    } catch (error) {
      console.error("获取验证码错误:", error);
      setError(error.message || "获取验证码失败，请重试");
    } finally {
      setVerifyCodeLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        console.log("开始登录请求，用户名:", formData.username);
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            password: formData.password,
          }),
        });

        console.log("登录响应状态:", response.status, response.statusText);

        if (!response.ok) {
          let errorMessage = "登录失败，请重试";
          try {
            const errorData = await response.json();
            console.error("登录错误响应:", errorData);
            errorMessage = errorData.detail || errorMessage;
          } catch (e) {
            // 如果响应不是JSON格式，尝试读取文本
            try {
              const errorText = await response.text();
              console.error("登录错误文本:", errorText);
              errorMessage = errorText || errorMessage;
            } catch (e2) {
              console.error("无法读取错误响应:", e2);
              errorMessage = `登录失败 (状态码: ${response.status})`;
            }
          }
          throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log("登录成功，收到数据:", { 
          hasToken: !!data.access_token, 
          userId: data.user_id, 
          username: data.username 
        });
        // onLogin会保存token并设置状态
        onLogin(data);
      } else {
        // 注册
        // 前端基础校验
        if (!formData.email) {
          throw new Error("请输入邮箱");
        }

        if (!validateEmail(formData.email)) {
          throw new Error("请输入有效的邮箱地址");
        }

        if (!formData.verifyCode) {
          throw new Error("请输入验证码");
        }

        if (formData.verifyCode.length !== 6) {
          throw new Error("验证码为6位数字");
        }

        if (formData.password !== formData.confirmPassword) {
          throw new Error("两次输入的密码不一致");
        }

        if (formData.password.length < 8) {
          throw new Error("密码长度至少8位");
        }

        // 密码强度校验：必须包含大小写字母和数字
        const hasLower = /[a-z]/.test(formData.password);
        const hasUpper = /[A-Z]/.test(formData.password);
        const hasNumber = /\d/.test(formData.password);
        if (!hasLower || !hasUpper || !hasNumber) {
          throw new Error("密码必须包含大小写字母和数字");
        }

        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: formData.username,
            email: formData.email,
            password: formData.password,
            verify_code: formData.verifyCode,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "注册失败");
        }

        const data = await response.json();
        console.log("Register successful, calling onLogin");
        alert("注册成功！即将跳转到主页面");
        // onLogin会保存token并设置状态
        onLogin(data);
      }
    } catch (error) {
      console.error("Auth error:", error);
      // 显示详细的错误信息
      const errorMessage = error.message || "操作失败，请重试";
      console.error("错误详情:", errorMessage);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <h1>糖小智</h1>
          <p className="subtitle">血糖健康助手</p>
        </div>

        <div className="login-tabs">
          <button
            className={isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(true);
              setError("");
            }}
          >
            登录
          </button>
          <button
            className={!isLogin ? "active" : ""}
            onClick={() => {
              setIsLogin(false);
              setError("");
            }}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">{error}</div>
          )}

          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="请输入用户名"
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label>邮箱</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="请输入邮箱"
                />
              </div>
              <div className="form-group">
                <label>验证码</label>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input
                    type="text"
                    name="verifyCode"
                    value={formData.verifyCode}
                    onChange={handleChange}
                    required
                    placeholder="请输入6位验证码"
                    maxLength={6}
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={handleGetVerifyCode}
                    disabled={verifyCodeLoading || countdown > 0 || !formData.email}
                    className="verify-code-btn"
                  >
                    {countdown > 0 ? `剩余 ${countdown} 秒` : verifyCodeLoading ? "发送中..." : "获取验证码"}
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder={isLogin ? "请输入密码" : "请输入密码（至少8位，包含大小写字母和数字）"}
              minLength={isLogin ? undefined : 8}
            />
          </div>

          {!isLogin && (
            <div className="form-group">
              <label>确认密码</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="请再次输入密码"
                minLength={6}
              />
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "处理中..." : isLogin ? "登录" : "注册"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

