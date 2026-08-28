import { Card, CardTitle } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { CONNECTORS, CONNECTOR_GROUPS } from "@/lib/connectors";
import { createFileRoute } from "@tanstack/react-router";
import { Bot, Cloud, Database, HeartPulse, Info, Laptop, Lock, Plug } from "lucide-react";

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
  Microsoft: "Link your Microsoft 365 apps — Outlook, OneDrive, Word, Excel, Teams and more.",
  Work: "Bring in context from your dev tools, project management and communication platforms.",
  Data: "Query your own data warehouses and lakehouse tables directly from AXIS.",
  Health: "Sync wearable and health app data into your AXIS Health dashboard.",
  AI: "Import conversations from other AI platforms and use your own API keys for direct model access.",
};

function ConnectionsPage() {
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
            <p className="font-medium text-foreground">Setup pending</p>
            <p>
              Every connector below needs its own OAuth app registered with that provider
              (Google Cloud, Microsoft Entra, GitHub, Anthropic, and so on) before accounts can be
              linked. None are configured yet, so the buttons stay disabled — nothing here is
              faked.
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
                  <p className="mt-1 text-xs text-muted-foreground">{GROUP_DESCRIPTIONS[group]}</p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((c) => (
                  <Card key={c.id} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <Plug className="h-4 w-4 text-primary" />
                        {c.name}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{c.blurb}</p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted-foreground">
                      <Lock className="h-3 w-3" /> Not configured
                    </span>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
