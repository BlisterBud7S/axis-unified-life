import { PublicShell } from "@/components/axis/PublicShell";
import { TIERS } from "@/lib/tiers";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Brain,
  Check,
  GraduationCap,
  HeartPulse,
  ListChecks,
  Wallet,
} from "lucide-react";

const DESC =
  "AXIS is a personal life operating system: tasks and habits, money, health and nutrition, school applications and an AI assistant that sees all of it — in one dark, focused dashboard.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AXIS — your personal life operating system" },
      { name: "description", content: DESC },
      { property: "og:title", content: "AXIS — your personal life operating system" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

const pillars = [
  {
    icon: ListChecks,
    title: "Life",
    body: "Priority tasks with due dates and categories, plus a seven-day habit grid so streaks are impossible to fake.",
  },
  {
    icon: Wallet,
    title: "Finance",
    body: "Log income and expenses, see spend by category, and ask AXIS whether you can actually afford something.",
  },
  {
    icon: HeartPulse,
    title: "Health",
    body: "Workouts, sleep, match notes and nutrition — log meals by hand or photograph a plate and let AXIS estimate calories and macros.",
  },
  {
    icon: GraduationCap,
    title: "School",
    body: "Track target schools, deadlines and checklists, and generate an AI admission roadmap for each one from your real profile.",
  },
  {
    icon: Brain,
    title: "AI Hub",
    body: "Multiple AXIS engines, attachments (images, PDFs, code), designed PDF documents and a searchable history of every chat.",
  },
];

function LandingPage() {
  return (
    <PublicShell>
      <section className="max-w-3xl">
        <p className="text-xs font-medium tracking-[0.25em] text-primary uppercase">
          Personal life OS
        </p>
        <h1 className="mt-4 text-4xl leading-tight font-semibold text-foreground sm:text-5xl">
          One dashboard for your tasks, money, body and future.
        </h1>
        <p className="mt-5 text-base text-muted-foreground">{DESC}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/auth/signup"
            className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/85"
          >
            Create your AXIS
          </Link>
          <Link
            to="/pricing"
            className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-secondary/60"
          >
            See pricing
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Free plan included. No card needed to start.
        </p>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="glass p-5">
            <p.icon className="h-5 w-5 text-primary" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">{p.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-foreground">What you get on every plan</h2>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            "Tasks, habits, finance, health and school tracking",
            "Dark, distraction-free dashboard on desktop and mobile",
            "AI assistant available from every screen",
            "Installable app with offline viewing of your data",
            "Your data stays scoped to your account only",
            "Cancel or change your plan whenever you want",
          ].map((f) => (
            <li key={f} className="flex gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-foreground">Plans start free</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t) => (
            <div key={t.id} className="glass p-5">
              <p className="text-sm font-semibold text-foreground">{t.name}</p>
              <p className="mt-1 text-2xl font-semibold text-foreground">
                {t.priceMonthly > 0 ? (
                  <>
                    ${t.priceMonthly}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </>
                ) : (
                  "Free"
                )}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">{t.blurb}</p>
            </div>
          ))}
        </div>
        <Link to="/pricing" className="mt-5 inline-block text-sm text-primary underline">
          Compare every plan feature
        </Link>
      </section>

      <section className="glass mt-16 p-8 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Run your life on one system</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Sign up in under a minute, then let AXIS pull your tasks, money, training and
          applications into a single picture.
        </p>
        <Link
          to="/auth/signup"
          className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/85"
        >
          Get started free
        </Link>
      </section>
    </PublicShell>
  );
}
