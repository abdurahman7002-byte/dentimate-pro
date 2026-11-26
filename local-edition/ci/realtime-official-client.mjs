// OFFICIAL-CLIENT CONTROL for the realtime gate (not an assertion itself):
// replicates the app's own notification channel (js/notification.js):
// supabase-js, postgres_changes INSERT on the ACTUAL subscribed app table
// 'notifications' with the same user_id filter the app uses. Waits for
// SUBSCRIBED readiness, then retries committed fixture inserts and watches the
// callback. Prints ONLY enumerated labels - never tokens, payloads, or row data.
// Needs: BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD.
import { createClient } from '@supabase/supabase-js';

const { BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD } = process.env;
const out = (m) => console.log('official-client: ' + m);

const supabase = createClient(BASE, ANON_KEY, {
    realtime: { heartbeatIntervalMs: 5000, timeout: 10000 },
});

const { error: loginErr } = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password: OWNER_PASSWORD });
if (loginErr) { out('owner-login-failed'); process.exit(2); }
const { data: { user } } = await supabase.auth.getUser();
if (!user || !user.id) { out('owner-session-missing'); process.exit(2); }

const statuses = new Set();
let gotEvent = false;

const ch = supabase
    .channel('app-notifications-control-' + Date.now())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: 'user_id=eq.' + user.id }, () => { gotEvent = true; })
    .subscribe((status) => { statuses.add(status); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deadline = Date.now() + 25000;
while (!statuses.has('SUBSCRIBED') && Date.now() < deadline) await sleep(250);

if (!statuses.has('SUBSCRIBED')) {
    const s = [...statuses].filter((x) => typeof x === 'string').sort().join('|') || 'none';
    out('never-subscribed statuses=' + s);
    process.exit(3);
}

// readiness proven: committed fixture inserts through the same client.
// Retry like the raw gate: if a later insert delivers, activation lag extends
// past SUBSCRIBED; if none deliver, delivery is broken post-readiness.
let inserts = 0;
const MAX = 6;
while (!gotEvent && inserts < MAX) {
    inserts++;
    const { error: insErr } = await supabase.from('notifications').insert({ user_id: user.id, title: 'ci notification probe ' + inserts });
    if (insErr) { out('insert-failed'); process.exit(4); }
    const evDeadline = Date.now() + 4000;
    while (!gotEvent && Date.now() < evDeadline) await sleep(250);
}

await supabase.removeAllChannels();
out(gotEvent ? 'subscribed event-received-after-' + inserts + '-inserts' : 'subscribed no-event-after-' + inserts + '-inserts');
process.exit(gotEvent ? 0 : 1);
