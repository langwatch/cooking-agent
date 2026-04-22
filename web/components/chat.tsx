"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Send, Loader2 } from "lucide-react";
import { cn, API_URL } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };
type Tier = "cheap" | "mid" | "premium";

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [tier, setTier] = useState<Tier>("mid");
  const [loading, setLoading] = useState(false);
  const [slow, setSlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, tier }),
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

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border border-border bg-card p-4 space-y-4 min-h-[400px]"
      >
        {messages.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Try: “A 30-minute weeknight pasta using what’s usually in a pantry.”
          </p>
        )}
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
          placeholder="What are we cooking?"
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
