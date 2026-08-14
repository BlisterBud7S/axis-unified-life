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
