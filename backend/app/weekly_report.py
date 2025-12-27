"""
周报与复盘功能
"""
import datetime
import json
from typing import Dict, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from . import models, database


def generate_weekly_report(user_id: int) -> Dict:
    """
    生成周报
    
    返回: {
        "success": bool,
        "content": str,
        "report_id": int
    }
    """
    # 使用上下文管理器确保连接关闭
    db = database.SessionLocal()
    try:
        # 计算本周起止时间
        today = datetime.datetime.utcnow()
        week_start = today - datetime.timedelta(days=today.weekday())
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + datetime.timedelta(days=7)
        
        # 获取本周数据
        readings = db.query(models.GlucoseReading).filter(
            and_(
                models.GlucoseReading.user_id == user_id,
                models.GlucoseReading.timestamp >= week_start,
                models.GlucoseReading.timestamp < week_end
            )
        ).order_by(models.GlucoseReading.timestamp).all()
        
        meals = db.query(models.MealEntry).filter(
            and_(
                models.MealEntry.user_id == user_id,
                models.MealEntry.timestamp >= week_start,
                models.MealEntry.timestamp < week_end
            )
        ).all()
        
        exercises = db.query(models.ExerciseRecord).filter(
            and_(
                models.ExerciseRecord.user_id == user_id,
                models.ExerciseRecord.timestamp >= week_start,
                models.ExerciseRecord.timestamp < week_end
            )
        ).all()
        
        # 获取用户目标
        user = db.query(models.User).filter(models.User.id == user_id).first()
        
        # 统计数据
        total_measurements = len(readings)
        
        if total_measurements == 0:
            result = {
                "success": False,
                "content": "本周还没有血糖记录，请开始记录您的血糖数据。",
                "report_id": None,
                "total_measurements": 0,
                "average_glucose": None,
                "fasting_average": None,
                "post_meal_average": None,
                "target_compliance_rate": None,
            }
            return result
        
        # 计算平均值
        avg_glucose = sum(r.value for r in readings) / total_measurements
        
        # 空腹和餐后分别统计
        fasting_readings = [r for r in readings if r.context == "fasting"]
        post_meal_readings = [r for r in readings if r.context == "post_meal"]
        
        fasting_avg = sum(r.value for r in fasting_readings) / len(fasting_readings) if fasting_readings else None
        post_meal_avg = sum(r.value for r in post_meal_readings) / len(post_meal_readings) if post_meal_readings else None
        
        # 达标情况
        target_compliance = calculate_target_compliance(readings, user)
        
        # 模式识别
        patterns = identify_patterns(readings, meals, exercises)
        
        # 行动建议
        action_items = generate_action_items(readings, user, patterns)
        
        # 正面进展
        positive_progress = identify_positive_progress(readings, user)
        
        # 生成报告内容
        content_parts = [
            f"📊 【本周血糖管理报告】",
            f"报告周期：{week_start.strftime('%Y-%m-%d')} 至 {week_end.strftime('%Y-%m-%d')}\n",
        ]
        
        # 统计数据
        content_parts.append("【统计数据】")
        content_parts.append(f"• 总测量次数：{total_measurements}次")
        content_parts.append(f"• 平均血糖：{avg_glucose:.1f} mmol/L")
        if fasting_avg:
            content_parts.append(f"• 空腹平均：{fasting_avg:.1f} mmol/L")
        if post_meal_avg:
            content_parts.append(f"• 餐后平均：{post_meal_avg:.1f} mmol/L")
        content_parts.append(f"• 目标达标率：{target_compliance:.1f}%\n")
        
        # 模式识别
        if patterns:
            content_parts.append("【模式识别】")
            for pattern in patterns:
                content_parts.append(f"• {pattern}")
            content_parts.append("")
        
        # 正面进展
        if positive_progress:
            content_parts.append("【正面进展】")
            for progress in positive_progress:
                content_parts.append(f"• {progress}")
            content_parts.append("")
        
        # 行动建议
        if action_items:
            content_parts.append("【行动建议】")
            for i, item in enumerate(action_items[:3], 1):  # 最多3条
                content_parts.append(f"{i}. {item}")
            content_parts.append("")
        
        # 饮食和运动统计
        if meals:
            content_parts.append(f"【饮食记录】本周共记录{len(meals)}次饮食")
        if exercises:
            content_parts.append(f"【运动记录】本周共记录{len(exercises)}次运动")
        
        content = "\n".join(content_parts)
        
        # 保存周报
        report = models.WeeklyReport(
            user_id=user_id,
            week_start=week_start,
            week_end=week_end,
            total_measurements=total_measurements,
            average_glucose=avg_glucose,
            fasting_average=fasting_avg,
            post_meal_average=post_meal_avg,
            target_compliance_rate=target_compliance,
            patterns=json.dumps(patterns, ensure_ascii=False),
            action_items=json.dumps(action_items, ensure_ascii=False),
            positive_progress=json.dumps(positive_progress, ensure_ascii=False),
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        
        result = {
            "success": True,
            "content": content,
            "report_id": report.id,
            "total_measurements": total_measurements,
            "average_glucose": avg_glucose,
            "fasting_average": fasting_avg,
            "post_meal_average": post_meal_avg,
            "target_compliance_rate": target_compliance,
        }
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()
    
    return result


def calculate_target_compliance(readings: List[models.GlucoseReading], user: models.User) -> float:
    """计算目标达标率"""
    if not readings:
        return 0.0
    
    compliant_count = 0
    
    for reading in readings:
        if reading.context == "fasting":
            target_min = user.fasting_target_min or 4.4
            target_max = user.fasting_target_max or 7.2
            if target_min <= reading.value <= target_max:
                compliant_count += 1
        elif reading.context == "post_meal":
            target_max = user.post_meal_target_max or 10.0
            if reading.value <= target_max:
                compliant_count += 1
        else:
            # 随机测量：使用较宽范围
            if 3.9 <= reading.value <= 11.1:
                compliant_count += 1
    
    return (compliant_count / len(readings)) * 100.0


def identify_patterns(
    readings: List[models.GlucoseReading],
    meals: List[models.MealEntry],
    exercises: List[models.ExerciseRecord],
) -> List[str]:
    """识别模式"""
    patterns = []
    
    if not readings:
        return patterns
    
    # 按餐次分析
    meal_type_values = {}
    for reading in readings:
        if reading.meal_type:
            if reading.meal_type not in meal_type_values:
                meal_type_values[reading.meal_type] = []
            meal_type_values[reading.meal_type].append(reading.value)
    
    for meal_type, values in meal_type_values.items():
        avg = sum(values) / len(values)
        meal_name = {"breakfast": "早餐", "lunch": "午餐", "dinner": "晚餐"}.get(meal_type, meal_type)
        if avg > 8.0:
            patterns.append(f"{meal_name}后血糖平均值偏高（{avg:.1f} mmol/L）")
        elif avg < 5.0:
            patterns.append(f"{meal_name}后血糖平均值偏低（{avg:.1f} mmol/L）")
    
    # 趋势分析
    if len(readings) >= 3:
        recent_avg = sum(r.value for r in readings[-3:]) / 3
        earlier_avg = sum(r.value for r in readings[:3]) / 3
        if recent_avg > earlier_avg * 1.1:
            patterns.append("本周后期血糖较前期有所上升")
        elif recent_avg < earlier_avg * 0.9:
            patterns.append("本周后期血糖较前期有所下降")
    
    # 运动关联
    if exercises:
        patterns.append(f"本周进行了{len(exercises)}次运动，继续保持")
    
    return patterns


def generate_action_items(
    readings: List[models.GlucoseReading],
    user: models.User,
    patterns: List[str],
) -> List[str]:
    """生成行动建议"""
    items = []
    
    if not readings:
        return ["开始记录血糖数据"]
    
    # 根据模式生成建议
    for pattern in patterns:
        if "偏高" in pattern:
            if "早餐" in pattern:
                items.append("早餐选择低GI食物，增加蛋白质和膳食纤维")
            elif "午餐" in pattern:
                items.append("午餐控制主食份量，注意营养搭配")
            elif "晚餐" in pattern:
                items.append("晚餐减少精制碳水，增加蔬菜比例")
    
    # 根据达标率
    compliance = calculate_target_compliance(readings, user)
    if compliance < 70:
        items.append("加强血糖监测频率，及时调整饮食和运动")
    
    # 测量频率建议
    if len(readings) < 7:
        items.append("建议增加测量频率，每天至少2-3次（不同时间点）")
    
    # 默认建议
    if not items:
        items.append("继续保持当前的良好习惯")
        items.append("定期监测血糖，关注变化趋势")
    
    return items[:3]  # 最多3条


def identify_positive_progress(
    readings: List[models.GlucoseReading],
    user: models.User,
) -> List[str]:
    """识别正面进展"""
    progress = []
    
    if not readings:
        return progress
    
    # 达标率
    compliance = calculate_target_compliance(readings, user)
    if compliance >= 80:
        progress.append(f"目标达标率达到{compliance:.1f}%，表现优秀！")
    
    # 测量频率
    if len(readings) >= 14:
        progress.append(f"本周测量{len(readings)}次，监测频率良好")
    
    # 稳定性
    if len(readings) >= 3:
        values = [r.value for r in readings]
        std_dev = (sum((v - sum(values)/len(values))**2 for v in values) / len(values)) ** 0.5
        if std_dev < 1.5:
            progress.append("血糖波动较小，控制稳定")
    
    return progress

