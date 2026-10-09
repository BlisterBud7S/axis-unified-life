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

function extractArtifactData(raw: string): string {
  const parts: string[] = [];

  const dataMatch = raw.match(/const DATA\s*=\s*\{([\s\S]*?)\n\};/);
  if (dataMatch) {
    const dataBlock = dataMatch[1]!;
    const days = dataBlock.split(/\b(mon|tue|wed|thu|fri|sat|sun)\s*:\s*\{/i);
    for (let i = 1; i < days.length; i += 2) {
      const dayKey = days[i]!;
      const dayContent = days[i + 1] ?? "";
      const nameMatch = dayContent.match(/name\s*:\s*"([^"]+)"/);
      const tagMatch = dayContent.match(/tag\s*:\s*"([^"]+)"/);
      let cleaned = dayContent
        .replace(/\bex\(\s*/g, "")
        .replace(/,\s*\{[^}]*muscle[^}]*\}\s*\)/g, ")")
        .replace(/\{[^}]*armAnim[^}]*\}/g, "")
        .replace(/\{[^}]*legAnim[^}]*\}/g, "")
        .replace(/\{[^}]*pulse[^}]*\}/g, "")
        .replace(/\{[^}]*highlight[^}]*\}/g, "")
        .replace(/\{[^}]*footAnim[^}]*\}/g, "")
        .replace(/\{[^}]*upperAnim[^}]*\}/g, "")
        .replace(/\{[^}]*outerPose[^}]*\}/g, "")
        .replace(/,\s*\{[^}]*color[^}]*\}/g, "")
        .replace(/workoutId\s*:\s*"[^"]*"\s*,?/g, "")
        .replace(/timetable\s*:\s*true\s*,?/g, "[HAS TIMETABLE]");
      parts.push(`=== ${nameMatch?.[1] ?? dayKey.toUpperCase()} (${tagMatch?.[1] ?? ""}) ===\n${cleaned}`);
    }
  }

  const timetableMatch = raw.match(/const TIMETABLE\s*=\s*(\{[\s\S]*?\n\});/);
  const subjMatch = raw.match(/const SUBJ\s*=\s*(\{[\s\S]*?\n\});/);
  if (timetableMatch) {
    parts.push(`\n=== SCHOOL TIMETABLE ===\n${timetableMatch[1]}`);
  }
  if (subjMatch) {
    parts.push(`=== SUBJECTS ===\n${subjMatch[1]}`);
  }
  const periodMatch = raw.match(/const PERIOD_TIMES\s*=\s*(\{[\s\S]*?\n\});/);
  if (periodMatch) {
    parts.push(`=== PERIOD TIMES ===\n${periodMatch[1]}`);
  }

  const karmaSection = raw.match(/<section class="mt">([\s\S]*?)<\/section>/);
  if (karmaSection) {
    const karmaText = karmaSection[1]!
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    parts.push(`\n=== KARMA & BHAKTI YOGA MASTER SCHEDULE ===\n${karmaText}`);
  }

  const practiceSection = raw.match(/<section class="practice">([\s\S]*?)<\/section>/);
  if (practiceSection) {
    const practiceText = practiceSection[1]!
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    parts.push(`\n=== SPIRITUAL PRACTICE GUIDE ===\n${practiceText}`);
  }

  if (parts.length > 0) return parts.join("\n\n");

  let fallback = raw;
  if (fallback.includes("<") && fallback.includes(">")) {
    fallback = fallback
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
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
    const content = extractArtifactData(data.input.trim());

    const { formatSchedule } = await import("@/lib/axis-ai.server");
    return formatSchedule({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      text: `You are importing a schedule. Extract EVERY activity from ALL 7 days. Do NOT skip any day or any detail.

RULES:
1. WORKOUTS: Each gym session is one block. In notes, list EVERY exercise with sets×reps separated by semicolons. e.g. "Chest Press Machine 3×10; Incline Chest Press 2×10; Shoulder Press 3×10"
2. SCHOOL TIMETABLE: If timetable data exists with periods/subjects, create INDIVIDUAL blocks for each period with subject name and room number in notes. Use the period times given.
3. KARMA YOGA: For each time slot that has karma yoga content, include the karma yoga action in that block's notes.
4. BHAKTI YOGA: Include bhakti yoga mantras and devotion steps in the relevant block's notes. Mantras like "Om Namah Shivaya" and "Om Shreem Hreem Gleem Gloum" must appear.
5. SPIRITUAL PRACTICES: Create a "personal" type block for meditation, mantras, weekend spiritual sessions.
6. MEALS: Each meal with its specific dish name gets a block.
7. SPORTS: Football, taekwondo etc. each get their own block.
8. Use semicolons (;) to separate sub-items in notes.

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
