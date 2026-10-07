import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Select, Textarea } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Clock, Download, Flame, Plus, Star, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/life")({
  head: () => ({
    meta: [
      { title: "Life — tasks and habits in AXIS" },
      {
        name: "description",
        content:
          "Capture tasks, flag priorities, track due dates and keep daily habit streaks inside AXIS.",
      },
      { property: "og:title", content: "Life — tasks and habits in AXIS" },
      {
        property: "og:description",
        content: "Tasks, priorities, due dates and daily habit streaks in one place.",
      },
    ],
  }),
  component: LifePage,
});

const CATEGORIES = ["Personal", "Work", "School", "Health", "Finance", "Errand"] as const;
const HABITS = ["Workout", "Read", "Sleep 7h+", "No junk food", "Study", "Meditate"] as const;

const iso = (d: Date) => d.toISOString().slice(0, 10);

type Tab = "tasks" | "habits" | "schedule";

function LifePage() {
  const [tab, setTab] = useState<Tab>("tasks");

  return (
    <>
      <Header
        title="Life"
        subtitle="Tasks, priorities and the habits that hold the week together"
        action={
          <div className="flex gap-1 rounded-xl border border-border p-1">
            {(["tasks", "habits", "schedule"] as Tab[]).map((t) => (
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
      {tab === "tasks" ? <TasksTab /> : tab === "habits" ? <HabitsTab /> : <ScheduleTab />}
    </>
  );
}

function TasksTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<string>("Personal");
  const [priority, setPriority] = useState(false);
  const [showDone, setShowDone] = useState(false);

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("is_complete", { ascending: true })
        .order("is_priority", { ascending: false })
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tasks").insert({
        user_id: user!.id,
        title: title.trim(),
        description: description.trim() || null,
        due_date: dueDate || null,
        category,
        is_priority: priority,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setDueDate("");
      setPriority(false);
      invalidate();
      toast.success("Task added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (t: { id: string; is_complete: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_complete: !t.is_complete })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePriority = useMutation({
    mutationFn: async (t: { id: string; is_priority: boolean }) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_priority: !t.is_priority })
        .eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Task deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const all = tasks ?? [];
  const open = all.filter((t) => !t.is_complete);
  const done = all.filter((t) => t.is_complete);
  const today = iso(new Date());
  const overdue = open.filter((t) => t.due_date && t.due_date < today).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardTitle
          action={
            <span className="text-xs text-muted-foreground">
              {open.length} open{overdue ? ` · ${overdue} overdue` : ""}
            </span>
          }
        >
          Tasks
        </CardTitle>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading tasks…</p>
        ) : open.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing open. Add your first task on the right.
          </p>
        ) : (
          <ul className="space-y-2">
            {open.map((t) => (
              <li
                key={t.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3"
              >
                <button
                  aria-label="Complete task"
                  onClick={() => toggle.mutate({ id: t.id, is_complete: t.is_complete })}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border text-transparent hover:border-primary hover:text-primary"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t.title}</p>
                  {t.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>
                  ) : null}
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-md bg-secondary px-2 py-0.5 text-muted-foreground">
                      {t.category}
                    </span>
                    {t.due_date ? (
                      <span
                        className={cn(
                          t.due_date < today
                            ? "text-destructive"
                            : t.due_date === today
                              ? "text-warning"
                              : "text-muted-foreground",
                        )}
                      >
                        {t.due_date === today ? "Due today" : `Due ${t.due_date}`}
                      </span>
                    ) : null}
                  </div>
                </div>
                <button
                  aria-label="Toggle priority"
                  onClick={() => togglePriority.mutate({ id: t.id, is_priority: t.is_priority })}
                  className={t.is_priority ? "text-warning" : "text-muted-foreground hover:text-warning"}
                >
                  <Star className={cn("h-4 w-4", t.is_priority && "fill-current")} />
                </button>
                <button
                  aria-label="Delete task"
                  onClick={() => remove.mutate(t.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {done.length > 0 ? (
          <div className="mt-5 border-t border-border pt-4">
            <button
              onClick={() => setShowDone((v) => !v)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showDone ? "Hide" : "Show"} completed ({done.length})
            </button>
            {showDone ? (
              <ul className="mt-3 space-y-2">
                {done.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-1 text-sm">
                    <button
                      aria-label="Reopen task"
                      onClick={() => toggle.mutate({ id: t.id, is_complete: t.is_complete })}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/20 text-primary"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <span className="flex-1 truncate text-muted-foreground line-through">
                      {t.title}
                    </span>
                    <button
                      aria-label="Delete task"
                      onClick={() => remove.mutate(t.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="h-fit">
        <CardTitle>New task</CardTitle>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!title.trim()) return;
            addTask.mutate();
          }}
        >
          <div>
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Finish physics problem set"
              required
            />
          </div>
          <div>
            <Label htmlFor="task-desc">Notes</Label>
            <Textarea
              id="task-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional detail"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="task-cat">Category</Label>
              <Select
                id="task-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={priority}
              onChange={(e) => setPriority(e.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            Mark as priority
          </label>
          <Button type="submit" className="w-full" disabled={addTask.isPending}>
            <Plus className="h-4 w-4" /> {addTask.isPending ? "Adding…" : "Add task"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

function HabitsTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const today = iso(new Date());
  const days = Array.from({ length: 7 }, (_, i) => iso(new Date(Date.now() - (6 - i) * 86400000)));

  const { data: logs, isLoading } = useQuery({
    queryKey: ["habit_logs", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_logs")
        .select("*")
        .gte("log_date", iso(new Date(Date.now() - 29 * 86400000)));
      if (error) throw error;
      return data;
    },
  });

  const set = useMutation({
    mutationFn: async ({ habit, date, on }: { habit: string; date: string; on: boolean }) => {
      if (on) {
        const { error } = await supabase
          .from("habit_logs")
          .insert({ user_id: user!.id, habit_name: habit, log_date: date, is_complete: true });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("habit_logs")
          .delete()
          .eq("habit_name", habit)
          .eq("log_date", date);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_logs"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const done = new Set((logs ?? []).filter((l) => l.is_complete).map((l) => `${l.habit_name}|${l.log_date}`));

  const streak = (habit: string) => {
    let n = 0;
    for (let i = 0; i < 30; i++) {
      const d = iso(new Date(Date.now() - i * 86400000));
      if (done.has(`${habit}|${d}`)) n++;
      else if (i > 0 || d !== today) break;
    }
    return n;
  };

  const todayCount = HABITS.filter((h) => done.has(`${h}|${today}`)).length;

  return (
    <div className="space-y-5">
      <Card>
        <CardTitle
          action={
            <span className="text-xs text-muted-foreground">
              {todayCount}/{HABITS.length} done today
            </span>
          }
        >
          Daily habits
        </CardTitle>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading habits…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="pb-2 text-left font-medium">Habit</th>
                  {days.map((d) => (
                    <th key={d} className="pb-2 text-center font-medium">
                      {new Date(d + "T00:00:00").toLocaleDateString(undefined, {
                        weekday: "short",
                      })}
                    </th>
                  ))}
                  <th className="pb-2 text-right font-medium">Streak</th>
                </tr>
              </thead>
              <tbody>
                {HABITS.map((h) => (
                  <tr key={h} className="border-t border-border">
                    <td className="py-2.5 pr-3 whitespace-nowrap text-foreground">{h}</td>
                    {days.map((d) => {
                      const on = done.has(`${h}|${d}`);
                      return (
                        <td key={d} className="py-2.5 text-center">
                          <button
                            aria-label={`${h} on ${d}`}
                            onClick={() => set.mutate({ habit: h, date: d, on: !on })}
                            className={cn(
                              "mx-auto flex h-7 w-7 items-center justify-center rounded-lg border transition-colors",
                              on
                                ? "border-primary bg-primary/20 text-primary"
                                : "border-border text-transparent hover:border-primary/60",
                            )}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      );
                    })}
                    <td className="py-2.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Flame
                          className={cn("h-3.5 w-3.5", streak(h) > 0 && "text-warning")}
                        />
                        {streak(h)}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">
        Streaks count consecutive days up to today across the last 30 days.
      </p>
    </div>
  );
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const SHORT_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const BLOCK_CATEGORIES = [
  { name: "School", color: "#8992a6" },
  { name: "Workout", color: "#4caf7d" },
  { name: "Sport", color: "#ff5a36" },
  { name: "Study", color: "#3b82f6" },
  { name: "Work", color: "#f59e0b" },
  { name: "Meal", color: "#e8b93b" },
  { name: "Personal", color: "#ec4899" },
  { name: "Rest", color: "#b084f5" },
  { name: "Other", color: "#64748b" },
] as const;

type Block = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  title: string;
  category: string;
  color: string;
};

const fmtTime = (t: string) => {
  const [h = "0", m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${m} ${ampm}`;
};

function getDayIntensity(dayBlocks: Block[]): { label: string; color: string } {
  const cats = new Set(dayBlocks.map((b) => b.category));
  if (cats.has("Workout") && (cats.has("Sport") || dayBlocks.filter((b) => b.category === "Workout").length > 1))
    return { label: "Heavy", color: "#ff5a36" };
  if (cats.has("Workout") || cats.has("Sport"))
    return { label: "Active", color: "#4caf7d" };
  if (dayBlocks.length > 0)
    return { label: "Light", color: "#e8b93b" };
  return { label: "Rest", color: "#b084f5" };
}

function generateScheduleHTML(blocks: Block[], userName: string) {
  const grouped: Record<number, Block[]> = {};
  for (const b of blocks) {
    (grouped[b.day_of_week] ??= []).push(b);
  }
  for (const day of Object.keys(grouped)) {
    grouped[Number(day)]!.sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  const legendItems = BLOCK_CATEGORIES.map(
    (c) => `<span><span class="dot" style="background:${c.color}"></span>${c.name}</span>`,
  ).join("");

  const daysSections = DAYS.map((dayName, i) => {
    const dayBlocks = grouped[i] ?? [];
    const intensity = getDayIntensity(dayBlocks);
    if (dayBlocks.length === 0) {
      return `<div class="day-section">
        <div class="day-header"><h2 class="day-title">${dayName}</h2><span class="day-tag" style="background:${intensity.color}22;color:${intensity.color}">${intensity.label}</span></div>
        <div class="timeline"><div class="block type-rest"><div class="dot-marker" style="background:${BLOCK_CATEGORIES[7].color}"></div><div class="block-content"><span class="block-label">Free day</span></div></div></div>
      </div>`;
    }
    const items = dayBlocks
      .map(
        (b) =>
          `<div class="block"><div class="dot-marker" style="background:${b.color}"></div><div class="block-content">
            <span class="time">${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}</span>
            <span class="block-label">${b.title}</span>
            <span class="cat">${b.category}</span>
          </div></div>`,
      )
      .join("");
    return `<div class="day-section">
      <div class="day-header"><h2 class="day-title">${dayName}</h2><span class="day-tag" style="background:${intensity.color}22;color:${intensity.color}">${intensity.label}</span></div>
      <div class="timeline">${items}</div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${userName}'s Weekly Schedule — AXIS</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#10131a;color:#edeff3;padding:32px 24px;min-height:100vh}
  .container{max-width:700px;margin:0 auto}
  .header{text-align:center;margin-bottom:28px}
  .header .brand{font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#818cf8;margin-bottom:6px}
  .header h1{font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.01em}
  .header .sub{font-size:13px;color:#8992a6;margin-top:4px}
  .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#8992a6;margin-bottom:24px;justify-content:center}
  .legend span{display:flex;align-items:center;gap:5px}
  .dot{width:9px;height:9px;border-radius:2px;display:inline-block}
  .day-section{margin-bottom:28px}
  .day-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .day-title{font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em}
  .day-tag{display:inline-block;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;border-radius:20px;font-weight:500}
  .timeline{position:relative;padding-left:20px;border-left:2px solid #2c3240}
  .block{position:relative;margin-bottom:10px;background:#1a1e27;border:1px solid #2c3240;border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:12px}
  .dot-marker{position:absolute;left:-27px;top:16px;width:10px;height:10px;border-radius:50%;border:2px solid #10131a}
  .block-content{display:flex;flex-direction:column;gap:2px;flex:1}
  .time{font-size:11px;color:#8992a6;font-variant-numeric:tabular-nums;font-family:ui-monospace,monospace}
  .block-label{font-size:15px;font-weight:600}
  .cat{font-size:10px;color:#8992a6;text-transform:uppercase;letter-spacing:0.06em}
  .footer{text-align:center;margin-top:32px;font-size:11px;color:#3f3f46}
  @media print{body{background:#fff;color:#18181b;-webkit-print-color-adjust:exact;print-color-adjust:exact}.block{background:#f8f9fa;border-color:#e4e4e7}.block-label{color:#18181b}.day-title{color:#18181b}.time{color:#71717a}.timeline{border-color:#d4d4d8}.dot-marker{border-color:#fff}.footer{display:none}}
  @media(max-width:500px){.day-title{font-size:16px}.block-label{font-size:13px}.block{padding:10px 12px}}
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">AXIS</div>
    <h1>${userName}'s Weekly Schedule</h1>
    <div class="sub">Generated ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  <div class="legend">${legendItems}</div>
  ${daysSections}
  <div class="footer">Made with AXIS — your life operating system</div>
</div>
</body>
</html>`;
}

function ScheduleTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const todayIndex = (new Date().getDay() + 6) % 7;
  const [activeDay, setActiveDay] = useState(todayIndex);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [blockCat, setBlockCat] = useState("School");

  const { data: blocks, isLoading } = useQuery({
    queryKey: ["schedule_blocks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_blocks")
        .select("*")
        .order("day_of_week")
        .order("start_time");
      if (error) throw error;
      return data as Block[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["schedule_blocks"] });

  const addBlock = useMutation({
    mutationFn: async () => {
      const cat = BLOCK_CATEGORIES.find((c) => c.name === blockCat) ?? BLOCK_CATEGORIES[8];
      const { error } = await supabase.from("schedule_blocks").insert({
        user_id: user!.id,
        day_of_week: activeDay,
        start_time: startTime,
        end_time: endTime,
        title: title.trim(),
        category: cat.name,
        color: cat.color,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setStartTime("09:00");
      setEndTime("10:00");
      setAdding(false);
      invalidate();
      toast.success("Block added");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBlock = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("schedule_blocks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Block removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadSchedule = useCallback(() => {
    if (!blocks?.length) return;
    const name = user?.user_metadata?.["full_name"] ?? user?.user_metadata?.["name"] ?? "My";
    const html = generateScheduleHTML(blocks, name);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-weekly-schedule.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Schedule downloaded");
  }, [blocks, user]);

  const grouped: Record<number, Block[]> = {};
  for (const b of blocks ?? []) {
    (grouped[b.day_of_week] ??= []).push(b);
  }

  const dayBlocks = grouped[activeDay] ?? [];
  const intensity = getDayIntensity(dayBlocks);

  return (
    <div className="space-y-5">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {BLOCK_CATEGORIES.map((c) => (
          <span key={c.name} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: c.color }} />
            {c.name}
          </span>
        ))}
      </div>

      {/* Day tabs */}
      <div className="grid grid-cols-7 gap-1.5">
        {SHORT_DAYS.map((short, i) => {
          const dayIntensity = getDayIntensity(grouped[i] ?? []);
          return (
            <button
              key={short}
              onClick={() => { setActiveDay(i); setAdding(false); }}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all",
                activeDay === i
                  ? "border-primary bg-secondary/60"
                  : "border-border hover:border-primary/40",
              )}
            >
              <span
                className={cn(
                  "text-xs font-semibold tracking-wide",
                  activeDay === i ? "text-primary" : "text-foreground",
                )}
              >
                {short}
              </span>
              <span
                className="h-1 w-full rounded-full"
                style={{ background: dayIntensity.color }}
              />
            </button>
          );
        })}
      </div>

      {/* Active day view */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold tracking-wide text-foreground uppercase">
              {DAYS[activeDay]}
            </h2>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase"
              style={{
                background: `${intensity.color}22`,
                color: intensity.color,
              }}
            >
              {intensity.label}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdding(!adding)}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              <Plus className="inline h-3.5 w-3.5" /> Add block
            </button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSchedule}
              disabled={!blocks?.length}
            >
              <Download className="h-3.5 w-3.5" /> Download
            </Button>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading schedule…</p>
        ) : dayBlocks.length === 0 && !adding ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No blocks yet for {DAYS[activeDay]}.</p>
            <button
              onClick={() => setAdding(true)}
              className="mt-2 text-xs text-primary hover:underline"
            >
              Add your first block
            </button>
          </div>
        ) : (
          /* Timeline */
          <div className="relative ml-3 border-l-2 border-border pl-5">
            {dayBlocks.map((b) => (
              <div key={b.id} className="group relative mb-3">
                {/* Dot on timeline */}
                <span
                  className="absolute -left-[27px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background"
                  style={{ background: b.color }}
                />
                <div
                  className="rounded-xl border border-border p-3 transition-colors"
                  style={{ borderLeftColor: b.color, borderLeftWidth: 3 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {fmtTime(b.start_time)} – {fmtTime(b.end_time)}
                      </span>
                      <span className="text-sm font-semibold text-foreground">{b.title}</span>
                      <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
                        {b.category}
                      </span>
                    </div>
                    <button
                      onClick={() => removeBlock.mutate(b.id)}
                      className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add block form */}
        {adding ? (
          <form
            className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-secondary/30 p-3 sm:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addBlock.mutate();
            }}
          >
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="block-title">Title</Label>
              <Input
                id="block-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Math class"
                required
              />
            </div>
            <div>
              <Label htmlFor="block-start">Start</Label>
              <Input
                id="block-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="block-end">End</Label>
              <Input
                id="block-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="block-cat">Type</Label>
              <Select
                id="block-cat"
                value={blockCat}
                onChange={(e) => setBlockCat(e.target.value)}
              >
                {BLOCK_CATEGORIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2 flex items-end gap-2 sm:col-span-1">
              <Button type="submit" size="sm" disabled={addBlock.isPending} className="flex-1">
                {addBlock.isPending ? "…" : "Add"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}
      </Card>
      <p className="text-xs text-muted-foreground">
        Design your weekly routine — school blocks, workouts, study sessions and more.
        Tap a day to view it. Download as a styled HTML file to print or share.
      </p>
    </div>
  );
}
