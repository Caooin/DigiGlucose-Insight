import React, { useState } from "react";
import { authFetch } from "./auth";

const DataExport = ({ userId }) => {
  const [days, setDays] = useState(90);
  const [exportType, setExportType] = useState("glucose");
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format) => {
    try {
      setExporting(true);
      console.log(`开始导出${format}格式，时间范围：${days}天`);
      
      const response = await authFetch(
        `/api/users/export/${format}?days=${days}`,
        { method: "GET" }
      );

      console.log("导出响应状态:", response.status, response.statusText);
      console.log("响应头:", Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        // 获取文件名
        const contentDisposition = response.headers.get("Content-Disposition");
        let filename = `DigiGlucose_血糖数据_${new Date().toISOString().split("T")[0]}.${format}`;
        
        if (contentDisposition) {
          console.log("Content-Disposition:", contentDisposition);
          // 尝试从Content-Disposition中提取文件名
          // 支持格式: attachment; filename*=UTF-8''encoded_filename
          const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
          if (filenameMatch) {
            try {
              filename = decodeURIComponent(filenameMatch[1]);
              console.log("从UTF-8编码提取文件名:", filename);
            } catch (e) {
              console.warn("UTF-8文件名解码失败:", e);
              // 如果解码失败，尝试其他格式
              const altMatch = contentDisposition.match(/filename="?([^";]+)"?/);
              if (altMatch) {
                filename = altMatch[1];
                console.log("从标准格式提取文件名:", filename);
              }
            }
          } else {
            // 尝试标准格式
            const altMatch = contentDisposition.match(/filename="?([^";]+)"?/);
            if (altMatch) {
              filename = altMatch[1];
              console.log("从标准格式提取文件名:", filename);
            }
          }
        }

        // 获取文件内容
        console.log("开始获取blob...");
        const blob = await response.blob();
        console.log("Blob获取成功，大小:", blob.size, "类型:", blob.type);
        
        // 检查blob是否为空或错误
        if (blob.size === 0) {
          throw new Error("导出的文件为空，请检查是否有数据");
        }
        
        // 检查是否是错误响应（JSON格式）
        if (blob.type === "application/json" || blob.type.startsWith("application/json")) {
          const text = await blob.text();
          console.error("收到JSON错误响应:", text);
          try {
            const errorData = JSON.parse(text);
            throw new Error(errorData.detail || "导出失败");
          } catch (parseError) {
            throw new Error(`导出失败: ${text}`);
          }
        }
        
        console.log("创建下载链接...");
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        console.log("导出成功！文件名:", filename);
        alert("导出成功！");
      } else {
        // 尝试获取错误信息
        let errorMessage = `导出失败 (状态码: ${response.status})`;
        try {
          const errorText = await response.text();
          console.error("错误响应内容:", errorText);
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.detail || errorMessage;
          } catch (e) {
            errorMessage = errorText || errorMessage;
          }
        } catch (e) {
          console.error("无法读取错误响应:", e);
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error("导出错误详情:", error);
      const errorMessage = error.message || "导出失败，请重试";
      alert(`导出失败: ${errorMessage}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h3 className="card-title">数据导出</h3>
        <p style={{ color: "var(--text-secondary)", marginBottom: "24px" }}>
          导出您的血糖数据，支持多种格式，方便存档和分享给医生查看。
        </p>

        <div className="form-group">
          <label className="form-label">时间范围</label>
          <select
            className="form-select"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>近7天</option>
            <option value={14}>近14天</option>
            <option value={30}>近30天</option>
            <option value={90}>近3个月</option>
            <option value={180}>近6个月</option>
            <option value={365}>近1年</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">数据类型</label>
          <select
            className="form-select"
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
          >
            <option value="glucose">血糖数据</option>
            <option value="all">全部数据（待实现）</option>
          </select>
        </div>

        <div style={{ marginTop: "24px" }}>
          <h4 style={{ fontSize: "16px", marginBottom: "16px", color: "var(--text-color)", fontWeight: "600" }}>
            选择导出格式
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {/* CSV格式 */}
            <div
              style={{
                padding: "20px",
                border: "2px solid var(--border-color)",
                borderRadius: "8px",
                textAlign: "center",
                cursor: exporting ? "not-allowed" : "pointer",
                opacity: exporting ? 0.6 : 1,
                transition: "all 0.2s",
              }}
              onClick={() => !exporting && handleExport("csv")}
              onMouseEnter={(e) => {
                if (!exporting) e.currentTarget.style.borderColor = "var(--primary-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📄</div>
              <div style={{ fontWeight: "600", marginBottom: "4px", color: "var(--text-color)" }}>CSV格式</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                易编辑，Excel兼容
              </div>
            </div>

            {/* Excel格式 */}
            <div
              style={{
                padding: "20px",
                border: "2px solid var(--border-color)",
                borderRadius: "8px",
                textAlign: "center",
                cursor: exporting ? "not-allowed" : "pointer",
                opacity: exporting ? 0.6 : 1,
                transition: "all 0.2s",
              }}
              onClick={() => !exporting && handleExport("excel")}
              onMouseEnter={(e) => {
                if (!exporting) e.currentTarget.style.borderColor = "var(--success-color)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📊</div>
              <div style={{ fontWeight: "600", marginBottom: "4px", color: "var(--text-color)" }}>Excel格式</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                带格式，美观易读
              </div>
            </div>

            {/* PDF格式 */}
            <div
              style={{
                padding: "20px",
                border: "2px solid var(--border-color)",
                borderRadius: "8px",
                textAlign: "center",
                cursor: exporting ? "not-allowed" : "pointer",
                opacity: exporting ? 0.6 : 1,
                transition: "all 0.2s",
              }}
              onClick={() => !exporting && handleExport("pdf")}
              onMouseEnter={(e) => {
                if (!exporting) e.currentTarget.style.borderColor = "#ff6b6b";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-color)";
              }}
            >
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>📋</div>
              <div style={{ fontWeight: "600", marginBottom: "4px", color: "var(--text-color)" }}>PDF格式</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                报告形式，不可编辑
              </div>
            </div>
          </div>
        </div>

        {exporting && (
          <div style={{ marginTop: "20px", textAlign: "center", color: "var(--primary-color)" }}>
            <div className="loading">正在导出，请稍候...</div>
          </div>
        )}

        <div style={{ marginTop: "24px", padding: "16px", background: "var(--form-bg, #f8f9fa)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
          <h4 style={{ fontSize: "14px", marginBottom: "8px", color: "var(--text-color)", fontWeight: "600" }}>提示</h4>
          <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "var(--text-secondary)" }}>
            <li>CSV格式适合在Excel中打开和编辑</li>
            <li>Excel格式包含样式和格式，更适合打印</li>
            <li>PDF格式适合分享给医生或存档</li>
            <li>单次导出数据量较大时可能需要较长时间，请耐心等待</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataExport;

