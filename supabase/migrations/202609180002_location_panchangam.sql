create table if not exists public.panchangam_days (
  id uuid primary key default gen_random_uuid(),
  calendar_date date not null,
  location_scope text not null default 'global'
    check (location_scope in ('global', 'country', 'timezone', 'city')),
  country_code text,
  timezone text,
  city text,
  telugu_month text not null default '',
  paksham text not null default '',
  tithi text not null default '',
  nakshatram text not null default '',
  yogam text not null default '',
  karanam text not null default '',
  festival_name text not null default '',
  festival_pooja_slug text,
  notes text not null default '',
  source_name text not null default '',
  source_url text,
  is_published boolean not null default false,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists panchangam_days_scope_idx
  on public.panchangam_days (
    calendar_date,
    location_scope,
    coalesce(country_code, ''),
    coalesce(timezone, ''),
    coalesce(lower(city), '')
  );

create index if not exists panchangam_days_public_idx
  on public.panchangam_days(calendar_date, is_published, reviewed_at);

alter table public.panchangam_days enable row level security;

drop policy if exists "Reviewed Panchangam is readable" on public.panchangam_days;
create policy "Reviewed Panchangam is readable"
  on public.panchangam_days for select
  using (
    public.is_app_admin()
    or (is_published and reviewed_at is not null)
  );

drop policy if exists "Admins can insert Panchangam" on public.panchangam_days;
create policy "Admins can insert Panchangam"
  on public.panchangam_days for insert
  with check (public.is_app_admin());

drop policy if exists "Admins can update Panchangam" on public.panchangam_days;
create policy "Admins can update Panchangam"
  on public.panchangam_days for update
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "Admins can delete Panchangam" on public.panchangam_days;
create policy "Admins can delete Panchangam"
  on public.panchangam_days for delete
  using (public.is_app_admin());

drop trigger if exists panchangam_days_set_updated_at on public.panchangam_days;
create trigger panchangam_days_set_updated_at
before update on public.panchangam_days
for each row execute function public.set_updated_at();
