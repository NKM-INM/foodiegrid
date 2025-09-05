
-- SCHEMA Supabase - QR / Anecdotes / Points (Option Hybride)
-- Encodage: UTF-8

create extension if not exists pgcrypto;

create table if not exists users (
  user_id uuid primary key default gen_random_uuid(),
  email text unique not null,
  display_name text,
  created_at timestamptz default now(),
  points int default 0,
  status text default 'active'
);

create table if not exists anecdotes (
  anecdote_id uuid primary key default gen_random_uuid(),
  text text not null,
  category text,
  progression int,
  is_active boolean default true
);

create table if not exists qr_codes (
  qr_id uuid primary key default gen_random_uuid(),
  product_sku text,
  assigned_to_user_id uuid references users(user_id),
  anecdote_id uuid references anecdotes(anecdote_id),
  status text default 'new',
  created_at timestamptz default now(),
  expires_at timestamptz
);

create table if not exists read_events (
  read_id uuid primary key default gen_random_uuid(),
  user_id uuid references users(user_id),
  qr_id uuid references qr_codes(qr_id),
  anecdote_id uuid references anecdotes(anecdote_id),
  read_at timestamptz default now(),
  validated boolean default true,
  points_awarded int default 0,
  unique(user_id, qr_id)
);

create table if not exists rewards (
  reward_id uuid primary key default gen_random_uuid(),
  user_id uuid references users(user_id),
  source text,
  ref_id uuid,
  points int,
  created_at timestamptz default now()
);

create index if not exists idx_read_events_user on read_events(user_id);
create index if not exists idx_read_events_qr on read_events(qr_id);
create index if not exists idx_rewards_user on rewards(user_id);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into users (user_id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', ''))
  on conflict (email) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure handle_new_user();

alter table read_events enable row level security;
alter table rewards enable row level security;
alter table users enable row level security;

drop policy if exists "Users select self" on users;
create policy "Users select self"
on users for select
using (auth.uid() = user_id);

drop policy if exists "Users update self points" on users;
create policy "Users update self points"
on users for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "See own read_events" on read_events;
create policy "See own read_events"
on read_events for select
using (auth.uid() = user_id);

drop policy if exists "Insert own read_events" on read_events;
create policy "Insert own read_events"
on read_events for insert
with check (auth.uid() = user_id);

drop policy if exists "See own rewards" on rewards;
create policy "See own rewards"
on rewards for select
using (auth.uid() = user_id);

drop policy if exists "Insert own rewards" on rewards;
create policy "Insert own rewards"
on rewards for insert
with check (auth.uid() = user_id);

create or replace view user_points as
select u.user_id, u.email, coalesce(sum(r.points), 0)::int as total_points
from users u
left join rewards r on r.user_id = u.user_id
group by u.user_id, u.email;

create or replace function credit_points_for_read(_read_id uuid, _points int)
returns void as $$
begin
  insert into rewards (user_id, source, ref_id, points)
  select re.user_id, 'read_anecdote', _read_id, _points
  from read_events re
  where re.read_id = _read_id
  on conflict do nothing;

  update users u
  set points = (select coalesce(sum(points),0) from rewards where user_id = u.user_id)
  where u.user_id in (select user_id from read_events where read_id = _read_id);
end;
$$ language plpgsql;

create or replace function on_read_event_insert()
returns trigger as $$
begin
  if new.validated is true and new.points_awarded > 0 then
    perform credit_points_for_read(new.read_id, new.points_awarded);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists t_read_event_insert on read_events;
create trigger t_read_event_insert
after insert on read_events
for each row execute procedure on_read_event_insert();
