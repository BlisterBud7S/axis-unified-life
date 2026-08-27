import { Button } from "@/components/axis/Button";
import { Input } from "@/components/axis/Field";
import { axisChat, axisDocument, axisImage, axisVideoStart, axisVideoStatus } from "@/lib/ai.functions";
import { downloadDocPdf, type DocSpec } from "@/lib/axis-doc";
import {
  createConversation,
  deleteMessage,
  deleteMessagesFrom,
  insertMessage,
  listMessages,
  setConversationModel,
  updateMessage,
  type StoredMedia,
} from "@/lib/conversations";
import { useProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MODEL_ID,
  MODELS,
  MODEL_FAMILIES,
  canUseModel,
  effectiveTier,
  modelById,
  tierConfig,
} from "@/lib/tiers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  Bot,
  Check,
  Download,
  FileText,
  FileType2,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Pencil,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

export type ChatAttachment =
  | { kind: "image"; name: string; dataUrl: string }
  | { kind: "file"; name: string; mimeType: string; dataUrl: string }
  | { kind: "text"; name: string; text: string };

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  attachments?: Array<{ kind: ChatAttachment["kind"]; name: string; previewUrl?: string }>;
  doc?: DocSpec;
  media?: StoredMedia;
  rowId?: string;
  createdAt?: string;
};

type Mode = "chat" | "pdf" | "image" | "video";

const MAX_FILES = 5;
const MAX_BYTES = 5 * 1024 * 1024;
const TEXT_EXT =
  /\.(txt|md|markdown|csv|tsv|json|jsonc|ya?ml|xml|html?|css|scss|js|jsx|ts|tsx|py|rb|go|rs|java|kt|c|h|cpp|cs|php|sh|sql|env|log|ics)$/i;

function readAs(file: File, as: "text" | "dataUrl") {
  return new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error(`Could not read ${file.name}`));
    r.onload = () => resolve(String(r.result));
    if (as === "text") r.readAsText(file);
    else r.readAsDataURL(file);
  });
}

async function toAttachment(file: File): Promise<ChatAttachment> {
  if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 5 MB.`);
  if (file.type.startsWith("image/")) {
    return { kind: "image", name: file.name, dataUrl: await readAs(file, "dataUrl") };
  }
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
    return {
      kind: "file",
      name: file.name,
      mimeType: "application/pdf",
      dataUrl: await readAs(file, "dataUrl"),
    };
  }
  if (file.type.startsWith("text/") || TEXT_EXT.test(file.name) || file.type === "application/json") {
    return { kind: "text", name: file.name, text: await readAs(file, "text") };
  }
  throw new Error(`${file.name} isn't supported — attach images, PDFs or text/code files.`);
}

const SUGGESTIONS = [
  "Plan my week around my open tasks",
  "How am I doing on protein today?",
  "Where is my money leaking this month?",
  "What should I do next for my top target school?",
];

type SendInput = {
  message: string;
  attachments: ChatAttachment[];
  history: Array<{ role: "user" | "assistant"; content: string }>;
};

