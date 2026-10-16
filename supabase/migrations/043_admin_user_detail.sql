-- Ficha del usuario en la pestaña Usuarios (FEAT-45, US A2): datos de la cuenta, cómo entró (Google o
-- correo, de auth.users), saldo y cuatro números: lo pagado en compras aprobadas (y cuántas), tokens gastados
-- en IA, loterías guardadas (y temáticas compradas) y tokens regalados por administradores.
-- Lo pagado sigue la misma regla que la lista (042): pendientes y avisos repetidos no cuentan.
-- El regalo se hace con admin_gift_tokens (026), sin cambios.

create or replace function public.admin_get_user_detail(p_user_id uuid)
returns table (
  user_id uuid,
  email text,
  -- Nulo si la cuenta no tiene nombre.
  full_name text,
  created_at timestamptz,
  -- 'google', 'email' u otro proveedor de Supabase; nulo si no se sabe.
  provider text,
  balance integer,
  paid_cents bigint,
  purchases_count bigint,
  ai_tokens bigint,
  loterias_count bigint,
  seasonal_count bigint,
  gifted_tokens bigint
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
  select
    u.id,
    coalesce(nullif(btrim(pr.email), ''), u.email),
    nullif(btrim(pr.full_name), ''),
    u.created_at,
    nullif(u.raw_app_meta_data->>'provider', ''),
    coalesce(ut.balance, 0),
    coalesce(tp.paid, 0) + coalesce(sp.paid, 0),
    coalesce(tp.n, 0) + coalesce(sp.n, 0),
    (select coalesce(sum(x.amount), 0)::bigint from public.token_usage x where x.user_id = u.id),
    (select count(*)::bigint from public.loteria_sets ls where ls.user_id = u.id),
    coalesce(sp.n, 0),
    (select coalesce(sum(g.amount), 0)::bigint from public.token_gifts g where g.recipient_id = u.id)
  from auth.users u
  left join public.profiles pr on pr.id = u.id
  left join public.user_tokens ut on ut.user_id = u.id
  left join lateral (
    select sum(t.amount_cents)::bigint as paid, count(*)::bigint as n
    from public.token_purchases t
    where t.user_id = u.id and t.payment_status = 'approved'
  ) tp on true
  left join lateral (
    select sum(s.amount_cents)::bigint as paid, count(*)::bigint as n
    from public.seasonal_purchases s
    where s.user_id = u.id and s.status = 'approved'
  ) sp on true
  where u.id = p_user_id;
end;
$$;

comment on function public.admin_get_user_detail is
  'Admin: ficha de un usuario (datos, cómo entró, saldo y sus números) para la pestaña Usuarios.';

-- Supabase concede EXECUTE a anon y authenticated por privilegios por defecto: se revoca por nombre.
revoke all on function public.admin_get_user_detail(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_user_detail(uuid) to authenticated, service_role;
