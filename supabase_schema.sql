-- Run this in your Supabase SQL editor to set up the database schema.

-- Teams table
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  division text not null,
  created_at timestamptz default now()
);

-- Players table
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null,
  name text not null,
  jersey_number integer not null,
  positions text[] not null default '{}',
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.teams enable row level security;
alter table public.players enable row level security;

-- Teams RLS policies: coaches can only see/edit their own teams
create policy "Users can view their own teams"
  on public.teams for select
  using (auth.uid() = user_id);

create policy "Users can insert their own teams"
  on public.teams for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own teams"
  on public.teams for update
  using (auth.uid() = user_id);

create policy "Users can delete their own teams"
  on public.teams for delete
  using (auth.uid() = user_id);

-- Players RLS policies: coaches can manage players on their teams
create policy "Users can view players on their teams"
  on public.players for select
  using (
    exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.user_id = auth.uid()
    )
  );

create policy "Users can insert players on their teams"
  on public.players for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.user_id = auth.uid()
    )
  );

create policy "Users can update players on their teams"
  on public.players for update
  using (
    exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.user_id = auth.uid()
    )
  );

create policy "Users can delete players on their teams"
  on public.players for delete
  using (
    exists (
      select 1 from public.teams
      where teams.id = players.team_id
        and teams.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Lineups table (Game Day – one active lineup per team)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.lineups (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade not null unique,
  -- Quarter-based game day (v2)
  formation_id        text,
  quarter_plans       jsonb    not null default '{"1":{},"2":{},"3":{},"4":{}}',
  quarter_roster      jsonb    not null default '{"1":[],"2":[],"3":[],"4":[]}',
  current_quarter     smallint not null default 1,
  completed_quarters  jsonb    not null default '[]',
  game_started        boolean  not null default false,
  absent_players      jsonb    not null default '[]',
  -- Legacy columns (kept for existing rows, no longer written)
  slots            jsonb    not null default '{}',
  player_time      jsonb    not null default '{}',
  half             smallint not null default 1,
  game_elapsed_sec integer  not null default 0,
  sub_queue        jsonb    not null default '[]',
  updated_at       timestamptz default now()
);

-- ── Add new lineups columns if table already exists (run in Supabase SQL editor) ──
-- alter table public.lineups
--   add column if not exists formation_id    text,
--   add column if not exists quarter_plans   jsonb not null default '{"1":{},"2":{},"3":{},"4":{}}',
--   add column if not exists quarter_roster  jsonb not null default '{"1":[],"2":[],"3":[],"4":[]}',
--   add column if not exists current_quarter smallint not null default 1,
--   add column if not exists completed_quarters jsonb not null default '[]',
--   add column if not exists game_started      boolean not null default false,
--   add column if not exists absent_players    jsonb not null default '[]';

alter table public.lineups enable row level security;

create policy "Users can view their lineup"
  on public.lineups for select
  using (
    exists (
      select 1 from public.teams
      where teams.id = lineups.team_id
        and teams.user_id = auth.uid()
    )
  );

create policy "Users can upsert their lineup"
  on public.lineups for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = lineups.team_id
        and teams.user_id = auth.uid()
    )
  );

create policy "Users can update their lineup"
  on public.lineups for update
  using (
    exists (
      select 1 from public.teams
      where teams.id = lineups.team_id
        and teams.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────
-- Drill links (Practice screen — external URLs per drill in a plan)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.drill_links (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  team_id    uuid references public.teams(id) on delete cascade,
  drill_name text not null,   -- drill display name (matches practice_plan_drills.drill_name)
  url        text not null,
  label      text not null default '',
  created_at timestamptz default now()
);

-- ── If table already exists, run these in Supabase SQL editor ──
-- alter table public.drill_links
--   add column if not exists team_id    uuid references public.teams(id) on delete cascade,
--   add column if not exists drill_name text;
-- ── (The old drill_id and user_id not null columns can be kept as nullable legacy) ──

alter table public.drill_links enable row level security;

create policy "Users can view their own drill links"
  on public.drill_links for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.teams
      where teams.id = drill_links.team_id and teams.user_id = auth.uid()
    )
  );

