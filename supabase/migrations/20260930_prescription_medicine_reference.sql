do $$
declare
  medicine_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into medicine_id_type
  from pg_attribute as attribute
  where attribute.attrelid = 'public.medicines'::regclass
    and attribute.attname = 'id'
    and not attribute.attisdropped;

  if medicine_id_type is null then
    raise exception 'Could not determine public.medicines.id type';
  end if;

  if not exists (
    select 1
    from pg_attribute
    where attrelid = 'public.prescription_items'::regclass
      and attname = 'medicine_id'
      and not attisdropped
  ) then
    execute format(
      'alter table public.prescription_items add column medicine_id %s',
      medicine_id_type
    );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.prescription_items'::regclass
      and conname = 'prescription_items_medicine_id_fkey'
  ) then
    alter table public.prescription_items
      add constraint prescription_items_medicine_id_fkey
      foreign key (medicine_id)
      references public.medicines(id)
      on delete set null;
  end if;
end
$$;

create index if not exists prescription_items_medicine_id_idx
  on public.prescription_items(medicine_id);