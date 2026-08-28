export type ConnectorDef = {
  id: string;
  name: string;
  group: "Google" | "Microsoft" | "Work" | "Data" | "Health";
  blurb: string;
};

/** Every App User Connector AXIS can offer. Each one needs its own OAuth client
 *  configured once at the workspace level before users can connect their account. */
export const CONNECTORS: ConnectorDef[] = [
  { id: "google_mail", name: "Gmail", group: "Google", blurb: "Pull key emails into AXIS chats and tasks." },
  { id: "google_calendar", name: "Google Calendar", group: "Google", blurb: "Two-way view of your events next to AXIS tasks." },
  { id: "google_drive", name: "Google Drive", group: "Google", blurb: "Let AXIS read your files for context." },
  { id: "google_docs", name: "Google Docs", group: "Google", blurb: "Summarise and draft inside your own docs." },
  { id: "google_sheets", name: "Google Sheets", group: "Google", blurb: "Import budgets and logs from your sheets." },
  { id: "google_slides", name: "Google Slides", group: "Google", blurb: "Turn AXIS plans into slide decks." },
  { id: "microsoft_outlook", name: "Outlook", group: "Microsoft", blurb: "Mail and calendar context from Outlook." },
  { id: "microsoft_onedrive", name: "OneDrive", group: "Microsoft", blurb: "Read files stored in your OneDrive." },
  { id: "microsoft_word", name: "Word", group: "Microsoft", blurb: "Work with your Word documents." },
  { id: "microsoft_excel", name: "Excel", group: "Microsoft", blurb: "Import workbook data into Finance." },
  { id: "microsoft_powerpoint", name: "PowerPoint", group: "Microsoft", blurb: "Generate and edit presentations." },
  { id: "microsoft_onenote", name: "OneNote", group: "Microsoft", blurb: "Bring notebook notes into AXIS." },
  { id: "microsoft_teams", name: "Teams", group: "Microsoft", blurb: "Surface messages and meetings." },
  { id: "microsoft_sharepoint", name: "SharePoint", group: "Microsoft", blurb: "Read shared site documents." },
  { id: "github", name: "GitHub", group: "Work", blurb: "Issues and pull requests in AXIS Code." },
  { id: "gitlab", name: "GitLab", group: "Work", blurb: "Projects, issues and merge requests." },
  { id: "linear", name: "Linear", group: "Work", blurb: "Sync Linear issues with AXIS tasks." },
  { id: "notion", name: "Notion", group: "Work", blurb: "Read pages and databases for context." },
  { id: "slack", name: "Slack", group: "Work", blurb: "Pull channel context and send updates." },
  { id: "hubspot", name: "HubSpot", group: "Work", blurb: "Contacts, companies and deals." },
  { id: "salesforce", name: "Salesforce", group: "Work", blurb: "Your Salesforce org records." },
  { id: "workday", name: "Workday", group: "Work", blurb: "HR and time-off data." },
  { id: "bigquery", name: "BigQuery", group: "Data", blurb: "Query your own BigQuery datasets." },
  { id: "snowflake", name: "Snowflake", group: "Data", blurb: "Query your Snowflake warehouse." },
  { id: "databricks", name: "Databricks", group: "Data", blurb: "Lakehouse tables and jobs." },
  { id: "redshift", name: "Amazon Redshift", group: "Data", blurb: "Query Redshift with your identity." },
  { id: "fabric", name: "Microsoft Fabric", group: "Data", blurb: "Fabric data and GraphQL endpoints." },
  { id: "oura", name: "Oura", group: "Health", blurb: "Sleep, readiness and activity into Health." },
];

export const CONNECTOR_GROUPS: ConnectorDef["group"][] = [
  "Google",
  "Microsoft",
  "Work",
  "Data",
  "Health",
];
