-- Voz con IA: precio por bloques, «Ampliar la voz», audios compartidos y alerta de cupo (FEAT-58, US A4; H15, H18,
-- H19). Reabre las decisiones 11 y 23 de FEAT-55.
--   · 10 tokens cubren hasta 60 cartas; cada 10 cartas más cuestan 2 (decisión 8). Si la lotería pasa de lo
--     cubierto, las cartas sin audio de más se cantan con la voz del navegador hasta «Ampliar la voz».
--   · Un audio copiado de los compartidos (misma voz y mismo texto) no gasta créditos: no cuenta para el tope ni
--     para el límite por minuto (decisión 12). Los archivos compartidos los guarda el servidor en
--     `caller-audio/shared/…`, donde ninguna regla deja leer a los usuarios.
--   · Una alerta de cupo bajo por periodo de ElevenLabs (decisión 11).
-- Lo usa solo el servidor (edge function caller-voice con service role).

-- ---------------------------------------------------------------------------
-- 1. Precio y cartas cubiertas
-- ---------------------------------------------------------------------------
create or replace function public.caller_voice_price(p_cards integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 10 + 2 * ceil(greatest(coalesce(p_cards, 0) - 60, 0) / 10.0)::integer;
$$;

-- Cartas que cubre lo pagado: 60, más 10 por cada bloque.
create or replace function public.caller_voice_coverage(p_cards integer)
returns integer
language sql
immutable
set search_path = ''
as $$
  select 60 + 10 * ceil(greatest(coalesce(p_cards, 0) - 60, 0) / 10.0)::integer;
$$;

-- Las voces pagadas antes de los bloques pagaron «tenga las cartas que tenga»: cubren todas las que ya tenían.
alter table public.caller_voices add column if not exists covered_cards integer not null default 60;
update public.caller_voices v
set covered_cards = greatest(60, (select count(*) from public.cards c where c.set_id = v.set_id))
where covered_cards = 60;

-- ---------------------------------------------------------------------------
-- 2. Cobro según las cartas de la lotería
-- ---------------------------------------------------------------------------
create or replace function public.start_caller_voice(p_user_id uuid, p_set_id uuid, p_voice_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cards integer;
  v_price integer;
  v_usage_id uuid;
begin
  if p_voice_id is null or p_voice_id not in (
    'y2ijeTfmnXjzheHO6zeN', 'qRUgOhnxGASxirG4fKjv', 'gbTn1bmCvNgk0QEAVyfM', 'iDEmt5MnqUotdwCIVplo',
    'hHjbwzYZW17oh0p05AKv', 'twZzvyYIl5ntDHC1Vatv', 'ay4iqk10DLwc8KGSrf2t', 'JYyJjNPfmNJdaby8LdZs') then
    raise exception 'INVALID_VOICE';
  end if;

  if not exists (select 1 from public.loteria_sets where id = p_set_id and user_id = p_user_id) then
    raise exception 'SET_NOT_FOUND';
  end if;

  if exists (select 1 from public.caller_voices where set_id = p_set_id) then
    raise exception 'VOICE_ALREADY_CREATED';
  end if;

  select count(*) into v_cards from public.cards where set_id = p_set_id;
  v_price := public.caller_voice_price(v_cards);

  -- Un solo UPDATE condicional: no hay ventana entre leer el saldo y descontarlo.
  update public.user_tokens
  set balance = balance - v_price, updated_at = now()
  where user_id = p_user_id and balance >= v_price;

  if not found then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  insert into public.token_usage (user_id, amount, reason, set_id)
  values (p_user_id, v_price, 'caller_voice', p_set_id)
  returning id into v_usage_id;

  -- Dos cobros simultáneos de la misma lotería: el segundo choca aquí y se deshace completo.
  begin
    insert into public.caller_voices (set_id, user_id, voice_id, usage_id, covered_cards)
    values (p_set_id, p_user_id, p_voice_id, v_usage_id, public.caller_voice_coverage(v_cards));
  exception when unique_violation then
    raise exception 'VOICE_ALREADY_CREATED';
  end;

  return v_usage_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. «Ampliar la voz»: cobra los bloques que faltan para cubrir todas las cartas. El cobro se suma al de la voz
--    (un solo renglón de uso por lotería: los reportes del panel cuentan una voz por renglón, migración 061).
--    Devuelve los tokens cobrados. Lanza VOICE_NOT_PAID, NOTHING_TO_EXPAND o INSUFFICIENT_TOKENS.
-- ---------------------------------------------------------------------------
create or replace function public.expand_caller_voice(p_user_id uuid, p_set_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_covered integer;
  v_usage_id uuid;
  v_cards integer;
  v_price integer;
begin
  select covered_cards, usage_id into v_covered, v_usage_id
  from public.caller_voices where set_id = p_set_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'VOICE_NOT_PAID';
  end if;

  select count(*) into v_cards from public.cards where set_id = p_set_id;
  if v_cards <= v_covered then
    raise exception 'NOTHING_TO_EXPAND';
  end if;
  v_price := 2 * ceil((v_cards - v_covered) / 10.0)::integer;

  update public.user_tokens
  set balance = balance - v_price, updated_at = now()
  where user_id = p_user_id and balance >= v_price;
  if not found then
    raise exception 'INSUFFICIENT_TOKENS';
  end if;

  update public.token_usage set amount = amount + v_price where id = v_usage_id;
  if not found then
    insert into public.token_usage (user_id, amount, reason, set_id)
    values (p_user_id, v_price, 'caller_voice', p_set_id)
    returning id into v_usage_id;
  end if;

  update public.caller_voices
  set covered_cards = v_covered + 10 * ceil((v_cards - v_covered) / 10.0)::integer, usage_id = v_usage_id
  where set_id = p_set_id;
  return v_price;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Reservar un audio: lo de la migración 069, más la cobertura y los audios compartidos. Una carta sin audio
--    solo se genera mientras haya menos audios que cartas cubiertas (VOICE_NOT_COVERED). Con p_shared, el audio
--    se copia de los compartidos: no cuenta para el tope ni para el límite por minuto.
-- ---------------------------------------------------------------------------
drop function if exists public.reserve_caller_audio(uuid, uuid, uuid);

create or replace function public.reserve_caller_audio(
  p_user_id uuid, p_set_id uuid, p_card_id uuid, p_shared boolean default false)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_extra_audios constant integer := 10;
  v_regenerations_per_minute constant integer := 20;
  v_generated integer;
  v_covered integer;
  v_title text;
  v_audio_title text;
  v_has_audio boolean;
begin
  -- Bloquea la voz: dos reservas de la misma lotería no se cuentan a la vez, y la devolución espera.
  select generated_audios, covered_cards into v_generated, v_covered
  from public.caller_voices where set_id = p_set_id and user_id = p_user_id
  for update;
  if not found then
    raise exception 'VOICE_NOT_PAID';
  end if;

  select title into v_title from public.cards where id = p_card_id and set_id = p_set_id and user_id = p_user_id;
  if not found then
    raise exception 'CARD_NOT_FOUND';
  end if;

  select title into v_audio_title from public.caller_audios where card_id = p_card_id;
  v_has_audio := found;
  if v_has_audio and v_audio_title = v_title then
    return null;
  end if;

  if not v_has_audio and (select count(*) from public.caller_audios where set_id = p_set_id) >= v_covered then
    raise exception 'VOICE_NOT_COVERED';
  end if;

  if p_shared then
    return v_title;
  end if;

  -- Borrar una carta y volver a crearla no da audios gratis: el tope sale de las cartas cubiertas que tiene hoy.
  if v_generated >= least((select count(*) from public.cards where set_id = p_set_id), v_covered) + v_extra_audios then
    raise exception 'VOICE_LIMIT';
  end if;

  -- El primer audio de una carta no tiene límite por minuto: lo limita el número de cartas.
  if v_has_audio then
    perform pg_advisory_xact_lock(hashtext('caller_voice_regenerations'), hashtext(p_user_id::text));
    delete from public.caller_voice_regenerations
    where user_id = p_user_id and created_at < now() - interval '1 hour';
    if (select count(*) from public.caller_voice_regenerations
        where user_id = p_user_id and created_at > now() - interval '1 minute') >= v_regenerations_per_minute then
      raise exception 'RATE_LIMITED';
    end if;
    insert into public.caller_voice_regenerations (user_id, set_id) values (p_user_id, p_set_id);
  end if;

  update public.caller_voices set generated_audios = generated_audios + 1 where set_id = p_set_id;
  return v_title;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Alerta de cupo bajo: una por periodo de facturación de ElevenLabs. Si el correo falla, se libera.
-- ---------------------------------------------------------------------------
create table if not exists public.voice_quota_alerts (
  period text primary key,
  sent_at timestamptz not null default now()
);

comment on table public.voice_quota_alerts is
  'FEAT-58: alertas de cupo bajo de la voz con IA ya enviadas, una por periodo de ElevenLabs. Solo el servidor.';

alter table public.voice_quota_alerts enable row level security;
revoke all on public.voice_quota_alerts from anon, authenticated;
grant all on public.voice_quota_alerts to service_role;

create or replace function public.claim_voice_quota_alert(p_period text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.voice_quota_alerts (period) values (p_period) on conflict (period) do nothing;
  return found;
end;
$$;

create or replace function public.release_voice_quota_alert(p_period text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.voice_quota_alerts where period = p_period;
$$;

comment on function public.caller_voice_price is
  'FEAT-58: tokens de la voz con IA según las cartas: 10 hasta 60 y 2 por cada 10 más.';
comment on function public.start_caller_voice is
  'FEAT-55/58: cobra la voz con IA según las cartas de la lotería. Lanza INVALID_VOICE, SET_NOT_FOUND, VOICE_ALREADY_CREATED o INSUFFICIENT_TOKENS. Solo service_role.';
comment on function public.expand_caller_voice is
  'FEAT-58: «Ampliar la voz»: cobra 2 tokens por cada 10 cartas sin cubrir. Lanza VOICE_NOT_PAID, NOTHING_TO_EXPAND o INSUFFICIENT_TOKENS. Solo service_role.';
comment on function public.reserve_caller_audio is
  'FEAT-58: reserva el audio de una carta (cobertura; tope: cartas cubiertas + 10; 20 regeneraciones por minuto; un audio compartido no cuenta). Devuelve el título o null si ya lo tiene. Solo service_role.';

revoke all on function public.caller_voice_price(integer) from public, anon;
revoke all on function public.caller_voice_coverage(integer) from public, anon;
grant execute on function public.caller_voice_price(integer) to authenticated, service_role;
grant execute on function public.caller_voice_coverage(integer) to authenticated, service_role;
revoke all on function public.start_caller_voice(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.expand_caller_voice(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reserve_caller_audio(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.claim_voice_quota_alert(text) from public, anon, authenticated;
revoke all on function public.release_voice_quota_alert(text) from public, anon, authenticated;
grant execute on function public.start_caller_voice(uuid, uuid, text) to service_role;
grant execute on function public.expand_caller_voice(uuid, uuid) to service_role;
grant execute on function public.reserve_caller_audio(uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.claim_voice_quota_alert(text) to service_role;
grant execute on function public.release_voice_quota_alert(text) to service_role;
