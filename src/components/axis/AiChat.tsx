import { Button } from "@/components/axis/Button";
import { Input } from "@/components/axis/Field";
import { axisChat } from "@/lib/ai.functions";
import { useProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MODEL_ID,
  MODELS,
  canUseModel,
  effectiveTier,
  modelById,
  tierConfig,
} from "@/lib/tiers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bot, Send, Sparkles, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Plan my week around my open tasks",
  "How am I doing on protein today?",
  "Where is my money leaking this month?",
  "What should I do next for my top target school?",
];

export function AiChat({
  source,
  compact = false,
  className,
}: {
  source: string;
  compact?: boolean;
  className?: string;
}) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);
  const allowed = useMemo(() => MODELS.filter((m) => canUseModel(tier, m)), [tier]);

  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [useContext, setUseContext] = useState(config.lifeContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!allowed.some((m) => m.id === modelId)) {
      setModelId(allowed[allowed.length - 1]?.id ?? "axis-swift");
    }
  }, [allowed, modelId]);

  useEffect(() => {
    setUseContext(config.lifeContext);
  }, [config.lifeContext]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatFn = useServerFn(axisChat);
  const send = useMutation({
    mutationFn: async (message: string) => {
      const history = messages;
      const res = await chatFn({
        data: { message, modelId, useContext, source, history },
      });
      return res;
    },
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      qc.invalidateQueries({ queryKey: ["ai_chat_logs"] });
    },
    onError: (e: Error) => {
      setError(e.message);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ ${e.message}` },
      ]);
    },
  });

  function submit(text: string) {
    const message = text.trim();
    if (!message || send.isPending) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setDraft("");
    send.mutate(message);
  }

  const active = modelById(modelId);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="AI engine"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="h-8 rounded-lg border border-border bg-secondary/40 px-2 text-xs text-foreground"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id} disabled={!canUseModel(tier, m)}>
              {m.name}
              {canUseModel(tier, m) ? "" : ` — ${m.minTier} plan`}
            </option>
          ))}
        </select>
        <button
          onClick={() => config.lifeContext && setUseContext((v) => !v)}
          disabled={!config.lifeContext}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors",
            useContext
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
            !config.lifeContext && "cursor-not-allowed opacity-60",
          )}
          title={
            config.lifeContext
              ? "Include your AXIS data in answers"
              : "Personal context is available on Plus and above"
          }
        >
          <Sparkles className="h-3.5 w-3.5" /> My data
        </button>
        <span className="text-xs text-muted-foreground">
          {config.name} plan ·{" "}
          {config.dailyMessages ? `${config.dailyMessages} msgs/day` : "unlimited"}
        </span>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-secondary/20 p-3",
          compact ? "max-h-[46vh]" : "min-h-[320px]",
        )}
      >
        {messages.length === 0 ? (
          <div className="space-y-3 p-2">
            <p className="text-sm text-muted-foreground">
              {active?.name} is ready. Ask anything about your tasks, money, training, food or
              applications.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="flex gap-2.5">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  m.role === "user" ? "bg-secondary text-muted-foreground" : "bg-primary/15 text-primary",
                )}
              >
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-headings:mt-3 prose-headings:mb-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
        {send.isPending ? (
          <p className="px-2 text-xs text-muted-foreground">{active?.name} is thinking…</p>
        ) : null}
        <div ref={endRef} />
      </div>

      {error && /plan|Upgrade|upgrade/.test(error) ? (
        <Link to="/plans" className="mt-2 text-xs text-primary hover:underline">
          See plans and upgrade →
        </Link>
      ) : null}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask AXIS…"
          aria-label="Message AXIS"
        />
        <Button type="submit" size="icon" disabled={send.isPending || !draft.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
