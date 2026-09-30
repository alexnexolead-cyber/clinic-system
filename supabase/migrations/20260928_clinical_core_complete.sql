create table if not exists public.patient_vitals (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.patients(id) on delete cascade,
  blood_pressure text,
  pulse numeric,
  temperature numeric,
  weight numeric,
  height numeric,
  oxygen_saturation numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare
  appointment_id_type text;
begin
  select format_type(attribute.atttypid, attribute.atttypmod)
    into appointment_id_type
  from pg_attribute as attribute
  where attribute.attrelid = 'public.appointments'::regclass
    and attribute.attname = 'id'
    and not attribute.attisdropped;

  if appointment_id_type is null then
    raise exception 'Could not determine public.appointments.id type';
  end if;

  execute format($create_visits$
    create table if not exists public.visits (
      id uuid primary key default gen_random_uuid(),
      patient_id uuid not null references public.patients(id) on delete cascade,
      appointment_id %s references public.appointments(id) on delete set null,
      visit_date timestamptz not null default now(),
      visit_type text,
      chief_complaint text,
      diagnosis text,
      clinical_notes text,
      status text not null default 'in_progress'
        check (status in ('in_progress', 'completed')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (id, patient_id)
    )
  $create_visits$, appointment_id_type);
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.visits'::regclass
      and conname = 'visits_id_patient_id_key'
  ) then
    alter table public.visits
      add constraint visits_id_patient_id_key unique (id, patient_id);
  end if;
end
$$;

create index if not exists visits_patient_id_idx
  on public.visits(patient_id);
create index if not exists visits_visit_date_idx
  on public.visits(visit_date desc);
create unique index if not exists visits_appointment_id_unique_idx
  on public.visits(appointment_id)
  where appointment_id is not null;

create or replace function public.set_clinical_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_patient_vitals_updated_at on public.patient_vitals;
create trigger set_patient_vitals_updated_at
before update on public.patient_vitals
for each row
execute function public.set_clinical_updated_at();

drop trigger if exists set_visits_updated_at on public.visits;
create trigger set_visits_updated_at
before update on public.visits
for each row
execute function public.set_clinical_updated_at();

do $$
declare
  has_flat_prescriptions boolean;
begin
  if to_regclass('public.prescriptions') is not null then
    select exists (
      select 1 from pg_attribute
      where attrelid = 'public.prescriptions'::regclass
        and attname = 'medicine_name'
        and not attisdropped
    ) into has_flat_prescriptions;

    if has_flat_prescriptions then
      if to_regclass('public.prescriptions_legacy') is not null then
        raise exception 'Both flat public.prescriptions and public.prescriptions_legacy exist; inspect before migrating';
      end if;
      alter table public.prescriptions rename to prescriptions_legacy;
    end if;
  end if;
end
$$;

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null unique,
  patient_id uuid not null references public.patients(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, patient_id),
  constraint prescriptions_visit_patient_fkey
    foreign key (visit_id, patient_id)
    references public.visits(id, patient_id)
    on delete cascade
);

create table if not exists public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references public.prescriptions(id) on delete cascade,
  medicine_name text not null,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  created_at timestamptz not null default now()
);

create index if not exists prescriptions_patient_id_idx
  on public.prescriptions(patient_id);
create index if not exists prescription_items_prescription_id_idx
  on public.prescription_items(prescription_id);

