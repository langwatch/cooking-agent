"""FastAPI backend wrapping the cooking agent. Run: `make api`."""

from __future__ import annotations

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_agent_cache: dict[str, object] = {}


def _get_agent(tier: str):
    if tier not in _agent_cache:
        _agent_cache[tier] = build_agent(tier=tier)
    return _agent_cache[tier]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    tier: str = Field("mid", pattern="^(cheap|mid|premium)$")


class ChatResponse(BaseModel):
    reply: str
    tier: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    flags = load_flags()
    if not flags.cooking_agent_enabled:
        raise HTTPException(status_code=503, detail="cooking_agent_enabled flag is OFF")
    agent = _get_agent(req.tier)
    reply = agent.chat(req.message)
    return ChatResponse(reply=reply, tier=req.tier)
