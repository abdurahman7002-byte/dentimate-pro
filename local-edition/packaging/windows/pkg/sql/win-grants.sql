-- Table access for the API roles on a stock PostgreSQL (the Supabase image does this by default).
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
grant execute on all functions in schema public to anon, authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- storage-api creates its own schema and tables on first start
grant create on database postgres to supabase_storage_admin;
grant usage on schema public to supabase_storage_admin;
