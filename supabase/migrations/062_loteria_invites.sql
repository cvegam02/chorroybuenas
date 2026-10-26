-- Loterías colectivas (FEAT-56, US B1): el enlace para invitar a subir fotos a una lotería.
-- Una lotería con enlace es «Colectiva» (decisión 7). Hay un enlace por lotería: queda abierto hasta que su
-- dueño lo cierra, y generar uno nuevo cambia el código, así que el anterior deja de servir (decisión 4).
-- Solo se escribe con las funciones de abajo, para que nadie escoja su propio código.

create table if not exists public.loteria_invites (
  set_id uuid primary key references public.loteria_sets (id) on delete cascade,
  code text not null unique check (code ~ '^[0-9a-f]{16}$'),
  is_open boolean not null default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

comment on table public.loteria_invites is
  'FEAT-56: enlace para invitar a subir fotos a una lotería. Solo se escribe con open/regenerate/close_loteria_invite.';

alter table public.loteria_invites enable row level security;

drop policy if exists "Owners read their loteria invites" on public.loteria_invites;
create policy "Owners read their loteria invites" on public.loteria_invites
  for select to authenticated
  using (exists (
    select 1 from public.loteria_sets s where s.id = loteria_invites.set_id and s.user_id = auth.uid()
  ));

-- Supabase concede todo a anon y authenticated por privilegios por defecto: el dueño solo lee.
revoke all on public.loteria_invites from anon, authenticated;
grant select on public.loteria_invites to authenticated;
grant all on public.loteria_invites to service_role;

-- 64 bits al azar en hexadecimal: no se adivina probando.
create or replace function public.new_loteria_invite_code()
returns text
language sql
volatile
set search_path = public
as $$
  select substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
$$;

revoke all on function public.new_loteria_invite_code() from public, anon, authenticated;

create or replace function public.assert_loteria_owner(p_set_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.loteria_sets where id = p_set_id and user_id = auth.uid()) then
    raise exception 'SET_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.assert_loteria_owner(uuid) from public, anon, authenticated;

-- Abre la ventana de invitación: devuelve el enlace de la lotería y, si no tenía, lo crea abierto.
-- Un enlace cerrado se queda cerrado: para volver a abrirlo se genera uno nuevo.
create or replace function public.open_loteria_invite(p_set_id uuid)
returns public.loteria_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.loteria_invites;
begin
  perform public.assert_loteria_owner(p_set_id);
  insert into public.loteria_invites (set_id, code)
  values (p_set_id, public.new_loteria_invite_code())
  on conflict (set_id) do nothing;
  select * into v_invite from public.loteria_invites where set_id = p_set_id;
  return v_invite;
end;
$$;

-- Generar enlace nuevo: otro código, abierto. El anterior deja de servir.
create or replace function public.regenerate_loteria_invite(p_set_id uuid)
returns public.loteria_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.loteria_invites;
begin
  perform public.assert_loteria_owner(p_set_id);
  insert into public.loteria_invites (set_id, code)
  values (p_set_id, public.new_loteria_invite_code())
  on conflict (set_id) do update
    set code = excluded.code, is_open = true, updated_at = now()
  returning * into v_invite;
  return v_invite;
end;
$$;

-- Cerrar enlace: nadie más puede unirse ni subir fotos con él.
create or replace function public.close_loteria_invite(p_set_id uuid)
returns public.loteria_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.loteria_invites;
begin
  perform public.assert_loteria_owner(p_set_id);
  update public.loteria_invites set is_open = false, updated_at = now()
  where set_id = p_set_id
  returning * into v_invite;
  if v_invite.set_id is null then
    raise exception 'INVITE_NOT_FOUND';
  end if;
  return v_invite;
end;
$$;

revoke all on function public.open_loteria_invite(uuid) from public, anon;
revoke all on function public.regenerate_loteria_invite(uuid) from public, anon;
revoke all on function public.close_loteria_invite(uuid) from public, anon;
grant execute on function public.open_loteria_invite(uuid) to authenticated;
grant execute on function public.regenerate_loteria_invite(uuid) to authenticated;
grant execute on function public.close_loteria_invite(uuid) to authenticated;
