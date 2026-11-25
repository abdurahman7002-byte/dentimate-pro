-- =========================================================
-- Dentix local edition: server-side enforcement on clinical tables
-- Run AFTER sql/employees.sql in the LOCAL Supabase SQL editor.
--
-- Every policy = tenancy (row belongs to the caller's clinic)
--              + permission (has_perm on the page key, per action).
-- Deactivating an employee flips clinic_owner_id() to null, so all
-- of these policies deny on the very next query, existing session
-- or not.
--
-- ASSUMPTIONS - verify against the schema dump BEFORE running
-- (queries provided in setup/LOCAL_SETUP.md):
--   1. every table below has a `user_id` column carrying the clinic
--      account id (confirmed in client code for patients,
--      patient_visits and 20+ other call sites; NOT confirmed per
--      table from the database itself)
--   2. patient_visits.patient_id is the FK to patients.id
--      (confirmed as an insert column in js/patients.js)
--   3. no existing policies/triggers conflict (unknown until dump)
-- Tables without user_id are DENIED until explicitly mapped. Pre-existing
-- policies are never dropped silently: each table with legacy policies is
-- listed and skipped until the schema review confirms replacement, then the
-- call is rerun with p_replace_existing => true.
-- =========================================================

-- generic tenant-link validation. Trigger args come in pairs:
-- TG_ARGV[2k] = link column, TG_ARGV[2k+1] = parent table. Any non-null
-- link must reference a parent row owned by the caller's clinic.
create or replace function public._dentix_check_link()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    i int;
    link_val text;
    ok boolean;
begin
    for i in 0 .. (tg_nargs / 2 - 1) loop
        link_val := to_jsonb(new) ->> tg_argv[2*i];
        if link_val is not null then
            execute format(
                'select exists (select 1 from public.%I p where p.id::text = $1 and p.user_id = public.clinic_owner_id())',
                tg_argv[2*i+1])
            into ok using link_val;
            if not ok then
                raise exception '% does not belong to this clinic', tg_argv[2*i];
            end if;
        end if;
    end loop;
    return new;
end
$$;

revoke execute on function public._dentix_check_link() from public, anon, authenticated;

create or replace function public._apply_page_policies(
    p_table text, p_write_key text, p_read_keys text[] default '{}',
    p_replace_existing boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    p text;
    existing text;
    v_cmp text;
    v_stamp text;
begin
    if not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = p_table
    ) then
        raise notice 'MISSING TABLE % - skipped (not present in this database)', p_table;
        return;
    end if;

    execute format('alter table public.%I enable row level security', p_table);
    execute format('revoke all on public.%I from anon', p_table);

    if not exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = p_table and column_name = 'user_id'
    ) then
        -- UNCLASSIFIED TABLE: deny everything until a human maps it
        -- explicitly. RLS is on and no policy is created, so every role
        -- (including admin) is refused until reviewed.
        raise notice 'UNCLASSIFIED %: no user_id column - access DENIED until explicit mapping', p_table;
        return;
    end if;

    -- existing policies may carry business/tenant rules we have not seen.
    -- Never drop them silently: list and skip unless the caller explicitly
    -- confirms replacement after schema review (p_replace_existing = true).
    select string_agg(policyname, ', ') into existing
    from pg_policies
    where schemaname = 'public' and tablename = p_table
      and policyname not like 'dentix\_%';

    if existing is not null and not p_replace_existing then
        raise notice 'REVIEW NEEDED %: existing policies [%] left untouched - rerun with p_replace_existing=true only after schema review',
            p_table, existing;
        return;
    end if;

    -- type-aware owner comparison (uuid columns compare directly; legacy
    -- text columns compare against the cast owner id)
    select case data_type when 'uuid' then 'user_id = public.clinic_owner_id()'
                          else 'user_id = public.clinic_owner_id()::text' end,
           case data_type when 'uuid' then 'public._dentix_stamp_owner'
                          else 'public._dentix_stamp_owner_text' end
    into v_cmp, v_stamp
    from information_schema.columns
    where table_schema = 'public' and table_name = p_table and column_name = 'user_id';

    -- ownership stamp: one mechanism for every write path, including
    -- legacy inserts that omit user_id and employee sessions
    execute format('drop trigger if exists dentix_stamp_owner on public.%I', p_table);
    execute format(
        'create trigger dentix_stamp_owner before insert on public.%I
         for each row execute function ' || v_stamp || '()', p_table);


    -- reached only when p_replace_existing = true (post-review): permissive
    -- policies are OR-ed with ours, so the reviewed legacy set is retired
    -- before the dentix_* set is created
    for p in select policyname from pg_policies
             where schemaname = 'public' and tablename = p_table
               and policyname not like 'dentix\_%'
    loop
        execute format('drop policy %I on public.%I', p, p_table);
    end loop;

    -- our own policies are always safe to refresh (idempotent reruns)
    foreach p in array array['dentix_select','dentix_insert','dentix_update','dentix_delete']
    loop
        execute format('drop policy if exists %I on public.%I', p, p_table);
    end loop;

    -- SELECT: write page OR any read-only page with view permission
    execute format(
        'create policy dentix_select on public.%I for select to authenticated
         using (' || v_cmp || '
                and (public.has_perm(%L, ''view'')
                     or (select coalesce(bool_or(public.has_perm(k, ''view'')), false)
                         from unnest(%L::text[]) k)))',
        p_table, p_write_key, p_read_keys);

    -- INSERT/UPDATE/DELETE: only the owning page, gated per action
    execute format(
        'create policy dentix_insert on public.%I for insert to authenticated
         with check (' || v_cmp || ' and public.has_perm(%L, ''add''))',
        p_table, p_write_key);
    execute format(
        'create policy dentix_update on public.%I for update to authenticated
         using (' || v_cmp || ' and public.has_perm(%L, ''edit''))
         with check (' || v_cmp || ' and public.has_perm(%L, ''edit''))',
        p_table, p_write_key, p_write_key);
    execute format(
        'create policy dentix_delete on public.%I for delete to authenticated
         using (' || v_cmp || ' and public.has_perm(%L, ''delete''))',
        p_table, p_write_key);
end;
$$;

-- Child tables carry no user_id; tenancy is inherited from the parent
-- row they reference (verified against the live FK metadata).
create or replace function public._apply_child_policies(
    p_table text, p_parent text, p_fk text,
    p_write_key text, p_read_keys text[] default '{}',
    p_replace_existing boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    p text;
    existing text;
    tenancy text;
begin
    if not exists (
        select 1 from information_schema.tables
        where table_schema = 'public' and table_name = p_table
    ) then
        raise notice 'MISSING TABLE % - skipped', p_table;
        return;
    end if;

    execute format('alter table public.%I enable row level security', p_table);
    execute format('revoke all on public.%I from anon', p_table);

    select string_agg(policyname, ', ') into existing
    from pg_policies
    where schemaname = 'public' and tablename = p_table
      and policyname not like 'dentix\_%';

    if existing is not null and not p_replace_existing then
        raise notice 'REVIEW NEEDED %: existing policies [%] left untouched - rerun with p_replace_existing=true only after schema review',
            p_table, existing;
        return;
    end if;

    for p in select policyname from pg_policies
             where schemaname = 'public' and tablename = p_table
               and policyname not like 'dentix\_%'
    loop
        execute format('drop policy %I on public.%I', p, p_table);
    end loop;

    foreach p in array array['dentix_select','dentix_insert','dentix_update','dentix_delete']
    loop
        execute format('drop policy if exists %I on public.%I', p, p_table);
    end loop;

    tenancy := format(
        'exists (select 1 from public.%I par where par.id = %I.%I and par.user_id = public.clinic_owner_id())',
        p_parent, p_table, p_fk);

    execute format(
        'create policy dentix_select on public.%I for select to authenticated
         using (%s and (public.has_perm(%L, ''view'')
                or (select coalesce(bool_or(public.has_perm(k, ''view'')), false)
                    from unnest(%L::text[]) k)))',
        p_table, tenancy, p_write_key, p_read_keys);
    execute format(
        'create policy dentix_insert on public.%I for insert to authenticated
         with check (%s and public.has_perm(%L, ''add''))',
        p_table, tenancy, p_write_key);
    execute format(
        'create policy dentix_update on public.%I for update to authenticated
         using (%s and public.has_perm(%L, ''edit''))
         with check (%s and public.has_perm(%L, ''edit''))',
        p_table, tenancy, p_write_key, tenancy, p_write_key);
    execute format(
        'create policy dentix_delete on public.%I for delete to authenticated
         using (%s and public.has_perm(%L, ''delete''))',
        p_table, tenancy, p_write_key);
end;
$$;

-- =========================================================
-- table -> owning page (writes) + read-only pages
-- page keys match js/employees.js PAGES
-- mappings verified against live schema metadata 2026-11-25
-- =========================================================

-- clinical core
-- DDL helper is not API: SECURITY DEFINER policy writer must never be
-- callable by application roles
revoke execute on function public._apply_page_policies(text, text, text[], boolean) from public, anon, authenticated;
revoke execute on function public._apply_child_policies(text, text, text, text, text[], boolean) from public, anon, authenticated;

-- live-schema leftovers are trigger functions, not RPC API. Never callable
-- by application roles (the triggers themselves still fire as owner).
revoke execute on function public.create_appointment_request_notification() from public, anon, authenticated;
revoke execute on function public.deduct_inventory_for_patient_service() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

select public._apply_page_policies('patients',                  'patients',     array['dashboard','patient-file','reports','doctors','labs']);
select public._apply_page_policies('patient_visits',            'patients',     array['dashboard','patient-file','reports']);
select public._apply_page_policies('waiting_list',              'dashboard');
select public._apply_page_policies('appointment_requests',      'dashboard');

-- patient file
select public._apply_page_policies('patient_notes',             'patient-file');
select public._apply_page_policies('patient_images',            'patient-file');
select public._apply_child_policies('patient_teeth', 'patients', 'patient_id', 'patient-file');
-- patient_services: queried by patient-file.js but ABSENT from the live schema - not mapped
select public._apply_page_policies('patient_service_visits',    'patient-file');
select public._apply_child_policies('patient_service_teeth', 'patientt_services', 'service_id', 'patient-file');
select public._apply_page_policies('patient_service_payments',  'patient-file', array['reports']);
select public._apply_page_policies('patientt_services',         'patient-file', array['reports','doctors','control']);
select public._apply_child_policies('visit_medications', 'patient_visits', 'visit_id', 'patient-file');
select public._apply_child_policies('patient_files', 'patients', 'patient_id', 'patient-file');

-- billing / money
select public._apply_page_policies('bills',                     'bill',         array['reports']);
select public._apply_page_policies('purchase_invoices',         'storage');
select public._apply_page_policies('purchase_invoice_payments', 'storage',      array['reports']);
select public._apply_page_policies('insurance_payments',        'control',      array['reports']);
select public._apply_page_policies('insurance_settlements',     'control',      array['reports']);

-- warehouse
select public._apply_page_policies('inventory_items',           'storage');
select public._apply_page_policies('inventory_service_usage',   'storage');
select public._apply_page_policies('suppliers',                 'storage');

-- doctors / labs / drugs
select public._apply_page_policies('doctors',                   'doctors',      array['patient-file','labs','control']);
select public._apply_page_policies('doctor_works',              'doctors');
select public._apply_page_policies('doctor_payments',           'doctors');
select public._apply_page_policies('labs',                      'labs');
select public._apply_page_policies('lab_works',                 'labs',         array['dashboard','patient-file','reports']);
select public._apply_child_policies('lab_work_teeth', 'lab_works', 'lab_work_id', 'labs', array['dashboard']);
select public._apply_page_policies('dental_works_catalog',      'control',      array['labs']);
select public._apply_page_policies('drugs',                     'drugs',        array['patient-file']);
select public._apply_page_policies('drug_categories',           'drugs');

-- printing / settings
select public._apply_page_policies('prints',                    'prints');
select public._apply_page_policies('insurances',                'control');
select public._apply_page_policies('insurance_services',        'control',      array['patient-file']);
select public._apply_page_policies('clinic_departments',        'control',      array['patient-file','reports']);
select public._apply_page_policies('clinic_services',           'control',      array['storage','patient-file']);
select public._apply_page_policies('clinic_pages',              'control',      array['dashboard','patient-file','waiting']);

-- per-user tables are NOT clinic data: self-access only
alter table public.user_preferences enable row level security;
drop policy if exists dentix_self on public.user_preferences;
create policy dentix_self on public.user_preferences for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications: per-user rows (id, user_id, type, title, message) - self only
alter table public.notifications enable row level security;
drop policy if exists dentix_self on public.notifications;
create policy dentix_self on public.notifications for all to authenticated
    using (user_id = auth.uid()) with check (user_id = auth.uid());

-- user_roles: id REFERENCES auth.users(id) + role text, RLS DISABLED on the
-- live project, unused by the client code. Classification: UNKNOWN - left
-- completely untouched here; decide its fate with the owner, never silently.

-- =========================================================
-- WAITING DISPLAY - least data through a gated function.
-- The display account has NO table access; it can only call this,
-- and only while it is an active employee with waiting=view.
-- Returns the minimum the screen renders: visit timing/status and
-- the patient's name. Phone is deliberately NOT exposed (the screen
-- shows its "No Phone" fallback) - if the owner wants phone numbers
-- on the TV, add p.phone here as an explicit decision.
-- =========================================================

create or replace function public.get_waiting_queue()
returns table (
    id uuid,
    appointment_start timestamptz,
    appointment_end timestamptz,
    visit_status text,
    patient_name text
)
language plpgsql
security definer
set search_path = public
stable
as $$
begin
    if not public.has_perm('waiting', 'view') then
        raise exception 'access denied';
    end if;

    return query
    select v.id, v.appointment_start, v.appointment_end, v.visit_status,
           p.full_name
    from public.patient_visits v
    join public.patients p on p.id = v.patient_id
    where v.user_id = public.clinic_owner_id()
      and v.is_deleted = false
      and v.appointment_start is not null
      and v.appointment_end is not null
    order by v.appointment_start asc;
end;
$$;

revoke all on function public.get_waiting_queue() from anon;
grant execute on function public.get_waiting_queue() to authenticated;


-- =========================================================
-- Tenant-link whitelist: every FK from a mapped table to another
-- clinic-owned table (full FK graph review 2026-11-25). The generic
-- trigger rejects inserts AND updates whose link points at a parent
-- row owned by a different clinic.
-- =========================================================
do $$
declare
    m record;
begin
    for m in
        select t, string_agg(col, ',' ORDER BY col) as cols, string_agg(parent, ',' ORDER BY col) as parents
        from (values
            ('patient_images',           'patient_id',          'patients'),
            ('patient_images',           'visit_id',            'patient_visits'),
            ('patient_notes',            'patient_id',          'patients'),
            ('patient_notes',            'visit_id',            'patient_visits'),
            ('patient_visits',           'patient_id',          'patients'),
            ('patient_visits',           'department_id',       'clinic_departments'),
            ('patientt_services',        'visit_id',            'patient_visits'),
            ('patientt_services',        'doctor_id',           'doctors'),
            ('patientt_services',        'insurance_id',        'insurances'),
            ('patient_service_visits',   'service_id',          'patientt_services'),
            ('patient_service_visits',   'visit_id',            'patient_visits'),
            ('patient_service_payments', 'service_id',          'patientt_services'),
            ('waiting_list',             'patient_id',          'patients'),
            ('lab_works',                'patient_id',          'patients'),
            ('lab_works',                'lab_id',              'labs'),
            ('doctor_payments',          'doctor_id',           'doctors'),
            ('doctor_works',             'doctor_id',           'doctors'),
            ('drugs',                    'category_id',         'drug_categories'),
            ('insurance_payments',       'insurance_id',        'insurances'),
            ('insurance_services',       'insurance_id',        'insurances'),
            ('insurance_services',       'service_id',          'clinic_services'),
            ('insurance_settlements',    'insurance_id',        'insurances'),
            ('inventory_service_usage',  'clinic_service_id',   'clinic_services'),
            ('inventory_service_usage',  'inventory_item_id',   'inventory_items'),
            ('purchase_invoices',        'supplier_id',         'suppliers'),
            ('purchase_invoice_payments','purchase_invoice_id', 'purchase_invoices')
        ) as v(t, col, parent)
        group by t
    loop
        execute format('drop trigger if exists dentix_check_link on public.%I', m.t);
        execute format(
            'create trigger dentix_check_link before insert or update on public.%I
             for each row execute function public._dentix_check_link(%s)',
            m.t,
            (select string_agg(format('%L, %L', c, p), ', ')
             from unnest(string_to_array(m.cols, ','), string_to_array(m.parents, ',')) as u(c, p)));
    end loop;
end $$;

-- =========================================================
-- Legacy TEXT owner columns (verified text in the live schema dump):
-- required pricing-page functionality. Type-aware policies + stamping;
-- comparison casts the owner id to text.
-- =========================================================
select public._apply_page_policies('assets',           'control');
select public._apply_page_policies('expenses',         'control');
select public._apply_page_policies('services',         'control');
select public._apply_page_policies('pricing_settings', 'control');
