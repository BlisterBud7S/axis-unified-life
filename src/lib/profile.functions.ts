import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const updateMyProfileName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ fullName: z.string().trim().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    const { error } = await context.supabase.from("users").upsert(
      {
        id: context.userId,
        email,
        full_name: data.fullName,
      },
      { onConflict: "id" },
    );

    if (error) {
      console.error("[profile] upsert error:", error.message, error.code, error.details);
      throw new Error(`Unable to save your name: ${error.message}`);
    }
    return { ok: true };
  });