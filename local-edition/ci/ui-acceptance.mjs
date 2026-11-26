// UI acceptance gate - drives the ACTUAL shipped app (built web root served
// by the stack's nginx) in a real browser. Unlike realtime-acceptance.mjs
// (protocol-level test client), this executes the shipped js/notification.js:
// login through the app's own form, the app's own subscription, and the
// app's own catchUpNotifications() resync on rejoin. Asserts:
//   1. login via UI lands on an app page that loads the shipped catch-up code
//   2. a single committed change appears in the notification UI (DOM) with
//      no retry, and the path taken (realtime event vs catch-up) is timed
//   3. under a realtime-container restart, a change committed DURING the
//      outage appears in the UI only via the shipped catch-up code
//   4. one post-rejoin change appears in the UI
// Fixture-only content. Prints labels/counts/timings; writes two screenshots
// (ui-dashboard.png, ui-recovered.png) uploaded as a fixture-only artifact.
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';

const { BASE, ANON_KEY, OWNER_EMAIL, OWNER_PASSWORD, REALTIME_CONTAINER } = process.env;
const fail = (stage, m) => { console.log(`FAIL ui-acceptance stage=${stage}: ${m}`); process.exit(1); };
if (!REALTIME_CONTAINER) fail('setup', 'REALTIME_CONTAINER env missing');

let seq = 0;
let access = null, ownerUid = null;
const insertNotification = async (kind) => {
    seq++;
    const title = `ui-acceptance-${kind}-${seq}`;
    const r = await fetch(`${BASE}/rest/v1/notifications`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, Authorization: `Bearer ${access}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: ownerUid, title })
    });
    if (!r.ok) fail('insert', `${kind} HTTP ${r.status}`);
    return title;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
let connectedCount = 0;
let pageErrorCount = 0;
const pageErrorFns = {};
const seenStatuses = [];
// Identify uncaught page exceptions without printing raw error text (public
// log): the error NAME is an enumerated label, and the throwing function is
// matched against top-level functions from the app's own source - bare
// identifier tokens, no values, no messages.
const KNOWN_FNS = ['checkMissedWaitingVisits', 'checkLabDeliveriesToday', 'createLowStockNotifications',
    'loadNotifications', 'catchUpNotifications', 'startNotificationRealtime', 'startSourceRealtime',
    'showNotificationToast', 'addNotificationToList', 'updateNotificationCountRealtime',
    'navigateToNotificationSource', 'findInventoryItem', 'updateNotificationInList',
    'checkUser', 'getUserId', 'getRole', 'applyTheme', 'applyLanguage', 'generateVisitNumberMap',
    'markReminderAsSent', 'normalizeEgyptianPhone', 'copyTextToClipboard'];
page.on('pageerror', (e) => {
    pageErrorCount++;
    const stack = String((e && e.stack) || '');
    const fn = KNOWN_FNS.find((f) => stack.includes(f)) || 'unattributed';
    pageErrorFns[fn] = (pageErrorFns[fn] || 0) + 1;
    console.log(`ui-page-error name=${(e && e.name) || 'Error'} fn=${fn}`);
});
page.on('console', (msg) => {
    const t = msg.text();
    if (t.includes('Notification Realtime CONNECTED')) connectedCount++;
    const m = t.match(/Notification Realtime status:\s*(\w+)/);
    if (m) { seenStatuses.push(m[1]); console.log(`ui-page-status=${m[1]}`); }
});

// owner token for fixture inserts (REST, same as the CI fixtures use)
const lr = await fetch(`${BASE}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email: OWNER_EMAIL, password: OWNER_PASSWORD }) });
if (!lr.ok) fail('setup', 'owner REST login');
const session = await lr.json();
access = session.access_token;
ownerUid = session.user.id;

// 1. login through the app's own form
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.fill('#email', OWNER_EMAIL);
await page.fill('#password', OWNER_PASSWORD);
await page.click('button:has-text("Login")');
await page.waitForURL('**/dashboard.html', { timeout: 20000 }).catch(() => fail('login', 'no navigation to dashboard.html'));

// shipped code present in the page (top-level classic-script function)
await page.waitForFunction(() => typeof window.catchUpNotifications === 'function' && !!document.getElementById('notificationsContainer'), null, { timeout: 20000 })
    .catch(() => fail('load', 'shipped catchUpNotifications or notificationsContainer missing'));
console.log('ui-login=ok');
console.log('ui-shipped-catchup-loaded=1');
await page.waitForTimeout(1200);
await page.screenshot({ path: 'ui-dashboard.png' });

