-- Invitados: tope y una imagen por carta (FEAT-58, US A5; H16). Reabre la decisión 5 de FEAT-56 («sin límite de
-- fotos por invitado»), decisión 9: cada invitado sube como máximo 60 cartas por lotería y 10 por minuto, y cada
-- carta lleva su propia imagen, que tiene que existir y que ninguna otra carta de la lotería use. La organizadora
-- borra de una vez las fotos de un invitado.

-- Contar las cartas de un invitado (tope por lotería y por minuto).
create index if not exists cards_uploaded_by_idx on public.cards (uploaded_by, created_at)
  where uploaded_by is not null;

-- ---------------------------------------------------------------------------
-- Agregar la carta de un invitado: lo de la migración 064, más la imagen y los topes.
-- ---------------------------------------------------------------------------
create or replace function public.add_guest_card(p_set_id uuid, p_card_id uuid, p_title text, p_image_path text)
returns public.cards
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cards_per_guest constant integer := 60;
  v_cards_per_minute constant integer := 10;
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

  -- Una imagen por carta: que se haya subido y que no sea de otra carta (ni la original de una transformada).
  if not exists (select 1 from storage.objects where bucket_id = 'card-images' and name = p_image_path)
     or exists (
       select 1 from public.cards
       where set_id = p_set_id and (image_path = p_image_path or original_image_path = p_image_path)
     ) then
    raise exception 'INVALID_IMAGE';
  end if;

  if (select count(*) from public.cards where set_id = p_set_id and uploaded_by = auth.uid()) >= v_cards_per_guest then
    raise exception 'GUEST_LIMIT';
  end if;
  -- Por minuto, en todas sus loterías.
  if (select count(*) from public.cards
      where uploaded_by = auth.uid() and created_at > now() - interval '1 minute') >= v_cards_per_minute then
    raise exception 'RATE_LIMITED';
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

-- ---------------------------------------------------------------------------
-- «Borrar sus fotos»: la organizadora borra las cartas que subió un invitado y recibe las rutas de sus imágenes
-- para borrar los archivos (como al borrar cualquier carta). Los registros de sus audios de voz con IA se borran
-- solos con la carta; sus archivos los borra el navegador, como al borrar una carta.
-- ---------------------------------------------------------------------------
create or replace function public.delete_guest_cards(p_set_id uuid, p_user_id uuid)
returns table (card_id uuid, path text)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_loteria_owner(p_set_id);
  -- Como al borrar cualquier carta: primero sale de los tableros (board_cards no deja borrarla si sigue ahí).
  delete from public.board_cards bc
  using public.cards c
  where bc.card_id = c.id and c.set_id = p_set_id and c.uploaded_by = p_user_id;
  return query
    with deleted as (
      delete from public.cards c
      where c.set_id = p_set_id and c.uploaded_by = p_user_id
      returning c.id, c.image_path, c.original_image_path
    )
    select d.id, p.path
    from deleted d
    cross join lateral (
      select distinct x.path from unnest(array[d.image_path, d.original_image_path]) as x(path)
    ) p;
end;
$$;

comment on function public.delete_guest_cards is
  'FEAT-58: la dueña borra las cartas que subió un invitado; devuelve cada carta y las rutas de sus imágenes (null si no tiene).';

revoke all on function public.delete_guest_cards(uuid, uuid) from public, anon;
grant execute on function public.delete_guest_cards(uuid, uuid) to authenticated;
