grant insert on public.patients to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'patients'
      and policyname = 'Authenticated users can create patients'
  ) then
    execute 'create policy "Authenticated users can create patients"
      on public.patients
      for insert
      to authenticated
      with check (true)';
  end if;
end
$$;
