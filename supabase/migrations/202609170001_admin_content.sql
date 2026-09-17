create table if not exists public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_admins enable row level security;

create or replace function public.is_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.app_admins where user_id = auth.uid()
  );
$$;

revoke all on function public.is_app_admin() from public;
grant execute on function public.is_app_admin() to authenticated;

drop policy if exists "Admins can confirm their access" on public.app_admins;
create policy "Admins can confirm their access"
  on public.app_admins for select
  using (user_id = auth.uid());

create table if not exists public.poojas (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  category text not null check (category in ('daily', 'day_wise', 'festival', 'special')),
  weekday text check (weekday is null or weekday in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
  language text not null default 'Telugu',
  description text not null default '',
  deity_name text not null default '',
  image_path text,
  audio_path text,
  visibility_starts_at timestamptz,
  visibility_ends_at timestamptz,
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (visibility_ends_at is null or visibility_starts_at is null or visibility_ends_at > visibility_starts_at)
);

create index if not exists poojas_public_listing_idx
  on public.poojas(is_published, category, visibility_starts_at, visibility_ends_at);

create table if not exists public.pooja_samagri (
  id uuid primary key default gen_random_uuid(),
  pooja_id uuid not null references public.poojas(id) on delete cascade,
  item_name text not null check (char_length(trim(item_name)) > 0),
  group_name text not null default 'Samagri',
  image_path text,
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists pooja_samagri_pooja_idx
  on public.pooja_samagri(pooja_id, display_order);

alter table public.poojas enable row level security;
alter table public.pooja_samagri enable row level security;

drop policy if exists "Published Poojas are readable" on public.poojas;
create policy "Published Poojas are readable"
  on public.poojas for select
  using (
    public.is_app_admin()
    or (
      is_published
      and (visibility_starts_at is null or visibility_starts_at <= now())
      and (visibility_ends_at is null or visibility_ends_at >= now())
    )
  );

drop policy if exists "Admins can insert Poojas" on public.poojas;
create policy "Admins can insert Poojas"
  on public.poojas for insert
  with check (public.is_app_admin());

drop policy if exists "Admins can update Poojas" on public.poojas;
create policy "Admins can update Poojas"
  on public.poojas for update
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "Admins can delete Poojas" on public.poojas;
create policy "Admins can delete Poojas"
  on public.poojas for delete
  using (public.is_app_admin());

drop policy if exists "Published Samagri is readable" on public.pooja_samagri;
create policy "Published Samagri is readable"
  on public.pooja_samagri for select
  using (
    public.is_app_admin()
    or exists (
      select 1 from public.poojas
      where public.poojas.id = pooja_samagri.pooja_id
        and public.poojas.is_published
        and (public.poojas.visibility_starts_at is null or public.poojas.visibility_starts_at <= now())
        and (public.poojas.visibility_ends_at is null or public.poojas.visibility_ends_at >= now())
    )
  );

drop policy if exists "Admins can insert Samagri" on public.pooja_samagri;
create policy "Admins can insert Samagri"
  on public.pooja_samagri for insert
  with check (public.is_app_admin());

drop policy if exists "Admins can update Samagri" on public.pooja_samagri;
create policy "Admins can update Samagri"
  on public.pooja_samagri for update
  using (public.is_app_admin())
  with check (public.is_app_admin());

drop policy if exists "Admins can delete Samagri" on public.pooja_samagri;
create policy "Admins can delete Samagri"
  on public.pooja_samagri for delete
  using (public.is_app_admin());

drop trigger if exists poojas_set_updated_at on public.poojas;
create trigger poojas_set_updated_at
before update on public.poojas
for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('pooja-images', 'pooja-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('pooja-audio', 'pooja-audio', false, 104857600, array['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-wav', 'audio/aac', 'audio/ogg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can view Pooja media" on storage.objects;
create policy "Admins can view Pooja media"
  on storage.objects for select
  using (bucket_id in ('pooja-images', 'pooja-audio') and public.is_app_admin());

drop policy if exists "Admins can upload Pooja media" on storage.objects;
create policy "Admins can upload Pooja media"
  on storage.objects for insert
  with check (bucket_id in ('pooja-images', 'pooja-audio') and public.is_app_admin());

drop policy if exists "Admins can update Pooja media" on storage.objects;
create policy "Admins can update Pooja media"
  on storage.objects for update
  using (bucket_id in ('pooja-images', 'pooja-audio') and public.is_app_admin())
  with check (bucket_id in ('pooja-images', 'pooja-audio') and public.is_app_admin());

drop policy if exists "Admins can delete Pooja media" on storage.objects;
create policy "Admins can delete Pooja media"
  on storage.objects for delete
  using (bucket_id in ('pooja-images', 'pooja-audio') and public.is_app_admin());
