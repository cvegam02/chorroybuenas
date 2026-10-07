-- Descarga de loterías de temporada (FEAT-17, US C2).
-- Quien tiene una compra aprobada puede leer el PDF vigente de esa lotería y su ficha, aunque la
-- lotería ya no esté visible. Una compra pendiente, repetida o devuelta no da acceso. Solo lectura.

drop policy if exists "Buyers can read purchased seasonal_loterias" on public.seasonal_loterias;
create policy "Buyers can read purchased seasonal_loterias" on public.seasonal_loterias
  for select to authenticated using (
    exists (
      select 1 from public.seasonal_purchases p
       where p.loteria_id = seasonal_loterias.id
         and p.user_id = (select auth.uid())
         and p.status = 'approved'
    )
  );

drop policy if exists "Buyers can read purchased seasonal_loteria_files" on public.seasonal_loteria_files;
create policy "Buyers can read purchased seasonal_loteria_files" on public.seasonal_loteria_files
  for select to authenticated using (
    exists (
      select 1 from public.seasonal_purchases p
       where p.loteria_id = seasonal_loteria_files.loteria_id
         and p.user_id = (select auth.uid())
         and p.status = 'approved'
    )
  );

-- Solo el PDF registrado en seasonal_loteria_files (el vigente): la subconsulta pasa por las reglas
-- de esa tabla, así que solo encuentra los de las loterías que la cuenta compró.
drop policy if exists "Buyers can read purchased seasonal pdfs" on storage.objects;
create policy "Buyers can read purchased seasonal pdfs"
on storage.objects for select
to authenticated
using (
  bucket_id = 'seasonal-pdfs'
  and exists (
    select 1
      from public.seasonal_loteria_files f
      join public.seasonal_purchases p on p.loteria_id = f.loteria_id
     where f.pdf_path = storage.objects.name
       and p.user_id = (select auth.uid())
       and p.status = 'approved'
  )
);
