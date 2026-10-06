-- Arnés ligero de tests: simula en un Postgres normal lo mínimo de Supabase que usan
-- las migraciones (roles, esquema auth, esquema storage y privilegios por defecto).
-- NO es Supabase real: sirve para probar funciones SQL, restricciones y políticas RLS.

-- Roles de Supabase -----------------------------------------------------------------
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;

-- Esquema auth ----------------------------------------------------------------------
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  raw_app_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create function auth.jwt() returns jsonb
language sql stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
$$;

create function auth.uid() returns uuid
language sql stable
as $$
  select nullif(auth.jwt()->>'sub', '')::uuid;
$$;

create function auth.role() returns text
language sql stable
as $$
  select auth.jwt()->>'role';
$$;

-- Esquema storage -------------------------------------------------------------------
create schema storage;
grant usage on schema storage to anon, authenticated, service_role;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table storage.objects enable row level security;
grant all on storage.buckets, storage.objects to anon, authenticated, service_role;

create function storage.foldername(name text) returns text[]
language sql immutable
as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1];
$$;

-- Ayudas de aserción ----------------------------------------------------------------
-- Cada aserción emite "NOTICE: ok - <mensaje>" o aborta el archivo con "FAIL: <mensaje>".
create schema test;
grant usage on schema test to public;

create function test.ok(p_condition boolean, p_message text) returns void
language plpgsql
as $$
begin
  if p_condition is not true then
    raise exception 'FAIL: %', p_message;
  end if;
  raise notice 'ok - %', p_message;
end;
$$;

create function test.is(p_actual anyelement, p_expected anyelement, p_message text) returns void
language plpgsql
as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAIL: % (esperado: %, obtenido: %)', p_message, p_expected, p_actual;
  end if;
  raise notice 'ok - %', p_message;
end;
$$;

-- p_expected: un SQLSTATE de 5 caracteres o un fragmento del mensaje de error.
create function test.throws(p_sql text, p_expected text, p_message text) returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlstate = p_expected or sqlerrm like '%' || p_expected || '%' then
      raise notice 'ok - %', p_message;
      return;
    end if;
    raise exception 'FAIL: % (esperado: %, obtenido: % %)', p_message, p_expected, sqlstate, sqlerrm;
  end;
  raise exception 'FAIL: % (no lanzó ningún error)', p_message;
end;
$$;

create function test.lives(p_sql text, p_message text) returns void
language plpgsql
as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise exception 'FAIL: % (lanzó: % %)', p_message, sqlstate, sqlerrm;
  end;
  raise notice 'ok - %', p_message;
end;
$$;

-- Cambiar de identidad dentro de la transacción del test.
create function test.as_user(p_user_id uuid) returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_user_id, 'role', 'authenticated')::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

create function test.as_anon() returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  perform set_config('role', 'anon', true);
end;
$$;

create function test.as_service_role() returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('role', 'service_role')::text, true);
  perform set_config('role', 'service_role', true);
end;
$$;

-- Volver al superusuario para preparar o inspeccionar datos.
create function test.as_postgres() returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('role', 'none', true);
end;
$$;
