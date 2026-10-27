-- Voz con IA: precio por bloques, «Ampliar la voz», audios compartidos y alerta de cupo (FEAT-58, US A4;
-- migración 071). 10 tokens cubren hasta 60 cartas y cada 10 más cuestan 2 (decisión 8); un audio copiado de los
-- compartidos no cuenta para el tope (decisión 12); una alerta de cupo por periodo (decisión 11).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000007101', 'cantador-bloques@test.dev'),
  ('00000000-0000-0000-0000-000000007102', 'otro-bloques@test.dev');
insert into public.user_tokens (user_id, balance) values
  ('00000000-0000-0000-0000-000000007101', 100),
  ('00000000-0000-0000-0000-000000007102', 100)
on conflict (user_id) do update set balance = excluded.balance;

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000071a1', '00000000-0000-0000-0000-000000007101', 'Chica'),
  ('00000000-0000-0000-0000-0000000071a2', '00000000-0000-0000-0000-000000007101', 'Grande'),
  ('00000000-0000-0000-0000-0000000071a3', '00000000-0000-0000-0000-000000007101', 'Sin voz');
insert into public.cards (user_id, set_id, title)
select '00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a1', 'Chica ' || i
from generate_series(1, 54) i;
insert into public.cards (user_id, set_id, title)
select '00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2', 'Grande ' || i
from generate_series(1, 62) i;
insert into public.cards (user_id, set_id, title)
select '00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a3', 'Sin voz ' || i
from generate_series(1, 30) i;

-- ---------------------------------------------------------------------------
-- Precio (decisión 8)
-- ---------------------------------------------------------------------------
select test.is(public.caller_voice_price(0), 10, 'sin cartas cuesta 10');
select test.is(public.caller_voice_price(54), 10, '54 cartas cuestan 10');
select test.is(public.caller_voice_price(60), 10, '60 cartas cuestan 10');
select test.is(public.caller_voice_price(61), 12, '61 cartas cuestan 12');
select test.is(public.caller_voice_price(70), 12, '70 cartas cuestan 12');
select test.is(public.caller_voice_price(71), 14, '71 cartas cuestan 14');
select test.is(public.caller_voice_price(100), 18, '100 cartas cuestan 18');

select public.start_caller_voice('00000000-0000-0000-0000-000000007101',
  '00000000-0000-0000-0000-0000000071a1', 'y2ijeTfmnXjzheHO6zeN');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000007101'),
  90, 'una lotería de 54 cartas paga 10');
select test.is((select covered_cards from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000071a1'),
  60, 'y quedan cubiertas 60 cartas');

select public.start_caller_voice('00000000-0000-0000-0000-000000007101',
  '00000000-0000-0000-0000-0000000071a2', 'y2ijeTfmnXjzheHO6zeN');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000007101'),
  78, 'una lotería de 62 cartas paga 12');
select test.is((select covered_cards from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000071a2'),
  70, 'y quedan cubiertas 70 cartas');
select test.is(
  (select amount from public.token_usage
    where set_id = '00000000-0000-0000-0000-0000000071a2' and reason = 'caller_voice'),
  12, 'el cobro guarda los 12 tokens');

-- ---------------------------------------------------------------------------
-- Cartas fuera de lo cubierto: voz del navegador hasta ampliar
-- ---------------------------------------------------------------------------
insert into public.cards (user_id, set_id, title)
select '00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2', 'Nueva ' || i
from generate_series(1, 10) i;
-- Las primeras 70 cartas ya tienen su audio
insert into public.caller_audios (card_id, set_id, user_id, title, path)
select c.id, c.set_id, c.user_id, c.title, 'x/' || c.id || '.mp3'
from public.cards c where c.set_id = '00000000-0000-0000-0000-0000000071a2'
order by c.title limit 70;
update public.caller_voices set generated_audios = 70 where set_id = '00000000-0000-0000-0000-0000000071a2';

select test.throws(format($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000007101',
    '00000000-0000-0000-0000-0000000071a2', %L)
$$, (select c.id from public.cards c where c.set_id = '00000000-0000-0000-0000-0000000071a2'
      and not exists (select 1 from public.caller_audios a where a.card_id = c.id) limit 1)),
  'VOICE_NOT_COVERED', 'con las 70 cartas cubiertas ya con audio, la 71 no se genera');
update public.cards set title = 'Grande renombrada'
where id = (select card_id from public.caller_audios where set_id = '00000000-0000-0000-0000-0000000071a2' limit 1);
select test.is(
  public.reserve_caller_audio('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2',
    (select c.id from public.cards c where c.title = 'Grande renombrada')),
  'Grande renombrada', 'una carta cubierta que se renombra sí se regenera');

