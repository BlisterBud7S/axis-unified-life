import { PublicShell } from "@/components/axis/PublicShell";
import { TIERS } from "@/lib/tiers";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Brain,
  Check,
  GraduationCap,
  HeartPulse,
  ListChecks,
  Plug,
  Sparkles,
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
    body: "28+ AI engines including Claude, GPT and Gemini. Persistent conversations you can edit and revisit, attachments, PDF generation, image and video creation.",
  },
];

const integrations = [
  "Google Drive", "Google Docs", "Google Sheets", "Gmail", "Google Calendar",
  "Outlook", "OneDrive", "Word", "Excel", "Teams",
  "GitHub", "GitLab", "Notion", "Slack", "Linear",
  "Claude", "ChatGPT", "Gemini", "Perplexity",
  "Oura", "Fitbit", "Apple Health",
];

function LandingPage() {
  return (
    <PublicShell>
      {/* Hero */}
      <section className="relative max-w-3xl">
        <div className="absolute -top-24 -left-32 h-64 w-64 rounded-full bg-gold/5 blur-[100px]" />
        <div className="absolute top-0 right-0 h-48 w-48 rounded-full bg-gold/4 blur-[80px]" />

        <div className="relative">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold" />
            <p className="text-xs font-medium tracking-[0.25em] text-gold uppercase">
              Personal life OS
            </p>
          </div>
          <h1 className="mt-4 text-4xl leading-tight font-semibold sm:text-5xl">
            <span className="text-foreground">One dashboard for your </span>
            <span className="gold-gradient-text">tasks, money, body</span>
            <span className="text-foreground"> and </span>
            <span className="gold-gradient-text">future.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground">{DESC}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth/signup"
              className="rounded-xl bg-gradient-to-r from-gold-dim via-gold to-gold-light px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
            >
              Create your AXIS
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-gold-dim/30 px-6 py-3 text-sm font-medium text-foreground hover:border-gold-dim/50 hover:bg-gold/5 transition-all"
            >
              See pricing
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free plan included. No card needed to start.
          </p>
        </div>
      </section>

      {/* Gold divider */}
      <div className="gold-line mt-16" />

      {/* Pillars */}
      <section className="mt-16 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {pillars.map((p, i) => (
          <div
            key={p.title}
            className={`glass-gold p-5 transition-all hover:border-gold-dim/30 ${i === 0 ? "md:col-span-2 lg:col-span-1" : ""}`}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10">
              <p.icon className="h-4.5 w-4.5 text-gold" />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-foreground">{p.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </section>

      {/* Integrations */}
      <section className="mt-16">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-gold-dim" />
          <h2 className="text-2xl font-semibold text-foreground">Connected to everything</h2>
        </div>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          AXIS links to the apps you already use — Google Drive, Docs, Sheets, Outlook, OneDrive,
          GitHub, Notion, Slack, Claude, ChatGPT and more. Pull context from your files, mail and
          calendars so AXIS can give answers grounded in your real data.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          {integrations.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1.5 rounded-lg border border-gold-dim/15 bg-gold/5 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-gold-dim/30 hover:text-foreground"
            >
              <Plug className="h-3 w-3 text-gold-dim" />
              {name}
            </span>
          ))}
        </div>
      </section>

      {/* Gold divider */}
      <div className="gold-line mt-16" />

      {/* Features */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-foreground">What you get on every plan</h2>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            "Tasks, habits, finance, health and school tracking",
            "28+ AI engines — Claude, GPT, Gemini and AXIS originals",
            "Persistent, editable AI conversations like Claude",
            "Connect Google, Microsoft, GitHub, Slack and more",
            "Dark, distraction-free dashboard on desktop and mobile",
            "AI assistant available from every screen",
            "Installable app with offline viewing of your data",
            "Your data stays scoped to your account only",
            "Cancel or change your plan whenever you want",
          ].map((f) => (
            <li key={f} className="flex gap-2 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              {f}
            </li>
          ))}
        </ul>
      </section>

      {/* Plans */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold text-foreground">Plans start free</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((t, i) => (
            <div
              key={t.id}
              className={
                i === TIERS.length - 1
                  ? "glass-gold glow-gold p-5"
                  : "glass p-5 transition-all hover:border-gold-dim/20"
              }
            >
              <p className={`text-sm font-semibold ${i === TIERS.length - 1 ? "text-gold" : "text-foreground"}`}>
                {t.name}
              </p>
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
        <Link to="/pricing" className="mt-5 inline-block text-sm text-gold underline decoration-gold-dim/40 hover:decoration-gold transition-colors">
          Compare every plan feature
        </Link>
      </section>

      {/* CTA */}
      <section className="glass-gold glow-gold mt-16 p-8 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-gold" />
        <h2 className="mt-3 text-2xl font-semibold text-foreground">Run your life on one system</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
          Sign up in under a minute, then let AXIS pull your tasks, money, training and
          applications into a single picture.
        </p>
        <Link
          to="/auth/signup"
          className="mt-6 inline-block rounded-xl bg-gradient-to-r from-gold-dim via-gold to-gold-light px-6 py-3 text-sm font-semibold text-background hover:opacity-90 transition-opacity"
        >
          Get started free
        </Link>
      </section>
    </PublicShell>
  );
}
