from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.lib.access_control import ensure_access
from backend.lib.supabase_client import SupabaseError, supabase_client
from backend.models.schemas import (
    CareLogCreateRequest,
    CareLogResponse,
    PlantCreateRequest,
    PlantResponse,
    PlantUpdateRequest,
    WaterLogRequest,
)


router = APIRouter(prefix="/api/plants", tags=["plants"])

_local_plants: dict[str, dict[str, Any]] = {}
_local_care_logs: list[dict[str, Any]] = []
_local_care_reminders: list[dict[str, Any]] = []


@router.get("", response_model=list[PlantResponse])
async def list_plants(user_id: str) -> list[PlantResponse]:
    if supabase_client.is_configured():
        try:
            rows = supabase_client.select("plants", filters={"user_id": user_id}, order="created_at.desc")
            return [PlantResponse(**_clean(row)) for row in rows]
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    return [PlantResponse(**_clean(row)) for row in _local_plants.values() if row["user_id"] == user_id]


@router.post("", response_model=PlantResponse)
async def create_plant(payload: PlantCreateRequest) -> PlantResponse:
    ensure_access(payload.user_id, "smart_farming", "accept_plant_name")
    plant = {
        "id": str(uuid4()),
        "user_id": payload.user_id,
        "community_id": payload.community_id,
        "name": payload.name,
        "category": _normalize_category(payload.category),
        "image_url": payload.image_url,
        "planted_date": payload.planted_date,
        "location": payload.location,
        "sunlight": _normalize_sunlight(payload.sunlight),
        "watering_frequency": _normalize_watering(payload.watering_frequency),
        "growth_percentage": 0,
        "estimated_harvest_date": None,
        "status": "active",
    }
    if supabase_client.is_configured():
        try:
            rows = supabase_client.insert("plants", plant)
            if rows:
                plant = rows[0]
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        _local_plants[plant["id"]] = plant
    return PlantResponse(**_clean(plant))


@router.get("/{plant_id}", response_model=PlantResponse)
async def get_plant(plant_id: str, user_id: str) -> PlantResponse:
    plant = _get_plant_or_404(plant_id, user_id)
    return PlantResponse(**_clean(plant))


@router.patch("/{plant_id}", response_model=PlantResponse)
async def update_plant(plant_id: str, user_id: str, payload: PlantUpdateRequest) -> PlantResponse:
    updates = {key: value for key, value in payload.model_dump().items() if value is not None}
    if "category" in updates:
        updates["category"] = _normalize_category(updates["category"])
    if "sunlight" in updates:
        updates["sunlight"] = _normalize_sunlight(updates["sunlight"])
    if "watering_frequency" in updates:
        updates["watering_frequency"] = _normalize_watering(updates["watering_frequency"])
    if not updates:
        return PlantResponse(**_clean(_get_plant_or_404(plant_id, user_id)))

    if supabase_client.is_configured():
        try:
            rows = supabase_client.update("plants", {"id": plant_id, "user_id": user_id}, updates)
            if not rows:
                raise HTTPException(status_code=404, detail="Plant not found")
            return PlantResponse(**_clean(rows[0]))
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    plant = _get_plant_or_404(plant_id, user_id)
    plant.update(updates)
    return PlantResponse(**_clean(plant))


@router.delete("/{plant_id}")
async def delete_plant(plant_id: str, user_id: str) -> dict[str, Any]:
    _get_plant_or_404(plant_id, user_id)

    if supabase_client.is_configured():
        try:
            rows = supabase_client.delete("plants", {"id": plant_id, "user_id": user_id})
            if not rows:
                raise HTTPException(status_code=404, detail="Plant not found")
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        _local_plants.pop(plant_id, None)

    return {"ok": True, "plant_id": plant_id}


