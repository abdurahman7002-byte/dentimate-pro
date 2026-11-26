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
const loginSession = async (email, password) => {
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    return r.ok ? await r.json() : null;
};
const tryRefresh = async (refreshToken) => {
    const r = await fetch(`${BASE}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refreshToken }) });
    return r.ok;
};
const H = (t) => ({ apikey: ANON_KEY, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' });

// ---- owner login (bootstrap already ran in the workflow) ----
let owner = await login(OWNER_EMAIL, OWNER_PASSWORD);
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

// ---- stage 3: owner account self-edit (identity-verified), full round trip ----
// Runs while the employee token is still valid (for the owner-only denial).
// Password changes REVOKE all sessions (server-side), so each change is
// followed by a fresh login and the fresh token is used from then on.
// Originals are always restored, so later steps keep the original creds.
const ACC = `${BASE}/account`;
const AH = (tok) => ({ apikey: ANON_KEY, Authorization: `Bearer ${tok}`, 'Content-Type': 'application/json' });
const TMP_PW = 'tmp-' + crypto.randomUUID();
const TMP_EMAIL = 'ci-owner-alias@clinic.local';

// Public logs carry the allowlisted reason LABEL only, never server text.
const accDetail = async (r) => {
    const b = await r.json().catch(() => null);
    return String(r.status) + ' ' + ((b && (b.reason || (b.ok ? 'ok' : null))) || 'unmapped');
};

const e1 = await fetch(ACC, { method: 'POST', headers: AH(empTok), body: JSON.stringify({ current_password: 'fixture', new_password: 'x'.repeat(10) }) });
check('employee token: /account DENIED (owner only)', e1.status === 403, String(e1.status));

const w1 = await fetch(ACC, { method: 'POST', headers: AH(owner), body: JSON.stringify({ current_password: 'wrong-fixture-password', new_password: TMP_PW }) });
check('wrong current password: change REFUSED (identity check works)', w1.status === 401, String(w1.status));

const preSess = await loginSession(OWNER_EMAIL, OWNER_PASSWORD);
const c1 = await fetch(ACC, { method: 'POST', headers: AH(owner), body: JSON.stringify({ current_password: OWNER_PASSWORD, new_password: TMP_PW }) });
check('owner: password change ACCEPTED with correct current password', c1.ok, await accDetail(c1));
if (c1.ok) {
    // session behavior after a password change, measured exactly:
    // refresh tokens must be dead immediately (no silent session survival);
    // a JWT access token cannot be revoked mid-flight and dies at its
    // expiry (JWT_EXPIRY, 3600s default) - that bound is asserted, not hidden.
    const refreshed = await tryRefresh(preSess && preSess.refresh_token);
    check('refresh token of the changing session: REVOKED immediately', refreshed === false, refreshed ? 'still-alive' : 'revoked');
    // old-token behavior after a password change, asserted explicitly:
    const oldTok = owner;
    const claims = JSON.parse(Buffer.from(String(oldTok).split('.')[1], 'base64url').toString('utf8'));
    const remaining = claims.exp - Math.floor(Date.now() / 1000);
    check('old access token: remaining lifetime within JWT_EXPIRY bound (<=3600s)', remaining > 0 && remaining <= 3600, 'remaining-s=' + remaining);
    // a privileged CHANGE with the old token must be refused as invalid_session:
    // an OTHERWISE VALID controlled payload (correct current password, valid
    // new password) isolates the refusal to session validity, not request
    // shape. The fresh-token revert below passes the same path as the
    // positive control.
    const TMP_PW2 = 'tmp2-' + crypto.randomUUID();
    const staleAcc = await fetch(ACC, { method: 'POST', headers: AH(oldTok), body: JSON.stringify({ current_password: TMP_PW, new_password: TMP_PW2 }) });
    const staleLabel = await accDetail(staleAcc);
    check('old access token: valid privileged change REFUSED as invalid_session', staleAcc.status === 401 && staleLabel.includes('invalid_session'), staleLabel);
    if (staleAcc.ok) {
        // unexpected: the change went through - restore the password now
        await fetch(ACC, { method: 'POST', headers: AH(oldTok), body: JSON.stringify({ current_password: TMP_PW2, new_password: TMP_PW }) });
    }
    const stale = await fetch(`${BASE}/rest/v1/employees?select=id&limit=1`, { headers: AH(oldTok) });
    console.log(`old-token-after-password-change: account=${staleLabel} rest-read-accepted=${stale.ok} (stateless JWT; lifetime bound asserted; refresh revoked)`);
    owner = await login(OWNER_EMAIL, TMP_PW);
    check('login with NEW password works', !!owner, 'login-failed');
    const c2 = await fetch(ACC, { method: 'POST', headers: AH(owner), body: JSON.stringify({ current_password: TMP_PW, new_password: OWNER_PASSWORD }) });
    check('password reverted to original', c2.ok, await accDetail(c2));
    owner = await login(OWNER_EMAIL, OWNER_PASSWORD);
    check('login with ORIGINAL password works again', !!owner, 'login-failed');
    if (!owner) die('cannot continue without owner token after password round trip');
}

const c3 = await fetch(ACC, { method: 'POST', headers: AH(owner), body: JSON.stringify({ current_password: OWNER_PASSWORD, new_email: TMP_EMAIL }) });
check('owner: email change ACCEPTED with correct current password', c3.ok, await accDetail(c3));
if (c3.ok) {
    // email change must NOT kill the session (no secret changed)
    const alive = await fetch(`${BASE}/rest/v1/employees?select=id&limit=1`, { headers: AH(owner) });
    check('session after email-only change: still valid (no over-revocation)', alive.ok, String(alive.status));
    const le = !!(await login(TMP_EMAIL, OWNER_PASSWORD));
    check('login with NEW email works', le, 'login-failed');
    const c4 = await fetch(ACC, { method: 'POST', headers: AH(owner), body: JSON.stringify({ current_password: OWNER_PASSWORD, new_email: OWNER_EMAIL }) });
    check('email reverted to original', c4.ok, await accDetail(c4));
    const le2 = !!(await login(OWNER_EMAIL, OWNER_PASSWORD));
    check('login with ORIGINAL email works again', le2, 'login-failed');
}

// ---- stage 4: deactivate, assert the PATCH and the state change, then deny SAME token ----
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
