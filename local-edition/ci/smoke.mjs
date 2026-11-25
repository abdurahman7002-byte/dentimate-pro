// Authenticated smoke against the booted Dentix stack (CI ephemeral fixtures).
// Needs: BASE (https://localhost), ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD.
// TLS is verified for real: the workflow generates a one-day CA, signs the
// localhost cert (SAN DNS:localhost,IP:127.0.0.1), and sets NODE_EXTRA_CA_CERTS.
//
// Revocation validity: the SAME employee token is taken through
//   zero permissions (denied while data exists)
//   -> permissions granted (access PROVEN on REST + storage)
//   -> active=false (PATCH asserted, state re-read)
//   -> SAME token denied again
// so "denied after" is measured against a proven "allowed before".
const { BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD } = process.env;
let pass = 0, fail = 0;
const check = (n, c, x = '') => { c ? pass++ : fail++; console.log(`${c ? 'PASS' : 'FAIL'} ${n} ${x}`); };
const die = (m) => { console.log('FAIL fast:', m); console.log(`SMOKE RESULT: ${pass} passed, ${++fail} failed`); process.exit(1); };
const login = async (email, password) => {
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    return r.ok ? (await r.json()).access_token : null;
};
const H = (t) => ({ apikey: ANON_KEY, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

// ---- owner login (bootstrap already ran in the workflow) ----
const owner = await login(OWNER_EMAIL, OWNER_PASSWORD);
check('owner login', !!owner);
if (!owner) die('cannot continue without owner token');
const ownerUid = JSON.parse(Buffer.from(owner.split('.')[1], 'base64url').toString()).sub;

// ---- fixtures that must exist BEFORE any denial check is read as enforcement ----
const pat = await fetch(`${BASE}/rest/v1/patients`, { method: 'POST', headers: { ...H(owner), Prefer: 'return=representation' },
    body: JSON.stringify({ full_name: 'CI smoke fixture patient' }) });
const patRows = await pat.json().catch(() => null);
check('fixture patient created', pat.ok && Array.isArray(patRows) && patRows.length === 1, String(pat.status));
if (!pat.ok) die('fixture patient insert failed: ' + pat.status);

const bytes = new Uint8Array(64).map((_, i) => i);
const objPath = `${ownerUid}/patient-files/ci-smoke.bin`;
const up = await fetch(`${BASE}/storage/v1/object/patient-files/${objPath}`, { method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${owner}`, 'Content-Type': 'application/octet-stream' }, body: bytes });
check('storage fixture uploaded', up.ok, String(up.status));
if (!up.ok) die('storage fixture upload failed: ' + up.status);

// owner sanity: authenticated app-style blob download, byte-exact
const dlOwner = await fetch(`${BASE}/storage/v1/object/patient-files/${objPath}`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${owner}` } });
const gotOwner = new Uint8Array(await dlOwner.arrayBuffer());
check('owner authenticated download byte-exact (app blob flow)', dlOwner.ok && gotOwner.length === bytes.length && gotOwner.every((b, i) => b === bytes[i]), String(dlOwner.status));

const sign = await fetch(`${BASE}/storage/v1/object/sign/patient-files/${objPath}`, { method: 'POST', headers: H(owner), body: JSON.stringify({ expiresIn: 60 }) });
const signed = (await sign.json().catch(() => ({}))).signedURL;
check('signed URL issued', !!signed, String(sign.status));
if (signed) {
    const dl = await fetch(`${BASE}/storage/v1${signed}`, { headers: { apikey: ANON_KEY } });
    const got = new Uint8Array(await dl.arrayBuffer());
    check('signed-URL download byte-exact', dl.ok && got.length === bytes.length && got.every((b, i) => b === bytes[i]), String(dl.status));
}

// ---- anonymous negative ----
const anon = await fetch(`${BASE}/rest/v1/patients?select=id`, { headers: { apikey: ANON_KEY } });
check('anonymous REST rejected (401)', anon.status === 401, String(anon.status));

// ---- employee fixture (columns that exist: full_name, email only) ----
const empRes = await fetch(`${BASE}/rest/v1/employees`, { method: 'POST', headers: { ...H(owner), Prefer: 'return=representation' },
    body: JSON.stringify({ full_name: 'CI Smoke Employee', email: 'ci-smoke@clinic.local' }) });
const emp = (await empRes.json().catch(() => []))[0];
check('owner can create employee row', empRes.ok && emp && !!emp.id, String(empRes.status));
if (!emp || !emp.id) die('employee create returned no id: HTTP ' + empRes.status);

const prov = await fetch(`${BASE}/provision`, { method: 'POST', headers: H(owner), body: JSON.stringify({ employee_id: emp.id }) });
const provBody = await prov.json().catch(() => ({}));
check('provision endpoint creates employee login', prov.ok && !!provBody.password, String(prov.status));
if (!prov.ok || !provBody.password) die('provision failed: HTTP ' + prov.status);
const empTok = await login('ci-smoke@clinic.local', provBody.password);
check('employee login', !!empTok);
if (!empTok) die('employee login failed');

// ---- stage 1: ZERO permissions, data EXISTS -> empty/denied is enforcement, not empty DB ----
const z1 = await fetch(`${BASE}/rest/v1/patients?select=id,full_name`, { headers: H(empTok) });
const z1rows = await z1.json().catch(() => null);
check('zero-perm employee: fixture patient invisible (data exists)', z1.status === 401 || z1.status === 403 || (Array.isArray(z1rows) && z1rows.length === 0), String(z1.status));
const z2 = await fetch(`${BASE}/storage/v1/object/patient-files/${objPath}`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${empTok}` } });
check('zero-perm employee: storage download DENIED', z2.status === 400 || z2.status === 401 || z2.status === 403, String(z2.status));

// ---- stage 2: grant permissions, PROVE access with the same token ----
const g1 = await fetch(`${BASE}/rest/v1/employee_permissions`, { method: 'POST', headers: H(owner),
    body: JSON.stringify([{ employee_id: emp.id, page_key: 'patients', can_view: true }, { employee_id: emp.id, page_key: 'patient-file', can_view: true }]) });
check('owner granted employee view permissions', g1.ok, String(g1.status));
if (!g1.ok) die('permission grant failed: ' + g1.status);

const a1 = await fetch(`${BASE}/rest/v1/patients?select=id,full_name`, { headers: H(empTok) });
const a1rows = await a1.json().catch(() => null);
check('granted employee: fixture patient READABLE (access proven before revoke)', a1.ok && Array.isArray(a1rows) && a1rows.some(r => r.full_name === 'CI smoke fixture patient'), String(a1.status));
const a2 = await fetch(`${BASE}/storage/v1/object/patient-files/${objPath}`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${empTok}` } });
const a2bytes = new Uint8Array(await a2.arrayBuffer());
check('granted employee: storage download byte-exact (access proven before revoke)', a2.ok && a2bytes.length === bytes.length && a2bytes.every((b, i) => b === bytes[i]), String(a2.status));