@router.post("/{plant_id}/water")
async def log_water(plant_id: str, payload: WaterLogRequest) -> dict[str, Any]:
    _get_plant_or_404(plant_id, payload.user_id)
    due_time = datetime.now(timezone.utc) + timedelta(hours=48)
    care_log = {
        "id": str(uuid4()),
        "plant_id": plant_id,
        "action_type": "watered",
        "note": payload.notes or f"Watered {payload.amount}",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    reminder = {
        "id": str(uuid4()),
        "plant_id": plant_id,
        "reminder_type": "water",
        "due_time": due_time.isoformat(),
        "status": "pending",
    }
    if supabase_client.is_configured():
        try:
            supabase_client.insert("care_logs", care_log)
            supabase_client.insert("care_reminders", reminder)
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        _local_care_logs.append(care_log)
        _local_care_reminders.append(reminder)

    return {
        "ok": True,
        "plant_id": plant_id,
        "action_type": "watered",
        "next_watering_at": due_time.isoformat(),
        "soil_moisture": "Optimal (82%)",
    }


@router.get("/{plant_id}/care-logs", response_model=list[CareLogResponse])
async def list_care_logs(plant_id: str, user_id: str) -> list[CareLogResponse]:
    _get_plant_or_404(plant_id, user_id)
    if supabase_client.is_configured():
        try:
            rows = supabase_client.select("care_logs", filters={"plant_id": plant_id}, order="created_at.desc", limit=50)
            return [CareLogResponse(**_clean(row)) for row in rows]
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    return [CareLogResponse(**_clean(row)) for row in _local_care_logs if row["plant_id"] == plant_id]


@router.post("/{plant_id}/care-logs", response_model=CareLogResponse)
async def create_care_log(plant_id: str, payload: CareLogCreateRequest) -> CareLogResponse:
    _get_plant_or_404(plant_id, payload.user_id)
    care_log = {
        "id": str(uuid4()),
        "plant_id": plant_id,
        "action_type": payload.action_type,
        "note": payload.note,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    if supabase_client.is_configured():
        try:
            rows = supabase_client.insert("care_logs", care_log)
            if rows:
                care_log = rows[0]
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        _local_care_logs.append(care_log)
    return CareLogResponse(**_clean(care_log))


@router.post("/{plant_id}/media")
async def upload_plant_media(
    plant_id: str,
    user_id: str = Form(...),
    file: UploadFile = File(...),
    caption: str | None = Form(default=None),
) -> dict[str, Any]:
    _get_plant_or_404(plant_id, user_id)
    content = await file.read()
    object_path = f"{user_id}/{plant_id}/{uuid4().hex}-{file.filename or 'plant-image'}"
    if not supabase_client.is_configured():
        return {"ok": True, "media_url": None, "message": "Supabase storage is not configured"}

    try:
        upload = supabase_client.upload_file(
            "plant-images",
            object_path,
            content,
            content_type=file.content_type,
        )
        media = {
            "plant_id": plant_id,
            "user_id": user_id,
            "media_url": upload["public_url"],
            "media_type": "image" if (file.content_type or "").startswith("image/") else "video",
            "caption": caption,
        }
        rows = supabase_client.insert("plant_media", media)
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"ok": True, "media": rows[0] if rows else media}


def _get_plant_or_404(plant_id: str, user_id: str) -> dict[str, Any]:
    if supabase_client.is_configured():
        try:
            UUID(plant_id)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail="Plant not found") from exc

        try:
            rows = supabase_client.select("plants", filters={"id": plant_id, "user_id": user_id}, limit=1)
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
        if rows:
            return rows[0]
        raise HTTPException(status_code=404, detail="Plant not found")

    plant = _local_plants.get(plant_id)
    if not plant or plant.get("user_id") != user_id:
        raise HTTPException(status_code=404, detail="Plant not found")
    return plant


def _clean(row: dict[str, Any]) -> dict[str, Any]:
    cleaned = {key: (value.isoformat() if hasattr(value, "isoformat") else value) for key, value in row.items()}
    legacy_map = {
        "plant_type": "category",
        "photo_url": "image_url",
        "date_planted": "planted_date",
        "garden_location": "location",
        "growth_percent": "growth_percentage",
        "sunlight_requirement": "sunlight",
    }
    for legacy_key, new_key in legacy_map.items():
        if new_key not in cleaned and legacy_key in cleaned:
            cleaned[new_key] = cleaned[legacy_key]
    return cleaned


def _normalize_category(value: str | None) -> str:
    normalized = (value or "vegetable").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "leafy_green": "leafy_green",
        "fruit_vegetable": "vegetable",
    }
    return aliases.get(normalized, normalized if normalized in {"vegetable", "fruit", "herb", "leafy_green", "flower", "other"} else "other")


def _normalize_sunlight(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "full_sun": "full_sun",
        "partial": "partial_shade",
        "partial_shade": "partial_shade",
    }
    return aliases.get(normalized, normalized if normalized in {"full_sun", "partial_shade", "shade"} else None)


def _normalize_watering(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {
        "every_2_days": "every_2_days",
        "every_two_days": "every_2_days",
    }
    return aliases.get(normalized, normalized if normalized in {"daily", "every_2_days", "weekly"} else None)
