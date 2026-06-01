from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("")
async def list_projects() -> list[dict]:
    return [{"name": "KebunKita", "status": "active"}]