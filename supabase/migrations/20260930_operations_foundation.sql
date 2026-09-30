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

  execute format($create_requests$
    create table if not exists public.online_appointment_requests (
      id uuid primary key default gen_random_uuid(),
      patient_id uuid not null references public.patients(id) on delete restrict,
      appointment_id %s references public.appointments(id) on delete set null,
      appointment_type text not null,
      preferred_date date not null,
      status text not null default 'pending'
        check (status in ('pending', 'accepted', 'rejected')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  $create_requests$, appointment_id_type);
end
$$;

create unique index if not exists online_appointment_requests_appointment_id_idx
  on public.online_appointment_requests(appointment_id)
  where appointment_id is not null;
create index if not exists online_appointment_requests_status_created_at_idx
  on public.online_appointment_requests(status, created_at desc);
create index if not exists online_appointment_requests_patient_id_idx
  on public.online_appointment_requests(patient_id);

create or replace function public.set_operation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_online_appointment_requests_updated_at
  on public.online_appointment_requests;
create trigger set_online_appointment_requests_updated_at
before update on public.online_appointment_requests
for each row execute function public.set_operation_updated_at();

alter table public.online_appointment_requests enable row level security;
revoke all on public.online_appointment_requests from public, anon;
grant select, update on public.online_appointment_requests to authenticated;
grant select, insert on public.online_appointment_requests to service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'online_appointment_requests'
      and policyname = 'Authenticated users can read online appointment requests'
  ) then
    create policy "Authenticated users can read online appointment requests"
      on public.online_appointment_requests
      for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'online_appointment_requests'
      and policyname = 'Authenticated users can update online appointment requests'
  ) then
    create policy "Authenticated users can update online appointment requests"
      on public.online_appointment_requests
      for update to authenticated using (true) with check (true);
  end if;
end
$$;

create or replace function public.accept_online_appointment_request(request_id uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  request_row public.online_appointment_requests%rowtype;
  created_appointment_id public.appointments.id%type;
begin
  select * into request_row
  from public.online_appointment_requests
  where id = request_id
  for update;

  if not found then
    raise exception 'Online appointment request not found';
  end if;

  if request_row.status = 'accepted' and request_row.appointment_id is not null then
    return request_row.appointment_id::text;
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Only pending requests can be accepted';
  end if;

  insert into public.appointments (
    patient_id,
    first_name,
    last_name,
    phone,
    city,
    appointment_type,
    preferred_date,
    status
  )
  select
    patient.id,
    coalesce(patient.first_name, ''),
    coalesce(patient.last_name, ''),
    coalesce(patient.phone, ''),
    coalesce(patient.city, ''),
    request_row.appointment_type,
    request_row.preferred_date,
    'confirmed'
  from public.patients as patient
  where patient.id = request_row.patient_id
  returning id into created_appointment_id;

  if created_appointment_id is null then
    raise exception 'The request patient no longer exists';
  end if;

  update public.online_appointment_requests
  set status = 'accepted', appointment_id = created_appointment_id
  where id = request_row.id;

  return created_appointment_id::text;
end
$$;

revoke all on function public.accept_online_appointment_request(uuid) from public, anon;
grant execute on function public.accept_online_appointment_request(uuid) to authenticated;

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

  execute format($create_ledger$
    create table if not exists public.ledger_entries (
      id uuid primary key default gen_random_uuid(),
      patient_id uuid not null references public.patients(id) on delete restrict,
      visit_id uuid references public.visits(id) on delete set null,
      appointment_id %s references public.appointments(id) on delete set null,
      entry_type text not null check (entry_type in ('charge', 'payment')),
      amount numeric(12, 2) not null check (amount > 0),
      description text not null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )
  $create_ledger$, appointment_id_type);
end
$$;

create index if not exists ledger_entries_patient_created_at_idx
  on public.ledger_entries(patient_id, created_at desc);
create index if not exists ledger_entries_visit_id_idx
  on public.ledger_entries(visit_id)
  where visit_id is not null;
create index if not exists ledger_entries_appointment_id_idx
  on public.ledger_entries(appointment_id)
  where appointment_id is not null;

drop trigger if exists set_ledger_entries_updated_at on public.ledger_entries;
create trigger set_ledger_entries_updated_at
before update on public.ledger_entries
for each row execute function public.set_operation_updated_at();

alter table public.ledger_entries enable row level security;
revoke all on public.ledger_entries from public, anon;
grant select, insert, update on public.ledger_entries to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ledger_entries'
      and policyname = 'Authenticated users can read ledger entries'
  ) then
    create policy "Authenticated users can read ledger entries"
      on public.ledger_entries for select to authenticated using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ledger_entries'
      and policyname = 'Authenticated users can insert ledger entries'
  ) then
    create policy "Authenticated users can insert ledger entries"
      on public.ledger_entries for insert to authenticated with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ledger_entries'
      and policyname = 'Authenticated users can update ledger entries'
  ) then
    create policy "Authenticated users can update ledger entries"
      on public.ledger_entries for update to authenticated using (true) with check (true);
  end if;
end
$$;