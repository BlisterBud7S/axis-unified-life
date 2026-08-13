import { Button } from "@/components/axis/Button";
import { Card } from "@/components/axis/Card";
import { Input, Label } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Set up AXIS" },
      { name: "description", content: "One quick step to personalise your AXIS dashboard." },
      { property: "og:title", content: "Set up AXIS" },
      { property: "og:description", content: "One quick step to personalise your dashboard." },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading } = useAuth();
  const { data: profile } = useProfile();
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && !user) {
    navigate({ to: "/auth/login" });
    return null;
  }

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !fullName.trim()) return;
    setBusy(true);
    const { error } = await supabase
      .from("users")
      .update({
        email: user.email ?? null,
        full_name: fullName.trim() || profile?.full_name || null,
      })
      .eq("id", user.id);

    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
    navigate({ to: "/home" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg p-7">
        <p className="text-xs tracking-[0.3em] text-primary uppercase">Welcome</p>
        <form onSubmit={saveName} className="mt-4 space-y-5">
          <div>
            <h1 className="text-2xl font-semibold">What should AXIS call you?</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your full name.</p>
          </div>
          <div>
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              autoFocus
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Alex Kumar"
            />
          </div>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Saving…" : "Enter AXIS"}
          </Button>
        </form>
      </Card>
    </main>
  );
}
