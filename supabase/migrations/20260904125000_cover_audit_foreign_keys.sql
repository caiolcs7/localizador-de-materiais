create index if not exists admin_users_created_by_idx
  on public.admin_users (created_by)
  where created_by is not null;

create index if not exists inventory_locations_created_by_idx
  on public.inventory_locations (created_by)
  where created_by is not null;

create index if not exists inventory_locations_updated_by_idx
  on public.inventory_locations (updated_by)
  where updated_by is not null;

create index if not exists luminaire_carts_created_by_idx
  on public.luminaire_carts (created_by)
  where created_by is not null;

create index if not exists luminaire_carts_updated_by_idx
  on public.luminaire_carts (updated_by)
  where updated_by is not null;

create index if not exists cart_items_created_by_idx
  on public.cart_items (created_by)
  where created_by is not null;

create index if not exists cart_items_updated_by_idx
  on public.cart_items (updated_by)
  where updated_by is not null;
