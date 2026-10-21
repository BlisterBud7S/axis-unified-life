import { PublicShell } from "@/components/axis/PublicShell";
import { yearlyPrice } from "@/lib/paddle";
import { TIERS } from "@/lib/tiers";
import { MODELS } from "@/lib/tiers";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Check, Lock, Sparkles } from "lucide-react";

const DESC =
  "AXIS pricing: Free, Plus $9/mo, Pro $19/mo and Elite $39/mo. Compare AI engines, daily message limits, meal photo scanning, admission roadmaps and bank statement import.";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "AXIS pricing — Free, Plus, Pro and Elite plans" },
      { name: "description", content: DESC },
      { property: "og:title", content: "AXIS pricing — Free, Plus, Pro and Elite plans" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicPricing,
});

function PublicPricing() {
  return (
    <PublicShell>
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-gold" />
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">Pricing</h1>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Every plan includes the full AXIS dashboard — tasks, habits, finance, health and school
        tracking. Free starts with 8 AI engines; higher plans unlock up to all 24 (Claude, GPT, Gemini and AXIS originals).
        Paid plans also unlock higher daily limits and automation features. Yearly billing costs ten months instead of twelve.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-4">
        {TIERS.map((t, i) => {
          const isElite = i === TIERS.length - 1;
          return (
            <div key={t.id} className={isElite ? "glass-gold glow-gold p-5" : "glass p-5 transition-all hover:border-gold-dim/20"}>
              <p className={`text-sm font-semibold ${isElite ? "text-gold" : "text-foreground"}`}>{t.name}</p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {t.priceMonthly > 0 ? (
                  <>
                    ${t.priceMonthly}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </>
                ) : (
                  "Free"
                )}
              </p>
              {t.priceMonthly > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  or ${yearlyPrice(t.priceMonthly)}/yr — 2 months free
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">forever, no card required</p>
              )}
              <p className="mt-3 text-xs text-muted-foreground">{t.blurb}</p>
              <p className="mt-3 text-xs text-foreground">
                {t.dailyMessages === null
                  ? "Unlimited AI messages a day"
                  : `${t.dailyMessages} AI messages a day`}
              </p>

              <ul className="mt-4 space-y-1.5">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2 text-xs text-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" />
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

              <Link
                to="/auth/signup"
                className={
                  isElite
                    ? "mt-5 inline-block w-full rounded-xl bg-gradient-to-r from-gold-dim via-gold to-gold-light px-4 py-2.5 text-center text-sm font-semibold text-background hover:opacity-90 transition-opacity"
                    : "mt-5 inline-block w-full rounded-xl border border-gold-dim/30 px-4 py-2.5 text-center text-sm font-medium text-foreground hover:border-gold-dim/50 hover:bg-gold/5 transition-all"
                }
              >
                {t.priceMonthly > 0 ? `Get ${t.name}` : "Start free"}
              </Link>
            </div>
          );
        })}
      </div>

      <div className="gold-line mt-14" />

      <section className="mt-14">
        <h2 className="text-xl font-semibold text-foreground">AI engines by plan</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-4">Engine</th>
                <th className="py-2 pr-4">Best for</th>
                <th className="py-2">From plan</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {MODELS.map((m) => (
                <tr key={m.id} className="border-t border-border/60">
                  <td className="py-2.5 pr-4 font-medium text-foreground">{m.name}</td>
                  <td className="py-2.5 pr-4 text-xs">{m.tagline}</td>
                  <td className="py-2.5 text-xs capitalize">{m.minTier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="gold-line mt-14" />

      <section className="mt-14 max-w-3xl space-y-5 text-sm text-muted-foreground">
        <h2 className="text-xl font-semibold text-foreground">Billing questions</h2>
        <p>
          <strong className="text-foreground">Who bills me?</strong> Our order process is conducted
          by our online reseller Paddle.com, the Merchant of Record for all orders. Prices are shown
          in USD; applicable sales tax or VAT is added at checkout.
        </p>
        <p>
          <strong className="text-foreground">Can I change plan?</strong> Upgrades apply immediately
          with prorated billing. Downgrades and cancellations take effect at the end of the period
          you already paid for, so you keep your features until then.
        </p>
        <p>
          <strong className="text-foreground">Refunds?</strong> We offer a 30-day money-back
          guarantee — see our <Link to="/legal/refunds" className="text-gold underline decoration-gold-dim/40 hover:decoration-gold transition-colors">refund policy</Link>.
        </p>
      </section>
    </PublicShell>
  );
}
