/**
 * 认证工具函数
 */

// 获取token
export const getToken = () => {
  return localStorage.getItem("token");
};

// 设置token
export const setToken = (token) => {
  localStorage.setItem("token", token);
};

// 清除token
export const clearToken = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user_id");
  localStorage.removeItem("username");
};

// 检查是否已登录
export const isAuthenticated = () => {
  return !!getToken();
};

// 获取认证请求头
export const getAuthHeaders = (skipContentType = false) => {
  const token = getToken();
  const headers = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  // 对于文件导出等请求，不设置Content-Type，让浏览器自动处理
  if (!skipContentType) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
};

// 带认证的fetch请求
export const authFetch = async (url, options = {}) => {
  const token = getToken();
  console.log("authFetch called:", { url, hasToken: !!token, token: token ? token.substring(0, 20) + "..." : null });
  
  // 检查是否是文件导出请求（通过URL判断）
  const isExportRequest = url.includes('/export/');
  
  const headers = {
    ...getAuthHeaders(isExportRequest),
    ...(options.headers || {}),
  };

  // 确保Authorization header正确设置
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  // 对于导出请求，移除Content-Type，让浏览器自动处理
  if (isExportRequest && headers["Content-Type"] === "application/json") {
    delete headers["Content-Type"];
  }

  console.log("Request headers:", { ...headers, Authorization: headers.Authorization ? "Bearer ***" : "None" });

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    console.log("Response status:", response.status);

    // 如果token过期或无效，清除token（但不立即reload，让App组件处理）
    if (response.status === 401) {
      console.error("401 Unauthorized - clearing token");
      clearToken();
      // 触发自定义事件，通知App组件
      window.dispatchEvent(new CustomEvent('auth-failed'));
    }

    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
};

