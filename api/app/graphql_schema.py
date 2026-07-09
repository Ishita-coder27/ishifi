"""Tier 6: GraphQL API for efficient data fetching.

Replaces REST for complex queries:
- Clients fetch only needed fields
- Reduces over-fetching and under-fetching
- Better for mobile (less bandwidth)
- Automatic field caching
"""

from datetime import datetime
from typing import Optional, List
import strawberry
from strawberry.types import Info


@strawberry.type
class UserGQL:
    """GraphQL User type"""
    id: int
    name: str
    email: str
    verified: bool
    created_at: datetime
    currency: str
    theme: str


@strawberry.type
class TransactionGQL:
    """GraphQL Transaction type"""
    id: int
    type: str  # income | expense
    amount: float
    category: str
    note: str
    date: datetime


@strawberry.type
class BudgetGQL:
    """GraphQL Budget type"""
    id: int
    category: str
    amount: float
    spent: Optional[float] = 0


@strawberry.type
class GoalGQL:
    """GraphQL Goal type"""
    id: int
    name: str
    target: float
    saved: float
    deadline: Optional[datetime] = None
    completed_at: Optional[datetime] = None


@strawberry.type
class DashboardStatsGQL:
    """GraphQL Dashboard stats type"""
    today_spent: float
    month_spent: float
    month_income: float
    savings_rate: float
    month_budget: Optional[float] = None


@strawberry.type
class Query:
    """GraphQL Query root"""

    @strawberry.field
    async def me(self, info: Info) -> Optional[UserGQL]:
        """Get current authenticated user"""
        # Get user from context (set by middleware)
        user = info.context.get("user")
        if not user:
            return None
        return UserGQL(
            id=user.id,
            name=user.name,
            email=user.email,
            verified=user.verified,
            created_at=user.created_at,
            currency=user.currency,
            theme=user.theme,
        )

    @strawberry.field
    async def transactions(
        self,
        info: Info,
        limit: int = 50,
        offset: int = 0,
    ) -> List[TransactionGQL]:
        """Get user's transactions with pagination"""
        from .database import get_db
        from .models import Transaction
        from sqlalchemy import select

        user = info.context.get("user")
        if not user:
            return []

        db = next(get_db())
        try:
            txns = db.execute(
                select(Transaction)
                .where(Transaction.user_id == user.id)
                .limit(limit)
                .offset(offset)
            ).scalars().all()

            return [
                TransactionGQL(
                    id=t.id,
                    type=t.type,
                    amount=t.amount,
                    category=t.category,
                    note=t.note,
                    date=t.date,
                )
                for t in txns
            ]
        finally:
            db.close()

    @strawberry.field
    async def budgets(self, info: Info) -> List[BudgetGQL]:
        """Get user's budgets"""
        from .database import get_db
        from .models import Budget
        from sqlalchemy import select

        user = info.context.get("user")
        if not user:
            return []

        db = next(get_db())
        try:
            budgets = db.execute(
                select(Budget).where(Budget.user_id == user.id)
            ).scalars().all()

            return [
                BudgetGQL(
                    id=b.id,
                    category=b.category,
                    amount=b.amount,
                    spent=0,  # Would be calculated from transactions
                )
                for b in budgets
            ]
        finally:
            db.close()

    @strawberry.field
    async def goals(self, info: Info) -> List[GoalGQL]:
        """Get user's savings goals"""
        from .database import get_db
        from .models import Goal
        from sqlalchemy import select

        user = info.context.get("user")
        if not user:
            return []

        db = next(get_db())
        try:
            goals = db.execute(
                select(Goal).where(Goal.user_id == user.id)
            ).scalars().all()

            return [
                GoalGQL(
                    id=g.id,
                    name=g.name,
                    target=g.target,
                    saved=g.saved,
                    deadline=g.deadline,
                    completed_at=g.completed_at,
                )
                for g in goals
            ]
        finally:
            db.close()

    @strawberry.field
    async def dashboard_stats(self, info: Info) -> Optional[DashboardStatsGQL]:
        """Get dashboard statistics"""
        from .database import get_db
        from .models import Transaction, Budget
        from sqlalchemy import select, func
        from datetime import datetime, timedelta

        user = info.context.get("user")
        if not user:
            return None

        db = next(get_db())
        try:
            today = datetime.utcnow().date()
            month_start = datetime(today.year, today.month, 1)

            # Today spent
            today_spent = db.execute(
                select(func.sum(Transaction.amount))
                .where(
                    Transaction.user_id == user.id,
                    Transaction.type == "expense",
                    Transaction.date >= today,
                )
            ).scalar() or 0

            # Month spent
            month_spent = db.execute(
                select(func.sum(Transaction.amount))
                .where(
                    Transaction.user_id == user.id,
                    Transaction.type == "expense",
                    Transaction.date >= month_start,
                )
            ).scalar() or 0

            # Month income
            month_income = db.execute(
                select(func.sum(Transaction.amount))
                .where(
                    Transaction.user_id == user.id,
                    Transaction.type == "income",
                    Transaction.date >= month_start,
                )
            ).scalar() or 0

            # Savings rate
            savings_rate = 0
            if month_income > 0:
                savings_rate = ((month_income - month_spent) / month_income) * 100

            # Month budget
            overall_budget = db.execute(
                select(Budget).where(
                    Budget.user_id == user.id,
                    Budget.category == "overall",
                )
            ).scalar()

            return DashboardStatsGQL(
                today_spent=today_spent,
                month_spent=month_spent,
                month_income=month_income,
                savings_rate=savings_rate,
                month_budget=overall_budget.amount if overall_budget else None,
            )
        finally:
            db.close()


schema = strawberry.Schema(query=Query)
