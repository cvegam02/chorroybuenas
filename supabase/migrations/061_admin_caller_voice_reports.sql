-- La voz con IA del cantador en los reportes del administrador (FEAT-55, decisión 28). Hasta aquí cada
-- token gastado contaba como una foto con IA; la voz (token_usage.reason = 'caller_voice', migración 060)
-- cuesta 10 tokens por lotería y no son fotos. Las fotos se cuentan sin la voz, la voz se cuenta aparte
-- y tiene su propio costo por lotería, editable en Precios y promos.

-- ---------------------------------------------------------------------------
-- 1. Costo de la voz por lotería, junto al costo por imagen (049). Lo que cobra MiniMax en Replicate
--    por una lotería grande al 2026-10-24.
-- ---------------------------------------------------------------------------
alter table public.ai_cost_settings
  add column if not exists cost_per_voice_usd numeric(10, 6) not null default 0.10 check (cost_per_voice_usd > 0);

create or replace function public.admin_get_ai_cost_per_voice()
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  return (select cost_per_voice_usd from public.ai_cost_settings where id);
end;
$$;

create or replace function public.admin_set_ai_cost_per_voice(p_cost_usd numeric)
returns numeric
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_cost numeric;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_cost_usd is null or p_cost_usd <= 0 then
    raise exception 'Invalid cost';
  end if;

  update public.ai_cost_settings
  set cost_per_voice_usd = p_cost_usd, updated_at = now()
  where id
  returning cost_per_voice_usd into v_cost;

  return v_cost;
end;
$$;

comment on function public.admin_get_ai_cost_per_voice() is
  'FEAT-55: el administrador lee el costo de la voz con IA del cantador por lotería (USD).';
comment on function public.admin_set_ai_cost_per_voice(numeric) is
  'FEAT-55: el administrador cambia el costo de la voz con IA por lotería (USD, mayor que cero).';

