-- Add OAuth token columns to user_connections
alter table public.user_connections
  add column if not exists access_token text,
  add column if not exists refresh_token text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists oauth_provider text,
  add column if not exists oauth_metadata jsonb default '{}'::jsonb;

-- Make api_key nullable so OAuth connections don't need a dummy value
alter table public.user_connections
  alter column api_key drop not null;

-- Table to store OAuth state parameters during the flow
create table if not exists public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  connector_id text not null,
  state text not null unique,
  code_verifier text,
  redirect_uri text not null,
  created_at timestamptz not null default now()
);

-- Auto-cleanup expired states (older than 10 minutes)
create index if not exists idx_oauth_states_created on public.oauth_states(created_at);

alter table public.oauth_states enable row level security;

create policy "Users manage own oauth states"
  on public.oauth_states for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
