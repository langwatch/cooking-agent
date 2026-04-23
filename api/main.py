"""FastAPI backend wrapping the cooking agent. Run: `make api`."""

from __future__ import annotations

import base64
import os
import re

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel, Field

from agent.cooking_agent import build_agent
from agent.flags import load as load_flags
from agent.telemetry import setup as setup_telemetry

load_dotenv()
setup_telemetry()

app = FastAPI(title="Cooking Agent API", version="0.3.0")

# Comma-separated origins, or "*" to allow all. Defaults to localhost dev + any *.vercel.app preview.
_origins_env = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000")
_allow_origins = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allow_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

_agent_cache: dict[str, object] = {}


def _get_agent(tier: str):
    if tier not in _agent_cache:
        _agent_cache[tier] = build_agent(tier=tier)
    return _agent_cache[tier]


class HistoryMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., min_length=1, max_length=4000)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    tier: str = Field("mid", pattern="^(cheap|mid|premium)$")
    history: list[HistoryMessage] = Field(default_factory=list, max_length=50)
    session_id: str | None = Field(None, max_length=64)
    # Optional image: data URL ("data:image/jpeg;base64,..."), HTTP(S) URL, or raw base64.
    # Only used when auto_multimodal_images flag is ON; silently ignored otherwise.
    image: str | None = Field(None, max_length=10_000_000)


class ChatResponse(BaseModel):
    reply: str
    tier: str


@app.get("/health")
def health():
    return {"status": "ok"}


_GEMINI_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "gemini-2.0-flash:generateContent"
)
_GEMINI_SYSTEM = (
    "You are a world-class home-cooking assistant. "
    "The user has shared an image. Analyse what you see (e.g. fridge contents, "
    "a finished dish, ingredients on a counter) and give actionable cooking advice: "
    "suggest 2–3 recipes if it looks like a fridge/pantry photo, or explain how to "
    "recreate the dish if it looks like a finished meal. "
    "Follow the same response format as always: 1-line summary, ingredients with "
    "quantities, numbered steps, dietary notes, chef's tip."
)


def _image_part(image: str) -> dict:
    """Convert image string to a Gemini inlineData part."""
    if image.startswith("data:"):
        # data URL: data:<mime>;base64,<data>
        m = re.match(r"data:([^;]+);base64,(.+)", image, re.DOTALL)
        if not m:
            raise ValueError("Malformed data URL")
        return {"inlineData": {"mimeType": m.group(1), "data": m.group(2)}}
    if image.startswith("http://") or image.startswith("https://"):
        resp = httpx.get(image, timeout=15, follow_redirects=True)
        resp.raise_for_status()
        mime = resp.headers.get("content-type", "image/jpeg").split(";")[0]
        return {"inlineData": {"mimeType": mime, "data": base64.b64encode(resp.content).decode()}}
    # Raw base64 fallback — assume JPEG
    return {"inlineData": {"mimeType": "image/jpeg", "data": image}}


def _call_gemini_vision(message: str, image: str) -> str:
    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")
    payload = {
        "system_instruction": {"parts": [{"text": _GEMINI_SYSTEM}]},
        "contents": [
            {
                "role": "user",
                "parts": [_image_part(image), {"text": message or "What can I cook with this?"}],
            }
        ],
    }
    resp = httpx.post(
        _GEMINI_URL,
        params={"key": api_key},
        json=payload,
        timeout=60,
    )
    resp.raise_for_status()
    data = resp.json()
    try:
        return data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected Gemini response: {data}") from exc


@app.get("/flags")
def get_flags():
    flags = load_flags()
    return {
        "dietary_pref_chips": flags.is_on("auto_dietary_pref_chips", default=False),
        "chat_bubble_layout": flags.is_on("auto_chat_bubble_layout", default=False),
        "premium_ui": flags.is_on("auto_premium_ui", default=False),
        "session_threading": flags.is_on("auto_session_threading", default=False),
        "multimodal_images": flags.is_on("auto_multimodal_images", default=False),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    flags = load_flags()
    if not flags.cooking_agent_enabled:
        raise HTTPException(status_code=503, detail="cooking_agent_enabled flag is OFF")

    # Multimodal path: delegate to Gemini Vision when flag is ON and image is present.
    if flags.is_on("auto_multimodal_images", default=False) and req.image:
        reply = _call_gemini_vision(req.message, req.image)
        return ChatResponse(reply=reply, tier=req.tier)

    thread_id = req.session_id if flags.is_on("auto_session_threading", default=False) else None
    if flags.is_on("auto_conversation_history", default=False) and req.history:
        # Fresh agent per request: avoids cross-user history contamination and
        # passes the client-supplied history so follow-up messages get full context.
        agent = build_agent(tier=req.tier)
        history = [{"role": h.role, "content": h.content} for h in req.history]
        reply = agent.chat(req.message, history=history, thread_id=thread_id)
    else:
        agent = _get_agent(req.tier)
        reply = agent.chat(req.message, thread_id=thread_id)
    return ChatResponse(reply=reply, tier=req.tier)
