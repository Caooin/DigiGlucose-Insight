import React, { useState, useEffect } from "react";
import { authFetch } from "./auth";

const WeeklyReport = ({ userId }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (userId) {
      fetchReport();
    }
  }, [userId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await authFetch("/api/users/weekly-report");
      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else if (response.status === 401) {
        // 401错误由auth.js处理，这里不需要额外处理
        return;
      } else {
        setError("获取周报失败");
      }
    } catch (error) {
      console.error("Error fetching report:", error);
      // 网络错误等，不设置error，避免干扰
    } finally {
      setLoading(false);
    }
  };

  const formatContent = (content) => {
    if (!content) return "";
    // 将文本按行分割，处理标题和列表
    const lines = content.split("\n");
    return lines.map((line, index) => {
      if (line.startsWith("【") && line.endsWith("】")) {
        return (
          <h4 key={index} style={{ marginTop: "20px", marginBottom: "12px", color: "var(--text-color)", fontSize: "16px", fontWeight: "600" }}>
            {line}
          </h4>
        );
      }
      if (line.startsWith("•") || line.startsWith("-")) {
        return (
          <div key={index} style={{ marginLeft: "20px", marginBottom: "8px", color: "var(--text-color)", lineHeight: "1.6" }}>
            {line}
          </div>
        );
      }
      if (line.trim() === "") {
        return <br key={index} />;
      }
      return (
        <p key={index} style={{ marginBottom: "8px", color: "var(--text-color)", lineHeight: "1.6" }}>
          {line}
        </p>
      );
    });
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
          <h3 className="card-title">本周血糖管理报告</h3>
          <button className="btn btn-primary" onClick={fetchReport}>
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

        {!report || !report.success ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <p style={{ color: "var(--text-color)" }}>{report?.content || "暂无周报数据"}</p>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
              请先记录一些血糖数据，然后查看周报分析
            </p>
          </div>
        ) : (
          <div style={{ lineHeight: "1.8" }}>
            {formatContent(report.content)}
          </div>
        )}
      </div>

      {report && report.success && (
        <div className="card" style={{ marginTop: "20px" }}>
          <h4 className="card-title">报告详情</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
            {report.total_measurements !== undefined && (
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>总测量次数</div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-color)" }}>
                  {report.total_measurements}
                </div>
              </div>
            )}
            {report.average_glucose !== null && report.average_glucose !== undefined && (
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>平均血糖</div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: "var(--text-color)" }}>
                  {typeof report.average_glucose === 'number' ? report.average_glucose.toFixed(1) : report.average_glucose} mmol/L
                </div>
              </div>
            )}
            {report.fasting_average !== null && report.fasting_average !== undefined && (
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>空腹平均</div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: "var(--primary-color, #58a6ff)" }}>
                  {typeof report.fasting_average === 'number' ? report.fasting_average.toFixed(1) : report.fasting_average} mmol/L
                </div>
              </div>
            )}
            {report.post_meal_average !== null && report.post_meal_average !== undefined && (
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>餐后平均</div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: "var(--warning-color, #f0883e)" }}>
                  {typeof report.post_meal_average === 'number' ? report.post_meal_average.toFixed(1) : report.post_meal_average} mmol/L
                </div>
              </div>
            )}
            {report.target_compliance_rate !== null && report.target_compliance_rate !== undefined && (
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>目标达标率</div>
                <div style={{ fontSize: "24px", fontWeight: "600", color: report.target_compliance_rate >= 80 ? "var(--success-color, #3fb950)" : "var(--warning-color, #f0883e)" }}>
                  {typeof report.target_compliance_rate === 'number' ? report.target_compliance_rate.toFixed(1) : report.target_compliance_rate}%
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;

