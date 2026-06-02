from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from backend.lib.supabase_client import SupabaseError, supabase_client
from backend.models.schemas import (
    ChatMessageCreateRequest,
    ChatMessageResponse,
    ChatReadRequest,
    ChatRoomOpenRequest,
    ChatRoomResponse,
    CommunitySummaryResponse,
    CommunityFeedPostResponse,
    MarketplaceListingCreateRequest,
    MarketplaceListingResponse,
)


router = APIRouter(prefix="/api/community", tags=["community"])
_local_chat_rooms: dict[str, dict[str, Any]] = {}
_local_messages: dict[str, list[dict[str, Any]]] = {}


@router.get("/communities", response_model=list[CommunitySummaryResponse])
async def list_communities() -> list[CommunitySummaryResponse]:
    try:
        communities = supabase_client.select("communities", order="created_at.desc", limit=20)
        memberships = supabase_client.select("community_members", limit=500)
        return [_build_community_summary(community, memberships) for community in communities]
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/feed", response_model=list[CommunityFeedPostResponse])
async def list_feed() -> list[CommunityFeedPostResponse]:
    try:
        posts = supabase_client.select("community_posts", order="created_at.desc", limit=20)
        return [_build_feed_post(post) for post in posts]
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/feed", response_model=CommunityFeedPostResponse)
async def create_feed_post(
    user_id: str = Form(...),
    post_type: str = Form(...),
    caption: str = Form(...),
    community_id: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
) -> CommunityFeedPostResponse:
    post_type, body = _map_feed_post_to_db(post_type, caption)
    community_id = community_id or _default_community_id(user_id)
    post = {
        "id": str(uuid4()),
        "user_id": user_id,
        "community_id": community_id,
        "post_type": post_type,
        "body": body,
        "plant_id": None,
        "location_text": None,
    }
    try:
        rows = supabase_client.insert("community_posts", post)
        created = rows[0] if rows else post
        if file is not None:
            content = await file.read()
            object_path = f"{user_id}/feed/{created['id']}/{uuid4().hex}-{file.filename or 'community-post'}"
            upload = supabase_client.upload_file(
                "community-media",
                object_path,
                content,
                content_type=file.content_type,
            )
            supabase_client.insert(
                "post_media",
                {
                    "id": str(uuid4()),
                    "post_id": created["id"],
                    "media_url": upload["public_url"],
                    "media_type": "image",
                    "sort_order": 0,
                },
            )
        return _build_feed_post(created)
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/marketplace", response_model=list[MarketplaceListingResponse])
async def list_marketplace() -> list[MarketplaceListingResponse]:
    try:
        listings = supabase_client.select("marketplace_listings", filters={"status": "active"}, order="created_at.desc", limit=20)
        return [_build_marketplace_listing(listing) for listing in listings]
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/marketplace", response_model=MarketplaceListingResponse)
async def create_marketplace_listing(payload: MarketplaceListingCreateRequest) -> MarketplaceListingResponse:
    db_listing_type, description, price_amount = _map_listing_to_db(
        payload.listing_type,
        payload.requested_item,
    )
    listing = {
        "id": str(uuid4()),
        "user_id": payload.user_id,
        "title": payload.item_name,
        "crop_name": payload.item_name,
        "description": description,
        "quantity": payload.quantity,
        "price_amount": price_amount,
        "price_unit": "RM/kg" if price_amount is not None and price_amount > 0 else None,
        "listing_type": db_listing_type,
        "location_text": payload.area,
        "is_organic": False,
        "is_pesticide_free": True,
        "harvested_at": None,
        "status": "active",
    }
    try:
        rows = supabase_client.insert("marketplace_listings", listing)
        created = rows[0] if rows else listing
        if payload.image_url:
            supabase_client.insert(
                "listing_media",
                {
                    "id": str(uuid4()),
                    "listing_id": created["id"],
                    "media_url": payload.image_url,
                    "media_type": "image",
                    "sort_order": 0,
                },
            )
        return _build_marketplace_listing(created)
    except SupabaseError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.delete("/marketplace/{listing_id}")
async def delete_marketplace_listing(listing_id: str, user_id: str) -> dict[str, Any]:
    _get_listing_or_404(listing_id)

    if supabase_client.is_configured():
        try:
            rows = supabase_client.delete("marketplace_listings", {"id": listing_id, "user_id": user_id})
            if not rows:
                raise HTTPException(status_code=404, detail="Marketplace listing not found")
        except SupabaseError as exc:
            raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {"ok": True, "listing_id": listing_id}


