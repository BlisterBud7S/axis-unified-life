create table if not exists public.user_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connector_id text not null,
  api_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, connector_id)
);

alter table public.user_connections enable row level security;

create policy "Users can read own connections"
  on public.user_connections for select
  using (auth.uid() = user_id);

create policy "Users can insert own connections"
  on public.user_connections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own connections"
  on public.user_connections for update
  using (auth.uid() = user_id);

create policy "Users can delete own connections"
  on public.user_connections for delete
  using (auth.uid() = user_id);
