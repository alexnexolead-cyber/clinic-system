do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and cmd = 'UPDATE'
  loop
    execute format(
      'drop policy if exists %I on public.appointments',
      existing_policy.policyname
    );
  end loop;
end
$$;

create policy "Authenticated users can update appointment status"
on public.appointments
for update
to authenticated
using (true)
with check (true);
