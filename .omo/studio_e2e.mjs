import { chromium } from 'playwright';
import crypto from 'crypto';

const suffix = crypto.randomBytes(4).toString('hex');
const email = 'st' + suffix + '@test.com', pw = 'StPw!!' + suffix, handle = 'se' + suffix;

await fetch('http://localhost:3000/api/v1/auth/signup', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password: pw, display_name: '테스터', handle })
});

const br = await chromium.launch({ headless: true });
const p = await br.newPage({ viewport: { width: 1280, height: 800 } });

p.on('console', msg => {
  if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
});
p.on('pageerror', err => console.log('PAGE ERROR:', err.message));

// Login via UI
await p.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });
await p.waitForTimeout(1000);
await p.fill('#email', email);
await p.fill('#password', pw);
await p.click('button[type="submit"]');
await p.waitForTimeout(3000);

// Navigate to studio
await p.goto('http://localhost:3000/studio', { waitUntil: 'networkidle' });
await p.waitForTimeout(5000);

// Wait for studio-nav-item to appear (hydration)
try {
  await p.waitForSelector('.studio-nav-item', { timeout: 10000 });
} catch {
  console.log('Timeout waiting for nav items');
}

const navs = await p.evaluate(() =>
  Array.from(document.querySelectorAll('.studio-nav-item')).map(i => i.textContent.trim())
);
const title = await p.evaluate(() => document.querySelector('.studio-page-title')?.textContent);
const kpis = await p.evaluate(() => document.querySelectorAll('.studio-kpi').length);
const uname = await p.evaluate(() => document.querySelector('.studio-me-name')?.textContent);
const url = p.url();

console.log('\nURL:', url);
console.log('Nav:', JSON.stringify(navs));
console.log('Title:', title);
console.log('KPI:', kpis);
console.log('User:', uname);
console.log('\nNav 5:', navs.length === 5 ? 'PASS' : 'FAIL');
console.log('Title match:', title === '대시보드' ? 'PASS' : 'FAIL');

await p.screenshot({ path: '.omo/screenshots/studio_redesign.png', fullPage: true });
console.log('Screenshot saved');
await br.close();
