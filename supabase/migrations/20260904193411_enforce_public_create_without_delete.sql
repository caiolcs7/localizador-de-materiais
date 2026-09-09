revoke all privileges
on table
  public.admin_users,
  public.audit_events,
  public.cart_items,
  public.inventory_locations,
  public.luminaire_carts
from anon;

grant select, insert
on table public.inventory_locations
to anon;

grant select
on table
  public.cart_items,
  public.luminaire_carts
to anon;

revoke truncate, references, trigger
on table
  public.admin_users,
  public.audit_events,
  public.cart_items,
  public.inventory_locations,
  public.luminaire_carts
from authenticated;
