import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Select, Textarea } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { axisFormatSchedule, axisImportArtifact } from "@/lib/ai.functions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, ClipboardPaste, Copy, Download, Flame, Loader2, Plus, Sparkles, Star, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
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

const TYPE_COLORS = {
  school: "#8992a6",
  sport: "#ff5a36",
  workout: "#4caf7d",
  study: "#3b82f6",
  work: "#f59e0b",
  meal: "#e8b93b",
  personal: "#ec4899",
  rest: "#b084f5",
  other: "#64748b",
} as const;

function typeColor(type: string): string {
  return (TYPE_COLORS as Record<string, string>)[type] ?? TYPE_COLORS.other;
}

type ScheduleDay = {
  day: string;
  tag: string;
  blocks: Array<{ time: string; label: string; type: string; notes: string }>;
};

type ScheduleResult = { name: string; days: ScheduleDay[] };

const EXAMPLE_TEXT = `School Monday to Friday 7:30am to 3pm
Basketball practice Mon Wed Fri 4-6pm
Gym Tuesday and Thursday 4:30-5:30pm (push day Tue, pull day Thu)
Dinner every day around 7pm
Study/homework after dinner for an hour
Wake up 6am, sleep by 10pm
Saturday morning basketball game, rest in afternoon
Sunday is rest day, maybe light jog in the morning`;

