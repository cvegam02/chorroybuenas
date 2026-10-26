-- Loterías colectivas (FEAT-56, US B4): el organizador administra a sus invitados y ve las fotos nuevas.
-- «N fotos nuevas» (decisión 8) son las cartas de invitados subidas después de la última vez que el dueño abrió
-- la lotería (`owner_seen_at`). Quitar a un invitado marca `removed_at`: pierde el acceso y sus fotos se quedan
-- (decisión 6). Solo el dueño usa estas funciones.

alter table public.loteria_invites
  add column if not exists owner_seen_at timestamptz default now() not null;

comment on column public.loteria_invites.owner_seen_at is
  'FEAT-56: hasta cuándo el dueño ya vio las fotos de sus invitados; las posteriores son «fotos nuevas».';

-- Cuántas fotos nuevas de invitados tiene cada lotería colectiva del dueño (solo las que tienen alguna).
create or replace function public.loteria_new_guest_cards()
returns table (set_id uuid, new_count int)
language sql
stable
security definer
set search_path = public
as $$
  select i.set_id, count(*)::int
  from public.loteria_invites i
  join public.loteria_sets s on s.id = i.set_id and s.user_id = auth.uid()
  join public.cards c on c.set_id = i.set_id and c.uploaded_by is not null and c.created_at > i.owner_seen_at
  group by i.set_id;
$$;

revoke all on function public.loteria_new_guest_cards() from public, anon;
grant execute on function public.loteria_new_guest_cards() to authenticated;

-- El dueño abre la lotería: devuelve sus cartas nuevas de invitados y el contador se borra. Avanza hasta la
-- carta más reciente que ve (no hasta now()), para no saltarse una que se esté guardando en ese momento.
create or replace function public.see_loteria_guest_cards(p_set_id uuid)
returns table (card_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seen_at timestamptz;
  v_ids uuid[];
  v_latest timestamptz;
begin
  perform public.assert_loteria_owner(p_set_id);
  select i.owner_seen_at into v_seen_at from public.loteria_invites i where i.set_id = p_set_id for update;
  if v_seen_at is null then
    return;
  end if;
  select array_agg(c.id), max(c.created_at) into v_ids, v_latest
  from public.cards c
  where c.set_id = p_set_id and c.uploaded_by is not null and c.created_at > v_seen_at;
  if v_latest is not null then
    update public.loteria_invites i set owner_seen_at = v_latest where i.set_id = p_set_id;
  end if;
  return query select unnest(coalesce(v_ids, '{}'::uuid[]));
end;
$$;

revoke all on function public.see_loteria_guest_cards(uuid) from public, anon;
grant execute on function public.see_loteria_guest_cards(uuid) to authenticated;

-- La ventana «Invitados» (M19): los invitados vigentes, con el nombre de su cuenta (nunca el correo) y cuántas
-- fotos subió cada uno, del primero que se unió al último.
create or replace function public.list_loteria_invitees(p_set_id uuid)
returns table (user_id uuid, full_name text, joined_at timestamptz, card_count int)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.assert_loteria_owner(p_set_id);
  return query
    select i.user_id, nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), i.joined_at,
      (select count(*)::int from public.cards c where c.set_id = p_set_id and c.uploaded_by = i.user_id)
    from public.loteria_invitees i
    join auth.users u on u.id = i.user_id
    where i.set_id = p_set_id and i.removed_at is null
    order by i.joined_at, i.user_id;
end;
$$;

revoke all on function public.list_loteria_invitees(uuid) from public, anon;
grant execute on function public.list_loteria_invitees(uuid) to authenticated;

-- Quitar a un invitado: deja de ver la lotería y no vuelve a unirse con el enlace (decisión 10).
create or replace function public.remove_loteria_invitee(p_set_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_loteria_owner(p_set_id);
  update public.loteria_invitees set removed_at = now()
  where set_id = p_set_id and user_id = p_user_id and removed_at is null;
  if not found then
    raise exception 'INVITEE_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.remove_loteria_invitee(uuid, uuid) from public, anon;
grant execute on function public.remove_loteria_invitee(uuid, uuid) to authenticated;
