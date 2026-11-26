-- =========================================================
-- Dentix local edition: employees, permissions, authorization
-- Run in the LOCAL self-hosted Supabase SQL editor.
--
-- Model:
--   clinic_admins          explicit owner/admin accounts. NO implicit
--                          ownership: an account is an admin only if a
--                          row here says so (inserted at install time).
--   employees              one row per staff login, owned by an admin.
--   employee_permissions   per-employee, per-page view/add/edit/delete.
--
-- Every authorization decision goes through has_perm(), which fails
-- CLOSED: no admin row and no active-employee row with the flag = deny.
-- RLS evaluates per query, so deactivating an employee cuts database
-- access immediately, even for sessions that are still signed in.
-- =========================================================

create table if not exists public.clinic_admins (
    user_id     uuid primary key references auth.users (id) on delete cascade,
    created_at  timestamptz not null default now()
);

alter table public.clinic_admins enable row level security;

-- an admin can see the admin list; nobody else can read it
create policy clinic_admins_select on public.clinic_admins
    for select to authenticated
    using (user_id = auth.uid());

-- =========================================================

create table if not exists public.employees (
    id           uuid primary key default gen_random_uuid(),
    owner_id     uuid not null references auth.users (id) on delete cascade,
    auth_user_id uuid unique references auth.users (id) on delete set null,
    full_name    text not null,
    email        text not null,
    active       boolean not null default true,
    created_at   timestamptz not null default now()
);

create table if not exists public.employee_permissions (
    id          bigint generated always as identity primary key,
    employee_id uuid not null references public.employees (id) on delete cascade,
    page_key    text not null,
    can_view    boolean not null default false,
    can_add     boolean not null default false,
    can_edit    boolean not null default false,
    can_delete  boolean not null default false,
    unique (employee_id, page_key)
);

alter table public.employees enable row level security;
alter table public.employee_permissions enable row level security;

-- =========================================================
-- helpers
-- =========================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select exists (
        select 1 from public.clinic_admins a
        where a.user_id = auth.uid()
    );
$$;

-- the clinic account whose data the current user may touch:
-- the admin's own id, or the owning clinic of an ACTIVE employee.
-- returns null (deny) for deactivated employees and unknown users.
create or replace function public.clinic_owner_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
    select coalesce(
        (select a.user_id from public.clinic_admins a
          where a.user_id = auth.uid()),
        (select e.owner_id from public.employees e
          where e.auth_user_id = auth.uid() and e.active)
    );
$$;

-- ownership stamp: every inserted row belongs to the caller's clinic,
-- no matter what the client sent. Covers legacy write paths that omit
-- user_id and employee sessions (whose own uid is NOT the tenant id).
-- A caller with no clinic stamps NULL and RLS fails closed.
create or replace function public._dentix_stamp_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.user_id := public.clinic_owner_id();
    return new;
end
$$;

-- text-column variant for legacy tables whose user_id is text
create or replace function public._dentix_stamp_owner_text()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.user_id := public.clinic_owner_id()::text;
    return new;
end
$$;

-- tenant-link validation: a row may only reference a patient/visit that
-- belongs to the caller's clinic, on INSERT and on UPDATE (no reparenting
-- across clinics). NULL links stay allowed (schema permits them today).
create or replace function public._dentix_check_patient_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.patient_id is not null and not exists (
        select 1 from public.patients p
        where p.id = new.patient_id and p.user_id = public.clinic_owner_id()
    ) then
        raise exception 'patient_id does not belong to this clinic';
    end if;
    return new;
end
$$;

create or replace function public._dentix_check_visit_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.visit_id is not null and not exists (
        select 1 from public.patient_visits v
        where v.id = new.visit_id and v.user_id = public.clinic_owner_id()
    ) then
        raise exception 'visit_id does not belong to this clinic';
    end if;
    return new;
end
$$;

-- internal helpers are not API: only the policy helpers stay callable
revoke execute on function public._dentix_stamp_owner() from public, anon, authenticated;
revoke execute on function public._dentix_stamp_owner_text() from public, anon, authenticated;
revoke execute on function public._dentix_check_patient_link() from public, anon, authenticated;
revoke execute on function public._dentix_check_visit_link() from public, anon, authenticated;

