-- Full page/table permission matrix (synthetic). Needs :owner (uuid). Prints counts + mismatches only.
\set ON_ERROR_STOP off
set session_replication_role = replica;
\i perm-expect.sql
insert into ptables values ('inventory_purchases'),('inventory_transactions');
insert into pexp select t, p, p='storage', p='storage', p='storage', p='storage' from unnest(array['inventory_purchases','inventory_transactions']) t, unnest(array['dashboard','patients','patient-file','waiting','bill','reports','storage','doctors','labs','drugs','prints','control']) p;
create temp table pvars as select :'owner'::uuid as owner;
do $$ declare t text; begin
  for t in select tbl from ptables loop execute format('truncate public.%I restart identity cascade', t); end loop;
  delete from public.employees where full_name='pm'; delete from auth.users where email like 'pm-%';
end $$;
create temp table pres(profile text, tbl text, op text, got text, expected bool, ok bool);
create temp table pseed(tbl text primary key, seeded bool, ins_cols text, ins_vals text, upd_col text, err text);
create temp table pfk(tbl text, col text); insert into pfk values ('visit_medications','visit_id'),('patient_teeth','patient_id'),('patient_files','patient_id'),('patient_service_teeth','service_id'),('lab_work_teeth','lab_work_id');

-- generic synthetic seed: only NOT NULL columns without a default
do $$
declare t record; c record; cols text; vals text; ownerid uuid := (select owner from pvars); ok boolean; ucol text; emsg text;
begin
  for t in select tbl from ptables union select 'inventory_purchases' union select 'inventory_transactions' loop
    cols := ''; vals := ''; ucol := null;
    for c in select column_name, data_type, is_nullable, column_default, is_identity, is_generated
             from information_schema.columns where table_schema='public' and table_name=t.tbl order by ordinal_position loop
      if ucol is null and c.is_identity='NO' and c.is_generated='NEVER' then ucol := c.column_name; end if;
      if c.is_identity='YES' or c.is_generated<>'NEVER' then continue; end if;
      if c.is_nullable='NO' and c.column_default is null or c.column_name='user_id' or exists (select 1 from pfk f where f.tbl=t.tbl and f.col=c.column_name) then
        cols := cols || case when cols='' then '' else ',' end || quote_ident(c.column_name);
        vals := vals || case when vals='' then '' else ',' end ||
          case when c.column_name='user_id' and c.data_type='uuid' then quote_literal(ownerid)||'::uuid'
               when c.column_name='user_id' then quote_literal(ownerid::text)
               else case when c.column_name='tooth_number' then '''1.1''' else case c.data_type when 'uuid' then 'gen_random_uuid()' when 'text' then '''x''' when 'character varying' then '''x'''
                 when 'boolean' then 'false' when 'jsonb' then '''{}''::jsonb' when 'json' then '''{}''::json' when 'ARRAY' then '''{}'''
                 when 'date' then 'now()::date' when 'USER-DEFINED' then 'null'
                 else case when c.data_type like 'timestamp%' then 'now()' else '1' end end end end;
      end if;
    end loop;
    ok := true;
    begin
      execute format('insert into public.%I (%s) values (%s)', t.tbl, cols, vals);
    exception when others then ok := false; emsg := sqlerrm; end;
    insert into pseed values (t.tbl, ok, cols, vals, ucol, case when ok then null else left(emsg,120) end);
  end loop;
end $$;

-- profiles: one employee per page x level, plus none
do $$
declare p text; lvl text; uid uuid; eid uuid;
begin
  foreach p in array array['dashboard','patients','patient-file','waiting','bill','reports','storage','doctors','labs','drugs','prints','control','NONE'] loop
    foreach lvl in array array['view','full'] loop
      if p='NONE' and lvl='full' then continue; end if;
      uid := gen_random_uuid(); eid := gen_random_uuid();
      insert into auth.users (id, email) values (uid, 'pm-'||p||'-'||lvl||'@example.test');
      insert into public.employees (id, owner_id, auth_user_id, full_name, email) values (eid, (select owner from pvars), uid, 'pm', 'pm-'||p||'-'||lvl||'@example.test');
      if p<>'NONE' then
        insert into public.employee_permissions (employee_id, page_key, can_view, can_add, can_edit, can_delete) values (eid, p, true, lvl='full', lvl='full', lvl='full');
      end if;
    end loop;
  end loop;
end $$;

create or replace function pg_temp.runop(uid uuid, tname text, op text) returns text language plpgsql as $$
declare s record; n bigint; res text;
begin
  select * into s from pseed where tbl = tname;
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  begin
    execute 'set local role authenticated';
    if op='sel' then execute format('select count(*) from public.%I', tname) into n;
    elsif op='upd' then execute format('update public.%I set %I = %I', tname, s.upd_col, s.upd_col); get diagnostics n = row_count;
    elsif op='del' then execute format('delete from public.%I', tname); get diagnostics n = row_count;
    else execute format('insert into public.%I (%s) values (%s)', tname, s.ins_cols, s.ins_vals); n := 1; end if;
    raise exception using errcode='P0001', message='ok:'||n;
  exception
    when sqlstate 'P0001' then res := sqlerrm;
    when insufficient_privilege then res := 'denied';
    when others then res := 'err:'||sqlstate;
  end;
  return res;
end $$;

do $$
declare e record; x record; r text; allowed bool; exp bool; pg text; lvl text; o text; ops text[] := array['sel','ins','upd','del'];
begin
  for e in select u.id uid, split_part(substring(u.email from 4), '@', 1) pl from auth.users u where u.email like 'pm-%' loop
    lvl := case when e.pl like '%-full' then 'full' else 'view' end;
    pg := regexp_replace(e.pl, '-(full|view)$', '');
    for x in select ps.tbl from pseed ps where ps.seeded loop
      foreach o in array ops loop
        r := pg_temp.runop(e.uid, x.tbl, o);
        allowed := case when o='ins' then r <> 'denied' else r ~ '^ok:[1-9]' end;
        select case o when 'sel' then sel when 'ins' then ins and lvl='full' when 'upd' then upd and lvl='full' else del and lvl='full' end
          into exp from pexp where tbl=x.tbl and page=pg;
        if pg='NONE' or exp is null then exp := false; end if;
        insert into pres values (pg||'/'||lvl, x.tbl, o, r, exp, allowed = exp);
      end loop;
    end loop;
  end loop;
end $$;

\echo MATRIX_TOTAL
select count(*) from pres;
\echo MATRIX_MISMATCH_COUNT
select count(*) from pres where not ok;
\echo MATRIX_MISMATCHES
select profile||' '||tbl||' '||op||' got='||got||' expected_allowed='||expected from pres where not ok order by 1 limit 40;
\echo UNSEEDED
select string_agg(tbl||':'||coalesce(err,''), ' ; ') from pseed where not seeded;
\echo RLS_OFF_PUBLIC_TABLES
select string_agg(c.relname, ',') from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;
