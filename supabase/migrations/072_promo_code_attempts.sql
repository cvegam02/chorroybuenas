-- Intentos de código promocional (FEAT-58, US A9; H5), decisión 3: cada usuario puede probar como máximo 5 códigos
-- sin bono por hora (que no existen, vencidos o ya usados, sin distinguirlos). Pasado el tope, RATE_LIMITED hasta
-- que pase la hora, al revisar el código en Comprar tokens y al iniciar el pago con código.

create table if not exists public.promo_code_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists promo_code_attempts_user_idx on public.promo_code_attempts (user_id, created_at);

comment on table public.promo_code_attempts is
  'FEAT-58: códigos promocionales sin bono que probó cada usuario, para el límite de 5 por hora. Solo el servidor.';

alter table public.promo_code_attempts enable row level security;
revoke all on public.promo_code_attempts from anon, authenticated;
grant all on public.promo_code_attempts to service_role;

-- Lanza RATE_LIMITED si el usuario ya probó 5 códigos sin bono en la última hora. Bloquea por usuario para que dos
-- intentos a la vez no pasen los dos con 4.
create or replace function public.assert_promo_code_attempts(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_attempts_per_hour constant integer := 5;
begin
  perform pg_advisory_xact_lock(hashtext('promo_code_attempts'), hashtext(p_user_id::text));
  if (select count(*) from public.promo_code_attempts
      where user_id = p_user_id and created_at > now() - interval '1 hour') >= v_attempts_per_hour then
    raise exception 'RATE_LIMITED';
  end if;
end;
$$;

-- Cuenta un código sin bono; lanza RATE_LIMITED si ya no quedaban intentos.
create or replace function public.record_failed_promo_code(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_promo_code_attempts(p_user_id);
  delete from public.promo_code_attempts where user_id = p_user_id and created_at < now() - interval '1 day';
  insert into public.promo_code_attempts (user_id) values (p_user_id);
end;
$$;

-- Lo de la migración 025, más el límite: un código sin bono cuenta como intento.
create or replace function public.check_promo_code(p_code text)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_percent integer;
begin
  if auth.uid() is null then
    raise exception 'NOT_LOGGED_IN';
  end if;
  perform public.assert_promo_code_attempts(auth.uid());

  select coalesce((
    select public.promo_percent(p.config)
    from public.promotions p
    where p.type = 'code'
      and upper(trim(p.code)) = upper(trim(p_code))
      and p.is_active
      and (p.valid_from is null or p.valid_from <= now())
      and (p.valid_until is null or p.valid_until >= now())
      and not exists (
        select 1 from public.token_purchases tp
        where tp.user_id = auth.uid() and p.id = any (tp.promotion_ids)
      )
    limit 1
  ), 0) into v_percent;

  if v_percent = 0 then
    insert into public.promo_code_attempts (user_id) values (auth.uid());
  end if;
  return v_percent;
end;
$$;

comment on function public.check_promo_code is
  'Porcentaje de bono de un código para el usuario actual; 0 si no existe, no está vigente o ya lo usó (y cuenta como intento). RATE_LIMITED con 5 intentos sin bono en la hora (FEAT-58).';
comment on function public.assert_promo_code_attempts is
  'FEAT-58: RATE_LIMITED si el usuario probó 5 códigos sin bono en la última hora. Solo service_role.';
comment on function public.record_failed_promo_code is
  'FEAT-58: registra un código sin bono al iniciar un pago; RATE_LIMITED si ya no quedaban intentos. Solo service_role.';

revoke all on function public.check_promo_code(text) from public, anon;
grant execute on function public.check_promo_code(text) to authenticated;
revoke all on function public.assert_promo_code_attempts(uuid) from public, anon, authenticated;
revoke all on function public.record_failed_promo_code(uuid) from public, anon, authenticated;
grant execute on function public.assert_promo_code_attempts(uuid) to service_role;
grant execute on function public.record_failed_promo_code(uuid) to service_role;
