"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, ChefHat, Sparkles } from "lucide-react";
import { cn, API_URL } from "@/lib/utils";
import { RecipeCard } from "@/components/recipe-card";

type Message = { role: "user" | "assistant"; content: string };
type Tier = "cheap" | "mid" | "premium";

const DIETARY_CHIPS: { label: string; value: string; emoji: string }[] = [
  { label: "Vegan", value: "Vegan", emoji: "🌱" },
  { label: "Gluten-Free", value: "Gluten-Free", emoji: "🌾" },
  { label: "Nut-Free", value: "Nut-Free", emoji: "🥜" },
  { label: "Dairy-Free", value: "Dairy-Free", emoji: "🥛" },
];

const STARTER_PROMPTS = [
  { icon: "🍝", text: "30-minute weeknight pasta for two" },
  { icon: "🥗", text: "Quick vegan gluten-free dinner" },
  { icon: "🥛", text: "Buttermilk substitute from pantry" },
  { icon: "🍱", text: "High-protein meal prep ideas" },
];

// ── Cooking animation ──────────────────────────────────────────────────────
function CookingDots() {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-accent animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </span>
  );
}

// ── Premium message bubble ─────────────────────────────────────────────────
function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-tr-sm px-4 py-2.5 bg-accent/15 border border-accent/25 text-foreground text-sm leading-relaxed">
        {content}
      </div>
    </div>
  );
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
  const [premiumUI, setPremiumUI] = useState(false);
  const [activePrefs, setActivePrefs] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/flags`)
      .then((r) => r.json())
      .then((data) => {
        setChipsEnabled(!!data?.dietary_pref_chips);
        setBubbleLayout(!!data?.chat_bubble_layout);
        setPremiumUI(!!data?.premium_ui);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) { setSlow(false); return; }
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

  async function send(overrideText?: string) {
    const text = (overrideText ?? input).trim();
    if (!text || loading) return;
    setError(null);
    setInput("");

    const prefContext = activePrefs.size > 0 ? ` [dietary: ${[...activePrefs].join(", ")}]` : "";
    const messageWithPrefs = text + prefContext;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageWithPrefs, tier, history }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`${res.status}: ${body}`);
      }
      const data = (await res.json()) as { reply: string };
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // ── Premium UI ───────────────────────────────────────────────────────────
  if (premiumUI) {
    return (
      <div className="flex flex-col flex-1 gap-0 min-h-0">

        {/* Hero header */}
        <div className="relative mb-4 rounded-2xl overflow-hidden border border-border/40 bg-card">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          <div className="relative px-5 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
                <ChefHat size={20} className="text-accent" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-none">
                  <span className="bg-gradient-to-r from-accent to-amber-300 bg-clip-text text-transparent">
                    Cooking Agent
                  </span>
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Recipes · Substitutions · Techniques
                </p>
              </div>
            </div>
            {/* Tier selector */}
            <div className="flex items-center gap-2 shrink-0">
              <Sparkles size={13} className="text-muted-foreground" />
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as Tier)}
                className="bg-background/50 border border-border/60 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground focus:outline-none focus:border-accent/50 cursor-pointer"
              >
                <option value="cheap">Lite</option>
                <option value="mid">Standard</option>
                <option value="premium">Pro</option>
              </select>
            </div>
          </div>

          {/* Dietary chips row */}
          {chipsEnabled && (
            <div className="px-5 pb-3 flex flex-wrap gap-1.5 border-t border-border/30 pt-3">
              {DIETARY_CHIPS.map(({ label, value, emoji }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePref(value)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all",
                    activePrefs.has(value)
                      ? "bg-accent/20 text-foreground border-accent/50 font-medium"
                      : "bg-background/30 border-border/50 text-muted-foreground hover:border-accent/40 hover:text-foreground"
                  )}
                >
                  <span>{emoji}</span>
                  <span>{label}</span>
                </button>
              ))}
              {activePrefs.size > 0 && (
                <button
                  onClick={() => setActivePrefs(new Set())}
                  className="px-2.5 py-1 rounded-full text-xs border border-border/40 text-muted-foreground/60 hover:text-muted-foreground hover:border-border transition-all"
                >
                  clear
                </button>
              )}
            </div>
          )}
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[380px] pb-2"
        >
          {messages.length === 0 && (
            <div className="py-4">
              <p className="text-sm text-muted-foreground text-center mb-4">
                What are we cooking today?
              </p>
              <div className="grid grid-cols-2 gap-2">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p.text}
                    onClick={() => send(p.text)}
                    disabled={loading}
                    className="text-left p-3 rounded-xl border border-border/50 bg-card/60 hover:bg-card hover:border-accent/30 transition-all text-sm text-muted-foreground hover:text-foreground group disabled:opacity-50"
                  >
                    <span className="text-base mr-1.5">{p.icon}</span>
                    <span className="group-hover:text-foreground/90">{p.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) =>
            m.role === "user" ? (
              <UserBubble key={i} content={m.content} />
            ) : (
              <div key={i} className="flex flex-col gap-1">
                <span className="text-[10px] text-muted-foreground/60 pl-1 flex items-center gap-1">
                  <ChefHat size={9} /> Chef
                </span>
                <RecipeCard content={m.content} />
              </div>
            )
          )}

          {loading && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] text-muted-foreground/60 pl-1 flex items-center gap-1">
                <ChefHat size={9} /> Chef
              </span>
              <div className="rounded-2xl px-4 py-3 bg-card border border-border/40 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CookingDots />
                <span>cooking</span>
              </div>
              {slow && (
                <p className="text-xs text-muted-foreground/50 pl-1">
                  Backend is cold-starting — first reply can take ~60 s.
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 bg-red-950/40 border border-red-900/40 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(); }}
          className="mt-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              activePrefs.size > 0
                ? `Recipe with ${[...activePrefs].join(", ")}…`
                : "Ask for a recipe, substitution, or technique…"
            }
            className="flex-1 bg-card border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-accent/50 placeholder:text-muted-foreground/50 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-accent text-background rounded-xl px-4 py-2.5 font-medium disabled:opacity-40 flex items-center gap-2 text-sm hover:bg-accent/90 transition-colors shrink-0"
          >
            <Send size={15} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    );
  }

  // ── Legacy UI (unchanged) ────────────────────────────────────────────────
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
          {DIETARY_CHIPS.map(({ label, value, emoji }) => (
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
              {emoji} {label}
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
            <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-[82%]",
                  m.role === "user"
                    ? "bg-accent/15 border border-accent/30 text-foreground"
                    : "bg-card border border-border shadow-sm",
                )}
              >
                <div className={cn("text-xs font-semibold mb-1.5 tracking-wide", m.role === "user" ? "text-accent" : "text-muted-foreground")}>
                  {m.role === "user" ? "You" : "Chef"}
                </div>
                <div className="prose-invert">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div key={i} className={cn("rounded-lg px-4 py-3", m.role === "user" ? "bg-muted ml-8" : "bg-background mr-8 border border-border")}>
              <div className="text-xs text-muted-foreground mb-1">{m.role === "user" ? "You" : "Chef"}</div>
              <div className="prose-invert">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          )
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
        onSubmit={(e) => { e.preventDefault(); send(); }}
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
