import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Input, Label } from "@/components/axis/Field";
import { useProfile } from "@/lib/auth";
import { canIAfford } from "@/lib/sync.functions";
import { effectiveTier, tierConfig } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/routes/_authenticated/home";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, ShoppingBag } from "lucide-react";
import { useState } from "react";

const VERDICTS = {
  yes: { label: "Yes — go for it", tone: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
  tight: { label: "Tight — be careful", tone: "text-amber-400 border-amber-400/40 bg-amber-400/10" },
  no: { label: "Not yet", tone: "text-red-400 border-red-400/40 bg-red-400/10" },
} as const;

export function AffordCheck() {
  const { data: profile } = useProfile();
  const config = tierConfig(effectiveTier(profile));
  const check = useServerFn(canIAfford);
  const [item, setItem] = useState("");
  const [cost, setCost] = useState("");

  const run = useMutation({
    mutationFn: () =>
      check({ data: { item: item.trim(), cost: Number(cost), modelId: "axis-prime" } }),
  });

  if (!config.affordability) {
    return (
      <Card>
        <CardTitle>
          <span className="flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" /> Can I afford it?
          </span>
        </CardTitle>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          Ask AXIS about any purchase and get a verdict based on your real income, spending and
          upcoming bills. Available from the Plus plan.
        </p>
        <Link to="/plans" className="mt-3 inline-block">
          <Button>See plans</Button>
        </Link>
      </Card>
    );
  }

  const result = run.data;
  const verdict = result ? VERDICTS[result.verdict] : null;

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" /> Can I afford it?
        </span>
      </CardTitle>

      <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-end">
        <div>
          <Label>What do you want to buy?</Label>
          <Input
            value={item}
            onChange={(e) => setItem(e.target.value)}
            placeholder="New running shoes"
          />
        </div>
        <div>
          <Label>Cost</Label>
          <Input
            type="number"
            min="1"
            step="0.01"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="120"
          />
        </div>
        <Button
          onClick={() => run.mutate()}
          disabled={run.isPending || !item.trim() || !Number(cost)}
        >
          {run.isPending ? "Checking…" : "Ask AXIS"}
        </Button>
      </div>

      {run.error ? (
        <p className="mt-3 text-sm text-destructive">{(run.error as Error).message}</p>
      ) : null}

      {result && verdict ? (
        <div className="mt-4 space-y-3">
          <div className={cn("rounded-xl border px-3 py-2 text-sm font-semibold", verdict.tone)}>
            {verdict.label} — {result.headline}
          </div>
          <p className="text-sm text-muted-foreground">{result.reasoning}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Safe to spend now</p>
              <p className="text-lg font-semibold text-foreground">
                {formatMoney(result.safe_spend_now, profile?.country_code)}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Months of saving needed</p>
              <p className="text-lg font-semibold text-foreground">
                {result.months_to_save > 0 ? result.months_to_save : "0 — affordable"}
              </p>
            </div>
          </div>
          {result.tips?.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {result.tips.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
