export type OAuthProvider = {
  id: string;
  name: string;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  envClientId: string;
  envClientSecret: string;
  scopeSeparator?: string;
  extraAuthParams?: Record<string, string>;
};

const PROVIDERS: OAuthProvider[] = [
  {
    id: "google",
    name: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/documents.readonly",
      "https://www.googleapis.com/auth/spreadsheets.readonly",
      "https://www.googleapis.com/auth/presentations.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    envClientId: "GOOGLE_OAUTH_CLIENT_ID",
    envClientSecret: "GOOGLE_OAUTH_CLIENT_SECRET",
    extraAuthParams: { access_type: "offline", prompt: "consent" },
  },
  {
    id: "microsoft",
    name: "Microsoft",
    authorizeUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: [
      "openid",
      "email",
      "Mail.Read",
      "Calendars.Read",
      "Files.Read.All",
      "Notes.Read",
      "Chat.Read",
      "Sites.Read.All",
      "offline_access",
    ],
    envClientId: "MICROSOFT_OAUTH_CLIENT_ID",
    envClientSecret: "MICROSOFT_OAUTH_CLIENT_SECRET",
  },
  {
    id: "github",
    name: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scopes: ["repo", "read:user", "read:org"],
    envClientId: "GITHUB_OAUTH_CLIENT_ID",
    envClientSecret: "GITHUB_OAUTH_CLIENT_SECRET",
    scopeSeparator: ",",
  },
  {
    id: "gitlab",
    name: "GitLab",
    authorizeUrl: "https://gitlab.com/oauth/authorize",
    tokenUrl: "https://gitlab.com/oauth/token",
    scopes: ["read_user", "read_api", "read_repository"],
    envClientId: "GITLAB_OAUTH_CLIENT_ID",
    envClientSecret: "GITLAB_OAUTH_CLIENT_SECRET",
  },
  {
    id: "notion",
    name: "Notion",
    authorizeUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
    envClientId: "NOTION_OAUTH_CLIENT_ID",
    envClientSecret: "NOTION_OAUTH_CLIENT_SECRET",
    extraAuthParams: { owner: "user" },
  },
  {
    id: "slack",
    name: "Slack",
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["channels:read", "chat:write", "search:read", "users:read"],
    envClientId: "SLACK_OAUTH_CLIENT_ID",
    envClientSecret: "SLACK_OAUTH_CLIENT_SECRET",
    scopeSeparator: ",",
  },
  {
    id: "spotify",
    name: "Spotify",
    authorizeUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scopes: [
      "user-read-playback-state",
      "user-read-currently-playing",
      "user-read-recently-played",
      "user-library-read",
      "playlist-read-private",
    ],
    envClientId: "SPOTIFY_OAUTH_CLIENT_ID",
    envClientSecret: "SPOTIFY_OAUTH_CLIENT_SECRET",
  },
  {
    id: "canva",
    name: "Canva",
    authorizeUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: "https://www.canva.com/api/oauth/token",
    scopes: ["design:content:read", "design:meta:read", "asset:read"],
    envClientId: "CANVA_OAUTH_CLIENT_ID",
    envClientSecret: "CANVA_OAUTH_CLIENT_SECRET",
  },
  {
    id: "figma",
    name: "Figma",
    authorizeUrl: "https://www.figma.com/oauth",
    tokenUrl: "https://api.figma.com/v1/oauth/token",
    scopes: ["files:read"],
    envClientId: "FIGMA_OAUTH_CLIENT_ID",
    envClientSecret: "FIGMA_OAUTH_CLIENT_SECRET",
  },
  {
    id: "linear",
    name: "Linear",
    authorizeUrl: "https://linear.app/oauth/authorize",
    tokenUrl: "https://api.linear.app/oauth/token",
    scopes: ["read", "issues:create", "comments:create"],
    envClientId: "LINEAR_OAUTH_CLIENT_ID",
    envClientSecret: "LINEAR_OAUTH_CLIENT_SECRET",
    scopeSeparator: ",",
  },
  {
    id: "hubspot",
    name: "HubSpot",
    authorizeUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    scopes: ["crm.objects.contacts.read", "crm.objects.companies.read", "crm.objects.deals.read"],
    envClientId: "HUBSPOT_OAUTH_CLIENT_ID",
    envClientSecret: "HUBSPOT_OAUTH_CLIENT_SECRET",
  },
  {
    id: "stripe",
    name: "Stripe",
    authorizeUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    scopes: ["read_only"],
    envClientId: "STRIPE_OAUTH_CLIENT_ID",
    envClientSecret: "STRIPE_OAUTH_CLIENT_SECRET",
    extraAuthParams: { response_type: "code" },
  },
  {
    id: "whoop",
    name: "WHOOP",
    authorizeUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    scopes: ["read:recovery", "read:sleep", "read:workout", "read:cycles", "read:profile"],
    envClientId: "WHOOP_OAUTH_CLIENT_ID",
    envClientSecret: "WHOOP_OAUTH_CLIENT_SECRET",
  },
  {
    id: "fitbit",
    name: "Fitbit",
    authorizeUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    scopes: ["activity", "heartrate", "sleep", "profile"],
    envClientId: "FITBIT_OAUTH_CLIENT_ID",
    envClientSecret: "FITBIT_OAUTH_CLIENT_SECRET",
  },
  {
    id: "trello",
    name: "Trello",
    authorizeUrl: "https://trello.com/1/authorize",
    tokenUrl: "https://trello.com/1/OAuthGetAccessToken",
    scopes: ["read"],
    envClientId: "TRELLO_OAUTH_CLIENT_ID",
    envClientSecret: "TRELLO_OAUTH_CLIENT_SECRET",
    extraAuthParams: { expiration: "never", response_type: "token" },
  },
  {
    id: "discord",
    name: "Discord",
    authorizeUrl: "https://discord.com/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    scopes: ["identify", "guilds", "messages.read"],
    envClientId: "DISCORD_OAUTH_CLIENT_ID",
    envClientSecret: "DISCORD_OAUTH_CLIENT_SECRET",
  },
  {
    id: "zoom",
    name: "Zoom",
    authorizeUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    scopes: ["meeting:read:list_meetings", "recording:read:list_user_recordings"],
    envClientId: "ZOOM_OAUTH_CLIENT_ID",
    envClientSecret: "ZOOM_OAUTH_CLIENT_SECRET",
  },
  {
    id: "dropbox",
    name: "Dropbox",
    authorizeUrl: "https://www.dropbox.com/oauth2/authorize",
    tokenUrl: "https://api.dropboxapi.com/oauth2/token",
    scopes: [],
    envClientId: "DROPBOX_OAUTH_CLIENT_ID",
    envClientSecret: "DROPBOX_OAUTH_CLIENT_SECRET",
    extraAuthParams: { token_access_type: "offline" },
  },
];

const PROVIDER_MAP = new Map(PROVIDERS.map((p) => [p.id, p]));

export function getOAuthProvider(id: string): OAuthProvider | undefined {
  return PROVIDER_MAP.get(id);
}

export function getAllOAuthProviders(): OAuthProvider[] {
  return PROVIDERS;
}

export function isOAuthConfigured(id: string): boolean {
  const p = PROVIDER_MAP.get(id);
  if (!p) return false;
  return !!(process.env[p.envClientId] && process.env[p.envClientSecret]);
}
