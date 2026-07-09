import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Goal, User
from ..schemas import ContributeIn, GoalIn, GoalPatch, goal_out
from ..security import current_user

router = APIRouter(prefix="/api/goals", tags=["goals"])

MILESTONES = [25, 50, 75, 100]


@router.get("")
def list_goals(user: User = Depends(current_user), db: Session = Depends(get_db)):
    goals = db.scalars(select(Goal).where(Goal.user_id == user.id).order_by(Goal.created_at)).all()
    return {"goals": [goal_out(g) for g in goals]}


@router.post("", status_code=201)
def create_goal(body: GoalIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    g = Goal(
        user_id=user.id, name=body.name.strip(), icon=body.icon, color=body.color,
        target=body.target, saved=min(body.saved, body.target),
        deadline=body.deadline.replace(tzinfo=None) if body.deadline else None,
    )
    db.add(g)
    db.commit()
    return {"goal": goal_out(g)}


def _own_goal(goal_id: int, user: User, db: Session) -> Goal:
    g = db.get(Goal, goal_id)
    if not g or g.user_id != user.id:
        raise HTTPException(404, "Goal not found")
    return g


@router.patch("/{goal_id}")
def update_goal(goal_id: int, body: GoalPatch, user: User = Depends(current_user), db: Session = Depends(get_db)):
    g = _own_goal(goal_id, user, db)
    data = body.model_dump(exclude_none=True)
    if "deadline" in data:
        data["deadline"] = data["deadline"].replace(tzinfo=None)
    for k, v in data.items():
        setattr(g, k, v)
    db.commit()
    return {"goal": goal_out(g)}


@router.post("/{goal_id}/contribute")
def contribute(goal_id: int, body: ContributeIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    g = _own_goal(goal_id, user, db)
    g.saved = max(0.0, round(g.saved + body.amount, 2))

    pct = g.saved / g.target * 100 if g.target else 0
    reached = set(json.loads(g.reached or "[]"))
    newly = [m for m in MILESTONES if pct >= m and m not in reached]
    reached.update(newly)
    g.reached = json.dumps(sorted(reached))

    if pct >= 100 and not g.completed_at:
        g.completed_at = datetime.now(timezone.utc).replace(tzinfo=None)
    elif pct < 100:
        g.completed_at = None
    db.commit()
    return {"goal": goal_out(g), "newMilestones": newly}


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_own_goal(goal_id, user, db))
    db.commit()
    return {"ok": True}
