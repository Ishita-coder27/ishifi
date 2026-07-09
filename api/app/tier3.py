"""Tier 3: Advanced AI Features — Goal achievement, recommendations, optimization."""

import json
from collections import defaultdict
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor

from . import models
from .database import SessionLocal


class AdvancedAnalytics:
    """Tier 3: Production-grade financial AI."""

    def __init__(self, user_id: int):
        self.user_id = user_id
        self.db = SessionLocal()

    def predict_goal_achievement(self) -> dict:
        """When will the user achieve each goal based on current savings rate?"""
        goals = self.db.query(models.Goal).filter(
            models.Goal.user_id == self.user_id,
            models.Goal.completed_at.is_(None),
        ).all()

        if not goals:
            return {}

        predictions = {}

        for goal in goals:
            # Get monthly savings rate
            txns = self.db.query(models.Transaction).filter(
                models.Transaction.user_id == self.user_id,
                models.Transaction.type == "income",
            ).all()

            if not txns:
                continue

            # Calculate average monthly income
            monthly_income = {}
            for tx in txns:
                month_key = tx.date.strftime("%Y-%m")
                monthly_income[month_key] = monthly_income.get(month_key, 0) + tx.amount

            if not monthly_income:
                continue

            avg_monthly = np.mean(list(monthly_income.values()))
            remaining = max(0, goal.target - goal.saved)

            if avg_monthly > 0:
                months_to_goal = remaining / avg_monthly
                achievement_date = datetime.now() + timedelta(days=months_to_goal * 30)

                predictions[goal.id] = {
                    "goal_name": goal.name,
                    "target": goal.target,
                    "saved": goal.saved,
                    "remaining": remaining,
                    "avg_monthly_savings": round(avg_monthly, 2),
                    "months_to_achievement": round(months_to_goal, 1),
                    "predicted_date": achievement_date.isoformat(),
                    "on_track": goal.deadline is None or achievement_date <= goal.deadline,
                }

        return predictions

    def get_spending_optimization(self) -> list[dict]:
        """Identify where to cut spending to optimize savings."""
        txns = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "expense",
            models.Transaction.date >= datetime.now() - timedelta(days=90),
        ).all()

        if not txns:
            return []

        # Group by category
        by_category = defaultdict(list)
        for tx in txns:
            by_category[tx.category].append(tx.amount)

        recommendations = []

        for category, amounts in by_category.items():
            if len(amounts) < 3:
                continue

            avg = np.mean(amounts)
            std = np.std(amounts)
            max_amount = max(amounts)

            # Find variance patterns
            variability = std / avg if avg > 0 else 0

            if variability > 0.5:  # High variance = potential for optimization
                reduction = max_amount * 0.1  # Suggest 10% reduction
                monthly_impact = reduction * (30 / 90)  # Annualize

                recommendations.append({
                    "category": category,
                    "current_avg": round(avg, 2),
                    "highest_transaction": round(max_amount, 2),
                    "variability_score": round(variability, 2),
                    "suggested_reduction": round(reduction, 2),
                    "monthly_savings": round(monthly_impact, 2),
                    "annual_savings": round(monthly_impact * 12, 2),
                    "reason": f"High variability ({round(variability*100)}%) suggests room to optimize",
                })

        return sorted(recommendations, key=lambda x: x["annual_savings"], reverse=True)[:5]

    def get_smart_recommendations(self) -> list[str]:
        """Generate actionable financial recommendations."""
        recommendations = []

        # 1. Check if on track for budget
        txns = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "expense",
            models.Transaction.date >= datetime.now().replace(day=1),
        ).all()

        monthly_spent = sum(t.amount for t in txns)
        budgets = self.db.query(models.Budget).filter(
            models.Budget.user_id == self.user_id,
        ).all()

        overall_budget = next((b.amount for b in budgets if b.category == "overall"), None)

        if overall_budget:
            if monthly_spent > overall_budget * 0.8:
                recommendations.append(
                    f"⚠️ Running out of budget: {round((monthly_spent/overall_budget)*100)}% spent. "
                    f"Reduce spending by {round(monthly_spent - overall_budget*0.8, 2)} to stay on track."
                )

        # 2. Check unused goals
        goals = self.db.query(models.Goal).filter(
            models.Goal.user_id == self.user_id,
            models.Goal.completed_at.is_(None),
            models.Goal.deadline.isnot(None),
        ).all()

        for goal in goals:
            if goal.deadline < datetime.now():
                recommendations.append(
                    f"Deadline passed for goal '{goal.name}'. Consider extending it or making it a new goal."
                )

        # 3. Subscription redundancy check
        subs = self.db.query(models.Subscription).filter(
            models.Subscription.user_id == self.user_id,
            models.Subscription.active.is_(True),
        ).all()

        annual_sub_cost = sum(s.amount * (12 if s.cycle == "yearly" else 1) for s in subs)

        if annual_sub_cost > 5000:  # More than ₹5k/year on subscriptions
            recommendations.append(
                f"💡 High subscription costs: {round(annual_sub_cost, 2)} per year. "
                f"Review inactive subscriptions and consolidate where possible."
            )

        # 4. Savings rate check
        txns_income = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "income",
            models.Transaction.date >= datetime.now() - timedelta(days=90),
        ).all()

        txns_expense = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "expense",
            models.Transaction.date >= datetime.now() - timedelta(days=90),
        ).all()

        total_income = sum(t.amount for t in txns_income)
        total_expense = sum(t.amount for t in txns_expense)

        if total_income > 0:
            savings_rate = (total_income - total_expense) / total_income
            if savings_rate < 0.2:
                recommendations.append(
                    f"📊 Low savings rate: {round(savings_rate*100)}%. "
                    f"Financial experts recommend aiming for 20%+."
                )

        return recommendations[:5]

    def calculate_financial_health(self) -> dict:
        """Calculate comprehensive financial health score (0-100)."""
        score = 0
        weights = {}

        # 1. Savings rate (30 points)
        txns_income = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "income",
            models.Transaction.date >= datetime.now() - timedelta(days=90),
        ).all()

        txns_expense = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "expense",
            models.Transaction.date >= datetime.now() - timedelta(days=90),
        ).all()

        total_income = sum(t.amount for t in txns_income) or 1
        total_expense = sum(t.amount for t in txns_expense)
        savings_rate = max(0, (total_income - total_expense) / total_income)
        savings_score = min(30, savings_rate * 150)  # 20% = 30 points
        score += savings_score
        weights["savings_rate"] = {"score": round(savings_score), "target": 30, "status": "good" if savings_rate > 0.2 else "needs_improvement"}

        # 2. Budget adherence (25 points)
        budgets = self.db.query(models.Budget).filter(
            models.Budget.user_id == self.user_id,
        ).all()

        if budgets:
            month_start = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            spent_by_category = defaultdict(float)
            for tx in self.db.query(models.Transaction).filter(
                models.Transaction.user_id == self.user_id,
                models.Transaction.type == "expense",
                models.Transaction.date >= month_start,
            ).all():
                spent_by_category[tx.category] += tx.amount
            total_spent_this_month = sum(spent_by_category.values())

            def spent_for(b):
                return total_spent_this_month if b.category == "overall" else spent_by_category.get(b.category, 0)

            over_budget = sum(1 for b in budgets if spent_for(b) > b.amount)
            budget_score = max(0, 25 - (over_budget * 5))
            score += budget_score
            weights["budget_adherence"] = {"score": round(budget_score), "target": 25, "status": "on_track" if over_budget == 0 else f"{over_budget} over"}

        # 3. Goal progress (25 points)
        goals = self.db.query(models.Goal).filter(
            models.Goal.user_id == self.user_id,
        ).all()

        if goals:
            goal_completion = sum(1 for g in goals if g.completed_at) / len(goals) if goals else 0
            goal_score = goal_completion * 25
            score += goal_score
            weights["goal_progress"] = {"score": round(goal_score), "target": 25, "completed": sum(1 for g in goals if g.completed_at)}

        # 4. Spending consistency (20 points)
        # Lower variance = more consistent = higher score
        daily_spending = defaultdict(float)
        for tx in txns_expense:
            daily_spending[tx.date.date()] += tx.amount

        if daily_spending:
            spending_values = list(daily_spending.values())
            spending_std = np.std(spending_values) if len(spending_values) > 1 else 0
            spending_mean = np.mean(spending_values) or 1
            consistency = max(0, 1 - (spending_std / spending_mean)) if spending_std > 0 else 1
            consistency_score = consistency * 20
            score += consistency_score
            weights["consistency"] = {"score": round(consistency_score), "target": 20, "status": "predictable" if consistency > 0.7 else "volatile"}

        return {
            "overall_score": round(min(100, score)),
            "grade": self._grade_score(score),
            "weights": weights,
            "status": "excellent" if score > 80 else "good" if score > 60 else "needs_work",
        }

    @staticmethod
    def _grade_score(score: float) -> str:
        if score >= 90:
            return "A+"
        elif score >= 80:
            return "A"
        elif score >= 70:
            return "B"
        elif score >= 60:
            return "C"
        else:
            return "F"

    def close(self):
        self.db.close()


    def get_spending_heatmap(self) -> dict:
        """Heatmap: peak spending hours, days, seasons."""
        txns = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "expense",
            models.Transaction.date >= datetime.now() - timedelta(days=365),
        ).all()

        if not txns:
            return {"by_hour": {}, "by_day": {}, "by_month": {}}

        # By hour of day
        by_hour = defaultdict(float)
        by_day = defaultdict(float)
        by_month = defaultdict(float)

        for tx in txns:
            hour = tx.date.hour
            dow = tx.date.strftime("%A")
            month = tx.date.strftime("%B")

            by_hour[str(hour)] += tx.amount
            by_day[dow] += tx.amount
            by_month[month] += tx.amount

        return {
            "by_hour": {k: round(v, 2) for k, v in sorted(by_hour.items())},
            "by_day": dict(sorted(by_day.items())),
            "by_month": dict(sorted(by_month.items())),
            "peak_hour": max(by_hour.items(), key=lambda x: x[1])[0] if by_hour else None,
            "peak_day": max(by_day.items(), key=lambda x: x[1])[0] if by_day else None,
            "peak_month": max(by_month.items(), key=lambda x: x[1])[0] if by_month else None,
        }

    def get_category_trends(self) -> dict:
        """Category trends: % change month-over-month."""
        txns = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "expense",
            models.Transaction.date >= datetime.now() - timedelta(days=90),
        ).all()

        # Current month vs previous month
        now = datetime.now()
        current_month = now.strftime("%Y-%m")
        prev_month = (now - timedelta(days=30)).strftime("%Y-%m")

        current_by_cat = defaultdict(float)
        prev_by_cat = defaultdict(float)

        for tx in txns:
            month_key = tx.date.strftime("%Y-%m")
            if month_key == current_month:
                current_by_cat[tx.category] += tx.amount
            elif month_key == prev_month:
                prev_by_cat[tx.category] += tx.amount

        trends = {}
        all_cats = set(current_by_cat.keys()) | set(prev_by_cat.keys())

        for cat in all_cats:
            curr = current_by_cat.get(cat, 0)
            prev = prev_by_cat.get(cat, 0)

            if prev > 0:
                change_pct = ((curr - prev) / prev) * 100
            else:
                change_pct = 100 if curr > 0 else 0

            trends[cat] = {
                "current_month": round(curr, 2),
                "previous_month": round(prev, 2),
                "change_percent": round(change_pct, 1),
                "direction": "↑" if change_pct > 0 else "↓" if change_pct < 0 else "→",
            }

        return dict(sorted(trends.items(), key=lambda x: abs(x[1]["change_percent"]), reverse=True))

    def get_savings_forecast(self, months: int = 6) -> dict:
        """Forecast savings for next N months (6/12 months)."""
        txns_income = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "income",
            models.Transaction.date >= datetime.now() - timedelta(days=180),
        ).all()

        txns_expense = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.type == "expense",
            models.Transaction.date >= datetime.now() - timedelta(days=180),
        ).all()

        # Monthly aggregates
        monthly_income = defaultdict(float)
        monthly_expense = defaultdict(float)

        for tx in txns_income:
            month = tx.date.strftime("%Y-%m")
            monthly_income[month] += tx.amount

        for tx in txns_expense:
            month = tx.date.strftime("%Y-%m")
            monthly_expense[month] += tx.amount

        if not monthly_income or not monthly_expense:
            return {"forecast": [], "error": "Insufficient historical data"}

        # Use simple average for forecast
        avg_income = np.mean(list(monthly_income.values()))
        avg_expense = np.mean(list(monthly_expense.values()))
        avg_savings = avg_income - avg_expense

        forecast = []
        now = datetime.now()

        for m in range(1, months + 1):
            future_month = now + timedelta(days=30 * m)
            month_key = future_month.strftime("%Y-%m")

            forecast.append({
                "month": month_key,
                "predicted_income": round(avg_income, 2),
                "predicted_expense": round(avg_expense, 2),
                "predicted_savings": round(avg_savings, 2),
                "cumulative_savings": round(avg_savings * m, 2),
            })

        return {
            "forecast": forecast,
            "avg_monthly_savings": round(avg_savings, 2),
            "total_12month_forecast": round(avg_savings * 12, 2),
            "confidence": "medium",
        }


def analyze_tier3(user_id: int) -> dict:
    """Run full Tier 3 analysis."""
    analyzer = AdvancedAnalytics(user_id)
    try:
        return {
            "goal_predictions": analyzer.predict_goal_achievement(),
            "spending_optimization": analyzer.get_spending_optimization(),
            "recommendations": analyzer.get_smart_recommendations(),
            "financial_health": analyzer.calculate_financial_health(),
            "spending_heatmap": analyzer.get_spending_heatmap(),
            "category_trends": analyzer.get_category_trends(),
            "savings_forecast": analyzer.get_savings_forecast(),
        }
    finally:
        analyzer.close()
