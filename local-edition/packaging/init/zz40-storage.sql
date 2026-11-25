-- =========================================================
-- Dentix local edition: local file storage (replaces Cloudinary)
-- Run AFTER sql/employees.sql and sql/rls-clinical.sql.
--
-- Two buckets:
--   patient-files  PRIVATE. Paths are "<clinic_owner_uuid>/patient-files/...".
--                  The first path segment is the caller's CLINIC id
--                  (public.clinic_owner_id()): every active staff member
--                  of the clinic shares it, so colleagues with the right
--                  page permissions can open each other's uploads, while
--                  another clinic's folder is unreachable. Reads happen
--                  through short-lived signed URLs created at view time
--                  by js/storage-upload.js - never anonymous.
--   clinic-assets  PUBLIC READ (logos/print templates only - no patient
--                  data). Public read is bounded to the LAN because the
--                  stack is not internet-reachable; writes stay gated.
-- =========================================================
-- the client's upload root: this caller's clinic folder
create or replace function public.my_storage_prefix()
returns text
language sql
security definer
set search_path = public
stable
as $$
    select public.clinic_owner_id()::text;
$$;

revoke all on function public.my_storage_prefix() from anon;
grant execute on function public.my_storage_prefix() to authenticated;

-- ---------- pending_file_deletions: durable storage-cleanup recovery ----------
-- When a delete flow removes DB rows but the storage remove fails, the object
-- paths would be lost (patient_images rows cascade away). This table records
-- the paths BEFORE the DB delete; on storage success the rows are removed,
-- on failure they persist and are retried automatically on later sessions.
-- Authorization to delete the objects still comes from the storage policies
-- (clinic folder + patient-file delete permission), never from this table.
create table if not exists public.pending_file_deletions (
    id bigint generated always as identity primary key,
    bucket text not null,
    object_path text not null,
    patient_id bigint,
    requested_by uuid,
    attempts integer not null default 0,
    last_error text,
    created_at timestamptz not null default now(),
    user_id uuid
);

drop trigger if exists dentix_stamp_owner on public.pending_file_deletions;
create trigger dentix_stamp_owner before insert on public.pending_file_deletions
    for each row execute function public._dentix_stamp_owner();

alter table public.pending_file_deletions enable row level security;

drop policy if exists dentix_pfd_read on public.pending_file_deletions;
create policy dentix_pfd_read on public.pending_file_deletions
    for select to authenticated
    using (
        user_id = public.clinic_owner_id()
        and (public.has_perm('patient-file','delete') or public.is_admin())
    );

drop policy if exists dentix_pfd_write on public.pending_file_deletions;
create policy dentix_pfd_write on public.pending_file_deletions
    for insert to authenticated
    with check (
        public.clinic_owner_id() is not null
        and (public.has_perm('patient-file','delete') or public.is_admin())
    );

drop policy if exists dentix_pfd_delete on public.pending_file_deletions;
create policy dentix_pfd_delete on public.pending_file_deletions
    for delete to authenticated
    using (
        user_id = public.clinic_owner_id()
        and (public.has_perm('patient-file','delete') or public.is_admin())
    );

grant select, insert, delete on public.pending_file_deletions to authenticated;
