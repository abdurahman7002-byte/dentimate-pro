// Realtime gate (SAME-CLINIC permission filtering - cross-tenant realtime
// isolation is a separate, untested question):
//   owner subscription RECEIVES a postgres_changes INSERT event;
//   a zero-permission employee subscription to the same table receives NOTHING
//   while provably alive (join ack + heartbeat replies) and the insert provably
//   succeeded (201). A broken subscription is never read as a denial.
// Needs: BASE, BASE_WSS, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD.
const { BASE, BASE_WSS, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD } = process.env;
const H = (t) => ({ apikey: ANON_KEY, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });
const login = async (email, password) => {
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    return r.ok ? (await r.json()).access_token : null;
};
const fail = (m) => { console.log('FAIL realtime:', m); process.exit(1); };

const owner = await login(OWNER_EMAIL, OWNER_PASSWORD);
if (!owner) fail('owner login');

// zero-permission employee for the denial check
const empRes = await fetch(`${BASE}/rest/v1/employees`, { method: 'POST', headers: { ...H(owner), Prefer: 'return=representation' },
    body: JSON.stringify({ full_name: 'CI RT Employee', email: 'ci-rt@clinic.local' }) });
const emp = (await empRes.json().catch(() => []))[0];
if (!empRes.ok || !emp || !emp.id) fail('employee create ' + empRes.status);
const prov = await fetch(`${BASE}/provision`, { method: 'POST', headers: H(owner), body: JSON.stringify({ employee_id: emp.id }) });
const provBody = await prov.json().catch(() => ({}));
if (!prov.ok || !provBody.password) fail('employee provision ' + prov.status);
const empTok = await login('ci-rt@clinic.local', provBody.password);
if (!empTok) fail('employee login');

const topic = 'realtime:public:patients_rt_gate';
const state = { owner: { joined: false, event: false, heartbeat: false }, employee: { joined: false, event: false, heartbeat: false } };
let inserted = false;

const open = (token, label) => {
    const ws = new WebSocket(`${BASE_WSS}/realtime/v1/websocket?apikey=${ANON_KEY}&vsn=1.0.0`);
    const joinRef = `${label}-join`, hbRef = `${label}-hb`;
    ws.onopen = () => ws.send(JSON.stringify({ ref: joinRef, topic, event: 'phx_join',
        payload: { config: { broadcast: { ack: false, self: false }, presence: { key: '' },
            postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'patients' }] }, access_token: token } }));
    ws.onmessage = async (ev) => {
        const m = JSON.parse(ev.data);
        // join ack must match THIS socket's join ref
        if (m.ref === joinRef && m.event === 'phx_reply' && m.payload && m.payload.status === 'ok') {
            state[label].joined = true;
            ws.send(JSON.stringify({ ref: hbRef, topic: 'phoenix', event: 'heartbeat', payload: {} }));
        }
        if (m.ref === hbRef && m.event === 'phx_reply') state[label].heartbeat = true;
        if (m.event === 'postgres_changes') state[label].event = true;
        if (state.owner.joined && state.employee.joined && !inserted) {
            inserted = true;
            const ins = await fetch(`${BASE}/rest/v1/patients`, { method: 'POST', headers: { ...H(owner), Prefer: 'return=minimal' },
                body: JSON.stringify({ full_name: 'rt gate patient' }) });
            if (!ins.ok) fail('control insert failed: HTTP ' + ins.status);
        }
    };
    ws.onerror = () => fail(label + ' ws error');
    return ws;
};
open(owner, 'owner');
open(empTok, 'employee');

// settle window: owner event must arrive; employee must stay silent while alive
setTimeout(() => {
    if (!state.owner.joined || !state.employee.joined) fail('a subscription never established: ' + JSON.stringify(state));
    if (!inserted) fail('control insert never ran');
    if (!state.owner.event) fail('owner received no event');
    if (!state.employee.heartbeat) fail('employee subscription liveness unproven - cannot read silence as denial');
    if (state.employee.event) fail('zero-permission employee RECEIVED an event (filtering broken)');
    console.log('PASS realtime (same-clinic filtering): owner event received; zero-perm employee alive (join+heartbeat) and received nothing');
    process.exit(0);
}, 20000);
