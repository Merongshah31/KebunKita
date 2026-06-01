from __future__ import annotations

from backend.lib.ai_hooks import analyze_with_yolov8, explain_with_deepseek
from backend.agents.memory_core import memory_core_agent


class PlantHealthAgent:
    def analyze(self, user_id: str, image_name: str, image_bytes: bytes | None = None, notes: str | None = None) -> dict:
        vision_result = analyze_with_yolov8(image_name=image_name, image_bytes=image_bytes)
        status = vision_result.get("status", "unknown")
        confidence = float(vision_result.get("confidence", 0.0))

        if status == "healthy" and confidence >= 0.75:
            result = {
                "status": "healthy",
                "confidence": confidence,
                "disease_name": None,
                "symptoms": ["No critical symptoms detected"],
                "treatment_plan": ["Continue routine watering", "Monitor leaf color weekly"],
                "recommendation": "Plant looks healthy. Keep current care routine.",
            }
        elif status == "diseased" and confidence >= 0.75:
            disease_name = vision_result.get("label") or "Plant Disease"
            result = {
                "status": "diseased",
                "confidence": confidence,
                "disease_name": disease_name,
                "symptoms": ["white powder", "leaf curling", "slow growth"],
                "treatment_plan": ["Apply neem oil", "Improve air flow", "Avoid overwatering"],
                "recommendation": "Likely fungal disease. Apply treatment and monitor for 3 days.",
            }
        else:
            deepseek_result = explain_with_deepseek(
                prompt="Analyze the plant image, explain symptoms, suggest treatments, and recommend next steps.",
                context={
                    "user_id": user_id,
                    "image_name": image_name,
                    "notes": notes,
                    "vision_result": vision_result,
                },
            )
            result = {
                "status": "unknown",
                "confidence": confidence,
                "disease_name": deepseek_result.get("disease_name"),
                "symptoms": deepseek_result.get("symptoms", ["Model confidence too low"]),
                "treatment_plan": deepseek_result.get(
                    "treatment_plan",
                    ["Send to DeepSeek for deeper analysis", "Upload a clearer image"],
                ),
                "recommendation": deepseek_result.get(
                    "recommendation",
                    "Unknown plant or low confidence. Use LLM fallback and check the memory history.",
                ),
            }

        memory_core_agent.save(
            user_id=user_id,
            agent_name="plant_health",
            payload={
                "image_name": image_name,
                "vision_result": vision_result,
                "notes": notes,
                "result": result,
            },
        )
        return result


plant_health_agent = PlantHealthAgent()
