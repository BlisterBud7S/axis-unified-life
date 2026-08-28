import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import {
  listConversations,
  deleteConversation,
  type ConversationRow,
} from "@/lib/conversations";
import { modelById } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  ChevronDown,
  ExternalLink,
  MessageCircle,
  MessageSquare,
  Trash2,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";

export const Route = createFileRoute("/_authenticated/ai-history")({
  head: () => ({
    meta: [
      { title: "AI chat history — AXIS" },
      {
        name: "description",
        content:
          "Browse every past AXIS AI conversation, search your questions and reread full answers, roadmaps and generated documents.",
      },
      { property: "og:title", content: "AI chat history — AXIS" },
      {
        property: "og:description",
        content: "Search and reread every AXIS AI answer across chat, meal scans, roadmaps and PDFs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiHistory,
});

const SOURCE_LABEL: Record<string, string> = {
  ai_hub: "AI Hub",
  floating: "Floating assistant",
  meal_scan: "Meal scan",
  school_path: "Admission roadmap",
  code: "AXIS Code",
  affordability: "Affordability",
};

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

type Tab = "conversations" | "logs";

function AiHistory() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("conversations");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [source, setSource] = useState("all");

  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["ai_conversations", user?.id],
    enabled: !!user,
    queryFn: listConversations,
  });

  const { data: logs, isLoading: loadingLogs } = useQuery({
    queryKey: ["ai_chat_logs", "history", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data;
    },
  });

  const sources = useMemo(
    () => Array.from(new Set((logs ?? []).map((l) => l.source).filter(Boolean) as string[])),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (logs ?? []).filter((l) => {
      if (source !== "all" && l.source !== source) return false;
      if (!q) return true;
      return `${l.prompt} ${l.response}`.toLowerCase().includes(q);
    });
  }, [logs, query, source]);

  const filteredConvs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations ?? [];
    return (conversations ?? []).filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  const logGroups = useMemo(() => {
    const map = new Map<string, typeof filteredLogs>();
    for (const l of filteredLogs) {
      const k = dayLabel(l.created_at);
      map.set(k, [...(map.get(k) ?? []), l]);
    }
    return Array.from(map.entries());
  }, [filteredLogs]);

  const convGroups = useMemo(() => {
    const map = new Map<string, ConversationRow[]>();
    for (const c of filteredConvs) {
      const k = dayLabel(c.updated_at);
      map.set(k, [...(map.get(k) ?? []), c]);
    }
    return Array.from(map.entries());
  }, [filteredConvs]);

  async function handleDeleteConv(id: string) {
    try {
      await deleteConversation(id);
      qc.invalidateQueries({ queryKey: ["ai_conversations"] });
    } catch {}
  }

  return (
    <>
      <Header
        title="AI history"
        subtitle="Every conversation AXIS has had with you"
        action={
          <Link
            to="/ai"
            className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Back to AI Hub
          </Link>
        }
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-xl border border-border p-1">
            {(["conversations", "logs"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  tab === t
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "conversations" ? "Conversations" : "Activity log"}
              </button>
            ))}
          </div>
          <div className="min-w-[220px] flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                tab === "conversations"
                  ? "Search conversations…"
                  : "Search your questions and answers…"
              }
              aria-label="Search AI history"
            />
          </div>
          {tab === "logs" ? (
            <select
              aria-label="Filter by source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="h-10 rounded-xl border border-border bg-secondary/40 px-3 text-sm text-foreground"
            >
              <option value="all">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {SOURCE_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          ) : null}
          <span className="text-xs text-muted-foreground">
            {tab === "conversations"
              ? `${filteredConvs.length} conversations`
              : `${filteredLogs.length} of ${(logs ?? []).length} entries`}
          </span>
        </div>
      </Card>

      {tab === "conversations" ? (
        loadingConvs ? (
          <Card>
            <p className="text-sm text-muted-foreground">Loading conversations…</p>
          </Card>
        ) : filteredConvs.length === 0 ? (
          <Card>
            <p className="text-sm text-muted-foreground">
              No conversations yet.{" "}
              <Link to="/ai" className="text-primary hover:underline">
                Start one in AI Hub
              </Link>
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {convGroups.map(([day, items]) => (
              <section key={day}>
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {day}
                </h2>
                <div className="space-y-2">
                  {items.map((c) => {
                    const model = modelById(c.model_id);
                    return (
                      <Card key={c.id} className="p-0">
                        <div className="flex items-center gap-3 p-4">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-foreground">
                              {c.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {model?.name ?? c.model_id} ·{" "}
                              {new Date(c.updated_at).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Link
                              to="/ai"
                              className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
                            >
                              <ExternalLink className="h-3 w-3" /> Open & edit
                            </Link>
                            <button
                              onClick={() => void handleDeleteConv(c.id)}
                              className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive"
                              title="Delete conversation"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )
      ) : loadingLogs ? (
        <Card>
          <p className="text-sm text-muted-foreground">Loading your history…</p>
        </Card>
      ) : filteredLogs.length === 0 ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Nothing here yet.{" "}
            <Link to="/ai" className="text-primary hover:underline">
              Start a conversation
            </Link>{" "}
            and it will show up.
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {logGroups.map(([day, items]) => (
            <section key={day}>
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {day}
              </h2>
              <div className="space-y-2">
                {items.map((l) => {
                  const open = openId === l.id;
                  return (
                    <Card key={l.id} className="p-0">
                      <button
                        onClick={() => setOpenId(open ? null : l.id)}
                        className="flex w-full items-start gap-3 p-4 text-left"
                      >
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={cn(
                              "text-sm text-foreground",
                              open ? "" : "line-clamp-2",
                            )}
                          >
                            {l.prompt}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(l.created_at).toLocaleTimeString(undefined, {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}{" "}
                            · {l.model_used} · {SOURCE_LABEL[l.source ?? ""] ?? l.source}
                            {l.context_enabled ? " · used your data" : ""}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </button>

                      {open ? (
                        <div className="space-y-3 border-t border-border p-4">
                          <div className="flex gap-2.5">
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                              <User className="h-3.5 w-3.5" />
                            </div>
                            <p className="min-w-0 flex-1 text-sm whitespace-pre-wrap text-foreground">
                              {l.prompt}
                            </p>
                          </div>
                          <div className="flex gap-2.5">
                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                              <Bot className="h-3.5 w-3.5" />
                            </div>
                            <div className="prose prose-invert prose-sm min-w-0 max-w-none flex-1 prose-p:my-1.5 prose-ul:my-1.5">
                              <ReactMarkdown>{l.response}</ReactMarkdown>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