create policy "Users can insert their own drill links"
  on public.drill_links for insert
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.teams
      where teams.id = drill_links.team_id and teams.user_id = auth.uid()
    )
  );

create policy "Users can delete their own drill links"
  on public.drill_links for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.teams
      where teams.id = drill_links.team_id and teams.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- Saved game plans — each plan is a full game state (tab)
-- One team can have multiple plans; active plan tracked in localStorage.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.saved_game_plans (
  id                  uuid primary key default gen_random_uuid(),
  team_id             uuid references public.teams(id) on delete cascade not null,
  name                text not null,
  formation_id        text,
  -- Full slot-based assignments per quarter (single source of truth)
  quarter_plans       jsonb    not null default '{"1":{},"2":{},"3":{},"4":{}}',
  -- Live game state stored per plan
  current_quarter     smallint not null default 1,
  completed_quarters  jsonb    not null default '[]',
  game_started        boolean  not null default false,
  absent_players      jsonb    not null default '[]',
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ── If table already exists, run these in Supabase SQL editor ──
-- alter table public.saved_game_plans
--   add column if not exists quarter_plans      jsonb not null default '{"1":{},"2":{},"3":{},"4":{}}',
--   add column if not exists current_quarter    smallint not null default 1,
--   add column if not exists completed_quarters jsonb not null default '[]',
--   add column if not exists game_started       boolean not null default false,
--   add column if not exists absent_players     jsonb not null default '[]',
--   add column if not exists updated_at         timestamptz default now();

alter table public.saved_game_plans enable row level security;

-- Also need an UPDATE policy (plans are auto-saved on every change)
create policy "Users can view their saved game plans"
  on public.saved_game_plans for select
  using (
    exists (
      select 1 from public.teams
      where teams.id = saved_game_plans.team_id
        and teams.user_id = auth.uid()
    )
  );

create policy "Users can insert their saved game plans"
  on public.saved_game_plans for insert
  with check (
    exists (
      select 1 from public.teams
      where teams.id = saved_game_plans.team_id
        and teams.user_id = auth.uid()
    )
  );

create policy "Users can update their saved game plans"
  on public.saved_game_plans for update
  using (
    exists (
      select 1 from public.teams
      where teams.id = saved_game_plans.team_id
        and teams.user_id = auth.uid()
    )
  );

create policy "Users can delete their saved game plans"
  on public.saved_game_plans for delete
  using (
    exists (
      select 1 from public.teams
      where teams.id = saved_game_plans.team_id
        and teams.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- Practice plans — each plan is a named tab in the Practice screen
-- ─────────────────────────────────────────────────────────────
create table if not exists public.practice_plans (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid references public.teams(id) on delete cascade not null,
  name       text not null,
  created_at timestamptz default now()
);

alter table public.practice_plans enable row level security;

create policy "Users can manage their practice plans"
  on public.practice_plans for all
  using (
    exists (
      select 1 from public.teams
      where teams.id = practice_plans.team_id
        and teams.user_id = auth.uid()
    )
  );


-- ─────────────────────────────────────────────────────────────
-- Practice plan drills — ordered drills inside each practice plan
-- ─────────────────────────────────────────────────────────────
create table if not exists public.practice_plan_drills (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid references public.practice_plans(id) on delete cascade not null,
  drill_name        text not null,
  drill_description text,
  skill_category    text,
  duration_minutes  integer not null default 10,
  sort_order        integer not null default 0,
  is_custom         boolean not null default false,
  created_at        timestamptz default now()
);

alter table public.practice_plan_drills enable row level security;

create policy "Users can manage their practice drills"
  on public.practice_plan_drills for all
  using (
    exists (
      select 1 from public.practice_plans
      join public.teams on teams.id = practice_plans.team_id
      where practice_plans.id = practice_plan_drills.plan_id
        and teams.user_id = auth.uid()
    )
  );
