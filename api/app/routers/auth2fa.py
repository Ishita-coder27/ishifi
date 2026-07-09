"""Two-factor authentication and advanced security features."""

import secrets
import qrcode
import io
import base64
import pyotp
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException

from ..database import get_db
from ..models import User, TwoFactorAuth, AuditLog
from ..schemas import TwoFactorSetupOut, TwoFactorVerifyIn, TwoFactorEnableIn
from ..security import current_user

router = APIRouter(prefix="/api/auth/2fa", tags=["2fa"])


def log_audit(db: Session, user_id: int, action: str, status: str = "success", error: str = None):
    """Helper to log actions"""
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type="auth",
        status=status,
        error_message=error
    )
    db.add(log)
    db.commit()


@router.post("/setup", response_model=TwoFactorSetupOut)
def setup_2fa(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Generate 2FA secret and QR code"""

    # Check if already set up
    existing = db.execute(
        select(TwoFactorAuth).where(TwoFactorAuth.user_id == user.id)
    ).scalar()
    if existing and existing.enabled:
        raise HTTPException(status_code=400, detail="2FA already enabled for this account")

    # Generate secret
    secret = pyotp.random_base32()

    # Generate QR code
    totp = pyotp.TOTP(secret)
    qr_uri = totp.provisioning_uri(name=user.email, issuer_name="IshiFi")

    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    # Convert to data URI
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_byte_arr.seek(0)
    img_base64 = base64.b64encode(img_byte_arr.getvalue()).decode()
    qr_code = f"data:image/png;base64,{img_base64}"

    # Generate backup codes
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]

    # Save temporarily (not enabled yet)
    tfa = db.execute(
        select(TwoFactorAuth).where(TwoFactorAuth.user_id == user.id)
    ).scalar()

    if tfa:
        tfa.secret = secret
        tfa.backup_codes = str(backup_codes)
    else:
        tfa = TwoFactorAuth(
            user_id=user.id,
            secret=secret,
            backup_codes=str(backup_codes)
        )
        db.add(tfa)

    db.commit()
    log_audit(db, user.id, "2fa_setup_initiated")

    return TwoFactorSetupOut(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )


@router.post("/enable")
def enable_2fa(body: TwoFactorEnableIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Verify code and enable 2FA"""

    tfa = db.execute(
        select(TwoFactorAuth).where(TwoFactorAuth.user_id == user.id)
    ).scalar()

    if not tfa or not tfa.secret:
        raise HTTPException(status_code=400, detail="Please set up 2FA first")

    # Verify code
    totp = pyotp.TOTP(tfa.secret)
    if not totp.verify(body.code):
        log_audit(db, user.id, "2fa_enable_failed", "failed", "Invalid code")
        raise HTTPException(status_code=400, detail="Invalid verification code")

    # Enable 2FA
    tfa.enabled = True
    tfa.verified_at = datetime.utcnow()
    db.commit()

    log_audit(db, user.id, "2fa_enabled")

    return {"message": "2FA enabled successfully"}


@router.post("/verify")
def verify_2fa_code(body: TwoFactorVerifyIn, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Verify 2FA code during login"""

    tfa = db.execute(
        select(TwoFactorAuth).where(TwoFactorAuth.user_id == user.id)
    ).scalar()

    if not tfa or not tfa.enabled:
        raise HTTPException(status_code=400, detail="2FA not enabled")

    # Verify TOTP code
    totp = pyotp.TOTP(tfa.secret)
    if not totp.verify(body.code):
        log_audit(db, user.id, "2fa_verify_failed", "failed", "Invalid code")
        raise HTTPException(status_code=401, detail="Invalid 2FA code")

    log_audit(db, user.id, "2fa_verified")
    return {"message": "2FA code verified", "valid": True}


@router.post("/disable")
def disable_2fa(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Disable 2FA"""

    tfa = db.execute(
        select(TwoFactorAuth).where(TwoFactorAuth.user_id == user.id)
    ).scalar()

    if not tfa:
        raise HTTPException(status_code=400, detail="2FA not set up")

    tfa.enabled = False
    tfa.secret = None
    tfa.verified_at = None
    db.commit()

    log_audit(db, user.id, "2fa_disabled")
    return {"message": "2FA disabled"}


@router.get("/status")
def get_2fa_status(user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Get 2FA status for current user"""

    tfa = db.execute(
        select(TwoFactorAuth).where(TwoFactorAuth.user_id == user.id)
    ).scalar()

    if not tfa:
        return {"enabled": False, "method": None}

    return {
        "enabled": tfa.enabled,
        "method": tfa.method,
        "verified_at": tfa.verified_at
    }
