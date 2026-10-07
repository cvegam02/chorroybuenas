-- Quien compró una lotería de temporada puede leer su PDF y su ficha (migración 032).
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000091', 'admin-descargas@test.dev'),
  ('00000000-0000-0000-0000-000000000092', 'compradora-descargas@test.dev'),
  ('00000000-0000-0000-0000-000000000093', 'otro-comprador@test.dev'),
  ('00000000-0000-0000-0000-000000000094', 'devuelta@test.dev');
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-000000000091');

-- Las tres loterías son borradores: nadie del público las ve.
insert into public.seasons (id, name_es) values ('00000000-0000-0000-0000-000000000a91', 'Reyes');
insert into public.seasonal_loterias (id, season_id, name_es, price_cents) values
  ('00000000-0000-0000-0000-000000000b91', '00000000-0000-0000-0000-000000000a91', 'Comprada', 4900),
  ('00000000-0000-0000-0000-000000000b92', '00000000-0000-0000-0000-000000000a91', 'De otro', 4900),
  ('00000000-0000-0000-0000-000000000b93', '00000000-0000-0000-0000-000000000a91', 'Pendiente', 4900);

insert into storage.objects (bucket_id, name) values
  ('seasonal-pdfs', '00000000-0000-0000-0000-000000000b91/2.pdf'),
  -- Versión anterior que quedó en el espacio: ya no es el PDF de la lotería.
  ('seasonal-pdfs', '00000000-0000-0000-0000-000000000b91/1.pdf'),
  ('seasonal-pdfs', '00000000-0000-0000-0000-000000000b92/1.pdf'),
  ('seasonal-pdfs', '00000000-0000-0000-0000-000000000b93/1.pdf');
insert into public.seasonal_loteria_files (loteria_id, pdf_path, pdf_name, pdf_size_bytes) values
  ('00000000-0000-0000-0000-000000000b91', '00000000-0000-0000-0000-000000000b91/2.pdf', 'comprada.pdf', 1024),
  ('00000000-0000-0000-0000-000000000b92', '00000000-0000-0000-0000-000000000b92/1.pdf', 'de-otro.pdf', 1024),
  ('00000000-0000-0000-0000-000000000b93', '00000000-0000-0000-0000-000000000b93/1.pdf', 'pendiente.pdf', 1024);

insert into public.seasonal_purchases (user_id, loteria_id, amount_cents, payment_provider, payment_id, status) values
  ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000b91', 4900, 'mercadopago', 'SD-1', 'approved'),
  ('00000000-0000-0000-0000-000000000092', '00000000-0000-0000-0000-000000000b93', 4900, 'mercadopago', 'SD-2', 'pending'),
  ('00000000-0000-0000-0000-000000000093', '00000000-0000-0000-0000-000000000b92', 4900, 'mercadopago', 'SD-3', 'approved'),
  ('00000000-0000-0000-0000-000000000094', '00000000-0000-0000-0000-000000000b91', 4900, 'mercadopago', 'SD-4', 'refunded');

-- Con compra aprobada.
select test.as_user('00000000-0000-0000-0000-000000000092');
select test.is(
  (select array_agg(name order by name) from storage.objects where bucket_id = 'seasonal-pdfs'),
  array['00000000-0000-0000-0000-000000000b91/2.pdf'],
  'quien compró lee el PDF vigente de su lotería, y ningún otro');
select test.is(
  (select array_agg(pdf_path order by pdf_path) from public.seasonal_loteria_files),
  array['00000000-0000-0000-0000-000000000b91/2.pdf'],
  'quien compró conoce la ubicación del PDF de su lotería, y de ninguna otra');
select test.is(
  (select array_agg(name_es order by name_es) from public.seasonal_loterias),
  array['Comprada'],
  'quien compró sigue viendo la ficha de su lotería aunque no esté visible');

select test.throws($$
  insert into storage.objects (bucket_id, name) values ('seasonal-pdfs', '00000000-0000-0000-0000-000000000b91/3.pdf')
$$, '42501', 'quien compró no puede subir archivos');
select test.throws($$
  insert into public.seasonal_loteria_files (loteria_id, pdf_path, pdf_name, pdf_size_bytes)
  values ('00000000-0000-0000-0000-000000000b91', 'x.pdf', 'x.pdf', 1)
$$, '42501', 'quien compró no puede registrar un PDF');
update storage.objects set name = 'cambiado.pdf' where bucket_id = 'seasonal-pdfs';
delete from storage.objects where bucket_id = 'seasonal-pdfs';
update public.seasonal_loteria_files set pdf_path = '00000000-0000-0000-0000-000000000b92/1.pdf';
delete from public.seasonal_loteria_files;
update public.seasonal_loterias set price_cents = 1000;

select test.as_postgres();
select test.is(
  (select count(*)::int from storage.objects where bucket_id = 'seasonal-pdfs' and name like '%.pdf' and name <> 'cambiado.pdf'),
  4, 'quien compró no puede cambiar ni borrar archivos');
select test.is(
  (select pdf_path from public.seasonal_loteria_files where loteria_id = '00000000-0000-0000-0000-000000000b91'),
  '00000000-0000-0000-0000-000000000b91/2.pdf'::text, 'quien compró no puede cambiar ni borrar el registro del PDF');
select test.is(
  (select price_cents from public.seasonal_loterias where id = '00000000-0000-0000-0000-000000000b91'),
  4900, 'quien compró no puede cambiar la ficha');

-- La compra de una lotería no da acceso al PDF de otra.
select test.as_user('00000000-0000-0000-0000-000000000093');
select test.is(
  (select array_agg(name order by name) from storage.objects where bucket_id = 'seasonal-pdfs'),
  array['00000000-0000-0000-0000-000000000b92/1.pdf'],
  'la compra de una lotería no da acceso al PDF de otra');

-- Compra devuelta: sin acceso.
select test.as_user('00000000-0000-0000-0000-000000000094');
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-pdfs'), 0,
  'una compra devuelta no da acceso al PDF');
select test.is((select count(*)::int from public.seasonal_loteria_files), 0,
  'una compra devuelta no deja conocer la ubicación del PDF');
select test.is((select count(*)::int from public.seasonal_loterias), 0,
  'una compra devuelta no deja ver la ficha de una lotería no visible');

-- Sin sesión.
select test.as_anon();
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-pdfs'), 0,
  'un visitante no lee ningún PDF');
select test.throws($$
  select count(*) from public.seasonal_loteria_files
$$, '42501', 'un visitante no puede consultar el registro de los PDF');
select test.is((select count(*)::int from public.seasonal_loterias), 0,
  'un visitante no ve las loterías no visibles');

-- El administrador conserva su acceso.
select test.as_user('00000000-0000-0000-0000-000000000091');
select test.is((select count(*)::int from storage.objects where bucket_id = 'seasonal-pdfs'), 4,
  'un administrador lee todos los PDF');

-- Al aprobarse un pago pendiente, llega el acceso.
select test.as_postgres();
update public.seasonal_purchases set status = 'approved' where payment_id = 'SD-2';
select test.as_user('00000000-0000-0000-0000-000000000092');
select test.is(
  (select array_agg(name order by name) from storage.objects where bucket_id = 'seasonal-pdfs'),
  array['00000000-0000-0000-0000-000000000b91/2.pdf', '00000000-0000-0000-0000-000000000b93/1.pdf'],
  'un pago pendiente no da acceso hasta que se aprueba');

rollback;
