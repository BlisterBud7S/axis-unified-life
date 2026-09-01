import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TextPart = { type: "input_text"; text: string };
export type ImagePart = { type: "input_image"; image_url: string };
export type FilePart = { type: "input_file"; filename: string; file_data: string };
export type ContentPart = TextPart | ImagePart | FilePart;
export type AxisMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};

type JsonSchema = { name: string; schema: Record<string, unknown> };

function envOrNull(name: string): string | null {
  return process.env[name] ?? null;
}

async function resolveKey(
  provider: "openai" | "anthropic" | "google",
  userId?: string,
  supabase?: SupabaseClient<Database>,
): Promise<string> {
  if (userId && supabase) {
    const { getUserAiKey } = await import("@/lib/connections.functions");
    const userKey = await getUserAiKey(supabase, userId, provider);
    if (userKey) return userKey;
  }
  const envMap = { openai: "OPENAI_API_KEY", anthropic: "ANTHROPIC_API_KEY", google: "GOOGLE_AI_API_KEY" };
  const key = envOrNull(envMap[provider]);
  if (!key) throw new Error(`No ${provider} API key configured. Add your own key in Connections, or ask the site owner to set ${envMap[provider]}.`);
  return key;
}

async function readSse(res: Response) {
  const reader = res.body?.getReader();
  if (!reader) throw new Error("AI returned an empty response.");
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const event = JSON.parse(payload) as {
          type?: string;
          delta?: string | { content?: string };
          choices?: Array<{ delta?: { content?: string } }>;
          response?: { output_text?: string };
        };
        if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
          text += event.delta;
        } else if (event.choices?.[0]?.delta?.content) {
          text += event.choices[0].delta.content;
        } else if (event.type === "response.completed" && event.response?.output_text) {
          if (!text) text = event.response.output_text;
        }
      } catch {
        // ignore keep-alive / partial frames
      }
    }
  }
  return text;
}

async function fail(res: Response): Promise<never> {
  const body = await res.text();
  if (res.status === 429) throw new Error("AI is busy right now — wait a few seconds and try again.");
  if (res.status === 402) throw new Error("API quota exhausted — check your billing dashboard.");
  if (res.status === 403) throw new Error("AI access denied — check your API key permissions.");
  if (res.status === 401) throw new Error("Invalid API key — check your environment variables.");
  throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 400)}`);
}

function toOpenAiMessages(messages: AxisMessage[]) {
  return messages.map((m) => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : m.content.map((p) => {
            if (p.type === "input_text") return { type: "text" as const, text: p.text };
            if (p.type === "input_image")
              return { type: "image_url" as const, image_url: { url: p.image_url } };
            return { type: "text" as const, text: `[File: ${p.filename}]\n${p.file_data}` };
          }),
  }));
}

export async function runModel(opts: {
  model: string;
  messages: AxisMessage[];
  jsonSchema?: JsonSchema;
  userId?: string;
  supabase?: SupabaseClient<Database>;
}): Promise<string> {
  const { model, messages, jsonSchema, userId, supabase } = opts;

  if (model.startsWith("anthropic/")) {
    const apiKey = await resolveKey("anthropic", userId, supabase);
    const modelId = model.replace("anthropic/", "");

    const system = messages.filter((m) => m.role === "system").map((m) =>
      typeof m.content === "string" ? m.content : m.content.map((p) => "text" in p ? p.text : "").join("")
    ).join("\n\n");

    const nonSystem = messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role as "user" | "assistant",
      content:
        typeof m.content === "string"
          ? [{ type: "text" as const, text: m.content }]
          : m.content.map((p) => {
              if (p.type === "input_text") return { type: "text" as const, text: p.text };
              if (p.type === "input_image") {
                const match = p.image_url.match(/^data:(image\/[^;]+);base64,(.+)$/);
                if (match) {
                  return {
                    type: "image" as const,
                    source: { type: "base64" as const, media_type: match[1] as string, data: match[2] as string },
                  };
                }
                return { type: "text" as const, text: `[Image: ${p.image_url}]` };
              }
              return { type: "text" as const, text: `[File: ${p.filename}]\n${p.file_data}` };
            }),
    }));

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 8192,
        stream: false,
        ...(system ? { system } : {}),
        messages: nonSystem,
      }),
    });
    if (!res.ok) await fail(res);
    const data = (await res.json()) as { content: Array<{ type: string; text?: string }> };
    return data.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  }

  if (model.startsWith("openai/")) {
    const apiKey = await resolveKey("openai", userId, supabase);
    const modelId = model.replace("openai/", "");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        stream: true,
        messages: toOpenAiMessages(messages),
        ...(jsonSchema
          ? {
              response_format: {
                type: "json_schema",
                json_schema: { name: jsonSchema.name, strict: true, schema: jsonSchema.schema },
              },
            }
          : {}),
      }),
    });
    if (!res.ok) await fail(res);
    return readSse(res);
  }

  if (model.startsWith("google/")) {
    const apiKey = await resolveKey("google", userId, supabase);
    const modelId = model.replace("google/", "");

    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts:
          typeof m.content === "string"
            ? [{ text: m.content }]
            : m.content.map((p) => {
                if (p.type === "input_text") return { text: p.text };
                if (p.type === "input_image") {
                  const match = p.image_url.match(/^data:(image\/[^;]+);base64,(.+)$/);
                  if (match) return { inlineData: { mimeType: match[1], data: match[2] } };
                  return { text: `[Image: ${p.image_url}]` };
                }
                return { text: `[File: ${p.filename}]\n${p.file_data}` };
              }),
      }));

    const systemText = messages
      .filter((m) => m.role === "system")
      .map((m) => (typeof m.content === "string" ? m.content : m.content.map((p) => "text" in p ? p.text : "").join("")))
      .join("\n\n");

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          ...(systemText ? { systemInstruction: { parts: [{ text: systemText }] } } : {}),
          ...(jsonSchema
            ? {
                generationConfig: {
                  responseMimeType: "application/json",
                  responseSchema: jsonSchema.schema,
                },
              }
            : {}),
        }),
      },
    );
    if (!res.ok) await fail(res);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  }

  throw new Error(`Unsupported model provider: ${model}`);
}

export function parseJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}
