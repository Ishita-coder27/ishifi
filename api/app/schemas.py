import json
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ── auth ────────────────────────────────────────────────────────────────
class SignupIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)


class LoginIn(BaseModel):
    email: EmailStr
    password: str
    remember: bool = True


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str = Field(min_length=10)
    password: str = Field(min_length=8, max_length=100)


class VerifyIn(BaseModel):
    token: str = Field(min_length=10)


class PasswordChangeIn(BaseModel):
    current: str
    next: str = Field(min_length=8, max_length=100)


class ProfilePatch(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    avatar: str | None = Field(default=None, max_length=8)
    currency: str | None = Field(default=None, max_length=4)
    language: str | None = Field(default=None, max_length=8)
    theme: str | None = Field(default=None, max_length=30)
    notifications: dict[str, bool] | None = None


def user_out(u) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "avatar": u.avatar,
        "verified": u.verified,
        "currency": u.currency,
        "language": u.language,
        "theme": u.theme,
        "notifications": json.loads(u.notifications or "{}"),
        "createdAt": u.created_at.isoformat() if u.created_at else None,
    }


# ── transactions ────────────────────────────────────────────────────────
class TxIn(BaseModel):
    type: str = Field(pattern="^(income|expense)$")
    amount: float = Field(gt=0)
    category: str = Field(min_length=1, max_length=40)
    note: str = Field(default="", max_length=300)
    date: datetime


class TxPatch(BaseModel):
    type: str | None = Field(default=None, pattern="^(income|expense)$")
    amount: float | None = Field(default=None, gt=0)
    category: str | None = Field(default=None, min_length=1, max_length=40)
    note: str | None = Field(default=None, max_length=300)
    date: datetime | None = None


class BulkDeleteIn(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


def tx_out(t) -> dict:
    return {
        "id": t.id,
        "type": t.type,
        "amount": t.amount,
        "category": t.category,
        "note": t.note,
        "date": t.date.isoformat(),
        "createdAt": t.created_at.isoformat() if t.created_at else None,
    }


# ── categories ──────────────────────────────────────────────────────────
class CategoryIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    icon: str = Field(default="🏷️", max_length=8)
    color: str = Field(default="#FF6FAE", max_length=9)


class CategoryPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    icon: str | None = Field(default=None, max_length=8)
    color: str | None = Field(default=None, max_length=9)


def cat_out(c) -> dict:
    return {"id": c.id, "slug": c.slug, "name": c.name, "icon": c.icon, "color": c.color}


# ── budgets ─────────────────────────────────────────────────────────────
class BudgetIn(BaseModel):
    category: str = Field(min_length=1, max_length=40)  # slug or "overall"
    amount: float = Field(ge=0)


# ── goals ───────────────────────────────────────────────────────────────
class GoalIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    icon: str = Field(default="🎯", max_length=8)
    color: str = Field(default="#FF6FAE", max_length=9)
    target: float = Field(gt=0)
    saved: float = Field(default=0, ge=0)
    deadline: datetime | None = None


class GoalPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    icon: str | None = Field(default=None, max_length=8)
    color: str | None = Field(default=None, max_length=9)
    target: float | None = Field(default=None, gt=0)
    deadline: datetime | None = None


class ContributeIn(BaseModel):
    amount: float  # negative allowed = withdraw


def goal_out(g) -> dict:
    return {
        "id": g.id,
        "name": g.name,
        "icon": g.icon,
        "color": g.color,
        "target": g.target,
        "saved": g.saved,
        "deadline": g.deadline.isoformat() if g.deadline else None,
        "completedAt": g.completed_at.isoformat() if g.completed_at else None,
        "reached": json.loads(g.reached or "[]"),
        "createdAt": g.created_at.isoformat() if g.created_at else None,
    }


# ── subscriptions ───────────────────────────────────────────────────────
class SubIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    icon: str = Field(default="🔁", max_length=8)
    color: str = Field(default="#C79BFF", max_length=9)
    amount: float = Field(gt=0)
    cycle: str = Field(default="monthly", pattern="^(monthly|yearly)$")
    nextRenewal: datetime
    active: bool = True


class SubPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    icon: str | None = Field(default=None, max_length=8)
    color: str | None = Field(default=None, max_length=9)
    amount: float | None = Field(default=None, gt=0)
    cycle: str | None = Field(default=None, pattern="^(monthly|yearly)$")
    nextRenewal: datetime | None = None
    active: bool | None = None


def sub_out(s) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "icon": s.icon,
        "color": s.color,
        "amount": s.amount,
        "cycle": s.cycle,
        "nextRenewal": s.next_renewal.isoformat(),
        "active": s.active,
    }


# ── import ──────────────────────────────────────────────────────────────
class ImportIn(BaseModel):
    transactions: list[TxIn] = Field(max_length=20000)


# ── family ──────────────────────────────────────────────────────────────
class FamilyOut(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FamilyInviteIn(BaseModel):
    email: EmailStr


class FamilyInviteAcceptIn(BaseModel):
    token: str


# ── TIER 5: ENTERPRISE ──────────────────────────────────────────────────────
class TwoFactorSetupOut(BaseModel):
    secret: str
    qr_code: str  # Data URI for QR code
    backup_codes: list[str]


class TwoFactorVerifyIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class TwoFactorEnableIn(BaseModel):
    code: str = Field(min_length=6, max_length=6)


class AuditLogOut(BaseModel):
    id: int
    user_id: int
    action: str
    resource_type: str
    resource_id: int | None
    old_values: dict | None
    new_values: dict | None
    ip_address: str | None
    status: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminDashboardOut(BaseModel):
    total_users: int
    active_users: int
    total_transactions: int
    total_revenue: float
    user_growth: list[dict]  # {date, count}
    top_categories: list[dict]  # {category, count}
    avg_savings_rate: float


class UserAdminOut(BaseModel):
    id: int
    name: str
    email: str
    verified: bool
    created_at: datetime
    last_activity: datetime | None
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)


class UserSessionOut(BaseModel):
    id: int
    device_name: str | None
    device_type: str | None
    ip_address: str | None
    last_activity: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
