import React, { useState, useEffect } from "react";
import ReactECharts from "echarts-for-react";
import { authFetch } from "./auth";

// 获取当前主题
const getCurrentTheme = () => {
  return document.documentElement.getAttribute("data-theme") || "light";
};

// 获取图表主题配置
const getChartTheme = () => {
  const theme = getCurrentTheme();
  if (theme === "dark") {
    return {
      textColor: "#f0f6fc",
      textSecondary: "#c9d1d9",
      gridColor: "#30363d",
      axisLineColor: "#30363d",
      splitLineColor: "#21262d",
    };
  }
  return {
    textColor: "#2c3e50",
    textSecondary: "#666",
    gridColor: "#e5e5e5",
    axisLineColor: "#ddd",
    splitLineColor: "#f0f0f0",
  };
};

const TrendAnalysis = ({ userId }) => {
  const [days, setDays] = useState(7);
  const [context, setContext] = useState("");
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartTheme, setChartTheme] = useState(getChartTheme());

  // 监听主题变化
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setChartTheme(getChartTheme());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchTrendData();
    }
  }, [userId, days, context]);

  const fetchTrendData = async () => {
    try {
      setLoading(true);
      const response = await authFetch(
        `/api/users/glucose-trend?days=${days}${context ? `&context=${context}` : ""}`
      );
      if (response.ok) {
        const data = await response.json();
        setTrendData(data);
      }
    } catch (error) {
      console.error("Error fetching trend data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendChartOption = () => {
    if (!trendData || !trendData.chart_data.dates.length) return {};

    const dates = trendData.chart_data.dates.map((d) => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    // 准备异常点数据
    const anomalyIndices = trendData.chart_data.anomalies.map((a) => a.index);
    const anomalyData = trendData.chart_data.values.map((v, i) =>
      anomalyIndices.includes(i) ? v : null
    );

    const theme = getChartTheme();
    const isDark = getCurrentTheme() === "dark";
    
    return {
      backgroundColor: "transparent",
      title: {
        text: "血糖趋势分析",
        left: "center",
        textStyle: { fontSize: 18, fontWeight: "bold", color: theme.textColor },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark ? "#161b22" : "#fff",
        borderColor: theme.gridColor,
        textStyle: { color: theme.textColor },
        formatter: (params) => {
          let result = params[0].name + "<br/>";
          params.forEach((param) => {
            result += `${param.seriesName}: ${param.value} mmol/L<br/>`;
          });
          return result;
        },
      },
      legend: {
        data: ["血糖值", "趋势线", "异常值"],
        bottom: 0,
        textStyle: { color: theme.textColor },
      },
      xAxis: {
        type: "category",
        data: dates,
        boundaryGap: false,
        axisLine: { lineStyle: { color: theme.axisLineColor } },
        axisLabel: { color: theme.textSecondary },
      },
      yAxis: {
        type: "value",
        name: "血糖值 (mmol/L)",
        nameTextStyle: { color: theme.textSecondary },
        axisLine: { lineStyle: { color: theme.axisLineColor } },
        axisLabel: { color: theme.textSecondary },
        splitLine: { lineStyle: { color: theme.splitLineColor } },
      },
      series: [
        {
          name: "血糖值",
          type: "line",
          data: trendData.chart_data.values,
          smooth: true,
          itemStyle: { color: isDark ? "#58a6ff" : "#3498db" },
          lineStyle: { width: 2 },
        },
        {
          name: "趋势线",
          type: "line",
          data: trendData.chart_data.trend_line,
          smooth: true,
          itemStyle: { color: isDark ? "#ff6b6b" : "#e74c3c" },
          lineStyle: { type: "dashed", width: 2 },
          symbol: "none",
        },
        {
          name: "异常值",
          type: "scatter",
          data: anomalyData,
          itemStyle: { 
            color: isDark ? "#ff6b6b" : "#e74c3c", 
            borderColor: isDark ? "#161b22" : "#fff", 
            borderWidth: 2 
          },
          symbolSize: 12,
        },
      ],
      grid: {
        left: "10%",
        right: "10%",
        bottom: "20%",
        borderColor: theme.gridColor,
      },
    };
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  if (!trendData || trendData.trend === "no_data") {
    return (
      <div className="card">
        <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
          <p style={{ color: "var(--text-color)" }}>暂无数据</p>
        </div>
      </div>
    );
  }

  const getTrendIcon = () => {
    if (trendData.trend_direction === "up") return "📈";
    if (trendData.trend_direction === "down") return "📉";
    return "➡️";
  };

  const getTrendColor = () => {
    const isDark = getCurrentTheme() === "dark";
    if (trendData.trend_direction === "up") return "#ff6b6b";
    if (trendData.trend_direction === "down") return isDark ? "#3fb950" : "#27ae60";
    return isDark ? "#58a6ff" : "#3498db";
  };

  return (
    <div>
      {/* 控制面板 */}
      <div className="card">
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label className="form-label">分析周期：</label>
            <select
              className="form-select"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ width: "120px" }}
            >
              <option value={7}>短期 (7天)</option>
              <option value={30}>中期 (30天)</option>
              <option value={90}>长期 (90天)</option>
            </select>
          </div>
          <div>
            <label className="form-label">血糖类型：</label>
            <select
              className="form-select"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              style={{ width: "150px" }}
            >
              <option value="">全部</option>
              <option value="fasting">空腹</option>
              <option value="post_meal">餐后</option>
            </select>
          </div>
        </div>
      </div>

      {/* 趋势图表 */}
      <div className="card">
        <ReactECharts
          key={`trend-chart-${chartTheme.textColor}`}
          option={getTrendChartOption()}
          style={{ height: "400px", width: "100%" }}
        />
      </div>

      {/* 分析解读 */}
      <div className="card">
        <h3 className="card-title">趋势分析</h3>
        <div
          style={{
            padding: "20px",
            background: "var(--form-bg, #f8f9fa)",
            borderRadius: "8px",
            marginBottom: "20px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
            <span style={{ fontSize: "24px" }}>{getTrendIcon()}</span>
            <div>
              <div style={{ fontSize: "18px", fontWeight: "600", color: getTrendColor() }}>
                趋势：{trendData.trend_text}
              </div>
              <div style={{ fontSize: "14px", color: "var(--text-color)", marginTop: "4px" }}>
                {trendData.interpretation}
              </div>
            </div>
          </div>
        </div>

        {/* 统计数据 */}
        {trendData.stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>平均值</div>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-color)" }}>
                {trendData.stats.average} mmol/L
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>标准差</div>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-color)" }}>
                {trendData.stats.std_dev} mmol/L
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>最高值</div>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "#ff6b6b" }}>
                {trendData.stats.max} mmol/L
              </div>
            </div>
            <div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px" }}>最低值</div>
              <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--success-color)" }}>
                {trendData.stats.min} mmol/L
              </div>
            </div>
          </div>
        )}

        {/* 异常值列表 */}
        {trendData.chart_data.anomalies && trendData.chart_data.anomalies.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <h4 style={{ fontSize: "14px", marginBottom: "12px", color: "var(--text-color)", fontWeight: "600" }}>异常值提醒</h4>
            <div style={{ 
              background: getCurrentTheme() === "dark" ? "rgba(255, 107, 107, 0.1)" : "#fff3cd", 
              padding: "12px", 
              borderRadius: "8px",
              border: `1px solid ${getCurrentTheme() === "dark" ? "rgba(255, 107, 107, 0.3)" : "#ffc107"}`
            }}>
              {trendData.chart_data.anomalies.map((anomaly, index) => (
                <div key={index} style={{ marginBottom: "8px", fontSize: "14px" }}>
                  <span style={{ color: "#ff6b6b", fontWeight: "600" }}>
                    {new Date(anomaly.date).toLocaleString("zh-CN")}
                  </span>
                  {" - "}
                  <span style={{ color: "var(--text-color)" }}>血糖值: {anomaly.value} mmol/L</span>
                  {" - "}
                  <span style={{ color: getCurrentTheme() === "dark" ? "#f0883e" : "#856404" }}>{anomaly.reason}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendAnalysis;

