import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Select, Textarea } from "@/components/axis/Field";
import { MealScanner } from "@/components/axis/MealScanner";
import { ProgressBar } from "@/components/axis/ProgressBar";

import { StatCard } from "@/components/axis/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Dumbbell, Flame, Moon, Plus, Smile, Trash2, Utensils } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/health")({
  head: () => ({
    meta: [
      { title: "Health — workouts, sleep, mood and nutrition in AXIS" },
      {
        name: "description",
        content:
          "Log workouts and sleep, track your daily mood and hit calorie and protein targets inside AXIS.",
      },
      { property: "og:title", content: "Health — workouts, sleep, mood and nutrition in AXIS" },
      {
        property: "og:description",
        content: "Workouts, sleep hours, mood check-ins and macro tracking in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HealthPage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);
const WORKOUTS = ["Gym", "Run", "Football", "Cycling", "Swim", "Yoga", "Walk", "Other"] as const;
const MOODS = [1, 2, 3, 4, 5] as const;
const MOOD_LABEL: Record<number, string> = {
  1: "Rough",
  2: "Low",
  3: "Okay",
  4: "Good",
  5: "Great",
};

type Tab = "activity" | "nutrition";

function HealthPage() {
  const [tab, setTab] = useState<Tab>("activity");
  return (
    <>
      <Header
        title="Health"
        subtitle="Training, rest, mood and food — the inputs behind every good week"
        action={
          <div className="flex gap-1 rounded-xl border border-border p-1">
            {(["activity", "nutrition"] as Tab[]).map((t) => (
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
                {t}
              </button>
            ))}
          </div>
        }
      />
      {tab === "activity" ? <ActivityTab /> : <NutritionTab />}
    </>
  );
}

function ActivityTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = iso(new Date());
  const [logDate, setLogDate] = useState(today);
  const [workoutType, setWorkoutType] = useState<string>("Gym");
  const [duration, setDuration] = useState("");
  const [sleep, setSleep] = useState("");
  const [notes, setNotes] = useState("");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["health_logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("health_logs")
        .select("*")
        .gte("log_date", iso(new Date(Date.now() - 29 * 86400000)))
        .order("log_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: moods } = useQuery({
    queryKey: ["mood_logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mood_logs")
        .select("*")
        .gte("log_date", iso(new Date(Date.now() - 29 * 86400000)))
        .order("log_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["health_logs"] });
    qc.invalidateQueries({ queryKey: ["mood_logs"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const addLog = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("health_logs").insert({
        user_id: user!.id,
        log_date: logDate,
        log_type: workoutType ? "workout" : "sleep",
        workout_type: workoutType || null,
        workout_duration: duration ? Number(duration) : null,
        sleep_hours: sleep ? Number(sleep) : null,
        notes: notes.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setDuration("");
      setSleep("");
      setNotes("");
      invalidate();
      toast.success("Logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("health_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Entry removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setMood = useMutation({
    mutationFn: async (rating: number) => {
      const existing = (moods ?? []).find((m) => m.log_date === today);
      if (existing) {
        const { error } = await supabase
          .from("mood_logs")
          .update({ mood_rating: rating })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("mood_logs")
          .insert({ user_id: user!.id, mood_rating: rating, log_date: today });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const all = logs ?? [];
  const last7 = all.filter((l) => l.log_date >= iso(new Date(Date.now() - 6 * 86400000)));
  const workouts7 = last7.filter((l) => l.workout_type).length;
  const sleepVals = last7.filter((l) => l.sleep_hours != null).map((l) => Number(l.sleep_hours));
  const avgSleep = sleepVals.length
    ? (sleepVals.reduce((a, b) => a + b, 0) / sleepVals.length).toFixed(1)
    : "—";
  const minutes7 = last7.reduce((s, l) => s + (l.workout_duration ?? 0), 0);
  const todayMood = (moods ?? []).find((m) => m.log_date === today)?.mood_rating ?? null;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Workouts (7d)" value={workouts7} icon={Dumbbell} tone="accent" />
        <StatCard label="Avg sleep (7d)" value={`${avgSleep}${avgSleep === "—" ? "" : " h"}`} icon={Moon} />
        <StatCard label="Active minutes (7d)" value={minutes7} icon={Flame} tone="success" />
      </div>

      <Card>
        <CardTitle>How are you today?</CardTitle>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m}
              onClick={() => setMood.mutate(m)}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
                todayMood === m
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/60 hover:text-foreground",
              )}
            >
              <Smile className="h-4 w-4" />
              {MOOD_LABEL[m]}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardTitle
            action={<span className="text-xs text-muted-foreground">{all.length} in last 30 days</span>}
          >
            Recent logs
          </CardTitle>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading logs…</p>
          ) : all.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No entries yet. Log a workout or a night of sleep on the right.
            </p>
          ) : (
            <ul className="space-y-2">
              {all.map((l) => (
                <li
                  key={l.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {l.workout_type ?? "Rest day"}
                      {l.workout_duration ? ` · ${l.workout_duration} min` : ""}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{l.log_date}</span>
                      {l.sleep_hours != null ? <span>{Number(l.sleep_hours)} h sleep</span> : null}
                      {l.notes ? <span className="truncate">{l.notes}</span> : null}
                    </div>
                  </div>
                  <button
                    aria-label="Delete entry"
                    onClick={() => remove.mutate(l.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="h-fit">
          <CardTitle>Log activity</CardTitle>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!duration && !sleep) {
                toast.error("Add a duration or sleep hours");
                return;
              }
              addLog.mutate();
            }}
          >
            <div>
              <Label htmlFor="h-date">Date</Label>
              <Input
                id="h-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="h-type">Workout</Label>
                <Select
                  id="h-type"
                  value={workoutType}
                  onChange={(e) => setWorkoutType(e.target.value)}
                >
                  <option value="">None</option>
                  {WORKOUTS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="h-dur">Minutes</Label>
                <Input
                  id="h-dur"
                  type="number"
                  min="0"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="45"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="h-sleep">Sleep hours</Label>
              <Input
                id="h-sleep"
                type="number"
                step="0.5"
                min="0"
                value={sleep}
                onChange={(e) => setSleep(e.target.value)}
                placeholder="7.5"
              />
            </div>
            <div>
              <Label htmlFor="h-notes">Notes</Label>
              <Textarea
                id="h-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Felt strong, added squats"
              />
            </div>
            <Button type="submit" className="w-full" disabled={addLog.isPending}>
              <Plus className="h-4 w-4" /> {addLog.isPending ? "Saving…" : "Add entry"}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

type Item = { name: string; calories: number; protein: number; carbs: number; fat: number };

function NutritionTab() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"manual" | "scan">("manual");
  const [name, setName] = useState("");

  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const { data: meals, isLoading } = useQuery({
    queryKey: ["nutrition_logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nutrition_logs")
        .select("*")
        .gte("logged_at", startOfToday.toISOString())
        .order("logged_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["nutrition_logs"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const addMeal = useMutation({
    mutationFn: async () => {
      const item: Item = {
        name: name.trim(),
        calories: Number(calories || 0),
        protein: Number(protein || 0),
        carbs: Number(carbs || 0),
        fat: Number(fat || 0),
      };
      const { error } = await supabase.from("nutrition_logs").insert({
        user_id: user!.id,
        items_json: [item],
        calories: item.calories,
        protein_g: item.protein,
        carbs_g: item.carbs,
        fat_g: item.fat,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      invalidate();
      toast.success("Meal logged");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("nutrition_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Meal removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const list = meals ?? [];
  const sum = (key: "calories" | "protein_g" | "carbs_g" | "fat_g") =>
    list.reduce((s, m) => s + Number(m[key] ?? 0), 0);

  const calTarget = profile?.daily_calorie_target ?? null;
  const proteinTarget = profile?.daily_protein_target ?? null;

  const mealName = (m: { items_json: unknown }) => {
    const items = Array.isArray(m.items_json) ? (m.items_json as Item[]) : [];
    return items.map((i) => i?.name).filter(Boolean).join(", ") || "Meal";
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Card>
          <CardTitle action={<span className="text-xs text-muted-foreground">Today</span>}>
            Macros
          </CardTitle>
          <div className="space-y-4">
            <ProgressBar
              label="Calories"
              value={sum("calories")}
              max={calTarget}
              suffix=" kcal"
              tone="accent"
            />
            <ProgressBar
              label="Protein"
              value={sum("protein_g")}
              max={proteinTarget}
              suffix=" g"
              tone="success"
            />
            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>Carbs: {Math.round(sum("carbs_g"))} g</div>
              <div>Fat: {Math.round(sum("fat_g"))} g</div>
            </div>
            {!calTarget || !proteinTarget ? (
              <p className="text-xs text-muted-foreground">
                Set calorie and protein targets in Settings to see progress bars fill up.
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardTitle
            action={<span className="text-xs text-muted-foreground">{list.length} meals</span>}
          >
            Today&apos;s meals
          </CardTitle>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading meals…</p>
          ) : list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged today yet.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-secondary/30 p-3"
                >
                  <Utensils className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{mealName(m)}</p>
                    <p className="text-xs text-muted-foreground">
                      {m.calories} kcal · {Number(m.protein_g)}p / {Number(m.carbs_g)}c /{" "}
                      {Number(m.fat_g)}f
                    </p>
                  </div>
                  <button
                    aria-label="Delete meal"
                    onClick={() => remove.mutate(m.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="h-fit">
        <CardTitle
          action={
            <div className="flex gap-1 rounded-lg border border-border p-0.5">
              {(["manual", "scan"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs capitalize transition-colors",
                    mode === m
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m === "manual" ? "Manual" : "Scan photo"}
                </button>
              ))}
            </div>
          }
        >
          Log a meal
        </CardTitle>
        {mode === "scan" ? (
          <MealScanner onLogged={invalidate} />
        ) : (
        <form

          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            addMeal.mutate();
          }}
        >
          <div>
            <Label htmlFor="n-name">What did you eat?</Label>
            <Input
              id="n-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chicken rice bowl"
              required
            />
          </div>
          <div>
            <Label htmlFor="n-cal">Calories</Label>
            <Input
              id="n-cal"
              type="number"
              min="0"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="650"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="n-p">Protein</Label>
              <Input
                id="n-p"
                type="number"
                min="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="n-c">Carbs</Label>
              <Input
                id="n-c"
                type="number"
                min="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="n-f">Fat</Label>
              <Input
                id="n-f"
                type="number"
                min="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={addMeal.isPending}>
            <Plus className="h-4 w-4" /> {addMeal.isPending ? "Saving…" : "Add meal"}
          </Button>
        </form>
        )}

      </Card>
    </div>
  );
}
