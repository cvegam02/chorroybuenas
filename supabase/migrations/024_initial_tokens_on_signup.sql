-- Los tokens iniciales se asignan en el trigger de registro; el navegador ya no escribe user_tokens.

create or replace function public.get_initial_tokens()
returns integer
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_value integer;
begin
  select (value #>> '{}')::integer into v_value
  from public.app_config where key = 'initial_tokens';
  return greatest(coalesce(v_value, 0), 0);
exception when others then
  return 0; -- config ausente o no numérica: nunca bloquear el registro
end;
$$;

comment on function public.get_initial_tokens is
  'Tokens de bienvenida según app_config.initial_tokens; 0 si falta o no es un número válido.';
revoke all on function public.get_initial_tokens() from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', '')::text
  )
  on conflict (id) do nothing;

  insert into public.user_tokens (user_id, balance, updated_at)
  values (new.id, public.get_initial_tokens(), now())
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Usuarios existentes sin fila (nunca pidieron su saldo): mismo trato que un usuario nuevo.
insert into public.user_tokens (user_id, balance, updated_at)
select au.id, public.get_initial_tokens(), now()
from auth.users au
where not exists (select 1 from public.user_tokens ut where ut.user_id = au.id);

-- Rehacer las policies de user_tokens desde cero. No se filtra por nombre: las bases creadas
-- a mano tienen policies con otros nombres (p. ej. "Service role can manage credits", que era
-- FOR ALL TO public USING (true) y dejaba a cualquiera leer y modificar todos los saldos).
do $$
declare
  r record;
begin
  for r in
    select policyname, cmd, roles::text as roles, qual
    from pg_policies
    where schemaname = 'public' and tablename = 'user_tokens'
  loop
    raise notice 'Reemplazando policy de user_tokens: % (% a %, using %)', r.policyname, r.cmd, r.roles, r.qual;
    execute format('drop policy %I on public.user_tokens', r.policyname);
  end loop;
end $$;

alter table public.user_tokens enable row level security;

create policy "Users can see their own tokens" on public.user_tokens
  for select using (auth.uid() = user_id);

create policy "Admins can read all user_tokens" on public.user_tokens
  for select using (public.is_admin());

-- service_role ya ignora RLS; la policy solo deja explícito quién escribe.
create policy "Service role can manage tokens" on public.user_tokens
  for all to service_role using (true) with check (true);

-- El navegador solo lee su saldo: quitar también los permisos de escritura de la tabla.
revoke insert, update, delete, truncate on public.user_tokens from anon, authenticated;
