import { AiChat } from "@/components/axis/AiChat";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  listConversations,
  renameConversation,
  deleteConversation,
  type ConversationRow,
} from "@/lib/conversations";
import { MODELS, canUseModel, effectiveTier, modelById, tierConfig } from "@/lib/tiers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  Check,
  Edit3,
  Lock,
  MessageSquarePlus,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/ai")({
  head: () => ({
    meta: [
      { title: "AI Hub — your AXIS assistant and engines" },
      {
        name: "description",
        content:
          "Chat with AXIS engines that know your tasks, money, training, nutrition and school applications, and switch models by plan.",
      },
      { property: "og:title", content: "AI Hub — your AXIS assistant and engines" },
      {
        property: "og:description",
        content: "Multiple AXIS AI engines with personal context across every pillar of your life.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AiHub,
});

function AiHub() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);

  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: conversations, isLoading: loadingConvs } = useQuery({
    queryKey: ["ai_conversations", user?.id],
    enabled: !!user,
    queryFn: listConversations,
  });

  const { data: logs } = useQuery({
    queryKey: ["ai_chat_logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_chat_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      if (error) throw error;
      return data;
    },
  });

  const todayCount = (logs ?? []).filter(
    (l) => new Date(l.created_at).toDateString() === new Date().toDateString(),
  ).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations ?? [];
    return (conversations ?? []).filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, search]);

  const grouped = useMemo(() => {
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const monthAgo = new Date(Date.now() - 30 * 86400000);

    const groups: { label: string; items: ConversationRow[] }[] = [
      { label: "Today", items: [] },
      { label: "Yesterday", items: [] },
      { label: "This week", items: [] },
      { label: "This month", items: [] },
      { label: "Older", items: [] },
    ];

    for (const c of filtered) {
      const d = new Date(c.updated_at);
      if (d.toDateString() === today.toDateString()) groups[0]!.items.push(c);
      else if (d.toDateString() === yesterday.toDateString()) groups[1]!.items.push(c);
      else if (d > weekAgo) groups[2]!.items.push(c);
      else if (d > monthAgo) groups[3]!.items.push(c);
      else groups[4]!.items.push(c);
    }

    return groups.filter((g) => g.items.length > 0);
  }, [filtered]);

  const handleNewChat = useCallback(() => {
    setActiveConvId(null);
    setSidebarOpen(false);
  }, []);

  const handleConversationCreated = useCallback(
    (id: string, _title: string) => {
      setActiveConvId(id);
      qc.invalidateQueries({ queryKey: ["ai_conversations"] });
    },
    [qc],
  );

  const handleConversationTouched = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["ai_conversations"] });
    qc.invalidateQueries({ queryKey: ["ai_chat_logs"] });
  }, [qc]);

  async function handleRename(id: string) {
    const title = editTitle.trim();
    if (!title) return;
    try {
      await renameConversation(id, title);
      qc.invalidateQueries({ queryKey: ["ai_conversations"] });
    } catch {}
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    try {
      await deleteConversation(id);
      qc.invalidateQueries({ queryKey: ["ai_conversations"] });
      if (activeConvId === id) setActiveConvId(null);
    } catch {}
  }

  return (
    <>
      <Header
        title="AI Hub"
        subtitle="Your own engines, wired into your real data"
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {config.dailyMessages ? `${todayCount}/${config.dailyMessages} today` : "unlimited"}
            </span>
            <Link
              to="/plans"
              className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              {config.name} plan
            </Link>
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        {/* Mobile sidebar toggle */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground lg:hidden"
        >
          <MessageSquarePlus className="h-4 w-4" />
          {activeConvId
            ? (conversations ?? []).find((c) => c.id === activeConvId)?.title ?? "Chat"
            : "Conversations"}
        </button>

        {/* Conversation sidebar */}
        <div
          className={cn(
            "flex flex-col rounded-2xl border border-border bg-secondary/20",
            sidebarOpen ? "block" : "hidden lg:flex",
          )}
        >
          <div className="flex items-center gap-2 border-b border-border p-3">
            <button
              onClick={handleNewChat}
              className="flex flex-1 items-center gap-2 rounded-xl bg-primary/15 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/25"
            >
              <MessageSquarePlus className="h-4 w-4" /> New chat
            </button>
          </div>

          <div className="px-3 pt-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations…"
                className="h-8 w-full rounded-lg border border-border bg-secondary/40 pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2" style={{ maxHeight: "calc(100vh - 320px)" }}>
            {loadingConvs ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">Loading…</p>
            ) : grouped.length === 0 ? (
              <p className="px-2 py-4 text-xs text-muted-foreground">
                {search ? "No matches" : "No conversations yet. Start one above."}
              </p>
            ) : (
              grouped.map((group) => (
                <div key={group.label} className="mb-3">
                  <p className="mb-1 px-2 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                    {group.label}
                  </p>
                  {group.items.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        "group flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors",
                        activeConvId === c.id
                          ? "bg-primary/15 text-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                      )}
                    >
                      {editingId === c.id ? (
                        <form
                          className="flex flex-1 items-center gap-1"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void handleRename(c.id);
                          }}
                        >
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="flex-1 rounded border border-primary/50 bg-secondary/40 px-1.5 py-0.5 text-xs text-foreground outline-none"
                            autoFocus
                            onBlur={() => setEditingId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                          <button type="submit" className="text-primary">
                            <Check className="h-3 w-3" />
                          </button>
                        </form>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setActiveConvId(c.id);
                              setSidebarOpen(false);
                            }}
                            className="flex-1 truncate text-left text-xs"
                          >
                            {c.title}
                          </button>
                          <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                            <button
                              title="Rename"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(c.id);
                                setEditTitle(c.title);
                              }}
                              className="rounded p-0.5 hover:text-primary"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              title="Delete"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDelete(c.id);
                              }}
                              className="rounded p-0.5 hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border p-3">
            <Link
              to="/ai-history"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"
            >
              <Search className="h-3.5 w-3.5" /> Search all history
            </Link>
          </div>
        </div>

        {/* Main chat area */}
        <Card className="flex min-h-[600px] flex-col">
          <AiChat
            source="ai_hub"
            conversationId={activeConvId}
            onConversationCreated={handleConversationCreated}
            onConversationTouched={handleConversationTouched}
          />
        </Card>
      </div>
    </>
  );
}
