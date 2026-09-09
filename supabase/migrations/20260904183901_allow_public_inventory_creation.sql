alter table public.inventory_locations
  add constraint inventory_public_text_limits check (
    char_length(codigo) <= 120
    and char_length(codigo_normalizado) <= 120
    and char_length(bombona) <= 80
    and char_length(endereco) <= 160
    and char_length(coalesce(codigo_original, '')) <= 120
    and char_length(coalesce(endereco_original, '')) <= 160
    and char_length(coalesce(rua, '')) <= 80
    and char_length(coalesce(descritivo, '')) <= 2000
    and char_length(coalesce(observacoes, '')) <= 2000
    and char_length(coalesce(grupo, '')) <= 120
    and char_length(coalesce(arquivo_origem, '')) <= 255
    and char_length(coalesce(registro_tipo, '')) <= 80
    and cardinality(aliases) <= 20
  );

create policy "Public can create inventory"
on public.inventory_locations for insert
to anon
with check (
  duplicate_override = false
  and version = 1
  and created_by is null
  and updated_by is null
);

grant insert on public.inventory_locations to anon;
