-- Actividad de la ficha del usuario (FEAT-45, US A3): una línea de tiempo con sus compras de tokens (todas,
-- cualquier estado), compras de temáticas (sin los avisos repetidos de Mercado Pago), regalos con su motivo,
-- su registro y el uso de IA agrupado por lotería y día en hora de Hermosillo, no foto por foto.
-- Del objeto de pago solo sale el método (tipo y marca), como en el detalle de Ventas (041).
-- El registro no trae los tokens de bienvenida: no se guarda cuántos recibió (decisión 12).

create or replace function public.admin_get_user_activity(
  p_user_id uuid,
  p_limit int default 200
)
returns table (
  -- 'tokens', 'seasonal', 'gift', 'ai' o 'signup'.
  kind text,
  -- En la IA, la hora del último uso del grupo.
  occurred_at timestamptz,
  -- Estado del pago en compras de tokens y temáticas.
  status text,
  pack_id uuid,
  base_tokens integer,
  -- Tokens recibidos en compras de tokens y en regalos.
  total_tokens integer,
  amount_cents integer,
  -- Nombre de la temática, o de la lotería en la IA (nulo si se borró).
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
    where tu.user_id = p_user_id
    group by tu.set_id, ls.name, (tu.created_at at time zone 'America/Hermosillo')::date
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

comment on function public.admin_get_user_activity is
  'Admin: línea de tiempo de un usuario para su ficha en la pestaña Usuarios, con la IA agrupada por lotería y día.';

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_get_user_activity(uuid, integer) from public, anon, authenticated;
grant execute on function public.admin_get_user_activity(uuid, integer) to authenticated, service_role;
