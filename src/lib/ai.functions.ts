import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Attachment = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("image"),
    name: z.string().min(1).max(200),
    dataUrl: z.string().startsWith("data:image/").max(8_000_000),
  }),
  z.object({
    kind: z.literal("file"),
    name: z.string().min(1).max(200),
    mimeType: z.string().min(1).max(120),
    dataUrl: z.string().startsWith("data:").max(8_000_000),
  }),
  z.object({
    kind: z.literal("text"),
    name: z.string().min(1).max(200),
    text: z.string().max(200_000),
  }),
]);

const ChatInput = z.object({
  message: z.string().min(1).max(6000),
  modelId: z.string().min(1),
  useContext: z.boolean(),
  source: z.string().min(1).max(40),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(30)
    .default([]),
  attachments: z.array(Attachment).max(5).default([]),
});
const DocInput = z.object({
  prompt: z.string().min(1).max(6000),
  modelId: z.string().min(1),
  useContext: z.boolean(),
  source: z.string().min(1).max(40),
  attachments: z.array(Attachment).max(5).default([]),
});



const ScanInput = z.object({
  imageDataUrl: z.string().startsWith("data:image/"),
  modelId: z.string().min(1),
  hint: z.string().max(300).optional(),
});

const PlanInput = z.object({
  schoolId: z.string().uuid(),
  modelId: z.string().min(1),
});

export const axisChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const { chat } = await import("@/lib/axis-ai.server");
    return chat({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      history: data.history,
      message: data.message,
      useContext: data.useContext,
      source: data.source,
      attachments: data.attachments,

    });
  });

export const scanMealPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { scanMeal } = await import("@/lib/axis-ai.server");
    return scanMeal({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      imageDataUrl: data.imageDataUrl,
      ...(data.hint ? { hint: data.hint } : {}),
    });
  });

export const generateSchoolPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PlanInput.parse(input))
  .handler(async ({ data, context }) => {
    const { schoolPlan } = await import("@/lib/axis-ai.server");
    return schoolPlan({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      schoolId: data.schoolId,
    });
  });

const ScheduleInput = z.object({
  text: z.string().min(10).max(10000),
  modelId: z.string().min(1),
});

export const axisFormatSchedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScheduleInput.parse(input))
  .handler(async ({ data, context }) => {
    const { formatSchedule } = await import("@/lib/axis-ai.server");
    return formatSchedule({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      text: data.text,
    });
  });

const ImportInput = z.object({
  input: z.string().min(10).max(200000),
  modelId: z.string().min(1),
});

type Block = { time: string; label: string; type: string; notes: string };
type DayData = { day: string; tag: string; blocks: Block[] };
type ScheduleResult = { name: string; days: DayData[] };

const DAY_NAMES: Record<string, string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday",
  fri: "Friday", sat: "Saturday", sun: "Sunday",
};
const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function splitBlocks(dayContent: string): string[] {
  const result: string[] = [];
  const starts: number[] = [];
  const re = /\{t\s*:\s*"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(dayContent)) !== null) starts.push(m.index);
  for (let i = 0; i < starts.length; i++) {
    const chunk = dayContent.slice(starts[i]!, starts[i + 1] ?? dayContent.length);
    result.push(chunk.replace(/,?\s*\]\s*\}\s*,?\s*$/, "").trim());
  }
  return result;
}

