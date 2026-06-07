-- Flutter Quest Backend: Activity Path + Quest Upload Edition
-- Run this in Supabase Dashboard > SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  player_name text not null check (char_length(player_name) between 1 and 80),
  student_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration support: older versions used group_name.
-- Re-running this schema on an existing project adds student_id without deleting old data.
alter table public.players add column if not exists student_id text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'players'
      and column_name = 'group_name'
  ) then
    execute $q$
      update public.players
      set student_id = group_name
      where (student_id is null or student_id = '')
        and group_name is not null
    $q$;
  end if;
end $$;

create table if not exists public.tutorial_progress (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  tutorial_id int not null check (tutorial_id between 1 and 8),
  activity_completed boolean not null default false,
  activity_proof_path text,
  activity_proof_url text,
  activity_uploaded_at timestamptz,
  quest_completed boolean not null default false,
  quest_proof_path text,
  quest_proof_url text,
  quest_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (player_id, tutorial_id)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tutorial-proofs','tutorial-proofs',true,5242880,array['image/png','image/jpeg','image/jpg','image/webp','image/gif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;

-- Lecturer-controlled release flags for each tutorial level.
-- Only released levels can be opened by students in the web app.
create table if not exists public.level_releases (
  tutorial_id int primary key check (tutorial_id between 1 and 8),
  release_order int not null unique,
  title text not null,
  is_released boolean not null default false,
  release_label text not null default 'Locked by lecturer',
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.level_releases (tutorial_id, release_order, title, is_released, release_label, released_at)
values
  (1, 1, 'Flutter Setup and First App', true, 'Released', now()),
  (2, 2, 'Widgets, Layout, and Lists', false, 'Locked by lecturer', null),
  (3, 3, 'Stateful Widgets and setState()', false, 'Locked by lecturer', null),
  (4, 4, 'Navigation and Routing in Flutter', false, 'Locked by lecturer', null),
  (5, 5, 'State Management Basics', false, 'Locked by lecturer', null),
  (6, 6, 'Provider and Dependency Injection', false, 'Locked by lecturer', null),
  (7, 7, 'MVVM Architecture in Flutter', false, 'Locked by lecturer', null),
  (8, 8, 'HTTP, JSON, and Backend Integration in Flutter', false, 'Locked by lecturer', null)
on conflict (tutorial_id) do update set
  release_order = excluded.release_order,
  title = excluded.title;

alter table public.level_releases enable row level security;

drop policy if exists "level_releases_select_public" on public.level_releases;
create policy "level_releases_select_public" on public.level_releases for select to anon using (true);

drop trigger if exists set_level_releases_updated_at on public.level_releases;
create trigger set_level_releases_updated_at before update on public.level_releases for each row execute function public.set_updated_at();


drop trigger if exists set_players_updated_at on public.players;
create trigger set_players_updated_at before update on public.players for each row execute function public.set_updated_at();

drop trigger if exists set_tutorial_progress_updated_at on public.tutorial_progress;
create trigger set_tutorial_progress_updated_at before update on public.tutorial_progress for each row execute function public.set_updated_at();


-- Server-side guard: students can only save progress for released levels.
-- This protects tutorial_progress even if someone tries to bypass the page UI.
create or replace function public.ensure_level_is_released()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.level_releases lr
    where lr.tutorial_id = new.tutorial_id
      and lr.is_released = true
  ) then
    raise exception 'Tutorial level % is locked by lecturer', new.tutorial_id;
  end if;

  return new;
end;
$$;

drop trigger if exists ensure_tutorial_progress_level_is_released on public.tutorial_progress;
create trigger ensure_tutorial_progress_level_is_released
before insert or update on public.tutorial_progress
for each row execute function public.ensure_level_is_released();

alter table public.players enable row level security;
alter table public.tutorial_progress enable row level security;

drop policy if exists "players_select_public" on public.players;
create policy "players_select_public" on public.players for select to anon using (true);
drop policy if exists "players_insert_public" on public.players;
create policy "players_insert_public" on public.players for insert to anon with check (true);
drop policy if exists "players_update_public" on public.players;
create policy "players_update_public" on public.players for update to anon using (true) with check (true);

drop policy if exists "tutorial_progress_select_public" on public.tutorial_progress;
create policy "tutorial_progress_select_public" on public.tutorial_progress for select to anon using (true);
drop policy if exists "tutorial_progress_insert_public" on public.tutorial_progress;
create policy "tutorial_progress_insert_public" on public.tutorial_progress for insert to anon with check (true);
drop policy if exists "tutorial_progress_update_public" on public.tutorial_progress;
create policy "tutorial_progress_update_public" on public.tutorial_progress for update to anon using (true) with check (true);

drop policy if exists "tutorial_proofs_select_public" on storage.objects;
create policy "tutorial_proofs_select_public" on storage.objects for select to anon using (bucket_id = 'tutorial-proofs');
drop policy if exists "tutorial_proofs_insert_public" on storage.objects;
create policy "tutorial_proofs_insert_public" on storage.objects for insert to anon with check (bucket_id = 'tutorial-proofs');
drop policy if exists "tutorial_proofs_update_public" on storage.objects;
create policy "tutorial_proofs_update_public" on storage.objects for update to anon using (bucket_id = 'tutorial-proofs') with check (bucket_id = 'tutorial-proofs');

create or replace view public.flutter_quest_leaderboard as
select p.id, p.player_name, coalesce(p.student_id,'Not provided') as student_id,
count(tp.*) filter (where tp.activity_completed = true) as activity_uploads,
count(tp.*) filter (where tp.quest_completed = true) as quest_uploads,
count(tp.*) filter (where tp.activity_completed = true) * 60 + count(tp.*) filter (where tp.quest_completed = true) * 40 as score
from public.players p left join public.tutorial_progress tp on tp.player_id = p.id
group by p.id, p.player_name, p.student_id
order by score desc, quest_uploads desc, activity_uploads desc;
