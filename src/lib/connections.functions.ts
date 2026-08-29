import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listMyConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_connections")
      .select("id, connector_id, created_at, updated_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        connectorId: z.string().min(1).max(100),
        apiKey: z.string().min(1).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("user_connections").upsert(
      {
        user_id: context.userId,
        connector_id: data.connectorId,
        api_key: data.apiKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,connector_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ connectorId: z.string().min(1).max(100) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("user_connections")
      .delete()
      .eq("user_id", context.userId)
      .eq("connector_id", data.connectorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getUserAiKey = async (
  userId: string,
  provider: "openai" | "anthropic" | "google",
): Promise<string | null> => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const connectorIds: Record<string, string[]> = {
    openai: ["openai_api", "chatgpt"],
    anthropic: ["anthropic_api", "claude"],
    google: ["gemini"],
  };
  const ids = connectorIds[provider];
  if (!ids) return null;

  const { data } = await supabaseAdmin
    .from("user_connections")
    .select("api_key")
    .eq("user_id", userId)
    .in("connector_id", ids)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.api_key ?? null;
};
