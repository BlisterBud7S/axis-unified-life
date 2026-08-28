const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export type TextPart = { type: "input_text"; text: string };
export type ImagePart = { type: "input_image"; image_url: string };
export type FilePart = { type: "input_file"; filename: string; file_data: string };
export type ContentPart = TextPart | ImagePart | FilePart;
export type AxisMessage = {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
};


type JsonSchema = { name: string; schema: Record<string, unknown> };

function key() {
  const k = process.env["LOVABLE_API_KEY"];
  if (!k) throw new Error("AI is not configured on this project yet.");
  return k;
}

async function readSse(res: Response, onDelta?: (chunk: string) => void) {
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
          onDelta?.(event.delta);
        } else if (event.choices?.[0]?.delta?.content) {
          const c = event.choices[0].delta.content;
          text += c;
          onDelta?.(c);
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
  if (res.status === 402)
    throw new Error(
      "AXIS AI has run out of monthly AI credits. The workspace owner needs to top up AI credits in Lovable — nothing is wrong with your account or plan.",
    );
  if (res.status === 403)
    throw new Error("AI access is blocked for this workspace right now. The owner needs to re-enable it or raise the AI credit limit.");
  if (res.status === 401) throw new Error("AI is not configured correctly on this project (missing key).");
  throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 400)}`);
}


/**
 * One entry point for every AXIS AI call.
 * OpenAI models go through the gateway Responses API, other vendors through chat completions.
 * Both always stream on the wire; the text is accumulated server-side.
 */
export async function runModel(opts: {
  model: string;
  messages: AxisMessage[];
  jsonSchema?: JsonSchema;
}): Promise<string> {
  const { model, messages, jsonSchema } = opts;
  const headers = {
    "Content-Type": "application/json",
    "Lovable-API-Key": key(),
    "X-Lovable-AIG-SDK": "fetch",
  };

  if (model.startsWith("openai/")) {
    const res = await fetch(`${GATEWAY}/responses`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        stream: true,
        store: false,
        input: messages.map((m) => ({
          role: m.role,
          content:
            typeof m.content === "string"
              ? [{ type: m.role === "assistant" ? "output_text" : "input_text", text: m.content }]
              : m.content,
        })),
        ...(jsonSchema
          ? {
              text: {
                format: {
                  type: "json_schema",
                  name: jsonSchema.name,
                  strict: true,
                  schema: jsonSchema.schema,
                },
              },
            }
          : {}),
      }),
    });
    if (!res.ok) await fail(res);
    return readSse(res);
  }

  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      stream: true,
      messages: messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string"
            ? m.content
            : m.content.map((p) => {
                if (p.type === "input_text") return { type: "text", text: p.text };
                if (p.type === "input_image")
                  return { type: "image_url", image_url: { url: p.image_url } };
                return { type: "file", file: { filename: p.filename, file_data: p.file_data } };
              }),

      })),
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

export function parseJson<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice) as T;
}
