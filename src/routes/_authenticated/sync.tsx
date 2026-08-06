import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Textarea } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { parseHealthFile, type ParsedHealthDay } from "@/lib/health-import";
import {
  calendarFeed,
  importBankStatement,
  importHealthDays,
} from "@/lib/sync.functions";
import { effectiveTier, tierConfig } from "@/lib/tiers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarDays,
  Check,
  Copy,
  HeartPulse,
  Landmark,
  Lock,
  RefreshCw,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/sync")({
  head: () => ({
    meta: [
      { title: "Sync — phone calendar, health and bank data in AXIS" },
      {
        name: "description",
        content:
          "Subscribe your phone calendar to AXIS deadlines, import your Apple Health or Google Fit export, and load bank statements into Finance.",
      },
      { property: "og:title", content: "Sync — phone calendar, health and bank data in AXIS" },
      {
        property: "og:description",
        content: "Calendar subscription, health export import and bank statement import.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SyncPage,
});

function SyncPage() {
  const { profile } = useProfile();
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);

  return (
    <div className="space-y-6">
      <Header
        title="Sync"
        subtitle="Push AXIS into your phone's calendar, and pull your health and bank data in."
      />
      <CalendarSync />
      <div className="grid gap-6 lg:grid-cols-2">
        <HealthImport />
        <StatementImport allowed={config.statementImport} />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

function CalendarSync() {
  const qc = useQueryClient();
  const ensure = useServerFn(calendarFeed);
  const [copied, setCopied] = useState(false);

  const feed = useQuery({
    queryKey: ["calendar-feed"],
    queryFn: () => ensure({ data: { reset: false } }),
  });

  const reset = useMutation({
    mutationFn: () => ensure({ data: { reset: true } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-feed"] });
      toast.success("New link generated — re-subscribe on your phone.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const url =
    feed.data?.token && typeof window !== "undefined"
      ? `${window.location.origin}/api/public/calendar/${feed.data.token}.ics`
      : "";
  const webcal = url.replace(/^https?:/, "webcal:");

  return (
    <Card glow>
      <CardTitle
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => reset.mutate()}
            disabled={reset.isPending}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Reset link
          </Button>
        }
      >
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" /> Phone calendar
        </span>
      </CardTitle>

      <p className="mb-4 text-sm text-muted-foreground">
        AXIS publishes your tasks with due dates and every school deadline as a private calendar
        feed. Subscribe once and they appear in the Calendar app on your phone, updating on their
        own. Keep this link private — anyone with it can read those dates.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input readOnly value={url} placeholder="Generating…" className="font-mono text-xs" />
        <Button
          variant="secondary"
          onClick={async () => {
            if (!url) return;
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
            toast.success("Link copied");
          }}
          disabled={!url}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
        </Button>
        {url ? (
          <a href={webcal}>
            <Button className="w-full sm:w-auto">Add to phone</Button>
          </a>
        ) : null}
      </div>

      <div className="mt-5 grid gap-4 text-xs text-muted-foreground sm:grid-cols-2">
        <div>
          <p className="mb-1 font-semibold text-foreground">iPhone</p>
          <p>
            Tap <span className="text-foreground">Add to phone</span>, or: Settings → Calendar →
            Accounts → Add Account → Other → Add Subscribed Calendar → paste the link.
          </p>
        </div>
        <div>
          <p className="mb-1 font-semibold text-foreground">Android / Google Calendar</p>
          <p>
            On calendar.google.com: Other calendars → + → From URL → paste the link. It then shows
            up in the Google Calendar app.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* ---------------------------------------------------------------- */

function HealthImport() {
  const qc = useQueryClient();
  const runImport = useServerFn(importHealthDays);
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedHealthDay[]>([]);
  const [fileName, setFileName] = useState("");
  const [reading, setReading] = useState(false);

  const history = useQuery({
    queryKey: ["data-imports", "health"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_imports")
        .select("*")
        .eq("kind", "health")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: () =>
      runImport({ data: { days: parsed.slice(0, 400), fileName: fileName || undefined } }),
    onSuccess: (res) => {
      toast.success(`Imported ${res.imported} days (${res.from} → ${res.to})`);
      setParsed([]);
      setFileName("");
      qc.invalidateQueries({ queryKey: ["data-imports", "health"] });
      qc.invalidateQueries({ queryKey: ["health"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(file: File) {
    setReading(true);
    try {
      const text = await file.text();
      const days = parseHealthFile(file.name, text);
      if (!days.length) {
        toast.error("I couldn't find steps, sleep or workouts in that file.");
        setParsed([]);
      } else {
        setParsed(days);
        setFileName(file.name);
        toast.success(`Found ${days.length} days of data`);
      }
    } catch {
      toast.error("That file couldn't be read.");
    } finally {
      setReading(false);
    }
  }

  const totalSteps = parsed.reduce((s, d) => s + (d.steps ?? 0), 0);
  const workouts = parsed.filter((d) => d.workout_type).length;

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" /> Health app import
        </span>
      </CardTitle>

      <p className="mb-4 text-sm text-muted-foreground">
        Phone health data can't be read from a browser, so AXIS imports your export instead. On
        iPhone: Health app → your photo → Export All Health Data → open the zip and pick{" "}
        <span className="text-foreground">export.xml</span>. Google Fit / Health Connect CSV files
        work too. Your file is read on this device — only the daily totals are saved.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".xml,.csv,.txt"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
          e.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={reading}>
          <Upload className="h-4 w-4" /> {reading ? "Reading…" : "Choose export file"}
        </Button>
        {parsed.length ? (
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Importing…" : `Import ${parsed.length} days`}
          </Button>
        ) : null}
      </div>

      {parsed.length ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {fileName} · {parsed.length} days · {totalSteps.toLocaleString()} steps · {workouts}{" "}
          workout days · {parsed[0]?.date} → {parsed[parsed.length - 1]?.date}
        </p>
      ) : null}

      {history.data?.length ? (
        <div className="mt-5 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
          {history.data.map((h) => (
            <p key={h.id}>
              {new Date(h.created_at).toLocaleDateString()} — {h.summary ?? `${h.rows_imported} rows`}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

/* ---------------------------------------------------------------- */

function StatementImport({ allowed }: { allowed: boolean }) {
  const qc = useQueryClient();
  const runImport = useServerFn(importBankStatement);
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");

  const save = useMutation({
    mutationFn: () =>
      runImport({
        data: { text, modelId: "axis-prime", fileName: fileName || undefined },
      }),
    onSuccess: (res) => {
      toast.success(`${res.imported} transactions added to Finance`);
      setText("");
      setFileName("");
      qc.invalidateQueries({ queryKey: ["finance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!allowed) {
    return (
      <Card className="flex flex-col items-start justify-center gap-3">
        <CardTitle>
          <span className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary" /> Bank statement import
          </span>
        </CardTitle>
        <p className="flex items-start gap-2 text-sm text-muted-foreground">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" />
          Upload a CSV statement and AXIS reads every transaction, categorises it and logs it into
          Finance. Available on the Pro plan.
        </p>
        <Link to="/plans">
          <Button>See plans</Button>
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>
        <span className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" /> Bank statement import
        </span>
      </CardTitle>

      <p className="mb-4 text-sm text-muted-foreground">
        Download a CSV statement from your bank (or copy the transaction list out of a PDF) and drop
        it here. AXIS reads the rows, categorises them and logs them into Finance — no bank login
        needed.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt,.tsv"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const raw = await f.text();
          setText(raw.slice(0, 60000));
          setFileName(f.name);
        }}
      />

      <div className="space-y-3">
        <div>
          <Label>Statement text</Label>
          <Textarea
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"2026-04-02, TESCO STORES, -18.40\n2026-04-03, SALARY ACME LTD, 2100.00"}
            className="font-mono text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" /> Upload CSV
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || text.trim().length < 20}>
            {save.isPending ? "Reading statement…" : "Import transactions"}
          </Button>
        </div>
        {fileName ? <p className="text-xs text-muted-foreground">{fileName} loaded</p> : null}
      </div>
    </Card>
  );
}
