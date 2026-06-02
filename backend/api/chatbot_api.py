from __future__ import annotations

from fastapi import APIRouter

from backend.lib.ai_hooks import explain_with_deepseek
from backend.models.schemas import ChatbotReplyRequest, ChatbotReplyResponse


router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

DEFAULT_CHATBOT_REPLY = "Terima kasih! Boleh teruskan dengan trade request jika berminat."


@router.post("/reply", response_model=ChatbotReplyResponse)
async def chatbot_reply(payload: ChatbotReplyRequest) -> ChatbotReplyResponse:
    rule_reply = _match_rule(payload.userMessage)
    if rule_reply:
        return ChatbotReplyResponse(reply=rule_reply)

    ai_reply = _fallback_ai_reply(payload)
    return ChatbotReplyResponse(reply=ai_reply or DEFAULT_CHATBOT_REPLY)


def _match_rule(message: str) -> str | None:
    lowered = (message or "").strip().lower()
    if not lowered:
        return None

    if any(keyword in lowered for keyword in ("available", "still available", " ada ", "ada?")) or lowered == "ada":
        return "Ya, masih available. Saya boleh barter atau jual ikut persetujuan."
    if any(keyword in lowered for keyword in ("barter", "trade")):
        return "Boleh, saya berminat untuk barter. Apa tanaman yang awak boleh offer?"
    if "kangkung" in lowered:
        return "Kangkung sesuai. Saya boleh tukar dengan cili ini."
    if any(keyword in lowered for keyword in ("pickup", "ambil")):
        return "Boleh ambil petang ini di kawasan komuniti."
    return None


def _fallback_ai_reply(payload: ChatbotReplyRequest) -> str:
    context = {
        "chat_room_id": payload.chatRoomId,
        "owner_name": payload.ownerName,
        "item_name": payload.itemName,
        "quantity": payload.quantity,
        "listing_type": payload.listingType,
        "preferred_items": payload.preferredItems,
        "user_message": payload.userMessage,
        "mode": "marketplace-demo-chat",
    }
    prompt = (
        f"You are {payload.ownerName}, a friendly local farmer in KebunKita marketplace. "
        f"You are offering {payload.quantity or 'some'} {payload.itemName} for {payload.listingType or 'exchange'}. "
        f"You prefer {', '.join(payload.preferredItems) if payload.preferredItems else 'similar local crops'}. "
        "Reply naturally in short Malay-English casual style. "
        "Keep it focused on barter, selling, pickup, and crop exchange. "
        "Do not mention AI, do not add explanations outside the reply. "
        f'User message: "{payload.userMessage}" '
        'Return JSON with an "answer" field only if possible.'
    )
    response = explain_with_deepseek(prompt, context)
    reply = (response.get("answer") or response.get("recommendation") or "").strip()
    if not reply or reply.lower().startswith("fallback analysis"):
        return DEFAULT_CHATBOT_REPLY
    return reply