export function AiChat({
  source,
  compact = false,
  className,
  conversationId,
  onConversationCreated,
  onConversationTouched,
}: {
  source: string;
  compact?: boolean;
  className?: string;
  conversationId?: string | null;
  onConversationCreated?: (id: string, title: string) => void;
  onConversationTouched?: () => void;
}) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);
  const allowed = useMemo(() => MODELS.filter((m) => canUseModel(tier, m)), [tier]);
  const persist = !!onConversationCreated;

  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [useContext, setUseContext] = useState(config.lifeContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("chat");
  const [vertical, setVertical] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const convRef = useRef<string | null>(conversationId ?? null);

  useEffect(() => {
    convRef.current = conversationId ?? null;
    if (!persist) return;
    setEditing(null);
    setError(null);
    if (!conversationId) {
      setMessages([]);
      return;
    }
    let live = true;
    void listMessages(conversationId)
      .then((rows) => {
        if (!live) return;
        setMessages(
          rows.map((r) => ({
            role: r.role === "assistant" ? "assistant" : "user",
            content: r.content,
            attachments: (Array.isArray(r.attachments) ? r.attachments : []) as ChatMessage["attachments"],
            ...(r.doc ? { doc: r.doc as DocSpec } : {}),
            ...(r.media ? { media: r.media as StoredMedia } : {}),
            rowId: r.id,
            createdAt: r.created_at,
          })),
        );
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      live = false;
    };
  }, [conversationId, persist]);

  useEffect(() => {
    if (!allowed.some((m) => m.id === modelId)) {
      setModelId(allowed[allowed.length - 1]?.id ?? "axis-swift");
    }
  }, [allowed, modelId]);

  useEffect(() => {
    setUseContext(config.lifeContext);
  }, [config.lifeContext]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /** Persist a message row and attach its id to the in-memory message. */
  const store = useCallback(
    async (index: number, message: ChatMessage) => {
      const convId = convRef.current;
      if (!persist || !convId) return;
      try {
        const row = await insertMessage(convId, {
          role: message.role,
          content: message.content,
          ...(message.attachments ? { attachments: message.attachments } : {}),
          ...(message.doc ? { doc: message.doc } : {}),
          ...(message.media ? { media: message.media } : {}),
        });
        setMessages((m) =>
          m.map((msg, i) => (i === index ? { ...msg, rowId: row.id, createdAt: row.created_at } : msg)),
        );
        onConversationTouched?.();
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [persist, onConversationTouched],
  );

  const pushAssistant = useCallback(
    (message: ChatMessage) => {
      setMessages((m) => {
        void store(m.length, message);
        return [...m, message];
      });
      qc.invalidateQueries({ queryKey: ["ai_chat_logs"] });
    },
    [store, qc],
  );

  const chatFn = useServerFn(axisChat);
  const send = useMutation({
    mutationFn: async (input: SendInput) =>
      chatFn({
        data: {
          message: input.message,
          modelId,
          useContext,
          source,
          history: input.history,
          attachments: input.attachments,
        },
      }),
    onSuccess: (res) => pushAssistant({ role: "assistant", content: res.reply }),
    onError: (e: Error) => {
      setError(e.message);
      pushAssistant({ role: "assistant", content: `⚠️ ${e.message}` });
    },
  });

  const docFn = useServerFn(axisDocument);
  const makeDoc = useMutation({
    mutationFn: async (input: SendInput) =>
      docFn({
        data: {
          prompt: input.message,
          modelId,
          useContext,
          source,
          attachments: input.attachments,
        },
      }),
    onSuccess: (res) => {
      pushAssistant({
        role: "assistant",
        content: `**${res.spec.title}**\n\n${res.spec.summary}`,
        doc: res.spec,
      });
      void downloadDocPdf(res.spec);
    },
    onError: (e: Error) => {
      setError(e.message);
      pushAssistant({ role: "assistant", content: `\u26a0\ufe0f ${e.message}` });
    },
  });

  const imageFn = useServerFn(axisImage);
  const makeImage = useMutation({
    mutationFn: async (input: SendInput) => {
      const src = input.attachments.find((a) => a.kind === "image");
      return imageFn({
        data: {
          prompt: input.message,
          modelId,
          aspect: vertical ? "9:16 vertical" : "16:9 landscape",
          ...(src && src.kind === "image" ? { sourceImageDataUrl: src.dataUrl } : {}),
        },
      });
    },
    onSuccess: (res) => pushAssistant({ role: "assistant", content: "Here's your image.", media: res }),
    onError: (e: Error) => {
      setError(e.message);
      pushAssistant({ role: "assistant", content: `\u26a0\ufe0f ${e.message}` });
    },
  });

  const videoFn = useServerFn(axisVideoStart);
  const videoStatusFn = useServerFn(axisVideoStatus);

  function pollVideo(mediaId: string) {
    let tries = 0;
    const tick = async () => {
      tries += 1;
      try {
        const res = await videoStatusFn({ data: { mediaId } });
        setMessages((m) =>
          m.map((msg) => {
            if (msg.media?.id !== mediaId) return msg;
            const content =
              res.status === "completed"
                ? "Here's your video."
                : res.status === "failed"
                  ? `\u26a0\ufe0f ${res.error ?? "The video render failed."}`
                  : msg.content;
            const media = { ...msg.media, ...res } as StoredMedia;
            if (msg.rowId) void updateMessage(msg.rowId, { content, media });
            return { ...msg, content, media };
          }),
        );
        if (res.status === "processing" && tries < 40) setTimeout(() => void tick(), 8000);
      } catch (e) {
        setError((e as Error).message);
      }
    };
    setTimeout(() => void tick(), 10000);
  }

  const makeVideo = useMutation({
    mutationFn: async (input: SendInput) => {
      const src = input.attachments.find((a) => a.kind === "image");
      return videoFn({
        data: {
          prompt: input.message,
          modelId,
          seconds: 8 as const,
          vertical,
          ...(src && src.kind === "image" ? { sourceImageDataUrl: src.dataUrl } : {}),
        },
      });
    },
    onSuccess: (res) => {
      pushAssistant({
        role: "assistant",
        content: "Rendering your video — this usually takes one to three minutes.",
        media: res,
      });
      pollVideo(res.id);
    },
    onError: (e: Error) => {
      setError(e.message);
      pushAssistant({ role: "assistant", content: `\u26a0\ufe0f ${e.message}` });
    },
  });

  const busy = send.isPending || makeDoc.isPending || makeImage.isPending || makeVideo.isPending;

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_FILES - pending.length;
    const next: ChatAttachment[] = [];
    for (const file of Array.from(files).slice(0, Math.max(room, 0))) {
      try {
        next.push(await toAttachment(file));
      } catch (e) {
        setError((e as Error).message);
      }
    }
    if (files.length > room) setError(`You can attach up to ${MAX_FILES} files per message.`);
    if (next.length) setPending((p) => [...p, ...next]);
  }

  async function run(message: string, attachments: ChatAttachment[], base: ChatMessage[]) {
    if (persist && !convRef.current) {
      try {
        const conv = await createConversation({ title: message, modelId });
        convRef.current = conv.id;
        onConversationCreated?.(conv.id, conv.title);
      } catch (e) {
        setError((e as Error).message);
        return;
      }
    }
    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      attachments: attachments.map((a) => ({
        kind: a.kind,
        name: a.name,
        ...(a.kind === "image" ? { previewUrl: a.dataUrl } : {}),
      })),
    };
    setMessages([...base, userMessage]);
    void store(base.length, userMessage);

    const history = base.map((m) => ({ role: m.role, content: m.content }));
    const input: SendInput = { message, attachments, history };
    if (mode === "pdf") makeDoc.mutate(input);
    else if (mode === "image") makeImage.mutate(input);
    else if (mode === "video") makeVideo.mutate(input);
    else send.mutate(input);
  }

  function submit(text: string, attachments: ChatAttachment[] = pending) {
    const message = text.trim() || (attachments.length ? "Have a look at this." : "");
    if (!message || busy) return;
    setError(null);
    setDraft("");
    setPending([]);
    void run(message, attachments, messages);
  }

  /** Rewrite a user message and re-run the conversation from that point. */
  async function saveEdit(index: number) {
    const text = editDraft.trim();
    const target = messages[index];
    if (!text || !target || busy) return;
    setEditing(null);
    setError(null);
    const base = messages.slice(0, index);
    if (persist && convRef.current && target.createdAt) {
      try {
        await deleteMessagesFrom(convRef.current, target.createdAt);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    await run(text, [], base);
  }

  /** Re-ask the last question. */
  async function regenerate() {
    if (busy) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    const index = messages.lastIndexOf(lastUser);
    setError(null);
    const base = messages.slice(0, index);
    if (persist && convRef.current && lastUser.createdAt) {
      try {
        await deleteMessagesFrom(convRef.current, lastUser.createdAt);
      } catch (e) {
        setError((e as Error).message);
      }
    }
    await run(lastUser.content, [], base);
  }

  async function removeMessage(index: number) {
    const target = messages[index];
    if (!target) return;
    setMessages((m) => m.filter((_, i) => i !== index));
    if (persist && target.rowId) {
      try {
        await deleteMessage(target.rowId);
        onConversationTouched?.();
      } catch (e) {
        setError((e as Error).message);
      }
    }
  }

  const active = modelById(modelId);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="AI engine"
          value={modelId}
          onChange={(e) => {
            setModelId(e.target.value);
            if (persist && convRef.current) void setConversationModel(convRef.current, e.target.value);
          }}
          className="h-8 rounded-lg border border-border bg-secondary/40 px-2 text-xs text-foreground"
        >
          {MODEL_FAMILIES.map((family) => (
            <optgroup key={family} label={family}>
              {MODELS.filter((m) => m.family === family).map((m) => (
                <option key={m.id} value={m.id} disabled={!canUseModel(tier, m)}>
                  {m.name}
                  {canUseModel(tier, m) ? "" : ` — ${m.minTier} plan`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button
          onClick={() => config.lifeContext && setUseContext((v) => !v)}
          disabled={!config.lifeContext}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors",
            useContext
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
            !config.lifeContext && "cursor-not-allowed opacity-60",
          )}
          title={
            config.lifeContext
              ? "Include your AXIS data in answers"
              : "Personal context is available on Plus and above"
          }
        >
          <Sparkles className="h-3.5 w-3.5" /> My data
        </button>
        {(
          [
            { id: "pdf", label: "PDF", icon: FileType2, title: "Turn the answer into a designed PDF document", locked: false },
            { id: "image", label: "Image", icon: ImageIcon, title: "Generate an image with AXIS Vision", locked: !config.imageGen },
            { id: "video", label: "Video", icon: Video, title: "Generate a short video with AXIS Motion", locked: !config.videoGen },
          ] as const
        ).map(({ id, label, icon: Icon, title, locked }) => (
          <button
            key={id}
            onClick={() =>
              locked
                ? setError(
                    id === "image"
                      ? "AXIS Vision image generation is a Plus feature. Upgrade your plan to use it."
                      : "AXIS Motion video generation is a Pro feature. Upgrade your plan to use it.",
                  )
                : setMode((v) => (v === id ? "chat" : id))
            }
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors",
              mode === id
                ? "border-primary bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
              locked && "opacity-60",
            )}
            title={title}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
        {mode === "image" || mode === "video" ? (
          <button
            onClick={() => setVertical((v) => !v)}
            className="flex h-8 items-center rounded-lg border border-border px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            title="Switch the output shape"
          >
            {vertical ? "9:16" : "16:9"}
          </button>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {config.name} plan ·{" "}
          {config.dailyMessages ? `${config.dailyMessages} msgs/day` : "unlimited"}
        </span>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 space-y-3 overflow-y-auto rounded-xl border border-border bg-secondary/20 p-3",
          compact ? "max-h-[46vh]" : "min-h-[320px]",
        )}
      >
        {messages.length === 0 ? (
          <div className="space-y-3 p-2">
            <p className="text-sm text-muted-foreground">
              {active?.name} is ready. Ask anything about your tasks, money, training, food or
              applications.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => submit(s, [])}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={m.rowId ?? i} className="group flex gap-2.5">
              <div
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  m.role === "user" ? "bg-secondary text-muted-foreground" : "bg-primary/15 text-primary",
                )}
              >
                {m.role === "user" ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                {m.attachments?.length ? (
                  <div className="mb-1.5 flex flex-wrap gap-2">
                    {m.attachments.map((a, j) =>
                      a.previewUrl ? (
                        <img
                          key={j}
                          src={a.previewUrl}
                          alt={a.name}
                          className="h-16 w-16 rounded-lg border border-border object-cover"
                        />
                      ) : (
                        <span
                          key={j}
                          className="flex max-w-[180px] items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-2 py-1 text-xs text-muted-foreground"
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{a.name}</span>
                        </span>
                      ),
                    )}
                  </div>
                ) : null}
                {editing === i ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      aria-label="Edit message"
                      className="w-full rounded-xl border border-primary/50 bg-secondary/40 p-2.5 text-sm text-foreground outline-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void saveEdit(i)} disabled={busy}>
                        <Check className="h-3.5 w-3.5" /> Save &amp; re-run
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-headings:mt-3 prose-headings:mb-1">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                )}
                {m.doc ? (
                  <div className="mt-2 flex items-center gap-3 rounded-xl border border-primary/40 bg-primary/10 p-3">
                    <FileType2 className="h-5 w-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{m.doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {m.doc.sections.length} sections · designed PDF
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => void downloadDocPdf(m.doc!)}>
                      <Download className="h-3.5 w-3.5" /> Download
                    </Button>
                  </div>
                ) : null}
                {m.media ? (
                  <div className="mt-2 overflow-hidden rounded-xl border border-border bg-secondary/30">
                    {m.media.status === "completed" && m.media.url ? (
                      m.media.kind === "image" ? (
                        <img
                          src={m.media.url}
                          alt={m.media.prompt}
                          className="max-h-[420px] w-full object-contain"
                        />
                      ) : (
                        <video
                          src={m.media.url}
                          controls
                          playsInline
                          className="max-h-[420px] w-full bg-black object-contain"
                        />
                      )
                    ) : m.media.status === "processing" ? (
                      <div className="flex items-center gap-2 p-4 text-xs text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        AXIS Motion is rendering your video…
                      </div>
                    ) : (
                      <p className="p-4 text-xs text-destructive">
                        {m.media.error ?? "That generation failed."}
                      </p>
                    )}
                    {m.media.status === "completed" && m.media.url ? (
                      <div className="flex items-center justify-between gap-3 border-t border-border p-2.5">
                        <p className="truncate text-xs text-muted-foreground">{m.media.prompt}</p>
                        <a
                          href={m.media.url}
                          download={`axis-${m.media.kind}.${m.media.kind === "image" ? "png" : "mp4"}`}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Download className="h-3.5 w-3.5" /> Save
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : null}
                {editing === i ? null : (
                  <div className="mt-1.5 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                    {m.role === "user" ? (
                      <button
                        type="button"
                        title="Edit this message and re-run"
                        aria-label="Edit message"
                        onClick={() => {
                          setEditing(i);
                          setEditDraft(m.content);
                        }}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        title="Regenerate this answer"
                        aria-label="Regenerate answer"
                        onClick={() => void regenerate()}
                        className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete this message"
                      aria-label="Delete message"
                      onClick={() => void removeMessage(i)}
                      className="rounded-md p-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {busy ? (
          <p className="px-2 text-xs text-muted-foreground">
            {makeImage.isPending
              ? "AXIS Vision is painting your image"
              : makeVideo.isPending
                ? "AXIS Motion is starting your video"
                : makeDoc.isPending
                  ? `${active?.name} is designing your PDF`
                  : `${active?.name} is thinking`}
            …
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}
      {error && /plan|Upgrade|upgrade/.test(error) ? (
        <Link to="/plans" className="mt-2 text-xs text-primary hover:underline">
          See plans and upgrade →
        </Link>
      ) : null}

      {pending.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {pending.map((a, i) => (
            <div
              key={i}
              className="relative flex max-w-[190px] items-center gap-1.5 rounded-lg border border-border bg-secondary/40 py-1 pl-1.5 pr-6 text-xs text-muted-foreground"
            >
              {a.kind === "image" ? (
                <img src={a.dataUrl} alt={a.name} className="h-6 w-6 rounded object-cover" />
              ) : (
                <FileText className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="truncate">{a.name}</span>
              <button
                type="button"
                aria-label={`Remove ${a.name}`}
                onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(draft);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,application/pdf,text/*,.md,.csv,.json,.yml,.yaml,.ics,.log"
          className="hidden"
          onChange={(e) => {
            void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          aria-label="Attach images or files"
          title="Attach images, PDFs or text files"
          onClick={() => fileRef.current?.click()}
          disabled={busy || pending.length >= MAX_FILES}
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={
            mode === "pdf"
              ? "Describe the PDF you want…"
              : mode === "image"
                ? "Describe the image you want…"
                : mode === "video"
                  ? "Describe the video you want…"
              : pending.length
                ? "Ask about the attachments…"
                : "Ask AXIS…"
          }
          aria-label="Message AXIS"
          onPaste={(e) => {
            const files = Array.from(e.clipboardData.files);
            if (files.length) {
              e.preventDefault();
              const dt = new DataTransfer();
              files.forEach((f) => dt.items.add(f));
              void addFiles(dt.files);
            }
          }}
        />
        <Button
          type="submit"
          size="icon"
          disabled={busy || (!draft.trim() && pending.length === 0)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
