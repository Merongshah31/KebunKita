from __future__ import annotations

from backend.agents.memory_core import memory_core_agent


class CommunityExchangeAgent:
    def match_harvest(self, user_id: str, title: str, quantity: str, location: str | None = None) -> dict:
        matches = [
            {"match_user": "ahmad-demo", "score": 0.94, "reason": "Nearby and needs this crop today"},
            {"match_user": "siti-demo", "score": 0.78, "reason": "Good preference fit but later timing"},
        ]
        payload = {"title": title, "quantity": quantity, "location": location, "matches": matches}
        memory_core_agent.save(user_id=user_id, agent_name="community_exchange", payload=payload)
        return payload


community_exchange_agent = CommunityExchangeAgent()