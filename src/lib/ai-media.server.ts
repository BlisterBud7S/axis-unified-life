import { resolveAccess, logChat, type Client } from "@/lib/axis-ai.server";
import { resolveKey } from "@/lib/ai-gateway.server";

const IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation";
const VIDEO_MODEL = "veo-2";
const BUCKET = "ai-media";

async function gatewayError(res: Response): Promise<never> {
  const body = await res.text();
  if (res.status === 429) throw new Error("AXIS Vision is busy right now — try again in a moment.");
  if (res.status === 402) throw new Error("API quota exhausted — check your billing dashboard.");
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

export async function generateImage(opts: {
  supabase: Client;
  userId: string;
  modelId: string;
  prompt: string;
  sourceImageDataUrl?: string;
  aspect?: string;
}) {
  await resolveAccess(opts.supabase, opts.userId, opts.modelId, "imageGen");

  const parts: Array<Record<string, unknown>> = [
    {
      text: opts.aspect
        ? `${opts.prompt}\n\nCompose the image in a ${opts.aspect} aspect ratio.`
        : opts.prompt,
    },
  ];
  if (opts.sourceImageDataUrl) {
    const match = opts.sourceImageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
    if (match) {
      parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
  }

  const apiKey = await resolveKey("google", opts.userId, opts.supabase);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    },
  );
  if (!res.ok) await gatewayError(res);

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { mimeType?: string; data?: string } }> };
    }>;
  };
  const imagePart = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  const b64 = imagePart?.inlineData?.data;
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

  const apiKey = await resolveKey("google", opts.userId, opts.supabase);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${VIDEO_MODEL}:generateVideos?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [
          {
            prompt: opts.prompt,
            ...(opts.sourceImageDataUrl
              ? (() => {
                  const match = opts.sourceImageDataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/);
                  return match ? { image: { bytesBase64Encoded: match[2] } } : {};
                })()
              : {}),
          },
        ],
        parameters: {
          sampleCount: 1,
          durationSeconds: opts.seconds ?? 8,
          aspectRatio: opts.vertical ? "9:16" : "16:9",
        },
      }),
    },
  );
  if (!res.ok) await gatewayError(res);

  const job = (await res.json()) as { name: string };

  const { data: row, error } = await opts.supabase
    .from("ai_media")
    .insert({
      user_id: opts.userId,
      kind: "video",
      prompt: opts.prompt.slice(0, 4000),
      engine: "AXIS Motion",
      status: "processing",
      job_id: job.name,
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

  const apiKey = await resolveKey("google", opts.userId, opts.supabase);
  const jobRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${row.job_id}?key=${apiKey}`,
    { method: "GET" },
  );
  if (!jobRes.ok) await gatewayError(jobRes);
  const job = (await jobRes.json()) as {
    done?: boolean;
    error?: { message?: string };
    response?: { videos?: Array<{ bytesBase64Encoded?: string }> };
  };

  if (job.error) {
    const message = job.error.message ?? "The video render failed.";
    await opts.supabase
      .from("ai_media")
      .update({ status: "failed", error_message: message.slice(0, 500), updated_at: new Date().toISOString() })
      .eq("id", row.id);
    return { id: row.id, kind: "video", status: "failed", url: null, prompt: row.prompt, error: message };
  }

  if (!job.done) {
    return { id: row.id, kind: "video", status: "processing", url: null, prompt: row.prompt };
  }

  const videoB64 = job.response?.videos?.[0]?.bytesBase64Encoded;
  if (!videoB64) {
    throw new Error("Video completed but no data was returned.");
  }

  const mp4 = Uint8Array.from(atob(videoB64), (c) => c.charCodeAt(0));
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
