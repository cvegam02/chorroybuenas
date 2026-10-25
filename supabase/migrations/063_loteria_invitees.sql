-- Loterías colectivas (FEAT-56, US B2): unirse a una lotería con su enlace.
-- Quien se une queda como invitado. Al quitarlo (US B4) se marca `removed_at`: pierde el acceso, sus fotos se
-- quedan (decisión 6) y no puede volver a unirse con el enlace (decisión 10).

create table if not exists public.loteria_invitees (
  set_id uuid not null references public.loteria_sets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz default now() not null,
  removed_at timestamptz,
  primary key (set_id, user_id)
);

create index if not exists loteria_invitees_user_idx on public.loteria_invitees (user_id);

comment on table public.loteria_invitees is
  'FEAT-56: invitados de una lotería colectiva. Solo se escribe con join_loteria (y, en B4, al quitarlos).';

alter table public.loteria_invitees enable row level security;

drop policy if exists "Owners and invitees read loteria invitees" on public.loteria_invitees;
create policy "Owners and invitees read loteria invitees" on public.loteria_invitees
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.loteria_sets s where s.id = loteria_invitees.set_id and s.user_id = auth.uid())
  );

revoke all on public.loteria_invitees from anon, authenticated;
grant select on public.loteria_invitees to authenticated;
grant all on public.loteria_invitees to service_role;

-- Lo que muestra la página del enlace (P9). Sin sesión también se puede ver.
--   open: el enlace sirve; nombre de la lotería, quién la organiza (su nombre, nunca el correo; decisión 11) y
--         cuántas cartas lleva. role: owner, guest o none; set_id solo para owner y guest.
--   unavailable: cerrado, reemplazado o inventado (no se dice cuál ni de qué lotería).
--   removed: quien lo abre fue quitado de esa lotería.
-- El dueño y los invitados reconocen la lotería aunque el enlace esté cerrado.
create or replace function public.get_loteria_invite(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_invite public.loteria_invites;
  v_set public.loteria_sets;
  v_role text := 'none';
  v_removed_at timestamptz;
  v_is_guest boolean := false;
begin
  select * into v_invite from public.loteria_invites where code = p_code;
  if v_invite.set_id is null then
    return jsonb_build_object('status', 'unavailable');
  end if;
  select * into v_set from public.loteria_sets where id = v_invite.set_id;

  if auth.uid() is not null then
    if v_set.user_id = auth.uid() then
      v_role := 'owner';
    else
      select true, removed_at into v_is_guest, v_removed_at
      from public.loteria_invitees where set_id = v_set.id and user_id = auth.uid();
      if v_removed_at is not null then
        return jsonb_build_object('status', 'removed');
      end if;
      if v_is_guest then
        v_role := 'guest';
      end if;
    end if;
  end if;

  if not v_invite.is_open and v_role = 'none' then
    return jsonb_build_object('status', 'unavailable');
  end if;

  return jsonb_build_object(
    'status', 'open',
    'role', v_role,
    'set_id', case when v_role = 'none' then null else v_set.id end,
    'set_name', v_set.name,
    'organizer_name', (
      select nullif(btrim(raw_user_meta_data ->> 'full_name'), '') from auth.users where id = v_set.user_id
    ),
    'card_count', (select count(*)::int from public.cards where set_id = v_set.id)
  );
end;
$$;

revoke all on function public.get_loteria_invite(text) from public;
grant execute on function public.get_loteria_invite(text) to anon, authenticated;

-- Unirse con el enlace: devuelve la lotería a la que se llega. El dueño llega a la suya sin volverse invitado;
-- el invitado que ya estaba entra aunque el enlace esté cerrado; el quitado no vuelve a entrar.
create or replace function public.join_loteria(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.loteria_invites;
  v_owner uuid;
  v_removed_at timestamptz;
  v_is_guest boolean := false;
begin
  if auth.uid() is null then
    raise exception 'NOT_LOGGED_IN';
  end if;
  select * into v_invite from public.loteria_invites where code = p_code;
  if v_invite.set_id is null then
    raise exception 'INVITE_UNAVAILABLE';
  end if;

  select user_id into v_owner from public.loteria_sets where id = v_invite.set_id;
  if v_owner = auth.uid() then
    return v_invite.set_id;
  end if;

  select true, removed_at into v_is_guest, v_removed_at
  from public.loteria_invitees where set_id = v_invite.set_id and user_id = auth.uid();
  if v_removed_at is not null then
    raise exception 'INVITEE_REMOVED';
  end if;
  if v_is_guest then
    return v_invite.set_id;
  end if;
  if not v_invite.is_open then
    raise exception 'INVITE_UNAVAILABLE';
  end if;

  insert into public.loteria_invitees (set_id, user_id) values (v_invite.set_id, auth.uid())
  on conflict (set_id, user_id) do nothing;
  return v_invite.set_id;
end;
$$;

revoke all on function public.join_loteria(text) from public, anon;
grant execute on function public.join_loteria(text) to authenticated;
