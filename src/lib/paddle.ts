import type { TierId } from "@/lib/tiers";

const clientToken = import.meta.env["VITE_PAYMENTS_CLIENT_TOKEN"] as string | undefined;

declare global {
  interface Window {
    Paddle: any;
  }
}

export type BillingCycle = "monthly" | "yearly";

/** Human-readable price IDs created in the payment provider. */
export const PRICE_IDS: Record<Exclude<TierId, "free">, Record<BillingCycle, string>> = {
  plus: { monthly: "axis_plus_monthly", yearly: "axis_plus_yearly" },
  pro: { monthly: "axis_pro_monthly", yearly: "axis_pro_yearly" },
  elite: { monthly: "axis_elite_monthly", yearly: "axis_elite_yearly" },
};

export const PRODUCT_TO_TIER: Record<string, TierId> = {
  axis_plus: "plus",
  axis_pro: "pro",
  axis_elite: "elite",
};

/** Yearly price = 10 months (2 months free). */
export function yearlyPrice(monthly: number) {
  return monthly * 10;
}

export function getPaddleEnvironment(): "sandbox" | "live" {
  return clientToken?.startsWith("test_") ? "sandbox" : "live";
}

let paddleInitialized = false;

export async function initializePaddle() {
  if (paddleInitialized) return;
  if (!clientToken) throw new Error("Payments are not configured yet");

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-paddle]");
    if (existing && window.Paddle) return resolve();

    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.dataset["paddle"] = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load the checkout script"));
    document.head.appendChild(script);
  });

  window.Paddle.Environment.set(getPaddleEnvironment() === "sandbox" ? "sandbox" : "production");
  window.Paddle.Initialize({ token: clientToken });
  paddleInitialized = true;
}

export async function getPaddlePriceId(priceId: string): Promise<string> {
  const { resolvePaddlePrice } = await import("@/lib/payments.functions");
  return resolvePaddlePrice({ data: { priceId, environment: getPaddleEnvironment() } });
}
