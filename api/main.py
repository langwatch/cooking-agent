"""FastAPI backend wrapping the cooking agent. Run: `make api`."""

from __future__ import annotations

import os

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


class ChatResponse(BaseModel):
    reply: str
    tier: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/flags")
def get_flags():
    flags = load_flags()
    return {
        "dietary_pref_chips": flags.is_on("auto_dietary_pref_chips", default=False),
        "chat_bubble_layout": flags.is_on("auto_chat_bubble_layout", default=False),
        "premium_ui": flags.is_on("auto_premium_ui", default=False),
        "session_threading": flags.is_on("auto_session_threading", default=False),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    flags = load_flags()
    if not flags.cooking_agent_enabled:
        raise HTTPException(status_code=503, detail="cooking_agent_enabled flag is OFF")
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
