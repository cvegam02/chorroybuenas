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

-- Quitar cualquier policy de user_tokens creada fuera de las migraciones (p. ej. desde el dashboard).
do $$
declare
  r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'user_tokens'
      and policyname not in (
        'Users can see their own tokens',
        'Service role can manage tokens',
        'Admins can read all user_tokens'
      )
  loop
    raise notice 'Eliminando policy no esperada en user_tokens: %', r.policyname;
    execute format('drop policy %I on public.user_tokens', r.policyname);
  end loop;
end $$;
