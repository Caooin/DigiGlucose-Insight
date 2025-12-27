import React, { useState, useEffect } from "react";
import { authFetch } from "./auth";

const Profile = ({ userId }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/users/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData(data);
      } else if (response.status === 401) {
        // 401错误由auth.js处理，这里不需要额外处理
        return;
      } else {
        setMessage("获取档案信息失败");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // 网络错误等，不设置message，避免干扰
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage("");
      const response = await authFetch("/api/users/profile", {
        method: "PUT",
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setMessage("更新成功！");
        setEditing(false);
        fetchProfile();
      } else {
        setMessage("更新失败，请重试");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage("更新失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 className="card-title">个人档案</h3>
        {!editing ? (
          <button className="btn btn-primary" onClick={() => setEditing(true)}>
            编辑档案
          </button>
        ) : (
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn btn-secondary" onClick={() => { setEditing(false); setFormData(profile); }}>
              取消
            </button>
            <button className="btn btn-success" onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        )}
      </div>

      {message && (
        <div style={{ 
          padding: "12px", 
          marginBottom: "16px", 
          borderRadius: "8px",
          background: message.includes("成功") ? "var(--success-bg, #d4edda)" : "var(--error-bg, #f8d7da)",
          color: message.includes("成功") ? "var(--success-text, #155724)" : "var(--error-text, #721c24)"
        }}>
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <div className="form-group">
          <label className="form-label">用户名</label>
          <input
            type="text"
            className="form-input"
            value={formData.username || ""}
            disabled
            style={{ background: "var(--input-disabled-bg, #f5f5f5)", color: "var(--text-secondary)" }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">邮箱</label>
          {editing ? (
            <input
              type="email"
              className="form-input"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="请输入邮箱"
            />
          ) : (
            <div style={{ padding: "10px 12px", color: formData.email ? "var(--text-color)" : "var(--text-secondary)" }}>
              {formData.email || "未设置"}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">年龄</label>
          {editing ? (
            <input
              type="number"
              className="form-input"
              value={formData.age || ""}
              onChange={(e) => handleChange("age", e.target.value ? parseInt(e.target.value) : null)}
              placeholder="请输入年龄"
            />
          ) : (
            <div style={{ padding: "10px 12px", color: formData.age ? "var(--text-color)" : "var(--text-secondary)" }}>
              {formData.age ? `${formData.age} 岁` : "未设置"}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">性别</label>
          {editing ? (
            <select
              className="form-select"
              value={formData.gender || ""}
              onChange={(e) => handleChange("gender", e.target.value)}
            >
              <option value="">请选择</option>
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          ) : (
            <div style={{ padding: "10px 12px", color: formData.gender ? "var(--text-color)" : "var(--text-secondary)" }}>
              {formData.gender === "male" ? "男" : formData.gender === "female" ? "女" : formData.gender === "other" ? "其他" : "未设置"}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">诊断类型</label>
          {editing ? (
            <select
              className="form-select"
              value={formData.diagnosis_type || ""}
              onChange={(e) => handleChange("diagnosis_type", e.target.value)}
            >
              <option value="">请选择</option>
              <option value="normal">正常</option>
              <option value="prediabetes">糖尿病前期</option>
              <option value="diabetes_type1">1型糖尿病</option>
              <option value="diabetes_type2">2型糖尿病</option>
              <option value="gestational">妊娠糖尿病</option>
            </select>
          ) : (
            <div style={{ padding: "10px 12px", color: formData.diagnosis_type ? "var(--text-color)" : "var(--text-secondary)" }}>
              {formData.diagnosis_type === "normal" ? "正常" :
               formData.diagnosis_type === "prediabetes" ? "糖尿病前期" :
               formData.diagnosis_type === "diabetes_type1" ? "1型糖尿病" :
               formData.diagnosis_type === "diabetes_type2" ? "2型糖尿病" :
               formData.diagnosis_type === "gestational" ? "妊娠糖尿病" : "未设置"}
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "2px solid var(--border-color)" }}>
        <h4 style={{ marginBottom: "20px", color: "var(--text-color)", fontWeight: "600" }}>血糖目标区间</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "20px" }}>
          <div className="form-group">
            <label className="form-label">空腹目标最小值 (mmol/L)</label>
            {editing ? (
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={formData.fasting_target_min || ""}
                onChange={(e) => handleChange("fasting_target_min", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="例如: 4.4"
              />
            ) : (
              <div style={{ padding: "10px 12px", color: formData.fasting_target_min ? "var(--text-color)" : "var(--text-secondary)" }}>
                {formData.fasting_target_min ? `${formData.fasting_target_min} mmol/L` : "未设置（默认: 4.4）"}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">空腹目标最大值 (mmol/L)</label>
            {editing ? (
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={formData.fasting_target_max || ""}
                onChange={(e) => handleChange("fasting_target_max", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="例如: 7.2"
              />
            ) : (
              <div style={{ padding: "10px 12px", color: formData.fasting_target_max ? "var(--text-color)" : "var(--text-secondary)" }}>
                {formData.fasting_target_max ? `${formData.fasting_target_max} mmol/L` : "未设置（默认: 7.2）"}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">餐后2h目标最大值 (mmol/L)</label>
            {editing ? (
              <input
                type="number"
                step="0.1"
                className="form-input"
                value={formData.post_meal_target_max || ""}
                onChange={(e) => handleChange("post_meal_target_max", e.target.value ? parseFloat(e.target.value) : null)}
                placeholder="例如: 10.0"
              />
            ) : (
              <div style={{ padding: "10px 12px", color: formData.post_meal_target_max ? "var(--text-color)" : "var(--text-secondary)" }}>
                {formData.post_meal_target_max ? `${formData.post_meal_target_max} mmol/L` : "未设置（默认: 10.0）"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;

