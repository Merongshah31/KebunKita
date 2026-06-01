from __future__ import annotations

from backend.lib.supabase_client import SupabaseError, supabase_client
from backend.tools.memory_tools import memory_store


class MemoryCoreAgent:
    def save(self, user_id: str, agent_name: str, payload: dict) -> dict:
        if supabase_client.is_configured():
            try:
                rows = supabase_client.insert(
                    "memory_entries",
                    {
                        "user_id": user_id,
                        "agent_name": agent_name,
                        "payload": payload,
                        "summary": payload.get("summary") or payload.get("recommendation") or payload.get("answer"),
                    },
                )
                if rows:
                    return rows[0]
            except SupabaseError:
                pass
        return memory_store.save(user_id=user_id, agent_name=agent_name, payload=payload)

    def history(self, user_id: str) -> list[dict]:
        if supabase_client.is_configured():
            try:
                return supabase_client.select(
                    "memory_entries",
                    filters={"user_id": user_id},
                    order="created_at.desc",
                    limit=25,
                )
            except SupabaseError:
                pass
        return memory_store.get(user_id)


memory_core_agent = MemoryCoreAgent()
