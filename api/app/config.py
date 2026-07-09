import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "aurum.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
ACCESS_SECRET = os.getenv("JWT_ACCESS_SECRET", "aurum-dev-access-secret")
REFRESH_SECRET = os.getenv("JWT_REFRESH_SECRET", "aurum-dev-refresh-secret")

# Comma-separated list of allowed frontend origins (e.g. Vercel prod + preview URLs).
CLIENT_ORIGIN = os.getenv("CLIENT_ORIGIN", "http://localhost:5173")
CLIENT_ORIGINS = [o.strip() for o in CLIENT_ORIGIN.split(",") if o.strip()]

IS_DEV = os.getenv("ENV", "development") != "production"

# Cross-site cookies (frontend and API on different domains, e.g. Vercel <-> Render)
# require SameSite=None + Secure. Same-origin dev keeps the cheaper Lax setting.
COOKIE_SAMESITE = "lax" if IS_DEV else "none"
REDIS_URL = os.getenv("REDIS_URL")

# Auto-seed the demo account on boot in production so the live link never
# shows an empty app after Render's free-tier disk resets. Off by default
# in local dev — run `python seed.py` there instead.
SEED_DEMO_ON_BOOT = os.getenv("SEED_DEMO_ON_BOOT", "0" if IS_DEV else "1") == "1"

ACCESS_TTL_MIN = 15
REFRESH_TTL_DAYS = 30
