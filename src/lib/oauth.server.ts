import { getOAuthProvider, isOAuthConfigured } from "@/lib/oauth-providers";
import type { SupabaseClient } from "@supabase/supabase-js";

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function randomState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function appBaseUrl(): string {
  return process.env["APP_URL"] || process.env["VERCEL_PROJECT_PRODUCTION_URL"]
    ? `https://${process.env["VERCEL_PROJECT_PRODUCTION_URL"]}`
    : "https://axis-unified-life.vercel.app";
}

export function buildRedirectUri(providerId: string): string {
  return `${appBaseUrl()}/api/public/oauth/${providerId}`;
}

export async function initiateOAuth(opts: {
  supabase: SupabaseClient;
  userId: string;
  connectorId: string;
  providerId: string;
}): Promise<{ url: string }> {
  const provider = getOAuthProvider(opts.providerId);
  if (!provider) throw new Error(`Unknown OAuth provider: ${opts.providerId}`);
  if (!isOAuthConfigured(opts.providerId)) {
    throw new Error(
      `${provider.name} OAuth is not configured yet. The app owner needs to add ${provider.envClientId} and ${provider.envClientSecret} to the environment variables.`,
    );
  }

  const clientId = envOrThrow(provider.envClientId);
  const state = randomState();
  const redirectUri = buildRedirectUri(opts.providerId);
  const sep = provider.scopeSeparator ?? " ";

  // Store state for verification in callback
  const { error } = await opts.supabase.from("oauth_states").insert({
    user_id: opts.userId,
    provider: opts.providerId,
    connector_id: opts.connectorId,
    state,
    redirect_uri: redirectUri,
  });
  if (error) throw new Error(error.message);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    ...(provider.scopes.length > 0 ? { scope: provider.scopes.join(sep) } : {}),
    ...(provider.extraAuthParams ?? {}),
  });

  return { url: `${provider.authorizeUrl}?${params.toString()}` };
}

export async function handleOAuthCallback(opts: {
  providerId: string;
  code: string;
  state: string;
}): Promise<{ success: boolean; connectorId: string }> {
  const provider = getOAuthProvider(opts.providerId);
  if (!provider) throw new Error(`Unknown OAuth provider: ${opts.providerId}`);

  const clientId = envOrThrow(provider.envClientId);
  const clientSecret = envOrThrow(provider.envClientSecret);

  // Use service role to look up the state (no user session in callback)
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    envOrThrow("SUPABASE_URL"),
    envOrThrow("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Verify state
  const { data: oauthState, error: stateError } = await supabase
    .from("oauth_states")
    .select("*")
    .eq("state", opts.state)
    .eq("provider", opts.providerId)
    .maybeSingle();

  if (stateError || !oauthState) {
    throw new Error("Invalid or expired OAuth state. Please try connecting again.");
  }

  // Clean up old states for this user/provider
  await supabase
    .from("oauth_states")
    .delete()
    .eq("user_id", oauthState.user_id)
    .eq("provider", opts.providerId);

  // Check if state is too old (10 min)
  const age = Date.now() - new Date(oauthState.created_at).getTime();
  if (age > 10 * 60 * 1000) {
    throw new Error("OAuth session expired. Please try connecting again.");
  }

  // Exchange code for tokens
  const tokenBody: Record<string, string> = {
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: oauthState.redirect_uri,
    client_id: clientId,
    client_secret: clientSecret,
  };

  const isNotion = opts.providerId === "notion";
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (isNotion) {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    headers["Authorization"] = `Basic ${creds}`;
    delete tokenBody["client_id"];
    delete tokenBody["client_secret"];
  }

  const tokenRes = await fetch(provider.tokenUrl, {
    method: "POST",
    headers,
    body: new URLSearchParams(tokenBody),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text();
    console.error(`[oauth] Token exchange failed for ${opts.providerId}:`, errBody);
    throw new Error(`Failed to connect ${provider.name}. Please try again.`);
  }

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  if (!tokens.access_token) {
    throw new Error(`${provider.name} did not return an access token.`);
  }

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  // Upsert connection with tokens
  const { error: upsertError } = await supabase.from("user_connections").upsert(
    {
      user_id: oauthState.user_id,
      connector_id: oauthState.connector_id,
      oauth_provider: opts.providerId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expires_at: expiresAt,
      oauth_metadata: {
        token_type: tokens.token_type,
        scope: tokens.scope,
        connected_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" },
  );

  if (upsertError) throw new Error(upsertError.message);

  return { success: true, connectorId: oauthState.connector_id };
}

export async function refreshOAuthToken(opts: {
  supabase: SupabaseClient;
  userId: string;
  connectorId: string;
}): Promise<string> {
  const { data: conn } = await opts.supabase
    .from("user_connections")
    .select("access_token, refresh_token, token_expires_at, oauth_provider")
    .eq("user_id", opts.userId)
    .eq("connector_id", opts.connectorId)
    .maybeSingle();

  if (!conn?.access_token) throw new Error("Connection not found");

  // If token is still valid, return it
  if (conn.token_expires_at && new Date(conn.token_expires_at) > new Date(Date.now() + 60_000)) {
    return conn.access_token;
  }

  // Need refresh
  if (!conn.refresh_token || !conn.oauth_provider) {
    throw new Error("Cannot refresh — please reconnect this service.");
  }

  const provider = getOAuthProvider(conn.oauth_provider);
  if (!provider) throw new Error("Unknown provider");

  const clientId = envOrThrow(provider.envClientId);
  const clientSecret = envOrThrow(provider.envClientSecret);

  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: conn.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) throw new Error("Token refresh failed — please reconnect.");

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null;

  // Use service role to update since we might not have user session
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(
    envOrThrow("SUPABASE_URL"),
    envOrThrow("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  await admin
    .from("user_connections")
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? conn.refresh_token,
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", opts.userId)
    .eq("connector_id", opts.connectorId);

  return tokens.access_token;
}
