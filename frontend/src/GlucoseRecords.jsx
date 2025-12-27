import React, { useState, useEffect } from "react";
import { authFetch } from "./auth";

const GlucoseRecords = ({ userId }) => {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userId) {
      fetchRecords();
    }
  }, [userId]);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await authFetch("/api/users/glucose-readings?limit=100");
      if (response.ok) {
        const data = await response.json();
        setReadings(data.readings || []);
      } else if (response.status === 401) {
        // 401错误由auth.js处理，这里不需要额外处理
        return;
      } else {
        setError("获取血糖记录失败");
      }
    } catch (error) {
      console.error("Error fetching records:", error);
      // 网络错误等，不设置error，避免干扰
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getContextLabel = (context) => {
    const labels = {
      fasting: "空腹",
      post_meal: "餐后",
      pre_meal: "餐前",
      before_exercise: "运动前",
      after_exercise: "运动后",
      random: "随机",
    };
    return labels[context] || context || "-";
  };

  const getMealTypeLabel = (mealType) => {
    const labels = {
      breakfast: "早餐",
      lunch: "午餐",
      dinner: "晚餐",
      snack: "加餐",
      other: "其他",
    };
    return labels[mealType] || mealType || "-";
  };

  const getRiskBadge = (riskLevel) => {
    if (!riskLevel) return null;
    const badges = {
      low: { class: "badge-success", text: "低风险" },
      normal: { class: "badge-success", text: "正常" },
      moderate: { class: "badge-warning", text: "中等风险" },
      high: { class: "badge-danger", text: "高风险" },
      critical: { class: "badge-danger", text: "紧急" },
    };
    const badge = badges[riskLevel] || { class: "badge-info", text: riskLevel };
    return <span className={`badge ${badge.class}`}>{badge.text}</span>;
  };

  const getValueColor = (value, riskLevel) => {
    if (!riskLevel) return "var(--text-color)";
    if (riskLevel === "critical" || riskLevel === "high") return "#ff6b6b";
    if (riskLevel === "moderate") return "var(--warning-color)";
    if (riskLevel === "normal" || riskLevel === "low") return "var(--success-color)";
    return "var(--text-color)";
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 className="card-title">血糖记录</h3>
          <button className="btn btn-primary" onClick={fetchRecords}>
            刷新
          </button>
        </div>

        {error && (
          <div style={{ 
            padding: "12px", 
            marginBottom: "16px", 
            borderRadius: "8px",
            background: "var(--error-bg, #f8d7da)",
            color: "var(--error-text, #721c24)"
          }}>
            {error}
          </div>
        )}

        {readings.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <p style={{ color: "var(--text-color)" }}>暂无血糖记录</p>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
              您可以在"对话助手"中记录血糖数据，例如："我刚测了血糖，7.8"
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>血糖值</th>
                  <th>测量类型</th>
                  <th>餐次</th>
                  <th>风险等级</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading) => (
                  <tr key={reading.id}>
                    <td>{formatDate(reading.timestamp)}</td>
                    <td style={{ 
                      fontWeight: "600",
                      color: getValueColor(reading.value, reading.risk_level),
                      fontSize: "16px"
                    }}>
                      {reading.value.toFixed(1)} {reading.unit}
                    </td>
                    <td>{getContextLabel(reading.context)}</td>
                    <td>{getMealTypeLabel(reading.meal_type)}</td>
                    <td>{getRiskBadge(reading.risk_level)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: "20px", padding: "16px", background: "var(--form-bg, #f8f9fa)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <h4 style={{ marginBottom: "12px", fontSize: "14px", color: "var(--text-color)", fontWeight: "600" }}>统计信息</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>总记录数</div>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-color)" }}>{readings.length}</div>
            </div>
            {readings.length > 0 && (
              <>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>平均值</div>
                  <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-color)" }}>
                    {(readings.reduce((sum, r) => sum + r.value, 0) / readings.length).toFixed(1)} mmol/L
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>最高值</div>
                  <div style={{ fontSize: "20px", fontWeight: "600", color: "#ff6b6b" }}>
                    {Math.max(...readings.map(r => r.value)).toFixed(1)} mmol/L
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>最低值</div>
                  <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--success-color)" }}>
                    {Math.min(...readings.map(r => r.value)).toFixed(1)} mmol/L
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlucoseRecords;

