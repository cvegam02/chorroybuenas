-- Voz con IA del cantador (FEAT-55, US A6; migración 060): cobro de 10 tokens por lotería, una sola vez,
-- sin el límite por minuto; devolución solo si fallan todas las cartas; audios privados de su dueño.
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000006001', 'cantador@test.dev'),
  ('00000000-0000-0000-0000-000000006002', 'otra-cantadora@test.dev');
insert into public.user_tokens (user_id, balance) values
  ('00000000-0000-0000-0000-000000006001', 12),
  ('00000000-0000-0000-0000-000000006002', 20)
on conflict (user_id) do update set balance = excluded.balance;

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000060a1', '00000000-0000-0000-0000-000000006001', 'La de la fiesta'),
  ('00000000-0000-0000-0000-0000000060a2', '00000000-0000-0000-0000-000000006001', 'La de la oficina'),
  ('00000000-0000-0000-0000-0000000060b1', '00000000-0000-0000-0000-000000006002', 'Ajena');
insert into public.cards (id, user_id, set_id, title) values
  ('00000000-0000-0000-0000-0000000060c1', '00000000-0000-0000-0000-000000006001', '00000000-0000-0000-0000-0000000060a1', 'El Tío Beto'),
  ('00000000-0000-0000-0000-0000000060c2', '00000000-0000-0000-0000-000000006001', '00000000-0000-0000-0000-0000000060a1', 'La Abuela Chela');

-- Espacio de archivos
select test.is((select public from storage.buckets where id = 'caller-audio'), false,
  'el espacio de los audios es privado');
select test.is((select allowed_mime_types from storage.buckets where id = 'caller-audio'),
  array['audio/mpeg'], 'el espacio de los audios solo acepta MP3');

-- Cobro (decisión 11): 10 tokens por lotería, tenga las cartas que tenga
select test.lives($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006001',
    '00000000-0000-0000-0000-0000000060a1', 'Spanish_Narrator')
$$, 'se cobra la voz con IA de una lotería propia');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006001'),
  2, 'cobra 10 tokens');
select test.is(
  (select amount from public.token_usage
    where user_id = '00000000-0000-0000-0000-000000006001' and set_id = '00000000-0000-0000-0000-0000000060a1'),
  10, 'el cobro queda en el uso de tokens, con su lotería');
select test.is(
  (select reason from public.token_usage
    where user_id = '00000000-0000-0000-0000-000000006001' and set_id = '00000000-0000-0000-0000-0000000060a1'),
  'caller_voice', 'el uso de tokens dice que fue la voz del cantador');
select test.is(
  (select voice_id from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000060a1'),
  'Spanish_Narrator', 'la lotería guarda la voz escogida (decisión 22)');

-- Una sola vez por lotería (decisiones 3, 13 y 22)
select test.throws($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006001',
    '00000000-0000-0000-0000-0000000060a1', 'Spanish_Wiselady')
$$, 'VOICE_ALREADY_CREATED', 'no se cobra dos veces la misma lotería ni se cambia la voz');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006001'),
  2, 'el segundo intento no cobra');

-- Datos que se rechazan sin cobrar
update public.user_tokens set balance = 20 where user_id = '00000000-0000-0000-0000-000000006001';
select test.throws($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006001',
    '00000000-0000-0000-0000-0000000060a2', 'English_Wiselady')
$$, 'INVALID_VOICE', 'solo se aceptan las cuatro voces escogidas');
select test.throws($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006001',
    '00000000-0000-0000-0000-0000000060b1', 'Spanish_Narrator')
$$, 'SET_NOT_FOUND', 'no se cobra la voz de una lotería ajena');
select test.throws($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006001',
    '00000000-0000-0000-0000-00000000dead', 'Spanish_Narrator')
$$, 'SET_NOT_FOUND', 'no se cobra la voz de una lotería que no existe');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006001'),
  20, 'los intentos rechazados no cobran');

update public.user_tokens set balance = 9 where user_id = '00000000-0000-0000-0000-000000006001';
select test.throws($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006001',
    '00000000-0000-0000-0000-0000000060a2', 'Spanish_Wiselady')
$$, 'INSUFFICIENT_TOKENS', 'con menos de 10 tokens no se puede pagar');
select test.is((select count(*)::int from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000060a2'),
  0, 'sin saldo la lotería queda sin voz con IA');

-- Sin el límite de 10 por minuto (decisión 13)
update public.user_tokens set balance = 15 where user_id = '00000000-0000-0000-0000-000000006001';
insert into public.token_usage (user_id, amount, reason)
select '00000000-0000-0000-0000-000000006001', 1, 'ai_conversion' from generate_series(1, 10);
update public.user_tokens set balance = 15 where user_id = '00000000-0000-0000-0000-000000006001';
select test.lives($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006001',
    '00000000-0000-0000-0000-0000000060a2', 'Spanish_Wiselady')
$$, 'la voz se cobra aunque haya 10 usos de IA en el último minuto');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006001'),
  5, 'y cobra sus 10 tokens');

-- Si fallan todas las cartas, se devuelven los 5 tokens (decisión 11)
select test.lives($$ select public.refund_caller_voice('00000000-0000-0000-0000-0000000060a2') $$,
  'se devuelve la voz de una lotería sin ningún audio');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006001'),
  15, 'la devolución regresa los 10 tokens');
select test.is(
  (select count(*)::int from public.token_usage
    where set_id = '00000000-0000-0000-0000-0000000060a2' and reason = 'caller_voice'),
  0, 'el cobro devuelto desaparece del uso de tokens');
