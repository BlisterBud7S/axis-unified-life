import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { effectiveTier, modelById, tierConfig, canUseModel, type TierId } from "@/lib/tiers";
import { runModel, parseJson, type AxisMessage, type ContentPart } from "@/lib/ai-gateway.server";

export type Client = SupabaseClient<Database>;

export const SYSTEM_PROMPT = `You are AXIS, the user's personal life operating system.
You help with tasks and habits, money, training, nutrition, sleep, mood and school/university applications.
Be direct, warm and concrete. Prefer short paragraphs and tight bullet lists over essays.
Always give an actionable next step. Never invent numbers about the user — if the data is missing, say so and ask for it.`;

/** Resolve the caller's tier, engine and remaining daily quota. */
export async function resolveAccess(
  supabase: Client,
  userId: string,
  modelId: string,
  need?: "mealScan" | "schoolPath" | "codeMode" | "affordability" | "statementImport" | "imageGen" | "videoGen",
) {
  const { data: profile, error } = await supabase
    .from("users")
    .select("subscription_tier, subscription_active_until, full_name, primary_goal, dream_body_goal, daily_calorie_target, daily_protein_target, country_code")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);

  const tier: TierId = effectiveTier(profile);
  const config = tierConfig(tier);

  if (need && !config[need]) {
    const messages: Record<string, string> = {
      mealScan: "Meal photo scanning is a Plus feature. Upgrade your plan to use it.",
      schoolPath: "AI admission roadmaps are a Pro feature. Upgrade your plan to use it.",
      codeMode: "AXIS Code is a Plus feature. Upgrade your plan to use it.",
      affordability: "The affordability engine is a Plus feature. Upgrade your plan to use it.",
      statementImport: "Bank statement import is a Pro feature. Upgrade your plan to use it.",
      imageGen: "AXIS Vision image generation is a Plus feature. Upgrade your plan to use it.",
      videoGen: "AXIS Motion video generation is a Pro feature. Upgrade your plan to use it.",
    };
    throw new Error(messages[need] ?? "That feature needs a higher plan.");
  }

  const model = modelById(modelId) ?? modelById("axis-swift")!;
  if (!canUseModel(tier, model)) {
    throw new Error(`${model.name} needs the ${model.minTier} plan or higher.`);
  }

  if (config.dailyMessages != null) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const { count, error: cErr } = await supabase
      .from("ai_chat_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since.toISOString());
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) >= config.dailyMessages) {
      throw new Error(
        `You've used all ${config.dailyMessages} AI messages on the ${config.name} plan today. Upgrade for more.`,
      );
    }
  }

  return { tier, config, model, profile };
}

/** A compact snapshot of the user's real data, used when personal context is on. */
export async function buildContext(supabase: Client, profile: Record<string, unknown> | null) {
  const today = new Date();
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [tasks, health, finance, schools, nutrition] = await Promise.all([
    supabase.from("tasks").select("title, due_date, category, is_priority, is_complete").eq("is_complete", false).limit(15),
    supabase.from("health_logs").select("log_date, workout_type, workout_duration, sleep_hours").gte("log_date", weekAgo),
    supabase.from("finance_records").select("amount, category, type, date").gte("date", monthStart),
    supabase.from("target_schools").select("school_name, deadline, status").limit(10),
    supabase.from("nutrition_logs").select("calories, protein_g").gte("logged_at", `${today.toISOString().slice(0, 10)}T00:00:00Z`),
  ]);

  const spend = (finance.data ?? []).filter((f) => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0);
  const income = (finance.data ?? []).filter((f) => f.type === "income").reduce((s, f) => s + Number(f.amount), 0);
  const sleeps = (health.data ?? []).filter((h) => h.sleep_hours != null).map((h) => Number(h.sleep_hours));

  return [
    `Name: ${profile?.["full_name"] ?? "unknown"}`,
    `Primary goal: ${profile?.["primary_goal"] ?? "not set"}`,
    `Body goal: ${profile?.["dream_body_goal"] ?? "not set"}`,
    `Daily targets: ${profile?.["daily_calorie_target"] ?? "—"} kcal, ${profile?.["daily_protein_target"] ?? "—"} g protein`,
    `Today so far: ${(nutrition.data ?? []).reduce((s, n) => s + Number(n.calories), 0)} kcal, ${(nutrition.data ?? []).reduce((s, n) => s + Number(n.protein_g), 0)} g protein`,
    `Open tasks: ${(tasks.data ?? []).map((t) => `${t.title}${t.due_date ? ` (due ${t.due_date})` : ""}${t.is_priority ? " [priority]" : ""}`).join("; ") || "none"}`,
    `Last 7 days training: ${(health.data ?? []).filter((h) => h.workout_type).map((h) => `${h.log_date} ${h.workout_type} ${h.workout_duration ?? "?"}min`).join("; ") || "nothing logged"}`,
    `Sleep last 7 days: ${sleeps.length ? `${(sleeps.reduce((a, b) => a + b, 0) / sleeps.length).toFixed(1)}h average` : "not logged"}`,
    `This month money: income ${income}, spending ${spend}`,
    `Target schools: ${(schools.data ?? []).map((s) => `${s.school_name} (${s.status}${s.deadline ? `, deadline ${s.deadline}` : ""})`).join("; ") || "none"}`,
  ].join("\n");
}

