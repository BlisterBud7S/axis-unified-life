import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useAuth, useProfile } from "@/lib/auth";
import { PRICE_IDS, yearlyPrice, type BillingCycle } from "@/lib/paddle";
import { createBillingPortalUrl } from "@/lib/payments.functions";
import { TIERS, effectiveTier, tierRank, type TierId } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Loader2, Lock } from "lucide-react";
import { useState } from "react";
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
  const { user } = useAuth();
  const current = effectiveTier(profile);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [portalLoading, setPortalLoading] = useState(false);
  const { openCheckout, loadingPriceId } = usePaddleCheckout();

  async function openPortal() {
    setPortalLoading(true);
    try {
      const { url } = await createBillingPortalUrl();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(
        e instanceof Error && !/Unauthorized/.test(e.message)
          ? e.message
          : "No billing history on this account yet",
      );
    } finally {
      setPortalLoading(false);
    }
  }

  function buy(tier: TierId) {
    if (tier === "free") return;
    if (!user) return;
    const priceId = PRICE_IDS[tier as Exclude<TierId, "free">][cycle];
    openCheckout({ priceId, userId: user.id, customerEmail: user.email });
  }

  return (
    <>
      <Header title="Plans" subtitle="Pick how much AXIS brain you want" />

      <div className="mb-5 inline-flex rounded-full border border-border bg-card/60 p-1">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className={cn(
              "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
              cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {c === "monthly" ? "Monthly" : "Yearly — 2 months free"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {TIERS.map((t) => {
          const isCurrent = t.id === current;
          const isUpgrade = tierRank(t.id) > tierRank(current);
          const paid = t.priceMonthly > 0;
          const amount = cycle === "yearly" ? yearlyPrice(t.priceMonthly) : t.priceMonthly;
          const priceId = paid ? PRICE_IDS[t.id as Exclude<TierId, "free">][cycle] : null;
          const busy = !!priceId && loadingPriceId === priceId;

          return (
            <Card key={t.id} glow={t.id === "pro"} className={cn(isCurrent && "border-primary/60")}>
              <CardTitle>
                {t.name}
                {isCurrent ? <span className="ml-2 text-xs text-primary">current</span> : null}
              </CardTitle>
              <p className="text-2xl font-semibold text-foreground">
                {paid ? `$${amount}` : "Free"}
                {paid ? (
                  <span className="text-sm font-normal text-muted-foreground">
                    /{cycle === "yearly" ? "yr" : "mo"}
                  </span>
                ) : null}
              </p>
              {paid && cycle === "yearly" ? (
                <p className="text-xs text-success">${t.priceMonthly * 2} saved a year</p>
              ) : null}
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

              {paid ? (
                <Button
                  className="mt-4 w-full"
                  variant={t.id === "pro" ? "primary" : "outline"}
                  disabled={isCurrent || busy}
                  onClick={() => buy(t.id)}
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isCurrent ? (
                    "Your plan"
                  ) : isUpgrade ? (
                    `Upgrade to ${t.name}`
                  ) : (
                    `Switch to ${t.name}`
                  )}
                </Button>
              ) : (
                <Button className="mt-4 w-full" variant="ghost" disabled>
                  {isCurrent ? "Your plan" : "Always included"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={openPortal} disabled={portalLoading}>
          {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage billing"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Upgrades start right away and are prorated. Downgrades and cancellations take effect at the
          end of your paid period — you keep every feature until then.
        </p>
      </div>
    </>
  );
}
