from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from strawberry.fastapi import GraphQLRouter

from . import config
from .database import Base, SessionLocal, engine
from .models import User
from .routers import admin, ai, analytics, auth, auth2fa, budgets, categories, dashboard, family, goals, subscriptions, tier3, transactions, users
from .graphql_schema import schema
from .cache import init_redis
from .sharding import set_sharding_config
from .seed_demo import run_seed

Base.metadata.create_all(bind=engine)

# Initialize Tier 6 features
if config.REDIS_URL:
    init_redis(redis_url=config.REDIS_URL)
set_sharding_config(num_shards=4)

# Keep the live demo populated even after Render's free-tier disk resets.
if config.SEED_DEMO_ON_BOOT:
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == "demo@aurum.app").first():
            run_seed()
    finally:
        db.close()

app = FastAPI(title="IshiFi API", version="1.0.0", docs_url="/api/docs", openapi_url="/api/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CLIENT_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (auth.router, auth2fa.router, users.router, transactions.router, categories.router,
          budgets.router, goals.router, subscriptions.router, analytics.router, dashboard.router, family.router, ai.router, tier3.router, admin.router):
    app.include_router(r)

# Add GraphQL endpoint (Tier 6)
graphql_app = GraphQLRouter(schema)
app.include_router(graphql_app, prefix="/graphql")


@app.get("/api/health")
def health():
    return {"ok": True, "service": "aurum-api"}


@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    print(f"[api] unhandled error on {request.url.path}: {exc!r}")
    return JSONResponse(status_code=500, content={"error": "Something went wrong"})


# Normalize FastAPI's {"detail": ...} to {"error": ...} so the client has one shape.
from fastapi import HTTPException  # noqa: E402
from fastapi.exceptions import RequestValidationError  # noqa: E402


@app.exception_handler(HTTPException)
async def http_exc(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"error": exc.detail},
                        headers=getattr(exc, "headers", None))


@app.exception_handler(RequestValidationError)
async def validation_exc(request: Request, exc: RequestValidationError):
    first = exc.errors()[0] if exc.errors() else {}
    field = ".".join(str(p) for p in first.get("loc", [])[1:]) or "input"
    return JSONResponse(status_code=422, content={"error": f"{field}: {first.get('msg', 'invalid')}"})
