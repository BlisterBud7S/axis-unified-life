import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { useProfile } from "@/lib/auth";
import { effectiveTier, tierConfig } from "@/lib/tiers";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/checkout/success")({
  head: () => ({
    meta: [
      { title: "Welcome to your new AXIS plan" },
      {
        name: "description",
        content:
          "Your AXIS subscription is active — new AI engines, higher message limits and unlocked features are ready.",
      },
      { property: "og:title", content: "Welcome to your new AXIS plan" },
      {
        property: "og:description",
        content: "Your AXIS subscription is active and every unlocked feature is ready to use.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuccessPage;
});

function SuccessPage() {
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [waited, setWaited] = useState(0);
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);
  const confirmed = tier !== "free";

  // The provider confirms the payment through a webhook, so poll briefly
  // until the new tier lands on the profile.
  useEffect(() => {
    if (confirmed || waited > 12) return;
    const timer = setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setWaited((w) => w + 1);
    }, 2000);
    return () => clearTimeout(timer);
  }, [confirmed, waited, queryClient]);

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card glow>
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          <CardTitle>{confirmed ? `AXIS ${config.name} is live` : "Confirming your payment"}</CardTitle>
        </div>

        {confirmed ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Thanks for upgrading. Everything below is unlocked on your account right now.
            </p>
            <ul className="mt-4 space-y-1.5">
              {config.features.map((f) => (
                <li key={f} className="flex gap-2 text-xs text-foreground">
                  <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              Daily AI messages:{" "}
              {config.dailyMessages === null ? "unlimited" : config.dailyMessages}
            </p>
            <div className="mt-5 flex gap-2">
              <Link to="/ai">
                <Button>Open the AI Hub</Button>
              </Link>
              <Link to="/home">
                <Button variant="outline">Back to Home</Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Waiting for the payment provider to
              confirm — this usually takes a few seconds.
            </p>
            {waited > 12 ? (
              <p className="mt-3 text-xs text-warning">
                Still not through. Your payment is safe — refresh this page in a minute, or open
                Manage billing on the Plans page.
              </p>
            ) : null}
            <div className="mt-5">
              <Link to="/plans">
                <Button variant="outline">Back to Plans</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
