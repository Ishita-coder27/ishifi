"""Machine learning features for IshiFi — predictions, anomalies, insights."""

import json
from collections import defaultdict
from datetime import datetime, timedelta, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.linear_model import LinearRegression

from . import models
from .database import SessionLocal


class SpendingAnalyzer:
    """ML-powered spending analysis."""

    def __init__(self, user_id: int):
        self.user_id = user_id
        self.db = SessionLocal()

    def get_transactions(self, days_back: int = 180):
        """Fetch user transactions from the past N days."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=days_back)
        txns = self.db.query(models.Transaction).filter(
            models.Transaction.user_id == self.user_id,
            models.Transaction.date >= cutoff,
            models.Transaction.type == "expense",
        ).all()
        return txns

    # ── anomaly detection ────────────────────────────────────────────────
    def detect_anomalies(self, threshold: float = 0.1) -> list[dict]:
        """Find unusual spending patterns using Isolation Forest.

        Returns list of anomalies with severity score (0-1).
        """
        txns = self.get_transactions(days_back=90)
        if len(txns) < 10:
            return []  # Need enough data

        # Prepare features: [amount, day_of_week, hour, category_encoding]
        X = []
        for tx in txns:
            dow = tx.date.weekday()
            hour = tx.date.hour
            cat_code = hash(tx.category) % 100  # Simple category encoding
            X.append([tx.amount, dow, hour, cat_code])

        X = np.array(X)
        if X.shape[0] < 10:
            return []

        # Train anomaly detector
        iso_forest = IsolationForest(contamination=threshold, random_state=42)
        predictions = iso_forest.fit_predict(X)
        scores = iso_forest.score_samples(X)  # Negative scores = anomalies

        anomalies = []
        for i, (tx, pred, score) in enumerate(zip(txns, predictions, scores)):
            if pred == -1:  # Anomaly detected
                severity = max(0, -score)  # Normalize to 0-1
                anomalies.append({
                    "transaction_id": tx.id,
                    "amount": tx.amount,
                    "category": tx.category,
                    "note": tx.note,
                    "date": tx.date.isoformat(),
                    "severity": min(1.0, severity),
                    "reason": self._anomaly_reason(tx, txns),
                })
        return sorted(anomalies, key=lambda x: x["severity"], reverse=True)[:5]

    def _anomaly_reason(self, tx: models.Transaction, all_txns: list) -> str:
        """Generate a human-readable reason for the anomaly."""
        cat_avg = np.mean([t.amount for t in all_txns if t.category == tx.category])
        if tx.amount > cat_avg * 2:
            return f"2x higher than typical {tx.category} spend"
        if tx.amount > np.percentile([t.amount for t in all_txns], 90):
            return "Top 10% spending in this category"
        return "Unusual pattern detected"

    # ── spending prediction ──────────────────────────────────────────────
    def predict_next_month(self) -> dict:
        """Forecast spending for next month by category using linear regression."""
        txns = self.get_transactions(days_back=180)
        if len(txns) < 20:
            return {}

        # Group by month and category
        monthly_data = defaultdict(lambda: defaultdict(float))
        for tx in txns:
            month_key = tx.date.strftime("%Y-%m")
            monthly_data[month_key][tx.category] += tx.amount

        predictions = {}
        for category in set(tx.category for tx in txns):
            months = sorted(monthly_data.keys())
            if len(months) < 3:
                continue

            # Prepare training data
            X = np.array([i for i in range(len(months))]).reshape(-1, 1)
            y = np.array([monthly_data[m].get(category, 0) for m in months])

            if y.sum() == 0:
                continue

            # Train linear regression
            model = LinearRegression()
            model.fit(X, y)

            # Predict next month
            next_idx = len(months)
            pred = max(0, model.predict([[next_idx]])[0])

            predictions[category] = {
                "predicted": round(pred, 2),
                "current_month": round(monthly_data[months[-1]].get(category, 0), 2),
                "trend": "↑" if model.coef_[0] > 0 else "↓",
            }

        return predictions

    # ── smart categorization ─────────────────────────────────────────────
    def suggest_category(self, note: str) -> tuple[str, float]:
        """Suggest a category for a transaction based on its note.

        Returns (category_slug, confidence) tuple.
        """
        if not note:
            return ("other", 0.0)

        note_lower = note.lower()
        from .defaults import DEFAULT_CATEGORIES

        # Simple keyword matching with scoring
        best_match = None
        best_score = 0.0

        for category, keywords in DEFAULT_CATEGORIES.items():
            for keyword in keywords:
                if keyword in note_lower:
                    # Score based on match quality
                    keyword_len = len(keyword)
                    note_len = len(note_lower)
                    score = min(1.0, keyword_len / note_len)

                    if score > best_score:
                        best_score = score
                        best_match = category

        return (best_match or "other", best_score)

    # ── personalized insights ────────────────────────────────────────────
    def generate_insights(self) -> list[str]:
        """Generate personalized spending insights."""
        txns = self.get_transactions(days_back=90)
        if not txns:
            return []

        insights = []
        df = pd.DataFrame([
            {
                "amount": t.amount,
                "category": t.category,
                "date": t.date,
                "day_of_week": t.date.strftime("%A"),
                "hour": t.date.hour,
            }
            for t in txns
        ])

        # Insight 1: Highest spending category
        top_cat = df.groupby("category")["amount"].sum().idxmax()
        top_amt = df[df["category"] == top_cat]["amount"].sum()
        insights.append(f"💸 {top_cat.title()} is your biggest spend at ₹{int(top_amt)}")

        # Insight 2: Day of week pattern
        dow_spending = df.groupby("day_of_week")["amount"].sum()
        heaviest_day = dow_spending.idxmax()
        insights.append(f"📅 You spend most on {heaviest_day}s")

        # Insight 3: Time of day pattern
        morning_spend = df[df["hour"] < 12]["amount"].sum()
        evening_spend = df[(df["hour"] >= 18)]["amount"].sum()
        if evening_spend > morning_spend:
            insights.append("🌙 Most spending happens in the evening")
        else:
            insights.append("☀️ You're an early spender — most action before noon")

        # Insight 4: Savings opportunity
        avg_daily = df["amount"].sum() / 90
        if avg_daily > 500:
            potential = avg_daily * 0.1  # 10% reduction
            insights.append(f"💡 Cutting 10% could save ₹{int(potential)}/day = ₹{int(potential*30)}/month")

        # Insight 5: Frequency vs amount
        freq = len(df)
        if freq > 90:
            insights.append(f"⚡ You log {freq} transactions — that's {freq//3}/day on average")

        return insights[:5]  # Return top 5 insights

    def close(self):
        """Close the database session."""
        self.db.close()


def analyze_user(user_id: int) -> dict:
    """Run full ML analysis for a user."""
    analyzer = SpendingAnalyzer(user_id)

    try:
        return {
            "anomalies": analyzer.detect_anomalies(),
            "predictions": analyzer.predict_next_month(),
            "insights": analyzer.generate_insights(),
        }
    finally:
        analyzer.close()
