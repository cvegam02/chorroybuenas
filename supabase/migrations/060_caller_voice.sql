-- Voz con IA del cantador (FEAT-55, US A6): 10 tokens por lotería, una sola vez y sin el límite por minuto;
-- devolución solo si no salió ninguna carta; audios privados de su dueño. Lo escribe solo el servidor
-- (edge function con service role).

-- ---------------------------------------------------------------------------
-- 1. La voz de cada lotería: una por lotería, con la voz escogida (decisión 22).
-- ---------------------------------------------------------------------------
create table if not exists public.caller_voices (
  set_id uuid primary key references public.loteria_sets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  voice_id text not null check (voice_id in (
    'Spanish_Narrator', 'Spanish_Steadymentor', 'Spanish_WiseScholar', 'Spanish_Wiselady')),
  -- El cobro, para devolverlo si no sale ninguna carta.
  usage_id uuid references public.token_usage (id) on delete set null,
  -- «Se va y se corre con…» con la voz escogida (decisión 23); vacío si falló.
  intro_path text,
  created_at timestamptz default now() not null
);

comment on table public.caller_voices is
  'FEAT-55: voz con IA pagada de una lotería y la voz escogida. Solo la escribe el servidor.';

-- ---------------------------------------------------------------------------
-- 2. El audio de cada carta, con el título que dice (si la carta se renombra, se genera otro).
-- ---------------------------------------------------------------------------
create table if not exists public.caller_audios (
  card_id uuid primary key references public.cards (id) on delete cascade,
  set_id uuid not null references public.loteria_sets (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  path text not null,
  created_at timestamptz default now() not null
);

create index if not exists caller_audios_set_idx on public.caller_audios (set_id);

comment on table public.caller_audios is
  'FEAT-55: audio con voz de IA del título de una carta, en el bucket caller-audio. Solo lo escribe el servidor.';

alter table public.caller_voices enable row level security;
alter table public.caller_audios enable row level security;

drop policy if exists "Owners read their caller voice" on public.caller_voices;
create policy "Owners read their caller voice" on public.caller_voices
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Owners read their caller audios" on public.caller_audios;
create policy "Owners read their caller audios" on public.caller_audios
  for select to authenticated using (user_id = auth.uid());

-- Supabase concede todo a anon y authenticated por privilegios por defecto: el dueño solo lee.
revoke all on public.caller_voices, public.caller_audios from anon, authenticated;
grant select on public.caller_voices, public.caller_audios to authenticated;
grant all on public.caller_voices, public.caller_audios to service_role;

-- ---------------------------------------------------------------------------
-- 3. Bucket privado: usuario/lotería/carta.mp3. El dueño descarga y borra (al borrar la carta o la lotería,
--    como sus fotos); solo el servidor sube.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('caller-audio', 'caller-audio', false, 1048576, array['audio/mpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can read own caller audio" on storage.objects;
create policy "Users can read own caller audio"
on storage.objects for select
to authenticated
using (
  bucket_id = 'caller-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own caller audio" on storage.objects;
create policy "Users can delete own caller audio"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'caller-audio'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- ---------------------------------------------------------------------------
-- 4. Cobro: 10 tokens, una sola vez por lotería, sin el límite de 10 por minuto (decisiones 11 y 13).
-- ---------------------------------------------------------------------------
create or replace function public.start_caller_voice(p_user_id uuid, p_set_id uuid, p_voice_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_price constant integer := 10;
  v_usage_id uuid;
begin
  if p_voice_id is null or p_voice_id not in (
    'Spanish_Narrator', 'Spanish_Steadymentor', 'Spanish_WiseScholar', 'Spanish_Wiselady') then
    raise exception 'INVALID_VOICE';
  end if;

  if not exists (select 1 from public.loteria_sets where id = p_set_id and user_id = p_user_id) then
    raise exception 'SET_NOT_FOUND';
  end if;

  if exists (select 1 from public.caller_voices where set_id = p_set_id) then
    raise exception 'VOICE_ALREADY_CREATED';
  end if;

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
    insert into public.caller_voices (set_id, user_id, voice_id, usage_id)
    values (p_set_id, p_user_id, p_voice_id, v_usage_id);
  exception when unique_violation then
    raise exception 'VOICE_ALREADY_CREATED';
  end;

  return v_usage_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Devolución: solo si no salió ninguna carta; después se puede intentar otra vez (decisión 25).
-- ---------------------------------------------------------------------------
create or replace function public.refund_caller_voice(p_set_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usage_id uuid;
begin
  if exists (select 1 from public.caller_audios where set_id = p_set_id) then
    raise exception 'AUDIOS_EXIST';
  end if;

  delete from public.caller_voices where set_id = p_set_id
  returning usage_id into v_usage_id;

  if v_usage_id is not null then
    perform public.refund_token_usage(v_usage_id);
  end if;
end;
$$;

comment on function public.start_caller_voice is
  'FEAT-55: cobra 10 tokens por la voz con IA de una lotería. Lanza INVALID_VOICE, SET_NOT_FOUND, VOICE_ALREADY_CREATED o INSUFFICIENT_TOKENS. Solo service_role.';
comment on function public.refund_caller_voice is
  'FEAT-55: devuelve la voz con IA si no salió ninguna carta (si salió alguna, AUDIOS_EXIST). Idempotente. Solo service_role.';

revoke all on function public.start_caller_voice(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.refund_caller_voice(uuid) from public, anon, authenticated;
grant execute on function public.start_caller_voice(uuid, uuid, text) to service_role;
grant execute on function public.refund_caller_voice(uuid) to service_role;
