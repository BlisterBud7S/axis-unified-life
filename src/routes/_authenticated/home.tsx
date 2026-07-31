import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { StatCard } from "@/components/axis/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Bot,
  CalendarDays,
  Dumbbell,
  GraduationCap,
  Plus,
  RefreshCw,
  Smile,
  Utensils,
  Wallet,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "AXIS Dashboard — your day at a glance" },
      {
        name: "description",
        content:
          "Your tasks, money, mood, workouts and school deadlines together in one AXIS dashboard.",
      },
      { property: "og:title", content: "AXIS Dashboard" },
      {
        property: "og:description",
        content: "Tasks, money, mood, workouts and school deadlines in one place.",
      },
    ],
  }),
  component: HomePage,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function HomePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();

  const { data, isFetching } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const today = new Date();
      const monthStart = iso(new Date(today.getFullYear(), today.getMonth(), 1));
      const thirtyAgo = iso(new Date(Date.now() - 30 * 86400000));

      const [tasks, finance, mood, workouts, schools, moods30, workouts30] = await Promise.all([
        supabase
          .from("tasks")
          .select("*")
          .eq("is_complete", false)
          .order("is_priority", { ascending: false })
          .order("due_date", { ascending: true, nullsFirst: false })
          .limit(1),
        supabase.from("finance_records").select("amount, type").gte("date", monthStart),
        supabase.from("mood_logs").select("*").eq("log_date", iso(today)).maybeSingle(),
        supabase
          .from("health_logs")
          .select("*")
          .not("workout_type", "is", null)
          .order("log_date", { ascending: false })
          .limit(1),
        supabase
          .from("target_schools")
          .select("*")
          .not("deadline", "is", null)
          .gte("deadline", iso(today))
          .order("deadline", { ascending: true })
          .limit(1),
        supabase.from("mood_logs").select("mood_rating, log_date").gte("log_date", thirtyAgo),
        supabase
          .from("health_logs")
          .select("log_date, workout_type")
          .gte("log_date", thirtyAgo)
          .not("workout_type", "is", null),
      ]);

      const net = (finance.data ?? []).reduce(
        (acc, r) => {
          const amt = Number(r.amount);
          if (r.type === "income") acc.income += amt;
          else acc.expense += amt;
          return acc;
        },
        { income: 0, expense: 0 },
      );

      const workoutDays = new Set((workouts30.data ?? []).map((w) => w.log_date));
      const withW: number[] = [];
      const withoutW: number[] = [];
      for (const m of moods30.data ?? []) {
        (workoutDays.has(m.log_date) ? withW : withoutW).push(m.mood_rating);
      }
      const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
      const avgWith = avg(withW);
      const avgWithout = avg(withoutW);

      let insight =
        "Log your mood and workouts for a couple of weeks and AXIS will surface a pattern here.";
      if (avgWith !== null && avgWithout !== null) {
        const diff = avgWith - avgWithout;
        if (Math.abs(diff) < 0.2) {
          insight = "Your mood is about the same on workout days and rest days over the last 30 days.";
        } else if (diff > 0) {
          insight = `Your mood is higher on days you work out — ${avgWith.toFixed(1)} vs ${avgWithout.toFixed(1)} out of 5 over the last 30 days.`;
        } else {
          insight = `Your mood is actually lower on workout days — ${avgWith.toFixed(1)} vs ${avgWithout.toFixed(1)} out of 5. Might be worth easing off.`;
        }
      }

      return {
        topTask: tasks.data?.[0] ?? null,
        income: net.income,
        expense: net.expense,
        mood: mood.data,
        workout: workouts.data?.[0] ?? null,
        school: schools.data?.[0] ?? null,
        insight,
      };
    },
  });

  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const netValue = (data?.income ?? 0) - (data?.expense ?? 0);
  const MOODS = ["😞", "🙁", "😐", "🙂", "😄"];

  return (
    <>
      <Header
        title={`Good ${greeting()}, ${firstName}`}
        subtitle={dateLabel}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries()}
            disabled={isFetching}
          >
            <RefreshCw className={isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} /> Refresh
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Today's top task"
          icon={CalendarDays}
          value={data?.topTask?.title ?? "Nothing pending"}
          hint={data?.topTask?.due_date ? `Due ${data.topTask.due_date}` : "You're clear"}
        />
        <StatCard
          label="Net this month"
          icon={Wallet}
          tone={netValue >= 0 ? "success" : "danger"}
          value={formatMoney(netValue, profile?.country_code)}
          hint={`In ${formatMoney(data?.income ?? 0, profile?.country_code)} · Out ${formatMoney(data?.expense ?? 0, profile?.country_code)}`}
        />
        <StatCard
          label="Today's mood"
          icon={Smile}
          value={data?.mood ? `${MOODS[data.mood.mood_rating - 1]} ${data.mood.mood_rating}/5` : "Not logged"}
          hint={data?.mood ? "Logged today" : "Check in from Health"}
        />
        <StatCard
          label="Last workout"
          icon={Dumbbell}
          value={data?.workout?.workout_type ?? "None logged"}
          hint={
            data?.workout
              ? `${data.workout.log_date}${data.workout.workout_duration ? ` · ${data.workout.workout_duration} min` : ""}`
              : "Log one in Health"
          }
        />
        <StatCard
          label="Nearest school deadline"
          icon={GraduationCap}
          value={data?.school?.school_name ?? "No deadlines"}
          hint={data?.school?.deadline ? `${daysUntil(data.school.deadline)} days · ${data.school.deadline}` : "Add targets in School"}
        />
        <Card className="flex flex-col justify-center">
          <p className="text-xs tracking-wide text-primary uppercase">Insight</p>
          <p className="mt-2 text-sm text-foreground">{data?.insight}</p>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle>Quick actions</CardTitle>
        <div className="flex flex-wrap gap-3">
          <Link to="/life">
            <Button variant="secondary">
              <Plus className="h-4 w-4" /> Add task
            </Button>
          </Link>
          <Link to="/health">
            <Button variant="secondary">
              <Utensils className="h-4 w-4" /> Log meal
            </Button>
          </Link>
          <Link to="/finance">
            <Button variant="secondary">
              <Wallet className="h-4 w-4" /> Log finance
            </Button>
          </Link>
          <Link to="/ai">
            <Button>
              <Bot className="h-4 w-4" /> Chat with AXIS
            </Button>
          </Link>
        </div>
      </Card>
    </>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

export function formatMoney(value: number, country?: string | null) {
  const currency =
    country === "US" ? "USD" : country === "GB" ? "GBP" : country === "AU" ? "AUD" : country === "CA" ? "CAD" : "INR";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function daysUntil(date: string) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / 86400000));
}
