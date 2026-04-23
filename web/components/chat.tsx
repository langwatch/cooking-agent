"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2 } from "lucide-react";
import { cn, API_URL } from "@/lib/utils";

type Message = {
  role: "user" | "assistant";
  content: string;
  appliedPrefs?: string[];
};
type Tier = "cheap" | "mid" | "premium";

const DIETARY_PREFS = [
  { id: "vegan", label: "🌱 Vegan" },
  { id: "gluten-free", label: "🌾 Gluten-Free" },
  { id: "nut-free", label: "🥜 Nut-Free" },
  { id: "dairy-free", label: "🥛 Dairy-Free" },
  { id: "vegetarian", label: "🥗 Vegetarian" },
];

const SUGGESTIONS = [
  "30-min weeknight pasta for two",
  "Quick vegan weeknight dinner",
  "Buttermilk substitute from pantry",
  "Easy chicken stir-fry",
];

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [tier, setTier] = useState<Tier>("mid");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dietaryPrefs, setDietaryPrefs] = useState<Set<string>>(new Set());
  const [showChips, setShowChips] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_URL}/flags`)
      .then((r) => r.json())
      .then((f) => setShowChips(!!f.auto_dietary_pref_chips))
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

  function togglePref(id: string) {
    setDietaryPrefs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function send(overrideText?: string) {
    const rawText = (overrideText ?? input).trim();
    if (!rawText || loading) return;

    const activePrefs = showChips ? Array.from(dietaryPrefs) : [];
    const messageText =
      activePrefs.length > 0
        ? `${rawText} (dietary restrictions: ${activePrefs.join(", ")})`
        : rawText;

    setError(null);
    setInput("");
    setMessages((m) => [
      ...m,
      { role: "user", content: rawText, appliedPrefs: activePrefs },
    ]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, tier }),
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

  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="flex items-center gap-2 text-sm flex-wrap">
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

        {showChips && (
          <div className="flex items-center gap-1.5 flex-wrap ml-2">
            <span className="text-muted-foreground text-xs">Diet:</span>
            {DIETARY_PREFS.map((pref) => (
              <button
                key={pref.id}
                type="button"
                onClick={() => togglePref(pref.id)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-colors",
                  dietaryPrefs.has(pref.id)
                    ? "bg-accent text-background border-accent font-medium"
                    : "bg-transparent text-muted-foreground border-border hover:border-accent hover:text-foreground",
                )}
              >
                {pref.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4 space-y-4 min-h-[400px]"
      >
        {messages.length === 0 &&
          (showChips ? (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground text-sm">What are we cooking today?</p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    disabled={loading}
                    className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              Try: "A 30-minute weeknight pasta using what's usually in a pantry."
            </p>
          ))}

        {messages.map((m, i) => (
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
            {m.appliedPrefs && m.appliedPrefs.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {m.appliedPrefs.map((p) => (
                  <span
                    key={p}
                    className="text-xs bg-accent/20 text-accent border border-accent/30 rounded-full px-2 py-0.5"
                  >
                    {DIETARY_PREFS.find((d) => d.id === p)?.label ?? p}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}

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
            showChips && dietaryPrefs.size > 0
              ? `What are we cooking? (${Array.from(dietaryPrefs).join(", ")} applied)`
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
