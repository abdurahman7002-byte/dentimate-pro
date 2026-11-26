/* =========================================================
   DENTIX LOCAL - EMPLOYEE PROVISIONING SERVICE (LAN only)
   Holds the service_role key SERVER-SIDE (env, never browser,
   never logs). Owner-only operations, enforced here:
     POST /provision        { employee_id } -> create login account
     POST /reset-password   { employee_id } -> new password for employee
     POST /account          { current_password, new_email?, new_password? }
                            -> owner edits their OWN login (current password
                            re-authenticated against GoTrue first)
     POST /bootstrap-owner  { email, password } -> ONE-TIME first owner
   TWO LISTENERS (container-networking safe):
   - MAIN listener 0.0.0.0:9090 serves /provision + /reset-password + /account,
     so nginx (a separate container) can proxy them over the docker network.
   - BOOTSTRAP listener 127.0.0.1:9091 serves /bootstrap-owner + /owner-reset
     (loopback only: forgotten-owner-password recovery; host shell = authority).
     Container loopback is unreachable from other containers and the LAN;
     only `docker compose exec provision ...` (same network namespace) can
     call it. It cannot require an admin caller (none exists yet), so it
     fails closed the moment any admin row exists - enforced atomically by
     the bootstrap_first_admin() RPC.
   Recovery safety: auth users created here are marked
   app_metadata.dentix_bootstrap='1' (SERVER-ONLY field: users cannot set
   app_metadata through the user endpoint; user_metadata is NOT trusted).
   Compensation/recovery deletes ONLY marked identities (proven created by
   an unfinished bootstrap), never an arbitrary existing email - a forged
   user_metadata flag does not authorize deletion. Mark cleared on success.
   The chosen password is never returned or logged; response is ok+email.
   Guarantees:
   - caller JWT validated against GoTrue; caller must be a row in
     clinic_admins AND own the employee row (owner_id = caller).
   - employee_id is the only accepted identifier; owner_id / roles /
     permissions in the body are IGNORED (no privilege injection).
   - NEVER touches clinic_admins: employees can never become admins
     through this service.
   - duplicate account / already-linked -> clean 4xx, no orphans:
     if linking fails after user creation, the created auth user is
     deleted again (compensating cleanup).
   - passwords: generated here, returned ONCE in the response body;
     never written to logs.
   ========================================================= */
import http from 'node:http';
import crypto from 'node:crypto';

const GOTRUE = process.env.GOTRUE_URL || 'http://127.0.0.1:9999';
const PGRST  = process.env.POSTGREST_URL || 'http://127.0.0.1:3000';
const SVC    = process.env.SERVICE_ROLE_JWT;
const PORT   = Number(process.env.PROVISION_PORT || 9090);

if (!SVC) { console.error('SERVICE_ROLE_JWT env required'); process.exit(1); }

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://127.0.0.1:8090';
const json = (res, code, obj) => {
    res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' });
    res.end(JSON.stringify(obj));
};
// two-stage rate limits: per-IP before auth (unverifiable callers cannot
// mint fresh buckets by rotating tokens), per-account after validation.
const hits = new Map();
const rateOk = (key, max) => {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < 60000);
    if (arr.length >= max) return false;
    arr.push(now); hits.set(key, arr);
    return true;
};
const svcHeaders = { 'apikey': SVC, 'Authorization': `Bearer ${SVC}`, 'Content-Type': 'application/json' };

