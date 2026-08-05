import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Select } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogOut, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — your AXIS profile and targets" },
      {
        name: "description",
        content:
          "Update your name, country, primary goal, body goal and daily calorie and protein targets in AXIS.",
      },
      { property: "og:title", content: "Settings — your AXIS profile and targets" },
      {
        property: "og:description",
        content: "Manage your profile, goals and daily nutrition targets.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

const GOALS = [
  { key: "get_fit", label: "Get fit" },
  { key: "save_money", label: "Save money" },
  { key: "get_organized", label: "Get organized" },
  { key: "ace_school", label: "Ace school applications" },
  { key: "all", label: "All of the above" },
];

const COUNTRIES = [
  { code: "IN", label: "India (₹)" },
  { code: "US", label: "United States ($)" },
  { code: "GB", label: "United Kingdom (£)" },
  { code: "EU", label: "Eurozone (€)" },
  { code: "AE", label: "UAE (AED)" },
  { code: "CA", label: "Canada (C$)" },
  { code: "AU", label: "Australia (A$)" },
];

function SettingsPage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [country, setCountry] = useState("IN");
  const [goal, setGoal] = useState("get_organized");
  const [bodyGoal, setBodyGoal] = useState("");
  const [calTarget, setCalTarget] = useState("");
  const [proteinTarget, setProteinTarget] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setCountry(profile.country_code ?? "IN");
    setGoal(profile.primary_goal ?? "get_organized");
    setBodyGoal(profile.dream_body_goal ?? "");
    setCalTarget(profile.daily_calorie_target ? String(profile.daily_calorie_target) : "");
    setProteinTarget(profile.daily_protein_target ? String(profile.daily_protein_target) : "");
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: fullName.trim() || null,
          country_code: country,
          primary_goal: goal,
          dream_body_goal: bodyGoal.trim() || null,
          daily_calorie_target: calTarget ? Number(calTarget) : null,
          daily_protein_target: proteinTarget ? Number(proteinTarget) : null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Settings saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <>
      <Header title="Settings" subtitle="Your profile, goals and daily targets" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>Profile</CardTitle>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div>
              <Label htmlFor="st-name">Full name</Label>
              <Input id="st-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="st-email">Email</Label>
              <Input id="st-email" value={profile?.email ?? ""} disabled readOnly />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="st-country">Country</Label>
                <Select
                  id="st-country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="st-goal">Primary goal</Label>
                <Select id="st-goal" value={goal} onChange={(e) => setGoal(e.target.value)}>
                  {GOALS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={save.isPending}>
              <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardTitle>Health targets</CardTitle>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <div>
                <Label htmlFor="st-body">Body goal</Label>
                <Input
                  id="st-body"
                  value={bodyGoal}
                  onChange={(e) => setBodyGoal(e.target.value)}
                  placeholder="Lean and strong at 72 kg"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="st-cal">Daily calories</Label>
                  <Input
                    id="st-cal"
                    type="number"
                    min="0"
                    value={calTarget}
                    onChange={(e) => setCalTarget(e.target.value)}
                    placeholder="2400"
                  />
                </div>
                <div>
                  <Label htmlFor="st-pro">Daily protein (g)</Label>
                  <Input
                    id="st-pro"
                    type="number"
                    min="0"
                    value={proteinTarget}
                    onChange={(e) => setProteinTarget(e.target.value)}
                    placeholder="150"
                  />
                </div>
              </div>
              <Button type="submit" variant="outline" disabled={save.isPending}>
                <Save className="h-4 w-4" /> Save targets
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle>Account</CardTitle>
            <p className="text-sm text-muted-foreground">
              Plan: <span className="text-foreground capitalize">{profile?.subscription_tier ?? "free"}</span>
            </p>
            <Button variant="danger" className="mt-4" onClick={signOut}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
