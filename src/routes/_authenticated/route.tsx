import { FloatingAI } from "@/components/axis/FloatingAI";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Link, Outlet, createFileRoute, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bot,
  CalendarCheck,
  GraduationCap,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Sparkles,
  Wallet,
} from "lucide-react";
import { useState } from "react";


export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth/login" });
    return { user: data.user };
  },
  component: Shell,
});

const NAV = [
  { to: "/home", label: "Home", icon: LayoutDashboard },
  { to: "/life", label: "Life", icon: CalendarCheck },
  { to: "/finance", label: "Finance", icon: Wallet },
  { to: "/health", label: "Health", icon: HeartPulse },
  { to: "/school", label: "School", icon: GraduationCap },
  { to: "/ai", label: "AI Hub", icon: Bot },
  { to: "/plans", label: "Plans", icon: Sparkles },
  { to: "/settings", label: "Settings", icon: Settings },

] as const;

function Shell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const needsOnboarding =
    !!user && !isLoading && profile !== undefined && !profile?.full_name;

  if (needsOnboarding && pathname !== "/onboarding") {
    navigate({ to: "/onboarding" });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth/login", replace: true });
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-border bg-sidebar p-4 transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 px-2">
          <p className="text-lg font-semibold tracking-[0.35em] text-foreground">AXIS</p>
          <p className="text-xs text-muted-foreground">Life operating system</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                pathname === to
                  ? "bg-primary/15 font-medium text-primary"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-4 border-t border-border pt-4">
          <p className="truncate px-3 text-xs text-muted-foreground">{profile?.email}</p>
          <button
            onClick={signOut}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border p-3 lg:hidden">
          <button onClick={() => setOpen((v) => !v)} className="text-muted-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-[0.3em]">AXIS</span>
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
      <FloatingAI />

    </div>
  );
}
