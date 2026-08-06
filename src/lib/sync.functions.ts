import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FeedInput = z.object({ reset: z.boolean().default(false) });

const HealthInput = z.object({
  fileName: z.string().max(200).optional(),
  days: z
    .array(
      z.object({
        date: z.string(),
        sleep_hours: z.number().nullable().optional(),
        steps: z.number().nullable().optional(),
        workout_type: z.string().nullable().optional(),
        workout_duration: z.number().nullable().optional(),
      }),
    )
    .min(1)
    .max(400),
});

const StatementInput = z.object({
  text: z.string().min(20).max(60000),
  modelId: z.string().min(1),
  fileName: z.string().max(200).optional(),
});

const AffordInput = z.object({
  item: z.string().min(1).max(200),
  cost: z.number().positive().max(100_000_000),
  modelId: z.string().min(1),
});

const CodeInput = z.object({
  message: z.string().min(1).max(8000),
  modelId: z.string().min(1),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .max(24)
    .default([]),
  file: z
    .object({ name: z.string(), language: z.string(), content: z.string() })
    .nullable()
    .default(null),
});

export const calendarFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => FeedInput.parse(input))
  .handler(async ({ data, context }) => {
    const { getOrCreateFeed } = await import("@/lib/sync.server");
    return getOrCreateFeed(context.supabase, context.userId, data.reset);
  });

export const importHealthDays = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HealthInput.parse(input))
  .handler(async ({ data, context }) => {
    const { importHealth } = await import("@/lib/sync.server");
    return importHealth(context.supabase, context.userId, data.days, data.fileName);
  });

export const importBankStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatementInput.parse(input))
  .handler(async ({ data, context }) => {
    const { importStatement } = await import("@/lib/sync.server");
    return importStatement({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      text: data.text,
      ...(data.fileName ? { fileName: data.fileName } : {}),
    });
  });

export const canIAfford = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AffordInput.parse(input))
  .handler(async ({ data, context }) => {
    const { affordability } = await import("@/lib/sync.server");
    return affordability({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      item: data.item,
      cost: data.cost,
    });
  });

export const axisCodeChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CodeInput.parse(input))
  .handler(async ({ data, context }) => {
    const { codeChat } = await import("@/lib/sync.server");
    return codeChat({
      supabase: context.supabase,
      userId: context.userId,
      modelId: data.modelId,
      message: data.message,
      history: data.history,
      file: data.file,
    });
  });
