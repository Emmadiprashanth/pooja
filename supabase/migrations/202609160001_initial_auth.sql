create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  gotram text not null default '',
  locale text not null default 'en',
  city text not null default '',
  country_code text not null default 'IN',
  timezone text not null default 'Asia/Kolkata',
  latitude double precision,
  longitude double precision,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive', 'trialing', 'active', 'past_due', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) > 0),
  gotram text not null default '',
  relationship text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists family_members_user_id_idx
  on public.family_members(user_id, display_order);

alter table public.profiles enable row level security;
alter table public.family_members enable row level security;

drop policy if exists "Users can read their profile" on public.profiles;
create policy "Users can read their profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update their profile" on public.profiles;
create policy "Users can update their profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "Users can insert their profile" on public.profiles;
create policy "Users can insert their profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users can read their family" on public.family_members;
create policy "Users can read their family"
  on public.family_members for select
  using (auth.uid() = user_id);

drop policy if exists "Users can add family" on public.family_members;
create policy "Users can add family"
  on public.family_members for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their family" on public.family_members;
create policy "Users can update their family"
  on public.family_members for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their family" on public.family_members;
create policy "Users can delete their family"
  on public.family_members for delete
  using (auth.uid() = user_id);

create or replace function public.replace_family_members(member_names text[])
returns void
language plpgsql
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.family_members where user_id = current_user_id;

  insert into public.family_members (user_id, full_name, display_order)
  select current_user_id, trim(member_name), member_order - 1
  from unnest(member_names) with ordinality as members(member_name, member_order)
  where char_length(trim(member_name)) > 0;
end;
$$;

revoke all on function public.replace_family_members(text[]) from public;
grant execute on function public.replace_family_members(text[]) to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists family_members_set_updated_at on public.family_members;
create trigger family_members_set_updated_at
before update on public.family_members
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, gotram)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'gotram', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
