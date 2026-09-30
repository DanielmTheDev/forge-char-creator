// Run JS inside the live local Foundry as the GM and print the result.
// Usage: npm run dev:eval -- 'game.actors.size'   |   npm run dev:eval -- ./probe.js
// Server must be running. EVAL_TIMEOUT (ms, default 60000), EVAL_LOG (regex, default SMOKE|Error).
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'node:fs';

const arg = process.argv[2];
if (!arg) { console.error("usage: npm run dev:eval -- '<js>' | <file.js>"); process.exit(1); }
const code = arg.endsWith('.js') && existsSync(arg) ? readFileSync(arg, 'utf8') : arg;
const timeout = Number(process.env.EVAL_TIMEOUT ?? 60000);
const logRe = new RegExp(process.env.EVAL_LOG ?? 'SMOKE|Error');
const base = `http://localhost:${process.env.FOUNDRY_PORT ?? 30000}`;

const browser = await chromium.launch();
let exit = 0;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page.on('console', m => { const t = m.text(); if (logRe.test(t)) console.log('[F]', t.slice(0, 400)); });
  await page.goto(base);
  await page.waitForSelector('select[name="userid"]', { timeout: 15000 });
  await page.selectOption('select[name="userid"]', { label: 'Gamemaster' });
  await page.click('button[name="join"]');
  await page.waitForFunction(() => globalThis.game?.ready === true, null, { timeout: 90000 });
  const r = await Promise.race([
    page.evaluate(code).then(v => ({ v }), err => ({ err })), // never rejects: a late rejection after close must not crash
    new Promise(res => setTimeout(() => res({ timeout: true }), timeout))
  ]);
  if (r.timeout) { console.log('RESULT TIMEOUT'); exit = 2; }
  else if (r.err) { console.log('ERROR', r.err.message); exit = 1; }
  else console.log('RESULT', JSON.stringify(r.v, null, 1));
} catch (e) {
  console.log('ERROR', e.message); exit = 1;
} finally {
  await browser.close();
}
process.exit(exit);
