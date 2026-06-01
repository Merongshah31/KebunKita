from __future__ import annotations

from backend.agents.memory_core import memory_core_agent


class SmartFarmingAgent:
    def generate_plan(self, user_id: str, plant_name: str, budget_rm: float | None = None) -> dict:
        tasks = [
            {"time": "07:00", "task": f"Water {plant_name}", "reason": "Morning care and moisture check"},
            {"time": "08:00", "task": f"Send Telegram progress update for {plant_name}", "reason": "Track farming progress"},
            {"time": "18:00", "task": f"Review leaf condition for {plant_name}", "reason": "Evening health check"},
        ]
        if budget_rm is not None and budget_rm < 20:
            tasks.append({"time": "19:00", "task": "Use low-cost care plan", "reason": "Stay within budget"})

        payload = {"plant_name": plant_name, "budget_rm": budget_rm, "tasks": tasks}
        memory_core_agent.save(user_id=user_id, agent_name="smart_farming", payload=payload)
        return payload


smart_farming_agent = SmartFarmingAgent()