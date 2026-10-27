-- Correos desechables (FEAT-58, US A2; migración 073), decisión 1: no se crean cuentas con dominios desechables.
begin;

select test.ok((select count(*) from public.disposable_email_domains) > 5000, 'la lista de dominios desechables está cargada');

select test.throws($$
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000007301', 'alguien@mailinator.com')
$$, 'DISPOSABLE_EMAIL', 'no se crea una cuenta con un correo desechable');
select test.throws($$
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000007302', 'Alguien@YOPMAIL.com ')
$$, 'DISPOSABLE_EMAIL', 'sin importar mayúsculas ni espacios');
select test.throws($$
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000007303', 'x@abc.mailinator.com')
$$, 'DISPOSABLE_EMAIL', 'ni con un subdominio de uno desechable');
select test.lives($$
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000007304', 'abuela@gmail.com')
$$, 'un correo normal sí crea su cuenta');
select test.is((select count(*)::int from public.user_tokens where user_id = '00000000-0000-0000-0000-000000007304'),
  1, 'y recibe su saldo de bienvenida como siempre');
select test.lives($$
  insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000007305', 'yo@tiendayopmail.com')
$$, 'un dominio que solo termina parecido no se bloquea');

-- Una cuenta que ya existía con un correo desechable no se toca
select test.lives($$
  update auth.users set raw_user_meta_data = '{"full_name":"Ana"}' where id = '00000000-0000-0000-0000-000000007304'
$$, 'editar una cuenta no pasa por la revisión');

-- La página revisa antes de registrar, para dar un mensaje claro
select test.as_anon();
select test.is(public.is_disposable_email('alguien@mailinator.com'), true, 'un visitante puede revisar un correo desechable');
select test.is(public.is_disposable_email('abuela@gmail.com'), false, 'y uno normal');
select test.is(public.is_disposable_email('sin-arroba'), false, 'algo sin dominio no es desechable');
select test.throws($$ select count(*) from public.disposable_email_domains $$, '42501', 'nadie lee la lista directo');

rollback;
