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

create table if not exists public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  visit_id uuid not null,
  patient_id uuid not null,
  medicine_name text not null,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescriptions_visit_patient_fkey
    foreign key (visit_id, patient_id)
    references public.visits(id, patient_id)
    on delete cascade
);

create index if not exists visits_patient_visit_date_idx
  on public.visits(patient_id, visit_date desc);

create unique index if not exists visits_appointment_id_unique_idx
  on public.visits(appointment_id)
  where appointment_id is not null;

create index if not exists prescriptions_patient_created_at_idx
  on public.prescriptions(patient_id, created_at desc);

create index if not exists prescriptions_visit_id_idx
  on public.prescriptions(visit_id);

create or replace function public.set_clinical_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger set_patient_vitals_updated_at
before update on public.patient_vitals
for each row
execute function public.set_clinical_updated_at();

create trigger set_visits_updated_at
before update on public.visits
for each row
execute function public.set_clinical_updated_at();

create trigger set_prescriptions_updated_at
before update on public.prescriptions
for each row
execute function public.set_clinical_updated_at();

alter table public.patient_vitals enable row level security;
alter table public.visits enable row level security;
alter table public.prescriptions enable row level security;

grant select, insert, update on public.patient_vitals to authenticated;
grant select, insert, update on public.visits to authenticated;
grant select, insert, update, delete on public.prescriptions to authenticated;

create policy "Authenticated users can read patient vitals"
  on public.patient_vitals for select to authenticated using (true);
create policy "Authenticated users can insert patient vitals"
  on public.patient_vitals for insert to authenticated with check (true);
create policy "Authenticated users can update patient vitals"
  on public.patient_vitals for update to authenticated using (true) with check (true);

create policy "Authenticated users can read visits"
  on public.visits for select to authenticated using (true);
create policy "Authenticated users can insert visits"
  on public.visits for insert to authenticated with check (true);
create policy "Authenticated users can update visits"
  on public.visits for update to authenticated using (true) with check (true);

create policy "Authenticated users can read prescriptions"
  on public.prescriptions for select to authenticated using (true);
create policy "Authenticated users can insert prescriptions"
  on public.prescriptions for insert to authenticated with check (true);
create policy "Authenticated users can update prescriptions"
  on public.prescriptions for update to authenticated using (true) with check (true);
create policy "Authenticated users can delete prescriptions"
  on public.prescriptions for delete to authenticated using (true);
