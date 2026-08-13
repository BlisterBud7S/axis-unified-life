import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const updateMyProfileName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ fullName: z.string().trim().min(1).max(120) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = typeof context.claims.email === "string" ? context.claims.email : null;
    const { error } = await supabaseAdmin.from("users").upsert(
      {
        id: context.userId,
        email,
        full_name: data.fullName,
      },
      { onConflict: "id" },
    );

    if (error) throw new Error("Unable to save your name. Please try again.");
    return { ok: true };
  });