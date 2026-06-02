from __future__ import annotations

from typing import Any, Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


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
    model_config = ConfigDict(populate_by_name=True)

    user_id: str
    name: str
    community_id: str | None = None
    category: str = Field(default="vegetable", validation_alias=AliasChoices("category", "plant_type"))
    image_url: str | None = Field(default=None, validation_alias=AliasChoices("image_url", "photo_url"))
    planted_date: str | None = Field(default=None, validation_alias=AliasChoices("planted_date", "date_planted"))
    location: str | None = Field(default=None, validation_alias=AliasChoices("location", "garden_location"))
    sunlight: str | None = Field(default=None, validation_alias=AliasChoices("sunlight", "sunlight_requirement"))
    watering_frequency: str | None = None


class PlantUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    name: str | None = None
    community_id: str | None = None
    category: str | None = Field(default=None, validation_alias=AliasChoices("category", "plant_type"))
    image_url: str | None = Field(default=None, validation_alias=AliasChoices("image_url", "photo_url"))
    planted_date: str | None = Field(default=None, validation_alias=AliasChoices("planted_date", "date_planted"))
    location: str | None = Field(default=None, validation_alias=AliasChoices("location", "garden_location"))
    sunlight: str | None = Field(default=None, validation_alias=AliasChoices("sunlight", "sunlight_requirement"))
    watering_frequency: str | None = None
    growth_percentage: int | None = Field(default=None, validation_alias=AliasChoices("growth_percentage", "growth_percent"))
    estimated_harvest_date: str | None = None
    status: str | None = None


class PlantResponse(BaseModel):
    id: str
    user_id: str
    community_id: str | None = None
    name: str
    category: str
    image_url: str | None = None
    planted_date: str | None = None
    location: str | None = None
    sunlight: str | None = None
    watering_frequency: str | None = None
    growth_percentage: int = 0
    estimated_harvest_date: str | None = None
    status: str


class CareLogCreateRequest(BaseModel):
    user_id: str
    action_type: Literal["watered", "fertilized", "note", "inspected", "diagnosed"]
    note: str | None = None


class CareLogResponse(BaseModel):
    id: str
    plant_id: str
    action_type: str
    note: str | None = None
    created_at: str


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


class CommunityFeedPostResponse(BaseModel):
    id: str
    type: str
    user_name: str
    community_name: str
    timestamp: str
    avatar_url: str | None = None
    image_url: str | None = None
    caption: str
    likes: int = 0
    comments: int = 0


class CommunityFeedCreateRequest(BaseModel):
    user_id: str
    post_type: str
    caption: str
    image_url: str | None = None
    community_id: str | None = None


class MarketplaceListingResponse(BaseModel):
    id: str
    item_name: str
    owner_id: str | None = None
    owner_name: str
    area: str | None = None
    distance: str | None = None
    quantity: str | None = None
    listing_type: str
    requested_item: str | None = None
    image_url: str | None = None


class MarketplaceListingCreateRequest(BaseModel):
    user_id: str
    item_name: str
    quantity: str
    area: str | None = None
    listing_type: str
    requested_item: str | None = None
    image_url: str | None = None


class CommunitySummaryResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    area: str | None = None
    image_url: str | None = None
    member_count: int = 0
    visibility: str


class ChatRoomOpenRequest(BaseModel):
    user_id: str
    marketplace_item_id: str


class ChatRoomResponse(BaseModel):
    id: str
    marketplace_item_id: str
    buyer_id: str
    seller_id: str
    item_image: str | None = None
    item_name: str
    quantity: str | None = None
    listing_type: str
    owner_name: str
    other_user_name: str
    last_message: str | None = None
    last_message_time: str | None = None
    unread_count: int = 0


class ChatMessageCreateRequest(BaseModel):
    sender_id: str
    message: str


class ChatReadRequest(BaseModel):
    user_id: str


class ChatMessageResponse(BaseModel):
    id: str
    chat_room_id: str
    sender_id: str
    message: str
    is_read: bool
    created_at: str


class PlantDiagnosisHistoryResponse(BaseModel):
    id: str
    status: str
    disease_name: str | None = None
    confidence: float
    recommendation: str | None = None
    image_url: str | None = None
    created_at: str
