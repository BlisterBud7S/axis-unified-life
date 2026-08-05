import { Button } from "@/components/axis/Button";
import { generateSchoolPlan } from "@/lib/ai.functions";
import { useProfile } from "@/lib/auth";
import { DEFAULT_MODEL_ID, MODELS, canUseModel, effectiveTier, tierConfig } from "@/lib/tiers";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Route as RouteIcon, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type Plan = {
  summary: string;
  risks: string;
  phases: Array<{ title: string; timeframe: string; actions: string[] }>;
  checklist: string[];
};

export function SchoolRoadmap({
  schoolId,
  schoolName,
  onChecklistUpdated,
}: {
  schoolId: string;
  schoolName: string;
  onChecklistUpdated: () => void;
}) {
  const { data: profile } = useProfile();
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [open, setOpen] = useState(false);

  const model =
    MODELS.filter((m) => canUseModel(tier, m)).find((m) => m.id === DEFAULT_MODEL_ID) ??
    MODELS.filter((m) => canUseModel(tier, m)).pop();

  const planFn = useServerFn(generateSchoolPlan);
  const build = useMutation({
    mutationFn: async () =>
      (await planFn({ data: { schoolId, modelId: model?.id ?? "axis-swift" } })) as {
        plan: Plan;
        addedItems: number;
      },
    onSuccess: (res) => {
      setPlan(res.plan);
      setOpen(true);
      onChecklistUpdated();
      toast.success(
        res.addedItems
          ? `Roadmap ready — ${res.addedItems} new checklist items added`
          : "Roadmap ready",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!config.schoolPath) {
    return (
      <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/20 p-3">
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          AI admission roadmaps for {schoolName} are part of the Pro plan.
        </p>
        <Link to="/plans" className="text-xs text-primary hover:underline">
          See plans →
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={build.isPending} onClick={() => build.mutate()}>
          <Sparkles className="h-3.5 w-3.5" />
          {build.isPending ? "Building your path…" : plan ? "Rebuild AI roadmap" : "Build AI roadmap"}
        </Button>
        {plan ? (
          <Button size="sm" variant="ghost" onClick={() => setOpen((v) => !v)}>
            {open ? "Hide path" : "Show path"}
          </Button>
        ) : null}
      </div>

      {plan && open ? (
        <div className="mt-3 space-y-3 rounded-xl border border-border bg-secondary/25 p-3">
          <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-primary uppercase">
            <RouteIcon className="h-3.5 w-3.5" /> Path to {schoolName}
          </p>
          <p className="text-sm text-foreground">{plan.summary}</p>
          <ol className="space-y-3">
            {plan.phases.map((p, i) => (
              <li key={i}>
                <p className="text-sm font-medium text-foreground">
                  {i + 1}. {p.title}{" "}
                  <span className="text-xs font-normal text-muted-foreground">{p.timeframe}</span>
                </p>
                <ul className="mt-1 space-y-0.5">
                  {p.actions.map((a, j) => (
                    <li key={j} className="text-xs text-muted-foreground">
                      • {a}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          {plan.risks ? (
            <p className="text-xs text-warning">Watch out: {plan.risks}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
