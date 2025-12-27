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

const GlucoseVisualization = ({ userId }) => {
  const [days, setDays] = useState(7);
  const [context, setContext] = useState("");
  const [chartData, setChartData] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [dietData, setDietData] = useState(null);
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
      fetchData();
    }
  }, [userId, days, context]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 获取血糖可视化数据
      const response = await authFetch(
        `/api/users/glucose-visualization?days=${days}${context ? `&context=${context}` : ""}`
      );
      if (response.ok) {
        const data = await response.json();
        setChartData(data);
      }

      // 获取对比数据
      const comparisonResponse = await authFetch(
        `/api/users/glucose-comparison?days=${days}`
      );
      if (comparisonResponse.ok) {
        const comparison = await comparisonResponse.json();
        setComparisonData(comparison);
      }

      // 获取饮食数据
      const dietResponse = await authFetch(
        `/api/users/diet-visualization?days=${days}`
      );
      if (dietResponse.ok) {
        const diet = await dietResponse.json();
        setDietData(diet);
      }
    } catch (error) {
      console.error("Error fetching visualization data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 折线图配置
  const getLineChartOption = () => {
    if (!chartData) return {};

    const dates = chartData.chart_data.dates.map((d) => {
      const date = new Date(d);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });

    const theme = getChartTheme();
    return {
      backgroundColor: "transparent",
      title: {
        text: "血糖变化趋势",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold", color: theme.textColor },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: getCurrentTheme() === "dark" ? "#161b22" : "#fff",
        borderColor: theme.gridColor,
        textStyle: { color: theme.textColor },
        formatter: (params) => {
          const param = params[0];
          const index = param.dataIndex;
          const date = new Date(chartData.chart_data.dates[index]);
          const context = chartData.chart_data.contexts[index] || "未知";
          const mealType = chartData.chart_data.meal_types[index] || "";
          return `${date.toLocaleString("zh-CN")}<br/>${context}${mealType ? ` - ${mealType}` : ""}<br/>血糖: ${param.value} mmol/L`;
        },
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
        min: (value) => Math.max(0, value.min - 1),
        axisLine: { lineStyle: { color: theme.axisLineColor } },
        axisLabel: { color: theme.textSecondary },
        splitLine: { lineStyle: { color: theme.splitLineColor } },
      },
      series: [
        {
          name: "血糖值",
          type: "line",
          data: chartData.chart_data.values,
          smooth: true,
          itemStyle: {
            color: getCurrentTheme() === "dark" ? "#58a6ff" : "#3498db",
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: getCurrentTheme() === "dark" 
                ? [
                    { offset: 0, color: "rgba(88, 166, 255, 0.3)" },
                    { offset: 1, color: "rgba(88, 166, 255, 0.1)" },
                  ]
                : [
                    { offset: 0, color: "rgba(52, 152, 219, 0.3)" },
                    { offset: 1, color: "rgba(52, 152, 219, 0.1)" },
                  ],
            },
          },
        },
      ],
      grid: {
        left: "10%",
        right: "10%",
        bottom: "15%",
        borderColor: theme.gridColor,
      },
    };
  };

  // 柱状图配置（对比图）
  const getComparisonChartOption = () => {
    if (!comparisonData) return {};
    const theme = getChartTheme();

    return {
      backgroundColor: "transparent",
      title: {
        text: "空腹 vs 餐后血糖对比",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold", color: theme.textColor },
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: getCurrentTheme() === "dark" ? "#161b22" : "#fff",
        borderColor: theme.gridColor,
        textStyle: { color: theme.textColor },
      },
      legend: {
        data: ["空腹平均", "餐后平均"],
        bottom: 0,
        textStyle: { color: theme.textColor },
      },
      xAxis: {
        type: "category",
        data: comparisonData.comparison_data.dates.map((d) => {
          const date = new Date(d);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        }),
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
          name: "空腹平均",
          type: "bar",
          data: comparisonData.comparison_data.fasting_avg,
          itemStyle: { color: getCurrentTheme() === "dark" ? "#3fb950" : "#27ae60" },
        },
        {
          name: "餐后平均",
          type: "bar",
          data: comparisonData.comparison_data.post_meal_avg,
          itemStyle: { color: getCurrentTheme() === "dark" ? "#ff6b6b" : "#e74c3c" },
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

  // 饼图配置（饮食数据）
  const getDietChartOption = () => {
    if (!dietData || !dietData.diet_data.total) return {};
    const theme = getChartTheme();
    const isDark = getCurrentTheme() === "dark";

    return {
      backgroundColor: "transparent",
      title: {
        text: "饮食GI值分布",
        left: "center",
        textStyle: { fontSize: 16, fontWeight: "bold", color: theme.textColor },
      },
      tooltip: {
        trigger: "item",
        backgroundColor: isDark ? "#161b22" : "#fff",
        borderColor: theme.gridColor,
        textStyle: { color: theme.textColor },
        formatter: "{a} <br/>{b}: {c} ({d}%)",
      },
      legend: {
        orient: "vertical",
        left: "left",
        bottom: "center",
        textStyle: { color: theme.textColor },
      },
      series: [
        {
          name: "GI值分布",
          type: "pie",
          radius: ["40%", "70%"],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: isDark ? "#161b22" : "#fff",
            borderWidth: 2,
          },
          label: {
            show: true,
            formatter: "{b}: {c}\n({d}%)",
            color: theme.textColor,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: "bold",
            },
          },
          data: [
            {
              value: dietData.diet_data.high_gi,
              name: "高GI",
              itemStyle: { color: isDark ? "#ff6b6b" : "#e74c3c" },
            },
            {
              value: dietData.diet_data.low_gi,
              name: "低GI",
              itemStyle: { color: isDark ? "#3fb950" : "#27ae60" },
            },
            {
              value: dietData.diet_data.unknown,
              name: "未知",
              itemStyle: { color: isDark ? "#8b949e" : "#95a5a6" },
            },
          ],
        },
      ],
    };
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
      {/* 控制面板 */}
      <div className="card">
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <label className="form-label">时间范围：</label>
            <select
              className="form-select"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              style={{ width: "120px" }}
            >
              <option value={7}>近7天</option>
              <option value={14}>近14天</option>
              <option value={30}>近30天</option>
              <option value={90}>近90天</option>
            </select>
          </div>
          <div>
            <label className="form-label">测量类型：</label>
            <select
              className="form-select"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              style={{ width: "150px" }}
            >
              <option value="">全部</option>
              <option value="fasting">空腹</option>
              <option value="post_meal">餐后</option>
              <option value="pre_meal">餐前</option>
              <option value="random">随机</option>
            </select>
          </div>
        </div>
      </div>

      {/* 折线图 */}
      {chartData && (
        <div className="card">
          <ReactECharts
            key={`line-chart-${chartTheme.textColor}`}
            option={getLineChartOption()}
            style={{ height: "400px", width: "100%" }}
          />
          {chartData.stats && (
            <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "16px" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>平均值</div>
                <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-color)" }}>
                  {chartData.stats.average.toFixed(1)} mmol/L
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>最高值</div>
                <div style={{ fontSize: "20px", fontWeight: "600", color: "#ff6b6b" }}>
                  {chartData.stats.max.toFixed(1)} mmol/L
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>最低值</div>
                <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--success-color)" }}>
                  {chartData.stats.min.toFixed(1)} mmol/L
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>记录数</div>
                <div style={{ fontSize: "20px", fontWeight: "600", color: "var(--text-color)" }}>
                  {chartData.stats.count}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 对比图 */}
      {comparisonData && (
        <div className="card">
          <ReactECharts
            key={`comparison-chart-${chartTheme.textColor}`}
            option={getComparisonChartOption()}
            style={{ height: "400px", width: "100%" }}
          />
          {comparisonData.stats && (
            <div style={{ marginTop: "20px", display: "flex", gap: "32px", justifyContent: "center" }}>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>空腹平均</div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "var(--success-color)" }}>
                  {comparisonData.stats.fasting.average.toFixed(1)} mmol/L
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  ({comparisonData.stats.fasting.count}条记录)
                </div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>餐后平均</div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#ff6b6b" }}>
                  {comparisonData.stats.post_meal.average.toFixed(1)} mmol/L
                </div>
                <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  ({comparisonData.stats.post_meal.count}条记录)
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 饮食饼图 */}
      {dietData && dietData.diet_data.total > 0 && (
        <div className="card">
          <ReactECharts
            key={`diet-chart-${chartTheme.textColor}`}
            option={getDietChartOption()}
            style={{ height: "400px", width: "100%" }}
          />
        </div>
      )}
    </div>
  );
};

export default GlucoseVisualization;

