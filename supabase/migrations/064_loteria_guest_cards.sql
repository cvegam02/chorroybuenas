-- Loterías colectivas (FEAT-56, US B3): el invitado ve las cartas de la lotería y sube las suyas.
-- La carta de un invitado es de la lotería: queda a nombre de su dueño (así la edita, la borra y la transforma
-- como las suyas, US B4) y guarda en `uploaded_by` quién la subió. Su imagen va en la carpeta del dueño, en
-- `<dueño>/guests/<invitado>/…`. El invitado solo agrega cartas con `add_guest_card`, mientras el enlace esté
-- abierto; no cambia ni borra ninguna (decisión 3). Con el enlace cerrado sigue viendo la lotería.

alter table public.cards
  add column if not exists uploaded_by uuid references auth.users (id) on delete set null;

comment on column public.cards.uploaded_by is
  'FEAT-56: invitado que subió la carta a una lotería colectiva; null si la subió su dueño.';

-- Invitado vigente (no quitado) de la lotería, con la sesión actual.
create or replace function public.is_loteria_guest(p_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.loteria_invitees
    where set_id = p_set_id and user_id = auth.uid() and removed_at is null
  );
$$;

revoke all on function public.is_loteria_guest(uuid) from public, anon;
grant execute on function public.is_loteria_guest(uuid) to authenticated;

-- Invitado vigente de la lotería y con el enlace abierto: puede subir.
create or replace function public.can_upload_as_guest(p_set_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_loteria_guest(p_set_id)
    and exists (select 1 from public.loteria_invites where set_id = p_set_id and is_open);
$$;

revoke all on function public.can_upload_as_guest(uuid) from public, anon;
grant execute on function public.can_upload_as_guest(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Lectura para los invitados: la lotería y sus cartas (las reglas del dueño no cambian).
-- ---------------------------------------------------------------------------
drop policy if exists "Guests read their loterias" on public.loteria_sets;
create policy "Guests read their loterias" on public.loteria_sets
  for select to authenticated using (public.is_loteria_guest(id));

drop policy if exists "Guests read loteria cards" on public.cards;
create policy "Guests read loteria cards" on public.cards
  for select to authenticated using (set_id is not null and public.is_loteria_guest(set_id));

-- ---------------------------------------------------------------------------
-- Imágenes: el invitado ve las de las cartas de la lotería y sube a su carpeta de invitado.
-- ---------------------------------------------------------------------------
drop policy if exists "Guests read loteria card images" on storage.objects;
create policy "Guests read loteria card images"
on storage.objects for select
to authenticated
using (
  bucket_id = 'card-images'
  and exists (
    select 1 from public.cards c
    where (c.image_path = storage.objects.name or c.original_image_path = storage.objects.name)
      and c.set_id is not null
      and public.is_loteria_guest(c.set_id)
  )
);

drop policy if exists "Guests upload to their guest folder" on storage.objects;
create policy "Guests upload to their guest folder"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'card-images'
  and (storage.foldername(name))[2] = 'guests'
  and (storage.foldername(name))[3] = auth.uid()::text
  and exists (
    -- `storage.objects.name` completo: dentro de la subconsulta, `name` sería el de la lotería
    select 1 from public.loteria_sets s
    where s.user_id::text = (storage.foldername(storage.objects.name))[1]
      and public.can_upload_as_guest(s.id)
  )
);

-- ---------------------------------------------------------------------------
-- Agregar la carta de un invitado: al final de la baraja (el número sale del orden de subida, §4), con el
-- título único en la lotería sin importar mayúsculas ni espacios, y con una imagen de su carpeta de invitado.
-- El bloqueo de la lotería evita que dos invitados suban a la vez el mismo título.
-- ---------------------------------------------------------------------------
create or replace function public.add_guest_card(p_set_id uuid, p_card_id uuid, p_title text, p_image_path text)
returns public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_title text := regexp_replace(btrim(coalesce(p_title, '')), '\s+', ' ', 'g');
  v_card public.cards;
begin
  if not public.can_upload_as_guest(p_set_id) then
    raise exception 'INVITE_UNAVAILABLE';
  end if;
  select user_id into v_owner from public.loteria_sets where id = p_set_id for update;

  if v_title = '' or char_length(v_title) > 50 then
    raise exception 'INVALID_TITLE';
  end if;
  if p_image_path is null or p_image_path not like v_owner::text || '/guests/' || auth.uid()::text || '/%' then
    raise exception 'INVALID_IMAGE';
  end if;
  if exists (
    select 1 from public.cards
    where set_id = p_set_id and lower(regexp_replace(btrim(title), '\s+', ' ', 'g')) = lower(v_title)
  ) then
    raise exception 'DUPLICATE_TITLE';
  end if;

  insert into public.cards (id, user_id, set_id, title, image_path, original_image_path, is_ai_generated, uploaded_by,
    created_at)
  values (p_card_id, v_owner, p_set_id, v_title, p_image_path, p_image_path, false, auth.uid(), clock_timestamp())
  returning * into v_card;
  return v_card;
end;
$$;

revoke all on function public.add_guest_card(uuid, uuid, text, text) from public, anon;
grant execute on function public.add_guest_card(uuid, uuid, text, text) to authenticated;

-- Quiénes participan en una lotería (dueño e invitados, también los quitados, porque sus cartas se quedan),
-- con el nombre de su cuenta; nunca el correo. Para el dueño y sus invitados vigentes.
create or replace function public.loteria_members(p_set_id uuid)
returns table (user_id uuid, full_name text, is_owner boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  select s.user_id into v_owner from public.loteria_sets s where s.id = p_set_id;
  if v_owner is null or (v_owner <> auth.uid() and not public.is_loteria_guest(p_set_id)) then
    raise exception 'SET_NOT_FOUND';
  end if;
  return query
    select u.id, nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), u.id = v_owner
    from auth.users u
    where u.id = v_owner
       or u.id in (select i.user_id from public.loteria_invitees i where i.set_id = p_set_id);
end;
$$;

revoke all on function public.loteria_members(uuid) from public, anon;
grant execute on function public.loteria_members(uuid) to authenticated;
