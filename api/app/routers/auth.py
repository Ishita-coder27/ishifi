import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import config
from ..database import get_db
from ..defaults import DEFAULT_CATEGORIES
from ..mailer import send_mail
from ..models import Category, User
from ..schemas import ForgotIn, LoginIn, ResetIn, SignupIn, VerifyIn, user_out
from ..security import (
    clear_refresh_cookie, current_user, hash_password, rate_limit, read_refresh,
    set_refresh_cookie, sign_access, verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])
limited = rate_limit(limit=40, window_s=900)


def session_payload(response: Response, user: User, remember: bool = True) -> dict:
    set_refresh_cookie(response, user, remember)
    return {"accessToken": sign_access(user), "user": user_out(user)}


@router.post("/signup", status_code=201, dependencies=[limited])
def signup(body: SignupIn, response: Response, db: Session = Depends(get_db)):
    email = body.email.lower()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "An account with this email already exists")
    user = User(
        name=body.name.strip(),
        email=email,
        password_hash=hash_password(body.password),
        verify_token=secrets.token_hex(24),
    )
    db.add(user)
    db.flush()
    for c in DEFAULT_CATEGORIES:
        db.add(Category(user_id=user.id, **c))
    db.commit()
    dev_link = send_mail(email, "Verify your IshiFi account",
                         f"{config.CLIENT_ORIGIN}/verify?token={user.verify_token}")
    return {**session_payload(response, user), "devVerifyLink": dev_link}


@router.post("/login", dependencies=[limited])
def login(body: LoginIn, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Wrong email or password")
    return session_payload(response, user, body.remember)


@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    payload = read_refresh(request)
    user = db.get(User, int(payload["sub"]))
    if not user or user.token_version != payload.get("tv"):
        raise HTTPException(401, "Session revoked")
    return session_payload(response, user)


@router.post("/logout")
def logout(response: Response):
    clear_refresh_cookie(response)
    return {"ok": True}


@router.post("/verify")
def verify_email(body: VerifyIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.verify_token == body.token))
    if not user:
        raise HTTPException(400, "Invalid or used verification link")
    user.verified = True
    user.verify_token = None
    db.commit()
    return {"ok": True}


@router.post("/resend-verification")
def resend_verification(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.verified:
        return {"ok": True, "alreadyVerified": True}
    if not user.verify_token:
        user.verify_token = secrets.token_hex(24)
        db.commit()
    dev_link = send_mail(user.email, "Verify your IshiFi account",
                         f"{config.CLIENT_ORIGIN}/verify?token={user.verify_token}")
    return {"ok": True, "devVerifyLink": dev_link}


@router.post("/forgot", dependencies=[limited])
def forgot(body: ForgotIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == body.email.lower()))
    dev_link = None
    if user:
        user.reset_token = secrets.token_hex(24)
        user.reset_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
        dev_link = send_mail(user.email, "Reset your IshiFi password",
                             f"{config.CLIENT_ORIGIN}/reset?token={user.reset_token}")
    # Always 200 — never reveal which emails exist.
    return {"ok": True, "devResetLink": dev_link}


@router.post("/reset", dependencies=[limited])
def reset(body: ResetIn, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.reset_token == body.token))
    expires = user.reset_expires if user else None
    if expires is not None and expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if not user or not expires or expires < datetime.now(timezone.utc):
        raise HTTPException(400, "This reset link is invalid or expired")
    user.password_hash = hash_password(body.password)
    user.reset_token = None
    user.reset_expires = None
    user.token_version += 1  # revoke all sessions
    db.commit()
    return {"ok": True}
