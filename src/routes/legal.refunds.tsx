import { LegalPage } from "@/components/axis/PublicShell";
import { Link, createFileRoute } from "@tanstack/react-router";

const DESC =
  "AXIS refund policy: 30-day money-back guarantee on AXIS subscriptions, processed by our reseller Paddle. How to request a refund and how cancellations work.";

export const Route = createFileRoute("/legal/refunds")({
  head: () => ({
    meta: [
      { title: "Refund Policy — AXIS by BlisterBudLabs" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Refund Policy — AXIS" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RefundPage,
});

function RefundPage() {
  return (
    <LegalPage title="Refund Policy" updated="13 August 2026">
      <p>
        AXIS is provided by <strong>BlisterBudLabs</strong>. We want you to be happy with your
        subscription, so we offer a <strong>30-day money-back guarantee</strong>.
      </p>

      <h2>30-day money-back guarantee</h2>
      <p>
        If you are not satisfied with your purchase for any reason, including simply changing your
        mind, you can request a full refund within 30 days of your order date. This applies to first
        purchases and to renewal charges of AXIS Plus, Pro and Elite, on both monthly and yearly
        billing.
      </p>

      <h2>How to request a refund</h2>
      <p>
        Our order process is conducted by our online reseller Paddle.com, which is the Merchant of
        Record for all our orders and handles returns. To request a refund:
      </p>
      <ul>
        <li>
          visit{" "}
          <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">
            paddle.net
          </a>{" "}
          and look up your order using the email address you paid with, or
        </li>
        <li>
          use the "Manage billing" link on the Plans screen inside AXIS, or
        </li>
        <li>contact BlisterBudLabs support through the app and we will arrange it with Paddle.</li>
      </ul>
      <p>
        Approved refunds are returned to your original payment method. Your bank or card issuer
        usually posts the money within 5–10 business days.
      </p>

      <h2>Cancelling instead of refunding</h2>
      <p>
        You can cancel a subscription at any time from "Manage billing". Cancellation stops future
        renewals; your paid features stay active until the end of the period you have already paid
        for, and no further charges are taken. Downgrades work the same way, while upgrades apply
        immediately with prorated billing.
      </p>

      <h2>Statutory rights</h2>
      <p>
        This policy is in addition to any refund or cancellation rights you have under your local
        consumer law, and to Paddle's own{" "}
        <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">
          refund policy
        </a>
        . Nothing here limits those rights.
      </p>
      <p>
        See also our <Link to="/legal/terms">terms and conditions</Link> and{" "}
        <Link to="/legal/privacy">privacy notice</Link>.
      </p>
    </LegalPage>
  );
}