-- the single authorization gate. p_action in ('view','add','edit','delete').
create or replace function public.has_perm(p_page_key text, p_action text)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
    if auth.uid() is null then
        return false;
    end if;

    if public.is_admin() then
        return true;
    end if;

    return exists (
        select 1
        from public.employees e
        join public.employee_permissions p on p.employee_id = e.id
        where e.auth_user_id = auth.uid()
          and e.active
          and p.page_key = p_page_key
          and case p_action
                when 'view'   then p.can_view
                when 'add'    then p.can_add
                when 'edit'   then p.can_edit
                when 'delete' then p.can_delete
                else false
              end
    );
end;
$$;

-- used by js/page-guard.js for UI routing
create or replace function public.can_access_page(p_page_key text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
    select public.has_perm(p_page_key, 'view');
$$;

-- =========================================================
-- RLS on the permission tables themselves: admins manage their
-- own employees; an employee may read ONLY its own row (needed by
-- the guard and to know its own permissions) and cannot change it.
-- =========================================================

create policy employees_admin_all on public.employees
    for all to authenticated
    using (owner_id = auth.uid() and public.is_admin())
    with check (owner_id = auth.uid() and public.is_admin());

create policy employees_self_read on public.employees
    for select to authenticated
    using (auth_user_id = auth.uid() and active);

create policy perms_admin_all on public.employee_permissions
    for all to authenticated
    using (exists (
        select 1 from public.employees e
        where e.id = employee_id
          and e.owner_id = auth.uid()
          and public.is_admin()
    ))
    with check (exists (
        select 1 from public.employees e
        where e.id = employee_id
          and e.owner_id = auth.uid()
          and public.is_admin()
    ));

create policy perms_self_read on public.employee_permissions
    for select to authenticated
    using (exists (
        select 1 from public.employees e
        where e.id = employee_id
          and e.auth_user_id = auth.uid()
          and e.active
    ));

-- =========================================================
-- bootstrap_first_admin(): ONE-TIME first-owner creation, called only by
-- the provisioning service (service_role) while NO admin exists.
-- The advisory lock serializes concurrent attempts; the empty check makes
-- replay and any post-install call fail closed. p_user_id must reference
-- auth.users (enforced by the FK on clinic_admins). Never callable by
-- anon/authenticated.
-- =========================================================
create or replace function public.bootstrap_first_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    perform pg_advisory_xact_lock(hashtext('dentix_first_admin_bootstrap'));
    if exists (select 1 from public.clinic_admins) then
        raise exception 'admin_exists';
    end if;
    insert into public.clinic_admins (user_id) values (p_user_id);
end;
$$;

revoke all on function public.bootstrap_first_admin(uuid) from public, anon, authenticated;
grant execute on function public.bootstrap_first_admin(uuid) to service_role;

-- =========================================================
-- first_allowed_page(): where the app sends a signed-in user
-- whose requested page is not permitted. Ordered preference;
-- returns a page FILENAME or null when nothing is viewable.
-- =========================================================
create or replace function public.first_allowed_page()
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
    m constant text[][] := array[
        ['dashboard',    'dashboard.html'],
        ['patients',     'patients.html'],
        ['patient-file', 'patients-files.html'],
        ['waiting',      'waiting.html'],
        ['drugs',        'drugs.html'],
        ['doctors',      'doctors.html'],
        ['labs',         'labs.html'],
        ['prints',       'prints.html'],
        ['reports',      'reports.html'],
        ['storage',      'storage.html'],
        ['employees',    'employees.html'],
        ['control',      'control.html'],
        ['bill',         'Bill.html']
    ];
    pair text[];
begin
    if auth.uid() is null then
        return null;
    end if;
    foreach pair slice 1 in array m loop
        if public.has_perm(pair[1], 'view') then
            return pair[2];
        end if;
    end loop;
    return null;
end;
$$;

grant execute on function public.first_allowed_page() to authenticated;
grant execute on function public.clinic_owner_id() to authenticated;

-- =========================================================
-- user_roles: UNUSED legacy authorization table. The live app
-- code that read it (auth.js getRole, user_id column) is gone in
-- this edition; the enforced model is clinic_admins + employees +
-- employee_permissions. Default-deny everything here so it can
-- never become a parallel privilege path (no self-assignment /
-- escalation): row security forced, no policies, and direct
-- table grants pulled from API roles. service_role (owner-side
-- tooling) keeps access by bypassing RLS.
-- =========================================================
alter table public.user_roles enable row level security;
alter table public.user_roles force row level security;
revoke all on public.user_roles from anon, authenticated;

-- employees.owner_id defaults to the caller: the management UI inserts
-- {full_name, email} only; the row must still satisfy employees_admin_all
-- (owner_id = auth.uid()).
alter table public.employees alter column owner_id set default auth.uid();
