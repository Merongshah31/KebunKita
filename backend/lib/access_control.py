from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException

from backend.lib.supabase_client import SupabaseError, supabase_client


@dataclass(frozen=True)
class AccessRule:
    guest_limit: int | None
    premium_allowed: bool = True


ACCESS_RULES: dict[tuple[str, str], AccessRule] = {
    ("plant_health", "upload_picture"): AccessRule(1),
    ("plant_health", "analyze_images"): AccessRule(None),
    ("plant_health", "take_picture"): AccessRule(1),
    ("plant_health", "take_video"): AccessRule(0),
    ("plant_health", "save_album_journey_picture"): AccessRule(0),
    ("plant_health", "save_to_smart_farming"): AccessRule(0),
    ("smart_farming", "accept_plant_name"): AccessRule(0),
    ("smart_farming", "generate_task"): AccessRule(None),
    ("smart_farming", "push_notification"): AccessRule(0),
    ("community_exchange", "user_post"): AccessRule(None),
    ("community_exchange", "trade"): AccessRule(1),
    ("decision_support", "chat_message"): AccessRule(5),
}


_local_guest_usage: dict[tuple[str, str, str], int] = {}
_local_users: dict[str, dict[str, Any]] = {}


def remember_local_user(user: dict[str, Any]) -> None:
    user_id = user.get("id")
    if user_id:
        _local_users[user_id] = user


def get_user(user_id: str) -> dict[str, Any]:
    if supabase_client.is_configured():
        try:
            users = supabase_client.select("users", filters={"id": user_id}, limit=1)
            if users:
                return users[0]
        except SupabaseError:
            pass
    return _local_users.get(user_id, {"id": user_id, "access_type": "guest", "is_guest": True})


def ensure_access(user_id: str, function_name: str, activity_name: str) -> dict[str, Any]:
    rule = ACCESS_RULES.get((function_name, activity_name))
    if rule is None:
        return {"allowed": True, "usage_count": None, "usage_limit": None}

    user = get_user(user_id)
    access_type = user.get("access_type", "guest")
    is_guest = bool(user.get("is_guest", access_type == "guest"))

    if access_type == "premium":
        return {"allowed": True, "usage_count": None, "usage_limit": None}

    if not is_guest:
        return {"allowed": True, "usage_count": None, "usage_limit": None}

    if rule.guest_limit == 0:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "ACCESS_LIMITED",
                "message": "This feature is available in the premium Flutter app.",
                "function_name": function_name,
                "activity_name": activity_name,
                "usage_limit": 0,
            },
        )

    if rule.guest_limit is None:
        return {"allowed": True, "usage_count": None, "usage_limit": None}

    current_usage = _read_usage(user_id, function_name, activity_name)
    if current_usage >= rule.guest_limit:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "ACCESS_LIMIT_REACHED",
                "message": "Guest limit reached. Continue with Flutter for full access.",
                "function_name": function_name,
                "activity_name": activity_name,
                "usage_count": current_usage,
                "usage_limit": rule.guest_limit,
            },
        )

    next_usage = current_usage + 1
    _write_usage(user_id, function_name, activity_name, next_usage, rule.guest_limit)
    return {"allowed": True, "usage_count": next_usage, "usage_limit": rule.guest_limit}


def _read_usage(user_id: str, function_name: str, activity_name: str) -> int:
    if supabase_client.is_configured():
        try:
            rows = supabase_client.select(
                "guest_usage",
                filters={"user_id": user_id, "function_name": function_name, "activity_name": activity_name},
                limit=1,
            )
            if rows:
                return int(rows[0].get("usage_count") or 0)
        except SupabaseError:
            pass
    return _local_guest_usage.get((user_id, function_name, activity_name), 0)


def _write_usage(
    user_id: str,
    function_name: str,
    activity_name: str,
    usage_count: int,
    usage_limit: int,
) -> None:
    payload = {
        "user_id": user_id,
        "function_name": function_name,
        "activity_name": activity_name,
        "usage_count": usage_count,
        "usage_limit": usage_limit,
    }
    if supabase_client.is_configured():
        try:
            supabase_client.upsert(
                "guest_usage",
                payload,
                on_conflict="user_id,function_name,activity_name",
            )
            return
        except SupabaseError:
            pass
    _local_guest_usage[(user_id, function_name, activity_name)] = usage_count
