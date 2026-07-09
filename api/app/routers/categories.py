import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Category, Transaction, User
from ..schemas import CategoryIn, CategoryPatch, cat_out
from ..security import current_user

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
def list_categories(user: User = Depends(current_user), db: Session = Depends(get_db)):
    cats = db.scalars(select(Category).where(Category.user_id == user.id).order_by(Category.name)).all()
    # spend per category (all time + this month handled client-side via analytics)
    spend = dict(
        db.execute(
            select(Transaction.category, func.sum(Transaction.amount))
            .where(Transaction.user_id == user.id, Transaction.type == "expense")
            .group_by(Transaction.category)
        ).all()
    )
    return {"categories": [{**cat_out(c), "totalSpent": round(spend.get(c.slug, 0), 2)} for c in cats]}


@router.post("", status_code=201)
def create_category(body: CategoryIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    slug = re.sub(r"[^a-z0-9]+", "-", body.name.lower()).strip("-") or "category"
    if db.scalar(select(Category).where(Category.user_id == user.id, Category.slug == slug)):
        raise HTTPException(409, "A category with this name already exists")
    c = Category(user_id=user.id, slug=slug, name=body.name.strip(), icon=body.icon, color=body.color)
    db.add(c)
    db.commit()
    return {"category": cat_out(c)}


def _own_cat(cat_id: int, user: User, db: Session) -> Category:
    c = db.get(Category, cat_id)
    if not c or c.user_id != user.id:
        raise HTTPException(404, "Category not found")
    return c


@router.patch("/{cat_id}")
def update_category(cat_id: int, body: CategoryPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own_cat(cat_id, user, db)
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(c, k, v)
    db.commit()
    return {"category": cat_out(c)}


@router.delete("/{cat_id}")
def delete_category(cat_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    c = _own_cat(cat_id, user, db)
    if c.slug == "other":
        raise HTTPException(400, "The 'Other' category can't be deleted — it catches re-assigned entries")
    # move orphaned transactions to "other"
    db.query(Transaction).filter(
        Transaction.user_id == user.id, Transaction.category == c.slug
    ).update({"category": "other"}, synchronize_session=False)
    db.delete(c)
    db.commit()
    return {"ok": True}
