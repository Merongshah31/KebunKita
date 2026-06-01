from __future__ import annotations

from backend.lib.ai_hooks import explain_with_deepseek
from backend.agents.memory_core import memory_core_agent


class DecisionSupportAgent:
    def answer(self, user_id: str, budget_rm: float, timeline_weeks: int, space: str, goal: str, chat_message: str | None = None) -> dict:
        recommendations = [
            "Leafy greens are best for beginners and quick harvests.",
            "Chili is a strong long-term option if patience is available.",
            "Herbs are a safe low-risk choice for small spaces.",
        ]
        answer = (
            f"Based on your budget of RM {budget_rm}, timeline of {timeline_weeks} weeks, "
            f"space '{space}', and goal '{goal}', start with leafy greens."
        )
        deepseek_result = explain_with_deepseek(
            prompt="Generate a contextual crop recommendation and chatbot reply for a home gardening user.",
            context={
                "budget_rm": budget_rm,
                "timeline_weeks": timeline_weeks,
                "space": space,
                "goal": goal,
                "chat_message": chat_message,
            },
        )
        answer = deepseek_result.get("answer", answer)
        recommendations = deepseek_result.get("recommendations", recommendations)
        payload = {
            "budget_rm": budget_rm,
            "timeline_weeks": timeline_weeks,
            "space": space,
            "goal": goal,
            "chat_message": chat_message,
            "answer": answer,
            "recommendations": recommendations,
            "llm_context": deepseek_result,
        }
        memory_core_agent.save(user_id=user_id, agent_name="decision_support", payload=payload)
        return payload


decision_support_agent = DecisionSupportAgent()