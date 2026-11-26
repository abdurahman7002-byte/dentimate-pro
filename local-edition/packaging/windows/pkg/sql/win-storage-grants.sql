-- Stock Postgres lacks the grants the supabase image ships for the storage schema.
grant usage on schema storage to anon, authenticated, service_role;
grant all on all tables in schema storage to anon, authenticated, service_role;
grant all on all sequences in schema storage to anon, authenticated, service_role;
grant all on all routines in schema storage to anon, authenticated, service_role;
alter default privileges for role supabase_storage_admin in schema storage grant all on tables to anon, authenticated, service_role;
alter default privileges for role supabase_storage_admin in schema storage grant all on sequences to anon, authenticated, service_role;
alter default privileges for role supabase_storage_admin in schema storage grant all on routines to anon, authenticated, service_role;
