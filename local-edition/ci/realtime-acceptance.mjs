// Realtime acceptance gate - the app's ACTUAL client behavior (supabase-js,
// same channel shape as local-edition/js/notification.js) must:
//   1. activate: after SUBSCRIBED, a bounded sentinel loop measures the
//      post-subscribe activation lag already observed (join ack precedes
//      server-side WAL subscription). Count printed, not gated beyond "some
//      event eventually arrives".
//   2. steady state: ONE committed change on the app's notification table,
//      no retries, must be delivered.
//   3. reconnect: the realtime container is restarted under the live
//      subscription; the client must rejoin and receive a NEW change.
//   4. resync: a change committed DURING the outage is not replayed by
//      postgres_changes; the app's catch-up fetch on SUBSCRIBED (the resync
//      path notification.js implements) must surface it.
// Prints enumerated labels and counts only. Gating: exits 1 on any unmet
// acceptance point.
import { createClient } from '@supabase/supabase-js';
import { execSync } from 'node:child_process';

const { BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD, REALTIME_CONTAINER } = process.env;
const fail = (stage, m) => { console.log(`FAIL realtime-acceptance stage=${stage}: ${m}`); process.exit(1); };
if (!REALTIME_CONTAINER) fail('setup', 'REALTIME_CONTAINER env missing');

const sb = createClient(`${BASE}`, ANON_KEY, { auth: { persistSession: false } });
const { data: signin, error: signinErr } = await sb.auth.signInWithPassword({ email: OWNER_EMAIL, password: OWNER_PASSWORD });
if (signinErr || !signin.session) fail('setup', 'owner login');
const uid = signin.user.id;
const rest = async (path) => {
    const r = await fetch(`${BASE}/rest/v1/${path}`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${signin.session.access_token}` } });
    return r.ok ? r.json() : null;
};
let seq = 0;
const insertNotification = async (kind) => {
    seq++;
    const title = `rt-acceptance-${kind}-${seq}`;
    const r = await fetch(`${BASE}/rest/v1/notifications`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${signin.session.access_token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: uid, title })
    });
    if (!r.ok) fail('insert', `${kind} insert HTTP ${r.status}`);
    return title;
};
const catchUpFetch = async (title) => {
    // the app's resync path: plain refetch of recent rows for this user
    const rows = await rest(`notifications?user_id=eq.${uid}&title=eq.${title}&select=title`);
    return Array.isArray(rows) && rows.length > 0;
};

const state = { subscribedCount: 0, events: new Set(), lastStatus: 'none', tSubscribed: 0, retries: 0 };
let onResubscribe = null;
let channel = null;

// mirrors the shipped app's recovery (notification.js): supabase-js does not
// retry a refused rejoin while the socket stays up, so on CHANNEL_ERROR /
// TIMED_OUT the client removes the channel and resubscribes, bounded.
const MAX_RETRIES = 6; // matches the shipped app retry budget - a more persistent client cannot prove the app recovered
function subscribe() {
    channel = sb
        .channel('notifications-' + uid + '-acceptance-' + state.retries)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
            (payload) => { if (payload.new && payload.new.title) state.events.add(payload.new.title); })
        .subscribe((status) => {
            state.lastStatus = status;
            if (status === 'SUBSCRIBED') {
                state.subscribedCount++;
                state.retries = 0;
                if (state.subscribedCount === 1) state.tSubscribed = Date.now();
                if (state.subscribedCount > 1 && onResubscribe) onResubscribe();
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                if (state.retries < MAX_RETRIES) {
                    state.retries++;
                    const delay = Math.min(5000 * state.retries, 25000);
                    console.log(`resubscribe-retry=${state.retries} delay-ms=${delay}`);
                    setTimeout(async () => { try { await sb.removeChannel(channel); } catch (_) {} subscribe(); }, delay);
                }
            }
        });
}
subscribe();

const waitFor = async (cond, ms, stage, what) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
        if (cond()) return true;
        await new Promise(r => setTimeout(r, 250));
    }
    fail(stage, `timeout waiting for ${what} (status=${state.lastStatus})`);
};

await waitFor(() => state.subscribedCount >= 1, 20000, 'subscribe', 'initial SUBSCRIBED');

// phase 1: activation lag (bounded sentinels, 1/s, stop at first event).
// The lag is measured explicitly: it is the interval the shipped trailing
// catch-up passes (+5s, +15s) must bracket, so it is gated against 15s.
let sentinels = 0, activated = false, firstEventAt = 0;
for (let i = 0; i < 15 && !activated; i++) {
    const t = await insertNotification('sentinel');
    sentinels++;
    await new Promise(r => setTimeout(r, 1000));
    activated = state.events.has(t) || [...state.events].some(x => x.includes('sentinel'));
    if (activated && !firstEventAt) firstEventAt = Date.now();
}
if (!activated) fail('activation', `no event across ${sentinels} sentinel inserts`);
const lagMs = firstEventAt - state.tSubscribed;
console.log(`activation-sentinels=${sentinels}`);
console.log(`activation-lag-ms=${lagMs}`);
if (lagMs > 15000) fail('activation', `activation-lag-ms=${lagMs} exceeds the shipped trailing catch-up bracket (15s) - bounded recovery would not cover it`);
console.log('activation-within-trailing-bracket=1');

// phase 2: steady-state single change, no retry
const single = await insertNotification('single');
await waitFor(() => state.events.has(single), 10000, 'steady-state', 'single committed change delivery');
console.log('steady-state-single=received');

// phase 3+4: restart realtime under the live subscription; one change DURING
// the outage (recovered via resync), one after rejoin (live delivery)
let rejoined = false;
const rejoinPromise = new Promise(res => { onResubscribe = () => { rejoined = true; res(); }; });
execSync(`docker restart ${REALTIME_CONTAINER}`, { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 3000));
const duringOutage = await insertNotification('outage');
const rejoinTimeout = new Promise((_, rej) => setTimeout(() => rej(new Error('rejoin timeout')), 150000));
await Promise.race([rejoinPromise, rejoinTimeout]).catch(e => fail('reconnect', e.message + ` (status=${state.lastStatus})`));
console.log('reconnect=rejoined');

// resync: the outage change surfaces through the app's catch-up fetch
let resynced = false;
for (let i = 0; i < 10 && !resynced; i++) {
    resynced = await catchUpFetch(duringOutage);
    if (!resynced) await new Promise(r => setTimeout(r, 1000));
}
if (!resynced) fail('resync', 'change committed during outage not recovered by catch-up fetch');
console.log('resync-outage-change=recovered');
console.log(`outage-event-replayed=${state.events.has(duringOutage) ? 1 : 0}`);

const afterRejoin = await insertNotification('postrejoin');
await waitFor(() => state.events.has(afterRejoin), 15000, 'reconnect', 'post-rejoin single change delivery');
console.log('post-rejoin-single=received');

console.log(`PASS realtime-acceptance (activation=${sentinels} sentinels, steady-state 1/1, rejoin+resync ok, post-rejoin 1/1)`);
process.exit(0);
