from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from backend.api.agents_api import router as agents_router
from backend.api.auth_api import router as auth_router
from backend.api.community_api import router as community_router
from backend.api.notifications_api import router as notifications_router
from backend.api.plants_api import router as plants_router
from backend.api.projects import router as projects_router
from backend.lib.supabase_client import supabase_client


def load_environment() -> None:
    backend_dir = Path(__file__).resolve().parent
    project_root = backend_dir.parent

    for candidate in (
        project_root / ".env",
        backend_dir / ".env",
        project_root / "backend" / ".env",
    ):
        if candidate.exists():
            load_dotenv(candidate, override=False)


def get_required_env_status() -> dict[str, bool]:
    return {
        "YOLOV8_ENDPOINT": bool(os.getenv("YOLOV8_ENDPOINT")),
        "DEEPSEEK_API_KEY": bool(os.getenv("DEEPSEEK_API_KEY")),
        "SUPABASE_URL": bool(os.getenv("SUPABASE_URL")),
        "SUPABASE_KEY": bool(os.getenv("SUPABASE_KEY")),
        "SUPABASE_SERVICE_ROLE_KEY": bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY")),
        "FIREBASE_PROJECT_ID": bool(os.getenv("FIREBASE_PROJECT_ID")),
        "FIREBASE_CLIENT_EMAIL": bool(os.getenv("FIREBASE_CLIENT_EMAIL")),
        "FIREBASE_PRIVATE_KEY": bool(os.getenv("FIREBASE_PRIVATE_KEY")),
    }


load_environment()

app = FastAPI(title="KebunKita Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(community_router)
app.include_router(agents_router)
app.include_router(plants_router)
app.include_router(notifications_router)
app.include_router(projects_router)


@app.on_event("startup")
async def startup_check() -> None:
    app.state.env_status = get_required_env_status()


@app.get("/")
async def root() -> dict:
    return {
        "service": "KebunKita Backend",
        "status": "running",
        "env_loaded": getattr(app.state, "env_status", get_required_env_status()),
        "inventory": [
            "agents",
            "api",
            "tools",
            "models",
            "lib",
            "workflows",
        ],
    }


@app.get("/health")
async def health() -> dict:
    return {
        "ok": True,
        "env_loaded": getattr(app.state, "env_status", get_required_env_status()),
        "supabase": supabase_client.health(),
    }
