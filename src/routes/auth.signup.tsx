import { Button } from "@/components/axis/Button";
import { Card } from "@/components/axis/Card";
import { Input, Label, Select } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
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

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

async function startGoogleRedirect() {
  const { firebaseAuth, googleProvider } = await import("@/lib/firebase");
  const { signInWithRedirect } = await import("firebase/auth");
  await signInWithRedirect(firebaseAuth, googleProvider);
}

async function handleRedirectResult(navigate: (opts: { to: string }) => void) {
  try {
    const { firebaseAuth } = await import("@/lib/firebase");
    const { getRedirectResult } = await import("firebase/auth");
    const result = await getRedirectResult(firebaseAuth);
    if (!result) return;

    const { firebaseGoogleSignIn } = await import("@/lib/firebase-auth.functions");
    const idToken = await result.user.getIdToken();
    const tokens = await firebaseGoogleSignIn({ data: { idToken } });

    const { error } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    if (error) throw error;
    navigate({ to: "/onboarding" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Google sign-up failed";
    toast.error(msg);
  }
}

function SignupPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [country, setCountry] = useState("IN");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    handleRedirectResult(navigate);
  }, [navigate]);

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

  async function handleGoogleSignUp() {
    setGoogleBusy(true);
    try {
      await startGoogleRedirect();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-up failed";
      toast.error(msg);
      setGoogleBusy(false);
    }
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

        <button
          onClick={handleGoogleSignUp}
          disabled={googleBusy}
          className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-[#1f1f1f] transition-colors hover:bg-gray-50 disabled:opacity-50 dark:bg-[#131314] dark:text-[#e3e3e3] dark:border-[#747775] dark:hover:bg-[#1f1f1f]"
        >
          {googleBusy ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <GoogleIcon className="h-5 w-5" />
          )}
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
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
