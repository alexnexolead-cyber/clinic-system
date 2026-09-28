create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  patient_code text unique,
  first_name text,
  last_name text,
  phone text,
  city text,
  created_at timestamp with time zone not null default now()
);

alter table public.patients enable row level security;

alter table public.appointments
  add column if not exists patient_id uuid references public.patients(id);

create index if not exists appointments_patient_id_idx
  on public.appointments(patient_id);