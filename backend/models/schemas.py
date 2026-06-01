from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class PlantHealthRequest(BaseModel):
    user_id: str = Field(..., examples=["demo-user-1"])
    image_name: str = Field(..., examples=["chili_leaf.jpg"])
    notes: str | None = Field(default=None, examples=["brown spots on leaves"])


class PlantHealthResponse(BaseModel):
    status: Literal["healthy", "diseased", "unknown"]
    confidence: float
    disease_name: str | None = None
    symptoms: list[str] = Field(default_factory=list)
    treatment_plan: list[str] = Field(default_factory=list)
    recommendation: str
    memory_ref: str


class SmartFarmingRequest(BaseModel):
    user_id: str = Field(..., examples=["demo-user-1"])
    plant_name: str = Field(..., examples=["chili"])
    location: str | None = Field(default=None, examples=["apartment balcony"])
    budget_rm: float | None = Field(default=None, examples=[50])


class SmartFarmingTask(BaseModel):
    time: str
    task: str
    reason: str


class SmartFarmingResponse(BaseModel):
    user_id: str
    plant_name: str
    tasks: list[SmartFarmingTask]
    telegram_hint: str
    memory_ref: str


class HarvestPostRequest(BaseModel):
    user_id: str
    title: str
    quantity: str
    location: str | None = None


class HarvestMatch(BaseModel):
    match_user: str
    score: float
    reason: str


class HarvestResponse(BaseModel):
    post_id: str
    matches: list[HarvestMatch]
    memory_ref: str


class DecisionSupportRequest(BaseModel):
    user_id: str
    budget_rm: float
    timeline_weeks: int
    space: str
    goal: str
    chat_message: str | None = None


class DecisionSupportResponse(BaseModel):
    answer: str
    recommendations: list[str]
    memory_ref: str


class MemoryEntry(BaseModel):
    user_id: str
    agent_name: str
    payload: dict[str, Any]


class MemoryLookupResponse(BaseModel):
    user_id: str
    history: list[dict[str, Any]]


class GuardrailsResponse(BaseModel):
    env_status: dict[str, bool]
    guardrail_rules: list[str]
    fallback_paths: dict[str, list[str]]
    memory_policy: str
    review_policy: str


class GuestCreateRequest(BaseModel):
    full_name: str | None = Field(default="Guest Grower")
    location_text: str | None = Field(default=None)


class UserProfileResponse(BaseModel):
    id: str
    email: str | None = None
    full_name: str | None = None
    avatar_url: str | None = None
    access_type: str
    provider: str | None = None
    is_guest: bool
    guest_expires_at: str | None = None
    location_text: str | None = None


class PlantCreateRequest(BaseModel):
    user_id: str
    name: str
    plant_type: str = Field(default="vegetable")
    variety: str | None = None
    photo_url: str | None = None
    date_planted: str | None = None
    garden_location: str | None = None
    sunlight_requirement: str | None = None
    watering_frequency: str | None = None


class PlantUpdateRequest(BaseModel):
    name: str | None = None
    plant_type: str | None = None
    variety: str | None = None
    photo_url: str | None = None
    date_planted: str | None = None
    garden_location: str | None = None
    growth_percent: int | None = None
    status: str | None = None
    sunlight_requirement: str | None = None
    watering_frequency: str | None = None
    next_watering_at: str | None = None


class PlantResponse(BaseModel):
    id: str
    user_id: str
    name: str
    plant_type: str
    variety: str | None = None
    photo_url: str | None = None
    date_planted: str | None = None
    garden_location: str | None = None
    growth_percent: int = 0
    status: str
    sunlight_requirement: str | None = None
    watering_frequency: str | None = None
    next_watering_at: str | None = None


class WaterLogRequest(BaseModel):
    user_id: str
    amount: str | None = Field(default="500ml")
    notes: str | None = None


class DeviceTokenRequest(BaseModel):
    user_id: str
    fcm_token: str
    platform: Literal["android", "ios", "web"]
    device_name: str | None = None


class NotificationCreateRequest(BaseModel):
    user_id: str
    notification_type: str = Field(default="system")
    title: str
    body: str
    related_table: str | None = None
    related_id: str | None = None
    scheduled_at: str | None = None


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    notification_type: str
    title: str
    body: str
    status: str
    fcm_message_id: str | None = None
    error_message: str | None = None
