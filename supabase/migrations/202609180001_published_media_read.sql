create or replace function public.can_read_published_pooja_media(media_bucket text, media_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1
      from public.poojas
      where public.poojas.is_published
        and (public.poojas.visibility_starts_at is null or public.poojas.visibility_starts_at <= now())
        and (public.poojas.visibility_ends_at is null or public.poojas.visibility_ends_at >= now())
        and (
          (media_bucket = 'pooja-images' and public.poojas.image_path = media_path)
          or (media_bucket = 'pooja-audio' and public.poojas.audio_path = media_path)
        )
    )
    or (
      media_bucket = 'pooja-images'
      and exists (
        select 1
        from public.pooja_samagri
        join public.poojas on public.poojas.id = public.pooja_samagri.pooja_id
        where public.pooja_samagri.image_path = media_path
          and public.poojas.is_published
          and (public.poojas.visibility_starts_at is null or public.poojas.visibility_starts_at <= now())
          and (public.poojas.visibility_ends_at is null or public.poojas.visibility_ends_at >= now())
      )
    )
  );
$$;

revoke all on function public.can_read_published_pooja_media(text, text) from public;
grant execute on function public.can_read_published_pooja_media(text, text) to authenticated;

drop policy if exists "Admins can view Pooja media" on storage.objects;
drop policy if exists "Published Pooja media is readable" on storage.objects;
create policy "Published Pooja media is readable"
  on storage.objects for select
  using (
    bucket_id in ('pooja-images', 'pooja-audio')
    and (
      public.is_app_admin()
      or public.can_read_published_pooja_media(bucket_id, name)
    )
  );
