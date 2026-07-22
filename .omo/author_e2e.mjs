import { chromium } from 'playwright';
import crypto from 'crypto';

const suffix = crypto.randomBytes(4).toString('hex');
const email = 'au' + suffix + '@test.com', pw = 'AuPw!!' + suffix;
const handle = 'au' + suffix;

const r = await fetch('http://localhost:3000/api/v1/auth/signup', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: pw, display_name: '작가님', handle })
});
console.log('Signup:', r.status, r.ok);

const r2 = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: pw }), redirect: 'manual'
});
console.log('Login:', r2.status, r2.ok);

const br = await chromium.launch({ headless: true });
const ctx = await br.newContext();

const setCookie = r2.headers.get('set-cookie');
if (setCookie) {
  const match = setCookie.match(/refresh_token=([^;]+)/);
  if (match) {
    await ctx.addCookies([{ name: 'refresh_token', value: match[1], domain: 'localhost', path: '/', httpOnly: true, sameSite: 'Lax' }]);
  }
}

const p = await ctx.newPage({ viewport: { width: 1280, height: 800 } });
p.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
p.on('pageerror', err => console.log('PAGE ERROR:', err.message));

const url = `http://localhost:3000/@${handle}`;
console.log('\nNavigating to:', url);
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(3000);

try { await p.waitForSelector('.author-hero-name', { timeout: 10000 }); } catch {}
try { await p.waitForSelector('.author-tab', { timeout: 10000 }); } catch {}

const heroName = await p.evaluate(() => document.querySelector('.author-hero-name')?.textContent);
const heroHandle = await p.evaluate(() => document.querySelector('.author-hero-handle')?.textContent);
const statEls = await p.evaluate(() => document.querySelectorAll('.author-stat').length);
const tabs = await p.evaluate(() => Array.from(document.querySelectorAll('.author-tab')).map(t => t.textContent.trim()));
const seriesCards = await p.evaluate(() => document.querySelectorAll('.author-series-card').length);
const bannerH = await p.evaluate(() => document.querySelector('.author-banner')?.getBoundingClientRect().height);
const avatar = await p.evaluate(() => document.querySelector('.author-hero-avatar')?.textContent);
const actions = await p.evaluate(() => document.querySelectorAll('.author-act-btn').length);
const sortSelect = await p.evaluate(() => document.querySelector('.author-sort-select') !== null);

console.log('\nHero name:', heroName);
console.log('Hero handle:', heroHandle);
console.log('Stats:', statEls);
console.log('Tabs:', JSON.stringify(tabs));
console.log('Series cards:', seriesCards);
console.log('Banner height:', bannerH);
console.log('Avatar initial:', avatar);
console.log('Action btns:', actions);
console.log('Sort select:', sortSelect);

console.log('\nName:', heroName === '작가님' ? 'PASS' : 'FAIL');
console.log('Stats:', statEls >= 4 ? 'PASS' : 'FAIL');
console.log('Tabs >=2:', tabs.length >= 2 ? 'PASS' : 'FAIL');
console.log('Action btns:', actions >= 2 ? 'PASS' : 'FAIL');

await p.screenshot({ path: '.omo/screenshots/author_page.png', fullPage: true });
console.log('\nScreenshot saved');
await br.close();
