from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import analysis

app = FastAPI(
    title="FD-PBD Thermal Analysis API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis.router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
