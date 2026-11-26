// Minimal end-to-end recovery probe: can a fresh client SUBSCRIBE to the
// app's notifications channel right now? Prints only the final status.
// Used by the post-failure recovery probe step (the main acceptance gate
// exits before this runs, so this client is the only subscriber - it also
// covers realtime's lazy replication start, which needs a subscriber).
console.log('probe-stage=started');
import { createClient } from '@supabase/supabase-js';
console.log('probe-stage=import-ok');
const { BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD } = process.env;
const sb = createClient(BASE, ANON_KEY, { auth: { persistSession: false } });
const { data: signin, error } = await sb.auth.signInWithPassword({ email: OWNER_EMAIL, password: OWNER_PASSWORD });
if (error || !signin.session) { console.log('probe-subscribe-status=LOGIN_FAILED'); process.exit(0); }
console.log('probe-stage=login-ok');
let last = 'NONE';
const ch = sb.channel('recovery-probe-' + Date.now())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${signin.user.id}` }, () => {})
    .subscribe((s) => { last = s; });
await new Promise(r => setTimeout(r, 20000));
console.log(`probe-subscribe-status=${last}`);
try { await sb.removeChannel(ch); } catch (_) {}
process.exit(0);
