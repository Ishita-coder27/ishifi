"""AI/ML-powered insights — anomalies, predictions, smart suggestions."""

from fastapi import APIRouter, Depends, HTTPException

from ..ml import SpendingAnalyzer, analyze_user
from ..security import current_user
from ..models import User

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.get("/anomalies")
def detect_anomalies(user: User = Depends(current_user)):
    """Detect unusual spending patterns in the last 90 days."""
    analyzer = SpendingAnalyzer(user.id)
    try:
        anomalies = analyzer.detect_anomalies(threshold=0.15)
        return {
            "anomalies": anomalies,
            "count": len(anomalies),
            "message": (
                f"Found {len(anomalies)} unusual spending patterns"
                if anomalies else "Your spending looks normal — no anomalies detected"
            ),
        }
    finally:
        analyzer.close()


@router.get("/predict-next-month")
def predict_spending(user: User = Depends(current_user)):
    """Forecast category spending for next month."""
    analyzer = SpendingAnalyzer(user.id)
    try:
        predictions = analyzer.predict_next_month()
        if not predictions:
            return {
                "message": "Need more historical data to predict (at least 3 months)",
                "predictions": {},
            }
        total_predicted = sum(p["predicted"] for p in predictions.values())
        return {
            "predictions": predictions,
            "total_predicted": round(total_predicted, 2),
            "confidence": "medium" if len(predictions) >= 5 else "low",
        }
    finally:
        analyzer.close()


@router.post("/suggest-category")
def suggest_category(note: str, user: User = Depends(current_user)):
    """Suggest a category for a transaction based on its note."""
    if not note or not note.strip():
        return {"category": "other", "confidence": 0.0}

    analyzer = SpendingAnalyzer(user.id)
    try:
        category, confidence = analyzer.suggest_category(note)
        return {
            "suggested_category": category,
            "confidence": round(confidence, 2),
            "note": note,
        }
    finally:
        analyzer.close()


@router.get("/insights")
def get_insights(user: User = Depends(current_user)):
    """Generate personalized spending insights."""
    analyzer = SpendingAnalyzer(user.id)
    try:
        insights = analyzer.generate_insights()
        return {
            "insights": insights,
            "count": len(insights),
            "generated_at": __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ).isoformat(),
        }
    finally:
        analyzer.close()


@router.get("/full-analysis")
def full_analysis(user: User = Depends(current_user)):
    """Run complete ML analysis: anomalies + predictions + insights."""
    result = analyze_user(user.id)
    return {
        "analysis": result,
        "summary": {
            "anomaly_count": len(result["anomalies"]),
            "prediction_categories": len(result["predictions"]),
            "insight_count": len(result["insights"]),
        },
    }
