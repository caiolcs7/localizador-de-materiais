create schema if not exists app_private;

revoke all on schema app_private from public;
revoke all on schema app_private from anon, authenticated;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_email_normalized check (email = lower(btrim(email))),
  constraint admin_users_email_length check (char_length(email) between 3 and 320)
);

create unique index admin_users_email_unique_idx on public.admin_users (lower(email));
create index admin_users_active_idx on public.admin_users (active) where active;

create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users as administrator
    where administrator.user_id = (select auth.uid())
      and administrator.active
  );
$$;

revoke all on function app_private.is_admin() from public;
revoke all on function app_private.is_admin() from anon;
grant execute on function app_private.is_admin() to authenticated;

create table public.inventory_locations (
  id uuid primary key default gen_random_uuid(),
  codigo text not null,
  codigo_original text,
  codigo_normalizado text not null,
  aliases text[] not null default '{}',
  bombona text not null,
  endereco text not null,
  endereco_original text,
  rua text,
  descritivo text,
  quantidade numeric,
  observacoes text,
  grupo text,
  arquivo_origem text,
  registro_tipo text,
  duplicate_override boolean not null default false,
  version bigint not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_codigo_not_blank check (btrim(codigo) <> ''),
  constraint inventory_codigo_normalizado_not_blank check (btrim(codigo_normalizado) <> ''),
  constraint inventory_bombona_not_blank check (btrim(bombona) <> ''),
  constraint inventory_endereco_not_blank check (btrim(endereco) <> ''),
  constraint inventory_quantidade_nonnegative check (quantidade is null or quantidade >= 0),
  constraint inventory_version_positive check (version > 0)
);

create index inventory_codigo_normalizado_idx on public.inventory_locations (codigo_normalizado);
create index inventory_bombona_idx on public.inventory_locations (bombona);
create index inventory_endereco_idx on public.inventory_locations (endereco);
create index inventory_updated_at_idx on public.inventory_locations (updated_at desc);
create unique index inventory_location_natural_unique_idx
  on public.inventory_locations (codigo_normalizado, bombona, endereco)
  where not duplicate_override;

create table public.luminaire_carts (
  id text primary key,
  nome text not null,
  source_sheet text not null,
  sort_order integer not null default 0,
  version bigint not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint luminaire_carts_id_not_blank check (btrim(id) <> ''),
  constraint luminaire_carts_nome_not_blank check (btrim(nome) <> ''),
  constraint luminaire_carts_source_not_blank check (btrim(source_sheet) <> ''),
  constraint luminaire_carts_sort_nonnegative check (sort_order >= 0),
  constraint luminaire_carts_version_positive check (version > 0)
);

create index luminaire_carts_sort_idx on public.luminaire_carts (sort_order, nome);

create table public.cart_items (
  id text primary key,
  cart_id text not null references public.luminaire_carts(id) on delete cascade,
  codigo text not null,
  codigo_normalizado text not null,
  descritivo text,
  quantidade numeric,
  unidade text,
  observacoes text,
  categoria text,
  linha_origem integer,
  sort_order integer not null default 0,
  version bigint not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cart_items_id_not_blank check (btrim(id) <> ''),
  constraint cart_items_codigo_not_blank check (btrim(codigo) <> ''),
  constraint cart_items_codigo_normalizado_not_blank check (btrim(codigo_normalizado) <> ''),
  constraint cart_items_quantidade_nonnegative check (quantidade is null or quantidade >= 0),
  constraint cart_items_sort_nonnegative check (sort_order >= 0),
  constraint cart_items_version_positive check (version > 0)
);

create index cart_items_cart_sort_idx on public.cart_items (cart_id, sort_order);
create index cart_items_codigo_normalizado_idx on public.cart_items (codigo_normalizado);

create table public.audit_events (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  old_row jsonb,
  new_row jsonb,
  occurred_at timestamptz not null default now(),
  constraint audit_events_action_valid check (action in ('INSERT', 'UPDATE', 'DELETE'))
);

create index audit_events_occurred_at_idx on public.audit_events (occurred_at desc);
create index audit_events_actor_idx on public.audit_events (actor_user_id, occurred_at desc);
create index audit_events_record_idx on public.audit_events (table_name, record_id, occurred_at desc);

