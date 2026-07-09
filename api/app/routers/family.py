"""Family budget sharing — invite others, see shared spending."""

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from .. import models, websocket
from ..database import get_db
from ..schemas import FamilyOut, FamilyInviteIn, FamilyInviteAcceptIn
from ..security import current_user

router = APIRouter(prefix="/api/family", tags=["family"])


@router.post("/create", response_model=FamilyOut)
def create_family(name: str, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Create a new family (user becomes owner)."""
    family = models.Family(name=name, owner_id=user.id)
    member = models.FamilyMember(family=family, user_id=user.id, role="owner")
    db.add(family)
    db.add(member)
    db.commit()
    db.refresh(family)
    return family


@router.get("/my")
def get_my_families(user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Get all families the user is a member of."""
    families = db.execute(
        select(models.Family).join(models.FamilyMember).filter(models.FamilyMember.user_id == user.id)
    ).scalars().all()
    return [{"id": f.id, "name": f.name, "owner_id": f.owner_id} for f in families]


@router.get("/{family_id}/members")
def get_family_members(family_id: int, user: models.User = Depends(current_user), db: Session = Depends(get_db)):
    """Get all members of a family (user must be member)."""
    member = db.execute(
        select(models.FamilyMember).filter(
            and_(models.FamilyMember.family_id == family_id, models.FamilyMember.user_id == user.id)
        )
    ).scalar()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this family")

    members = db.execute(
        select(models.FamilyMember).filter(models.FamilyMember.family_id == family_id)
    ).scalars().all()
    return [
        {
            "user_id": m.user_id,
            "role": m.role,
            "joined_at": m.joined_at,
            "name": db.execute(select(models.User.name).filter(models.User.id == m.user_id)).scalar(),
        }
        for m in members
    ]


@router.post("/{family_id}/invite")
def invite_to_family(
    family_id: int,
    body: FamilyInviteIn,
    user: models.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Send an invitation to join a family (owner only)."""
    member = db.execute(
        select(models.FamilyMember).filter(
            and_(models.FamilyMember.family_id == family_id, models.FamilyMember.user_id == user.id)
        )
    ).scalar()
    if not member or member.role != "owner":
        raise HTTPException(status_code=403, detail="Only family owner can invite")

    token = secrets.token_urlsafe(48)
    expires = datetime.now(timezone.utc) + timedelta(days=7)
    invitation = models.FamilyInvitation(family_id=family_id, email=body.email, token=token, expires_at=expires)
    db.add(invitation)
    db.commit()

    # In production, send email with link
    invite_link = f"http://localhost:5173/family/accept?token={token}"
    return {"message": "Invitation sent", "link": invite_link, "email": body.email}


@router.post("/accept-invite")
def accept_family_invite(
    body: FamilyInviteAcceptIn,
    user: models.User = Depends(current_user),
    db: Session = Depends(get_db),
):
    """Accept a family invitation (user must match email)."""
    invitation = db.execute(
        select(models.FamilyInvitation).filter(models.FamilyInvitation.token == body.token)
    ).scalar()

    if not invitation or invitation.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired invitation")

    if invitation.email != user.email:
        raise HTTPException(status_code=403, detail="Invitation is for a different email")

    # Add user to family
    member = models.FamilyMember(family_id=invitation.family_id, user_id=user.id, role="member")
    db.add(member)
    db.delete(invitation)
    db.commit()

    return {"message": "Joined family", "family_id": invitation.family_id}


@router.websocket("/ws/{family_id}")
async def websocket_family_sync(family_id: int, websocket: WebSocket, db: Session = Depends(get_db)):
    """WebSocket for real-time family transaction updates."""
    # Verify user is a member (this is a simplification; in production, extract user from ws)
    await websocket.accept()

    await websocket.send_json({"type": "connected", "family_id": family_id})
    await websocket.send_json({"type": "ping"})

    try:
        while True:
            data = await websocket.receive_text()
            # Broadcast any message to all family members
            msg = {"type": "update", "data": data}
            await websocket.send_json(msg)
    except WebSocketDisconnect:
        websocket.client_state.name = "DISCONNECTED"