export async function logChat(
  supabase: Client,
  userId: string,
  input: { model: string; prompt: string; response: string; contextEnabled: boolean; source: string },
) {
  await supabase.from("ai_chat_logs").insert({
    user_id: userId,
    model_used: input.model,
    prompt: input.prompt.slice(0, 4000),
    response: input.response.slice(0, 20000),
    context_enabled: input.contextEnabled,
    source: input.source,
  });
}

export type ChatAttachment =
  | { kind: "image"; name: string; dataUrl: string }
  | { kind: "file"; name: string; mimeType: string; dataUrl: string }
  | { kind: "text"; name: string; text: string };

export async function chat(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  message: string;
  useContext: boolean;
  source: string;
  attachments?: ChatAttachment[];
}) {
  const { config, model, profile } = await resolveAccess(opts.supabase, opts.userId, opts.modelId);
  const allowContext = opts.useContext && config.lifeContext;

  const messages: AxisMessage[] = [{ role: "system", content: SYSTEM_PROMPT }];
  if (allowContext) {
    messages.push({
      role: "system",
      content: `Current AXIS data for this user:\n${await buildContext(opts.supabase, profile)}`,
    });
  }
  for (const m of opts.history.slice(-12)) messages.push({ role: m.role, content: m.content });

  const attachments = opts.attachments ?? [];
  if (attachments.length === 0) {
    messages.push({ role: "user", content: opts.message });
  } else {
    const parts: ContentPart[] = [{ type: "input_text", text: opts.message }];
    for (const a of attachments) {
      if (a.kind === "image") {
        parts.push({ type: "input_text", text: `Image attached: ${a.name}` });
        parts.push({ type: "input_image", image_url: a.dataUrl });
      } else if (a.kind === "file") {
        parts.push({ type: "input_file", filename: a.name, file_data: a.dataUrl });
      } else {
        parts.push({
          type: "input_text",
          text: `Attached file "${a.name}" contents:\n\`\`\`\n${a.text.slice(0, 60000)}\n\`\`\``,
        });
      }
    }
    messages.push({ role: "user", content: parts });
  }

  const reply = await runModel({ model: model.underlying, messages, userId: opts.userId, supabase: opts.supabase });
  const text = reply.trim() || "I couldn't produce an answer for that — try rephrasing.";
  const promptLog = attachments.length
    ? `${opts.message}\n[attachments: ${attachments.map((a) => a.name).join(", ")}]`
    : opts.message;
  await logChat(opts.supabase, opts.userId, {
    model: model.id,
    prompt: promptLog,
    response: text,
    contextEnabled: allowContext,
    source: opts.source,
  });
  return { reply: text, model: model.id, contextUsed: allowContext };
}


const MEAL_SCHEMA = {
  type: "object",
  required: ["name", "confidence", "calories", "protein_g", "carbs_g", "fat_g", "items", "note"],
  properties: {
    name: { type: "string" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    calories: { type: "number" },
    protein_g: { type: "number" },
    carbs_g: { type: "number" },
    fat_g: { type: "number" },
    note: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "calories", "protein", "carbs", "fat"],
        properties: {
          name: { type: "string" },
          calories: { type: "number" },
          protein: { type: "number" },
          carbs: { type: "number" },
          fat: { type: "number" },
        },
      },
    },
  },
} as const;

