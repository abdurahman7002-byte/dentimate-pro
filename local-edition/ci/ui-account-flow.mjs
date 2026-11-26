// UI proof of the owner account card (fixture-only): drives the ACTUAL
// shipped app in a real browser - login through the app's own form, open the
// employees page, change the owner password THROUGH THE CARD, get signed out
// (server revoked all sessions), log in again through the UI with the NEW
// password, then revert through the API. Prints labels/timings only.
import { chromium } from 'playwright';

const { BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD } = process.env;
const fail = (stage, m) => { console.log(`FAIL ui-account-flow stage=${stage}: ${m}`); process.exit(1); };
const ok = (m) => console.log(`ui-account-${m}`);

const TMP_PW = 'uitmp-' + crypto.randomUUID();

const browser = await chromium.launch();
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
let pageErrorCount = 0;
page.on('pageerror', (e) => { pageErrorCount++; console.log(`ui-account-page-error name=${(e && e.name) || 'Error'}`); });

// 1. login through the app's own form
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.fill('#email', OWNER_EMAIL);
await page.fill('#password', OWNER_PASSWORD);
await page.click('button:has-text("Login")');
await page.waitForURL('**/dashboard.html', { timeout: 20000 }).catch(() => fail('login', 'no navigation to dashboard.html'));
ok('login=ok');

// owner-only nav entry: present in the More menu, hidden by default,
// revealed only when is_admin() confirms the owner
await page.waitForSelector('#employeesMenuItem', { state: 'attached', timeout: 10000 }).catch(() => fail('nav', 'employees menu item missing'));
const navShown = await page.waitForFunction(() => {
    const el = document.getElementById('employeesMenuItem');
    return el && el.getAttribute('href') === 'employees.html' && getComputedStyle(el).display !== 'none';
}, { timeout: 10000 }).then(() => true).catch(() => false);
if (!navShown) fail('nav', 'employees menu item not revealed for owner');
ok('employees-nav-owner=ok');

// 2. the account card exists on the employees page with all four fields
await page.goto(BASE + '/employees.html', { waitUntil: 'domcontentloaded' });
for (const id of ['#accNewEmail', '#accNewPassword', '#accNewPassword2', '#accCurrentPassword']) {
    await page.waitForSelector(id, { timeout: 10000 }).catch(() => fail('card', `missing field ${id}`));
}
ok('card-fields=4');

// 3. change the password THROUGH THE CARD (real click, not a script call)
await page.fill('#accCurrentPassword', OWNER_PASSWORD);
await page.fill('#accNewPassword', TMP_PW);
await page.fill('#accNewPassword2', TMP_PW);
await page.click('button:has-text("حفظ تغييرات الحساب")');
// the server revoked every session: the app signs out and returns to login
await page.waitForURL('**/index.html', { timeout: 15000 }).catch(() => fail('signout', 'no redirect to index.html after password change'));
ok('signed-out-after-password-change=ok');

// 4. log in through the UI with the NEW password (proof the change took)
await page.fill('#email', OWNER_EMAIL);
await page.fill('#password', TMP_PW);
await page.click('button:has-text("Login")');
await page.waitForURL('**/dashboard.html', { timeout: 20000 }).catch(() => fail('relogin', 'login with new password failed in the app'));
ok('relogin-with-new-password=ok');
await page.screenshot({ path: 'ui-account.png' });

// 5. revert through the API so nothing after this step sees changed creds
const lr = await fetch(`${BASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: OWNER_EMAIL, password: TMP_PW }) });
if (!lr.ok) fail('revert', 'REST login with new password');
const sess = await lr.json();
const rv = await fetch(`${BASE}/account`, { method: 'POST', headers: { apikey: ANON_KEY, Authorization: `Bearer ${sess.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ current_password: TMP_PW, new_password: OWNER_PASSWORD }) });
if (!rv.ok) fail('revert', `password revert HTTP ${rv.status}`);
const back = await fetch(`${BASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }) });
if (!back.ok) fail('revert', 'login with original password after revert');
ok('reverted=ok');

await browser.close();
if (pageErrorCount) fail('pageerrors', `count=${pageErrorCount}`);
console.log('PASS ui-account-flow (card present, password changed via UI, signed out, relogged in with new password, reverted)');
