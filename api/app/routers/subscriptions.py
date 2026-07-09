from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Subscription, User
from ..schemas import SubIn, SubPatch, sub_out
from ..security import current_user

router = APIRouter(prefix="/api/subscriptions", tags=["subscriptions"])


@router.get("")
def list_subs(user: User = Depends(current_user), db: Session = Depends(get_db)):
    subs = db.scalars(
        select(Subscription).where(Subscription.user_id == user.id).order_by(Subscription.next_renewal)
    ).all()
    monthly_total = sum(s.amount if s.cycle == "monthly" else s.amount / 12 for s in subs if s.active)
    return {"subscriptions": [sub_out(s) for s in subs], "monthlyTotal": round(monthly_total, 2)}


@router.post("", status_code=201)
def create_sub(body: SubIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = Subscription(
        user_id=user.id, name=body.name.strip(), icon=body.icon, color=body.color,
        amount=body.amount, cycle=body.cycle,
        next_renewal=body.nextRenewal.replace(tzinfo=None), active=body.active,
    )
    db.add(s)
    db.commit()
    return {"subscription": sub_out(s)}


def _own_sub(sub_id: int, user: User, db: Session) -> Subscription:
    s = db.get(Subscription, sub_id)
    if not s or s.user_id != user.id:
        raise HTTPException(404, "Subscription not found")
    return s


@router.patch("/{sub_id}")
def update_sub(sub_id: int, body: SubPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    s = _own_sub(sub_id, user, db)
    data = body.model_dump(exclude_none=True)
    if "nextRenewal" in data:
        data["next_renewal"] = data.pop("nextRenewal").replace(tzinfo=None)
    for k, v in data.items():
        setattr(s, k, v)
    db.commit()
    return {"subscription": sub_out(s)}


@router.delete("/{sub_id}")
def delete_sub(sub_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own_sub(sub_id, user, db))
    db.commit()
    return {"ok": True}
