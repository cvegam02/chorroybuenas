-- Corrige precios de paquetes: se cobra solo por base_tokens; bonus_tokens son gratis.
-- 10+2: 20 MXN (no 24), 20+5: 40 MXN (no 48), 50+20: 100 MXN (no 140).

update public.token_packs
set price_cents = case
  when base_tokens = 10 and bonus_tokens = 2  then 2000
  when base_tokens = 20 and bonus_tokens = 5  then 4000
  when base_tokens = 50 and bonus_tokens = 20 then 10000
  else price_cents
end
where (base_tokens, bonus_tokens) in ((10, 2), (20, 5), (50, 20));
