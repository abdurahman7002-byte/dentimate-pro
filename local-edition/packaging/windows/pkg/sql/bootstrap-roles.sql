-- Windows-native spike: the minimum roles/schemas the supabase/postgres image
-- normally pre-creates. Synthetic spike only. Passwords come from psql vars.
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD :'pgpass';
GRANT anon, authenticated, service_role TO authenticator;
CREATE ROLE supabase_auth_admin LOGIN NOINHERIT CREATEROLE PASSWORD :'pgpass';
CREATE ROLE supabase_storage_admin LOGIN NOINHERIT CREATEROLE PASSWORD :'pgpass';
GRANT supabase_storage_admin TO authenticator;
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE SCHEMA IF NOT EXISTS auth AUTHORIZATION supabase_auth_admin;
GRANT USAGE ON SCHEMA public, extensions TO anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO supabase_auth_admin;
ALTER ROLE supabase_auth_admin SET search_path = auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
-- storage-api sets the caller's role per request (SET ROLE anon/authenticated/service_role)
GRANT anon, authenticated, service_role TO supabase_storage_admin;
