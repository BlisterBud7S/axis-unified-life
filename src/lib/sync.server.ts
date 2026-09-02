import { runModel, parseJson } from "@/lib/ai-gateway.server";
import { resolveAccess, logChat, type Client } from "@/lib/axis-ai.server";

/* ------------------------------------------------------------------ */
/* Calendar feed                                                       */
/* ------------------------------------------------------------------ */

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getOrCreateFeed(supabase: Client, userId: string, reset = false) {
  if (reset) {
    await supabase.from("calendar_feeds").delete().eq("user_id", userId);
  } else {
    const { data } = await supabase
      .from("calendar_feeds")
      .select("token")
      .eq("user_id", userId)
      .maybeSingle();
    if (data?.token) return { token: data.token };
  }

  const token = randomToken();
  const { error } = await supabase.from("calendar_feeds").insert({ user_id: userId, token });
  if (error) throw new Error(error.message);
  return { token };
}

/* ------------------------------------------------------------------ */
/* Health import (from Apple Health / Google Fit exports)              */
/* ------------------------------------------------------------------ */

export type HealthDay = {
  date: string;
  sleep_hours?: number | null | undefined;
  steps?: number | null | undefined;
  workout_type?: string | null | undefined;
  workout_duration?: number | null | undefined;
};

export async function importHealth(
  supabase: Client,
  userId: string,
  days: HealthDay[],
  fileName: string | undefined,
) {
  const clean = days
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.date))
    .slice(0, 400);
  if (!clean.length) {
    throw new Error("No usable health records were found in that file.");
  }

  const dates = clean.map((d) => d.date);
  const { data: existing } = await supabase
    .from("health_logs")
    .select("id, log_date")
    .eq("source", "device_import")
    .in("log_date", dates);

  // Replace previously imported days so re-uploading an export never doubles up.
  if (existing?.length) {
    await supabase
      .from("health_logs")
      .delete()
      .in("id", existing.map((e) => e.id));
  }

  const rows = clean.map((d) => ({
    user_id: userId,
    log_date: d.date,
    log_type: d.workout_type ? "workout" : "sleep",
    source: "device_import",
    sleep_hours: d.sleep_hours ?? null,
    workout_type: d.workout_type ?? null,
    workout_duration: d.workout_duration ?? null,
    notes: d.steps != null ? `${Math.round(d.steps)} steps` : null,
  }));

  const { error } = await supabase.from("health_logs").insert(rows);
  if (error) throw new Error(error.message);

  await supabase.from("data_imports").insert({
    user_id: userId,
    kind: "health",
    file_name: fileName ?? null,
    rows_imported: rows.length,
    summary: `${rows.length} days imported (${dates[0]} → ${dates[dates.length - 1]})`,
  });

  return { imported: rows.length, from: dates[0]!, to: dates[dates.length - 1]! };
}

/* ------------------------------------------------------------------ */
/* Bank statement import                                               */
/* ------------------------------------------------------------------ */

const STATEMENT_SCHEMA = {
  type: "object",
  required: ["transactions", "note"],
  properties: {
    note: { type: "string" },
    transactions: {
      type: "array",
      items: {
        type: "object",
        required: ["date", "description", "amount", "type", "category"],
        properties: {
          date: { type: "string" },
          description: { type: "string" },
          amount: { type: "number" },
          type: { type: "string", enum: ["income", "expense"] },
          category: {
            type: "string",
            enum: [
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
            ],
          },
        },
      },
    },
  },
} as const;

type Statement = {
  note: string;
  transactions: Array<{
    date: string;
    description: string;
    amount: number;
    type: "income" | "expense";
    category: string;
  }>;
};

export async function importStatement(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  text: string;
  fileName?: string;
}) {
  const { model } = await resolveAccess(opts.supabase, opts.userId, opts.modelId, "statementImport");

  const raw = await runModel({
    model: model.underlying,
    messages: [
      {
        role: "system",
        content:
          "You convert raw bank or card statement text into structured transactions. Use ISO dates (YYYY-MM-DD). Amounts are always positive numbers; use `type` for direction. Skip balances, headers, totals and interest summaries. Never invent transactions that are not in the text.",
      },
      {
        role: "user",
        content: `Today is ${new Date().toISOString().slice(0, 10)}. Extract every transaction from this statement:\n\n${opts.text.slice(0, 40000)}`,
      },
    ],
    jsonSchema: { name: "statement", schema: STATEMENT_SCHEMA as unknown as Record<string, unknown> },
    userId: opts.userId,
    supabase: opts.supabase,
  });

  const parsed = parseJson<Statement>(raw);
  const rows = (parsed.transactions ?? [])
    .filter((t) => /^\d{4}-\d{2}-\d{2}$/.test(t.date) && Number.isFinite(t.amount) && t.amount > 0)
    .slice(0, 400)
    .map((t) => ({
      user_id: opts.userId,
      amount: Math.abs(t.amount),
      category: t.category || "Other",
      type: t.type,
      note: t.description.slice(0, 200),
      date: t.date,
      source: "statement_import",
    }));

  if (!rows.length) throw new Error("I couldn't find any transactions in that statement.");

  const { error } = await opts.supabase.from("finance_records").insert(rows);
  if (error) throw new Error(error.message);

  await opts.supabase.from("data_imports").insert({
    user_id: opts.userId,
    kind: "statement",
    file_name: opts.fileName ?? null,
    rows_imported: rows.length,
    summary: parsed.note?.slice(0, 300) ?? null,
  });

  await logChat(opts.supabase, opts.userId, {
    model: model.id,
    prompt: `[statement import] ${opts.fileName ?? "pasted text"}`,
    response: parsed.note ?? "",
    contextEnabled: false,
    source: "statement_import",
  });

  return { imported: rows.length, note: parsed.note ?? "" };
}

