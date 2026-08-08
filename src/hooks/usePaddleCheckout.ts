import { useState } from "react";
import { toast } from "sonner";

import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";

export function usePaddleCheckout() {
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  async function openCheckout(options: {
    priceId: string;
    userId: string;
    customerEmail?: string | null | undefined;
    successUrl?: string | undefined;
  }) {
    setLoadingPriceId(options.priceId);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: { userId: options.userId },
        settings: {
          displayMode: "overlay",
          theme: "dark",
          successUrl:
            options.successUrl || `${window.location.origin}/checkout/success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open checkout");
    } finally {
      setLoadingPriceId(null);
    }
  }

  return { openCheckout, loadingPriceId };
}
