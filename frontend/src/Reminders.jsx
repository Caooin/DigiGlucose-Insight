import React, { useState, useEffect } from "react";
import { authFetch } from "./auth";

const Reminders = ({ userId }) => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    reminder_type: "glucose_measurement",
    title: "",
    content: "",
    reminder_time: "",
    reminder_date: "",
    repeat_type: "daily",
    repeat_days: [],
    enabled: true,
  });

  useEffect(() => {
    if (userId) {
      fetchReminders();
      requestNotificationPermission();
    }
  }, [userId]);

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  const fetchReminders = async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/users/reminders");
      if (response.ok) {
        const data = await response.json();
        setReminders(data.reminders || []);
      }
    } catch (error) {
      console.error("Error fetching reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingReminder
        ? `/api/users/reminders/${editingReminder.id}`
        : "/api/users/reminders";
      const method = editingReminder ? "PUT" : "POST";

      const response = await authFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchReminders();
        setShowForm(false);
        setEditingReminder(null);
        resetForm();
      }
    } catch (error) {
      console.error("Error saving reminder:", error);
      alert("保存失败，请重试");
    }
  };

  const handleEdit = (reminder) => {
    setEditingReminder(reminder);
    setFormData({
      reminder_type: reminder.reminder_type,
      title: reminder.title,
      content: reminder.content || "",
      reminder_time: reminder.reminder_time,
      reminder_date: reminder.reminder_date ? reminder.reminder_date.split("T")[0] : "",
      repeat_type: reminder.repeat_type,
      repeat_days: reminder.repeat_days || [],
      enabled: reminder.enabled,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("确定要删除这个提醒吗？")) return;

    try {
      const response = await authFetch(`/api/users/reminders/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchReminders();
      }
    } catch (error) {
      console.error("Error deleting reminder:", error);
      alert("删除失败，请重试");
    }
  };

  const handleToggleComplete = async (reminder) => {
    try {
      const response = await authFetch(`/api/users/reminders/${reminder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !reminder.completed }),
      });

      if (response.ok) {
        await fetchReminders();
      }
    } catch (error) {
      console.error("Error updating reminder:", error);
    }
  };

  const handleToggleEnabled = async (reminder) => {
    try {
      const response = await authFetch(`/api/users/reminders/${reminder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !reminder.enabled }),
      });

      if (response.ok) {
        await fetchReminders();
      }
    } catch (error) {
      console.error("Error updating reminder:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      reminder_type: "glucose_measurement",
      title: "",
      content: "",
      reminder_time: "",
      reminder_date: "",
      repeat_type: "daily",
      repeat_days: [],
      enabled: true,
    });
  };

  const getReminderTypeLabel = (type) => {
    const labels = {
      glucose_measurement: "血糖测量",
      medication: "服药",
      diet_control: "饮食控制",
      appointment: "复诊",
    };
    return labels[type] || type;
  };

  const getRepeatTypeLabel = (type) => {
    const labels = {
      daily: "每日",
      weekly: "每周",
      monthly: "每月",
      once: "仅一次",
    };
    return labels[type] || type;
  };

  const getDayLabel = (day) => {
    const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    return days[day - 1] || day;
  };

  // 检查并触发提醒
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

      reminders.forEach((reminder) => {
        if (
          reminder.enabled &&
          !reminder.completed &&
          reminder.reminder_time === currentTime
        ) {
          // 检查重复规则
          let shouldNotify = false;
          if (reminder.repeat_type === "daily") {
            shouldNotify = true;
          } else if (reminder.repeat_type === "weekly") {
            const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
            shouldNotify = reminder.repeat_days.includes(dayOfWeek.toString());
          } else if (reminder.repeat_type === "once") {
            const reminderDate = new Date(reminder.reminder_date);
            shouldNotify =
              reminderDate.toDateString() === now.toDateString();
          }

          if (shouldNotify && "Notification" in window && Notification.permission === "granted") {
            new Notification(reminder.title, {
              body: reminder.content || "提醒时间到了",
              icon: "/favicon.ico",
            });
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // 每分钟检查一次
    return () => clearInterval(interval);
  }, [reminders]);

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
          <h3 className="card-title">提醒管理</h3>
          <button
            className="btn btn-primary"
            onClick={() => {
              resetForm();
              setEditingReminder(null);
              setShowForm(!showForm);
            }}
          >
            {showForm ? "取消" : "+ 新建提醒"}
          </button>
        </div>

        {/* 提醒表单 */}
        {showForm && (
          <form onSubmit={handleSubmit} style={{ marginBottom: "20px", padding: "20px", background: "var(--form-bg, #f8f9fa)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <div className="form-group">
              <label className="form-label">提醒类型</label>
              <select
                className="form-select"
                value={formData.reminder_type}
                onChange={(e) => setFormData({ ...formData, reminder_type: e.target.value })}
                required
              >
                <option value="glucose_measurement">血糖测量</option>
                <option value="medication">服药</option>
                <option value="diet_control">饮食控制</option>
                <option value="appointment">复诊</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">提醒标题</label>
              <input
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                placeholder="例如：测量早餐后血糖"
              />
            </div>

            <div className="form-group">
              <label className="form-label">提醒内容（可选）</label>
              <textarea
                className="form-input"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={3}
                placeholder="提醒的详细内容"
              />
            </div>

            <div className="form-group">
              <label className="form-label">提醒时间</label>
              <input
                type="time"
                className="form-input"
                value={formData.reminder_time}
                onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">重复类型</label>
              <select
                className="form-select"
                value={formData.repeat_type}
                onChange={(e) => setFormData({ ...formData, repeat_type: e.target.value })}
              >
                <option value="daily">每日</option>
                <option value="weekly">每周</option>
                <option value="monthly">每月</option>
                <option value="once">仅一次</option>
              </select>
            </div>

            {formData.repeat_type === "weekly" && (
              <div className="form-group">
                <label className="form-label">重复日期（可多选）</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <label key={day} style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-color)", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={formData.repeat_days.includes(day.toString())}
                        onChange={(e) => {
                          const days = e.target.checked
                            ? [...formData.repeat_days, day.toString()]
                            : formData.repeat_days.filter((d) => d !== day.toString());
                          setFormData({ ...formData, repeat_days: days });
                        }}
                      />
                      {getDayLabel(day)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {formData.repeat_type === "once" && (
              <div className="form-group">
                <label className="form-label">提醒日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.reminder_date}
                  onChange={(e) => setFormData({ ...formData, reminder_date: e.target.value })}
                  required
                />
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button type="submit" className="btn btn-primary">
                {editingReminder ? "更新" : "创建"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingReminder(null);
                  resetForm();
                }}
              >
                取消
              </button>
            </div>
          </form>
        )}

        {/* 提醒列表 */}
        {reminders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            <p style={{ color: "var(--text-color)" }}>暂无提醒</p>
            <p style={{ marginTop: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>点击"新建提醒"创建您的第一个提醒</p>
          </div>
        ) : (
          <div>
            {reminders.map((reminder) => (
              <div
                key={reminder.id}
                style={{
                  padding: "16px",
                  marginBottom: "12px",
                  background: reminder.completed ? "var(--item-completed-bg, #f0f0f0)" : "var(--card-bg)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  opacity: reminder.enabled ? 1 : 0.6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          background: "var(--primary-color, #3498db)",
                          color: "white",
                          borderRadius: "4px",
                          fontSize: "12px",
                        }}
                      >
                        {getReminderTypeLabel(reminder.reminder_type)}
                      </span>
                      <h4 style={{ margin: 0, textDecoration: reminder.completed ? "line-through" : "none", color: "var(--text-color)" }}>
                        {reminder.title}
                      </h4>
                    </div>
                    {reminder.content && (
                      <p style={{ margin: "4px 0", color: "var(--text-color)", fontSize: "14px" }}>
                        {reminder.content}
                      </p>
                    )}
                    <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "8px" }}>
                      <span>时间: {reminder.reminder_time}</span>
                      {" | "}
                      <span>重复: {getRepeatTypeLabel(reminder.repeat_type)}</span>
                      {reminder.repeat_days.length > 0 && (
                        <>
                          {" | "}
                          <span>
                            {reminder.repeat_days.map((d) => getDayLabel(Number(d))).join(", ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexDirection: "column" }}>
                    <button
                      className="btn"
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        background: reminder.completed ? "#27ae60" : "#95a5a6",
                        color: "white",
                      }}
                      onClick={() => handleToggleComplete(reminder)}
                    >
                      {reminder.completed ? "✓ 已完成" : "标记完成"}
                    </button>
                    <button
                      className="btn"
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        background: reminder.enabled ? "#f39c12" : "#95a5a6",
                        color: "white",
                      }}
                      onClick={() => handleToggleEnabled(reminder)}
                    >
                      {reminder.enabled ? "关闭" : "开启"}
                    </button>
                    <button
                      className="btn"
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        background: "#3498db",
                        color: "white",
                      }}
                      onClick={() => handleEdit(reminder)}
                    >
                      编辑
                    </button>
                    <button
                      className="btn"
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        background: "#e74c3c",
                        color: "white",
                      }}
                      onClick={() => handleDelete(reminder.id)}
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reminders;

