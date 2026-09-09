begin;

create extension if not exists pgtap with schema extensions;

select plan(5);

set local role anon;

select lives_ok(
  $$
    insert into public.inventory_locations (
      id,
      codigo,
      codigo_normalizado,
      bombona,
      endereco,
      duplicate_override
    ) values (
      '00000000-0000-4000-8000-000000000001',
      'PUBLIC_RLS_TEST',
      'PUBLIC_RLS_TEST',
      'R99B999',
      'R99A1P01',
      false
    )
  $$,
  'a URL pública pode cadastrar uma localização'
);

select throws_ok(
  $$
    update public.inventory_locations
    set codigo = 'PUBLIC_UPDATE_MUST_FAIL'
    where id = '00000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table inventory_locations',
  'a URL pública não pode alterar uma localização'
);

select is(
  (
    select codigo
    from public.inventory_locations
    where id = '00000000-0000-4000-8000-000000000001'
  ),
  'PUBLIC_RLS_TEST',
  'a tentativa de alteração não modifica o item'
);

select throws_ok(
  $$
    delete from public.inventory_locations
    where id = '00000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  'permission denied for table inventory_locations',
  'a URL pública não pode excluir uma localização'
);

select is(
  (
    select count(*)::integer
    from public.inventory_locations
    where id = '00000000-0000-4000-8000-000000000001'
  ),
  1,
  'a tentativa de exclusão não remove o item'
);

select * from finish();
rollback;
