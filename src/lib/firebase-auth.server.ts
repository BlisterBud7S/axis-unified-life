import type { SupabaseClient } from "@supabase/supabase-js";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function verifyFirebaseIdToken(idToken: string): Promise<{
  email: string;
  name: string | undefined;
  picture: string | undefined;
  sub: string;
}> {
  const res = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );
  if (!res.ok) throw new Error("Invalid Google ID token");
  const payload = (await res.json()) as Record<string, string>;

  if (!payload["email"]) throw new Error("Token missing email claim");
  if (payload["email_verified"] !== "true") throw new Error("Email not verified");

  return {
    email: payload["email"]!,
    name: payload["name"],
    picture: payload["picture"],
    sub: payload["sub"] ?? "",
  };
}

export async function signInWithFirebaseToken(idToken: string): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const verified = await verifyFirebaseIdToken(idToken);

  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    envOrThrow("SUPABASE_URL"),
    envOrThrow("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Find existing user by email
  const { data: userList } = await admin.auth.admin.listUsers();
  const existing = userList?.users?.find(
    (u) => u.email?.toLowerCase() === verified.email.toLowerCase(),
  );

  let userId: string;

  if (existing) {
    userId = existing.id;
  } else {
    const { data: newUser, error } = await admin.auth.admin.createUser({
      email: verified.email,
      email_confirm: true,
      user_metadata: {
        full_name: verified.name,
        avatar_url: verified.picture,
        provider: "google",
      },
    });
    if (error || !newUser.user) throw new Error(error?.message ?? "Failed to create user");
    userId = newUser.user.id;

    await admin.from("profiles").upsert(
      {
        id: userId,
        display_name: verified.name ?? verified.email.split("@")[0],
        avatar_url: verified.picture ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  }

  // Generate a magic link to get session tokens (link is not emailed)
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: verified.email,
  });

  if (linkError || !linkData) throw new Error(linkError?.message ?? "Failed to generate session");

  // Verify the OTP to get actual session tokens
  const hashed_token = linkData.properties?.hashed_token;
  if (!hashed_token) throw new Error("No token generated");

  const { data: session, error: verifyError } = await admin.auth.verifyOtp({
    token_hash: hashed_token,
    type: "magiclink",
  });

  if (verifyError || !session.session) {
    throw new Error(verifyError?.message ?? "Failed to create session");
  }

  return {
    access_token: session.session.access_token,
    refresh_token: session.session.refresh_token,
  };
}
