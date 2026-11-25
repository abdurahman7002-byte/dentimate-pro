-- =========================================================
-- Dentix local edition: POST-BOOT storage objects (buckets + object policies).
-- WHY SEPARATE: the storage schema (storage.buckets, storage.objects,
-- storage.foldername) is created by the storage-api service's own migrations
-- on ITS first start - it does not exist while the db container is still
-- running /docker-entrypoint-initdb.d scripts. Applying these statements at
-- initdb time fails with "relation storage.objects does not exist".
-- Apply ONCE after the stack is up and the storage service is healthy:
--   docker compose -f docker-compose.yml -f docker-compose.pg17.yml -f docker-compose.kong.yml -f ../docker-compose.dentix-override.yml --env-file .env.dentix \
--     exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < ../post-boot-storage.sql
-- Idempotent: safe to re-run (insert ... on conflict do nothing; drop policy if exists).
-- =========================================================
insert into storage.buckets (id, name, public)
values ('patient-files', 'patient-files', false),
       ('clinic-assets', 'clinic-assets', true)
on conflict (id) do nothing;

-- ---------- patient-files (private) ----------
-- create signed URLs / download: clinic folder + view permission
drop policy if exists dentix_pf_read on storage.objects;
create policy dentix_pf_read on storage.objects
    for select to authenticated
    using (
        bucket_id = 'patient-files'
        and public.clinic_owner_id() is not null
        and (storage.foldername(name))[1] = public.clinic_owner_id()::text
        and (public.has_perm('patient-file','view') or public.is_admin())
    );

drop policy if exists dentix_pf_write on storage.objects;
create policy dentix_pf_write on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'patient-files'
        and public.clinic_owner_id() is not null
        and (storage.foldername(name))[1] = public.clinic_owner_id()::text
        and (public.has_perm('patient-file','add') or public.is_admin())
    );

drop policy if exists dentix_pf_delete on storage.objects;
create policy dentix_pf_delete on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'patient-files'
        and public.clinic_owner_id() is not null
        and (storage.foldername(name))[1] = public.clinic_owner_id()::text
        and (public.has_perm('patient-file','delete') or public.is_admin())
    );

-- ---------- clinic-assets (public read, gated write) ----------
drop policy if exists dentix_ca_write on storage.objects;
create policy dentix_ca_write on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'clinic-assets'
        and public.clinic_owner_id() is not null
        and (storage.foldername(name))[1] = public.clinic_owner_id()::text
        and (public.has_perm('prints','add') or public.has_perm('patient-file','add') or public.is_admin())
    );

drop policy if exists dentix_ca_delete on storage.objects;
create policy dentix_ca_delete on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'clinic-assets'
        and public.clinic_owner_id() is not null
        and (storage.foldername(name))[1] = public.clinic_owner_id()::text
        and (public.has_perm('prints','delete') or public.is_admin())
    );

