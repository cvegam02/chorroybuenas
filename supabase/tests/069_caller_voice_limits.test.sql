-- Voz con IA: cerrar abusos (FEAT-58, US A3; migración 069). Títulos de máximo 50 caracteres (decisión 6);
-- audios gratis hasta las cartas de la lotería más 10 y 20 regeneraciones por minuto (decisión 7); la frase de
-- arranque cuenta para la devolución y una generación que termina después de devolver no se registra (decisión 10).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000006901', 'cantador-limites@test.dev'),
  ('00000000-0000-0000-0000-000000006902', 'otra-cantadora-limites@test.dev');
insert into public.user_tokens (user_id, balance) values
  ('00000000-0000-0000-0000-000000006901', 100),
  ('00000000-0000-0000-0000-000000006902', 100)
on conflict (user_id) do update set balance = excluded.balance;

insert into public.loteria_sets (id, user_id, name) values
  ('00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-000000006901', 'La de la fiesta'),
  ('00000000-0000-0000-0000-0000000069a2', '00000000-0000-0000-0000-000000006901', 'La de la oficina'),
  ('00000000-0000-0000-0000-0000000069a3', '00000000-0000-0000-0000-000000006901', 'La de la boda'),
  ('00000000-0000-0000-0000-0000000069b1', '00000000-0000-0000-0000-000000006902', 'Ajena');
insert into public.cards (id, user_id, set_id, title) values
  ('00000000-0000-0000-0000-0000000069c1', '00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a1', 'El Tío Beto'),
  ('00000000-0000-0000-0000-0000000069c2', '00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a1', 'La Abuela Chela'),
  ('00000000-0000-0000-0000-0000000069c3', '00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a2', 'El Jefe'),
  ('00000000-0000-0000-0000-0000000069c4', '00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a3', 'La Novia'),
  ('00000000-0000-0000-0000-0000000069d1', '00000000-0000-0000-0000-000000006902', '00000000-0000-0000-0000-0000000069b1', 'Ajena');

-- ---------------------------------------------------------------------------
-- Títulos de máximo 50 caracteres al crear o renombrar (decisión 6)
-- ---------------------------------------------------------------------------
select test.lives($$
  insert into public.cards (user_id, set_id, title) values ('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a2', repeat('a', 50))
$$, 'se crea una carta con un título de 50 caracteres');
select test.throws($$
  insert into public.cards (user_id, set_id, title) values ('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a2', repeat('a', 51))
$$, 'TITLE_TOO_LONG', 'no se crea una carta con un título de 51 caracteres');
select test.throws($$
  update public.cards set title = repeat('b', 51) where id = '00000000-0000-0000-0000-0000000069c3'
$$, 'TITLE_TOO_LONG', 'no se renombra una carta a un título de 51 caracteres');

-- Una carta guardada antes de la regla con un título largo no se toca (decisión 6)
alter table public.cards disable trigger cards_title_length;
insert into public.cards (id, user_id, set_id, title) values
  ('00000000-0000-0000-0000-0000000069e1', '00000000-0000-0000-0000-000000006901',
   '00000000-0000-0000-0000-0000000069a2', repeat('c', 80));
alter table public.cards enable trigger cards_title_length;
select test.lives($$
  update public.cards set image_path = 'otra.webp' where id = '00000000-0000-0000-0000-0000000069e1'
$$, 'una carta vieja con título largo se puede seguir editando sin renombrarla');
delete from public.cards where set_id = '00000000-0000-0000-0000-0000000069a2'
  and id <> '00000000-0000-0000-0000-0000000069c3';

-- ---------------------------------------------------------------------------
-- Reservar un audio antes de pedirlo a ElevenLabs
-- ---------------------------------------------------------------------------
select public.start_caller_voice('00000000-0000-0000-0000-000000006901',
  '00000000-0000-0000-0000-0000000069a1', 'y2ijeTfmnXjzheHO6zeN');

select test.throws($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a2', '00000000-0000-0000-0000-0000000069c3')
$$, 'VOICE_NOT_PAID', 'una lotería sin voz pagada no genera audios');
select test.throws($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000006902',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c1')
$$, 'VOICE_NOT_PAID', 'nadie genera audios con la voz pagada de otra persona');
select test.throws($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069d1')
$$, 'CARD_NOT_FOUND', 'no se genera el audio de una carta de otra lotería');

