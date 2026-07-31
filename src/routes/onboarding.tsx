import { Button } from "@/components/axis/Button";
import { Card } from "@/components/axis/Card";
import { Input, Label } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up AXIS" },
      { name: "description", content: "Two quick steps to personalise your AXIS dashboard." },
      { property: "og:title", content: "Set up AXIS" },
      { property: "og:description", content: "Two quick steps to personalise your dashboard." },
    ],
  }),
  component: Onboarding,
});

const GOALS = [
  { key: "get_fit", label: "Get Fit", desc: "Nutrition, workouts and a plan built for you" },
  { key: "save_money", label: "Save Money", desc: "Track every rupee in and out" },
  { key: "get_organized", label: "Get Organized", desc: "Tasks, habits and a clear calendar" },
  { key: "ace_school", label: "Ace School Applications", desc: "Deadlines and checklists, handled" },
];

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { data: profile } = useProfile();
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && !user) {
    navigate({ to: "/auth/login" });
    return null;
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) return;
    setStep(2);
  }

  async function saveGoal(goal: string) {
    if (!user) return;
    setBusy(true);
    const { error } = await supabase
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: fullName.trim() || profile?.full_name || null,
          primary_goal: goal,
        },
        { onConflict: "id" },
      );
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    navigate({ to: "/home" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg p-7">
        <p className="text-xs tracking-[0.3em] text-primary uppercase">Step {step} of 2</p>
        {step === 1 ? (
          <form onSubmit={saveName} className="mt-4 space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">What should AXIS call you?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Your full name.</p>
            </div>
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                required
                autoFocus
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Kumar"
              />
            </div>
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        ) : (
          <div className="mt-4 space-y-5">
            <div>
              <h1 className="text-2xl font-semibold">What matters most right now?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                AXIS will lead with this. You can change it later.
              </p>
            </div>
            <div className="grid gap-3">
              {GOALS.map((g) => (
                <button
                  key={g.key}
                  disabled={busy}
                  onClick={() => saveGoal(g.key)}
                  className="rounded-xl border border-border bg-secondary/40 p-4 text-left transition-colors hover:border-primary disabled:opacity-50"
                >
                  <div className="font-medium text-foreground">{g.label}</div>
                  <div className="text-sm text-muted-foreground">{g.desc}</div>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setStep(1)} className="w-full">
              Back
            </Button>
          </div>
        )}
      </Card>
    </main>
  );
}
