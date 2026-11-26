-- Realtime publication membership for the tables the app actually subscribes to
-- (js/notification.js: notifications, patient_visits, lab_works, inventory_items).
-- Self-hosted publications start EMPTY: without this one-time step the app's
-- notification channels connect but never receive events. Idempotent; re-run
-- any time. Requires the realtime service to have completed its first boot
-- (it creates the supabase_realtime publication).
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    raise warning 'supabase_realtime publication not found - realtime not initialized yet; re-run this script after first boot';
    return;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'patient_visits') then
    alter publication supabase_realtime add table public.patient_visits;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'lab_works') then
    alter publication supabase_realtime add table public.lab_works;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'inventory_items') then
    alter publication supabase_realtime add table public.inventory_items;
  end if;
end
$$;
