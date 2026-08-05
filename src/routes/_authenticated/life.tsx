import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Select, Textarea } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Flame, Plus, Star, Trash2 } from "lucide-react";
import { useState } from "react";
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

type Tab = "tasks" | "habits";

function LifePage() {
  const [tab, setTab] = useState<Tab>("tasks");

  return (
    <>
      <Header
        title="Life"
        subtitle="Tasks, priorities and the habits that hold the week together"
        action={
          <div className="flex gap-1 rounded-xl border border-border p-1">
            {(["tasks", "habits"] as Tab[]).map((t) => (
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
      {tab === "tasks" ? <TasksTab /> : <HabitsTab />}
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
