import { resolveAccess, logChat, type Client } from "@/lib/axis-ai.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";
const IMAGE_MODEL = "google/gemini-3-pro-image";
const VIDEO_MODEL = "google/veo-3.1-lite";
const BUCKET = "ai-media";

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("AI is not configured on this project yet.");
  return k;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${key()}`,
    "Content-Type": "application/json",
    "X-Lovable-AIG-SDK": "fetch",
  };
}

async function gatewayError(res: Response): Promise<never> {
  const body = await res.text();
  if (res.status === 429) throw new Error("AXIS Vision is busy right now — try again in a moment.");
  if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
  let message = body.slice(0, 300);
  try {
    const parsed = JSON.parse(body) as { message?: string; error?: { message?: string } };
    message = parsed.error?.message ?? parsed.message ?? message;
  } catch {
    // keep raw text
  }
  throw new Error(`Generation failed: ${message}`);
}

async function signedUrl(supabase: Client, path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 12);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export type MediaResult = {
  id: string;
  kind: "image" | "video";
  status: "processing" | "completed" | "failed";
  url: string | null;
  prompt: string;
  error?: string;
};

/** Text-to-image (and image editing when a source image is attached). */
export async function generateImage(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  prompt: string;
  sourceImageDataUrl?: string;
  aspect?: string;
}) {
  await resolveAccess(opts.supabase, opts.userId, opts.modelId, "imageGen");

  const content: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: opts.aspect
        ? `${opts.prompt}\n\nCompose the image in a ${opts.aspect} aspect ratio.`
        : opts.prompt,
    },
  ];
  if (opts.sourceImageDataUrl) {
    content.push({ type: "image_url", image_url: { url: opts.sourceImageDataUrl } });
  }

  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: IMAGE_MODEL,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) await gatewayError(res);

  const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image engine returned no image — try rewording the prompt.");

  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const path = `${opts.userId}/images/${crypto.randomUUID()}.png`;
  const { error: upErr } = await opts.supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: "image/png" });
  if (upErr) throw new Error(upErr.message);

  const { data: row, error } = await opts.supabase
    .from("ai_media")
    .insert({
      user_id: opts.userId,
      kind: "image",
      prompt: opts.prompt.slice(0, 4000),
      engine: "AXIS Vision",
      status: "completed",
      storage_path: path,
      aspect: opts.aspect ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logChat(opts.supabase, opts.userId, {
    model: opts.modelId,
    prompt: `[image] ${opts.prompt}`,
    response: "Generated an image with AXIS Vision.",
    contextEnabled: false,
    source: "image_gen",
  });

  return {
    id: row.id,
    kind: "image" as const,
    status: "completed" as const,
    url: await signedUrl(opts.supabase, path),
    prompt: opts.prompt,
  } satisfies MediaResult;
}

/** Kick off a video job. Videos take 1-3 minutes, so the client polls videoStatus. */
export async function startVideo(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  prompt: string;
  seconds?: 4 | 6 | 8;
  vertical?: boolean;
  sourceImageDataUrl?: string;
}) {
  await resolveAccess(opts.supabase, opts.userId, opts.modelId, "videoGen");

  const { count } = await opts.supabase
    .from("ai_media")
    .select("id", { count: "exact", head: true })
    .eq("kind", "video")
    .eq("status", "processing");
  if ((count ?? 0) > 0) {
    throw new Error("One video is already rendering — wait for it to finish before starting another.");
  }

  const res = await fetch(`${GATEWAY}/videos`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      model: VIDEO_MODEL,
      prompt: opts.prompt,
      seconds: String(opts.seconds ?? 8),
      size: opts.vertical ? "720x1280" : "1280x720",
      ...(opts.sourceImageDataUrl ? { input_reference: opts.sourceImageDataUrl } : {}),
    }),
  });
  if (!res.ok) await gatewayError(res);

  const job = (await res.json()) as { id: string };

  const { data: row, error } = await opts.supabase
    .from("ai_media")
    .insert({
      user_id: opts.userId,
      kind: "video",
      prompt: opts.prompt.slice(0, 4000),
      engine: "AXIS Motion",
      status: "processing",
      job_id: job.id,
      seconds: opts.seconds ?? 8,
      aspect: opts.vertical ? "9:16" : "16:9",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await logChat(opts.supabase, opts.userId, {
    model: opts.modelId,
    prompt: `[video] ${opts.prompt}`,
    response: "Started a video render with AXIS Motion.",
    contextEnabled: false,
    source: "video_gen",
  });

  return { id: row.id, kind: "video" as const, status: "processing" as const, url: null, prompt: opts.prompt } satisfies MediaResult;
}

/** Poll a video job; stores the MP4 permanently once it is ready. */
export async function videoStatus(opts: {
  supabase: Client;
  userId: string;
  mediaId: string;
}): Promise<MediaResult> {
  const { data: row, error } = await opts.supabase
    .from("ai_media")
    .select("id, kind, status, storage_path, job_id, prompt, error_message")
    .eq("id", opts.mediaId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) throw new Error("That video is no longer in your library.");

  if (row.status === "completed" && row.storage_path) {
    return {
      id: row.id,
      kind: "video",
      status: "completed",
      url: await signedUrl(opts.supabase, row.storage_path),
      prompt: row.prompt,
    };
  }
  if (row.status === "failed") {
    return {
      id: row.id,
      kind: "video",
      status: "failed",
      url: null,
      prompt: row.prompt,
      error: row.error_message ?? "The video render failed.",
    };
  }
  if (!row.job_id) throw new Error("That video render is missing its job reference.");

  const jobRes = await fetch(`${GATEWAY}/videos/${row.job_id}`, { headers: authHeaders() });
  if (!jobRes.ok) await gatewayError(jobRes);
  const job = (await jobRes.json()) as {
    status: string;
    error?: { message?: string };
  };

  if (job.status === "failed") {
    const message = job.error?.message ?? "The video render failed.";
    await opts.supabase
      .from("ai_media")
      .update({ status: "failed", error_message: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { id: row.id, kind: "video", status: "failed", url: null, prompt: row.prompt, error: message };
  }

  if (job.status !== "completed") {
    return { id: row.id, kind: "video", status: "processing", url: null, prompt: row.prompt };
  }

  const contentRes = await fetch(`${GATEWAY}/videos/${row.job_id}/content`, {
    headers: { Authorization: `Bearer ${key()}` },
  });
  if (!contentRes.ok) await gatewayError(contentRes);
  const mp4 = new Uint8Array(await contentRes.arrayBuffer());

  const path = `${opts.userId}/videos/${row.id}.mp4`;
  const { error: upErr } = await opts.supabase.storage
    .from(BUCKET)
    .upload(path, mp4, { contentType: "video/mp4", upsert: true });
  if (upErr) throw new Error(upErr.message);

  await opts.supabase
    .from("ai_media")
    .update({ status: "completed", storage_path: path, updated_at: new Date().toISOString() })
    .eq("id", row.id);

  return {
    id: row.id,
    kind: "video",
    status: "completed",
    url: await signedUrl(opts.supabase, path),
    prompt: row.prompt,
  };
}
