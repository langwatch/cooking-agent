"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2 } from "lucide-react";
import { cn, API_URL } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };
type Tier = "cheap" | "mid" | "premium";

const DIETARY_CHIPS: { label: string; value: string }[] = [
  { label: "🌱 Vegan", value: "Vegan" },
  { label: "🌾 Gluten-Free", value: "Gluten-Free" },
  { label: "🥜 Nut-Free", value: "Nut-Free" },
  { label: "🥛 Dairy-Free", value: "Dairy-Free" },
];

function getOrCreateSessionId(): string {
  try {
    const stored = localStorage.getItem("cooking_session_id");
    if (stored) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem("cooking_session_id", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

const SESSION_MESSAGES_KEY = "cooking_session_messages";

function loadPersistedMessages(): Message[] {
  try {
    const raw = localStorage.getItem(SESSION_MESSAGES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Message[];
  } catch {
    return [];
  }
}

function persistMessages(msgs: Message[]): void {
  try {
    localStorage.setItem(SESSION_MESSAGES_KEY, JSON.stringify(msgs));
  } catch {
    // localStorage quota exceeded or unavailable — ignore
  }
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [tier, setTier] = useState<Tier>("mid");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chipsEnabled, setChipsEnabled] = useState(false);
  const [bubbleLayout, setBubbleLayout] = useState(false);
  const [sessionThreading, setSessionThreading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [activePrefs, setActivePrefs] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sid = getOrCreateSessionId();
    setSessionId(sid);

    fetch(`${API_URL}/flags`)
      .then((r) => r.json())
      .then((data) => {
        setChipsEnabled(!!data?.dietary_pref_chips);
        setBubbleLayout(!!data?.chat_bubble_layout);
        const threading = !!data?.session_threading;
        setSessionThreading(threading);
        if (threading) {
          setMessages(loadPersistedMessages());
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  function togglePref(value: string) {
    setActivePrefs((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setInput("");

    const prefContext =
      activePrefs.size > 0 ? ` [dietary: ${[...activePrefs].join(", ")}]` : "";
    const messageWithPrefs = text + prefContext;

    const nextMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setLoading(true);
    try {
      // `messages` still holds the conversation *before* the current user turn
      // (React state update above is async). Send it as history so the backend
      // can provide full conversation context when auto_conversation_history is on.
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const body: Record<string, unknown> = { message: messageWithPrefs, tier, history };
      if (sessionThreading && sessionId) {
        body.session_id = sessionId;
      }
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`${res.status}: ${errBody}`);
      }
      const data = (await res.json()) as { reply: string };
      const withReply: Message[] = [...nextMessages, { role: "assistant", content: data.reply }];
      setMessages(withReply);
      if (sessionThreading) {
        persistMessages(withReply);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="flex items-center gap-2 text-sm">
        <label className="text-muted-foreground">Model tier</label>
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          className="bg-card border border-border rounded px-2 py-1"
        >
          <option value="cheap">cheap</option>
          <option value="mid">mid</option>
          <option value="premium">premium</option>
        </select>
      </div>

      {chipsEnabled && (
        <div className="flex flex-wrap gap-2">
          {DIETARY_CHIPS.map(({ label, value }) => (
            <button
              key={value}
              type="button"
              onClick={() => togglePref(value)}
              className={cn(
                "px-3 py-1 rounded-full text-sm border transition-colors",
                activePrefs.has(value)
                  ? "bg-accent text-background border-accent font-medium"
                  : "bg-card border-border text-muted-foreground hover:border-accent hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4 space-y-4 min-h-[400px]"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Try: &quot;A 30-minute weeknight pasta using what&apos;s usually in a pantry.&quot;
          </p>
        )}
        {messages.map((m, i) =>
          bubbleLayout ? (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[82%]",
                  m.role === "user"
                    ? "bg-accent/15 border border-accent/30 text-foreground"
                    : "bg-card border border-border shadow-sm",
                )}
              >
                <div
                  className={cn(
                    "text-xs font-semibold mb-1.5 tracking-wide",
                    m.role === "user" ? "text-accent" : "text-muted-foreground",
                  )}
                >
                  {m.role === "user" ? "You" : "Chef"}
                </div>
                <div className="prose-invert">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div
              key={i}
              className={cn(
                "rounded-lg px-4 py-3",
                m.role === "user" ? "bg-muted ml-8" : "bg-background mr-8 border border-border",
              )}
            >
              <div className="text-xs text-muted-foreground mb-1">
                {m.role === "user" ? "You" : "Chef"}
              </div>
              <div className="prose-invert">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          ),
        )}
        {loading && (
          <div className="flex flex-col gap-1 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={16} /> cooking…
            </div>
            {slow && (
              <div className="text-xs ml-6">
                The backend runs on a free tier and may cold-start — first reply can take up to ~60s.
              </div>
            )}
          </div>
        )}
        {error && <div className="text-red-400 text-sm">Error: {error}</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            chipsEnabled && activePrefs.size > 0
              ? `What are we cooking? (${[...activePrefs].join(", ")} active)`
              : "What are we cooking?"
          }
          className="flex-1 bg-card border border-border rounded px-3 py-2 focus:outline-none focus:border-accent"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-accent text-background rounded px-4 py-2 font-medium disabled:opacity-50 flex items-center gap-2"
        >
          <Send size={16} /> Send
        </button>
      </form>
    </div>
  );
}
