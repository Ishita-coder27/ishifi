from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Budget, Transaction, User
from ..schemas import BudgetIn
from ..security import current_user

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


def month_bounds(month: str | None):
    ym = month or datetime.now().strftime("%Y-%m")
    y, m = int(ym[:4]), int(ym[5:7])
    start = datetime(y, m, 1)
    end = datetime(y + 1, 1, 1) if m == 12 else datetime(y, m + 1, 1)
    return ym, start, end


@router.get("")
def list_budgets(month: str = "", user: User = Depends(current_user), db: Session = Depends(get_db)):
    ym, start, end = month_bounds(month or None)
    budgets = db.scalars(select(Budget).where(Budget.user_id == user.id)).all()
    spent_rows = db.execute(
        select(Transaction.category, func.sum(Transaction.amount))
        .where(
            Transaction.user_id == user.id,
            Transaction.type == "expense",
            Transaction.date >= start,
            Transaction.date < end,
        )
        .group_by(Transaction.category)
    ).all()
    spent = {cat: total for cat, total in spent_rows}
    total_spent = round(sum(spent.values()), 2)
    return {
        "month": ym,
        "totalSpent": total_spent,
        "budgets": [
            {
                "id": b.id,
                "category": b.category,
                "amount": b.amount,
                "spent": total_spent if b.category == "overall" else round(spent.get(b.category, 0), 2),
            }
            for b in budgets
        ],
    }


@router.put("")
def upsert_budget(body: BudgetIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    b = db.scalar(select(Budget).where(Budget.user_id == user.id, Budget.category == body.category))
    if b:
        b.amount = body.amount
    else:
        b = Budget(user_id=user.id, category=body.category, amount=body.amount)
        db.add(b)
    db.commit()
    return {"budget": {"id": b.id, "category": b.category, "amount": b.amount}}


@router.delete("/{budget_id}")
def delete_budget(budget_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    b = db.get(Budget, budget_id)
    if not b or b.user_id != user.id:
        raise HTTPException(404, "Budget not found")
    db.delete(b)
    db.commit()
    return {"ok": True}
