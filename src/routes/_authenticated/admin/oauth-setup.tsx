import { Card } from "@/components/axis/Card";
import { Header } from "@/components/axis/Header";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, ExternalLink, ChevronDown, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/oauth-setup")({
  head: () => ({
    meta: [{ title: "OAuth Setup — AXIS Admin" }],
  }),
  component: OAuthSetupPage,
});

const REDIRECT_BASE = "https://axis-unified-life.vercel.app/api/public/oauth";

type ProviderSetup = {
  id: string;
  name: string;
  consoleUrl: string;
  consoleName: string;
  redirectUri: string;
  envClientId: string;
  envClientSecret: string;
  steps: string[];
};

const PROVIDERS: ProviderSetup[] = [
  {
    id: "google",
    name: "Google",
    consoleUrl: "https://console.cloud.google.com/apis/credentials",
    consoleName: "Google Cloud Console",
    redirectUri: `${REDIRECT_BASE}/google`,
    envClientId: "GOOGLE_OAUTH_CLIENT_ID",
    envClientSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Google Cloud Console → APIs & Services → Credentials",
      "Click 'Create Credentials' → 'OAuth client ID'",
      "Select 'Web application' as the type",
      "Add the redirect URI below under 'Authorized redirect URIs'",
      "Copy the Client ID and Client Secret",
      "Enable Gmail API, Calendar API, Drive API, Docs API, Sheets API, Slides API in the API Library",
    ],
  },
  {
    id: "microsoft",
    name: "Microsoft",
    consoleUrl: "https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade",
    consoleName: "Azure Portal",
    redirectUri: `${REDIRECT_BASE}/microsoft`,
    envClientId: "MICROSOFT_OAUTH_CLIENT_ID",
    envClientSecret: "MICROSOFT_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Azure Portal → App registrations → New registration",
      "Name it 'AXIS' and select 'Accounts in any organizational directory and personal Microsoft accounts'",
      "Add the redirect URI below as a 'Web' platform redirect",
      "Go to Certificates & secrets → New client secret → copy the Value",
      "The Application (client) ID is on the Overview page",
    ],
  },
  {
    id: "github",
    name: "GitHub",
    consoleUrl: "https://github.com/settings/developers",
    consoleName: "GitHub Developer Settings",
    redirectUri: `${REDIRECT_BASE}/github`,
    envClientId: "GITHUB_OAUTH_CLIENT_ID",
    envClientSecret: "GITHUB_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to GitHub → Settings → Developer settings → OAuth Apps → New OAuth App",
      "Set the Authorization callback URL to the redirect URI below",
      "Set the Homepage URL to https://axis-unified-life.vercel.app",
      "Click 'Register application', then 'Generate a new client secret'",
    ],
  },
  {
    id: "gitlab",
    name: "GitLab",
    consoleUrl: "https://gitlab.com/-/user_settings/applications",
    consoleName: "GitLab Applications",
    redirectUri: `${REDIRECT_BASE}/gitlab`,
    envClientId: "GITLAB_OAUTH_CLIENT_ID",
    envClientSecret: "GITLAB_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to GitLab → Edit Profile → Applications → Add new application",
      "Add the redirect URI below",
      "Select scopes: read_user, read_api, read_repository",
      "Click Save and copy the Application ID and Secret",
    ],
  },
  {
    id: "notion",
    name: "Notion",
    consoleUrl: "https://www.notion.so/my-integrations",
    consoleName: "Notion Integrations",
    redirectUri: `${REDIRECT_BASE}/notion`,
    envClientId: "NOTION_OAUTH_CLIENT_ID",
    envClientSecret: "NOTION_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to notion.so/my-integrations → New integration",
      "Select 'Public' integration type",
      "Add the redirect URI below",
      "Copy the OAuth client ID and client secret",
    ],
  },
  {
    id: "slack",
    name: "Slack",
    consoleUrl: "https://api.slack.com/apps",
    consoleName: "Slack API",
    redirectUri: `${REDIRECT_BASE}/slack`,
    envClientId: "SLACK_OAUTH_CLIENT_ID",
    envClientSecret: "SLACK_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to api.slack.com/apps → Create New App → From scratch",
      "Go to OAuth & Permissions → add the redirect URI below",
      "Add Bot Token Scopes: channels:read, chat:write, search:read, users:read",
      "Go to Basic Information → copy Client ID and Client Secret",
    ],
  },
  {
    id: "spotify",
    name: "Spotify",
    consoleUrl: "https://developer.spotify.com/dashboard",
    consoleName: "Spotify Developer Dashboard",
    redirectUri: `${REDIRECT_BASE}/spotify`,
    envClientId: "SPOTIFY_OAUTH_CLIENT_ID",
    envClientSecret: "SPOTIFY_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Spotify Developer Dashboard → Create app",
      "Add the redirect URI below",
      "Copy the Client ID and Client Secret from Settings",
    ],
  },
  {
    id: "canva",
    name: "Canva",
    consoleUrl: "https://www.canva.com/developers",
    consoleName: "Canva Developers",
    redirectUri: `${REDIRECT_BASE}/canva`,
    envClientId: "CANVA_OAUTH_CLIENT_ID",
    envClientSecret: "CANVA_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to canva.com/developers → Create an app",
      "Add the redirect URI below under OAuth settings",
      "Copy the Client ID and Client Secret",
    ],
  },
  {
    id: "figma",
    name: "Figma",
    consoleUrl: "https://www.figma.com/developers/apps",
    consoleName: "Figma Developer Apps",
    redirectUri: `${REDIRECT_BASE}/figma`,
    envClientId: "FIGMA_OAUTH_CLIENT_ID",
    envClientSecret: "FIGMA_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to figma.com/developers/apps → Create a new app",
      "Add the redirect URI below under 'Callback URL'",
      "Copy the Client ID and Client Secret",
    ],
  },
  {
    id: "linear",
    name: "Linear",
    consoleUrl: "https://linear.app/settings/api/applications/new",
    consoleName: "Linear API Settings",
    redirectUri: `${REDIRECT_BASE}/linear`,
    envClientId: "LINEAR_OAUTH_CLIENT_ID",
    envClientSecret: "LINEAR_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Linear → Settings → API → OAuth Applications → New",
      "Add the redirect URI below",
      "Copy the Client ID and Client Secret",
    ],
  },
  {
    id: "hubspot",
    name: "HubSpot",
    consoleUrl: "https://developers.hubspot.com/",
    consoleName: "HubSpot Developers",
    redirectUri: `${REDIRECT_BASE}/hubspot`,
    envClientId: "HUBSPOT_OAUTH_CLIENT_ID",
    envClientSecret: "HUBSPOT_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to HubSpot Developers → Create a developer account if needed",
      "Create an app → go to Auth tab",
      "Add the redirect URI below",
      "Add scopes: crm.objects.contacts.read, crm.objects.companies.read, crm.objects.deals.read",
      "Copy the Client ID and Client Secret",
    ],
  },
  {
    id: "stripe",
    name: "Stripe",
    consoleUrl: "https://dashboard.stripe.com/settings/connect",
    consoleName: "Stripe Dashboard",
    redirectUri: `${REDIRECT_BASE}/stripe`,
    envClientId: "STRIPE_OAUTH_CLIENT_ID",
    envClientSecret: "STRIPE_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Stripe Dashboard → Settings → Connect settings",
      "Enable OAuth for your platform",
      "Add the redirect URI below",
      "Copy the Client ID (starts with ca_) and use your Stripe Secret Key",
    ],
  },
  {
    id: "whoop",
    name: "WHOOP",
    consoleUrl: "https://developer-dashboard.whoop.com/",
    consoleName: "WHOOP Developer Dashboard",
    redirectUri: `${REDIRECT_BASE}/whoop`,
    envClientId: "WHOOP_OAUTH_CLIENT_ID",
    envClientSecret: "WHOOP_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to WHOOP Developer Dashboard → Create an app",
      "Add the redirect URI below",
      "Select scopes: read:recovery, read:sleep, read:workout, read:cycles, read:profile",
      "Copy the Client ID and Client Secret",
    ],
  },
  {
    id: "fitbit",
    name: "Fitbit",
    consoleUrl: "https://dev.fitbit.com/apps/new",
    consoleName: "Fitbit Developer",
    redirectUri: `${REDIRECT_BASE}/fitbit`,
    envClientId: "FITBIT_OAUTH_CLIENT_ID",
    envClientSecret: "FITBIT_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to dev.fitbit.com → Register an Application",
      "Set OAuth 2.0 Application Type to 'Server'",
      "Add the redirect URI below",
      "Copy the OAuth 2.0 Client ID and Client Secret",
    ],
  },
  {
    id: "trello",
    name: "Trello",
    consoleUrl: "https://trello.com/power-ups/admin",
    consoleName: "Trello Power-Up Admin",
    redirectUri: `${REDIRECT_BASE}/trello`,
    envClientId: "TRELLO_OAUTH_CLIENT_ID",
    envClientSecret: "TRELLO_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Trello Power-Up Admin → New",
      "Fill in app details and generate API key",
      "The API key is your Client ID; generate a Secret on the same page",
    ],
  },
  {
    id: "discord",
    name: "Discord",
    consoleUrl: "https://discord.com/developers/applications",
    consoleName: "Discord Developer Portal",
    redirectUri: `${REDIRECT_BASE}/discord`,
    envClientId: "DISCORD_OAUTH_CLIENT_ID",
    envClientSecret: "DISCORD_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Discord Developer Portal → New Application",
      "Go to OAuth2 → add the redirect URI below",
      "Copy the Client ID and Client Secret",
    ],
  },
  {
    id: "zoom",
    name: "Zoom",
    consoleUrl: "https://marketplace.zoom.us/develop/create",
    consoleName: "Zoom Marketplace",
    redirectUri: `${REDIRECT_BASE}/zoom`,
    envClientId: "ZOOM_OAUTH_CLIENT_ID",
    envClientSecret: "ZOOM_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Zoom Marketplace → Develop → Build App → OAuth",
      "Add the redirect URI below",
      "Copy the Client ID and Client Secret",
    ],
  },
  {
    id: "dropbox",
    name: "Dropbox",
    consoleUrl: "https://www.dropbox.com/developers/apps/create",
    consoleName: "Dropbox App Console",
    redirectUri: `${REDIRECT_BASE}/dropbox`,
    envClientId: "DROPBOX_OAUTH_CLIENT_ID",
    envClientSecret: "DROPBOX_OAUTH_CLIENT_SECRET",
    steps: [
      "Go to Dropbox App Console → Create app",
      "Choose 'Scoped access' and 'Full Dropbox'",
      "Add the redirect URI below under OAuth 2 → Redirect URIs",
      "Copy the App key (Client ID) and App secret (Client Secret)",
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-xs text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
      title="Copy to clipboard"
    >
      {copied ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function ProviderSetupCard({ provider }: { provider: ProviderSetup }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="space-y-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="font-medium">{provider.name}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div>
            <a
              href={provider.consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/85"
            >
              Open {provider.consoleName} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium text-muted-foreground">Redirect URI</p>
            <div className="flex items-center gap-2">
              <code className="rounded bg-secondary/50 px-2 py-1 text-xs break-all">
                {provider.redirectUri}
              </code>
              <CopyButton text={provider.redirectUri} />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Steps</p>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              {provider.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="rounded-lg border border-border bg-secondary/20 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Then set these env vars on Vercel:
            </p>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <code className="text-xs">{provider.envClientId}</code>
                <CopyButton text={provider.envClientId} />
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs">{provider.envClientSecret}</code>
                <CopyButton text={provider.envClientSecret} />
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function OAuthSetupPage() {
  return (
    <>
      <Header
        title="OAuth Provider Setup"
        subtitle="Register AXIS with each service to enable user connections"
      />

      <Card className="mb-5">
        <div className="space-y-2 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">How this works</p>
          <p>
            Each provider below needs a one-time app registration. Click to expand a provider,
            follow the steps, then add the Client ID and Client Secret as environment variables
            on Vercel. Once set, that provider's "Connect" button goes live on the Connections page.
          </p>
          <p>
            <a
              href="https://vercel.com/blisterbud7s/axis-unified-life/settings/environment-variables"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              Open Vercel Environment Variables <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      </Card>

      <div className="space-y-3">
        {PROVIDERS.map((p) => (
          <ProviderSetupCard key={p.id} provider={p} />
        ))}
      </div>
    </>
  );
}
