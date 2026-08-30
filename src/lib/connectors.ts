export type ConnectorDef = {
  id: string;
  name: string;
  group: "Google" | "Microsoft" | "Work" | "Data" | "Health" | "AI";
  blurb: string;
  authType: "oauth" | "api_key";
  keyPlaceholder?: string;
  keyHelpUrl?: string;
};

export const CONNECTORS: ConnectorDef[] = [
  { id: "google_mail", name: "Gmail", group: "Google", blurb: "Pull key emails into AXIS chats and tasks.", authType: "oauth" },
  { id: "google_calendar", name: "Google Calendar", group: "Google", blurb: "Two-way view of your events next to AXIS tasks.", authType: "oauth" },
  { id: "google_drive", name: "Google Drive", group: "Google", blurb: "Let AXIS read your files for context.", authType: "oauth" },
  { id: "google_docs", name: "Google Docs", group: "Google", blurb: "Summarise and draft inside your own docs.", authType: "oauth" },
  { id: "google_sheets", name: "Google Sheets", group: "Google", blurb: "Import budgets and logs from your sheets.", authType: "oauth" },
  { id: "google_slides", name: "Google Slides", group: "Google", blurb: "Turn AXIS plans into slide decks.", authType: "oauth" },
  { id: "microsoft_outlook", name: "Outlook", group: "Microsoft", blurb: "Mail and calendar context from Outlook.", authType: "oauth" },
  { id: "microsoft_onedrive", name: "OneDrive", group: "Microsoft", blurb: "Read files stored in your OneDrive.", authType: "oauth" },
  { id: "microsoft_word", name: "Word", group: "Microsoft", blurb: "Work with your Word documents.", authType: "oauth" },
  { id: "microsoft_excel", name: "Excel", group: "Microsoft", blurb: "Import workbook data into Finance.", authType: "oauth" },
  { id: "microsoft_powerpoint", name: "PowerPoint", group: "Microsoft", blurb: "Generate and edit presentations.", authType: "oauth" },
  { id: "microsoft_onenote", name: "OneNote", group: "Microsoft", blurb: "Bring notebook notes into AXIS.", authType: "oauth" },
  { id: "microsoft_teams", name: "Teams", group: "Microsoft", blurb: "Surface messages and meetings.", authType: "oauth" },
  { id: "microsoft_sharepoint", name: "SharePoint", group: "Microsoft", blurb: "Read shared site documents.", authType: "oauth" },
  { id: "github", name: "GitHub", group: "Work", blurb: "Issues and pull requests in AXIS Code.", authType: "oauth" },
  { id: "gitlab", name: "GitLab", group: "Work", blurb: "Projects, issues and merge requests.", authType: "oauth" },
  { id: "linear", name: "Linear", group: "Work", blurb: "Sync Linear issues with AXIS tasks.", authType: "oauth" },
  { id: "notion", name: "Notion", group: "Work", blurb: "Read pages and databases for context.", authType: "oauth" },
  { id: "slack", name: "Slack", group: "Work", blurb: "Pull channel context and send updates.", authType: "oauth" },
  { id: "hubspot", name: "HubSpot", group: "Work", blurb: "Contacts, companies and deals.", authType: "oauth" },
  { id: "salesforce", name: "Salesforce", group: "Work", blurb: "Your Salesforce org records.", authType: "oauth" },
  { id: "workday", name: "Workday", group: "Work", blurb: "HR and time-off data.", authType: "oauth" },
  { id: "bigquery", name: "BigQuery", group: "Data", blurb: "Query your own BigQuery datasets.", authType: "api_key", keyPlaceholder: "BigQuery service account JSON or API key", keyHelpUrl: "https://cloud.google.com/bigquery/docs/authentication" },
  { id: "snowflake", name: "Snowflake", group: "Data", blurb: "Query your Snowflake warehouse.", authType: "api_key", keyPlaceholder: "Snowflake connection string", keyHelpUrl: "https://docs.snowflake.com/en/developer-guide/sql-api/authenticating" },
  { id: "databricks", name: "Databricks", group: "Data", blurb: "Lakehouse tables and jobs.", authType: "api_key", keyPlaceholder: "Databricks personal access token", keyHelpUrl: "https://docs.databricks.com/en/dev-tools/auth/pat.html" },
  { id: "redshift", name: "Amazon Redshift", group: "Data", blurb: "Query Redshift with your identity.", authType: "api_key", keyPlaceholder: "Redshift connection string", keyHelpUrl: "https://docs.aws.amazon.com/redshift/latest/mgmt/connecting-ssl-support.html" },
  { id: "fabric", name: "Microsoft Fabric", group: "Data", blurb: "Fabric data and GraphQL endpoints.", authType: "oauth" },
  { id: "oura", name: "Oura", group: "Health", blurb: "Sleep, readiness and activity into Health.", authType: "api_key", keyPlaceholder: "Oura personal access token", keyHelpUrl: "https://cloud.ouraring.com/personal-access-tokens" },
  { id: "whoop", name: "WHOOP", group: "Health", blurb: "Strain, recovery and sleep from your WHOOP band.", authType: "oauth" },
  { id: "fitbit", name: "Fitbit", group: "Health", blurb: "Steps, sleep and heart rate from your Fitbit.", authType: "oauth" },
  { id: "apple_health", name: "Apple Health", group: "Health", blurb: "Workouts, steps and vitals from HealthKit.", authType: "oauth" },
  { id: "claude", name: "Claude", group: "AI", blurb: "Import Claude conversations and use Anthropic models.", authType: "api_key", keyPlaceholder: "sk-ant-...", keyHelpUrl: "https://console.anthropic.com/settings/keys" },
  { id: "chatgpt", name: "ChatGPT", group: "AI", blurb: "Import ChatGPT conversations and history.", authType: "api_key", keyPlaceholder: "sk-...", keyHelpUrl: "https://platform.openai.com/api-keys" },
  { id: "gemini", name: "Google AI (Gemini)", group: "AI", blurb: "Powers all AXIS Signature models. Get a free key at aistudio.google.com/apikey", authType: "api_key", keyPlaceholder: "AIza...", keyHelpUrl: "https://aistudio.google.com/apikey" },
  { id: "perplexity", name: "Perplexity", group: "AI", blurb: "Bring Perplexity research into AXIS context.", authType: "api_key", keyPlaceholder: "pplx-...", keyHelpUrl: "https://docs.perplexity.ai/guides/getting-started" },
  { id: "openai_api", name: "OpenAI API", group: "AI", blurb: "Use your own OpenAI API key for direct access.", authType: "api_key", keyPlaceholder: "sk-...", keyHelpUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic_api", name: "Anthropic API", group: "AI", blurb: "Use your own Anthropic API key for Claude models.", authType: "api_key", keyPlaceholder: "sk-ant-...", keyHelpUrl: "https://console.anthropic.com/settings/keys" },
];

export const CONNECTOR_GROUPS: ConnectorDef["group"][] = [
  "Google",
  "Microsoft",
  "Work",
  "Data",
  "Health",
  "AI",
];

export const API_KEY_CONNECTORS = CONNECTORS.filter((c) => c.authType === "api_key");

export const AI_KEY_CONNECTOR_MAP: Record<string, string> = {
  openai_api: "openai",
  anthropic_api: "anthropic",
  claude: "anthropic",
  chatgpt: "openai",
  gemini: "google",
};