export type MealEstimate = {
  name: string;
  confidence: "low" | "medium" | "high";
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  note: string;
  items: Array<{ name: string; calories: number; protein: number; carbs: number; fat: number }>;
};

export async function scanMeal(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  imageDataUrl: string;
  hint?: string;
}) {
  const { model } = await resolveAccess(opts.supabase, opts.userId, opts.modelId, "mealScan");

  const raw = await runModel({
    model: model.underlying,
    messages: [
      {
        role: "system",
        content:
          "You estimate nutrition from meal photos. Identify each visible food, estimate realistic portion sizes and return calories and macros in grams. Be honest about uncertainty in `confidence` and `note`.",
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: opts.hint?.trim()
              ? `Estimate the nutrition of this meal. User note: ${opts.hint.trim()}`
              : "Estimate the nutrition of this meal.",
          },
          { type: "input_image", image_url: opts.imageDataUrl },
        ],
      },
    ],
    jsonSchema: { name: "meal_estimate", schema: MEAL_SCHEMA as unknown as Record<string, unknown> },
    userId: opts.userId,
    supabase: opts.supabase,
  });

  const estimate = parseJson<MealEstimate>(raw);
  await logChat(opts.supabase, opts.userId, {
    model: model.id,
    prompt: `[meal photo scan] ${opts.hint ?? ""}`,
    response: raw,
    contextEnabled: false,
    source: "meal_scan",
  });
  return estimate;
}

const PLAN_SCHEMA = {
  type: "object",
  required: ["summary", "phases", "checklist", "risks"],
  properties: {
    summary: { type: "string" },
    risks: { type: "string" },
    phases: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "timeframe", "actions"],
        properties: {
          title: { type: "string" },
          timeframe: { type: "string" },
          actions: { type: "array", items: { type: "string" } },
        },
      },
    },
    checklist: { type: "array", items: { type: "string" } },
  },
} as const;

export type SchoolPlan = {
  summary: string;
  risks: string;
  phases: Array<{ title: string; timeframe: string; actions: string[] }>;
  checklist: string[];
};