revoke all on function public.admin_get_ai_cost_per_voice() from public, anon, authenticated;
revoke all on function public.admin_set_ai_cost_per_voice(numeric) from public, anon, authenticated;
grant execute on function public.admin_get_ai_cost_per_voice() to authenticated, service_role;
grant execute on function public.admin_set_ai_cost_per_voice(numeric) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. Resumen (versión de la 036): las fotos sin la voz, y cuántas voces se pagaron. Cambia lo que devuelve:
--    se recrea.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_get_dashboard_summary(date, date);
create function public.admin_get_dashboard_summary(
  p_from date,
  p_to date
)
returns table (
  tokens_revenue_cents bigint,
  seasonal_revenue_cents bigint,
  ai_images bigint,
  -- Cuentas creadas en el periodo (fecha de alta de auth.users; profiles no la tiene).
  new_users bigint,
  -- Personas con al menos una compra aprobada; por primera vez: sin compras aprobadas antes del periodo.
  buyers bigint,
  first_time_buyers bigint,
  ai_users bigint,
  token_purchases bigint,
  tokens_sold bigint,
  seasonal_sales bigint,
  -- Lo más vendido; nulo si no hubo ventas. Los packs no tienen nombre: se identifican por sus tokens base.
  top_pack_tokens integer,
  top_pack_sales bigint,
  top_loteria_name text,
  top_loteria_sales bigint,
  -- Voces con IA del cantador pagadas en el periodo (no se devolvieron).
  ai_voices bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    raise exception 'Invalid period';
  end if;

  v_start := p_from::timestamp at time zone 'America/Hermosillo';
  v_end := (p_to + 1)::timestamp at time zone 'America/Hermosillo';

  return query
  with
  approved as (
    select tp.user_id, tp.created_at from public.token_purchases tp where tp.payment_status = 'approved'
    union all
    select sp.user_id, sp.created_at from public.seasonal_purchases sp where sp.status = 'approved'
  ),
  period_buyers as (
    select distinct a.user_id from approved a
     where a.user_id is not null and a.created_at >= v_start and a.created_at < v_end
  ),
  period_tokens as (
    select tp.base_tokens, tp.total_tokens, tp.amount_cents from public.token_purchases tp
     where tp.payment_status = 'approved' and tp.created_at >= v_start and tp.created_at < v_end
  ),
  period_seasonal as (
    select sp.loteria_id, sp.amount_cents from public.seasonal_purchases sp
     where sp.status = 'approved' and sp.created_at >= v_start and sp.created_at < v_end
  ),
  top_pack as (
    select pt.base_tokens, count(*)::bigint as sales from period_tokens pt
     group by pt.base_tokens order by sales desc, pt.base_tokens limit 1
  ),
  top_loteria as (
    select sl.name_es::text as name, count(*)::bigint as sales
      from period_seasonal ps join public.seasonal_loterias sl on sl.id = ps.loteria_id
     group by sl.id, sl.name_es order by sales desc, sl.name_es limit 1
  )
  select
    (select coalesce(sum(pt.amount_cents), 0)::bigint from period_tokens pt),
    (select coalesce(sum(ps.amount_cents), 0)::bigint from period_seasonal ps),
    (select coalesce(sum(tu.amount), 0)::bigint from public.token_usage tu
      where tu.reason is distinct from 'caller_voice' and tu.created_at >= v_start and tu.created_at < v_end),
    (select count(*)::bigint from auth.users u where u.created_at >= v_start and u.created_at < v_end),
    (select count(*)::bigint from period_buyers),
    (select count(*)::bigint from period_buyers pb
      where not exists (select 1 from approved a where a.user_id = pb.user_id and a.created_at < v_start)),
    (select count(distinct tu.user_id)::bigint from public.token_usage tu
      where tu.created_at >= v_start and tu.created_at < v_end),
    (select count(*)::bigint from period_tokens),
    (select coalesce(sum(pt.total_tokens), 0)::bigint from period_tokens pt),
    (select count(*)::bigint from period_seasonal),
    (select tpk.base_tokens from top_pack tpk),
    (select coalesce((select tpk.sales from top_pack tpk), 0)),
    (select tl.name from top_loteria tl),
    (select coalesce((select tl.sales from top_loteria tl), 0)),
    (select count(*)::bigint from public.token_usage tu
      where tu.reason = 'caller_voice' and tu.created_at >= v_start and tu.created_at < v_end);
end;
$$;

revoke all on function public.admin_get_dashboard_summary(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_dashboard_summary(date, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 3. Gráfica por día (037): igual separación.
-- ---------------------------------------------------------------------------
drop function if exists public.admin_get_dashboard_daily(date, date);
create function public.admin_get_dashboard_daily(
  p_from date,
  p_to date
)
returns table (
  day date,
  revenue_cents bigint,
  ai_images bigint,
  ai_voices bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_start timestamptz;
  v_end timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 366 then
    raise exception 'Invalid period';
  end if;

  v_start := p_from::timestamp at time zone 'America/Hermosillo';
  v_end := (p_to + 1)::timestamp at time zone 'America/Hermosillo';

  return query
  with
  revenue as (
    select (tp.created_at at time zone 'America/Hermosillo')::date as d, tp.amount_cents as cents
      from public.token_purchases tp
     where tp.payment_status = 'approved' and tp.created_at >= v_start and tp.created_at < v_end
    union all
    select (sp.created_at at time zone 'America/Hermosillo')::date, sp.amount_cents
      from public.seasonal_purchases sp
     where sp.status = 'approved' and sp.created_at >= v_start and sp.created_at < v_end
  ),
  usage as (
    select (tu.created_at at time zone 'America/Hermosillo')::date as d, tu.amount,
           tu.reason = 'caller_voice' as is_voice
      from public.token_usage tu
     where tu.created_at >= v_start and tu.created_at < v_end
  )
  select
    days.d::date,
    coalesce((select sum(r.cents) from revenue r where r.d = days.d::date), 0)::bigint,
    coalesce((select sum(u.amount) from usage u where u.d = days.d::date and u.is_voice is not true), 0)::bigint,
    (select count(*) from usage u where u.d = days.d::date and u.is_voice)::bigint
  from generate_series(p_from, p_to, interval '1 day') as days(d)
  order by 1;
end;
$$;

revoke all on function public.admin_get_dashboard_daily(date, date) from public, anon, authenticated;
grant execute on function public.admin_get_dashboard_daily(date, date) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Actividad del usuario (044): las fotos sin la voz; cada voz es un renglón «voice» con su lotería y,
--    en total_tokens, los tokens que costó.
-- ---------------------------------------------------------------------------
create or replace function public.admin_get_user_activity(
  p_user_id uuid,
  p_limit int default 200
)
returns table (
  -- 'tokens', 'seasonal', 'gift', 'ai', 'voice' o 'signup'.
  kind text,
  -- En la IA, la hora del último uso del grupo.
  occurred_at timestamptz,
  -- Estado del pago en compras de tokens y temáticas.
  status text,
  pack_id uuid,
  base_tokens integer,
  -- Tokens recibidos en compras de tokens y en regalos; tokens gastados en la voz.
  total_tokens integer,
  amount_cents integer,
  -- Nombre de la temática, o de la lotería en la IA y la voz (nulo si se borró).
  loteria_name text,
  method_type text,
  method_id text,
  reason text,
  ai_photos bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  return query
  with events as (
    select
      'tokens'::text as kind, tp.created_at as occurred_at, tp.payment_status as status, tp.pack_id,
      tp.base_tokens, tp.total_tokens, tp.amount_cents, null::text as loteria_name,
      tp.payment_metadata ->> 'payment_type_id' as method_type,
      tp.payment_metadata ->> 'payment_method_id' as method_id,
      null::text as reason, null::bigint as ai_photos
    from public.token_purchases tp
    where tp.user_id = p_user_id
    union all
    select
      'seasonal', sp.created_at, sp.status, null, null, null, sp.amount_cents, sl.name_es,
      sp.payment_metadata ->> 'payment_type_id', sp.payment_metadata ->> 'payment_method_id', null, null
    from public.seasonal_purchases sp
    join public.seasonal_loterias sl on sl.id = sp.loteria_id
    where sp.user_id = p_user_id and sp.status <> 'repeated'
    union all
    select 'gift', g.created_at, null, null, null, g.amount, null, null, null, null, g.reason, null
    from public.token_gifts g
    where g.recipient_id = p_user_id
    union all
    select 'ai', max(tu.created_at), null, null, null, null, null, ls.name, null, null, null, sum(tu.amount)::bigint
    from public.token_usage tu
    left join public.loteria_sets ls on ls.id = tu.set_id
    where tu.user_id = p_user_id and tu.reason is distinct from 'caller_voice'
    group by tu.set_id, ls.name, (tu.created_at at time zone 'America/Hermosillo')::date
    union all
    select 'voice', tu.created_at, null, null, null, tu.amount, null, ls.name, null, null, null, null
    from public.token_usage tu
    left join public.loteria_sets ls on ls.id = tu.set_id
    where tu.user_id = p_user_id and tu.reason = 'caller_voice'
    union all
    select 'signup', u.created_at, null, null, null, null, null, null, null, null, null, null
    from auth.users u
    where u.id = p_user_id
  )
  select e.*
  from events e
  order by e.occurred_at desc, e.kind
  limit least(greatest(coalesce(p_limit, 200), 1), 1000);
end;
$$;

revoke all on function public.admin_get_user_activity(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_get_user_activity(uuid, integer) to authenticated, service_role;
