-- Banner de la oferta (FEAT-49, US A4; contexto-negocio.md §9). Vive en la propia oferta: solo sale
-- mientras ella está vigente. Los archivos (video MP4 e imagen fija para celular) van al espacio público
-- offer-banners, en <id de la oferta>/<archivo>, y solo los escriben administradores.
-- current_offer() cambia de columnas: entrega el banner a cualquiera, solo si está encendido.

-- ---------------------------------------------------------------------------
-- 1. Datos del banner
-- ---------------------------------------------------------------------------
alter table public.offers
  add column if not exists banner_enabled boolean not null default false,
  add column if not exists banner_video_path text,
  add column if not exists banner_image_path text,
  add column if not exists banner_title_es text,
  add column if not exists banner_text_es text,
  add column if not exists banner_button_es text,
  -- Inglés opcional: lo que falte se muestra en español.
  add column if not exists banner_title_en text,
  add column if not exists banner_text_en text,
  add column if not exists banner_button_en text,
  add column if not exists banner_target text not null default 'buy_tokens',
  add column if not exists banner_on_home boolean not null default true,
  add column if not exists banner_on_dashboard boolean not null default true,
  add column if not exists banner_countdown boolean not null default true;

alter table public.offers
  add constraint offers_banner_target_check
    check (banner_target in ('buy_tokens', 'create', 'themed')),
  add constraint offers_banner_lengths_check check (
    coalesce(char_length(banner_title_es), 0) <= 80 and coalesce(char_length(banner_title_en), 0) <= 80
    and coalesce(char_length(banner_text_es), 0) <= 200 and coalesce(char_length(banner_text_en), 0) <= 200
    and coalesce(char_length(banner_button_es), 0) <= 40 and coalesce(char_length(banner_button_en), 0) <= 40
  ),
  -- Encendido, necesita video, imagen fija, título, texto del botón y al menos una pantalla.
  add constraint offers_banner_complete_check check (
    not banner_enabled or (
      coalesce(btrim(banner_video_path), '') <> ''
      and coalesce(btrim(banner_image_path), '') <> ''
      and coalesce(btrim(banner_title_es), '') <> ''
      and coalesce(btrim(banner_button_es), '') <> ''
      and (banner_on_home or banner_on_dashboard)
    )
  );

-- ---------------------------------------------------------------------------
-- 2. La oferta vigente, ahora con su banner
-- ---------------------------------------------------------------------------
drop function if exists public.current_offer();

create function public.current_offer()
returns table (
  id uuid,
  discount_percent integer,
  starts_at timestamptz,
  ends_at timestamptz,
  banner_enabled boolean,
  banner_video_path text,
  banner_image_path text,
  banner_title_es text,
  banner_text_es text,
  banner_button_es text,
  banner_title_en text,
  banner_text_en text,
  banner_button_en text,
  banner_target text,
  banner_on_home boolean,
  banner_on_dashboard boolean,
  banner_countdown boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.id, o.discount_percent, o.starts_at, o.ends_at,
    o.banner_enabled,
    case when o.banner_enabled then o.banner_video_path end,
    case when o.banner_enabled then o.banner_image_path end,
    case when o.banner_enabled then o.banner_title_es end,
    case when o.banner_enabled then o.banner_text_es end,
    case when o.banner_enabled then o.banner_button_es end,
    case when o.banner_enabled then nullif(btrim(o.banner_title_en), '') end,
    case when o.banner_enabled then nullif(btrim(o.banner_text_en), '') end,
    case when o.banner_enabled then nullif(btrim(o.banner_button_en), '') end,
    o.banner_target, o.banner_on_home, o.banner_on_dashboard, o.banner_countdown
  from public.offers o
  where o.cancelled_at is null
    and o.starts_at <= now()
    and o.ends_at > now()
  order by o.starts_at
  limit 1;
$$;

comment on function public.current_offer() is
  'FEAT-49: la oferta vigente (si hay), sin su nombre interno, con su banner si está encendido. La lee cualquiera.';

revoke all on function public.current_offer() from public;
grant execute on function public.current_offer() to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Espacio de archivos del banner
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('offer-banners', 'offer-banners', true, 8388608, array['video/mp4', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can read offer banners" on storage.objects;
create policy "Admins can read offer banners"
on storage.objects for select
to authenticated
using (bucket_id = 'offer-banners' and public.is_admin());

drop policy if exists "Admins can upload offer banners" on storage.objects;
create policy "Admins can upload offer banners"
on storage.objects for insert
to authenticated
with check (bucket_id = 'offer-banners' and public.is_admin());

drop policy if exists "Admins can update offer banners" on storage.objects;
create policy "Admins can update offer banners"
on storage.objects for update
to authenticated
using (bucket_id = 'offer-banners' and public.is_admin())
with check (bucket_id = 'offer-banners' and public.is_admin());

drop policy if exists "Admins can delete offer banners" on storage.objects;
create policy "Admins can delete offer banners"
on storage.objects for delete
to authenticated
using (bucket_id = 'offer-banners' and public.is_admin());
