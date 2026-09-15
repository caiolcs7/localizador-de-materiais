create extension if not exists pg_trgm with schema extensions;

alter table public.inventory_locations
  alter column endereco drop not null;

create index if not exists inventory_codigo_trgm_idx
  on public.inventory_locations
  using gin (codigo_normalizado extensions.gin_trgm_ops);

create index if not exists inventory_descritivo_trgm_idx
  on public.inventory_locations
  using gin (lower(descritivo) extensions.gin_trgm_ops)
  where descritivo is not null;

create index if not exists inventory_endereco_trgm_idx
  on public.inventory_locations
  using gin (lower(endereco) extensions.gin_trgm_ops)
  where endereco is not null;

create index if not exists inventory_bombona_trgm_idx
  on public.inventory_locations
  using gin (lower(bombona) extensions.gin_trgm_ops);

create index if not exists inventory_aliases_gin_idx
  on public.inventory_locations
  using gin (aliases);

create or replace function public.search_inventory_locations(
  p_query text,
  p_normalized text,
  p_bombona text,
  p_limit integer default 121,
  p_offset integer default 0,
  p_only_available boolean default false
)
returns setof public.inventory_locations
language sql
stable
security invoker
set search_path = ''
as $$
  with params as (
    select
      left(regexp_replace(btrim(coalesce(p_query, '')), '[%_]+', '', 'g'), 120) as query,
      left(btrim(coalesce(p_normalized, '')), 120) as normalized,
      left(btrim(coalesce(p_bombona, '')), 80) as bombona,
      least(greatest(coalesce(p_limit, 121), 1), 251) as row_limit,
      greatest(coalesce(p_offset, 0), 0) as row_offset,
      coalesce(p_only_available, false) as only_available
  ), ranked as (
    select
      location,
      case
        when location.codigo_normalizado = params.normalized
          or exists (
            select 1
            from unnest(location.aliases) as alias(value)
            where regexp_replace(upper(alias.value), '[[:space:]._/-]+', '', 'g') = params.normalized
          ) then 0
        when params.normalized ~ 'AI[46]$'
          and location.codigo_normalizado ~ 'AI[46]$'
          and left(location.codigo_normalizado, -1) = left(params.normalized, -1) then 1
        when location.bombona = params.bombona then 2
        when location.endereco = upper(params.query) then 3
        else 4
      end as match_family
    from public.inventory_locations as location
    cross join params
    where params.query <> ''
      and params.normalized <> ''
      and (
        not params.only_available
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
        location.codigo_normalizado = params.normalized
        or exists (
          select 1
          from unnest(location.aliases) as alias(value)
          where regexp_replace(upper(alias.value), '[[:space:]._/-]+', '', 'g') = params.normalized
        )
        or (
          params.normalized ~ 'AI[46]$'
          and location.codigo_normalizado ~ 'AI[46]$'
          and left(location.codigo_normalizado, -1) = left(params.normalized, -1)
        )
        or location.bombona = params.bombona
        or location.endereco = upper(params.query)
        or location.codigo_normalizado like '%' || params.normalized || '%'
        or lower(location.codigo) like '%' || lower(params.query) || '%'
        or lower(location.bombona) like '%' || lower(params.query) || '%'
        or lower(coalesce(location.endereco, '')) like '%' || lower(params.query) || '%'
        or lower(coalesce(location.descritivo, '')) like '%' || lower(params.query) || '%'
      )
  ), selected_family as (
    select min(match_family) as match_family
    from ranked
  )
  select (ranked.location).*
  from ranked
  cross join selected_family
  where ranked.match_family = selected_family.match_family
  order by
    case
      when (ranked.location).bombona ~* '^R' then 0
      when (ranked.location).endereco ~* '^R' then 1
      when (ranked.location).endereco ~* '^EXT' then 2
      else 3
    end,
    (ranked.location).codigo,
    (ranked.location).endereco nulls last,
    (ranked.location).bombona,
    (ranked.location).id
  limit (select row_limit from params)
  offset (select row_offset from params);
$$;

revoke all on function public.search_inventory_locations(text, text, text, integer, integer, boolean) from public;
grant execute on function public.search_inventory_locations(text, text, text, integer, integer, boolean) to anon, authenticated;

do $$
declare
  target_count integer;
  updated_count integer;
begin
  select count(*)::integer
  into target_count
  from public.inventory_locations as candidate
  where candidate.endereco is not null
    and candidate.descritivo ~* '\m(parafusos?|porcas?|arruelas?)\M'
    and upper(btrim(candidate.bombona)) in ('N/T', 'NT', 'N/A', 'NA', '-', 'SEM BOMBONA')
    and not exists (
      select 1
      from public.inventory_locations as protected
      where protected.codigo_normalizado = candidate.codigo_normalizado
        and upper(btrim(protected.bombona)) not in ('N/T', 'NT', 'N/A', 'NA', '-', 'SEM BOMBONA')
    );

  if target_count > 2000 then
    raise exception 'Migração cancelada: % registros excedem o limite seguro de 2000.', target_count;
  end if;

  update public.inventory_locations as candidate
  set endereco = null
  where candidate.endereco is not null
    and candidate.descritivo ~* '\m(parafusos?|porcas?|arruelas?)\M'
    and upper(btrim(candidate.bombona)) in ('N/T', 'NT', 'N/A', 'NA', '-', 'SEM BOMBONA')
    and not exists (
      select 1
      from public.inventory_locations as protected
      where protected.codigo_normalizado = candidate.codigo_normalizado
        and upper(btrim(protected.bombona)) not in ('N/T', 'NT', 'N/A', 'NA', '-', 'SEM BOMBONA')
    );

  get diagnostics updated_count = row_count;
  if updated_count <> target_count then
    raise exception 'Migração cancelada: identificados %, atualizados %.', target_count, updated_count;
  end if;

  raise notice 'Endereços removidos com segurança: %.', updated_count;
end;
$$;
