// Employee permission test (CI, synthetic). Prints booleans/counts only.
import { chromium } from 'playwright-core';
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const base = process.env.BASE || 'https://localhost:8443';
const phase = process.env.PHASE || 'x';
const cfg = await (await fetch(base + '/js/config.local.js')).text();
const anon = /SUPABASE_ANON_KEY:\s*'([^']+)'/.exec(cfg)[1];
const H = (t, x = {}) => ({ apikey: anon, Authorization: 'Bearer ' + (t || anon), 'Content-Type': 'application/json', ...x });
async function login(em, pw) {
  const r = await fetch(base + '/auth/v1/token?grant_type=password', { method: 'POST', headers: H(), body: JSON.stringify({ email: em, password: pw }) });
  const j = await r.json(); return j.access_token || null;
}
const rest = async (t, path, method = 'GET', body) => {
  const r = await fetch(base + '/rest/v1/' + path, { method, headers: H(t, { Prefer: 'return=representation' }), body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => null);
  return { status: r.status, n: Array.isArray(j) ? j.length : -1 };
};
const owner = await login(process.env.OWNER_EM, process.env.OWNER_PW);
const emps = (await (await fetch(base + '/rest/v1/employees?select=id,email', { headers: H(owner) })).json());
const creds = {};
for (const e of emps) {
  const r = await fetch(base + '/provision', { method: 'POST', headers: H(owner, { Origin: base }), body: JSON.stringify({ employee_id: e.id }) });
  let j = await r.json();
  if (!j.password) { const r2 = await fetch(base + '/reset-password', { method: 'POST', headers: H(owner, { Origin: base }), body: JSON.stringify({ employee_id: e.id }) }); j = await r2.json(); }
  creds[e.email] = j.password || null;
}
const out = { phase };
out.provisioned = Object.values(creds).filter(Boolean).length;
const T = {};
for (const em of Object.keys(creds)) T[em.split('@')[0]] = await login(em, creds[em]);
const q = async (who, tbl) => (await rest(T[who], tbl + '?select=id')).n;
// REST (data layer) positive and negative
for (const who of ['three', 'pat', 'billadd', 'none']) {
  const r = [];
  for (const t of ['patients', 'bills', 'doctors', 'labs']) r.push(t + '=' + await q(who, t));
  out['rest_' + who] = r.join(',');
}
// writes: three has bill view only -> insert must fail; billadd has bill add -> insert ok; billadd cannot add doctor
const ins = async (who, tbl, row) => (await rest(T[who], tbl, 'POST', row)).status;
out.three_add_bill_denied = (await ins('three', 'bills', { beneficiary: 'x', reason: 'x', amount: 1 })) >= 400;
out.billadd_add_bill_ok = (await ins('billadd', 'bills', { beneficiary: 'x', reason: 'x', amount: 1 })) < 300;
out.billadd_add_doctor_denied = (await ins('billadd', 'doctors', { doctor_name: 'x' })) >= 400;
out.pat_add_patient_denied = (await ins('pat', 'patients', { full_name: 'x' })) >= 400;
// UI: what the employee actually sees
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function ui(em, pageName, needle) {
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true }); const page = await ctx.newPage();
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  await page.fill('#email', em); await page.fill('#password', creds[em]);
  await page.click('button:has-text("Login")');
  await page.waitForURL((u) => !u.pathname.endsWith('/index.html') && u.pathname !== '/', { timeout: 30000 }).catch(() => {});
  await page.goto(base + '/' + pageName, { waitUntil: 'load' }); await page.waitForTimeout(5000);
  const stayed = new URL(page.url()).pathname.endsWith('/' + pageName);
  const txt = await page.locator('body').innerText();
  await ctx.close();
  return { stayed, sees: txt.includes(needle) };
}
for (const [pg, nd] of [['patients-files.html', 'Perm Patient A'], ['Bill.html', 'Perm Beneficiary A'], ['doctors.html', 'Perm Doctor A']]) {
  const r = await ui('three@example.test', pg, nd);
  out['ui_three_' + pg.replace('.html', '')] = `stayed=${r.stayed},sees_data=${r.sees}`;
}
// leakage: patients-only employee must not see bills / doctors data in UI
for (const [pg, nd] of [['Bill.html', 'Perm Beneficiary A'], ['doctors.html', 'Perm Doctor A']]) {
  const r = await ui('pat@example.test', pg, nd);
  out['ui_pat_' + pg.replace('.html', '')] = `stayed=${r.stayed},sees_data=${r.sees}`;
}
// Waiting screen: RPC and page, owner and employee with waiting=view, employee without
{
  const rpc = async (t) => { const r = await fetch(base + '/rest/v1/rpc/get_waiting_queue', { method: 'POST', headers: H(t), body: '{}' }); const j = await r.json().catch(() => null); return `${r.status}:${Array.isArray(j) ? j.length : -1}`; };
  out.rpc_owner = await rpc(owner);
  out.rpc_wait_emp = await rpc(T['wait']);
  out.rpc_pat_emp_denied = await rpc(T['pat']);
  const o = await (async () => {
    const ctx = await browser.newContext({ ignoreHTTPSErrors: true }); const page = await ctx.newPage();
    await page.goto(base + '/index.html', { waitUntil: 'load' });
    await page.fill('#email', process.env.OWNER_EM); await page.fill('#password', process.env.OWNER_PW);
    await page.click('button:has-text("Login")');
    await page.waitForURL((u) => !u.pathname.endsWith('/index.html') && u.pathname !== '/', { timeout: 30000 }).catch(() => {});
    await page.goto(base + '/waiting.html', { waitUntil: 'load' }); await page.waitForTimeout(7000);
    const t = await page.locator('body').innerText(); const title = await page.title(); await ctx.close();
    return { sees: t.includes('Perm Patient A'), dentix: /dentix/i.test(t + title) };
  })();
  out.owner_waiting_sees_patient = o.sees; out.waiting_old_name_visible = o.dentix;
  const e = await ui('wait@example.test', 'waiting.html', 'Perm Patient A');
  out.wait_emp_waiting = `stayed=${e.stayed},sees_data=${e.sees}`;
}
// Pricing Helper in the More menu: owner sees the link and the page opens; employee without 'control' is bounced
{
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true }); const page = await ctx.newPage();
  await page.goto(base + '/index.html', { waitUntil: 'load' });
  await page.fill('#email', process.env.OWNER_EM); await page.fill('#password', process.env.OWNER_PW);
  await page.click('button:has-text("Login")');
  await page.waitForURL((u) => !u.pathname.endsWith('/index.html') && u.pathname !== '/', { timeout: 30000 }).catch(() => {});
  await page.goto(base + '/patients.html', { waitUntil: 'load' }); await page.waitForTimeout(3000);
  out.more_menu_pricing_link = await page.locator('.moore-menu a[href="pricing.html"]').count();
  await page.goto(base + '/pricing.html', { waitUntil: 'load' }); await page.waitForTimeout(3000);
  out.owner_pricing_opens = new URL(page.url()).pathname.endsWith('/pricing.html');
  await ctx.close();
  const r = await ui('three@example.test', 'pricing.html', 'zzzz');
  out.employee_without_control_pricing_stayed = r.stayed;
}
await browser.close();
console.log(Object.entries(out).map(([k, v]) => `${k}=${v}`).join(' '));
