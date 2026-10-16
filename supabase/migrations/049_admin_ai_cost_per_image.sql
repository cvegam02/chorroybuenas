-- Costo de IA por imagen editable desde Precios y promos (FEAT-47, US A1; contexto-negocio.md §10).
-- Es lo que cobra Replicate por GPT-Image en calidad low (US$0.012 al 2026-10-15). El panel lo usa
-- para estimar el gasto en IA del Resumen. Dice cuánto deja cada venta, así que no va en
-- app_config (que cualquiera lee): tabla de una sola fila, sin reglas de acceso, solo por funciones
-- de administrador.

create table if not exists public.ai_cost_settings (
  id boolean primary key default true check (id),
  cost_per_image_usd numeric(10, 6) not null check (cost_per_image_usd > 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_cost_settings enable row level security;

comment on table public.ai_cost_settings is
  'FEAT-47: costo por imagen de IA en USD con que el panel estima el gasto. Una sola fila.';

insert into public.ai_cost_settings (id, cost_per_image_usd) values (true, 0.012)
on conflict (id) do nothing;

create or replace function public.admin_get_ai_cost_per_image()
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
  return (select cost_per_image_usd from public.ai_cost_settings where id);
end;
$$;

create or replace function public.admin_set_ai_cost_per_image(p_cost_usd numeric)
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

  insert into public.ai_cost_settings (id, cost_per_image_usd, updated_at)
  values (true, p_cost_usd, now())
  on conflict (id) do update
    set cost_per_image_usd = excluded.cost_per_image_usd,
        updated_at = excluded.updated_at
  returning cost_per_image_usd into v_cost;

  return v_cost;
end;
$$;

comment on function public.admin_get_ai_cost_per_image() is
  'FEAT-47: el administrador lee el costo por imagen de IA (USD).';
comment on function public.admin_set_ai_cost_per_image(numeric) is
  'FEAT-47: el administrador cambia el costo por imagen de IA (USD, mayor que cero).';

revoke all on function public.admin_get_ai_cost_per_image() from public, anon, authenticated;
revoke all on function public.admin_set_ai_cost_per_image(numeric) from public, anon, authenticated;
grant execute on function public.admin_get_ai_cost_per_image() to authenticated, service_role;
grant execute on function public.admin_set_ai_cost_per_image(numeric) to authenticated, service_role;
