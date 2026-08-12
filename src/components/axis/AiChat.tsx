import { Button } from "@/components/axis/Button";
import { Input } from "@/components/axis/Field";
import { axisChat, axisDocument } from "@/lib/ai.functions";
import { downloadDocPdf, type DocSpec } from "@/lib/axis-doc";
import { useProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";
import {
  DEFAULT_MODEL_ID,
  MODELS,
  canUseModel,
  effectiveTier,
  modelById,
  tierConfig,
} from "@/lib/tiers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Bot, Download, FileText, FileType2, Paperclip, Send, Sparkles, User, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
};

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


export function AiChat({
  source,
  compact = false,
  className,
}: {
  source: string;
  compact?: boolean;
  className?: string;
}) {
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);
  const allowed = useMemo(() => MODELS.filter((m) => canUseModel(tier, m)), [tier]);

  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  const [useContext, setUseContext] = useState(config.lifeContext);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<ChatAttachment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [docMode, setDocMode] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const chatFn = useServerFn(axisChat);
  const send = useMutation({
    mutationFn: async (input: { message: string; attachments: ChatAttachment[] }) => {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await chatFn({
        data: {
          message: input.message,
          modelId,
          useContext,
          source,
          history,
          attachments: input.attachments,
        },
      });
      return res;
    },
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      qc.invalidateQueries({ queryKey: ["ai_chat_logs"] });
    },
    onError: (e: Error) => {
      setError(e.message);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `⚠️ ${e.message}` },
      ]);
    },
  });

  const docFn = useServerFn(axisDocument);
  const makeDoc = useMutation({
    mutationFn: async (input: { message: string; attachments: ChatAttachment[] }) =>
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
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `**${res.spec.title}**\n\n${res.spec.summary}`,
          doc: res.spec,
        },
      ]);
      qc.invalidateQueries({ queryKey: ["ai_chat_logs"] });
      void downloadDocPdf(res.spec);
    },
    onError: (e: Error) => {
      setError(e.message);
      setMessages((m) => [...m, { role: "assistant", content: `\u26a0\ufe0f ${e.message}` }]);
    },
  });

  const busy = send.isPending || makeDoc.isPending;

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

  function submit(text: string, attachments: ChatAttachment[] = pending) {
    const message = text.trim() || (attachments.length ? "Have a look at this." : "");
    if (!message || busy) return;
    setError(null);
    setMessages((m) => [
      ...m,
      {
        role: "user",
        content: message,
        attachments: attachments.map((a) => ({
          kind: a.kind,
          name: a.name,
          ...(a.kind === "image" ? { previewUrl: a.dataUrl } : {}),
        })),
      },
    ]);
    setDraft("");
    setPending([]);
    if (docMode) makeDoc.mutate({ message, attachments });
    else send.mutate({ message, attachments });
  }


  const active = modelById(modelId);

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          aria-label="AI engine"
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          className="h-8 rounded-lg border border-border bg-secondary/40 px-2 text-xs text-foreground"
        >
          {MODELS.map((m) => (
            <option key={m.id} value={m.id} disabled={!canUseModel(tier, m)}>
              {m.name}
              {canUseModel(tier, m) ? "" : ` — ${m.minTier} plan`}
            </option>
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
        <button
          onClick={() => setDocMode((v) => !v)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors",
            docMode
              ? "border-primary bg-primary/15 text-primary"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
          title="Turn the answer into a designed PDF document"
        >
          <FileType2 className="h-3.5 w-3.5" /> PDF mode
        </button>
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
                  onClick={() => submit(s)}
                  className="rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} className="flex gap-2.5">
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
                <div className="prose prose-invert prose-sm max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-headings:mt-3 prose-headings:mb-1">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
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
              </div>
            </div>
          ))
        )}
        {busy ? (
          <p className="px-2 text-xs text-muted-foreground">
            {active?.name} is {makeDoc.isPending ? "designing your PDF" : "thinking"}…
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
            docMode
              ? "Describe the PDF you want…"
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

