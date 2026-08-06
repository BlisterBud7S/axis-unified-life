import { Button } from "@/components/axis/Button";
import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { Input, Label, Select } from "@/components/axis/Field";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/auth";
import { axisCodeChat } from "@/lib/sync.functions";
import { DEFAULT_MODEL_ID, MODELS, canUseModel, effectiveTier, tierConfig } from "@/lib/tiers";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Check,
  Code2,
  Copy,
  FilePlus2,
  Lock,
  Save,
  Send,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/code")({
  head: () => ({
    meta: [
      { title: "AXIS Code — a coding assistant with a live canvas" },
      {
        name: "description",
        content:
          "Pair-program with AXIS Code: ask for code, keep files on a canvas, and apply the assistant's edits straight into them.",
      },
      { property: "og:title", content: "AXIS Code — a coding assistant with a live canvas" },
      {
        property: "og:description",
        content: "Coding chat with saved files you can iterate on across messages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CodePage,
});

const LANGUAGES = [
  "typescript",
  "javascript",
  "tsx",
  "python",
  "sql",
  "html",
  "css",
  "java",
  "go",
  "rust",
  "bash",
  "json",
  "markdown",
] as const;

type Msg = { role: "user" | "assistant"; content: string };

function CodePage() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const tier = effectiveTier(profile);
  const config = tierConfig(tier);
  const ask = useServerFn(axisCodeChat);

  const codeModels = useMemo(
    () => MODELS.filter((m) => canUseModel(tier, m)),
    [tier],
  );
  const [modelId, setModelId] = useState(DEFAULT_MODEL_ID);
  useEffect(() => {
    if (!codeModels.some((m) => m.id === modelId)) {
      setModelId(codeModels[codeModels.length - 1]?.id ?? "axis-swift");
    }
  }, [codeModels, modelId]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<string>("typescript");
  const [content, setContent] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const files = useQuery({
    queryKey: ["code_files", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("code_files")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openFile(f: { id: string; name: string; language: string; content: string }) {
    setActiveId(f.id);
    setName(f.name);
    setLanguage(f.language);
    setContent(f.content);
  }

  const saveFile = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim() || "untitled",
        language,
        content,
        updated_at: new Date().toISOString(),
      };
      if (activeId) {
        const { error } = await supabase.from("code_files").update(payload).eq("id", activeId);
        if (error) throw error;
        return activeId;
      }
      const { data, error } = await supabase
        .from("code_files")
        .insert({ ...payload, user_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      setActiveId(id);
      qc.invalidateQueries({ queryKey: ["code_files", user?.id] });
      toast.success("File saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeFile = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("code_files").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["code_files", user?.id] });
      setActiveId(null);
      setName("");
      setContent("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: async (message: string) => {
      const history = messages.slice(-12);
      return ask({
        data: {
          message,
          modelId,
          history,
          file: content.trim()
            ? { name: name.trim() || "untitled", language, content }
            : null,
        },
      });
    },
    onSuccess: (res) => {
      setMessages((prev) => [...prev, { role: "assistant", content: res.reply }]);
    },
    onError: (e: Error) => {
      setMessages((prev) => [...prev, { role: "assistant", content: `⚠️ ${e.message}` }]);
    },
  });

  function submit() {
    const text = draft.trim();
    if (!text || send.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setDraft("");
    send.mutate(text);
  }

  if (!config.codeMode) {
    return (
      <div className="space-y-6">
        <Header title="AXIS Code" subtitle="A coding assistant with a canvas you can keep" />
        <Card className="max-w-xl space-y-4">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            AXIS Code gives you a coding-tuned assistant, saved files on a canvas, and one-click
            apply of its edits into your file. It's part of the Plus plan and up.
          </p>
          <Link to="/plans">
            <Button>See plans</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header
        title="AXIS Code"
        subtitle="Ask, get full working code, keep it on your canvas"
        action={
          <Select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-auto"
          >
            {codeModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[220px_1fr_1fr]">
        <Card className="h-fit">
          <CardTitle
            action={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActiveId(null);
                  setName("untitled.ts");
                  setLanguage("typescript");
                  setContent("");
                }}
              >
                <FilePlus2 className="h-3.5 w-3.5" /> New
              </Button>
            }
          >
            Files
          </CardTitle>
          {(files.data ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No files yet — create one and save it.</p>
          ) : (
            <ul className="space-y-1">
              {(files.data ?? []).map((f) => (
                <li key={f.id} className="flex items-center gap-1">
                  <button
                    onClick={() => openFile(f)}
                    className={cn(
                      "flex-1 truncate rounded-lg px-2 py-1.5 text-left text-xs",
                      activeId === f.id
                        ? "bg-primary/15 text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <Code2 className="mr-1 inline h-3 w-3" />
                    {f.name}
                  </button>
                  <button
                    onClick={() => removeFile.mutate(f.id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${f.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex min-h-[560px] flex-col">
          <CardTitle
            action={
              <Button size="sm" variant="secondary" onClick={() => saveFile.mutate()}>
                <Save className="h-3.5 w-3.5" /> Save
              </Button>
            }
          >
            Canvas
          </CardTitle>
          <div className="mb-3 grid grid-cols-[1fr_140px] gap-2">
            <div>
              <Label>File name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="main.ts"
              />
            </div>
            <div>
              <Label>Language</Label>
              <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            spellCheck={false}
            placeholder="// Paste or write code here. AXIS Code sees this file in every message."
            className="min-h-[380px] flex-1 rounded-xl border border-border bg-[#070B16] p-3 font-mono text-xs leading-relaxed text-foreground focus:border-primary focus:outline-none"
          />
        </Card>

        <Card className="flex min-h-[560px] flex-col">
          <CardTitle>Assistant</CardTitle>
          <div className="flex-1 space-y-4 overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" /> Try one of these:
                </p>
                {[
                  "Write a TypeScript function that debounces async calls",
                  "Refactor the file on my canvas and explain the changes",
                  "Find the bug in this code and return the fixed file",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => setDraft(s)}
                    className="block w-full rounded-xl border border-border px-3 py-2 text-left text-xs hover:bg-secondary/60 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-3 text-sm",
                    m.role === "user"
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-secondary/30 text-foreground",
                  )}
                >
                  {m.role === "user" ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <div className="space-y-2 text-sm leading-relaxed [&_p]:mb-2 [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5">
                      <ReactMarkdown
                        components={{
                          pre: ({ children }) => <>{children}</>,
                          code: ({ className, children }) => {
                            const text = String(children).replace(/\n$/, "");
                            if (!text.includes("\n")) {
                              return (
                                <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">
                                  {text}
                                </code>
                              );
                            }
                            return (
                              <CodeBlock
                                code={text}
                                lang={/language-(\w+)/.exec(className ?? "")?.[1] ?? language}
                                onApply={() => {
                                  setContent(text);
                                  toast.success("Applied to canvas");
                                }}
                              />
                            );
                          },
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
              ))
            )}
            {send.isPending ? (
              <p className="text-xs text-muted-foreground">AXIS Code is thinking…</p>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder="Describe what you want to build or fix…"
            />
            <Button onClick={submit} disabled={send.isPending || !draft.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CodeBlock({
  code,
  lang,
  onApply,
}: {
  code: string;
  lang: string;
  onApply: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center justify-between border-b border-border bg-secondary/40 px-3 py-1.5">
        <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          {lang}
        </span>
        <div className="flex gap-1">
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(code);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} copy
          </button>
          <button
            onClick={onApply}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Wand2 className="h-3 w-3" /> apply
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto bg-[#070B16] p-3 font-mono text-[11px] leading-relaxed text-foreground">
        <code>{code}</code>
      </pre>
    </div>
  );
}