select test.is(
  public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c1'),
  'El Tío Beto', 'reservar el primer audio de una carta devuelve el título que se va a decir');
select test.is(
  (select generated_audios from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000069a1'),
  1, 'el audio reservado se cuenta');
select test.is(
  public.save_caller_audio('00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a1',
    '00000000-0000-0000-0000-0000000069c1', 'El Tío Beto', 'u/s/c1.mp3'),
  true, 'el audio generado se registra');
select test.is(
  public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c1'),
  null, 'una carta con el audio de su título no se vuelve a generar');
select test.is(
  (select generated_audios from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000069a1'),
  1, 'y no se cuenta otra vez');

-- Si ElevenLabs falla, el audio reservado se libera
select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
  '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c2');
select public.release_caller_audio('00000000-0000-0000-0000-0000000069a1');
select test.is(
  (select generated_audios from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000069a1'),
  1, 'un audio que no se pudo generar no se cuenta');

-- ---------------------------------------------------------------------------
-- Tope: tantos audios como cartas tenga la lotería, más 10 (decisión 7)
-- ---------------------------------------------------------------------------
-- 2 cartas: el tope es 12 audios. Ya lleva 1; 11 renombres de «El Tío Beto» lo llevan a 12.
do $$
begin
  for i in 1..11 loop
    update public.cards set title = 'El Tío Beto ' || i where id = '00000000-0000-0000-0000-0000000069c1';
    perform public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
      '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c1');
    perform public.save_caller_audio('00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a1',
      '00000000-0000-0000-0000-0000000069c1', 'El Tío Beto ' || i, 'u/s/c1.mp3');
  end loop;
end;
$$;
-- Las regeneraciones del bucle pasaron en el último minuto: se mueven atrás para probar solo el tope.
update public.caller_voice_regenerations set created_at = now() - interval '2 minutes';
select test.throws($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c2')
$$, 'VOICE_LIMIT', 'pasado el tope, ni siquiera el primer audio de otra carta se genera');
update public.cards set title = 'El Tío Beto otra vez' where id = '00000000-0000-0000-0000-0000000069c1';
select test.throws($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c1')
$$, 'VOICE_LIMIT', 'pasado el tope, una carta renombrada se queda sin audio nuevo');
select test.is(
  (select generated_audios from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000069a1'),
  12, 'los intentos rechazados no se cuentan');

-- Borrar una carta y volver a crearla no da audios gratis: el tope baja con la carta
delete from public.cards where id = '00000000-0000-0000-0000-0000000069c2';
insert into public.cards (id, user_id, set_id, title) values
  ('00000000-0000-0000-0000-0000000069c5', '00000000-0000-0000-0000-000000006901',
   '00000000-0000-0000-0000-0000000069a1', 'La Abuela Chela');
select test.throws($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c5')
$$, 'VOICE_LIMIT', 'una carta borrada y vuelta a crear no da un audio de más');

-- Una carta nueva sube el tope en uno
insert into public.cards (id, user_id, set_id, title) values
  ('00000000-0000-0000-0000-0000000069c6', '00000000-0000-0000-0000-000000006901',
   '00000000-0000-0000-0000-0000000069a1', 'El Compadre');
select test.is(
  public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c6'),
  'El Compadre', 'cada carta nueva trae su audio');

-- ---------------------------------------------------------------------------
-- 20 regeneraciones por minuto por usuario; el primer audio no tiene ese límite (decisión 7)
-- ---------------------------------------------------------------------------
select public.start_caller_voice('00000000-0000-0000-0000-000000006901',
  '00000000-0000-0000-0000-0000000069a3', 'y2ijeTfmnXjzheHO6zeN');
insert into public.cards (user_id, set_id, title)
select '00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a3', 'Invitado ' || i
from generate_series(1, 30) i;
insert into public.caller_voice_regenerations (user_id, set_id, created_at)
select '00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a1', now() - interval '10 seconds'
from generate_series(1, 20);
select test.is(
  public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a3', '00000000-0000-0000-0000-0000000069c4'),
  'La Novia', 'con 20 regeneraciones en el último minuto, el primer audio de una carta se sigue generando');
select public.save_caller_audio('00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a3',
  '00000000-0000-0000-0000-0000000069c4', 'La Novia', 'u/s/c4.mp3');
update public.cards set title = 'La Novia Feliz' where id = '00000000-0000-0000-0000-0000000069c4';
select test.throws($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a3', '00000000-0000-0000-0000-0000000069c4')
$$, 'RATE_LIMITED', 'la regeneración 21 del mismo minuto se rechaza, aunque sea en otra lotería');
update public.caller_voice_regenerations set created_at = now() - interval '2 minutes';
select test.is(
  public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a3', '00000000-0000-0000-0000-0000000069c4'),
  'La Novia Feliz', 'pasado el minuto se puede regenerar otra vez');

-- ---------------------------------------------------------------------------
-- Devolución: la frase de arranque cuenta (decisión 10); carrera con una generación en curso
-- ---------------------------------------------------------------------------
select public.start_caller_voice('00000000-0000-0000-0000-000000006901',
  '00000000-0000-0000-0000-0000000069a2', 'y2ijeTfmnXjzheHO6zeN');
select test.is(
  public.save_caller_audio('00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a2',
    null, 'Se va y se corre con...', 'u/s/intro.mp3'),
  true, 'la frase de arranque se registra');
select test.is(
  (select intro_path from public.caller_voices where set_id = '00000000-0000-0000-0000-0000000069a2'),
  'u/s/intro.mp3', 'la frase queda en la voz de la lotería');
update public.user_tokens set balance = 50 where user_id = '00000000-0000-0000-0000-000000006901';
select test.throws($$ select public.refund_caller_voice('00000000-0000-0000-0000-0000000069a2') $$,
  'AUDIOS_EXIST', 'con la frase de arranque generada no hay devolución');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006901'),
  50, 'y no regresa tokens');

-- Una generación que termina después de la devolución no se registra
update public.caller_voices set intro_path = null where set_id = '00000000-0000-0000-0000-0000000069a2';
select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
  '00000000-0000-0000-0000-0000000069a2', '00000000-0000-0000-0000-0000000069c3');
