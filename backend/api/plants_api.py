from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.lib.access_control import ensure_access
from backend.lib.supabase_client import SupabaseError, supabase_client
from backend.models.schemas import PlantCreateRequest, PlantResponse, PlantUpdateRequest, WaterLogRequest


router = APIRouter(prefix="/api/plants", tags=["plants"])

_local_plants: dict[str, dict[str, Any]] = {}
_local_care_history: list[dict[str, Any]] = []


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
        "name": payload.name,
        "plant_type": payload.plant_type,
        "variety": payload.variety,
        "photo_url": payload.photo_url,
        "date_planted": payload.date_planted,
        "garden_location": payload.garden_location,
        "growth_percent": 0,
        "status": "active",
        "sunlight_requirement": payload.sunlight_requirement,
        "watering_frequency": payload.watering_frequency,
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


@router.post("/{plant_id}/water")
async def log_water(plant_id: str, payload: WaterLogRequest) -> dict[str, Any]:
    _get_plant_or_404(plant_id, payload.user_id)
    next_watering_at = datetime.now(timezone.utc) + timedelta(hours=48)
    history = {
        "id": str(uuid4()),
        "user_id": payload.user_id,
        "plant_id": plant_id,
        "action_type": "watered",
        "amount": payload.amount,
        "notes": payload.notes,
        "recorded_at": datetime.now(timezone.utc).isoformat(),
    }
    if supabase_client.is_configured():
        try:
            supabase_client.insert("care_history", history)
            supabase_client.update("plants", {"id": plant_id, "user_id": payload.user_id}, {"next_watering_at": next_watering_at.isoformat()})
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc
    else:
        _local_care_history.append(history)
        _local_plants[plant_id]["next_watering_at"] = next_watering_at.isoformat()

    return {
        "ok": True,
        "plant_id": plant_id,
        "action_type": "watered",
        "next_watering_at": next_watering_at.isoformat(),
        "soil_moisture": "Optimal (82%)",
    }


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
    return {key: (value.isoformat() if hasattr(value, "isoformat") else value) for key, value in row.items()}
