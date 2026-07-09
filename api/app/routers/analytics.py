from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Budget, Transaction, User
from ..security import current_user
from .budgets import month_bounds

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


def shift_month(ym: str, back: int) -> str:
    y, m = int(ym[:4]), int(ym[5:7])
    m -= back
    while m < 1:
        m += 12
        y -= 1
    return f"{y:04d}-{m:02d}"


@router.get("/summary")
def summary(month: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    ym, start, end = month_bounds(month or None)
    base = (Transaction.user_id == user.id, Transaction.date >= start, Transaction.date < end)
    income = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(*base, Transaction.type == "income")) or 0
    expense = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(*base, Transaction.type == "expense")) or 0
    by_cat = db.execute(
        select(Transaction.category, func.sum(Transaction.amount), func.count())
        .where(*base, Transaction.type == "expense")
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
    ).all()
    return {
        "month": ym,
        "income": round(income, 2),
        "expense": round(expense, 2),
        "net": round(income - expense, 2),
        "savingsRate": round((income - expense) / income * 100, 1) if income > 0 else 0,
        "byCategory": [{"category": c, "total": round(t, 2), "count": n} for c, t, n in by_cat],
    }


@router.get("/trends")
def trends(months: int = Query(6, ge=1, le=24), user: User = Depends(current_user), db: Session = Depends(get_db)):
    now_ym = datetime.now().strftime("%Y-%m")
    out = []
    for back in range(months - 1, -1, -1):
        ym, start, end = month_bounds(shift_month(now_ym, back))
        base = (Transaction.user_id == user.id, Transaction.date >= start, Transaction.date < end)
        income = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(*base, Transaction.type == "income")) or 0
        expense = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(*base, Transaction.type == "expense")) or 0
        out.append({"month": ym, "income": round(income, 2), "expense": round(expense, 2), "net": round(income - expense, 2)})
    return {"trends": out}


@router.get("/daily")
def daily(month: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    ym, start, end = month_bounds(month or None)
    rows = db.execute(
        select(func.strftime("%Y-%m-%d", Transaction.date), Transaction.type, func.sum(Transaction.amount))
        .where(Transaction.user_id == user.id, Transaction.date >= start, Transaction.date < end)
        .group_by(func.strftime("%Y-%m-%d", Transaction.date), Transaction.type)
    ).all()
    days: dict[str, dict] = {}
    for d, typ, total in rows:
        days.setdefault(d, {"date": d, "income": 0, "expense": 0})
        days[d][typ] = round(total, 2)
    return {"month": ym, "days": sorted(days.values(), key=lambda x: x["date"])}


@router.get("/heatmap")
def heatmap(weeks: int = Query(20, ge=4, le=53), user: User = Depends(current_user), db: Session = Depends(get_db)):
    end = datetime.now()
    start = end - timedelta(weeks=weeks)
    rows = db.execute(
        select(func.strftime("%Y-%m-%d", Transaction.date), func.sum(Transaction.amount))
        .where(Transaction.user_id == user.id, Transaction.type == "expense",
               Transaction.date >= start, Transaction.date <= end)
        .group_by(func.strftime("%Y-%m-%d", Transaction.date))
    ).all()
    return {"from": start.strftime("%Y-%m-%d"), "to": end.strftime("%Y-%m-%d"),
            "days": [{"date": d, "total": round(t, 2)} for d, t in rows]}


@router.get("/score")
def score(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Financial health score 0-100: savings rate + budget adherence + consistency."""
    ym, start, end = month_bounds(None)
    base = (Transaction.user_id == user.id, Transaction.date >= start, Transaction.date < end)
    income = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(*base, Transaction.type == "income")) or 0
    expense = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(*base, Transaction.type == "expense")) or 0

    # savings rate → 40 pts (30% rate = full marks)
    rate = (income - expense) / income if income > 0 else 0
    savings_pts = max(0.0, min(rate / 0.3, 1.0)) * 40

    # budget adherence → 40 pts (share of caps respected)
    budgets = db.scalars(select(Budget).where(Budget.user_id == user.id)).all()
    if budgets:
        spent_rows = dict(db.execute(
            select(Transaction.category, func.sum(Transaction.amount))
            .where(*base, Transaction.type == "expense").group_by(Transaction.category)
        ).all())
        total_spent = sum(spent_rows.values())
        ok = sum(
            1 for b in budgets
            if (total_spent if b.category == "overall" else spent_rows.get(b.category, 0)) <= b.amount
        )
        adherence_pts = ok / len(budgets) * 40
    else:
        adherence_pts = 20.0  # neutral when no budgets set

    # tracking consistency → 20 pts (days with activity in last 30)
    since = datetime.now() - timedelta(days=30)
    active_days = db.scalar(
        select(func.count(func.distinct(func.strftime("%Y-%m-%d", Transaction.date))))
        .where(Transaction.user_id == user.id, Transaction.date >= since)
    ) or 0
    consistency_pts = min(active_days / 15, 1.0) * 20

    total = round(savings_pts + adherence_pts + consistency_pts)
    return {
        "score": total,
        "grade": "A+" if total >= 90 else "A" if total >= 80 else "B" if total >= 65 else "C" if total >= 50 else "D",
        "parts": {
            "savings": round(savings_pts),
            "budgets": round(adherence_pts),
            "consistency": round(consistency_pts),
        },
    }
