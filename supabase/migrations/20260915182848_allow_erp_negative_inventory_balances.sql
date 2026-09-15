alter table public.inventory_locations
  drop constraint if exists inventory_quantidade_nonnegative;

comment on column public.inventory_locations.quantidade is
  'Saldo total do código no ERP. Valores negativos são preservados para refletir divergências reais de estoque.';
