import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Select } from "@/components/axis/Field";
import { StatCard } from "@/components/axis/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { formatMoney } from "@/routes/_authenticated/home";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Plus, Trash2, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/finance")({
  head: () => ({
    meta: [
      { title: "Finance — money in, money out in AXIS" },
      {
        name: "description",
        content:
          "Log income and expenses, see monthly net, category breakdowns and six-month trends in AXIS.",
      },
      { property: "og:title", content: "Finance — money in, money out in AXIS" },
      {
        property: "og:description",
        content: "Monthly net, category breakdowns and six-month spending trends.",
      },
    ],
  }),
  component: FinancePage,
});

const CATEGORIES = [
  "Food",
  "Transport",
  "Rent",
  "Bills",
  "Shopping",
  "Health",
  "Education",
  "Entertainment",
  "Salary",
  "Other",
] as const;

const COLORS = ["#3B82F6", "#60A5FA", "#22D3EE", "#A78BFA", "#F472B6", "#FBBF24", "#34D399", "#F87171"];

const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthKey = (d: string) => d.slice(0, 7);

function FinancePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const country = profile?.country_code;

  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState<string>("Food");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(iso(new Date()));

  const { data: records, isLoading } = useQuery({
    queryKey: ["finance", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const since = iso(new Date(Date.now() - 185 * 86400000));
      const { data, error } = await supabase
        .from("finance_records")
        .select("*")
        .gte("date", since)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["finance"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error("Enter an amount above zero");
      const { error } = await supabase.from("finance_records").insert({
        user_id: user!.id,
        amount: value,
        type,
        category,
        note: note.trim() || null,
        date,
        source: "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAmount("");
      setNote("");
      invalidate();
      toast.success("Entry saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_records").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Entry removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = records ?? [];
  const thisMonth = monthKey(iso(new Date()));

  const stats = useMemo(() => {
    let income = 0;
    let expense = 0;
    const byCategory = new Map<string, number>();
    for (const r of rows) {
      if (monthKey(r.date) !== thisMonth) continue;
      const amt = Number(r.amount);
      if (r.type === "income") income += amt;
      else {
        expense += amt;
        byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + amt);
      }
    }
    const pie = [...byCategory.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const months = new Map<string, { month: string; income: number; expense: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const key = iso(d).slice(0, 7);
      months.set(key, {
        month: d.toLocaleDateString(undefined, { month: "short" }),
        income: 0,
        expense: 0,
      });
    }
    for (const r of rows) {
      const bucket = months.get(monthKey(r.date));
      if (!bucket) continue;
      const amt = Number(r.amount);
      if (r.type === "income") bucket.income += amt;
      else bucket.expense += amt;
    }

    return { income, expense, pie, trend: [...months.values()] };
  }, [rows, thisMonth]);

  const net = stats.income - stats.expense;
  const savingsRate = stats.income > 0 ? Math.round((net / stats.income) * 100) : null;

  return (
    <>
      <Header title="Finance" subtitle="Every rupee, dollar and pound accounted for" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net this month"
          icon={Wallet}
          tone={net >= 0 ? "success" : "danger"}
          value={formatMoney(net, country)}
          hint={savingsRate === null ? "Log income to see savings rate" : `${savingsRate}% savings rate`}
        />
        <StatCard
          label="Income"
          icon={ArrowUpRight}
          tone="success"
          value={formatMoney(stats.income, country)}
          hint="This calendar month"
        />
        <StatCard
          label="Spending"
          icon={ArrowDownRight}
          tone="danger"
          value={formatMoney(stats.expense, country)}
          hint="This calendar month"
        />
        <StatCard
          label="Top category"
          value={stats.pie[0]?.name ?? "None yet"}
          hint={stats.pie[0] ? formatMoney(stats.pie[0].value, country) : "Log an expense"}
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle>Six-month trend</CardTitle>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.trend}>
                <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} width={48} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v, country)}
                />
                <Bar dataKey="income" fill="#34D399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardTitle>Where this month went</CardTitle>
          {stats.pie.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No expenses logged this month yet — add one below.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {stats.pie.map((entry, i) => (
                      <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    formatter={(v: number) => formatMoney(v, country)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[340px_1fr]">
        <Card className="h-fit">
          <CardTitle>Log an entry</CardTitle>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fin-amount">Amount</Label>
                <Input
                  id="fin-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="250"
                  required
                />
              </div>
              <div>
                <Label htmlFor="fin-type">Type</Label>
                <Select id="fin-type" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="fin-cat">Category</Label>
              <Select id="fin-cat" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="fin-date">Date</Label>
              <Input
                id="fin-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="fin-note">Note</Label>
              <Input
                id="fin-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Groceries at the market"
              />
            </div>
            <Button type="submit" className="w-full" disabled={add.isPending}>
              <Plus className="h-4 w-4" /> {add.isPending ? "Saving…" : "Save entry"}
            </Button>
          </form>
        </Card>

        <Card>
          <CardTitle action={<span className="text-xs text-muted-foreground">Last 6 months</span>}>
            Recent activity
          </CardTitle>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading entries…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {rows.slice(0, 25).map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">
                      {r.note || r.category}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.date} · {r.category}
                      {r.source !== "manual" ? ` · ${r.source}` : ""}
                    </p>
                  </div>
                  <span
                    className={
                      r.type === "income"
                        ? "text-sm font-medium text-success"
                        : "text-sm font-medium text-foreground"
                    }
                  >
                    {r.type === "income" ? "+" : "−"}
                    {formatMoney(Number(r.amount), country)}
                  </span>
                  <button
                    aria-label="Delete entry"
                    onClick={() => remove.mutate(r.id)}
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
    </>
  );
}
