from __future__ import annotations

from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from backend.lib.supabase_client import SupabaseError, supabase_client
from backend.models.schemas import DeviceTokenRequest, NotificationCreateRequest, NotificationResponse


router = APIRouter(prefix="/api", tags=["notifications"])

_local_device_tokens: dict[str, dict[str, Any]] = {}
_local_notifications: dict[str, dict[str, Any]] = {}


@router.post("/device-tokens")
async def save_device_token(payload: DeviceTokenRequest) -> dict[str, Any]:
    token = {
        "id": str(uuid4()),
        "user_id": payload.user_id,
        "fcm_token": payload.fcm_token,
        "platform": payload.platform,
        "device_name": payload.device_name,
        "is_active": True,
    }
    if supabase_client.is_configured():
        try:
            rows = supabase_client.upsert("device_tokens", token, on_conflict="fcm_token")
            token = rows[0] if rows else token
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        _local_device_tokens[token["fcm_token"]] = token
    return {"ok": True, "device_token": token}


@router.post("/notifications", response_model=NotificationResponse)
async def create_notification(payload: NotificationCreateRequest) -> NotificationResponse:
    notification = {
        "id": str(uuid4()),
        "user_id": payload.user_id,
        "notification_type": payload.notification_type,
        "title": payload.title,
        "body": payload.body,
        "related_table": payload.related_table,
        "related_id": payload.related_id,
        "scheduled_at": payload.scheduled_at,
        "status": "pending",
    }
    if supabase_client.is_configured():
        try:
            rows = supabase_client.insert("notifications", notification)
            notification = rows[0] if rows else notification
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        _local_notifications[notification["id"]] = notification
    return NotificationResponse(**notification)
