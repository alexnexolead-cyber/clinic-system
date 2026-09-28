alter table public.appointments enable row level security;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and cmd = 'INSERT'
  loop
    execute format(
      'drop policy if exists %I on public.appointments',
      existing_policy.policyname
    );
  end loop;

  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and cmd = 'SELECT'
  loop
    execute format(
      'drop policy if exists %I on public.appointments',
      existing_policy.policyname
    );
  end loop;
end
$$;

create policy "Allow appointment booking"
on public.appointments
for insert
to anon, authenticated
with check (true);

create policy "Authenticated users can read appointments"
on public.appointments
for select
to authenticated
using (true);
