from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from backend.lib.access_control import get_user, remember_local_user
from backend.lib.supabase_client import SupabaseError, supabase_client
from backend.models.schemas import GuestCreateRequest, UserProfileResponse


router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/guest", response_model=UserProfileResponse)
async def create_guest(payload: GuestCreateRequest) -> UserProfileResponse:
    guest_id = str(uuid4())
    expires_at = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    user = {
        "id": guest_id,
        "email": None,
        "full_name": payload.full_name or "Guest Grower",
        "avatar_url": None,
        "access_type": "guest",
        "provider": "guest",
        "is_guest": True,
        "guest_expires_at": expires_at,
        "location_text": payload.location_text,
    }

    if supabase_client.is_configured():
        try:
            rows = supabase_client.insert("users", user)
            if rows:
                user = rows[0]
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        remember_local_user(user)

    return UserProfileResponse(**_stringify_dates(user))


@router.get("/users/{user_id}", response_model=UserProfileResponse)
async def read_user(user_id: str) -> UserProfileResponse:
    user = get_user(user_id)
    return UserProfileResponse(**_stringify_dates(user))


def _stringify_dates(payload: dict) -> dict:
    return {key: (value.isoformat() if hasattr(value, "isoformat") else value) for key, value in payload.items()}