@router.get("/chats", response_model=list[ChatRoomResponse])
async def list_chat_rooms(user_id: str) -> list[ChatRoomResponse]:
    rooms = _list_chat_rooms_for_user(user_id)
    return [_build_chat_room(room, user_id) for room in rooms]


@router.post("/chats/open", response_model=ChatRoomResponse)
async def open_chat_room(payload: ChatRoomOpenRequest) -> ChatRoomResponse:
    listing = _get_listing_or_404(payload.marketplace_item_id)
    seller_id = listing["user_id"]
    if payload.user_id == seller_id:
        raise HTTPException(status_code=400, detail="Cannot open a buyer chat on your own listing")

    room = _find_existing_chat_room(payload.marketplace_item_id, payload.user_id, seller_id)
    if room is None:
        room = {
            "id": str(uuid4()),
            "marketplace_item_id": payload.marketplace_item_id,
            "buyer_id": payload.user_id,
            "seller_id": seller_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        _insert_chat_room(room)
    return _build_chat_room(room, payload.user_id)


@router.get("/chats/{chat_room_id}/messages", response_model=list[ChatMessageResponse])
async def list_chat_messages(chat_room_id: str, user_id: str) -> list[ChatMessageResponse]:
    room = _get_chat_room_or_404(chat_room_id, user_id)
    messages = _list_messages(room["id"])
    return [ChatMessageResponse(**_serialize_message(message)) for message in messages]


@router.post("/chats/{chat_room_id}/messages", response_model=ChatMessageResponse)
async def send_chat_message(chat_room_id: str, payload: ChatMessageCreateRequest) -> ChatMessageResponse:
    room = _get_chat_room_or_404(chat_room_id, payload.sender_id)
    message = {
        "id": str(uuid4()),
        "chat_room_id": room["id"],
        "sender_id": payload.sender_id,
        "message": payload.message,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _insert_message(message)
    _touch_chat_room(room["id"])
    return ChatMessageResponse(**_serialize_message(message))


@router.post("/chats/{chat_room_id}/read")
async def mark_chat_read(chat_room_id: str, payload: ChatReadRequest) -> dict[str, Any]:
    room = _get_chat_room_or_404(chat_room_id, payload.user_id)
    updated = _mark_messages_read(room["id"], payload.user_id)
    return {"ok": True, "updated": updated}


def _build_feed_post(post: dict[str, Any]) -> CommunityFeedPostResponse:
    user = _select_one("users", {"id": post["user_id"]}) or {}
    community = _select_one("communities", {"id": post.get("community_id")}) if post.get("community_id") else {}
    media = _select_one("post_media", {"post_id": post["id"]})
    reactions = supabase_client.select("post_reactions", filters={"post_id": post["id"]})
    comments = supabase_client.select("post_comments", filters={"post_id": post["id"]})
    return CommunityFeedPostResponse(
        id=post["id"],
        type=_map_feed_post_from_db(post),
        user_name=user.get("full_name") or "Guest Grower",
        community_name=community.get("name") or "KebunKita Community",
        timestamp=_relative_time(post.get("created_at")),
        avatar_url=user.get("avatar_url"),
        image_url=media.get("media_url") if media else None,
        caption=_clean_feed_caption(post.get("body") or ""),
        likes=len(reactions),
        comments=len(comments),
    )


def _build_marketplace_listing(listing: dict[str, Any]) -> MarketplaceListingResponse:
    owner = _select_one("users", {"id": listing["user_id"]}) or {}
    media = _select_one("listing_media", {"listing_id": listing["id"]})
    display_type, requested_item = _map_listing_from_db(listing)
    return MarketplaceListingResponse(
        id=listing["id"],
        item_name=listing.get("title") or listing.get("crop_name") or "Listing",
        owner_id=listing.get("user_id"),
        owner_name=owner.get("full_name") or "Guest Grower",
        area=listing.get("location_text"),
        distance="Nearby",
        quantity=listing.get("quantity"),
        listing_type=display_type,
        requested_item=requested_item,
        image_url=media.get("media_url") if media else None,
    )


def _build_community_summary(community: dict[str, Any], memberships: list[dict[str, Any]]) -> CommunitySummaryResponse:
    member_count = len([member for member in memberships if member.get("community_id") == community.get("id") and member.get("status") == "active"])
    return CommunitySummaryResponse(
        id=community["id"],
        name=community.get("name") or "Community",
        description=community.get("description"),
        area=community.get("area"),
        image_url=community.get("image_url"),
        member_count=member_count,
        visibility=community.get("visibility") or "public",
    )


def _build_chat_room(room: dict[str, Any], current_user_id: str) -> ChatRoomResponse:
    listing = _get_listing_or_404(room["marketplace_item_id"])
    seller = _select_one("users", {"id": room["seller_id"]}) or {}
    buyer = _select_one("users", {"id": room["buyer_id"]}) or {}
    media = _select_one("listing_media", {"listing_id": listing["id"]})
    messages = _list_messages(room["id"])
    last_message = messages[-1] if messages else None
    unread_count = len(
        [
            message for message in messages
            if message.get("sender_id") != current_user_id and not bool(message.get("is_read"))
        ]
    )
    other_user = buyer if current_user_id == room["seller_id"] else seller
    owner_name = seller.get("full_name") or "Owner"
    return ChatRoomResponse(
        id=room["id"],
        marketplace_item_id=listing["id"],
        buyer_id=room["buyer_id"],
        seller_id=room["seller_id"],
        item_image=media.get("media_url") if media else None,
        item_name=listing.get("title") or listing.get("crop_name") or "Listing",
        quantity=listing.get("quantity"),
        listing_type=_map_listing_from_db(listing)[0],
        owner_name=owner_name,
        other_user_name=other_user.get("full_name") or owner_name,
        last_message=last_message.get("message") if last_message else None,
        last_message_time=_relative_time(last_message.get("created_at")) if last_message else None,
        unread_count=unread_count,
    )


def _select_one(table: str, filters: dict[str, Any] | None = None) -> dict[str, Any] | None:
    rows = supabase_client.select(table, filters=filters, limit=1)
    return rows[0] if rows else None


def _get_listing_or_404(listing_id: str) -> dict[str, Any]:
    listing = _select_one("marketplace_listings", {"id": listing_id})
    if not listing:
        raise HTTPException(status_code=404, detail="Marketplace listing not found")
    return listing


def _list_chat_rooms_for_user(user_id: str) -> list[dict[str, Any]]:
    if supabase_client.is_configured():
        try:
            rooms = supabase_client.select("chat_rooms", order="updated_at.desc", limit=100)
            return [room for room in rooms if user_id in {room.get("buyer_id"), room.get("seller_id")}]
        except SupabaseError as exc:
            if not _is_missing_table_error(exc):
                raise HTTPException(status_code=502, detail=str(exc)) from exc
    return [
        room for room in sorted(_local_chat_rooms.values(), key=lambda item: item.get("updated_at", ""), reverse=True)
        if user_id in {room.get("buyer_id"), room.get("seller_id")}
    ]


def _find_existing_chat_room(marketplace_item_id: str, buyer_id: str, seller_id: str) -> dict[str, Any] | None:
    rooms = _list_chat_rooms_for_user(buyer_id)
    for room in rooms:
        if (
            room.get("marketplace_item_id") == marketplace_item_id
            and room.get("buyer_id") == buyer_id
            and room.get("seller_id") == seller_id
        ):
            return room
    return None


def _insert_chat_room(room: dict[str, Any]) -> None:
    if supabase_client.is_configured():
        try:
            supabase_client.insert("chat_rooms", room)
            return
        except SupabaseError as exc:
            if not _is_missing_table_error(exc):
                raise HTTPException(status_code=502, detail=str(exc)) from exc
    _local_chat_rooms[room["id"]] = room


def _get_chat_room_or_404(chat_room_id: str, user_id: str) -> dict[str, Any]:
    rooms = _list_chat_rooms_for_user(user_id)
    for room in rooms:
        if room.get("id") == chat_room_id:
            return room
    raise HTTPException(status_code=404, detail="Chat room not found")


def _list_messages(chat_room_id: str) -> list[dict[str, Any]]:
    if supabase_client.is_configured():
        try:
            return supabase_client.select("messages", filters={"chat_room_id": chat_room_id}, order="created_at.asc", limit=500)
        except SupabaseError as exc:
            if not _is_missing_table_error(exc):
                raise HTTPException(status_code=502, detail=str(exc)) from exc
    return sorted(_local_messages.get(chat_room_id, []), key=lambda item: item.get("created_at", ""))


def _insert_message(message: dict[str, Any]) -> None:
    if supabase_client.is_configured():
        try:
            supabase_client.insert("messages", message)
            return
        except SupabaseError as exc:
            if not _is_missing_table_error(exc):
                raise HTTPException(status_code=502, detail=str(exc)) from exc
    _local_messages.setdefault(message["chat_room_id"], []).append(message)


def _touch_chat_room(chat_room_id: str) -> None:
    timestamp = datetime.now(timezone.utc).isoformat()
    if supabase_client.is_configured():
        try:
            supabase_client.update("chat_rooms", {"id": chat_room_id}, {"updated_at": timestamp})
            return
        except SupabaseError as exc:
            if not _is_missing_table_error(exc):
                raise HTTPException(status_code=502, detail=str(exc)) from exc
    if chat_room_id in _local_chat_rooms:
        _local_chat_rooms[chat_room_id]["updated_at"] = timestamp


def _mark_messages_read(chat_room_id: str, user_id: str) -> int:
    messages = _list_messages(chat_room_id)
    unread = [message for message in messages if message.get("sender_id") != user_id and not bool(message.get("is_read"))]
    if not unread:
        return 0
    if supabase_client.is_configured():
        updated = 0
        for message in unread:
            try:
                supabase_client.update("messages", {"id": message["id"]}, {"is_read": True})
                updated += 1
            except SupabaseError as exc:
                if not _is_missing_table_error(exc):
                    raise HTTPException(status_code=502, detail=str(exc)) from exc
        return updated
    for message in unread:
        message["is_read"] = True
    return len(unread)


def _serialize_message(message: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": message["id"],
        "chat_room_id": message["chat_room_id"],
        "sender_id": message["sender_id"],
        "message": message.get("message") or "",
        "is_read": bool(message.get("is_read")),
        "created_at": _iso(message.get("created_at")),
    }


def _default_community_id(user_id: str) -> str | None:
    member = _select_one("community_members", {"user_id": user_id})
    if member:
        return member.get("community_id")
    community = _select_one("communities")
    return community.get("id") if community else None


def _map_feed_post_to_db(post_type: str, caption: str) -> tuple[str, str]:
    normalized = post_type.strip().lower()
    if normalized == "plant update":
        return "progress", caption
    if normalized == "harvest update":
        return "harvest", caption
    if normalized == "ask question":
        return "question", caption
    if normalized == "barter offer":
        return "advice", f"[BARTER] {caption}"
    if normalized == "sell offer":
        return "advice", f"[SELL] {caption}"
    if normalized == "donation offer":
        return "advice", f"[DONATE] {caption}"
    return "tip", caption


def _map_feed_post_from_db(post: dict[str, Any]) -> str:
    body = post.get("body") or ""
    if body.startswith("[BARTER]"):
        return "barter offer"
    if body.startswith("[SELL]"):
        return "sell offer"
    if body.startswith("[DONATE]"):
        return "donation offer"
    post_type = (post.get("post_type") or "").lower()
    if post_type == "progress":
        return "plant update"
    if post_type == "harvest":
        return "harvest update"
    if post_type == "question":
        return "ask question"
    return "plant update"


def _clean_feed_caption(body: str) -> str:
    for marker in ("[BARTER] ", "[SELL] ", "[DONATE] "):
        if body.startswith(marker):
            return body[len(marker):]
    return body


def _map_listing_to_db(listing_type: str, requested_item: str | None) -> tuple[str, str, float | None]:
    normalized = listing_type.strip().lower()
    if normalized == "barter":
        requested = requested_item or "Open to similar crops"
        return "barter", f"[REQUEST] {requested}", None
    if normalized == "donate":
        return "sell", "[DONATE] Free community giveaway", 0
    return "sell", "Local sale listing", 6.5


def _map_listing_from_db(listing: dict[str, Any]) -> tuple[str, str | None]:
    description = listing.get("description") or ""
    if description.startswith("[DONATE]"):
        return "Donate", None
    if listing.get("listing_type") == "barter":
        requested = description.replace("[REQUEST] ", "", 1) if description.startswith("[REQUEST] ") else None
        return "Barter", requested
    return "Sell", None


def _relative_time(value: Any) -> str:
    if not value:
        return "Recently"
    if isinstance(value, str):
        try:
            created_at = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return "Recently"
    else:
        created_at = value
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - created_at
    hours = int(delta.total_seconds() // 3600)
    if hours < 1:
        return "Just now"
    if hours < 24:
        return f"{hours} hours ago"
    days = hours // 24
    if days == 1:
        return "Yesterday"
    return f"{days} days ago"


def _iso(value: Any) -> str:
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value or "")


def _is_missing_table_error(exc: SupabaseError) -> bool:
    text = str(exc).lower()
    return "relation" in text or "could not find the table" in text or "pgrst205" in text
