import { Button } from "@/components/axis/Button";
import { Card } from "@/components/axis/Card";
import { Input, Label } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  head: () => ({
    meta: [
      { title: "Sign in to AXIS" },
      { name: "description", content: "Sign in to your AXIS life operating system dashboard." },
      { property: "og:title", content: "Sign in to AXIS" },
      { property: "og:description", content: "Sign in to your AXIS dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate({ to: "/home" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-7">
        <div className="mb-6">
          <p className="text-xs tracking-[0.3em] text-primary uppercase">AXIS</p>
          <h1 className="mt-2 text-2xl font-semibold">Welcome back</h1>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          New to AXIS?{" "}
          <Link to="/auth/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </Card>
    </main>
  );
}
