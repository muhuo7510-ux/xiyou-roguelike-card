// 无头浏览器从开局一路点到第一章结算，并截关键画面。
// 用法：先 `npm run build && npm run preview`，再 `node scripts/playthrough.mjs [url] [seed]`
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:4173/';
const SEED = Number(process.argv[3] ?? 11);
const OUT = new URL('../screenshots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

await page.goto(BASE);
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '?seed=' + SEED);

const shots = {};
async function shot(name) {
  if (shots[name]) return;
  await page.waitForTimeout(150);
  const p = OUT + name + '.png';
  await page.screenshot({ path: p });
  shots[name] = p;
  console.log('📸', p);
}
const click = (sel) => page.locator(sel).first().click();
const exists = async (sel) => (await page.locator(sel).count()) > 0;

let deaths = 0;
let actions = 0;
const visited = new Set();
while (actions++ < 3000) {
  const st = await page.evaluate(() => {
    const r = window.__xy.run;
    if (!r) return { screen: 'title' };
    return { screen: r.screen, pending: r.pending.length, step: r.step, event: r.event?.id, party: r.party.length, elig: r.party.filter((m) => !m.id.startsWith('cong')).length,
      enc: r.combat?.encounter, turn: r.combat?.turn, result: r.combat?.result };
  });
  visited.add(st.screen + (st.event ? ':' + st.event : ''));
  if (st.screen === 'title') { await click('[data-act=new]'); continue; }
  if (await exists('.overlay [data-act=pdWho]')) { await page.locator('.overlay [data-act=pdWho]').last().click(); continue; }
  if (await exists('.overlay [data-act=pdCard]')) { await click('.overlay [data-act=pdCard]'); continue; }
  if (await exists('[data-act=upConfirm]')) { await click('[data-act=upConfirm]'); continue; }
  if (await exists('.overlay [data-act=pdUid]')) { await click('.overlay [data-act=pdUid]'); continue; }
  if (await exists('.overlay [data-act=pdSkip]')) { await click('.overlay [data-act=pdSkip]'); continue; }

  if (st.screen === 'map') {
    if (st.step >= 11) await shot('01-map');
    const idx = await page.evaluate(() => {
      const r = window.__xy.run;
      const o = r.steps[r.step].options;
      const f = o.findIndex((x) => x.type === 'fight');
      return f >= 0 ? f : 0;
    });
    await click(`.step.current [data-act=node][data-idx="${idx}"]`);
  } else if (st.screen === 'event') {
    if (await exists('[data-act=evcont]')) { await click('[data-act=evcont]'); continue; }
    const idx = st.event === 'n9' ? 1 : 0; // 难9 选「请观音收服」，随后三人同场
    await click(`[data-act=evopt][data-idx="${idx}"]`);
  } else if (st.screen === 'combat') {
    if (await exists('[data-act=combatDone]')) { await click('[data-act=combatDone]'); continue; }
    if (st.party >= 3 && st.turn >= 2) {
      const fresh = await page.evaluate(() => window.__xy.run.combat.party.every((f) => !f.active || f.energy === f.maxEnergy));
      if (fresh) {
        for (const w of ['wukong', 'congB', 'congA']) {
          if (await exists(`.tabs [data-act=fighter][data-who="${w}"]`)) { await click(`.tabs [data-act=fighter][data-who="${w}"]`); break; }
        }
        await shot(st.enc === 'shuiguai' ? '02-battle-party' : '02-battle-party-early');
      }
    }
    let played = false;
    {
      // 依次尝试每个激活角色（弟子先，唐僧后）
      const actorIds = await page.evaluate(() => window.__xy.run.combat.party.filter((f) => f.active && !f.down && !f.captured).sort((a, b) => (a.role === 'master') - (b.role === 'master')).map((f) => f.id));
      for (const who of actorIds) {
        await click(`.tabs [data-act=fighter][data-who="${who}"]`);
        const playable = await page.locator(`.hand .card[data-act=card]:not(.dim)`).all();
        if (!playable.length) continue;
        // 按分数挑：攻击/关键技能优先
        let best = playable[0];
        let bestS = -99;
        for (const el of playable) {
          const t = await el.getAttribute('class');
          const name = await el.locator('.cname').innerText();
          let s = t.includes('t-power') ? 9 : t.includes('t-attack') ? 5 : 3;
          if (/紧箍|身外身|火眼|行云/.test(name)) s = 8;
          if (/赐福|筋斗云|江流/.test(name)) s = 7;
          if (/变马/.test(name)) s = -10;
          if (s > bestS) { bestS = s; best = el; }
        }
        if (bestS < -5) continue;
        await best.click();
        if (await exists('.hint')) {
          if (await exists('.enemy.targetable')) {
            // 打血最少的
            const uid = await page.evaluate(() => {
              const els = [...document.querySelectorAll('.enemy.targetable')];
              const r = window.__xy.run;
              const es = els.map((e) => r.combat.enemies.find((x) => x.uid === Number(e.dataset.uid))).sort((a, b) => a.hp - b.hp);
              return es[0].uid;
            });
            await click(`.enemy[data-uid="${uid}"]`);
          } else if (await exists('.ftr.targetable')) {
            await click('.ftr.targetable');
          } else await click('[data-act=cancel]');
        }
        played = true;
        break;
      }
    }
    if (!played) await click('[data-act=endTurn]');
  } else if (st.screen === 'reward') {
    if (await exists('[data-act=rwCard]')) {
      if (st.elig >= 2) await shot('03-card-pick');
      await click('[data-act=rwCard]');
      continue;
    }
    const whos = page.locator('[data-act=rwChar]:not([disabled])');
    if (st.elig >= 2 && (await whos.count())) await shot('03a-reward-choose-char');
    if (await whos.count()) { await whos.last().click(); continue; }
    let took = false;
    for (const a of ['rwRelic', 'rwPotion', 'rwUpgrade']) {
      if (await exists(`[data-act=${a}]`)) {
        const before = await page.evaluate(() => JSON.stringify(window.__xy.run.reward));
        await click(`[data-act=${a}]`);
        const now = await page.evaluate(() => JSON.stringify(window.__xy.run.reward));
        if (before !== now) { took = true; break; } // 丹药栏满时按钮仍在，跳过
      }
    }
    if (took) continue;
    await click('[data-act=rwDone]');
  } else if (st.screen === 'shop') {
    await shot('05-shop');
    const c = page.locator('.shop .card[data-act=buy]:not(.dim)');
    if (await c.count()) await c.first().click();
    await click('[data-act=leaveShop]');
  } else if (st.screen === 'rest') {
    const low = await page.evaluate(() => window.__xy.run.party.some((m) => m.hp < m.maxHp * 0.6));
    await click(low ? '[data-act=restHeal]' : '[data-act=restUp]');
  } else if (st.screen === 'dead') {
    deaths++;
    console.log('💀 死亡，重入本章');
    await click('[data-act=retry]');
  } else if (st.screen === 'victory') {
    await shot('04-chapter-clear');
    if (await exists('[data-act=carryRelic]')) await click('[data-act=carryRelic]');
    if (await exists('[data-act=carryCard]')) await click('[data-act=carryCard]');
    await click('[data-act=finish]');
    break;
  }
}
const final = await page.evaluate(() => ({ title: !!document.querySelector('.title'), meta: window.__xy.meta }));
await browser.close();
console.log('actions', actions, 'deaths', deaths, 'visited', [...visited].join(' '));
console.log('meta', JSON.stringify(final.meta));
if (errors.length) {
  console.error('页面错误：\n' + errors.join('\n'));
  process.exit(1);
}
if (!final.meta.ch2Unlocked) {
  console.error('未到达章末结算');
  process.exit(1);
}
console.log('✅ 通关第一章，无页面错误');
