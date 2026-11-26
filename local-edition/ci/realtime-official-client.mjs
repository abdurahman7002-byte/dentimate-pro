// OFFICIAL-CLIENT CONTROL for the realtime gate (not an assertion itself):
// subscribes with @supabase/supabase-js (the protocol reference client) as the
// owner, waits for the SUBSCRIBED status (real readiness), then inserts one
// fixture row via the client and waits for the postgres_changes callback.
// Prints ONLY enumerated labels - never tokens, payloads, or row data.
// Needs: BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD.
import { createClient } from '@supabase/supabase-js';

const { BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD } = process.env;
const out = (m) => console.log('official-client: ' + m);

const supabase = createClient(BASE, ANON_KEY, {
    realtime: { heartbeatIntervalMs: 5000, timeout: 10000 },
});

const { error: loginErr } = await supabase.auth.signInWithPassword({ email: OWNER_EMAIL, password: OWNER_PASSWORD });
if (loginErr) { out('owner-login-failed'); process.exit(2); }

const statuses = new Set();
let gotEvent = false;

const ch = supabase
    .channel('official-control')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, () => { gotEvent = true; })
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
    const { error: insErr } = await supabase.from('patients').insert({ full_name: 'official control patient ' + inserts });
    if (insErr) { out('insert-failed'); process.exit(4); }
    const evDeadline = Date.now() + 4000;
    while (!gotEvent && Date.now() < evDeadline) await sleep(250);
}

await supabase.removeAllChannels();
out(gotEvent ? 'subscribed event-received-after-' + inserts + '-inserts' : 'subscribed no-event-after-' + inserts + '-inserts');
process.exit(gotEvent ? 0 : 1);
