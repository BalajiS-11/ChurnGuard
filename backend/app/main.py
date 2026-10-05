import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.app.core.config import settings
from backend.app.db.session import engine, Base
from backend.app.services.model_runtime import get_runtime
from backend.app.api.v1 import (
    auth,
    dashboard,
    customers,
    predict,
    actions,
    campaigns,
    models,
    monitoring,
    reports,
    admin,
    notifications
)

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables created
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Load model bundle once at startup
    print("Loading ML model bundle...")
    try:
        runtime = get_runtime()
        print(f"Model {runtime.model_version} ready.")
    except Exception as e:
        print(f"Warning: Model could not be loaded at startup ({e}).")
        
    yield
    print("Shutting down ChurnGuard API...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-grade Banking Customer Churn Prediction & Retention Intelligence API",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS Middleware - allows localhost, Vercel deployments, and production domains
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request ID & Latency Middleware
@app.middleware("http")
async def add_process_time_and_request_id(request: Request, call_next):
    req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    t0 = time.time()
    response = await call_next(request)
    process_time = time.time() - t0
    response.headers["X-Process-Time"] = f"{process_time * 1000:.2f}ms"
    response.headers["X-Request-ID"] = req_id
    return response

# Custom Error Envelope for unhandled exceptions
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    # If standard HTTPException, let FastAPI handle status
    from fastapi.exceptions import HTTPException as FastHTTPException
    if isinstance(exc, FastHTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": f"HTTP_{exc.status_code}",
                    "message": exc.detail,
                    "details": []
                }
            }
        )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": str(exc),
                "details": []
            }
        }
    )

# Routers
prefix = settings.API_V1_STR
app.include_router(auth.router, prefix=f"{prefix}/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix=f"{prefix}/dashboard", tags=["Dashboard"])
app.include_router(customers.router, prefix=f"{prefix}/customers", tags=["Customers"])
app.include_router(predict.router, prefix=f"{prefix}/predict", tags=["Prediction"])
app.include_router(actions.router, prefix=f"{prefix}/actions", tags=["Retention Actions"])
app.include_router(campaigns.router, prefix=f"{prefix}/campaigns", tags=["Campaigns"])
app.include_router(models.router, prefix=f"{prefix}/models", tags=["Model Registry"])
app.include_router(monitoring.router, prefix=f"{prefix}/monitoring", tags=["Monitoring & Fairness"])
app.include_router(reports.router, prefix=f"{prefix}/reports", tags=["Reports"])
app.include_router(admin.router, prefix=f"{prefix}/admin", tags=["Admin & Governance"])
app.include_router(notifications.router, prefix=f"{prefix}/notifications", tags=["Notifications"])

@app.get("/health", tags=["Health"])
def health_check():
    runtime = get_runtime()
    return {
        "status": "healthy",
        "service": "ChurnGuard API",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "model_loaded": runtime.is_loaded(),
        "model_version": runtime.model_version
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "Welcome to ChurnGuard API. Visit /docs for the Swagger OpenAPI specification.",
        "version": settings.VERSION
    }