/* ------------------------------------------------------------------ */
/* Affordability                                                       */
/* ------------------------------------------------------------------ */

const AFFORD_SCHEMA = {
  type: "object",
  required: ["verdict", "headline", "reasoning", "safe_spend_now", "months_to_save", "tips"],
  properties: {
    verdict: { type: "string", enum: ["yes", "tight", "no"] },
    headline: { type: "string" },
    reasoning: { type: "string" },
    safe_spend_now: { type: "number" },
    months_to_save: { type: "number" },
    tips: { type: "array", items: { type: "string" } },
  },
} as const;

export type Affordability = {
  verdict: "yes" | "tight" | "no";
  headline: string;
  reasoning: string;
  safe_spend_now: number;
  months_to_save: number;
  tips: string[];
};

export async function affordability(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  item: string;
  cost: number;
}) {
  const { model } = await resolveAccess(opts.supabase, opts.userId, opts.modelId, "affordability");

  const since = new Date();
  since.setMonth(since.getMonth() - 3);
  const [{ data: records }, { data: profile }] = await Promise.all([
    opts.supabase
      .from("finance_records")
      .select("amount, category, type, date")
      .gte("date", since.toISOString().slice(0, 10)),
    opts.supabase.from("users").select("country_code").maybeSingle(),
  ]);

  const rows = records ?? [];
  if (!rows.length) {
    throw new Error(
      "I need some money data first — log income and expenses (or import a statement) and ask again.",
    );
  }

  const income = rows.filter((r) => r.type === "income").reduce((s, r) => s + Number(r.amount), 0);
  const spend = rows.filter((r) => r.type === "expense").reduce((s, r) => s + Number(r.amount), 0);
  const byCategory = new Map<string, number>();
  for (const r of rows) {
    if (r.type !== "expense") continue;
    byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + Number(r.amount));
  }

  const raw = await runModel({
    model: model.underlying,
    messages: [
      {
        role: "system",
        content:
          "You are AXIS's money coach. Decide whether the user can afford a purchase using only the real numbers given. Be honest and specific, mention actual amounts, and keep a small buffer for essentials. Never invent data that is not provided.",
      },
      {
        role: "user",
        content: [
          `Purchase: ${opts.item}`,
          `Cost: ${opts.cost}`,
          `Currency country: ${profile?.country_code ?? "unknown"}`,
          `Last 3 months income total: ${income.toFixed(2)}`,
          `Last 3 months spending total: ${spend.toFixed(2)}`,
          `Average monthly income: ${(income / 3).toFixed(2)}`,
          `Average monthly spending: ${(spend / 3).toFixed(2)}`,
          `Spending by category (3 months): ${[...byCategory.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([c, v]) => `${c} ${v.toFixed(0)}`)
            .join(", ")}`,
          `Transactions on file: ${rows.length}`,
          "",
          "Give a verdict, a one-line headline, short reasoning, the amount that is safe to spend right now, how many months of saving it would take if it is not affordable yet (0 if affordable), and up to 3 concrete tips.",
        ].join("\n"),
      },
    ],
    jsonSchema: { name: "affordability", schema: AFFORD_SCHEMA as unknown as Record<string, unknown> },
    userId: opts.userId,
    supabase: opts.supabase,
  });

  const result = parseJson<Affordability>(raw);
  await logChat(opts.supabase, opts.userId, {
    model: model.id,
    prompt: `[affordability] ${opts.item} @ ${opts.cost}`,
    response: raw,
    contextEnabled: true,
    source: "affordability",
  });
  return result;
}

/* ------------------------------------------------------------------ */
/* AXIS Code                                                           */
/* ------------------------------------------------------------------ */

const CODE_SYSTEM = `You are AXIS Code, a precise senior engineer pair-programming inside the AXIS app.
Rules:
- Always return complete, runnable code — never "// rest of the file" placeholders.
- Every code block must start with a fenced block tagged with the language, e.g. \`\`\`ts.
- Explain briefly before the code and note assumptions after it.
- When the user shares a file from their canvas, edit that file and return the full updated version.
- Prefer standard library and widely used packages; call out security and edge cases.`;

export async function codeChat(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  file?: { name: string; language: string; content: string } | null;
}) {
  const { model } = await resolveAccess(opts.supabase, opts.userId, opts.modelId, "codeMode");

  const messages: Parameters<typeof runModel>[0]["messages"] = [
    { role: "system", content: CODE_SYSTEM },
  ];
  if (opts.file?.content?.trim()) {
    messages.push({
      role: "system",
      content: `Current file on the user's canvas — \`${opts.file.name}\` (${opts.file.language}):\n\`\`\`${opts.file.language}\n${opts.file.content.slice(0, 24000)}\n\`\`\``,
    });
  }
  for (const m of opts.history.slice(-12)) messages.push({ role: m.role, content: m.content });
  messages.push({ role: "user", content: opts.message });

  const reply = (await runModel({ model: model.underlying, messages, userId: opts.userId, supabase: opts.supabase })).trim();
  const text = reply || "I couldn't produce an answer for that — try rephrasing.";

  await logChat(opts.supabase, opts.userId, {
    model: model.id,
    prompt: opts.message,
    response: text,
    contextEnabled: false,
    source: "code",
  });

  return { reply: text, model: model.id };
}
