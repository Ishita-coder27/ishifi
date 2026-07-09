from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Budget, Goal, Subscription, Transaction, User
from ..schemas import goal_out, tx_out
from ..security import current_user
from .budgets import month_bounds

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def dashboard(user: User = Depends(current_user), db: Session = Depends(get_db)):
    uid = user.id
    now = datetime.now()
    ym, start, end = month_bounds(None)
    today_start = datetime(now.year, now.month, now.day)

    def total(*where):
        return db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == uid, *where)) or 0

    today_spent = total(Transaction.type == "expense", Transaction.date >= today_start)
    month_spent = total(Transaction.type == "expense", Transaction.date >= start, Transaction.date < end)
    month_income = total(Transaction.type == "income", Transaction.date >= start, Transaction.date < end)

    overall = db.scalar(select(Budget).where(Budget.user_id == uid, Budget.category == "overall"))
    budget_amount = overall.amount if overall else 0

    recent = db.scalars(
        select(Transaction).where(Transaction.user_id == uid)
        .order_by(Transaction.date.desc(), Transaction.id.desc()).limit(6)
    ).all()

    goals = db.scalars(
        select(Goal).where(Goal.user_id == uid, Goal.completed_at.is_(None))
        .order_by(Goal.created_at).limit(3)
    ).all()

    # last 14 days spark
    since = today_start - timedelta(days=13)
    spark_rows = dict(db.execute(
        select(func.strftime("%Y-%m-%d", Transaction.date), func.sum(Transaction.amount))
        .where(Transaction.user_id == uid, Transaction.type == "expense", Transaction.date >= since)
        .group_by(func.strftime("%Y-%m-%d", Transaction.date))
    ).all())
    spark = [
        {"date": (since + timedelta(days=i)).strftime("%Y-%m-%d"),
         "total": round(spark_rows.get((since + timedelta(days=i)).strftime("%Y-%m-%d"), 0), 2)}
        for i in range(14)
    ]

    # ── insights (concrete, data-driven) ────────────────────────────────
    insights = []
    days_gone = now.day
    days_in_month = ((end - timedelta(days=1)).day)
    if budget_amount > 0 and month_spent > 0:
        projected = month_spent / max(days_gone, 1) * days_in_month
        if projected <= budget_amount:
            insights.append({"tone": "good", "icon": "🌤️",
                             "text": f"On pace to finish the month {round(budget_amount - projected):,} under budget."})
        else:
            insights.append({"tone": "warn", "icon": "🌧️",
                             "text": f"Current pace overshoots your budget by {round(projected - budget_amount):,} — trimming {round((projected - budget_amount) / max(days_in_month - days_gone, 1)):,}/day fixes it."})
    top = db.execute(
        select(Transaction.category, func.sum(Transaction.amount))
        .where(Transaction.user_id == uid, Transaction.type == "expense",
               Transaction.date >= start, Transaction.date < end)
        .group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).limit(1)
    ).first()
    if top and month_spent:
        insights.append({"tone": "info", "icon": "🔍",
                         "text": f"{top[0].title()} is your biggest category — {round(top[1] / month_spent * 100)}% of this month's spending."})
    upcoming = db.scalars(
        select(Subscription).where(
            Subscription.user_id == uid, Subscription.active.is_(True),
            Subscription.next_renewal <= now + timedelta(days=7),
            Subscription.next_renewal >= now - timedelta(days=1))
    ).all()
    if upcoming:
        total_up = sum(s.amount for s in upcoming)
        insights.append({"tone": "warn", "icon": "🔁",
                         "text": f"{len(upcoming)} subscription{'s' if len(upcoming) > 1 else ''} renew within a week — {round(total_up):,} total."})
    if month_income > 0:
        rate = (month_income - month_spent) / month_income * 100
        if rate >= 20:
            insights.append({"tone": "good", "icon": "🌱",
                             "text": f"Savings rate this month: {rate:.0f}%. Keep this up and you bank {round((month_income - month_spent) * 12):,}/year."})
    if not insights:
        insights.append({"tone": "info", "icon": "✨",
                         "text": "Log a few transactions and insights will appear here."})

    return {
        "todaySpent": round(today_spent, 2),
        "monthSpent": round(month_spent, 2),
        "monthIncome": round(month_income, 2),
        "budget": budget_amount,
        "budgetRemaining": round(budget_amount - month_spent, 2) if budget_amount else None,
        "month": ym,
        "recent": [tx_out(t) for t in recent],
        "goals": [goal_out(g) for g in goals],
        "spark": spark,
        "insights": insights[:4],
    }
