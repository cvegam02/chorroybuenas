-- Voz con IA: cerrar abusos (FEAT-58, US A3; H14 y H17).
--   · Títulos de cartas de máximo 50 caracteres al crear o renombrar (decisión 6).
--   · Audios gratis hasta las cartas de la lotería más 10, y 20 regeneraciones por minuto por usuario (decisión 7).
--   · La frase de arranque cuenta para la devolución, y un audio que termina después de devolver la voz no se
--     registra (decisión 10).
-- Lo usa solo el servidor (edge function caller-voice con service role).

-- ---------------------------------------------------------------------------
-- 1. Título de máximo 50 caracteres (decisión 6). Las cartas guardadas antes con títulos más largos no se tocan:
--    la regla aplica al crear o al cambiar el título, no al editar otra cosa de la carta.
-- ---------------------------------------------------------------------------
create or replace function public.check_card_title_length()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (tg_op = 'INSERT' or new.title is distinct from old.title) and char_length(new.title) > 50 then
    raise exception 'TITLE_TOO_LONG';
  end if;
  return new;
end;
$$;

drop trigger if exists cards_title_length on public.cards;
create trigger cards_title_length
  before insert or update of title on public.cards
  for each row execute function public.check_card_title_length();

-- ---------------------------------------------------------------------------
-- 2. Cuántos audios de cartas se han generado en cada lotería (sin la frase de arranque), para el tope.
--    Las voces ya pagadas empiezan con los audios que ya tienen.
-- ---------------------------------------------------------------------------
alter table public.caller_voices
  add column if not exists generated_audios integer not null default 0;

update public.caller_voices v
set generated_audios = (select count(*) from public.caller_audios a where a.set_id = v.set_id)
where generated_audios = 0;

-- Regeneraciones recientes de cada usuario, para el límite por minuto. Solo la lee y escribe el servidor.
create table if not exists public.caller_voice_regenerations (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  set_id uuid references public.loteria_sets (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists caller_voice_regenerations_user_idx
  on public.caller_voice_regenerations (user_id, created_at);

comment on table public.caller_voice_regenerations is
  'FEAT-58: audios regenerados por renombrar una carta, para el límite de 20 por minuto. Solo el servidor.';

alter table public.caller_voice_regenerations enable row level security;
revoke all on public.caller_voice_regenerations from anon, authenticated;
grant all on public.caller_voice_regenerations to service_role;

-- ---------------------------------------------------------------------------
-- 3. Reservar el audio de una carta antes de pedirlo a ElevenLabs. Devuelve el título que se va a decir, o null
--    si la carta ya tiene el audio de su título. Lanza VOICE_NOT_PAID, CARD_NOT_FOUND, VOICE_LIMIT (tope de la
--    lotería) o RATE_LIMITED (más de 20 regeneraciones en el último minuto).
-- ---------------------------------------------------------------------------
create or replace function public.reserve_caller_audio(p_user_id uuid, p_set_id uuid, p_card_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Audios gratis de más sobre las cartas de la lotería (decisión 7).
  v_extra_audios constant integer := 10;
  v_regenerations_per_minute constant integer := 20;
  v_generated integer;
  v_title text;
  v_audio_title text;
  v_has_audio boolean;
begin
  -- Bloquea la voz: dos reservas de la misma lotería no se cuentan a la vez, y la devolución espera.
  select generated_audios into v_generated
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

  -- Borrar una carta y volver a crearla no da audios gratis: el tope sale de las cartas que tiene hoy.
  if v_generated >= (select count(*) from public.cards where set_id = p_set_id) + v_extra_audios then
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

-- Si ElevenLabs o la subida fallan, el audio reservado no se cuenta.
create or replace function public.release_caller_audio(p_set_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.caller_voices set generated_audios = greatest(generated_audios - 1, 0) where set_id = p_set_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Registrar un audio ya subido (p_card_id null: la frase de arranque). Devuelve false si la voz ya se devolvió
--    o la carta ya no existe; entonces el servidor borra el archivo.
-- ---------------------------------------------------------------------------
create or replace function public.save_caller_audio(
  p_user_id uuid, p_set_id uuid, p_card_id uuid, p_title text, p_path text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- El mismo bloqueo que la devolución: o se registra antes y ya no hay devolución, o se devolvió antes y no
  -- se registra.
  perform 1 from public.caller_voices where set_id = p_set_id and user_id = p_user_id for update;
  if not found then
    return false;
  end if;

  if p_card_id is null then
    update public.caller_voices set intro_path = p_path where set_id = p_set_id;
    return true;
  end if;

  if not exists (select 1 from public.cards where id = p_card_id and set_id = p_set_id) then
    return false;
  end if;
  insert into public.caller_audios (card_id, set_id, user_id, title, path)
  values (p_card_id, p_set_id, p_user_id, p_title, p_path)
  on conflict (card_id) do update set title = excluded.title, path = excluded.path;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Devolución: solo si no salió ninguna carta ni la frase de arranque (decisión 10), con la voz bloqueada para
--    no competir con un audio que se está registrando.
-- ---------------------------------------------------------------------------
create or replace function public.refund_caller_voice(p_set_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage_id uuid;
  v_intro_path text;
begin
  select usage_id, intro_path into v_usage_id, v_intro_path
  from public.caller_voices where set_id = p_set_id
  for update;
  if not found then
    return;
  end if;

  if v_intro_path is not null or exists (select 1 from public.caller_audios where set_id = p_set_id) then
    raise exception 'AUDIOS_EXIST';
  end if;

  delete from public.caller_voices where set_id = p_set_id;

  if v_usage_id is not null then
    perform public.refund_token_usage(v_usage_id);
  end if;
end;
$$;

comment on function public.reserve_caller_audio is
  'FEAT-58: reserva el audio de una carta (tope: cartas + 10; 20 regeneraciones por minuto). Devuelve el título o null si ya lo tiene. Solo service_role.';
comment on function public.release_caller_audio is
  'FEAT-58: libera un audio reservado que no se pudo generar. Solo service_role.';
comment on function public.save_caller_audio is
  'FEAT-58: registra un audio generado (carta, o frase de arranque con p_card_id null); false si la voz se devolvió o la carta ya no existe. Solo service_role.';
comment on function public.refund_caller_voice is
  'FEAT-55/58: devuelve la voz con IA si no salió ninguna carta ni la frase de arranque (si no, AUDIOS_EXIST). Idempotente. Solo service_role.';

revoke all on function public.reserve_caller_audio(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.release_caller_audio(uuid) from public, anon, authenticated;
revoke all on function public.save_caller_audio(uuid, uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.refund_caller_voice(uuid) from public, anon, authenticated;
grant execute on function public.reserve_caller_audio(uuid, uuid, uuid) to service_role;
grant execute on function public.release_caller_audio(uuid) to service_role;
grant execute on function public.save_caller_audio(uuid, uuid, uuid, text, text) to service_role;
grant execute on function public.refund_caller_voice(uuid) to service_role;
