import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PriceInput = z.object({
  priceId: z.string().min(1).max(60),
  environment: z.enum(["sandbox", "live"]),
});

export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => PriceInput.parse(input))
  .handler(async ({ data }) => {
    const { paddleRequest } = await import("@/lib/paddle.server");
    const result = await paddleRequest<{ data: Array<{ id: string }> }>(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId)}`,
    );
    const price = result.data?.[0];
    if (!price) throw new Error(`Price ${data.priceId} not found`);
    return price.id;
  });

/** Opens the provider-hosted billing portal so users can cancel or change payment method. */
export const createBillingPortalUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { paddleRequest } = await import("@/lib/paddle.server");

    const { data: subs, error } = await context.supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment, status, created_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(5);
    if (error) throw new Error(error.message);

    const sub = subs?.[0];
    if (!sub) throw new Error("No subscription found for this account yet");

    const result = await paddleRequest<{
      data: { urls: { general: { overview: string }; subscriptions?: Array<Record<string, string>> } };
    }>(sub.environment as "sandbox" | "live", `/customers/${sub.paddle_customer_id}/portal-sessions`, {
      method: "POST",
      body: JSON.stringify({ subscription_ids: [sub.paddle_subscription_id] }),
    });

    const perSub = result.data.urls.subscriptions?.[0];
    return {
      url:
        perSub?.["updateSubscriptionPaymentMethod"] ??
        perSub?.["update_subscription_payment_method"] ??
        result.data.urls.general.overview,
    };
  });
