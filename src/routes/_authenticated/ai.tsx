import { AiChat } from "@/components/axis/AiChat";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { MODELS, canUseModel, effectiveTier, tierConfig } from "@/lib/tiers";
import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Bot, Lock, Sparkles } from "lucide-react";

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
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);

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

  return (
    <>
      <Header
        title="AI Hub"
        subtitle="Your own engines, wired into your real data"
        action={
          <Link
            to="/plans"
            className="rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
          >
            {config.name} plan · manage
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Card className="flex min-h-[560px] flex-col">
          <CardTitle
            action={
              <span className="text-xs text-muted-foreground">
                {config.dailyMessages ? `${todayCount}/${config.dailyMessages} today` : "unlimited"}
              </span>
            }
          >
            Conversation
          </CardTitle>
          <AiChat source="ai_hub" />
        </Card>

        <div className="space-y-5">
          <Card>
            <CardTitle>Engines</CardTitle>
            <ul className="space-y-2">
              {MODELS.map((m) => {
                const unlocked = canUseModel(tier, m);
                return (
                  <li
                    key={m.id}
                    className={cn(
                      "rounded-xl border p-3",
                      unlocked ? "border-border bg-secondary/30" : "border-border/60 opacity-70",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {unlocked ? (
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      <p className="text-sm font-medium text-foreground">{m.name}</p>
                      {!unlocked ? (
                        <span className="ml-auto text-[10px] tracking-wide text-muted-foreground uppercase">
                          {m.minTier}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{m.tagline}</p>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            <CardTitle>Recent AI activity</CardTitle>
            {(logs ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing yet — ask your first question on the left.
              </p>
            ) : (
              <ul className="space-y-2">
                {(logs ?? []).slice(0, 8).map((l) => (
                  <li key={l.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Bot className="h-3 w-3" /> {l.model_used} · {l.source}
                    </p>
                    <p className="mt-1 line-clamp-2 text-sm text-foreground">{l.prompt}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