export async function schoolPlan(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  schoolId: string;
}) {
  const { model } = await resolveAccess(opts.supabase, opts.userId, opts.modelId, "schoolPath");

  const [{ data: school }, { data: academics }, { data: existing }] = await Promise.all([
    opts.supabase.from("target_schools").select("*").eq("id", opts.schoolId).maybeSingle(),
    opts.supabase.from("school_profiles").select("*").maybeSingle(),
    opts.supabase.from("school_checklist").select("item_name").eq("school_id", opts.schoolId),
  ]);
  if (!school) throw new Error("That school is no longer in your list.");

  const raw = await runModel({
    model: model.underlying,
    messages: [
      {
        role: "system",
        content:
          "You are an experienced admissions strategist. Build a realistic, month-by-month path to a target school based on the applicant's real profile. Reference the applicant's actual numbers. Never fabricate admission statistics you are unsure of — describe requirements qualitatively instead.",
      },
      {
        role: "user",
        content: [
          "Target school: " + school.school_name,
          school.deadline ? `Application deadline: ${school.deadline}` : "Deadline: not set",
          `Current status: ${school.status}`,
          school.notes ? `Notes: ${school.notes}` : "",
          `Today: ${new Date().toISOString().slice(0, 10)}`,
          "",
          "Applicant profile:",
          `GPA: ${academics?.gpa ?? "not provided"}`,
          `Test scores: ${academics?.test_scores ?? "not provided"}`,
          `Intended major: ${academics?.intended_major ?? "not provided"}`,
          `Extracurriculars: ${academics?.extracurriculars ?? "not provided"}`,
          "",
          `Existing checklist items (do not repeat these): ${(existing ?? []).map((i) => i.item_name).join(", ") || "none"}`,
          "",
          "Return a summary, 3-5 phases with timeframes and concrete actions, up to 8 new checklist items, and the main risks in this application.",
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
    jsonSchema: { name: "school_plan", schema: PLAN_SCHEMA as unknown as Record<string, unknown> },
    userId: opts.userId,
    supabase: opts.supabase,
  });

  const plan = parseJson<SchoolPlan>(raw);

  const fresh = plan.checklist
    .map((c) => c.trim())
    .filter(Boolean)
    .filter((c) => !(existing ?? []).some((e) => e.item_name.toLowerCase() === c.toLowerCase()))
    .slice(0, 8);
  if (fresh.length) {
    await opts.supabase
      .from("school_checklist")
      .insert(fresh.map((item_name) => ({ school_id: opts.schoolId, item_name })));
  }

  await logChat(opts.supabase, opts.userId, {
    model: model.id,
    prompt: `[admission roadmap] ${school.school_name}`,
    response: raw,
    contextEnabled: true,
    source: "school_path",
  });

  return { plan, addedItems: fresh.length };
}

const DOC_SCHEMA = {
  type: "object",
  required: ["title", "subtitle", "summary", "sections", "footer"],
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    summary: { type: "string" },
    footer: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        required: ["heading", "kind", "lines"],
        properties: {
          heading: { type: "string" },
          kind: {
            type: "string",
            enum: ["paragraphs", "bullets", "numbered", "keyvalue", "callout", "table"],
          },
          lines: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export type DocSpec = {
  title: string;
  subtitle: string;
  summary: string;
  footer: string;
  sections: Array<{
    heading: string;
    kind: "paragraphs" | "bullets" | "numbered" | "keyvalue" | "callout" | "table";
    lines: string[];
  }>;
};

const DOC_SYSTEM = `You are AXIS Docs, a designer-writer that produces beautiful, print-ready documents.
Return a structured document, never raw markdown.
Rules:
- Title is short and specific. Subtitle is one line of context (audience, date range or purpose).
- summary is 2-4 sentences that stand alone.
- 3-7 sections, each with a clear heading and the section kind that fits the content:
  paragraphs (prose), bullets (unordered points), numbered (steps), keyvalue ("Label | Value" rows),
  table (first row is the header, cells separated by "|", 2-4 columns, consistent column count), callout (one short emphasised note).
- Keep lines self-contained; no markdown syntax (**, #, -) inside lines, no emojis.
- Never invent facts about the user; if data is missing, say what is needed.
- footer is a single short line, e.g. a caveat or generation note.`;

/** Generate a structured, print-ready document spec from a prompt. */
export async function makeDocument(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  prompt: string;
  useContext: boolean;
  source: string;
  attachments?: ChatAttachment[];
}) {
  const { config, model, profile } = await resolveAccess(opts.supabase, opts.userId, opts.modelId);
  const allowContext = opts.useContext && config.lifeContext;

  const messages: AxisMessage[] = [{ role: "system", content: DOC_SYSTEM }];
  if (allowContext) {
    messages.push({
      role: "system",
      content: `Current AXIS data for this user:\n${await buildContext(opts.supabase, profile)}`,
    });
  }

  const parts: ContentPart[] = [
    { type: "input_text", text: `Create a document for this request:\n${opts.prompt}` },
  ];
  for (const a of opts.attachments ?? []) {
    if (a.kind === "image") parts.push({ type: "input_image", image_url: a.dataUrl });
    else if (a.kind === "file")
      parts.push({ type: "input_file", filename: a.name, file_data: a.dataUrl });
    else
      parts.push({
        type: "input_text",
        text: `Attached file "${a.name}" contents:\n\`\`\`\n${a.text.slice(0, 60000)}\n\`\`\``,
      });
  }
  messages.push({ role: "user", content: parts });

  const raw = await runModel({
    model: model.underlying,
    messages,
    jsonSchema: { name: "axis_document", schema: DOC_SCHEMA as unknown as Record<string, unknown> },
    userId: opts.userId,
    supabase: opts.supabase,
  });

  const spec = parseJson<DocSpec>(raw);
  await logChat(opts.supabase, opts.userId, {
    model: model.id,
    prompt: `[pdf] ${opts.prompt}`,
    response: raw,
    contextEnabled: allowContext,
    source: opts.source,
  });
  return { spec, model: model.id, contextUsed: allowContext };
}
