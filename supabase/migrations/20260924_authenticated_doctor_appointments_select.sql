do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'appointments'
      and cmd = 'SELECT'
      and roles @> array['authenticated']::name[]
  ) then
    create policy "Authenticated doctor can read appointments"
      on public.appointments
      for select
      to authenticated
      using (true);
  end if;
end
$$;