function parseBlock(chunk: string): { time: string; label: string; type: string; notes: string; hasTimetable: boolean; exercises: string[] } | null {
  const hdr = chunk.match(/\{t\s*:\s*"([^"]+)"\s*,\s*l\s*:\s*"([^"]+)"\s*,\s*type\s*:\s*"([^"]+)"/);
  if (!hdr) return null;
  const notesMatch = chunk.match(/,\s*n\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const notes = notesMatch ? notesMatch[1]!.replace(/\\"/g, '"').replace(/\\n/g, "\n") : "";
  const hasTimetable = /timetable\s*:\s*true/.test(chunk);
  const exercises: string[] = [];
  const exRe = /ex\(\s*"((?:[^"\\]|\\.)*)"\s*,\s*"((?:[^"\\]|\\.)*)"/g;
  let em: RegExpExecArray | null;
  while ((em = exRe.exec(chunk)) !== null) {
    exercises.push(`${em[1]!.replace(/\\"/g, '"')} ${em[2]!.replace(/\\"/g, '"')}`);
  }
  return { time: hdr[1]!, label: hdr[2]!, type: hdr[3]!, notes, hasTimetable, exercises };
}

function tryDirectParse(raw: string): ScheduleResult | null {
  if (!raw.includes("const DATA")) return null;

  const periodTimes: Record<string, string> = {};
  const ptMatch = raw.match(/const PERIOD_TIMES\s*=\s*\{([^}]+)\}/);
  if (ptMatch) {
    const ptRe = /(\w+)\s*:\s*"([^"]+)"/g;
    let ptM: RegExpExecArray | null;
    while ((ptM = ptRe.exec(ptMatch[1]!)) !== null) {
      periodTimes[ptM[1]!] = ptM[2]!;
    }
  }

  const subjects: Record<string, [string, string, string | null]> = {};
  const subjMatch = raw.match(/const SUBJ\s*=\s*\{([\s\S]*?)\n\};/);
  if (subjMatch) {
    const sjRe = /(\w+)\s*:\s*\[([^\]]+)\]/g;
    let sjM: RegExpExecArray | null;
    while ((sjM = sjRe.exec(subjMatch[1]!)) !== null) {
      const vals = sjM[2]!.match(/"([^"]*)"/g)?.map((s) => s.replace(/"/g, "")) ?? [];
      subjects[sjM[1]!] = [vals[0] ?? sjM[1]!, vals[1] ?? "", vals[2] === "null" || !vals[2] ? null : vals[2]] as [string, string, string | null];
    }
  }

  const timetable: Record<string, Record<string, string[]>> = {};
  const ttMatch = raw.match(/const TIMETABLE\s*=\s*\{([\s\S]*?)\n\};/);
  if (ttMatch) {
    const wkRe = /([AB])\s*:\s*\{([\s\S]*?)\n\s*\}/g;
    let wkM: RegExpExecArray | null;
    while ((wkM = wkRe.exec(ttMatch[1]!)) !== null) {
      timetable[wkM[1]!] = {};
      const dmRe = /(\w+)\s*:\s*\[([^\]]+)\]/g;
      let dmM: RegExpExecArray | null;
      while ((dmM = dmRe.exec(wkM[2]!)) !== null) {
        timetable[wkM[1]!]![dmM[1]!] = dmM[2]!.match(/"(\w+)"/g)?.map((s) => s.replace(/"/g, "")) ?? [];
      }
    }
  }

  const dataMatch = raw.match(/const DATA\s*=\s*\{([\s\S]*?)\n\};/);
  if (!dataMatch) return null;

  const days: DayData[] = [];
  const fullData = dataMatch[1]!;

  const dayStarts: Array<{ key: string; idx: number }> = [];
  for (const dk of DAY_ORDER) {
    const re = new RegExp(`\\b${dk}\\s*:\\s*\\{`, "i");
    const dm = fullData.match(re);
    if (dm) dayStarts.push({ key: dk, idx: dm.index! });
  }
  dayStarts.sort((a, b) => a.idx - b.idx);

  for (let di = 0; di < dayStarts.length; di++) {
    const { key: dayKey, idx: startIdx } = dayStarts[di]!;
    const endIdx = di + 1 < dayStarts.length ? dayStarts[di + 1]!.idx : fullData.length;
    const dayContent = fullData.slice(startIdx, endIdx);

    const nameMatch = dayContent.match(/name\s*:\s*"([^"]+)"/);
    const tagMatch = dayContent.match(/tag\s*:\s*"([^"]+)"/);
    const dayName = nameMatch?.[1] ?? DAY_NAMES[dayKey]!;
    const tag = tagMatch?.[1] ?? "";

    const blocks: Block[] = [];
    for (const chunk of splitBlocks(dayContent)) {
      const b = parseBlock(chunk);
      if (!b) continue;

      if (b.hasTimetable && Object.keys(periodTimes).length > 0) {
        blocks.push({ time: b.time, label: b.label, type: b.type, notes: b.notes });
        const weekB = timetable["B"]?.[dayKey] ?? [];
        const weekA = timetable["A"]?.[dayKey] ?? [];
        const pKeys = Object.keys(periodTimes);
        for (let pi = 0; pi < pKeys.length && pi < weekB.length; pi++) {
          const pKey = pKeys[pi]!;
          const pTime = periodTimes[pKey]!;
          const subjKeyB = weekB[pi]!;
          const subjKeyA = weekA[pi] ?? subjKeyB;
          const [nameB, numB, roomB] = subjects[subjKeyB] ?? [subjKeyB, "", null];
          const [nameA] = subjects[subjKeyA] ?? [subjKeyA, "", null];
          let periodLabel = `${nameB} ${numB}`;
          if (nameA !== nameB) periodLabel += ` (Week A: ${nameA})`;
          let periodNotes = pKey;
          if (roomB) periodNotes += `; Room ${roomB}`;
          blocks.push({ time: pTime, label: periodLabel, type: "school", notes: periodNotes });
        }
      } else if (b.exercises.length > 0) {
        const exNotes = b.exercises.join("; ");
        blocks.push({ time: b.time, label: b.label, type: b.type, notes: b.notes ? `${b.notes}; ${exNotes}` : exNotes });
      } else {
        blocks.push({ time: b.time, label: b.label, type: b.type, notes: b.notes });
      }
    }

    days.push({ day: dayName, tag, blocks });
  }

  if (days.length === 0) return null;
  return { name: "Weekly Schedule", days };
}

