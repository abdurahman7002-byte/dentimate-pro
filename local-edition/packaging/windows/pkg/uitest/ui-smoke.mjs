// Browser smoke test (CI only, synthetic owner). Prints booleans/counts only.
import { chromium } from 'playwright-core';
const base = process.env.BASE || 'https://localhost:8443';
const out = {};
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
const page = await ctx.newPage();
let pageErrors = 0, badApi = 0;
page.on('pageerror', () => { pageErrors++; });
page.on('response', (r) => { const u = r.url(); if ((u.includes('/rest/v1/') || u.includes('/auth/v1/') || u.includes('/storage/v1/')) && r.status() >= 500) badApi++; });
try {
  await page.goto(base + '/index.html', { waitUntil: 'load', timeout: 30000 });
  out.login_page_has_form = (await page.locator('#email').count()) === 1 && (await page.locator('#password').count()) === 1;
  await page.fill('#email', process.env.OWNER_EM);
  await page.fill('#password', process.env.OWNER_PW);
  await page.click('button:has-text("Login")');
  await page.waitForURL((u) => !u.pathname.endsWith('/index.html') && u.pathname !== '/', { timeout: 30000 }).catch(() => {});
  out.after_login_path_not_login = !/\/(index\.html)?$/.test(new URL(page.url()).pathname);
  for (const p of ['patients.html', 'employees.html']) {
    const k = p.replace('.html', '');
    await page.goto(base + '/' + p, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(4000);
    out[k + '_stayed_on_page'] = new URL(page.url()).pathname.endsWith('/' + p);
    out[k + '_body_chars'] = (await page.locator('body').innerText()).length;
  }
} catch (e) {
  out.exception = String(e.message || e).split('\n')[0].slice(0, 160);
}
out.page_errors = pageErrors;
out.api_5xx = badApi;
await browser.close();
console.log(Object.entries(out).map(([k, v]) => `${k}=${v}`).join(' '));
