from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, UploadFile, File, Form, HTTPException

from backend.agents.supervisor import agent_supervisor
from backend.lib.access_control import ensure_access
from backend.models.schemas import (
    DecisionSupportResponse,
    GuardrailsResponse,
    HarvestResponse,
    MemoryLookupResponse,
    PlantDiagnosisHistoryResponse,
    PlantHealthResponse,
    SmartFarmingResponse,
)
from backend.agents.memory_core import memory_core_agent
from backend.lib.ai_hooks import describe_guardrails
from backend.lib.supabase_client import SupabaseError, supabase_client


router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.post("/plant-health", response_model=PlantHealthResponse)
async def plant_health(
    user_id: str = Form(...),
    notes: str | None = Form(default=None),
    file: UploadFile = File(...),
):
    ensure_access(user_id, "plant_health", "upload_picture")
    image_bytes = await file.read()
    image_url = None
    image_name = file.filename or "unknown"
    if supabase_client.is_configured():
        try:
            upload = supabase_client.upload_file(
                "plant-images",
                f"{user_id}/diagnoses/{uuid4().hex}-{image_name}",
                image_bytes,
                content_type=file.content_type,
            )
            image_url = upload["public_url"]
        except SupabaseError:
            image_url = None

    result = agent_supervisor.analyze_plant(
        user_id=user_id,
        image_name=image_name,
        image_bytes=image_bytes,
        notes=notes,
    )
    _persist_plant_diagnosis(user_id=user_id, image_url=image_url, result=result)
    return PlantHealthResponse(**result, memory_ref=f"memory:{user_id}:plant_health")


@router.post("/smart-farming", response_model=SmartFarmingResponse)
async def smart_farming(
    user_id: str = Form(...),
    plant_name: str = Form(...),
    budget_rm: float | None = Form(default=None),
):
    ensure_access(user_id, "smart_farming", "generate_task")
    result = agent_supervisor.create_farming_plan(user_id=user_id, plant_name=plant_name, budget_rm=budget_rm)
    _persist_care_reminder_hints(user_id=user_id, plant_name=plant_name, tasks=result["tasks"])
    return SmartFarmingResponse(
        user_id=user_id,
        plant_name=plant_name,
        tasks=result["tasks"],
        telegram_hint="Use Firebase Cloud Messaging to push reminders for generated tasks.",
        memory_ref=f"memory:{user_id}:smart_farming",
    )


@router.post("/community-exchange", response_model=HarvestResponse)
async def community_exchange(
    user_id: str = Form(...),
    title: str = Form(...),
    quantity: str = Form(...),
    location: str | None = Form(default=None),
):
    ensure_access(user_id, "community_exchange", "user_post")
    result = agent_supervisor.match_harvest(user_id=user_id, title=title, quantity=quantity, location=location)
    post_id = _persist_community_post(user_id=user_id, title=title, quantity=quantity, location=location)
    return HarvestResponse(post_id=post_id, matches=result["matches"], memory_ref=f"memory:{user_id}:community")


@router.post("/decision-support", response_model=DecisionSupportResponse)
async def decision_support(
    user_id: str = Form(...),
    budget_rm: float = Form(...),
    timeline_weeks: int = Form(...),
    space: str = Form(...),
    goal: str = Form(...),
    chat_message: str | None = Form(default=None),
):
    ensure_access(user_id, "decision_support", "chat_message")
    result = agent_supervisor.chat_support(
        user_id=user_id,
        budget_rm=budget_rm,
        timeline_weeks=timeline_weeks,
        space=space,
        goal=goal,
        chat_message=chat_message,
    )
    return DecisionSupportResponse(answer=result["answer"], recommendations=result["recommendations"], memory_ref=f"memory:{user_id}:decision_support")


@router.get("/memory/{user_id}", response_model=MemoryLookupResponse)
async def get_memory(user_id: str):
    return MemoryLookupResponse(user_id=user_id, history=memory_core_agent.history(user_id))


@router.get("/plant-health/history/{user_id}", response_model=list[PlantDiagnosisHistoryResponse])
async def get_plant_health_history(user_id: str):
    if supabase_client.is_configured():
        try:
            rows = supabase_client.select("plant_diagnoses", filters={"user_id": user_id}, order="created_at.desc", limit=12)
            return [
                PlantDiagnosisHistoryResponse(
                    id=row["id"],
                    status=row.get("status", "unknown"),
                    disease_name=row.get("disease_name"),
                    confidence=float(row.get("confidence") or 0),
                    recommendation=row.get("recommendation"),
                    image_url=row.get("image_url"),
                    created_at=row["created_at"].isoformat() if hasattr(row.get("created_at"), "isoformat") else str(row.get("created_at") or ""),
                )
                for row in rows
            ]
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    history = memory_core_agent.history(user_id)
    diagnoses = []
    for entry in history:
        if entry.get("agent_name") != "plant_health":
            continue
        payload = entry.get("payload", {})
        result = payload.get("result", {})
        diagnoses.append(
            PlantDiagnosisHistoryResponse(
                id=str(entry.get("id") or payload.get("image_name") or len(diagnoses)),
                status=result.get("status", "unknown"),
                disease_name=result.get("disease_name"),
                confidence=float(result.get("confidence") or 0),
                recommendation=result.get("recommendation"),
                image_url=None,
                created_at=str(entry.get("created_at") or ""),
            )
        )
    return diagnoses[:12]


@router.get("/guardrails", response_model=GuardrailsResponse)
async def guardrails():
    return GuardrailsResponse(**describe_guardrails())


def _persist_plant_diagnosis(user_id: str, image_url: str | None, result: dict) -> None:
    if not supabase_client.is_configured():
        return
    try:
        supabase_client.insert(
            "plant_diagnoses",
            {
                "user_id": user_id,
                "image_url": image_url,
                "status": result.get("status", "unknown"),
                "disease_name": result.get("disease_name"),
                "confidence": result.get("confidence", 0),
                "symptoms": result.get("symptoms", []),
                "treatment_plan": result.get("treatment_plan", []),
                "recommendation": result.get("recommendation"),
                "ai_payload": result,
            },
        )
    except SupabaseError:
        pass


def _persist_care_reminder_hints(user_id: str, plant_name: str, tasks: list[dict]) -> None:
    # The new care_reminders table is plant-first and requires plant_id.
    # Generic agent suggestions stay in memory until the user attaches them to a plant.
    return


def _persist_community_post(user_id: str, title: str, quantity: str, location: str | None) -> str:
    fallback_id = f"post-{user_id}"
    if not supabase_client.is_configured():
        return fallback_id
    try:
        rows = supabase_client.insert(
            "community_posts",
            {
                "user_id": user_id,
                "post_type": "harvest",
                "body": f"{title} available: {quantity}",
                "location_text": location,
            },
        )
        if rows:
            return rows[0]["id"]
    except SupabaseError:
        pass
    return fallback_id
