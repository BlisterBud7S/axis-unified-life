import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { verifyWebhook, type PaddleEnv } from "@/lib/paddle.server";
import { PRODUCT_TO_TIER } from "@/lib/paddle";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _supabase;
}

type Item = {
  price?: { id?: string; import_meta?: { external_id?: string | null } | null };
  product?: { id?: string; import_meta?: { external_id?: string | null } | null };
};

function externals(items: Item[] | undefined) {
  const item = items?.[0];
  return {
    priceId: item?.price?.import_meta?.external_id ?? null,
    productId: item?.product?.import_meta?.external_id ?? null,
  };
}

/**
 * Mirrors the paid tier onto the user profile. AXIS reads
 * `subscription_tier` + `subscription_active_until`, and `effectiveTier()`
 * falls back to free once the paid period ends — that is how cancellations
 * keep access until period end and how downgrades land at renewal.
 */
async function syncProfileTier(
  userId: string,
  productId: string | null,
  periodEnd: string | null | undefined,
) {
  const tier = productId ? PRODUCT_TO_TIER[productId] : undefined;
  if (!tier) return;
  await getSupabase()
    .from("users")
    .update({
      subscription_tier: tier,
      subscription_active_until: periodEnd ?? null,
    })
    .eq("id", userId);
}

async function subscriptionRowFor(subscriptionId: string, env: PaddleEnv) {
  const { data } = await getSupabase()
    .from("subscriptions")
    .select("user_id, product_id")
    .eq("paddle_subscription_id", subscriptionId)
    .eq("environment", env)
    .maybeSingle();
  return data as { user_id: string; product_id: string } | null;
}

async function handleSubscriptionCreated(data: any, env: PaddleEnv) {
  const userId = data.custom_data?.userId;
  if (!userId) {
    console.error("[payments] subscription.created without custom_data.userId");
    return;
  }
  const { priceId, productId } = externals(data.items);
  if (!priceId || !productId) {
    console.warn("[payments] skipping subscription: missing import_meta.external_id", {
      rawPriceId: data.items?.[0]?.price?.id,
      rawProductId: data.items?.[0]?.product?.id,
    });
    return;
  }

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        paddle_subscription_id: data.id,
        paddle_customer_id: data.customer_id,
        product_id: productId,
        price_id: priceId,
        status: data.status,
        current_period_start: data.current_billing_period?.starts_at ?? null,
        current_period_end: data.current_billing_period?.ends_at ?? null,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "paddle_subscription_id" },
    );

  await syncProfileTier(userId, productId, data.current_billing_period?.ends_at);
}

async function handleSubscriptionUpdated(data: any, env: PaddleEnv) {
  const { priceId, productId } = externals(data.items);
  const patch: Record<string, unknown> = {
    status: data.status,
    current_period_start: data.current_billing_period?.starts_at ?? null,
    current_period_end: data.current_billing_period?.ends_at ?? null,
    cancel_at_period_end: data.scheduled_change?.action === "cancel",
    updated_at: new Date().toISOString(),
  };
  if (priceId) patch["price_id"] = priceId;
  if (productId) patch["product_id"] = productId;

  await getSupabase()
    .from("subscriptions")
    .update(patch)
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);

  const row = await subscriptionRowFor(data.id, env);
  const userId = data.custom_data?.userId ?? row?.user_id;
  if (userId) {
    // Upgrades apply immediately (Paddle prorates); a scheduled downgrade keeps
    // the current product until the change lands, which arrives as another update.
    await syncProfileTier(
      userId,
      productId ?? row?.product_id ?? null,
      data.current_billing_period?.ends_at,
    );
  }
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);

  const row = await subscriptionRowFor(data.id, env);
  const userId = data.custom_data?.userId ?? row?.user_id;
  const periodEnd = data.current_billing_period?.ends_at ?? null;
  if (userId) {
    // Access stays until the paid period ends; effectiveTier() drops to free after that.
    await syncProfileTier(userId, row?.product_id ?? null, periodEnd);
  }
}

async function handleWebhook(request: Request, env: PaddleEnv) {
  const event = await verifyWebhook(request, env);

  switch (event.event_type) {
    case "subscription.created":
      await handleSubscriptionCreated(event.data, env);
      break;
    case "subscription.updated":
      await handleSubscriptionUpdated(event.data, env);
      break;
    case "subscription.canceled":
      await handleSubscriptionCanceled(event.data, env);
      break;
    default:
      console.log("[payments] unhandled event:", event.event_type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[payments] webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
