create or replace function public.search_inventory_locations(
  p_query text,
  p_normalized text,
  p_bombona text,
  p_limit integer default 121,
  p_offset integer default 0,
  p_only_available boolean default false
)
returns setof public.inventory_locations
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  search_text text := left(regexp_replace(btrim(coalesce(p_query, '')), '[%_]+', '', 'g'), 120);
  normalized_text text := left(btrim(coalesce(p_normalized, '')), 120);
  formatted_bombona text := left(btrim(coalesce(p_bombona, '')), 80);
  row_limit integer := least(greatest(coalesce(p_limit, 121), 1), 251);
  row_offset integer := greatest(coalesce(p_offset, 0), 0);
  only_available boolean := coalesce(p_only_available, false);
begin
  if search_text = '' or normalized_text = '' then
    return;
  end if;

  return query
  select location.*
  from public.inventory_locations as location
  where (
      not only_available
      or coalesce(location.quantidade, 0) > 0
      or (
        location.bombona ~* '^R[0-9]+B[0-9]{3}S?$'
        and (
          coalesce(location.descritivo, '') ~* '\m(parafusos?|porcas?|arruelas?|terminais?)\M'
          or location.codigo_normalizado ~ '^(ITPF|ITPRC|ITAR)'
        )
      )
    )
    and location.codigo_normalizado = normalized_text
  order by
    case
      when location.bombona ~* '^R' then 0
      when location.endereco ~* '^R' then 1
      when location.endereco ~* '^EXT' then 2
      else 3
    end,
    location.codigo,
    location.endereco nulls last,
    location.bombona,
    location.id
  limit row_limit
  offset row_offset;
  if found then return; end if;

  return query
  select location.*
  from public.inventory_locations as location
  where (
      not only_available
      or coalesce(location.quantidade, 0) > 0
      or (
        location.bombona ~* '^R[0-9]+B[0-9]{3}S?$'
        and (
          coalesce(location.descritivo, '') ~* '\m(parafusos?|porcas?|arruelas?|terminais?)\M'
          or location.codigo_normalizado ~ '^(ITPF|ITPRC|ITAR)'
        )
      )
    )
    and (
      location.aliases @> array[upper(search_text)]
      or location.aliases @> array[normalized_text]
    )
  order by location.codigo, location.endereco nulls last, location.id
  limit row_limit
  offset row_offset;
  if found then return; end if;

  if normalized_text ~ 'AI[46]$' then
    return query
    select location.*
    from public.inventory_locations as location
    where (
        not only_available
        or coalesce(location.quantidade, 0) > 0
        or (
          location.bombona ~* '^R[0-9]+B[0-9]{3}S?$'
          and (
            coalesce(location.descritivo, '') ~* '\m(parafusos?|porcas?|arruelas?|terminais?)\M'
            or location.codigo_normalizado ~ '^(ITPF|ITPRC|ITAR)'
          )
        )
      )
      and location.codigo_normalizado ~ 'AI[46]$'
      and left(location.codigo_normalizado, -1) = left(normalized_text, -1)
    order by location.codigo, location.endereco nulls last, location.id
    limit row_limit
    offset row_offset;
    if found then return; end if;
  end if;

  return query
  select location.*
  from public.inventory_locations as location
  where (
      not only_available
      or coalesce(location.quantidade, 0) > 0
      or (
        location.bombona ~* '^R[0-9]+B[0-9]{3}S?$'
        and (
          coalesce(location.descritivo, '') ~* '\m(parafusos?|porcas?|arruelas?|terminais?)\M'
          or location.codigo_normalizado ~ '^(ITPF|ITPRC|ITAR)'
        )
      )
    )
    and location.bombona = formatted_bombona
  order by location.codigo, location.endereco nulls last, location.id
  limit row_limit
  offset row_offset;
  if found then return; end if;

  return query
  select location.*
  from public.inventory_locations as location
  where (
      not only_available
      or coalesce(location.quantidade, 0) > 0
      or (
        location.bombona ~* '^R[0-9]+B[0-9]{3}S?$'
        and (
          coalesce(location.descritivo, '') ~* '\m(parafusos?|porcas?|arruelas?|terminais?)\M'
          or location.codigo_normalizado ~ '^(ITPF|ITPRC|ITAR)'
        )
      )
    )
    and location.endereco = upper(search_text)
  order by location.codigo, location.bombona, location.id
  limit row_limit
  offset row_offset;
  if found then return; end if;

  return query
  select location.*
  from public.inventory_locations as location
  where (
      not only_available
      or coalesce(location.quantidade, 0) > 0
      or (
        location.bombona ~* '^R[0-9]+B[0-9]{3}S?$'
        and (
          coalesce(location.descritivo, '') ~* '\m(parafusos?|porcas?|arruelas?|terminais?)\M'
          or location.codigo_normalizado ~ '^(ITPF|ITPRC|ITAR)'
        )
      )
    )
    and (
      location.codigo_normalizado like '%' || normalized_text || '%'
      or lower(location.bombona) like '%' || lower(search_text) || '%'
      or lower(coalesce(location.endereco, '')) like '%' || lower(search_text) || '%'
      or lower(coalesce(location.descritivo, '')) like '%' || lower(search_text) || '%'
    )
  order by
    case when location.codigo_normalizado like normalized_text || '%' then 0 else 1 end,
    case
      when location.bombona ~* '^R' then 0
      when location.endereco ~* '^R' then 1
      when location.endereco ~* '^EXT' then 2
      else 3
    end,
    location.codigo,
    location.endereco nulls last,
    location.bombona,
    location.id
  limit row_limit
  offset row_offset;
end;
$$;
