"""Seed a demo account with 6 months of realistic data.

Login: demo@aurum.app / demo1234

Callable directly (python -m app.seed_demo) or imported and invoked on
API startup — Render's free tier disk is ephemeral, so re-seeding on
boot keeps the live portfolio demo populated after every cold start.
"""

import json
import random
from datetime import datetime, timedelta

from .database import Base, SessionLocal, engine
from .defaults import DEFAULT_CATEGORIES
from .models import Budget, Category, Goal, Subscription, Transaction, User
from .security import hash_password

EMAIL = "demo@aurum.app"


def run_seed():
    random.seed(42)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    existing = db.query(User).filter(User.email == EMAIL).first()
    if existing:
        uid = existing.id
        for model in (Transaction, Goal, Budget, Category, Subscription):
            db.query(model).filter(model.user_id == uid).delete()
        db.delete(existing)
        db.commit()
        print("[seed] removed previous demo user")

    user = User(
        name="Ishita Singh",
        email=EMAIL,
        password_hash=hash_password("demo1234"),
        avatar="🦩",
        verified=True,
    )
    db.add(user)
    db.flush()

    for c in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user.id, **c))

    # ── budgets ──────────────────────────────────────────────────────────
    for cat, amt in {
        "overall": 45000, "food": 9000, "travel": 5000, "groceries": 6000,
        "shopping": 4000, "rent": 15000, "bills": 3500, "fun": 3000, "health": 2000,
    }.items():
        db.add(Budget(user_id=user.id, category=cat, amount=amt))

    # ── goals ────────────────────────────────────────────────────────────
    now = datetime.now()
    db.add(Goal(user_id=user.id, name="Emergency fund", icon="🛟", color="#5BC8AF",
                target=100000, saved=68000, reached=json.dumps([25, 50]),
                deadline=now + timedelta(days=180)))
    db.add(Goal(user_id=user.id, name="Goa trip", icon="🏖️", color="#FFA26B",
                target=25000, saved=18500, reached=json.dumps([25, 50, 75]),
                deadline=now + timedelta(days=60)))
    db.add(Goal(user_id=user.id, name="New camera", icon="📷", color="#C79BFF",
                target=52000, saved=52000, reached=json.dumps([25, 50, 75, 100]),
                completed_at=now - timedelta(days=12)))

    # ── subscriptions ────────────────────────────────────────────────────
    subs = [
        ("Netflix", "🎬", "#FF8FA3", 649, "monthly", 9),
        ("Spotify", "🎧", "#77C97F", 119, "monthly", 17),
        ("iCloud+", "☁️", "#7FB5FF", 75, "monthly", 3),
        ("Gym", "🏋️", "#FFA26B", 1500, "monthly", 24),
        ("Amazon Prime", "📦", "#FFC94D", 1499, "yearly", 200),
    ]
    for name, icon, color, amount, cycle, days in subs:
        db.add(Subscription(user_id=user.id, name=name, icon=icon, color=color,
                            amount=amount, cycle=cycle, next_renewal=now + timedelta(days=days)))

    # ── six months of transactions ───────────────────────────────────────
    EXPENSES = [
        ("food", "Swiggy dinner", 250, 550), ("food", "Zomato lunch", 180, 420),
        ("food", "Chai & snacks", 40, 140), ("food", "Cafe brunch", 300, 700),
        ("travel", "Ola to office", 120, 320), ("travel", "Uber home", 150, 380),
        ("travel", "Metro card top-up", 200, 200), ("travel", "Petrol", 500, 900),
        ("groceries", "Blinkit order", 250, 800), ("groceries", "BigBasket weekly", 700, 1600),
        ("shopping", "Myntra order", 700, 2400), ("shopping", "Amazon gadgets", 400, 1800),
        ("bills", "Electricity", 900, 1500), ("bills", "WiFi", 799, 799), ("bills", "Mobile recharge", 299, 299),
        ("fun", "Movie night", 400, 900), ("fun", "Board game cafe", 300, 600),
        ("health", "Pharmacy", 150, 500), ("health", "Yoga class", 500, 500),
        ("other", "Gift for friend", 400, 1200),
    ]

    for month_back in range(5, -1, -1):
        m_anchor = (now.replace(day=15) - timedelta(days=30 * month_back))
        y, m = m_anchor.year, m_anchor.month
        days_in = 28 if m == 2 else 30

        db.add(Transaction(user_id=user.id, type="income", amount=75000, category="salary",
                           note="Salary", date=datetime(y, m, 1, 10, 0)))
        if random.random() < 0.4:
            db.add(Transaction(user_id=user.id, type="income",
                               amount=random.choice([1200, 2500, 4000]), category="other",
                               note=random.choice(["Freelance logo", "Cashback", "Sold old phone"]),
                               date=datetime(y, m, random.randint(8, 25), 18, 30)))
        db.add(Transaction(user_id=user.id, type="expense", amount=15000, category="rent",
                           note="Rent", date=datetime(y, m, 2, 9, 0)))
        db.add(Transaction(user_id=user.id, type="expense", amount=8000, category="investments",
                           note="Index fund SIP", date=datetime(y, m, 5, 8, 0)))

        n_txns = random.randint(26, 38)
        for _ in range(n_txns):
            cat, note, lo, hi = random.choice(EXPENSES)
            day = random.randint(1, days_in)
            if month_back == 0 and day > now.day:
                continue
            db.add(Transaction(
                user_id=user.id, type="expense",
                amount=round(random.uniform(lo, hi) / 10) * 10,
                category=cat, note=note,
                date=datetime(y, m, day, random.randint(8, 22), random.randint(0, 59)),
            ))

    db.commit()
    count = db.query(Transaction).filter(Transaction.user_id == user.id).count()
    print(f"[seed] demo user ready — demo@aurum.app / demo1234 · {count} transactions")
    db.close()


if __name__ == "__main__":
    run_seed()