function generateScheduleHTML(schedule: ScheduleResult, userName: string) {
  const legendTypes = Object.entries(TYPE_COLORS);
  const legendItems = legendTypes
    .map(([name, color]) => `<span><span class="dot" style="background:${color}"></span>${name}</span>`)
    .join("");

  const daysSections = schedule.days
    .map((day) => {
      const items = day.blocks
        .map((b) => {
          const color = typeColor(b.type);
          return `<div class="block"><div class="dot-marker" style="background:${color}"></div><div class="block-content">
            <span class="time">${escHtml(b.time)}</span>
            <span class="block-label">${escHtml(b.label)}</span>
            ${b.notes ? `<span class="notes">${escHtml(b.notes)}</span>` : ""}
            <span class="cat">${escHtml(b.type)}</span>
          </div></div>`;
        })
        .join("");

      const tagColor = typeColor(day.blocks[0]?.type ?? "rest");
      return `<div class="day-section">
        <div class="day-header"><h2 class="day-title">${escHtml(day.day)}</h2><span class="day-tag" style="background:${tagColor}22;color:${tagColor}">${escHtml(day.tag)}</span></div>
        <div class="timeline">${items || '<div class="block"><div class="dot-marker" style="background:#b084f5"></div><div class="block-content"><span class="block-label">Rest Day</span></div></div>'}</div>
      </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(userName)}'s Weekly Schedule — AXIS</title>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Inter',sans-serif;background:#10131a;color:#edeff3;padding:32px 24px;min-height:100vh}
  .container{max-width:700px;margin:0 auto}
  .header{text-align:center;margin-bottom:28px}
  .header .brand{font-family:'Space Mono',monospace;font-size:11px;letter-spacing:0.3em;text-transform:uppercase;color:#818cf8;margin-bottom:6px}
  .header h1{font-family:'Oswald',sans-serif;font-size:28px;font-weight:700;text-transform:uppercase;letter-spacing:0.01em}
  .header .sub{font-size:13px;color:#8992a6;margin-top:4px}
  .legend{display:flex;gap:14px;flex-wrap:wrap;font-size:11px;color:#8992a6;margin-bottom:24px;justify-content:center;font-family:'Space Mono',monospace}
  .legend span{display:flex;align-items:center;gap:5px;text-transform:capitalize}
  .dot{width:9px;height:9px;border-radius:2px;display:inline-block}
  .day-section{margin-bottom:28px}
  .day-header{display:flex;align-items:center;gap:10px;margin-bottom:8px}
  .day-title{font-family:'Oswald',sans-serif;font-size:20px;font-weight:700;text-transform:uppercase;letter-spacing:0.02em}
  .day-tag{display:inline-block;font-size:10px;letter-spacing:0.1em;text-transform:uppercase;padding:3px 10px;border-radius:20px;font-weight:500}
  .timeline{position:relative;padding-left:20px;border-left:2px solid #2c3240}
  .block{position:relative;margin-bottom:10px;background:#1a1e27;border:1px solid #2c3240;border-radius:10px;padding:12px 14px;display:flex;align-items:flex-start;gap:12px}
  .dot-marker{position:absolute;left:-27px;top:16px;width:10px;height:10px;border-radius:50%;border:2px solid #10131a}
  .block-content{display:flex;flex-direction:column;gap:2px;flex:1}
  .time{font-size:11px;color:#8992a6;font-variant-numeric:tabular-nums;font-family:'Space Mono',monospace}
  .block-label{font-size:15px;font-weight:600}
  .notes{font-size:12px;color:#8992a6;font-style:italic}
  .cat{font-size:10px;color:#8992a6;text-transform:uppercase;letter-spacing:0.06em}
  .tabs{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:22px}
  .tab{background:#1a1e27;border:1px solid #2c3240;border-radius:8px;padding:10px 2px 8px;text-align:center;cursor:pointer;transition:transform .12s ease,border-color .12s ease}
  .tab:hover{transform:translateY(-2px)}
  .tab .day-label{font-family:'Oswald',sans-serif;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#edeff3}
  .tab.active{border-color:#818cf8}
  .tab .belt{height:3px;border-radius:2px;margin:6px 4px 0}
  .footer{text-align:center;margin-top:32px;font-size:11px;color:#3f3f46}
  @media print{body{background:#fff;color:#18181b;-webkit-print-color-adjust:exact;print-color-adjust:exact}.block{background:#f8f9fa;border-color:#e4e4e7}.block-label{color:#18181b}.day-title{color:#18181b}.time{color:#71717a}.timeline{border-color:#d4d4d8}.dot-marker{border-color:#fff}.footer{display:none}}
  @media(max-width:500px){.day-title{font-size:16px}.block-label{font-size:13px}.block{padding:10px 12px}}
</style>
<script>
document.addEventListener('DOMContentLoaded',()=>{
  const tabs=document.querySelectorAll('.tab');
  const secs=document.querySelectorAll('.day-section');
  const dayNames=['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const today=dayNames[((new Date).getDay()+6)%7];
  function show(d){tabs.forEach(t=>{t.classList.toggle('active',t.dataset.day===d)});secs.forEach(s=>{s.style.display=s.dataset.day===d?'':'none'})}
  tabs.forEach(t=>t.addEventListener('click',()=>show(t.dataset.day)));
  show(today);
});
</script>
</head>
<body>
<div class="container">
  <div class="header">
    <div class="brand">AXIS</div>
    <h1>${escHtml(userName)}'s ${escHtml(schedule.name)}</h1>
    <div class="sub">Generated ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
  </div>
  <div class="legend">${legendItems}</div>
  <div class="tabs">${schedule.days.map((d) => {
    const c = typeColor(d.blocks[0]?.type ?? "rest");
    return `<div class="tab" data-day="${escHtml(d.day.toLowerCase())}"><div class="day-label">${escHtml(d.day.slice(0, 3))}</div><div class="belt" style="background:${c}"></div></div>`;
  }).join("")}</div>
  ${schedule.days.map((d) => {
    const items = d.blocks.map((b) => {
      const color = typeColor(b.type);
      return `<div class="block"><div class="dot-marker" style="background:${color}"></div><div class="block-content">
        <span class="time">${escHtml(b.time)}</span>
        <span class="block-label">${escHtml(b.label)}</span>
        ${b.notes ? `<span class="notes">${escHtml(b.notes)}</span>` : ""}
        <span class="cat">${escHtml(b.type)}</span>
      </div></div>`;
    }).join("");
    const tagColor = typeColor(d.blocks[0]?.type ?? "rest");
    return `<div class="day-section" data-day="${escHtml(d.day.toLowerCase())}">
      <div class="day-header"><h2 class="day-title">${escHtml(d.day)}</h2><span class="day-tag" style="background:${tagColor}22;color:${tagColor}">${escHtml(d.tag)}</span></div>
      <div class="timeline">${items || '<div class="block"><div class="dot-marker" style="background:#b084f5"></div><div class="block-content"><span class="block-label">Rest Day</span></div></div>'}</div>
    </div>`;
  }).join("")}
  <div class="footer">Made with AXIS — your life operating system</div>
</div>
</body>
</html>`;
}

function escHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function ScheduleTab() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [schedule, setSchedule] = useState<ScheduleResult | null>(null);
  const todayIndex = (new Date().getDay() + 6) % 7;
  const [activeDay, setActiveDay] = useState(todayIndex);
  const [showImport, setShowImport] = useState(false);
  const [artifactContent, setArtifactContent] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);

  const { data: savedSchedule, isLoading: loadingSaved } = useQuery({
    queryKey: ["saved_schedule", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_schedules")
        .select("id, data")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (savedSchedule && !schedule && !loadingSaved) {
      const loaded = savedSchedule.data as unknown as ScheduleResult;
      if (loaded?.days?.length) {
        setSchedule(loaded);
        setSavedId(savedSchedule.id);
      }
    }
  }, [savedSchedule, loadingSaved]);

  const saveSchedule = async (data: ScheduleResult) => {
    if (!user) return;
    if (savedId) {
      await supabase
        .from("saved_schedules")
        .update({ data: data as unknown as Json, name: data.name, updated_at: new Date().toISOString() })
        .eq("id", savedId);
    } else {
      const { data: row } = await supabase
        .from("saved_schedules")
        .insert({ user_id: user.id, data: data as unknown as Json, name: data.name })
        .select("id")
        .single();
      if (row) setSavedId(row.id);
    }
    qc.invalidateQueries({ queryKey: ["saved_schedule"] });
  };

  const generate = useMutation({
    mutationFn: async () => {
      const result = await axisFormatSchedule({
        data: { text, modelId: "axis-swift" },
      });
      return result as ScheduleResult;
    },
    onSuccess: (data) => {
      setSchedule(data);
      saveSchedule(data);
      toast.success("Schedule generated!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importArtifact = useMutation({
    mutationFn: async () => {
      const result = await axisImportArtifact({
        data: { input: artifactContent.trim(), modelId: "axis-swift" },
      });
      return result as ScheduleResult;
    },
    onSuccess: (data) => {
      setSchedule(data);
      saveSchedule(data);
      setShowImport(false);
      setArtifactContent("");
      toast.success("Schedule imported from artifact!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const downloadSchedule = useCallback(() => {
    if (!schedule) return;
    const name = user?.user_metadata?.["full_name"] ?? user?.user_metadata?.["name"] ?? "My";
    const html = generateScheduleHTML(schedule, String(name));
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "my-weekly-schedule.html";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Schedule downloaded");
  }, [schedule, user]);

  const activeDayData = schedule?.days[activeDay];

  return (
    <div className="space-y-5">
      {/* Input section */}
      <Card>
        <CardTitle
          action={
            schedule ? (
              <button
                onClick={() => setSchedule(null)}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Edit text
              </button>
            ) : null
          }
        >
          {schedule ? schedule.name : "Describe your schedule"}
        </CardTitle>

        {!schedule ? (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim().length < 10) return;
              generate.mutate();
            }}
          >
            <Textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={EXAMPLE_TEXT}
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Just describe your week in plain words — AI will format it into a beautiful schedule.
              </p>
              <div className="flex gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImport(true)}
                >
                  <ClipboardPaste className="h-4 w-4" /> Import Artifact
                </Button>
                <Button
                  type="submit"
                  disabled={generate.isPending || text.trim().length < 10}
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Formatting…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <>
            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {Object.entries(TYPE_COLORS).map(([name, color]) => (
                <span key={name} className="flex items-center gap-1.5 capitalize">
                  <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
                  {name}
                </span>
              ))}
            </div>

            {/* Day tabs */}
            <div className="mb-4 grid grid-cols-7 gap-1.5">
              {schedule.days.map((d, i) => {
                const beltColor = typeColor(d.blocks[0]?.type ?? "rest");
                return (
                  <button
                    key={d.day}
                    onClick={() => setActiveDay(i)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-center transition-all",
                      activeDay === i
                        ? "border-primary bg-secondary/60"
                        : "border-border hover:border-primary/40",
                    )}
                  >
                    <span
                      className={cn(
                        "text-xs font-semibold tracking-wide uppercase",
                        activeDay === i ? "text-primary" : "text-foreground",
                      )}
                    >
                      {d.day.slice(0, 3)}
                    </span>
                    <span
                      className="h-1 w-full rounded-full"
                      style={{ background: beltColor }}
                    />
                  </button>
                );
              })}
            </div>

            {/* Active day view */}
            {activeDayData ? (
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <h2 className="text-lg font-bold tracking-wide text-foreground uppercase">
                    {activeDayData.day}
                  </h2>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-medium tracking-wider uppercase"
                    style={{
                      background: `${typeColor(activeDayData.blocks[0]?.type ?? "rest")}22`,
                      color: typeColor(activeDayData.blocks[0]?.type ?? "rest"),
                    }}
                  >
                    {activeDayData.tag}
                  </span>
                </div>

                {/* Timeline */}
                <div className="relative ml-3 border-l-2 border-border pl-5">
                  {activeDayData.blocks.map((b, bi) => {
                    const color = typeColor(b.type);
                    return (
                      <div key={bi} className="relative mb-3">
                        <span
                          className="absolute -left-[27px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background"
                          style={{ background: color }}
                        />
                        <div
                          className="rounded-xl border border-border p-3"
                          style={{ borderLeftColor: color, borderLeftWidth: 3 }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                              {b.time}
                            </span>
                            <span className="text-sm font-semibold text-foreground">{b.label}</span>
                            {b.notes ? (
                              <div className="mt-1 space-y-0.5">
                                {b.notes.split(/[;\n]/).map((line, li) => {
                                  const t = line.trim();
                                  if (!t) return null;
                                  return (
                                    <div key={li} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
                                      <span>{t}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                            <span className="text-[10px] tracking-wider text-muted-foreground uppercase">
                              {b.type}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadSchedule}>
                <Download className="h-3.5 w-3.5" /> Download HTML
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!schedule) return;
                  const name = user?.user_metadata?.["full_name"] ?? user?.user_metadata?.["name"] ?? "My";
                  const html = generateScheduleHTML(schedule, String(name));
                  navigator.clipboard.writeText(html);
                  toast.success("HTML copied to clipboard");
                }}
              >
                <Copy className="h-3.5 w-3.5" /> Copy HTML
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Import from Artifact dialog */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Import from Claude Artifact</h3>
              <button
                onClick={() => { setShowImport(false); setArtifactContent(""); }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 rounded-lg border border-border bg-secondary/30 p-3">
              <p className="mb-1 text-xs font-medium text-foreground">How to copy from Claude:</p>
              <ol className="list-decimal pl-4 text-xs text-muted-foreground space-y-0.5">
                <li>In your Claude chat, find the artifact</li>
                <li>Tap the <strong className="text-foreground">code</strong> view ({"</>"} icon) to see the source</li>
                <li>Tap <strong className="text-foreground">Copy</strong> to copy all the code</li>
                <li>Paste it below</li>
              </ol>
            </div>
            <Textarea
              rows={8}
              value={artifactContent}
              onChange={(e) => setArtifactContent(e.target.value)}
              placeholder="Paste the artifact code or schedule text here..."
              className="font-mono text-xs"
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowImport(false); setArtifactContent(""); }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={importArtifact.isPending || artifactContent.trim().length < 10}
                onClick={() => importArtifact.mutate()}
              >
                {importArtifact.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Importing…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" /> Import Schedule
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Describe your weekly routine in plain words — AI turns it into a beautiful visual schedule you can download and print.
      </p>
    </div>
  );
}