select test.is((select count(*)::int from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000060a2'),
  0, 'tras la devolución, «Mejorar la voz» vuelve a ofrecerse');
select test.lives($$ select public.refund_caller_voice('00000000-0000-0000-0000-0000000060a2') $$,
  'devolver dos veces no falla');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006001'),
  15, 'y no devuelve dos veces');

-- Si alguna carta salió, no se devuelve nada (decisión 11)
insert into public.caller_audios (card_id, set_id, user_id, title, path) values
  ('00000000-0000-0000-0000-0000000060c1', '00000000-0000-0000-0000-0000000060a1',
   '00000000-0000-0000-0000-000000006001', 'El Tío Beto',
   '00000000-0000-0000-0000-000000006001/00000000-0000-0000-0000-0000000060a1/00000000-0000-0000-0000-0000000060c1.mp3');
select test.throws($$ select public.refund_caller_voice('00000000-0000-0000-0000-0000000060a1') $$,
  'AUDIOS_EXIST', 'con alguna carta generada no se devuelve');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006001'),
  15, 'el intento de devolución no regresa tokens');

insert into storage.objects (bucket_id, name) values
  ('caller-audio', '00000000-0000-0000-0000-000000006001/00000000-0000-0000-0000-0000000060a1/00000000-0000-0000-0000-0000000060c1.mp3');

-- Permisos: solo el dueño oye sus audios; solo el servidor cobra, devuelve y guarda (§12)
select test.as_user('00000000-0000-0000-0000-000000006001');
select test.is((select count(*)::int from public.caller_voices), 1, 'el dueño ve la voz de su lotería');
select test.is((select count(*)::int from public.caller_audios), 1, 'el dueño ve los audios de sus cartas');
select test.is((select count(*)::int from storage.objects where bucket_id = 'caller-audio'), 1,
  'el dueño puede descargar sus audios');
select test.throws($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006001',
    '00000000-0000-0000-0000-0000000060a2', 'Spanish_Narrator')
$$, '42501', 'un usuario no puede cobrarse la voz directamente');
select test.throws($$ select public.refund_caller_voice('00000000-0000-0000-0000-0000000060a1') $$,
  '42501', 'un usuario no puede devolverse la voz');
select test.throws($$
  insert into public.caller_voices (set_id, user_id, voice_id)
  values ('00000000-0000-0000-0000-0000000060a2', '00000000-0000-0000-0000-000000006001', 'Spanish_Narrator')
$$, '42501', 'un usuario no puede darse la voz con IA sin pagar');
select test.throws($$
  insert into public.caller_audios (card_id, set_id, user_id, title, path)
  values ('00000000-0000-0000-0000-0000000060c2', '00000000-0000-0000-0000-0000000060a1',
          '00000000-0000-0000-0000-000000006001', 'La Abuela Chela', 'x.mp3')
$$, '42501', 'un usuario no puede registrar audios');
select test.throws($$
  insert into storage.objects (bucket_id, name)
  values ('caller-audio', '00000000-0000-0000-0000-000000006001/00000000-0000-0000-0000-0000000060a1/otro.mp3')
$$, '42501', 'un usuario no puede subir audios');

select test.as_user('00000000-0000-0000-0000-000000006002');
select test.is((select count(*)::int from public.caller_voices), 0, 'otra persona no ve la voz de una lotería ajena');
select test.is((select count(*)::int from public.caller_audios), 0, 'otra persona no ve los audios ajenos');
select test.is((select count(*)::int from storage.objects where bucket_id = 'caller-audio'), 0,
  'otra persona no puede descargar los audios ajenos');
delete from storage.objects where bucket_id = 'caller-audio';

select test.as_anon();
select test.is((select count(*)::int from storage.objects where bucket_id = 'caller-audio'), 0,
  'un visitante no puede descargar audios');
select test.throws($$ select count(*) from public.caller_audios $$, '42501',
  'un visitante no puede consultar los audios');

select test.as_service_role();
select test.lives($$
  select public.start_caller_voice('00000000-0000-0000-0000-000000006002',
    '00000000-0000-0000-0000-0000000060b1', 'Spanish_Steadymentor')
$$, 'el servidor sí puede cobrar la voz');

-- El dueño borra sus audios al borrar la carta o la lotería; nadie más puede
select test.as_postgres();
select test.is((select count(*)::int from storage.objects where bucket_id = 'caller-audio'), 1,
  'otra persona no puede borrar los audios ajenos');
select test.as_user('00000000-0000-0000-0000-000000006001');
delete from storage.objects where bucket_id = 'caller-audio';
select test.as_postgres();
select test.is((select count(*)::int from storage.objects where bucket_id = 'caller-audio'), 0,
  'el dueño puede borrar sus audios');

-- Borrar una carta borra su audio; borrar la lotería borra su voz y sus audios
select test.as_postgres();
delete from public.cards where id = '00000000-0000-0000-0000-0000000060c1';
select test.is((select count(*)::int from public.caller_audios where card_id = '00000000-0000-0000-0000-0000000060c1'),
  0, 'al borrar una carta se borra el registro de su audio');
insert into public.caller_audios (card_id, set_id, user_id, title, path) values
  ('00000000-0000-0000-0000-0000000060c2', '00000000-0000-0000-0000-0000000060a1',
   '00000000-0000-0000-0000-000000006001', 'La Abuela Chela', 'y.mp3');
delete from public.boards where set_id = '00000000-0000-0000-0000-0000000060a1';
delete from public.loteria_sets where id = '00000000-0000-0000-0000-0000000060a1';
select test.is((select count(*)::int from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000060a1'),
  0, 'al borrar la lotería se borra su voz');
select test.is((select count(*)::int from public.caller_audios where set_id = '00000000-0000-0000-0000-0000000060a1'),
  0, 'al borrar la lotería se borran los registros de sus audios');

rollback;