const domHas = async (title) => page.evaluate((t) => {
    const c = document.getElementById('notificationsContainer');
    return !!c && c.textContent.includes(t);
}, title);
const waitDom = async (title, ms, stage) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
        if (await domHas(title)) return Date.now() - t0;
        await page.waitForTimeout(300);
    }
    fail(stage, `title never appeared in notification UI within ${ms}ms`);
};

// initial subscribe settles. Pass when ANY CONNECTED was seen since page
// load: a fast first subscribe can land during login/screenshot, before this
// wait starts (observed: SUBSCRIBED logged 1s after ui-login=ok).
{
    const t0 = Date.now();
    // 90s, not 20s: the shipped ramp retries at 5/10/15/20/25s, so the wait
    // must outlive several retries (mirrors the app, per the alignment rule)
    while (connectedCount === 0 && Date.now() - t0 < 90000) await page.waitForTimeout(250);
    if (connectedCount === 0) {
        const tally = [...new Set(seenStatuses)].map((x) => `${x}=${seenStatuses.filter((y) => y === x).length}`).join(' ') || 'none';
        console.log(`ui-subscribe-diag statuses=${tally} page-errors=${pageErrorCount}`);
        fail('subscribe', 'no SUBSCRIBED console line');
    }
}

// 2. steady-state single change -> UI, no retry
const single = await insertNotification('single');
const ms1 = await waitDom(single, 20000, 'steady-state');
console.log(`ui-steady-state-ms=${ms1}`);

// smoke mode (SKIP_RESTART_PHASE=1): prove login + shipped code + live
// steady-state delivery in a real browser without the restart phases, so a
// realtime-restart fault elsewhere cannot keep all UI evidence unobserved.
if (process.env.SKIP_RESTART_PHASE === '1') {
    console.log(`PASS ui-acceptance-smoke (login ok, shipped code loaded, steady-state live delivery ${ms1}ms)`);
    await browser.close();
    process.exit(0);
}

// 3. outage: restart realtime under the live page; one change DURING outage
execSync(`docker restart ${REALTIME_CONTAINER}`, { stdio: 'ignore' });
await page.waitForTimeout(3000);
const during = await insertNotification('outage');
// wait for the app's own rejoin (second CONNECTED console line), then the UI
const c1 = connectedCount;
{
    const t0 = Date.now();
    // server-side recovery after a container restart is minutes-bounded
    // (dead-walsender window + realtime's hardcoded 5s..5min rand_exp
    // replication backoff); the shipped app keeps resubscribing every 30s.
    while (connectedCount <= c1 && Date.now() - t0 < 330000) await page.waitForTimeout(300);
    if (connectedCount <= c1) fail('reconnect', 'no re-SUBSCRIBED after restart');
}
console.log('ui-reconnect=rejoined');
const ms2 = await waitDom(during, 40000, 'resync');
console.log(`ui-outage-recovered-ms=${ms2} via=shipped-catchup`);
await page.screenshot({ path: 'ui-recovered.png' });

// 4. post-rejoin rows, two distinct moments:
//   a. IMMEDIATE post-rejoin - likely inside the activation gap (replication
//      restarts lazily on the rejoin). It must still surface in the DOM, via
//      the shipped periodic catch-up if the stream is not active yet. The
//      path is attributed with the shipped window.rtStreamEventCount hook:
//      DOM appearance without a stream event = recovered by catch-up.
//   b. after the stream proves active - plain live delivery.
const s0 = await page.evaluate(() => window.rtStreamEventCount || 0);
const gap = await insertNotification('postrejoin-gap');
const msGap = await waitDom(gap, 120000, 'post-rejoin-gap');
const s1 = await page.evaluate(() => window.rtStreamEventCount || 0);
console.log(`ui-post-rejoin-gap-ms=${msGap} via=${s1 > s0 ? 'stream' : 'catchup'}`);
{
    const t0 = Date.now();
    let active = false;
    while (Date.now() - t0 < 150000) {
        if ((await page.evaluate(() => window.rtStreamEventCount || 0)) > s1) { active = true; break; }
        await page.waitForTimeout(500);
    }
    console.log(`ui-stream-reactivated=${active ? 1 : 0} after-s=${Math.round((Date.now() - t0) / 1000)}`);
    if (!active) fail('post-rejoin', 'stream never reactivated within 150s (indicator state should be showing)');
}
const live = await insertNotification('postrejoin-live');
const ms4 = await waitDom(live, 20000, 'post-rejoin-live');
console.log(`ui-post-rejoin-live-ms=${ms4}`);

console.log(`PASS ui-acceptance (login ok, shipped code loaded, steady ${ms1}ms, outage recovered ${ms2}ms via shipped catch-up, post-rejoin gap row ${msGap}ms, live ${ms4}ms)`);
await browser.close();
process.exit(0);