async function callerUser(token) {
    const r = await fetch(`${GOTRUE}/user`, { headers: { 'apikey': SVC, 'Authorization': `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json().catch(() => null);
    return u && u.id ? u : null;
}
async function isClinicAdmin(uid) {
    const r = await fetch(`${PGRST}/clinic_admins?user_id=eq.${uid}&select=user_id`, { headers: svcHeaders });
    if (!r.ok) return false;
    const rows = await r.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
}
async function getEmployee(id) {
    const r = await fetch(`${PGRST}/employees?id=eq.${id}&select=id,owner_id,auth_user_id,email,full_name,active`, { headers: svcHeaders });
    if (!r.ok) return null;
    const rows = await r.json().catch(() => []);
    return rows && rows[0] || null;
}
async function createAuthUser(email, password, bootstrapMark = false) {
    const r = await fetch(`${GOTRUE}/admin/users`, { method: 'POST', headers: svcHeaders,
        body: JSON.stringify({ email, password, email_confirm: true,
            ...(bootstrapMark ? { app_metadata: { dentix_bootstrap: '1' } } : {}) }) });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
        const msg = String(body.msg || body.message || body.error_description || r.status);
        const dup = r.status === 422 || /already|exists|duplicate/i.test(msg);
        return { error: dup ? 'duplicate' : msg };
    }
    return { id: body.id };
}
async function deleteAuthUser(id) {
    await fetch(`${GOTRUE}/admin/users/${id}`, { method: 'DELETE', headers: svcHeaders }).catch(() => {});
}
async function clearBootstrapMark(id) {
    await fetch(`${GOTRUE}/admin/users/${id}`, { method: 'PUT', headers: svcHeaders,
        body: JSON.stringify({ app_metadata: { dentix_bootstrap: null } }) }).catch(() => {});
}
async function verifyUserPassword(email, password) {
    const r = await fetch(`${GOTRUE}/token?grant_type=password`, { method: 'POST',
        headers: { 'apikey': SVC, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }) });
    return r.ok;
}
async function setAuthUserPassword(id, password) {
    const r = await fetch(`${GOTRUE}/admin/users/${id}`, { method: 'PUT', headers: svcHeaders, body: JSON.stringify({ password }) });
    return r.ok;
}
async function revokeUserSessions(id) {
    // After a password change every existing session (including the one that
    // made the change) must lose its authority; the owner logs in again with
    // the new password. GoTrue admin logout revokes all refresh tokens; the
    // short-lived access token is rejected on the next refresh.
    const r = await fetch(`${GOTRUE}/admin/users/${id}/logout`, { method: 'POST', headers: svcHeaders });
    return r.ok || r.status === 204;
}
async function setAuthUserEmail(id, email) {
    const r = await fetch(`${GOTRUE}/admin/users/${id}`, { method: 'PUT', headers: svcHeaders,
        body: JSON.stringify({ email, email_confirm: true }) });
    return r.ok;
}
async function linkEmployee(employeeId, authUserId) {
    const r = await fetch(`${PGRST}/employees?id=eq.${employeeId}&auth_user_id=is.null`, { method: 'PATCH', headers: svcHeaders,
        body: JSON.stringify({ auth_user_id: authUserId }) });
    return r.ok;
}
async function anyAdmin() {
    const r = await fetch(`${PGRST}/clinic_admins?select=user_id&limit=1`, { headers: svcHeaders }).catch(() => null);
    if (!r || !r.ok) return null; // unknown -> fail closed
    const rows = await r.json().catch(() => []);
    return Array.isArray(rows) && rows.length > 0;
}
async function findAuthUserByEmail(email) {
    const r = await fetch(`${GOTRUE}/admin/users?page=1&per_page=1000`, { headers: svcHeaders }).catch(() => null);
    if (!r || !r.ok) return null;
    const body = await r.json().catch(() => ({}));
    const users = body.users || body || [];
    return (Array.isArray(users) ? users : []).find(u => (u.email || '').toLowerCase() === email) || null;
}
async function bootstrapFirstAdmin(uid) {
    const r = await fetch(`${PGRST}/rpc/bootstrap_first_admin`, { method: 'POST', headers: svcHeaders,
        body: JSON.stringify({ p_user_id: uid }) }).catch(() => null);
    if (!r) return 'error';
    if (r.ok) return 'ok';
    const t = await r.text().catch(() => '');
    return /admin_exists/.test(t) ? 'admin_exists' : 'error';
}
const genPassword = () => {
    // memorable-enough but random; 20 chars from a safe alphabet
    const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let p = Array.from(crypto.randomBytes(16)).map(b => alpha[b % alpha.length]).join('');
    return p + '!1'; // satisfy common symbol+digit rules
};

// ---- one-time first-owner bootstrap (loopback listener only; see header) ----
async function handleBootstrap(res, ip, body) {
    if (!rateOk('boot:' + ip, 5)) return json(res, 429, { error: 'محاولات كثيرة - انتظر دقيقة' });
    const email = String(body && body.email || '').trim().toLowerCase();
    const password = String(body && body.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(res, 400, { error: 'بريد غير صالح' });
    if (password.length < 8 || password.length > 128) return json(res, 400, { error: 'كلمة المرور 8 أحرف على الأقل' });
    const hasAdmin = await anyAdmin();
    if (hasAdmin === null) return json(res, 502, { error: 'تعذر التحقق من الحالة - لم يُنشأ أي حساب' });
    if (hasAdmin) return json(res, 409, { error: 'يوجد حساب مالك بالفعل - هذه العملية لمرة واحدة فقط' });
    let created = await createAuthUser(email, password, true); // marked dentix_bootstrap=1
    if (created.error === 'duplicate') {
        // a previous bootstrap attempt may have crashed after creating the
        // auth user. Delete and retry ONLY if that identity carries the
        // bootstrap mark (proven created by an unfinished bootstrap);
        // never delete an arbitrary existing email.
        const old = await findAuthUserByEmail(email);
        if (!old || (old.app_metadata || {}).dentix_bootstrap !== '1') {
            return json(res, 409, { error: 'يوجد حساب بهذا البريد بالفعل - لم يُنشأ أي حساب' });
        }
        await deleteAuthUser(old.id);
        created = await createAuthUser(email, password, true);
    }
    if (created.error) return json(res, 502, { error: 'تعذر إنشاء حساب الدخول' });
    const boot = await bootstrapFirstAdmin(created.id);
    if (boot !== 'ok') {
        await deleteAuthUser(created.id); // compensating cleanup: identity created by THIS attempt
        if (boot === 'admin_exists') return json(res, 409, { error: 'يوجد حساب مالك بالفعل - هذه العملية لمرة واحدة فقط' });
        return json(res, 502, { error: 'تعذر إكمال الإعداد - لم يُنشأ أي حساب' });
    }
    await clearBootstrapMark(created.id); // success: real owner now, not recoverable debris
    return json(res, 200, { ok: true, email }); // password is never returned or logged
}

const server = http.createServer(async (req, res) => {
    try {
        const action = req.url.replace(/\/+$/, '');
        // bootstrap lives ONLY on the loopback listener below
        if (req.method !== 'POST' || !['/provision', '/reset-password', '/account'].includes(action)) {
            return json(res, 404, { error: 'not found' });
        }
        const ip = req.socket.remoteAddress || 'unknown';
        if (!rateOk('ip:' + ip, 30)) return json(res, 429, { error: 'محاولات كثيرة - انتظر دقيقة' });
        // same-origin guard: browsers send Origin; reject anything but the app origin
        const origin = req.headers.origin;
        if (origin && origin !== ALLOWED_ORIGIN) return json(res, 403, { error: 'مصدر غير مسموح' });


        let body = {};
        try {
            body = JSON.parse(await new Promise((ok, no) => {
                let d = '';
                req.on('data', c => { d += c; if (d.length > 2048) { no(new Error('too large')); req.destroy(); } });
                req.on('end', () => ok(d)); req.on('error', no);
            }));
        } catch { return json(res, 400, { error: 'body غير صالح' }); }
        const employeeId = body && body.employee_id;
        if (action !== '/account' && (!employeeId || typeof employeeId !== 'string')) return json(res, 400, { error: 'employee_id مطلوب' });
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        if (!token) return json(res, 401, { error: 'مطلوب تسجيل دخول المالك' });

        const user = await callerUser(token);
        if (!user) return json(res, 401, { error: 'جلسة غير صالحة' });
        if (!rateOk('uid:' + user.id, 10)) return json(res, 429, { error: 'محاولات كثيرة - انتظر دقيقة' });
        if (!await isClinicAdmin(user.id)) return json(res, 403, { error: 'هذه العملية للمالك فقط' });

        if (action === '/account') {
            // Owner edits their OWN login: identity is proven with the CURRENT
            // password (real re-authentication against GoTrue), then the change
            // is applied with the service key. Secrets are never echoed back.
            const current = body && body.current_password;
            const newEmail = body && typeof body.new_email === 'string' ? body.new_email.trim() : '';
            const newPassword = body && typeof body.new_password === 'string' ? body.new_password : '';
            if (!current || typeof current !== 'string') return json(res, 400, { error: 'كلمة المرور الحالية مطلوبة' });
            if (!newEmail && !newPassword) return json(res, 400, { error: 'لا يوجد تغيير مطلوب' });
            if (newEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) return json(res, 400, { error: 'صيغة البريد غير صالحة' });
            if (newPassword && newPassword.length < 8) return json(res, 400, { error: 'كلمة المرور الجديدة قصيرة - ٨ أحرف على الأقل' });
            if (!await verifyUserPassword(user.email, current)) return json(res, 401, { error: 'كلمة المرور الحالية غير صحيحة' });
            if (newEmail && newEmail !== user.email) {
                const dup = await findAuthUserByEmail(newEmail);
                if (dup) return json(res, 409, { error: 'يوجد حساب بهذا البريد بالفعل' });
                if (!await setAuthUserEmail(user.id, newEmail)) return json(res, 502, { error: 'تعذر تحديث البريد - لم يتغير شيء' });
            }
            if (newPassword) {
                if (!await setAuthUserPassword(user.id, newPassword)) {
                    return json(res, 502, { error: newEmail ? 'تم تحديث البريد وتعذرت كلمة المرور' : 'تعذر تحديث كلمة المرور' });
                }
                if (!await revokeUserSessions(user.id)) {
                    return json(res, 502, { error: 'تم تحديث كلمة المرور وتعذر إنهاء الجلسات - سجّل الدخول بكلمة المرور الجديدة' });
                }
            }
            return json(res, 200, { ok: true, email_changed: !!(newEmail && newEmail !== user.email), password_changed: !!newPassword });
        }

        const emp = await getEmployee(employeeId);
        if (!emp) return json(res, 404, { error: 'الموظف غير موجود' });
        if (emp.owner_id !== user.id) return json(res, 403, { error: 'هذا الموظف لا يتبع عيادتك' }); // cross-clinic guard

        if (action === '/provision') {
            if (emp.auth_user_id) return json(res, 409, { error: 'لدى هذا الموظف حساب دخول بالفعل - استخدم إعادة تعيين كلمة المرور' });
            const password = genPassword();
            const created = await createAuthUser(emp.email, password);
            if (created.error === 'duplicate') return json(res, 409, { error: 'يوجد حساب دخول بهذا البريد بالفعل' });
            if (created.error) return json(res, 502, { error: 'تعذر إنشاء حساب الدخول' });
            if (!await linkEmployee(emp.id, created.id)) {
                await deleteAuthUser(created.id); // compensating cleanup: no orphan accounts
                return json(res, 502, { error: 'تعذر ربط الحساب بالموظف - لم يُنشأ أي حساب' });
            }
            return json(res, 200, { ok: true, email: emp.email, password });
        }

        // /reset-password
        if (!emp.auth_user_id) return json(res, 409, { error: 'لا يوجد حساب دخول لهذا الموظف بعد - أنشئ الحساب أولًا' });
        const password = genPassword();
        if (!await setAuthUserPassword(emp.auth_user_id, password)) return json(res, 502, { error: 'تعذر تحديث كلمة المرور' });
        return json(res, 200, { ok: true, email: emp.email, password });
    } catch (e) {
        return json(res, 500, { error: 'خطأ داخلي' });
    }
});
// MAIN listener: reachable by nginx over the docker network (container-safe).
server.listen(PORT, '0.0.0.0', () => console.log(`provision-server on ${PORT} (provision/reset-password/account)`));

// BOOTSTRAP listener: loopback ONLY - unreachable from other containers,
// the LAN and nginx; callable only from inside this container/host.
const BOOT_PORT = Number(process.env.BOOTSTRAP_PORT || 9091);
const bootServer = http.createServer(async (req, res) => {
    try {
        const action = req.url.replace(/\/+$/, '');
        if (req.method !== 'POST' || !['/bootstrap-owner', '/owner-reset'].includes(action)) {
            return json(res, 404, { error: 'not found' });
        }
        if (action === '/owner-reset') {
            // FORGOTTEN owner password. Loopback-only: shell access to the host
            // IS the authority here (same trust as the database volume itself).
            // Distinct from /account, which is in-app self-edit and requires the
            // current password.
            let body = {};
            try {
                body = JSON.parse(await new Promise((ok, no) => {
                    let d = '';
                    req.on('data', c => { d += c; if (d.length > 2048) { no(new Error('too large')); req.destroy(); } });
                    req.on('end', () => ok(d)); req.on('error', no);
                }));
            } catch { return json(res, 400, { error: 'body غير صالح' }); }
            const email = typeof body.email === 'string' ? body.email.trim() : '';
            const password = typeof body.password === 'string' ? body.password : '';
            if (!email || !password) return json(res, 400, { error: 'email و password مطلوبان' });
            if (password.length < 8) return json(res, 400, { error: 'كلمة المرور قصيرة - ٨ أحرف على الأقل' });
            if (!rateOk('owner-reset:' + ip, 5)) return json(res, 429, { error: 'محاولات كثيرة - انتظر دقيقة' });
            const user = await findAuthUserByEmail(email);
            if (!user) return json(res, 404, { error: 'لا يوجد حساب بهذا البريد' });
            if (!await isClinicAdmin(user.id)) return json(res, 403, { error: 'هذا الحساب ليس حساب مالك' });
            if (!await setAuthUserPassword(user.id, password)) return json(res, 502, { error: 'تعذر تحديث كلمة المرور' });
            await revokeUserSessions(user.id);
            return json(res, 200, { ok: true, email }); // password never echoed
        }
        const ip = req.socket.remoteAddress || 'unknown';
        let body = {};
        try {
            body = JSON.parse(await new Promise((ok, no) => {
                let d = '';
                req.on('data', c => { d += c; if (d.length > 2048) { no(new Error('too large')); req.destroy(); } });
                req.on('end', () => ok(d)); req.on('error', no);
            }));
        } catch { return json(res, 400, { error: 'body غير صالح' }); }
        return await handleBootstrap(res, ip, body);
    } catch (e) {
        return json(res, 500, { error: 'خطأ داخلي' });
    }
});
bootServer.listen(BOOT_PORT, '127.0.0.1', () => console.log(`bootstrap listener on 127.0.0.1:${BOOT_PORT} (bootstrap-owner, owner-reset)`));
