"""Admin dashboard and user management for enterprise features."""

from datetime import datetime, timedelta
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

from ..database import get_db
from ..models import User, Transaction, AuditLog, AdminUser
from ..schemas import AdminDashboardOut, UserAdminOut, AuditLogOut
from ..security import current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_admin(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Verify user is admin"""
    admin = db.execute(
        select(AdminUser).filter(AdminUser.user_id == user.id)
    ).scalar()
    if not admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/dashboard", response_model=AdminDashboardOut)
def get_admin_dashboard(user: User = Depends(require_admin), db: Session = Depends(get_db)):
    """Get admin dashboard with key metrics"""

    total_users = db.execute(select(func.count(User.id))).scalar() or 0
    active_users = db.execute(
        select(func.count(User.id)).where(User.verified == True)
    ).scalar() or 0

    total_transactions = db.execute(select(func.count(Transaction.id))).scalar() or 0

    total_revenue = db.execute(
        select(func.sum(Transaction.amount)).where(Transaction.type == "income")
    ).scalar() or 0

    # User growth (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    user_growth = []
    for i in range(30):
        date = thirty_days_ago + timedelta(days=i)
        count = db.execute(
            select(func.count(User.id)).where(
                User.created_at >= date,
                User.created_at < date + timedelta(days=1)
            )
        ).scalar() or 0
        user_growth.append({"date": date.isoformat(), "count": count})

    # Top categories
    top_cats = db.execute(
        select(Transaction.category, func.count(Transaction.id).label("count"))
        .group_by(Transaction.category)
        .order_by(func.count(Transaction.id).desc())
        .limit(5)
    ).all()
    top_categories = [{"category": cat, "count": count} for cat, count in top_cats]

    # Avg savings rate
    avg_savings = 0
    users = db.execute(select(User)).scalars().all()
    if users:
        total_savings_rate = 0
        for u in users:
            income = db.execute(
                select(func.sum(Transaction.amount)).where(
                    Transaction.user_id == u.id,
                    Transaction.type == "income"
                )
            ).scalar() or 0
            expense = db.execute(
                select(func.sum(Transaction.amount)).where(
                    Transaction.user_id == u.id,
                    Transaction.type == "expense"
                )
            ).scalar() or 0
            if income > 0:
                total_savings_rate += (income - expense) / income
        avg_savings = (total_savings_rate / len(users)) * 100

    return AdminDashboardOut(
        total_users=total_users,
        active_users=active_users,
        total_transactions=total_transactions,
        total_revenue=total_revenue,
        user_growth=user_growth,
        top_categories=top_categories,
        avg_savings_rate=round(avg_savings, 2)
    )


@router.get("/users", response_model=list[UserAdminOut])
def get_all_users(
    limit: int = 50,
    offset: int = 0,
    user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get all users for admin panel"""
    users = db.execute(
        select(User).limit(limit).offset(offset)
    ).scalars().all()

    result = []
    for u in users:
        last_log = db.execute(
            select(AuditLog).where(AuditLog.user_id == u.id).order_by(AuditLog.timestamp.desc()).limit(1)
        ).scalar()

        is_admin = db.execute(
            select(AdminUser).where(AdminUser.user_id == u.id)
        ).scalar() is not None

        result.append(UserAdminOut(
            id=u.id,
            name=u.name,
            email=u.email,
            verified=u.verified,
            created_at=u.created_at,
            last_activity=last_log.timestamp if last_log else None,
            is_admin=is_admin
        ))

    return result


@router.get("/audit-logs", response_model=list[AuditLogOut])
def get_audit_logs(
    user_id: int | None = None,
    action: str | None = None,
    limit: int = 100,
    offset: int = 0,
    current_user_obj: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Get audit logs with optional filters"""
    query = select(AuditLog)

    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if action:
        query = query.where(AuditLog.action.ilike(f"%{action}%"))

    logs = db.execute(
        query.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
    ).scalars().all()

    return [
        AuditLogOut(
            id=log.id,
            user_id=log.user_id,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            old_values=log.old_values,
            new_values=log.new_values,
            ip_address=log.ip_address,
            status=log.status,
            timestamp=log.timestamp
        )
        for log in logs
    ]


@router.post("/promote-admin/{user_id}")
def promote_to_admin(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Promote user to admin"""
    target_user = db.execute(select(User).where(User.id == user_id)).scalar()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing_admin = db.execute(
        select(AdminUser).where(AdminUser.user_id == user_id)
    ).scalar()
    if existing_admin:
        raise HTTPException(status_code=400, detail="User is already admin")

    new_admin = AdminUser(
        user_id=user_id,
        role="admin",
        granted_by=admin_user.id
    )
    db.add(new_admin)
    db.commit()

    return {"message": f"{target_user.email} promoted to admin"}