do $$
begin
  if to_regclass('public.prescriptions_legacy') is not null then
    execute $migrate_containers$
      insert into public.prescriptions (id, visit_id, patient_id, created_at, updated_at)
      select distinct on (legacy.visit_id)
        legacy.id,
        legacy.visit_id,
        legacy.patient_id,
        legacy.created_at,
        legacy.updated_at
      from public.prescriptions_legacy as legacy
      order by legacy.visit_id, legacy.created_at, legacy.id
      on conflict (visit_id) do nothing
    $migrate_containers$;

    execute $migrate_items$
      insert into public.prescription_items (
        id,
        prescription_id,
        medicine_name,
        dosage,
        frequency,
        duration,
        instructions,
        created_at
      )
      select
        legacy.id,
        prescription.id,
        legacy.medicine_name,
        legacy.dosage,
        legacy.frequency,
        legacy.duration,
        legacy.instructions,
        legacy.created_at
      from public.prescriptions_legacy as legacy
      join public.prescriptions as prescription
        on prescription.visit_id = legacy.visit_id
       and prescription.patient_id = legacy.patient_id
      on conflict (id) do nothing
    $migrate_items$;
  end if;
end
$$;

drop trigger if exists set_prescriptions_updated_at on public.prescriptions;
create trigger set_prescriptions_updated_at
before update on public.prescriptions
for each row
execute function public.set_clinical_updated_at();

alter table public.patient_vitals enable row level security;
alter table public.visits enable row level security;
alter table public.prescriptions enable row level security;
alter table public.prescription_items enable row level security;

grant select, insert, update on public.patient_vitals to authenticated;
grant select, insert, update on public.visits to authenticated;
grant select, insert, update on public.prescriptions to authenticated;
grant select, insert, update, delete on public.prescription_items to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'patient_vitals'
      and policyname = 'Authenticated users can read patient vitals'
  ) then
    execute 'create policy "Authenticated users can read patient vitals"
      on public.patient_vitals for select to authenticated using (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'patient_vitals'
      and policyname = 'Authenticated users can insert patient vitals'
  ) then
    execute 'create policy "Authenticated users can insert patient vitals"
      on public.patient_vitals for insert to authenticated with check (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'patient_vitals'
      and policyname = 'Authenticated users can update patient vitals'
  ) then
    execute 'create policy "Authenticated users can update patient vitals"
      on public.patient_vitals for update to authenticated using (true) with check (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'visits'
      and policyname = 'Authenticated users can read visits'
  ) then
    execute 'create policy "Authenticated users can read visits"
      on public.visits for select to authenticated using (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'visits'
      and policyname = 'Authenticated users can insert visits'
  ) then
    execute 'create policy "Authenticated users can insert visits"
      on public.visits for insert to authenticated with check (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'visits'
      and policyname = 'Authenticated users can update visits'
  ) then
    execute 'create policy "Authenticated users can update visits"
      on public.visits for update to authenticated using (true) with check (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prescriptions'
      and policyname = 'Authenticated users can read prescriptions'
  ) then
    execute 'create policy "Authenticated users can read prescriptions"
      on public.prescriptions for select to authenticated using (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prescriptions'
      and policyname = 'Authenticated users can insert prescriptions'
  ) then
    execute 'create policy "Authenticated users can insert prescriptions"
      on public.prescriptions for insert to authenticated with check (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prescriptions'
      and policyname = 'Authenticated users can update prescriptions'
  ) then
    execute 'create policy "Authenticated users can update prescriptions"
      on public.prescriptions for update to authenticated using (true) with check (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prescription_items'
      and policyname = 'Authenticated users can read prescription items'
  ) then
    execute 'create policy "Authenticated users can read prescription items"
      on public.prescription_items for select to authenticated using (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prescription_items'
      and policyname = 'Authenticated users can insert prescription items'
  ) then
    execute 'create policy "Authenticated users can insert prescription items"
      on public.prescription_items for insert to authenticated with check (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prescription_items'
      and policyname = 'Authenticated users can update prescription items'
  ) then
    execute 'create policy "Authenticated users can update prescription items"
      on public.prescription_items for update to authenticated using (true) with check (true)';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'prescription_items'
      and policyname = 'Authenticated users can delete prescription items'
  ) then
    execute 'create policy "Authenticated users can delete prescription items"
      on public.prescription_items for delete to authenticated using (true)';
  end if;
end
$$;