function extractArtifactData(raw: string): string {
  let fallback = raw;
  if (fallback.includes("<") && fallback.includes(">")) {
    fallback = fallback
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }
  return fallback;
}

export const axisImportArtifact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImportInput.parse(input))
  .handler(async ({ data, context }) => {
    const raw = data.input.trim();

    const direct = tryDirectParse(raw);
    if (direct) {
      const { resolveAccess } = await import("@/lib/axis-ai.server");
      await resolveAccess(context.supabase, context.userId, data.modelId);
      return direct;
    }

    const content = extractArtifactData(raw);
    const { formatSchedule } = await import("@/lib/axis-ai.server");
    return formatSchedule({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      text: `You are importing a schedule. Extract EVERY activity from ALL 7 days. Do NOT skip any day or any detail.

RULES:
1. WORKOUTS: Each gym session is one block. In notes, list EVERY exercise with sets×reps separated by semicolons.
2. SCHOOL TIMETABLE: If timetable data exists, create INDIVIDUAL blocks for each period.
3. Include karma yoga, bhakti yoga mantras in each block's notes.
4. MEALS: Each meal with its specific dish name gets a block.
5. SPORTS: Football, taekwondo etc. each get their own block.
6. Use semicolons (;) to separate sub-items in notes.

Content:\n\n${content.slice(0, 80000)}`,
    });
  });

export const axisDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => DocInput.parse(input))
  .handler(async ({ data, context }) => {
    const { makeDocument } = await import("@/lib/axis-ai.server");
    return makeDocument({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      prompt: data.prompt,
      useContext: data.useContext,
      source: data.source,
      attachments: data.attachments,
    });
  });

const ImageInput = z.object({
  prompt: z.string().min(1).max(2000),
  modelId: z.string().min(1),
  aspect: z.string().max(20).optional(),
  sourceImageDataUrl: z.string().startsWith("data:image/").max(8_000_000).optional(),
});

const VideoInput = z.object({
  prompt: z.string().min(1).max(2000),
  modelId: z.string().min(1),
  seconds: z.union([z.literal(4), z.literal(6), z.literal(8)]).default(8),
  vertical: z.boolean().default(false),
  sourceImageDataUrl: z.string().startsWith("data:image/").max(8_000_000).optional(),
});

export const axisImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ImageInput.parse(input))
  .handler(async ({ data, context }) => {
    const { generateImage } = await import("@/lib/ai-media.server");
    return generateImage({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      prompt: data.prompt,
      ...(data.aspect ? { aspect: data.aspect } : {}),
      ...(data.sourceImageDataUrl ? { sourceImageDataUrl: data.sourceImageDataUrl } : {}),
    });
  });

export const axisVideoStart = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VideoInput.parse(input))
  .handler(async ({ data, context }) => {
    const { startVideo } = await import("@/lib/ai-media.server");
    return startVideo({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      prompt: data.prompt,
      seconds: data.seconds,
      vertical: data.vertical,
      ...(data.sourceImageDataUrl ? { sourceImageDataUrl: data.sourceImageDataUrl } : {}),
    });
  });

export const axisVideoStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ mediaId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { videoStatus } = await import("@/lib/ai-media.server");
    return videoStatus({
      supabase: context.supabase,
      userId: context.userId,
      mediaId: data.mediaId,
    });
  });
