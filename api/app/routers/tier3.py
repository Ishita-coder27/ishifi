"""Tier 3: Advanced Analytics — Forecasting, heatmaps, trends, financial health."""

from fastapi import APIRouter, Depends

from ..security import current_user
from ..models import User
from ..tier3 import analyze_tier3

router = APIRouter(prefix="/api/tier3", tags=["tier3"])


@router.get("/full-analysis")
def get_full_tier3_analysis(user: User = Depends(current_user)):
    """Complete Tier 3 analysis: forecasting, heatmaps, trends, health, optimization."""
    result = analyze_tier3(user.id)
    return {
        "analysis": result,
        "summary": {
            "total_insights": (
                len(result.get("recommendations", [])) +
                len(result.get("spending_optimization", [])) +
                len(result.get("goal_predictions", {}))
            ),
        },
    }


@router.get("/savings-forecast")
def get_savings_forecast(months: int = 6, user: User = Depends(current_user)):
    """Forecast savings for next 6/12 months."""
    from ..tier3 import AdvancedAnalytics
    analyzer = AdvancedAnalytics(user.id)
    try:
        return analyzer.get_savings_forecast(months)
    finally:
        analyzer.close()


@router.get("/spending-heatmap")
def get_spending_heatmap(user: User = Depends(current_user)):
    """Peak spending hours, days, seasons."""
    from ..tier3 import AdvancedAnalytics
    analyzer = AdvancedAnalytics(user.id)
    try:
        return analyzer.get_spending_heatmap()
    finally:
        analyzer.close()


@router.get("/category-trends")
def get_category_trends(user: User = Depends(current_user)):
    """Category trends: % change month-over-month."""
    from ..tier3 import AdvancedAnalytics
    analyzer = AdvancedAnalytics(user.id)
    try:
        return analyzer.get_category_trends()
    finally:
        analyzer.close()


@router.get("/financial-health")
def get_financial_health(user: User = Depends(current_user)):
    """Composite financial health score (0-100) with breakdown."""
    from ..tier3 import AdvancedAnalytics
    analyzer = AdvancedAnalytics(user.id)
    try:
        return analyzer.calculate_financial_health()
    finally:
        analyzer.close()


@router.get("/goal-predictions")
def get_goal_predictions(user: User = Depends(current_user)):
    """When will each goal be achieved?"""
    from ..tier3 import AdvancedAnalytics
    analyzer = AdvancedAnalytics(user.id)
    try:
        return analyzer.predict_goal_achievement()
    finally:
        analyzer.close()


@router.get("/spending-optimization")
def get_spending_optimization(user: User = Depends(current_user)):
    """Where to cut spending to optimize savings."""
    from ..tier3 import AdvancedAnalytics
    analyzer = AdvancedAnalytics(user.id)
    try:
        return analyzer.get_spending_optimization()
    finally:
        analyzer.close()


@router.get("/recommendations")
def get_smart_recommendations(user: User = Depends(current_user)):
    """Actionable financial recommendations."""
    from ..tier3 import AdvancedAnalytics
    analyzer = AdvancedAnalytics(user.id)
    try:
        return analyzer.get_smart_recommendations()
    finally:
        analyzer.close()
