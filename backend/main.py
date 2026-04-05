"""
FastAPI application entry point — equivalent of main.tsx on the frontend.

This file creates the FastAPI app instance, configures middleware, registers
routes, and defines the health check endpoint. Uvicorn (the ASGI server)
imports this file and runs the `app` object:
    uvicorn main:app --reload

The app itself doesn't listen on a port — uvicorn does that. FastAPI just
defines what happens when a request arrives at a given URL.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import analysis

# Create the FastAPI app instance. title and version appear in the auto-generated
# docs at /docs (Swagger UI) and /redoc (ReDoc). These are free — FastAPI builds
# interactive API documentation from your route definitions automatically.
app = FastAPI(
    title="FD-PBD Thermal Analysis API",
    version="0.1.0",
)

# CORS (Cross-Origin Resource Sharing) middleware — controls which domains can
# call this API. Without this, the browser blocks requests from the frontend
# (localhost:5173) to the backend (localhost:8000) because they're different
# origins (different ports = different origin).
#
# allow_origins: which frontend URLs are allowed (from config.py, defaults to
#   ["http://localhost:5173"] — Vite's dev server)
# allow_credentials: allow cookies/auth headers in cross-origin requests
# allow_methods: ["*"] = allow GET, POST, PUT, DELETE, etc.
# allow_headers: ["*"] = allow any request headers (Content-Type, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register the analysis router — this adds all endpoints defined in
# routers/analysis.py (like /fdpbd/analyze, /fdpbd/fit_anisotropy, etc.)
# under the app. The router's prefix="/fdpbd" means all routes start with /fdpbd.
app.include_router(analysis.router)


# Simple health check endpoint — returns {"status": "ok"} to confirm the server
# is running. Used by monitoring tools, load balancers, or just manual checks
# (curl localhost:8000/health). Also tested in test_health.py.
@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
