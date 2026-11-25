// 截取「升级对比」和「关键词提示」两张关键画面
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4173/';
const OUT = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '?seed=11');
await page.waitForSelector('.step.current, .event');

const injected = await page.evaluate(() => {
  const r = window.__xy.run;
  if (!r) return null;
  const tang = r.party.find((m) => m.id === 'tang');
  const song = tang.deck.find((c) => c.id === 'songjing' && !c.up);
  r.pending = [{ kind: 'upgrade', who: 'tang', source: '默经' }];
  window.__xy.render();
  return song?.uid ?? null;
});
await page.waitForSelector('[data-act=pdUid]');
if (injected != null) {
  await page.locator(`[data-act=pdUid][data-uid="${injected}"]`).first().click();
} else {
  await page.locator('[data-act=pdUid]').first().click();
}
await page.waitForSelector('[data-act=upConfirm]');
await page.waitForTimeout(200);
await page.screenshot({ path: OUT + '07-upgrade-compare.png' });
console.log('📸', OUT + '07-upgrade-compare.png');

const kw = page.locator('.cmp-overlay .kw').filter({ hasText: '诅咒' }).first();
if (await kw.count()) await kw.click();
else await page.locator('.cmp-overlay .kw').first().click();
await page.waitForSelector('.toast');
await page.mouse.move(215, 860);
await page.waitForTimeout(200);
await page.screenshot({ path: OUT + '08-keyword-tip.png' });
console.log('📸', OUT + '08-keyword-tip.png');

await browser.close();
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('✅ 截图完成');