create or replace function app_private.set_audit_fields()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  new.version := old.version + 1;
  return new;
end;
$$;

create or replace function app_private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_row jsonb;
  current_row jsonb;
begin
  previous_row := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  current_row := case when tg_op = 'DELETE' then null else to_jsonb(new) end;

  insert into public.audit_events (
    table_name,
    record_id,
    action,
    actor_user_id,
    old_row,
    new_row
  ) values (
    tg_table_name,
    coalesce(current_row ->> 'id', previous_row ->> 'id', current_row ->> 'user_id', previous_row ->> 'user_id'),
    tg_op,
    (select auth.uid()),
    previous_row,
    current_row
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function app_private.set_audit_fields() from public, anon, authenticated;
revoke all on function app_private.audit_row_change() from public, anon, authenticated;

create trigger inventory_locations_set_audit_fields
before update on public.inventory_locations
for each row execute function app_private.set_audit_fields();

create trigger luminaire_carts_set_audit_fields
before update on public.luminaire_carts
for each row execute function app_private.set_audit_fields();

create trigger cart_items_set_audit_fields
before update on public.cart_items
for each row execute function app_private.set_audit_fields();

create trigger inventory_locations_audit
after insert or update or delete on public.inventory_locations
for each row execute function app_private.audit_row_change();

create trigger luminaire_carts_audit
after insert or update or delete on public.luminaire_carts
for each row execute function app_private.audit_row_change();

create trigger cart_items_audit
after insert or update or delete on public.cart_items
for each row execute function app_private.audit_row_change();

create trigger admin_users_audit
after insert or update or delete on public.admin_users
for each row execute function app_private.audit_row_change();

alter table public.admin_users enable row level security;
alter table public.inventory_locations enable row level security;
alter table public.luminaire_carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.audit_events enable row level security;

create policy "Public can read inventory"
on public.inventory_locations for select
to anon, authenticated
using (true);

create policy "Administrators can insert inventory"
on public.inventory_locations for insert
to authenticated
with check ((select app_private.is_admin()));

create policy "Administrators can update inventory"
on public.inventory_locations for update
to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

create policy "Administrators can delete inventory"
on public.inventory_locations for delete
to authenticated
using ((select app_private.is_admin()));

create policy "Public can read carts"
on public.luminaire_carts for select
to anon, authenticated
using (true);

create policy "Administrators can insert carts"
on public.luminaire_carts for insert
to authenticated
with check ((select app_private.is_admin()));

create policy "Administrators can update carts"
on public.luminaire_carts for update
to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

create policy "Administrators can delete carts"
on public.luminaire_carts for delete
to authenticated
using ((select app_private.is_admin()));

create policy "Public can read cart items"
on public.cart_items for select
to anon, authenticated
using (true);

create policy "Administrators can insert cart items"
on public.cart_items for insert
to authenticated
with check ((select app_private.is_admin()));

create policy "Administrators can update cart items"
on public.cart_items for update
to authenticated
using ((select app_private.is_admin()))
with check ((select app_private.is_admin()));

create policy "Administrators can delete cart items"
on public.cart_items for delete
to authenticated
using ((select app_private.is_admin()));

create policy "Administrators can read administrator accounts"
on public.admin_users for select
to authenticated
using ((select app_private.is_admin()));

create policy "Administrators can read audit events"
on public.audit_events for select
to authenticated
using ((select app_private.is_admin()));

grant usage on schema public to anon, authenticated;
grant select on public.inventory_locations, public.luminaire_carts, public.cart_items to anon, authenticated;
grant insert, update, delete on public.inventory_locations, public.luminaire_carts, public.cart_items to authenticated;
grant select on public.admin_users, public.audit_events to authenticated;
grant usage, select on sequence public.audit_events_id_seq to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'inventory_locations'
  ) then
    alter publication supabase_realtime add table public.inventory_locations;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'luminaire_carts'
  ) then
    alter publication supabase_realtime add table public.luminaire_carts;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'cart_items'
  ) then
    alter publication supabase_realtime add table public.cart_items;
  end if;
end;
$$;
