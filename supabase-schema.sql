-- ============================================================
-- B2OPS — Full Database Schema
-- Run in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── TEAMS ───────────────────────────────────────────────────
create table if not exists teams (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  group_emails text[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ─── USERS ───────────────────────────────────────────────────
create table if not exists users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null,
  avatar_url  text,
  role        text not null default 'agent' check (role in ('admin','manager','agent')),
  team_id     uuid references teams(id),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ─── HUBS ────────────────────────────────────────────────────
create table if not exists hubs (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  email       text not null,
  region      text,
  is_active   boolean not null default true
);

-- ─── CATEGORIES ──────────────────────────────────────────────
create table if not exists categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  team_id     uuid references teams(id) on delete cascade,
  sla_hours   integer not null default 24,
  is_active   boolean not null default true,
  fields      jsonb not null default '[]',
  created_at  timestamptz not null default now()
);

-- ─── REQUESTS ────────────────────────────────────────────────
create table if not exists requests (
  id                uuid primary key default uuid_generate_v4(),
  req_id            text not null unique,
  title             text not null,
  category_id       uuid references categories(id),
  created_by        uuid references users(id),
  status            text not null default 'pending'
                      check (status in ('draft','pending','review_requested','clarification_needed','approved','rejected')),
  priority          text not null default 'medium'
                      check (priority in ('low','medium','high','urgent')),
  due_date          timestamptz,
  hub_id            uuid references hubs(id),
  merchant_name     text not null default '',
  description       text,
  current_version   integer not null default 1,
  email_thread_id   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ─── REQUEST FIELDS ──────────────────────────────────────────
create table if not exists request_fields (
  id              uuid primary key default uuid_generate_v4(),
  request_id      uuid references requests(id) on delete cascade,
  field_key       text not null,
  field_label     text not null,
  current_value   text not null default '',
  proposed_value  text,
  version         integer not null default 1,
  unique(request_id, field_key)
);

-- ─── REQUEST FIELD HISTORY ───────────────────────────────────
create table if not exists request_field_history (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid references requests(id) on delete cascade,
  field_key   text not null,
  field_label text not null,
  old_value   text not null,
  new_value   text not null,
  changed_by  uuid references users(id),
  changed_at  timestamptz not null default now(),
  version     integer not null default 1
);

-- ─── COMMENTS ────────────────────────────────────────────────
create table if not exists comments (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid references requests(id) on delete cascade,
  user_id     uuid references users(id),
  message     text not null,
  parent_id   uuid references comments(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── AUDIT LOGS ──────────────────────────────────────────────
create table if not exists audit_logs (
  id            uuid primary key default uuid_generate_v4(),
  request_id    uuid references requests(id) on delete cascade,
  action        text not null,
  performed_by  uuid references users(id),
  old_state     jsonb,
  new_state     jsonb,
  metadata      jsonb,
  timestamp     timestamptz not null default now()
);

-- ─── NOTIFICATIONS ───────────────────────────────────────────
create table if not exists notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references users(id) on delete cascade,
  request_id  uuid references requests(id) on delete cascade,
  type        text not null,
  message     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- ─── EMAIL THREADS ───────────────────────────────────────────
create table if not exists email_threads (
  id              uuid primary key default uuid_generate_v4(),
  request_id      uuid references requests(id) on delete cascade unique,
  thread_id       text,
  last_message_id text,
  updated_at      timestamptz not null default now()
);

-- ─── SAVED FILTERS ───────────────────────────────────────────
create table if not exists saved_filters (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references users(id) on delete cascade,
  name          text not null,
  filter_config jsonb not null,
  created_at    timestamptz not null default now()
);

-- ─── ANNOUNCEMENTS ───────────────────────────────────────────
create table if not exists announcements (
  id          uuid primary key default uuid_generate_v4(),
  message     text not null,
  is_active   boolean not null default true,
  created_by  uuid references users(id),
  created_at  timestamptz not null default now()
);

-- ─── READ RECEIPTS ───────────────────────────────────────────
create table if not exists read_receipts (
  id          uuid primary key default uuid_generate_v4(),
  request_id  uuid references requests(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  viewed_at   timestamptz not null default now(),
  unique(request_id, user_id)
);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger requests_updated_at before update on requests
  for each row execute function update_updated_at();

-- ─── AUTO-CREATE USER ON SIGNUP ──────────────────────────────
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
alter table users enable row level security;
alter table teams enable row level security;
alter table hubs enable row level security;
alter table categories enable row level security;
alter table requests enable row level security;
alter table request_fields enable row level security;
alter table request_field_history enable row level security;
alter table comments enable row level security;
alter table audit_logs enable row level security;
alter table notifications enable row level security;
alter table email_threads enable row level security;
alter table saved_filters enable row level security;
alter table announcements enable row level security;
alter table read_receipts enable row level security;

-- Users: authenticated users can read all, only update their own
create policy "Users readable by authenticated" on users for select to authenticated using (true);
create policy "Users updatable by self" on users for update to authenticated using (auth.uid() = id);
create policy "Admin can manage users" on users for all to authenticated
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- Teams: all authenticated can read
create policy "Teams readable by authenticated" on teams for select to authenticated using (true);
create policy "Admin can manage teams" on teams for all to authenticated
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- Hubs: all authenticated can read
create policy "Hubs readable by authenticated" on hubs for select to authenticated using (true);
create policy "Admin can manage hubs" on hubs for all to authenticated
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- Categories: all authenticated can read
create policy "Categories readable by authenticated" on categories for select to authenticated using (true);
create policy "Admin can manage categories" on categories for all to authenticated
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));

-- Requests: authenticated users can read all, create own, update based on role
create policy "Requests readable by authenticated" on requests for select to authenticated using (true);
create policy "Requests insertable by authenticated" on requests for insert to authenticated with check (auth.uid() = created_by);
create policy "Requests updatable by authenticated" on requests for update to authenticated using (true);

-- Request fields
create policy "Request fields readable" on request_fields for select to authenticated using (true);
create policy "Request fields manageable" on request_fields for all to authenticated using (true);

-- Field history
create policy "Field history readable" on request_field_history for select to authenticated using (true);
create policy "Field history insertable" on request_field_history for insert to authenticated with check (true);

-- Comments
create policy "Comments readable" on comments for select to authenticated using (true);
create policy "Comments insertable by authenticated" on comments for insert to authenticated with check (auth.uid() = user_id);
create policy "Comments updatable by author" on comments for update to authenticated using (auth.uid() = user_id);

-- Audit logs
create policy "Audit logs readable" on audit_logs for select to authenticated using (true);
create policy "Audit logs insertable" on audit_logs for insert to authenticated with check (true);

-- Notifications: users see their own
create policy "Notifications: own only" on notifications for select to authenticated using (auth.uid() = user_id);
create policy "Notifications insertable" on notifications for insert to authenticated with check (true);
create policy "Notifications updatable by owner" on notifications for update to authenticated using (auth.uid() = user_id);

-- Others
create policy "Email threads readable" on email_threads for select to authenticated using (true);
create policy "Email threads manageable" on email_threads for all to authenticated using (true);
create policy "Saved filters: own only" on saved_filters for all to authenticated using (auth.uid() = user_id);
create policy "Announcements readable" on announcements for select to authenticated using (true);
create policy "Admin can manage announcements" on announcements for all to authenticated
  using (exists (select 1 from users where id = auth.uid() and role = 'admin'));
create policy "Read receipts manageable" on read_receipts for all to authenticated using (auth.uid() = user_id);

-- ─── REALTIME ────────────────────────────────────────────────
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table comments;

-- ─── SEED DATA ───────────────────────────────────────────────
insert into teams (name, group_emails) values
  ('Business Team', ARRAY['business@company.com']),
  ('Ops Team', ARRAY['ops@company.com', 'sonargaon.courierops@pathao.com'])
on conflict do nothing;

insert into hubs (name, email, region) values
  ('Sonargaon Hub', 'sonargaon.courierops@pathao.com', 'Dhaka'),
  ('Chittagong Hub', 'ctg.hub@company.com', 'Chittagong'),
  ('Sylhet Hub', 'sylhet.hub@company.com', 'Sylhet'),
  ('Rajshahi Hub', 'raj.hub@company.com', 'Rajshahi')
on conflict do nothing;
