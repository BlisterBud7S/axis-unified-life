import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { useProfile } from "@/lib/auth";
import { TIERS, effectiveTier, tierRank } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Lock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Plans — unlock more AXIS AI" },
      {
        name: "description",
        content:
          "Compare AXIS Free, Plus, Pro and Elite: AI engines, daily message limits, meal photo scanning and AI admission roadmaps.",
      },
      { property: "og:title", content: "Plans — unlock more AXIS AI" },
      {
        property: "og:description",
        content: "Four AXIS plans with different AI engines, limits and features.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const { data: profile } = useProfile();
  const current = effectiveTier(profile);

  return (
    <>
      <Header title="Plans" subtitle="Pick how much AXIS brain you want" />
      <div className="grid gap-4 lg:grid-cols-4">
        {TIERS.map((t) => {
          const isCurrent = t.id === current;
          const isUpgrade = tierRank(t.id) > tierRank(current);
          return (
            <Card key={t.id} glow={t.id === "pro"} className={cn(isCurrent && "border-primary/60")}>
              <CardTitle>
                {t.name}
                {isCurrent ? <span className="ml-2 text-xs text-primary">current</span> : null}
              </CardTitle>
              <p className="text-2xl font-semibold text-foreground">
                {t.priceMonthly === 0 ? "Free" : `$${t.priceMonthly}`}
                {t.priceMonthly > 0 ? (
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                ) : null}
              </p>
              <p className="mt-1 mb-3 text-xs text-muted-foreground">{t.blurb}</p>

              <ul className="space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-xs text-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
                {t.locked.map((f) => (
                  <li key={f} className="flex gap-2 text-xs text-muted-foreground">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                className="mt-4 w-full"
                variant={t.id === "pro" ? "primary" : "outline"}
                disabled={isCurrent}
                onClick={() =>
                  toast.info(
                    isUpgrade
                      ? "Checkout isn't connected yet — say the word and I'll wire up payments so this button charges and upgrades you."
                      : "Downgrades will be handled by the billing portal once payments are connected.",
                  )
                }
              >
                {isCurrent ? "Your plan" : isUpgrade ? `Upgrade to ${t.name}` : `Switch to ${t.name}`}
              </Button>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Payments aren't connected yet, so plan changes can't be charged. Everything else — engine
        gating, daily limits and feature locks — is live and reads your real subscription record.
      </p>
    </>
  );
}
