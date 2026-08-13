import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

const nav = [
  { to: "/pricing", label: "Pricing" },
  { to: "/legal/terms", label: "Terms" },
  { to: "/legal/privacy", label: "Privacy" },
  { to: "/legal/refunds", label: "Refunds" },
] as const;

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="text-lg font-semibold tracking-[0.2em] text-foreground">
            AXIS
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-muted-foreground md:flex">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth/login"
              className="rounded-xl px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/auth/signup"
              className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/85"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12">{children}</main>

      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-8 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} BlisterBudLabs. AXIS is a product of BlisterBudLabs.</p>
          <nav className="flex flex-wrap gap-4">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} className="hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <PublicShell>
      <article className="max-w-3xl">
        <h1 className="text-3xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated {updated}</p>
        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
          {children}
        </div>
      </article>
    </PublicShell>
  );
}
