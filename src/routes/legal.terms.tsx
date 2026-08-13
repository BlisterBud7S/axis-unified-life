import { LegalPage } from "@/components/axis/PublicShell";
import { Link, createFileRoute } from "@tanstack/react-router";

const DESC =
  "Terms and conditions for using AXIS, the personal life operating system by BlisterBudLabs, including acceptable use, AI usage rules, billing and termination.";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — AXIS by BlisterBudLabs" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Terms & Conditions — AXIS" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage title="Terms & Conditions" updated="13 August 2026">
      <p>
        These terms govern your use of AXIS, a personal life operating system web application
        provided by <strong>BlisterBudLabs</strong> ("BlisterBudLabs", "we", "us"). By creating an
        account or continuing to use AXIS you agree to these terms and form a contract with
        BlisterBudLabs. If you do not agree, stop using the service.
      </p>

      <h2>1. Who may use AXIS</h2>
      <p>
        You must be of legal age to form a binding contract in your country, or have permission from
        a parent or guardian. If you accept these terms on behalf of an organisation, you confirm you
        have authority to bind it. You must give accurate account information, keep it current, keep
        your credentials confidential, and you are responsible for all activity under your account.
      </p>

      <h2>2. What AXIS provides</h2>
      <p>
        AXIS lets you record and review tasks, habits, income and expenses, workouts, sleep,
        nutrition and school application progress, and to ask AI engines questions about that data.
        We grant you a limited, non-exclusive, non-transferable right to use AXIS within the plan you
        have selected.
      </p>

      <h2>3. Acceptable use</h2>
      <p>You must not:</p>
      <ul>
        <li>use AXIS for anything unlawful, or to harm, harass or defraud anyone;</li>
        <li>send spam, run fraudulent transactions, or abuse trials, refunds or promotions;</li>
        <li>infringe anyone's intellectual property or privacy rights;</li>
        <li>
          interfere with the security of the service — no malware, probing, penetration testing,
          scraping, rate-limit evasion or unauthorised access attempts;
        </li>
        <li>reverse engineer, resell, redistribute or sublicense AXIS or circumvent plan limits.</li>
      </ul>

      <h2>4. AI features — your responsibilities</h2>
      <p>
        AXIS includes generative AI features (chat assistants, meal photo estimates, admission
        roadmaps, generated documents and code help). You are responsible for the prompts, files and
        images you submit, for having the rights to submit them, and for how you use the outputs. You
        must not use AI features to produce illegal content, deepfakes or impersonations, hateful or
        harassing content, malware, or to attempt to jailbreak or bypass safety controls.
      </p>
      <p>
        <strong>Accuracy disclosure.</strong> AI outputs may be incomplete, outdated or simply wrong.
        Calorie and macro estimates from photos are approximations. Nothing AXIS produces is medical,
        nutritional, financial, legal, tax or admissions advice, and it must not be relied on in
        regulated or professional contexts without independent verification by a qualified person.
        Always verify important outputs before acting on them.
      </p>
      <p>
        <strong>Content moderation.</strong> We may filter or refuse outputs, remove or restrict
        content, and suspend accounts to enforce these terms or the law. If you believe content in
        AXIS infringes your rights, contact us and we will investigate and remove infringing
        material where appropriate; repeat infringement leads to account termination.
      </p>

      <h2>5. Your content</h2>
      <p>
        You keep ownership of the data, files and images you put into AXIS. You grant us a limited
        licence to host, store, process and transmit that content, and to pass prompts and
        attachments to our AI infrastructure providers, solely to operate and provide the service to
        you.
      </p>

      <h2>6. Our intellectual property</h2>
      <p>
        BlisterBudLabs retains all rights in AXIS, including its software, design, documentation and
        branding. Nothing in these terms transfers ownership of the service or our IP to you.
      </p>

      <h2>7. Plans, payment and billing</h2>
      <p>
        AXIS offers a free plan and paid subscription plans (Plus, Pro and Elite) billed monthly or
        yearly in advance. Our order process is conducted by our online reseller Paddle.com.
        Paddle.com is the Merchant of Record for all our orders. Paddle provides all customer service
        inquiries and handles returns. Payment, billing, renewal, tax, cancellation and refund
        mechanics are governed by the{" "}
        <a
          href="https://www.paddle.com/legal/checkout-buyer-terms"
          target="_blank"
          rel="noopener noreferrer"
        >
          Paddle Buyer Terms
        </a>
        , together with our <Link to="/legal/refunds">refund policy</Link>.
      </p>
      <p>
        Subscriptions renew automatically for the same period until cancelled. Upgrades take effect
        immediately with prorated billing; downgrades and cancellations take effect at the end of the
        period you have already paid for, and you keep access to your paid features until then.
      </p>

      <h2>8. Service level</h2>
      <p>
        We work to keep AXIS available and reliable, but we do not guarantee uninterrupted or
        error-free operation. Features may change, and maintenance, third-party outages or AI
        provider limits may interrupt service. To the fullest extent permitted by law we disclaim all
        implied warranties, including merchantability and fitness for a particular purpose.
      </p>

      <h2>9. Suspension and termination</h2>
      <p>
        We may suspend or terminate your access for material breach of these terms, non-payment,
        security or fraud risk, or repeated or serious policy violations. You may stop using AXIS and
        cancel your subscription at any time. After termination you have a reasonable window to
        export your data before it is deleted or anonymised.
      </p>

      <h2>10. Liability</h2>
      <p>
        To the extent permitted by law, our aggregate liability for any claim relating to AXIS is
        limited to the fees you paid in the twelve months before the claim. We are not liable for
        indirect, consequential or special damages, including lost profits, lost data or lost
        goodwill. Nothing here excludes liability for fraud, death or personal injury where the law
        does not allow it. You indemnify us against claims arising from your content, your unlawful
        use of AXIS, or your breach of these terms.
      </p>

      <h2>11. General</h2>
      <p>
        You may not assign these terms without our consent; we may assign them in a merger,
        acquisition or sale of assets. Neither party is liable for delays caused by events beyond
        reasonable control. These terms are governed by the laws of the jurisdiction in which
        BlisterBudLabs is established, and disputes are subject to the courts of that jurisdiction.
        We may update these terms and will post the revised version here with a new "last updated"
        date.
      </p>

      <h2>12. Contact</h2>
      <p>
        Questions about these terms: contact BlisterBudLabs through the support channel in the app.
        For order, invoice, cancellation or refund requests, contact Paddle at{" "}
        <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">
          paddle.net
        </a>
        .
      </p>
    </LegalPage>
  );
}
