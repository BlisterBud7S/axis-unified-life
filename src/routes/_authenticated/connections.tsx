import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { CONNECTORS, CONNECTOR_GROUPS } from "@/lib/connectors";
import {
  listMyConnections,
  saveConnection,
  deleteConnection,
} from "@/lib/connections.functions";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useCallback } from "react";
import {
  Bot,
  Check,
  Cloud,
  Database,
  ExternalLink,
  Eye,
  EyeOff,
  HeartPulse,
  Info,
  Laptop,
  Lock,
  Plug,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/connections")({
  head: () => ({
    meta: [
      { title: "Connections — link your apps to AXIS" },
      {
        name: "description",
        content:
          "Connect Google, Microsoft, GitHub, Notion, Slack, Claude, ChatGPT and more so AXIS can work with your own files, mail, calendar and data.",
      },
      { property: "og:title", content: "Connections — link your apps to AXIS" },
      {
        property: "og:description",
        content: "Link your own accounts so AXIS works with your real files, mail and calendars.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConnectionsPage,
});

const GROUP_ICONS: Record<string, typeof Plug> = {
  Google: Cloud,
  Microsoft: Laptop,
  Work: Plug,
  Data: Database,
  Health: HeartPulse,
  AI: Bot,
};

const GROUP_DESCRIPTIONS: Record<string, string> = {
  Google: "Connect your Google Workspace apps — files, mail, calendar, sheets and slides.",
  Microsoft:
    "Link your Microsoft 365 apps — Outlook, OneDrive, Word, Excel, Teams and more.",
  Work: "Bring in context from your dev tools, project management and communication platforms.",
  Data: "Query your own data warehouses and lakehouse tables directly from AXIS.",
  Health: "Sync wearable and health app data into your AXIS Health dashboard.",
  AI: "Import conversations from other AI platforms and use your own API keys for direct model access.",
};

function ConnectionsPage() {
  const qc = useQueryClient();
  const { data: connections = [] } = useQuery({
    queryKey: ["my-connections"],
    queryFn: () => listMyConnections(),
  });

  const connectedIds = new Set(connections.map((c) => c.connector_id));

  return (
    <>
      <Header
        title="Connections"
        subtitle="Link your own accounts so AXIS can work with your real data"
      />

      <Card className="mb-5">
        <div className="flex gap-3">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="space-y-1 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">How connections work</p>
            <p>
              Connectors marked with a key icon accept your own API key — paste it in and
              AXIS will use it for AI calls. OAuth connectors (Google, Microsoft, etc.)
              need the site owner to configure OAuth apps first.
            </p>
          </div>
        </div>
      </Card>

      <div className="space-y-8">
        {CONNECTOR_GROUPS.map((group) => {
          const items = CONNECTORS.filter((c) => c.group === group);
          const Icon = GROUP_ICONS[group] ?? Plug;
          return (
            <div key={group}>
              <div className="mb-3">
                <CardTitle>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary" />
                    {group}
                  </span>
                </CardTitle>
                {GROUP_DESCRIPTIONS[group] ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {GROUP_DESCRIPTIONS[group]}
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((c) => (
                  <ConnectorCard
                    key={c.id}
                    connector={c}
                    isConnected={connectedIds.has(c.id)}
                    onChanged={() =>
                      qc.invalidateQueries({ queryKey: ["my-connections"] })
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function ConnectorCard({
  connector: c,
  isConnected,
  onChanged,
}: {
  connector: (typeof CONNECTORS)[number];
  isConnected: boolean;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  const saveMut = useMutation({
    mutationFn: () => saveConnection({ data: { connectorId: c.id, apiKey: key } }),
    onSuccess: () => {
      toast.success(`${c.name} connected`);
      setEditing(false);
      setKey("");
      onChanged();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => deleteConnection({ data: { connectorId: c.id } }),
    onSuccess: () => {
      toast.success(`${c.name} disconnected`);
      onChanged();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSave = useCallback(() => {
    if (!key.trim()) return;
    saveMut.mutate();
  }, [key, saveMut]);

  if (c.authType === "oauth") {
    return (
      <Card className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <Plug className="h-4 w-4 text-primary" />
            {c.name}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
          <Lock className="h-3 w-3" /> OAuth required
        </span>
      </Card>
    );
  }

  if (isConnected && !editing) {
    return (
      <Card className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-medium">
            <Plug className="h-4 w-4 text-primary" />
            {c.name}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-1 text-[11px] text-success">
            <Check className="h-3 w-3" /> Connected
          </span>
          <button
            onClick={() => deleteMut.mutate()}
            disabled={deleteMut.isPending}
            className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            title="Disconnect"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 font-medium">
              <Plug className="h-4 w-4 text-primary" />
              {c.name}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
          </div>
          <button
            onClick={() => {
              setEditing(false);
              setKey("");
            }}
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="relative">
          <input
            type={showKey ? "text" : "password"}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={c.keyPlaceholder ?? "Paste your API key"}
            className="w-full rounded-lg border border-border bg-secondary/30 px-3 py-2 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex items-center justify-between">
          {c.keyHelpUrl ? (
            <a
              href={c.keyHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Get your key <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span />
          )}
          <button
            onClick={handleSave}
            disabled={!key.trim() || saveMut.isPending}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
          >
            {saveMut.isPending ? "Saving…" : "Save key"}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 font-medium">
          <Plug className="h-4 w-4 text-primary" />
          {c.name}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="shrink-0 rounded-lg border border-primary/40 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
      >
        Connect
      </button>
    </Card>
  );
}
