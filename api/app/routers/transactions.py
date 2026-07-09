from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Transaction, User
from ..schemas import BulkDeleteIn, TxIn, TxPatch, tx_out
from ..security import current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])

SORTS = {
    "date": Transaction.date.asc(),
    "-date": Transaction.date.desc(),
    "amount": Transaction.amount.asc(),
    "-amount": Transaction.amount.desc(),
}


@router.get("")
def list_txns(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    search: str = "",
    category: str = "",
    type: str = Query("", pattern="^(income|expense)?$"),
    date_from: str = Query("", alias="from"),
    date_to: str = Query("", alias="to"),
    sort: str = "-date",
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    q = select(Transaction).where(Transaction.user_id == user.id)
    if search:
        like = f"%{search.strip()}%"
        q = q.where(or_(Transaction.note.ilike(like), Transaction.category.ilike(like)))
    if category:
        q = q.where(Transaction.category.in_(category.split(",")))
    if type:
        q = q.where(Transaction.type == type)
    if date_from:
        q = q.where(Transaction.date >= datetime.fromisoformat(date_from))
    if date_to:
        q = q.where(Transaction.date <= datetime.fromisoformat(date_to + "T23:59:59") if len(date_to) == 10
                    else Transaction.date <= datetime.fromisoformat(date_to))

    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    order = SORTS.get(sort, SORTS["-date"])
    rows = db.scalars(q.order_by(order, Transaction.id.desc()).offset((page - 1) * limit).limit(limit)).all()
    return {
        "items": [tx_out(t) for t in rows],
        "total": total,
        "page": page,
        "pages": max((total + limit - 1) // limit, 1),
    }


@router.post("", status_code=201)
def create_txn(body: TxIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = Transaction(
        user_id=user.id, type=body.type, amount=body.amount,
        category=body.category, note=body.note.strip(),
        date=body.date.replace(tzinfo=None),
    )
    db.add(t)
    db.commit()
    return {"transaction": tx_out(t)}


def _own_txn(txn_id: int, user: User, db: Session) -> Transaction:
    t = db.get(Transaction, txn_id)
    if not t or t.user_id != user.id:
        raise HTTPException(404, "Transaction not found")
    return t


@router.patch("/{txn_id}")
def update_txn(txn_id: int, body: TxPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    t = _own_txn(txn_id, user, db)
    data = body.model_dump(exclude_none=True)
    if "date" in data:
        data["date"] = data["date"].replace(tzinfo=None)
    if "note" in data:
        data["note"] = data["note"].strip()
    for k, v in data.items():
        setattr(t, k, v)
    db.commit()
    return {"transaction": tx_out(t)}


@router.delete("/{txn_id}")
def delete_txn(txn_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own_txn(txn_id, user, db))
    db.commit()
    return {"ok": True}


@router.post("/bulk-delete")
def bulk_delete(body: BulkDeleteIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    deleted = (
        db.query(Transaction)
        .filter(Transaction.user_id == user.id, Transaction.id.in_(body.ids))
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"deleted": deleted}
