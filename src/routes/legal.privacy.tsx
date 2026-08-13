import { LegalPage } from "@/components/axis/PublicShell";
import { Link, createFileRoute } from "@tanstack/react-router";

const DESC =
  "AXIS privacy notice: what personal data BlisterBudLabs collects, why, the legal bases, who it is shared with (including Paddle as Merchant of Record), retention and your rights.";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — AXIS by BlisterBudLabs" },
      { name: "description", content: DESC },
      { property: "og:title", content: "Privacy Notice — AXIS" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Notice" updated="13 August 2026">
      <p>
        <strong>BlisterBudLabs</strong> ("we", "us") provides AXIS, a personal life operating system.
        For the personal data described here, BlisterBudLabs is the <strong>data controller</strong>:
        we decide what data is collected through AXIS and why, and we are responsible for protecting
        it.
      </p>

      <h2>1. Data we collect and why</h2>
      <ul>
        <li>
          <strong>Account data</strong> — email address, name or display name, login credentials
          managed by our authentication provider, and your chosen country. Used to create and secure
          your account and to contact you about the service. Legal basis: performance of our contract
          with you.
        </li>
        <li>
          <strong>Content you enter</strong> — tasks, habits, income and expense records, workouts,
          sleep, match notes, meals and nutrition figures, meal photos, school profile details and
          target schools, saved code files, and imported calendar or statement files. Used to provide
          the features you asked for. Legal basis: performance of our contract.
        </li>
        <li>
          <strong>AI prompts and attachments</strong> — the questions you ask, the files and images
          you attach, and the responses generated, together with a history of those conversations so
          you can search them later. Used to run AI features and show your history. Legal basis:
          performance of our contract.
        </li>
        <li>
          <strong>Subscription data</strong> — your plan, its status and the period it is paid until,
          and the identifiers our payment reseller returns for your subscription. Used to give you
          the right access level. Legal basis: performance of our contract and our legal obligations.
        </li>
        <li>
          <strong>Technical and usage data</strong> — IP address, device and browser information,
          timestamps, error reports and basic usage events. Used for security, fraud prevention,
          debugging and improving the product. Legal basis: legitimate interests in running a secure,
          working service.
        </li>
        <li>
          <strong>Support messages</strong> — what you send us when you ask for help. Used to answer
          you. Legal basis: legitimate interests and contract performance.
        </li>
      </ul>
      <p>
        Card and payment details are collected and processed by Paddle, not by us — we never see or
        store your full card number.
      </p>

      <h2>2. Who we share data with</h2>
      <ul>
        <li>
          <strong>Merchant of Record</strong> — Paddle.com, which sells AXIS subscriptions on our
          behalf and handles payments, subscription management, invoicing, tax compliance and
          returns.
        </li>
        <li>
          <strong>Service providers and subprocessors</strong> — our hosting, database,
          authentication and file storage provider; our AI model infrastructure providers, which
          receive prompts and attachments in order to generate responses; and error-monitoring
          tooling. They act on our instructions only.
        </li>
        <li>
          <strong>Professional advisers</strong> — legal, accounting and similar advisers where
          needed.
        </li>
        <li>
          <strong>Authorities</strong> — where we are legally required to disclose data, or to
          protect our rights or someone's safety.
        </li>
      </ul>
      <p>We do not sell your personal data and we do not use your AXIS content for advertising.</p>

      <h2>3. International transfers</h2>
      <p>
        Our providers may process data outside your country, including outside the UK and EEA. Where
        that happens we rely on appropriate safeguards such as adequacy decisions or Standard
        Contractual Clauses.
      </p>

      <h2>4. Retention</h2>
      <p>
        We keep your account and content for as long as your account exists. If you delete your
        account or ask us to delete your data, we remove or anonymise it, except where we must keep
        limited records (for example billing and tax records, typically for up to seven years, held
        primarily by Paddle) or to resolve disputes and prevent abuse. Backups age out on a rolling
        schedule.
      </p>

      <h2>5. Your rights</h2>
      <p>
        Subject to your local law, you can ask us to give you access to your data, correct it, delete
        it, restrict or object to certain processing, or provide it in a portable format, and you can
        withdraw consent where we relied on it. Contact us through the support channel in the app and
        we will respond within one month. If you are in the UK or EEA you can also complain to your
        data protection supervisory authority.
      </p>

      <h2>6. Security</h2>
      <p>
        We use appropriate technical and organisational measures, including encryption in transit,
        encrypted storage, hashed credentials handled by our auth provider, and row-level access
        rules so each account can only read and write its own records. Meal photos are held in a
        private storage bucket restricted to their owner. No system is perfectly secure, so please
        use a strong, unique password.
      </p>

      <h2>7. Cookies and local storage</h2>
      <p>
        AXIS uses only strictly necessary cookies and browser storage: your login session, your
        preferences, and a cached copy of your own data so the app works offline. We do not use
        advertising or cross-site tracking cookies. Clearing your browser storage signs you out and
        removes the offline cache.
      </p>

      <h2>8. Children</h2>
      <p>
        AXIS is not intended for children under 13 (or the minimum age in your country). If we learn
        we hold such data without appropriate consent we will delete it.
      </p>

      <h2>9. Changes and contact</h2>
      <p>
        We will post updates to this notice here with a new "last updated" date. Questions about
        privacy: contact BlisterBudLabs through the support channel in the app. See also our{" "}
        <Link to="/legal/terms">terms</Link> and <Link to="/legal/refunds">refund policy</Link>.
      </p>
    </LegalPage>
  );
}
