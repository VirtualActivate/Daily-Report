-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query)
-- after creating your Supabase project. This creates all tables this app needs.

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null default 'PRJ',
  created_at timestamptz not null default now()
);

create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  site_area text not null default '-',
  level text not null default '-',
  zone text not null default '-',
  space_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists foremen (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trades text[] not null default '{}',
  project_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists subcontractors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trades text[] not null default '{}',
  project_ids uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  entry_date date not null,
  company_type text not null,
  company_id text,
  company_name text not null,
  foreman_name text not null default '',
  trade text not null,
  space_id uuid not null references spaces(id) on delete cascade,
  space_label text not null,
  stage text not null,
  manpower integer not null default 0,
  completed text not null default 'No',
  activity text not null default '',
  remarks text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_spaces_project on spaces(project_id);
create index if not exists idx_entries_project on entries(project_id);
create index if not exists idx_entries_date on entries(entry_date);
create index if not exists idx_entries_space on entries(space_id);

-- Row Level Security: disabled for this internal tool since access is controlled
-- by keeping the URL private (no login), per your setup. If you later add auth,
-- enable RLS and add policies here.
alter table projects disable row level security;
alter table spaces disable row level security;
alter table foremen disable row level security;
alter table subcontractors disable row level security;
alter table entries disable row level security;

-- Seed data: your 4 projects and Mirdif's subcontractor list, so the app
-- has the same starting point as the prototype you tested.
insert into projects (name, code) values
  ('Mirdif Al Asayel Avenue', 'MIRDIF'),
  ('RAK Danah Bay - Hotel Tower', 'DANAH-HOTEL'),
  ('RAK Danah Bay - Residential Tower', 'DANAH-RES'),
  ('Jebel Ali Village', 'JAV')
on conflict do nothing;

insert into subcontractors (name, trades, project_ids)
select 'GECO', array['Fire'], array[id] from projects where code = 'MIRDIF'
union all
select 'Zunaid', array['Plumbing'], array[id] from projects where code = 'MIRDIF'
union all
select 'Al Asas', array['Plumbing','Electrical'], array[id] from projects where code = 'MIRDIF'
union all
select 'Tangasi', array['Plumbing','Electrical'], array[id] from projects where code = 'MIRDIF'
union all
select 'Voltek', array['Electrical'], array[id] from projects where code = 'MIRDIF'
union all
select 'Union Metal', array['Chilled Water'], array[id] from projects where code = 'MIRDIF'
union all
select 'Dar Al Hayat', array['Duct'], array[id] from projects where code = 'MIRDIF'
union all
select 'RealAst', array['Electrical'], array[id] from projects where code = 'MIRDIF'
union all
select 'RAM Technical', array['Electrical'], array[id] from projects where code = 'MIRDIF'
union all
select 'Kul Al Waqt', array['Ducting'], array[id] from projects where code = 'MIRDIF';
