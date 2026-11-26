// Demo screenshots in CI from the built package with synthetic data. Output: PNGs + labels.json
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const base = process.env.BASE || 'https://localhost:8443';
const dir = process.env.SHOTS || 'C:/shots';
fs.mkdirSync(dir, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const labels = {};
async function shot(name) {
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: process.env.FULL === '1' });
  labels[name] = await page.evaluate(() => ({
    title: document.title,
    headings: [...document.querySelectorAll('h1,h2,h3')].map(e => e.innerText.trim()).filter(Boolean).slice(0, 25),
    nav: [...document.querySelectorAll('a,button')].map(e => e.innerText.trim().replace(/\s+/g, ' ')).filter(t => t && t.length < 40).slice(0, 60),
  }));
}
await page.goto(base + '/index.html', { waitUntil: 'load' });
await shot('01-login');
await page.fill('#email', process.env.OWNER_EM);
await page.fill('#password', process.env.OWNER_PW);
await page.click('button:has-text("Login")');
await page.waitForURL((u) => !u.pathname.endsWith('/index.html'), { timeout: 30000 }).catch(() => {});
await shot('02-dashboard-after-login');
const pages = [['03-patients', 'patients.html'], ['04-patients-files', 'patients-files.html'], ['06-employees-permissions', 'employees.html'],
  ['07-waiting-screen', 'waiting.html'], ['08-billing', 'Bill.html'], ['09-reports', 'reports.html'], ['10-clinic-settings', 'control.html'], ['11-doctors', 'doctors.html']];
for (const [n, p] of pages) {
  try { await page.goto(base + '/' + p, { waitUntil: 'load', timeout: 30000 }); await shot(n); } catch (e) { labels[n] = { error: String(e.message).slice(0, 80) }; }
}
try { await page.goto(base + '/patient-file.html?id=1', { waitUntil: 'load' }); await shot('05-patient-detail'); } catch (e) { labels['05-patient-detail'] = { error: 'failed' }; }
// employees: open the first employee's permissions if a button exists
try {
  await page.goto(base + '/employees.html', { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const b = page.locator('button:has(i.fa-shield-halved), button:has(i.fa-lock), button:has(i.fa-user-shield)').first();
  if (await b.count()) { await b.click(); await shot('06b-employee-permissions-open'); }
} catch {}
// launcher window: real launcher output rendered as a console picture
if (process.env.LAUNCHER_LOG && fs.existsSync(process.env.LAUNCHER_LOG)) {
  const txt = fs.readFileSync(process.env.LAUNCHER_LOG, 'utf8').split('\n').filter(l => !/^\d{4}-/.test(l) || true).slice(-14).map(l => l.replace(/^\d{4}-\d\d-\d\dT[\d:]+ /, '')).join('\n');
  const esc = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  await page.setContent(`<body style="margin:0;background:#0c0c0c"><div style="margin:40px;width:1000px;background:#0c0c0c;color:#ccc;font:18px Consolas,monospace;white-space:pre;border:1px solid #444;padding:20px"><div style="color:#fff;margin-bottom:12px">C:\\Clinic\\START-CLINIC.bat</div>${esc}</div></body>`);
  await page.screenshot({ path: `${dir}/12-launcher-console-rendered.png` });
}
fs.writeFileSync(`${dir}/labels.json`, JSON.stringify(labels, null, 1));
await browser.close();
console.log('shots=' + fs.readdirSync(dir).filter(f => f.endsWith('.png')).length);
