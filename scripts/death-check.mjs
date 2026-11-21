// 校验死亡 → 重入本章 → 「诵前缘」速过 的流程
import { chromium } from 'playwright-core';
const BASE = process.argv[2] ?? 'http://localhost:4173/';
const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '?seed=5');
const c = (s) => page.locator(s).first().click();
await c('[data-act=node]'); // 观音
await c('[data-act=evopt]');
while (await page.locator('.overlay [data-act]').count()) await c('.overlay [data-act=pdWho], .overlay [data-act=pdCard], .overlay [data-act=pdUid], .overlay [data-act=pdSkip]');
for (let i = 0; i < 3; i++) { await c('[data-act=node]'); await c('[data-act=evopt]'); if (await page.locator('[data-act=evcont]').count()) await c('[data-act=evcont]'); }
await c('[data-act=node]'); // 难4
await c('[data-act=evopt][data-idx="0"]'); // 打刘洪
await page.evaluate(() => { const r = window.__xy.run; const t = r.combat.party[0]; t.hp = 1; t.protect = 0; r.combat.enemies[0].hp = 999; r.combat.enemies[0].moveIdx = 2; });
await c('[data-act=endTurn]');
await page.waitForSelector('[data-act=combatDone]');
await c('[data-act=combatDone]');
await page.waitForSelector('.dead');
await page.screenshot({ path: new globalThis.URL('../screenshots/06-dead.png', import.meta.url).pathname });
await c('[data-act=retry]');
await c('[data-act=node]');
await c('[data-act=evopt]');
while (await page.locator('.overlay [data-act]').count()) await c('.overlay [data-act=pdWho], .overlay [data-act=pdCard], .overlay [data-act=pdUid], .overlay [data-act=pdSkip]');
const lbl = await page.locator('.step.current .lbl').innerText();
await c('[data-act=node]');
await c('[data-act=evopt][data-idx="0"]'); // 速过
if (await page.locator('[data-act=evcont]').count()) await c('[data-act=evcont]');
const after = await page.evaluate(() => ({ step: window.__xy.run.step, deck: window.__xy.run.party[0].deck.map((x) => x.id), meta: window.__xy.meta }));
await browser.close();
console.log(lbl, JSON.stringify(after));
if (errors.length || !lbl.includes('诵前缘') || after.step !== 5 || !after.deck.includes('bianzhe')) { console.error('失败', errors); process.exit(1); }
console.log('✅ 死亡重开与诵前缘速过正常');
