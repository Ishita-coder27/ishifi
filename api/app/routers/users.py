import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Budget, Category, Goal, Subscription, Transaction, User
from ..schemas import (
    ImportIn, PasswordChangeIn, ProfilePatch, cat_out, goal_out, sub_out, tx_out, user_out,
)
from ..security import clear_refresh_cookie, current_user, hash_password, verify_password

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/me")
def me(user: User = Depends(current_user)):
    return {"user": user_out(user)}


@router.patch("/me")
def patch_me(body: ProfilePatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    data = body.model_dump(exclude_none=True)
    if "notifications" in data:
        merged = json.loads(user.notifications or "{}")
        merged.update(data.pop("notifications"))
        user.notifications = json.dumps(merged)
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    return {"user": user_out(user)}


@router.post("/me/password")
def change_password(body: PasswordChangeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current, user.password_hash):
        raise HTTPException(400, "Current password is wrong")
    user.password_hash = hash_password(body.next)
    user.token_version += 1
    db.commit()
    return {"ok": True}


@router.get("/me/stats")
def stats(user: User = Depends(current_user), db: Session = Depends(get_db)):
    uid = user.id
    tx_count = db.scalar(select(func.count()).select_from(Transaction).where(Transaction.user_id == uid)) or 0
    goal_count = db.scalar(select(func.count()).select_from(Goal).where(Goal.user_id == uid)) or 0
    goals_done = db.scalar(select(func.count()).select_from(Goal).where(Goal.user_id == uid, Goal.completed_at.is_not(None))) or 0
    first_date = db.scalar(select(func.min(Transaction.date)).where(Transaction.user_id == uid))
    total_income = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == uid, Transaction.type == "income")) or 0
    total_expense = db.scalar(select(func.coalesce(func.sum(Transaction.amount), 0)).where(
        Transaction.user_id == uid, Transaction.type == "expense")) or 0
    return {
        "txCount": tx_count,
        "goalCount": goal_count,
        "goalsCompleted": goals_done,
        "trackingSince": first_date.isoformat() if first_date else None,
        "totalIncome": total_income,
        "totalExpense": total_expense,
    }


@router.delete("/me")
def delete_me(response: Response, user: User = Depends(current_user), db: Session = Depends(get_db)):
    uid = user.id
    for model in (Transaction, Goal, Budget, Category, Subscription):
        db.query(model).filter(model.user_id == uid).delete()
    db.delete(user)
    db.commit()
    clear_refresh_cookie(response)
    return {"ok": True}


@router.get("/me/export")
def export_data(user: User = Depends(current_user), db: Session = Depends(get_db)):
    uid = user.id
    return {
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "transactions": [tx_out(t) for t in db.scalars(select(Transaction).where(Transaction.user_id == uid)).all()],
        "budgets": [{"category": b.category, "amount": b.amount}
                    for b in db.scalars(select(Budget).where(Budget.user_id == uid)).all()],
        "goals": [goal_out(g) for g in db.scalars(select(Goal).where(Goal.user_id == uid)).all()],
        "categories": [cat_out(c) for c in db.scalars(select(Category).where(Category.user_id == uid)).all()],
        "subscriptions": [sub_out(s) for s in db.scalars(select(Subscription).where(Subscription.user_id == uid)).all()],
    }


@router.post("/me/import")
def import_data(body: ImportIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    for t in body.transactions:
        db.add(Transaction(user_id=user.id, type=t.type, amount=t.amount,
                           category=t.category, note=t.note, date=t.date.replace(tzinfo=None)))
    db.commit()
    return {"imported": len(body.transactions)}
