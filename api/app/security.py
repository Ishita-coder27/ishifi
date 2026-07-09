import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from . import config
from .database import get_db
from .models import User

REFRESH_COOKIE = "aurum_rt"


# ── passwords ───────────────────────────────────────────────────────────
def hash_password(raw: str) -> str:
    return bcrypt.hashpw(raw.encode(), bcrypt.gensalt(rounds=10)).decode()


def verify_password(raw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(raw.encode(), hashed.encode())
    except ValueError:
        return False


# ── tokens ──────────────────────────────────────────────────────────────
def sign_access(user: User) -> str:
    return jwt.encode(
        {
            "sub": str(user.id),
            "email": user.email,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=config.ACCESS_TTL_MIN),
        },
        config.ACCESS_SECRET,
        algorithm="HS256",
    )


def sign_refresh(user: User) -> str:
    return jwt.encode(
        {
            "sub": str(user.id),
            "tv": user.token_version,
            "exp": datetime.now(timezone.utc) + timedelta(days=config.REFRESH_TTL_DAYS),
        },
        config.REFRESH_SECRET,
        algorithm="HS256",
    )


def set_refresh_cookie(response: Response, user: User, remember: bool = True):
    kwargs = dict(
        key=REFRESH_COOKIE,
        value=sign_refresh(user),
        httponly=True,
        samesite=config.COOKIE_SAMESITE,
        secure=not config.IS_DEV,
        path="/api/auth",
    )
    if remember:
        kwargs["max_age"] = config.REFRESH_TTL_DAYS * 24 * 60 * 60
    response.set_cookie(**kwargs)


def clear_refresh_cookie(response: Response):
    response.delete_cookie(REFRESH_COOKIE, path="/api/auth")


def read_refresh(request: Request) -> dict:
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        return jwt.decode(token, config.REFRESH_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Session expired")


# ── auth dependency ─────────────────────────────────────────────────────
def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    header = request.headers.get("authorization", "")
    token = header[7:] if header.startswith("Bearer ") else None
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = jwt.decode(token, config.ACCESS_SECRET, algorithms=["HS256"])
    except jwt.PyJWTError:
        raise HTTPException(401, "Session expired")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(401, "Account no longer exists")
    return user


# ── tiny in-memory rate limiter (per IP, sliding window) ────────────────
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(limit: int = 40, window_s: int = 900):
    def dep(request: Request):
        key = f"{request.client.host}:{request.url.path}"
        now = time.monotonic()
        q = _hits[key]
        while q and now - q[0] > window_s:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(429, "Too many attempts — try again in a bit")
        q.append(now)

    return Depends(dep)