-- Ampliar: 72 cartas, 70 cubiertas → un bloque de 10 por 2 tokens
select test.is(
  public.expand_caller_voice('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2'),
  2, 'ampliar cobra 2 tokens por el bloque que falta');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000007101'),
  76, 'y los descuenta');
select test.is((select covered_cards from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000071a2'),
  80, 'ahora cubre 80 cartas');
select test.is(
  (select amount from public.token_usage
    where set_id = '00000000-0000-0000-0000-0000000071a2' and reason = 'caller_voice'),
  14, 'el cobro de la voz suma lo de ampliar (una sola voz por lotería en los reportes)');
select test.is(
  public.reserve_caller_audio('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2',
    (select c.id from public.cards c where c.set_id = '00000000-0000-0000-0000-0000000071a2'
      and not exists (select 1 from public.caller_audios a where a.card_id = c.id) order by c.title limit 1)) is not null,
  true, 'después de ampliar, la carta 71 sí se genera');
select test.throws($$
  select public.expand_caller_voice('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2')
$$, 'NOTHING_TO_EXPAND', 'con todas las cartas cubiertas no hay nada que ampliar');

insert into public.cards (user_id, set_id, title)
select '00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2', 'Otra ' || i
from generate_series(1, 25) i;
-- 97 cartas con 80 cubiertas: faltan 2 bloques, 4 tokens
update public.user_tokens set balance = 3 where user_id = '00000000-0000-0000-0000-000000007101';
select test.throws($$
  select public.expand_caller_voice('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2')
$$, 'INSUFFICIENT_TOKENS', 'sin saldo suficiente no se amplía');
select test.is((select covered_cards from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000071a2'),
  80, 'y la cobertura no cambia');
select test.throws($$
  select public.expand_caller_voice('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a3')
$$, 'VOICE_NOT_PAID', 'no se amplía una lotería sin voz');
select test.throws($$
  select public.expand_caller_voice('00000000-0000-0000-0000-000000007102', '00000000-0000-0000-0000-0000000071a2')
$$, 'VOICE_NOT_PAID', 'nadie amplía la voz de otra persona');

-- ---------------------------------------------------------------------------
-- Audios compartidos: copiar no cuenta para el tope (decisión 12)
-- ---------------------------------------------------------------------------
-- La lotería chica (54 cartas, 60 cubiertas) llega a su tope: 54 + 10 = 64
update public.caller_voices set generated_audios = 64 where set_id = '00000000-0000-0000-0000-0000000071a1';
select test.throws(format($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000007101',
    '00000000-0000-0000-0000-0000000071a1', %L)
$$, (select id from public.cards where title = 'Chica 1')), 'VOICE_LIMIT', 'en el tope no se genera');
select test.is(
  public.reserve_caller_audio('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a1',
    (select id from public.cards where title = 'Chica 1'), true),
  'Chica 1', 'pero un audio compartido sí se copia');
select test.is((select generated_audios from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000071a1'),
  64, 'y no se cuenta');

-- ---------------------------------------------------------------------------
-- Las voces pagadas antes de los bloques cubren todas las cartas que ya tenían
-- ---------------------------------------------------------------------------
select test.is(
  (select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'caller_voices' and column_name = 'covered_cards'),
  '60', 'una voz nueva cubre 60 cartas de inicio');

-- ---------------------------------------------------------------------------
-- Alerta de cupo: una por periodo de ElevenLabs (decisión 11)
-- ---------------------------------------------------------------------------
select test.is(public.claim_voice_quota_alert('1795562086'), true, 'la primera alerta del periodo se envía');
select test.is(public.claim_voice_quota_alert('1795562086'), false, 'la segunda del mismo periodo no');
select public.release_voice_quota_alert('1795562086');
select test.is(public.claim_voice_quota_alert('1795562086'), true, 'si el correo falló, se puede volver a intentar');
select test.is(public.claim_voice_quota_alert('1798240486'), true, 'el periodo siguiente tiene su propia alerta');

-- ---------------------------------------------------------------------------
-- Permisos: solo el servidor
-- ---------------------------------------------------------------------------
select test.as_user('00000000-0000-0000-0000-000000007101');
select test.throws($$
  select public.expand_caller_voice('00000000-0000-0000-0000-000000007101', '00000000-0000-0000-0000-0000000071a2')
$$, '42501', 'un usuario no puede ampliarse la voz directamente');
select test.throws($$ select public.claim_voice_quota_alert('x') $$, '42501', 'un usuario no marca alertas');
select test.throws($$ select count(*) from public.voice_quota_alerts $$, '42501', 'ni las ve');

rollback;