// ---- stage 3: deactivate, assert the PATCH and the state change, then deny SAME token ----
const patch = await fetch(`${BASE}/rest/v1/employees?id=eq.${emp.id}`, { method: 'PATCH', headers: { ...H(owner), Prefer: 'return=representation' }, body: JSON.stringify({ active: false }) });
const patched = await patch.json().catch(() => null);
check('deactivation PATCH succeeded', patch.ok, String(patch.status));
const verify = await fetch(`${BASE}/rest/v1/employees?id=eq.${emp.id}&select=active`, { headers: H(owner) });
const vrows = await verify.json().catch(() => null);
check('employee state actually changed to inactive', verify.ok && Array.isArray(vrows) && vrows[0] && vrows[0].active === false, String(verify.status));

const d1 = await fetch(`${BASE}/rest/v1/patients?select=id,full_name`, { headers: H(empTok) });
const d1rows = await d1.json().catch(() => null);
check('revoked token (was proven working): fixture patient denied on REST', d1.status === 401 || d1.status === 403 || (Array.isArray(d1rows) && d1rows.length === 0), String(d1.status));
const d2 = await fetch(`${BASE}/storage/v1/object/patient-files/${objPath}`, { headers: { apikey: ANON_KEY, Authorization: `Bearer ${empTok}` } });
check('revoked token (was proven working): storage download denied', d2.status === 400 || d2.status === 401 || d2.status === 403, String(d2.status));

console.log(`SMOKE RESULT: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
