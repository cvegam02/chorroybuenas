-- Qué se ve en las cartas de una lotería (FEAT-51): nombre y número ('both'), solo nombre ('name'),
-- solo número ('number') o nada ('none'). Un solo ajuste por lotería; las que ya existen quedan con
-- nombre y número, como se veían. La dueña lo cambia con la regla de acceso que ya tiene la tabla.
alter table public.loteria_sets
  add column if not exists card_labels text not null default 'both';

alter table public.loteria_sets
  drop constraint if exists loteria_sets_card_labels_check;
alter table public.loteria_sets
  add constraint loteria_sets_card_labels_check check (card_labels in ('both', 'name', 'number', 'none'));
