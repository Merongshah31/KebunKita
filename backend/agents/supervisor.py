from __future__ import annotations

from backend.agents.community_exchange import community_exchange_agent
from backend.agents.decision_support import decision_support_agent
from backend.agents.plant_health import plant_health_agent
from backend.agents.smart_farming import smart_farming_agent


class AgentSupervisor:
    def analyze_plant(
        self,
        user_id: str,
        image_name: str,
        image_bytes: bytes | None = None,
        notes: str | None = None,
    ) -> dict:
        return plant_health_agent.analyze(
            user_id=user_id,
            image_name=image_name,
            image_bytes=image_bytes,
            notes=notes,
        )

    def create_farming_plan(self, user_id: str, plant_name: str, budget_rm: float | None = None) -> dict:
        return smart_farming_agent.generate_plan(user_id=user_id, plant_name=plant_name, budget_rm=budget_rm)

    def match_harvest(self, user_id: str, title: str, quantity: str, location: str | None = None) -> dict:
        return community_exchange_agent.match_harvest(user_id=user_id, title=title, quantity=quantity, location=location)

    def chat_support(
        self,
        user_id: str,
        budget_rm: float,
        timeline_weeks: int,
        space: str,
        goal: str,
        chat_message: str | None = None,
    ) -> dict:
        return decision_support_agent.answer(
            user_id=user_id,
            budget_rm=budget_rm,
            timeline_weeks=timeline_weeks,
            space=space,
            goal=goal,
            chat_message=chat_message,
        )


agent_supervisor = AgentSupervisor()