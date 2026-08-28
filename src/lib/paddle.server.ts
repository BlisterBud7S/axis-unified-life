export type PaddleEnv = "sandbox" | "live";

const PADDLE_URLS: Record<PaddleEnv, string> = {
  sandbox: "https://sandbox-api.paddle.com",
  live: "https://api.paddle.com",
};

function apiKey(env: PaddleEnv) {
  const key =
    env === "live" ? process.env["PADDLE_LIVE_API_KEY"] : process.env["PADDLE_SANDBOX_API_KEY"];
  if (!key) throw new Error(`Missing Paddle API key for ${env}`);
  return key;
}

export async function gatewayFetch(
  env: PaddleEnv,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${apiKey(env)}`);
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  return fetch(`${PADDLE_URLS[env]}${path}`, { ...init, headers });
}

export async function paddleRequest<T = any>(
  env: PaddleEnv,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await gatewayFetch(env, path, init);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Paddle ${init.method ?? "GET"} ${path} failed (${res.status}): ${text}`);
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

function hexToBytes(hex: string) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export async function verifyWebhook(request: Request, env: PaddleEnv): Promise<any> {
  const secret =
    env === "live"
      ? process.env["PAYMENTS_LIVE_WEBHOOK_SECRET"]
      : process.env["PAYMENTS_SANDBOX_WEBHOOK_SECRET"];
  if (!secret) throw new Error(`Missing Paddle webhook secret for ${env}`);

  const header = request.headers.get("paddle-signature");
  if (!header) throw new Error("Missing Paddle-Signature header");

  const parts = Object.fromEntries(
    header.split(";").map((chunk) => {
      const [k, v] = chunk.split("=");
      return [k?.trim() ?? "", v?.trim() ?? ""];
    }),
  );
  const ts = parts["ts"];
  const h1 = parts["h1"];
  if (!ts || !h1) throw new Error("Malformed Paddle-Signature header");

  const body = await request.text();

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${ts}:${body}`));

  if (!timingSafeEqual(new Uint8Array(mac), hexToBytes(h1))) {
    throw new Error("Invalid Paddle signature");
  }

  return JSON.parse(body);
}
