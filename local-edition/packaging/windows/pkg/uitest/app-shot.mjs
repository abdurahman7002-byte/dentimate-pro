import { chromium } from 'playwright-core';
import fs from 'node:fs';
const out = {};
try {
  const b = await chromium.connectOverCDP('http://127.0.0.1:9333');
  const pages = b.contexts().flatMap((c) => c.pages());
  out.pages = pages.length;
  const p = pages.find((x) => x.url().includes('localhost:8443')) || pages[0];
  await p.waitForTimeout(2500);
  out.url_ok = p.url().includes('localhost:8443');
  out.has_login_form = (await p.locator('#email').count()) === 1;
  out.title = await p.title();
  fs.mkdirSync('C:/shots', { recursive: true });
  await p.screenshot({ path: 'C:/shots/desktop-app-window.png' });
} catch (e) { out.error = String(e.message).split('\n')[0].slice(0, 120); }
console.log(Object.entries(out).map(([k, v]) => `${k}=${v}`).join(' '));
process.exit(0);
