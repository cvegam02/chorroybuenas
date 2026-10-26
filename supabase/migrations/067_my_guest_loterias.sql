-- Loterías colectivas (FEAT-56, US B5): «Loterías donde participo» en Mi cuenta.
-- Las loterías donde quien tiene la sesión es invitado vigente (las de las que lo quitaron no salen), con el
-- nombre de quien organiza (nunca el correo), cuántas cartas llevan y si todavía puede subir fotos (enlace
-- abierto). La más reciente a la que se unió sale primero.

create or replace function public.list_my_guest_loterias()
returns table (set_id uuid, name text, organizer_name text, card_count int, can_upload boolean, joined_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.name,
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    (select count(*)::int from public.cards c where c.set_id = s.id),
    coalesce((select inv.is_open from public.loteria_invites inv where inv.set_id = s.id), false),
    i.joined_at
  from public.loteria_invitees i
  join public.loteria_sets s on s.id = i.set_id
  join auth.users u on u.id = s.user_id
  where i.user_id = auth.uid() and i.removed_at is null
  order by i.joined_at desc, s.id;
$$;

revoke all on function public.list_my_guest_loterias() from public, anon;
grant execute on function public.list_my_guest_loterias() to authenticated;
