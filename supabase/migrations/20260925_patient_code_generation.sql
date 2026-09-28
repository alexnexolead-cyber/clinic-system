create sequence if not exists public.patient_code_seq;

select setval(
  'public.patient_code_seq',
  greatest(
    coalesce(
      (
        select max(substring(patient_code from 5)::bigint)
        from public.patients
        where patient_code ~ '^PAT-[0-9]+$'
      ),
      0
    ) + 1,
    1
  ),
  false
);

create or replace function public.generate_patient_code()
returns trigger
language plpgsql
as $$
begin
  if new.patient_code is null or btrim(new.patient_code) = '' then
    new.patient_code := 'PAT-' || lpad(nextval('public.patient_code_seq')::text, 5, '0');
  end if;

  return new;
end;
$$;

drop trigger if exists set_patient_code on public.patients;

create trigger set_patient_code
before insert on public.patients
for each row
execute function public.generate_patient_code();

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'Authenticated users can read patients'
  ) then
    create policy "Authenticated users can read patients"
      on public.patients
      for select
      to authenticated
      using (true);
  end if;
end
$$;
