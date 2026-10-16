-- Banner de la oferta (FEAT-49, US A4): sus datos viven en la oferta, un banner encendido necesita lo
-- indispensable, la oferta vigente lo entrega a cualquiera solo si está encendido, y sus archivos van a un
-- espacio público que solo escriben administradores (migración 055).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000005501', 'admin-banner@test.dev'),
  ('00000000-0000-0000-0000-000000005502', 'ana-banner@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000005501');

insert into public.offers (id, name, discount_percent, starts_at, ends_at) values
  ('00000000-0000-0000-0000-0000000055a1', 'Buen Fin prueba', 25, now() - interval '1 day', now() + interval '1 day');

-- Espacio de archivos
select test.is((select public from storage.buckets where id = 'offer-banners'), true,
  'el espacio de los banners es público (el banner se ve sin sesión)');
select test.is((select file_size_limit from storage.buckets where id = 'offer-banners'), 8388608::bigint,
  'un archivo del banner pesa como máximo 8 MB');
select test.is((select allowed_mime_types from storage.buckets where id = 'offer-banners'),
  array['video/mp4', 'image/jpeg', 'image/png', 'image/webp'],
  'el espacio acepta el video MP4 y la imagen fija');

select test.as_user('00000000-0000-0000-0000-000000005501');
select test.lives($$
  insert into storage.objects (bucket_id, name)
  values ('offer-banners', '00000000-0000-0000-0000-0000000055a1/video-1.mp4')
$$, 'un administrador sube el video');
select test.lives($$
  delete from storage.objects where bucket_id = 'offer-banners'
$$, 'un administrador borra un archivo del banner');

select test.as_user('00000000-0000-0000-0000-000000005502');
select test.throws($$
  insert into storage.objects (bucket_id, name)
  values ('offer-banners', '00000000-0000-0000-0000-0000000055a1/otro.mp4')
$$, '42501', 'una usuaria normal no sube archivos del banner');
select test.as_anon();
select test.throws($$
  insert into storage.objects (bucket_id, name)
  values ('offer-banners', '00000000-0000-0000-0000-0000000055a1/otro.mp4')
$$, '42501', 'un visitante tampoco');

-- Un banner apagado no sale en la oferta vigente.
select test.is((select banner_enabled from public.current_offer()), false, 'sin banner, la oferta vigente dice que no hay');
select test.ok((select banner_title_es is null and banner_video_path is null from public.current_offer()),
  'y no entrega datos del banner');

-- Encender el banner pide lo indispensable.
select test.as_user('00000000-0000-0000-0000-000000005501');
select test.throws($$
  update public.offers set banner_enabled = true where id = '00000000-0000-0000-0000-0000000055a1'
$$, '23514', 'no se enciende un banner sin video, imagen, título ni botón');
select test.throws($$
  update public.offers set
    banner_enabled = true, banner_video_path = 'x/v.mp4', banner_image_path = 'x/i.jpg',
    banner_title_es = 'Buen Fin', banner_button_es = 'Aprovechar oferta',
    banner_on_home = false, banner_on_dashboard = false
  where id = '00000000-0000-0000-0000-0000000055a1'
$$, '23514', 'ni sin ninguna pantalla donde salir');
select test.throws($$
  update public.offers set banner_target = 'otra' where id = '00000000-0000-0000-0000-0000000055a1'
$$, '23514', 'el botón solo lleva a Comprar tokens, Crear lotería o Temáticas');
select test.throws($$
  update public.offers set banner_title_es = repeat('x', 81) where id = '00000000-0000-0000-0000-0000000055a1'
$$, '23514', 'el título tiene un largo máximo');

select test.lives($$
  update public.offers set
    banner_enabled = true,
    banner_video_path = '00000000-0000-0000-0000-0000000055a1/video-1.mp4',
    banner_image_path = '00000000-0000-0000-0000-0000000055a1/imagen-1.jpg',
    banner_title_es = '¡Buen Fin! Tokens a $1.50',
    banner_text_es = '25% de descuento en todos los paquetes.',
    banner_button_es = 'Aprovechar oferta',
    banner_title_en = 'Buen Fin! Tokens at $1.50',
    banner_target = 'buy_tokens',
    banner_on_home = true,
    banner_on_dashboard = false,
    banner_countdown = true
  where id = '00000000-0000-0000-0000-0000000055a1'
$$, 'el administrador configura y enciende el banner');

-- La oferta vigente entrega el banner a cualquiera.
select test.as_anon();
select test.is((select banner_enabled from public.current_offer()), true, 'un visitante ve que hay banner');
select test.is((select banner_title_es from public.current_offer()), '¡Buen Fin! Tokens a $1.50', 'con su título');
select test.is((select banner_title_en from public.current_offer()), 'Buen Fin! Tokens at $1.50', 'y el título en inglés');
select test.ok((select banner_button_en is null from public.current_offer()), 'lo que no se capturó en inglés llega vacío');
select test.is((select banner_video_path from public.current_offer()),
  '00000000-0000-0000-0000-0000000055a1/video-1.mp4', 'con la ubicación del video');
select test.is((select banner_target from public.current_offer()), 'buy_tokens', 'a dónde lleva el botón');
select test.ok((select banner_on_home and not banner_on_dashboard and banner_countdown from public.current_offer()),
  'dónde sale y si lleva cuenta regresiva');
select test.is((select discount_percent from public.current_offer()), 25, 'y sigue entregando el descuento');

-- Una usuaria normal no cambia el banner.
select test.as_user('00000000-0000-0000-0000-000000005502');
select test.lives($$
  update public.offers set banner_title_es = 'Hackeado' where id = '00000000-0000-0000-0000-0000000055a1'
$$, 'una usuaria normal no ve error al intentar cambiar el banner');
select test.as_anon();
select test.is((select banner_title_es from public.current_offer()), '¡Buen Fin! Tokens a $1.50', 'pero no lo cambia');

-- Al terminar la oferta, el banner se va solo.
select test.as_postgres();
update public.offers set starts_at = now() - interval '3 days', ends_at = now() - interval '1 day'
where id = '00000000-0000-0000-0000-0000000055a1';
select test.as_anon();
select test.is((select count(*)::int from public.current_offer()), 0, 'una oferta terminada ya no entrega banner');

rollback;
