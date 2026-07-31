import { Button } from "@/components/axis/Button";
import { Card } from "@/components/axis/Card";
import { Input, Label, Select } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/signup")({
  head: () => ({
    meta: [
      { title: "Create your AXIS account" },
      {
        name: "description",
        content:
          "Sign up for AXIS — one dashboard for your tasks, money, health and school applications.",
      },
      { property: "og:title", content: "Create your AXIS account" },
      {
        property: "og:description",
        content: "One dashboard for tasks, money, health and school applications.",
      },
    ],
  }),
  component: SignupPage,
});

const COUNTRIES = [
  { code: "IN", label: "India" },
  { code: "AU", label: "Australia" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "CA", label: "Canada" },
  { code: "OTHER", label: "Other" },
];

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("IN");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { country_code: country },
      },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("Check your email to confirm your account.");
      return;
    }
    navigate({ to: "/onboarding" });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-7">
        <div className="mb-6">
          <p className="text-xs tracking-[0.3em] text-primary uppercase">AXIS</p>
          <h1 className="mt-2 text-2xl font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your life operating system — tasks, money, health, school.
          </p>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Select id="country" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </Card>
    </main>
  );
}