select test.lives($$ select public.refund_caller_voice('00000000-0000-0000-0000-0000000069a2') $$,
  'sin ningún audio guardado, la voz se devuelve');
select test.is((select balance from public.user_tokens where user_id = '00000000-0000-0000-0000-000000006901'),
  60, 'la devolución regresa los 10 tokens');
select test.is(
  public.save_caller_audio('00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a2',
    '00000000-0000-0000-0000-0000000069c3', 'El Jefe', 'u/s/c3.mp3'),
  false, 'el audio que termina después de la devolución no se registra');
select test.is((select count(*)::int from public.caller_audios where set_id = '00000000-0000-0000-0000-0000000069a2'),
  0, 'la lotería devuelta se queda sin audios');

-- Una carta borrada mientras se generaba su audio no se registra
select test.is(
  public.save_caller_audio('00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a1',
    '00000000-0000-0000-0000-00000000dead', 'La Borrada', 'u/s/x.mp3'),
  false, 'el audio de una carta que ya no existe no se registra');

-- ---------------------------------------------------------------------------
-- Permisos: solo el servidor reserva, libera y guarda
-- ---------------------------------------------------------------------------
select test.as_user('00000000-0000-0000-0000-000000006901');
select test.throws($$
  select public.reserve_caller_audio('00000000-0000-0000-0000-000000006901',
    '00000000-0000-0000-0000-0000000069a1', '00000000-0000-0000-0000-0000000069c1')
$$, '42501', 'un usuario no puede reservar audios');
select test.throws($$ select public.release_caller_audio('00000000-0000-0000-0000-0000000069a1') $$,
  '42501', 'un usuario no puede liberar audios');
select test.throws($$
  select public.save_caller_audio('00000000-0000-0000-0000-000000006901', '00000000-0000-0000-0000-0000000069a1',
    '00000000-0000-0000-0000-0000000069c1', 'x', 'x.mp3')
$$, '42501', 'un usuario no puede registrar audios');
select test.throws($$ select count(*) from public.caller_voice_regenerations $$, '42501',
  'un usuario no puede ver el registro de regeneraciones');
select test.throws($$
  update public.cards set title = repeat('d', 51) where id = '00000000-0000-0000-0000-0000000069c3'
$$, 'TITLE_TOO_LONG', 'el dueño tampoco renombra a más de 50 caracteres por la API');

rollback;
