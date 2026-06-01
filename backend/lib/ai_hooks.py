from __future__ import annotations

import base64
import json
import os
from typing import Any
from urllib import error, request


def _post_json(url: str, payload: dict[str, Any], headers: dict[str, str] | None = None, timeout: int = 30) -> dict[str, Any]:
    body = json.dumps(payload).encode("utf-8")
    req = request.Request(url, data=body, headers={"Content-Type": "application/json", **(headers or {})})
    with request.urlopen(req, timeout=timeout) as response:
        raw = response.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def _extract_llm_content(response_data: dict[str, Any]) -> str:
    if not response_data:
        return ""
    if "choices" in response_data and response_data["choices"]:
        first_choice = response_data["choices"][0] or {}
        message = first_choice.get("message", {})
        content = message.get("content")
        if isinstance(content, str):
            return content
    if "message" in response_data:
        message = response_data["message"] or {}
        content = message.get("content")
        if isinstance(content, str):
            return content
    if "response" in response_data and isinstance(response_data["response"], str):
        return response_data["response"]
    if "answer" in response_data and isinstance(response_data["answer"], str):
        return response_data["answer"]
    return ""


def _safe_json_from_text(text: str) -> dict[str, Any]:
    if not text:
        return {}
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`")
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
    try:
        parsed = json.loads(cleaned)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                parsed = json.loads(cleaned[start : end + 1])
                return parsed if isinstance(parsed, dict) else {}
            except json.JSONDecodeError:
                return {}
        return {}


def build_guardrailed_context(context: dict[str, Any] | None = None) -> dict[str, Any]:
    safe_context = context or {}
    return {
        "rules": [
            "Use only the provided image analysis, memory, and user context.",
            "Do not invent diseases, treatments, or plant facts not supported by the context.",
            "If confidence is low or evidence is missing, say so and recommend fallback analysis or more data.",
            "Return concise, actionable answers in JSON when possible.",
        ],
        "context": safe_context,
    }


def normalize_guardrailed_response(response_data: dict[str, Any], fallback: dict[str, Any]) -> dict[str, Any]:
    parsed = response_data if isinstance(response_data, dict) else {}

    answer = parsed.get("answer") or parsed.get("recommendation") or fallback.get("answer") or fallback.get("recommendation") or ""
    symptoms = parsed.get("symptoms") if isinstance(parsed.get("symptoms"), list) else fallback.get("symptoms", [])
    treatment_plan = parsed.get("treatment_plan") if isinstance(parsed.get("treatment_plan"), list) else fallback.get("treatment_plan", [])
    confidence = parsed.get("confidence")
    if not isinstance(confidence, (int, float)):
        confidence = fallback.get("confidence", 0.5)

    return {
        "answer": answer,
        "symptoms": symptoms,
        "treatment_plan": treatment_plan,
        "recommendation": parsed.get("recommendation") or fallback.get("recommendation") or answer,
        "confidence": confidence,
        "source": parsed.get("source") or fallback.get("source") or "guardrail-fallback",
        "needs_review": bool(parsed.get("needs_review", confidence < 0.75)),
        "raw_response": parsed.get("raw_response"),
        "error_message": parsed.get("error_message") or fallback.get("error_message"),
    }


def describe_guardrails() -> dict[str, Any]:
    return {
        "env_status": {
            "YOLOV8_ENDPOINT": bool(os.getenv("YOLOV8_ENDPOINT")),
            "DEEPSEEK_API_KEY": bool(os.getenv("DEEPSEEK_API_KEY")),
        },
        "guardrail_rules": build_guardrailed_context().get("rules", []),
        "fallback_paths": {
            "vision": ["YOLOv8 endpoint", "local heuristic fallback"],
            "llm": ["DeepSeek", "local safe fallback"],
        },
        "memory_policy": "Store plant history, prior disease analysis, recommendations, and farming activity only.",
        "review_policy": "If confidence is low or evidence is missing, return uncertainty and request more data or human review.",
    }


def analyze_with_yolov8(image_name: str, image_bytes: bytes | None = None) -> dict[str, Any]:
    endpoint = os.getenv("YOLOV8_ENDPOINT")
    if endpoint:
        payload = {
            "image_name": image_name,
            "image_base64": base64.b64encode(image_bytes or b"").decode("utf-8") if image_bytes else None,
        }
        try:
            return _post_json(endpoint, payload)
        except (error.URLError, TimeoutError, json.JSONDecodeError):
            pass

    lowered = image_name.lower()
    if any(keyword in lowered for keyword in ["healthy", "good", "ok"]):
        return {
            "status": "healthy",
            "confidence": 0.93,
            "label": "Healthy Plant",
            "reason": "Fallback heuristic detected a healthy-sounding image name.",
        }
    if any(keyword in lowered for keyword in ["leaf", "spot", "disease", "mildew", "yellow"]):
        return {
            "status": "diseased",
            "confidence": 0.87,
            "label": "Powdery Mildew",
            "reason": "Fallback heuristic detected common disease keywords.",
        }
    return {
        "status": "unknown",
        "confidence": 0.41,
        "label": None,
        "reason": "Unknown plant or low-confidence fallback.",
    }


def explain_with_deepseek(prompt: str, context: dict[str, Any] | None = None) -> dict[str, Any]:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    deepseek_base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1/chat/completions")
    guardrailed_context = build_guardrailed_context(context)
    fallback = {
        "answer": "Fallback analysis: the model does not have enough evidence, so request a clearer image or more training data.",
        "symptoms": ["low confidence", "insufficient evidence"],
        "treatment_plan": ["Retake image", "Upload more training data", "Check leaf and stem changes"],
        "recommendation": "Use Memory Core history and collect a new dataset sample for retraining.",
        "confidence": 0.5,
        "source": "fallback",
    }

    if api_key:
        payload = {
            "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are KebunKita's plant assistant. Follow these guardrails strictly: "
                        "use only the provided context, do not invent unsupported plant facts or treatments, "
                        "state uncertainty when evidence is insufficient, and return JSON with answer, symptoms, "
                        "treatment_plan, recommendation, confidence, and needs_review when possible."
                    ),
                },
                {"role": "user", "content": f"Prompt: {prompt}\nGuardrails: {json.dumps(guardrailed_context, ensure_ascii=False)}"},
            ],
        }
        try:
            response_data = _post_json(deepseek_base_url, payload, headers={"Authorization": f"Bearer {api_key}"})
            content = _extract_llm_content(response_data)
            structured = _safe_json_from_text(content)
            if structured:
                structured["raw_response"] = response_data
                structured.setdefault("source", "deepseek")
                return normalize_guardrailed_response(structured, fallback)
            fallback["answer"] = content or fallback["answer"]
            fallback["source"] = "deepseek" if content else fallback["source"]
            fallback["raw_response"] = response_data
            return normalize_guardrailed_response({}, fallback)
        except (error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            fallback["error_message"] = f"DeepSeek request failed: {exc.__class__.__name__}"

    return fallback
