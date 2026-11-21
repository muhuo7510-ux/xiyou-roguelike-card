// 单章流程：地图、事件、奖励、商店、休息、结算。纯逻辑，无 DOM
import { CARDS, NEUTRAL_POOL } from '../data/cards';
import { CHAPTER1 } from '../data/chapter1';
import { CHARS } from '../data/characters';
import { ENCOUNTERS } from '../data/enemies';
import { EVENTS, ROAD_EVENTS } from '../data/events';
import { POTIONS, RELICS } from '../data/relics';
import { canUpgrade, cardDef } from './cards';
import { fighter, startCombat } from './combat';
import { pick, rand, randInt, shuffle, weighted } from './rng';
import type { MapNode, MapStep, Member, MetaState, Pending, RunState } from './state';
import type { CardInst, CharId, EventDef, EventOp, Rarity, RewardTier } from './types';

export const START_GOLD = 99;

function uid(run: RunState) {
  return ++run.uid;
}

export function makeMember(run: RunState, id: CharId): Member {
  const d = CHARS[id];
  return {
    id, hp: d.maxHp, maxHp: d.maxHp, removeCount: 0, pity: 0, plainStreak: 0, missed: 0,
    deck: d.startDeck.map((cid) => ({ uid: uid(run), id: cid, up: false })),
  };
}

export function newRun(seed: number, meta?: Partial<MetaState>): RunState {
  const run: RunState = {
    version: 1, seed, rng: seed | 0, uid: 0, chapter: 1, gold: START_GOLD, party: [], relics: [{ id: 'jinlan', bound: 'tang' }],
    potions: [], potionSlots: 3, steps: [], step: 0, screen: 'map', pending: [], usedEvents: [],
    stats: { fights: 0, turns: 0, goldEarned: 0, cardsAdded: 0, startedAt: Date.now(), downs: 0 },
  };
  run.party.push(makeMember(run, 'tang'));
  run.steps = buildSteps(run, !!meta?.seenIntro);
  return run;
}

function buildSteps(run: RunState, seenIntro: boolean): MapStep[] {
  const steps: MapStep[] = [];
  for (const t of CHAPTER1.steps) {
    if (t.kind === 'guanyin') steps.push({ road: false, chosen: null, options: [{ type: 'guanyin', label: '观音点化', icon: '🙏' }] });
    else if (t.kind === 'end') steps.push({ road: false, chosen: null, options: [{ type: 'end', label: '章末结算', icon: '🏯' }] });
    else if (t.kind === 'ordeal') {
      const isRecap = seenIntro && t.ordeal === 1;
      steps.push({ road: false, chosen: null, options: [{
        type: 'ordeal', ordeal: t.ordeal, event: isRecap ? 'recap' : t.event,
        label: isRecap ? '诵前缘（可速过难1～4）' : t.label, icon: t.icon }] });
    } else {
      const opts: MapNode[] = t.types.map((ty) => {
        if (ty === 'fight') {
          const enc = pick(run, t.fights ?? ['road_dao']);
          return { type: 'fight', encounter: enc, label: ENCOUNTERS[enc].name, icon: '⚔️' };
        }
        if (ty === 'event') return { type: 'event', label: '奇遇', icon: '❓' };
        if (ty === 'shop') return { type: 'shop', label: '集镇商铺', icon: '🏮' };
        return { type: 'rest', label: '歇脚 / 化缘', icon: '🔥' };
      });
      steps.push({ road: true, chosen: null, options: shuffle(run, opts) });
    }
  }
  return steps;
}

export function currentStep(run: RunState): MapStep | undefined {
  return run.steps[run.step];
}

export function eligibleChars(run: RunState): CharId[] {
  return run.party.filter((m) => !CHARS[m.id].temporary).map((m) => m.id);
}

export function member(run: RunState, id: CharId): Member | undefined {
  return run.party.find((m) => m.id === id);
}

/* ================= 地图 ================= */
export function chooseNode(run: RunState, optIdx: number) {
  const st = currentStep(run);
  if (!st || run.screen !== 'map' || run.pending.length) return;
  const node = st.options[optIdx];
  if (!node) return;
  st.chosen = optIdx;
  run.toast = undefined;
  switch (node.type) {
    case 'guanyin':
      openGuanyin(run);
      break;
    case 'ordeal':
      openEvent(run, node.event!);
      break;
    case 'event': {
      const left = ROAD_EVENTS.filter((e) => !run.usedEvents.includes(e));
      const id = pick(run, left.length ? left : ROAD_EVENTS);
      run.usedEvents.push(id);
      openEvent(run, id);
      break;
    }
    case 'fight':
      beginFight(run, node.encounter!);
      break;
    case 'shop':
      openShop(run);
      break;
    case 'rest':
      run.screen = 'rest';
      break;
    case 'end':
      run.screen = 'victory';
      break;
  }
}

export function completeNode(run: RunState) {
  run.step++;
  run.screen = 'map';
  run.event = undefined;
  run.combat = undefined;
  run.reward = undefined;
  run.shop = undefined;
}

/* ================= 事件 ================= */
export function openEvent(run: RunState, id: string, custom?: EventDef) {
  if (!custom && !EVENTS[id]) throw new Error('未知事件 ' + id);
  run.event = { id, custom };
  run.screen = 'event';
}

export function currentEvent(run: RunState): EventDef | undefined {
  if (!run.event) return undefined;
  return run.event.custom ?? EVENTS[run.event.id];
}

function openGuanyin(run: RunState) {
  const pool: EventDef['options'] = [
    { label: '观音赐宝', hint: '随机一件普通法宝', ops: [{ op: 'relic' }] },
    { label: '杨柳甘露', hint: '唐僧最大生命 +6', ops: [{ op: 'maxHp', who: 'tang', n: 6 }] },
    { label: '布施斋钱', hint: '斋钱 +60', ops: [{ op: 'gold', n: 60 }] },
    { label: '授一卷经', hint: '唐僧 3 选 1 张牌（高稀有度）', ops: [{ op: 'cardPick', who: 'tang', tier: 'boss' }] },
    { label: '灵丹两颗', hint: '斋饭 + 清心丹', ops: [{ op: 'potion', id: 'zhaifan' }, { op: 'potion', id: 'qingxindan' }] },
    { label: '点化经文', hint: '升级唐僧一张牌', ops: [{ op: 'upgradePick', who: 'tang' }] },
  ];
  const options = shuffle(run, pool).slice(0, 3);
  openEvent(run, 'guanyin', {
    id: 'guanyin', title: '观音点化', art: '🙏',
    text: '南海落伽山，观音菩萨受如来法旨，往东土寻取经人。临行前，菩萨垂眸一笑：「此去西天十万八千里，贫僧赠你一样东西。」\n\n三选一：',
    options,
  });
}

export function chooseEventOption(run: RunState, idx: number) {
  const ev = currentEvent(run);
  if (!ev || run.screen !== 'event' || run.event?.result !== undefined) return;
  const opt = ev.options[idx];
  if (!opt) return;
  if (opt.needGold && run.gold < opt.needGold) return;
  const texts = applyOps(run, opt.ops ?? []);
  if (opt.fight) {
    beginFight(run, opt.fight, opt.after);
    return;
  }
  if (opt.next) {
    openEvent(run, opt.next);
    return;
  }
  if (run.screen !== 'event') return; // 例如进入休息
  if (texts.length) {
    run.event!.result = texts.join('\n');
    return;
  }
  completeNode(run);
}

export function eventContinue(run: RunState) {
  if (run.screen === 'event' && run.event?.result !== undefined) completeNode(run);
}

export function applyOps(run: RunState, ops: EventOp[]): string[] {
  const out: string[] = [];
  for (const op of ops) {
    switch (op.op) {
      case 'gold':
        run.gold = Math.max(0, run.gold + op.n);
        if (op.n > 0) run.stats.goldEarned += op.n;
        break;
      case 'heal': {
        const targets = op.who === 'party' ? run.party : run.party.filter((m) => m.id === op.who);
        for (const m of targets) m.hp = Math.min(m.maxHp, m.hp + (op.n ?? Math.ceil(m.maxHp * (op.pct ?? 0))));
        break;
      }
      case 'loseHp': {
        const m = member(run, op.who);
        if (m) m.hp = Math.max(1, m.hp - op.n);
        break;
      }
      case 'maxHp': {
        const m = member(run, op.who);
        if (m) {
          m.maxHp += op.n;
          m.hp += op.n;
        }
        break;
      }
      case 'addCard': {
        const m = member(run, op.who);
        if (m) m.deck.push({ uid: uid(run), id: op.card, up: false });
        break;
      }
      case 'relic': {
        const id = op.id ?? randomRelic(run);
        if (id) {
          gainRelic(run, id);
          out.push(`获得法宝「${RELICS[id].name}」`);
        } else {
          run.gold += 30;
          out.push('法宝已尽，改得斋钱 30');
        }
        break;
      }
      case 'potion': {
        const id = op.id ?? pick(run, Object.keys(POTIONS));
        out.push(gainPotion(run, id) ? `获得丹药「${POTIONS[id].name}」` : `丹药栏已满，「${POTIONS[id].name}」只好留下`);
        break;
      }
      case 'join':
        if (!member(run, op.who)) {
          run.party.push(makeMember(run, op.who));
          const sr = CHARS[op.who].startRelic;
          if (sr && !run.relics.some((r) => r.id === sr)) run.relics.push({ id: sr, bound: op.who });
          out.push(`${CHARS[op.who].emoji} ${CHARS[op.who].name}入队！`);
        }
        break;
      case 'leave':
        run.party = run.party.filter((m) => m.id !== op.who);
        break;
      case 'flag':
        break;
      case 'rest':
        run.screen = 'rest';
        break;
      case 'cardPick':
        run.pending.push({ kind: 'cardPick', who: op.who ?? null, tier: op.tier });
        break;
      case 'upgradePick':
        run.pending.push({ kind: 'upgrade', who: op.who ?? null, source: '默经' });
        break;
      case 'skipSteps':
        run.step += op.n;
        break;
      case 'chance':
        if (rand(run) < op.p) {
          out.push(op.winText, ...applyOps(run, op.win));
        } else {
          out.push(op.loseText, ...applyOps(run, op.lose));
        }
        break;
    }
  }
  return out;
}

/* ================= 法宝 / 丹药 ================= */
export function randomRelic(run: RunState): string | null {
  const pool = Object.values(RELICS).filter((r) => r.pool && !run.relics.some((x) => x.id === r.id));
  return pool.length ? pick(run, pool).id : null;
}

export function gainRelic(run: RunState, id: string) {
  const def = RELICS[id];
  if (!def.bound) {
    run.relics.push({ id });
    return;
  }
  if (def.starter) {
    run.relics.push({ id, bound: def.starter });
    return;
  }
  const el = eligibleChars(run);
  if (el.length <= 1) run.relics.push({ id, bound: el[0] ?? 'tang' });
  else run.pending.push({ kind: 'bindRelic', relic: id });
}

export function gainPotion(run: RunState, id: string): boolean {
  if (run.potions.length >= run.potionSlots) return false;
  if (id === 'huanhun' && run.potions.includes('huanhun')) return false;
  run.potions.push(id);
  return true;
}

/** 地图上使用丹药（斋饭 / 清心丹） */
export function usePotionOnMap(run: RunState, idx: number, who: CharId): boolean {
  const id = run.potions[idx];
  const m = member(run, who);
  if (!id || !m || !POTIONS[id].usableOnMap) return false;
  if (id === 'zhaifan') m.hp = Math.min(m.maxHp, m.hp + 8);
  if (id === 'qingxindan') {
    const i = m.deck.findIndex((c) => cardDef(c).rarity === 'curse');
    if (i < 0) return false;
    m.deck.splice(i, 1);
  }
  run.potions.splice(idx, 1);
  return true;
}

/* ================= 战斗 / 奖励 ================= */
export function beginFight(run: RunState, encounter: string, after?: string) {
  startCombat(run, encounter, after);
  run.screen = 'combat';
}

const GOLD: Record<RewardTier, [number, number]> = { normal: [10, 20], ordeal: [15, 25], elite: [25, 40], boss: [50, 80], none: [0, 0] };
const RELIC_P: Record<RewardTier, number> = { normal: 0.04, ordeal: 0.15, elite: 1, boss: 1, none: 0 };
const POTION_P: Record<RewardTier, number> = { normal: 0.25, ordeal: 0.35, elite: 0.4, boss: 0.5, none: 0 };
const RARITY_W: Record<RewardTier, [number, number, number]> = {
  normal: [60, 37, 3], ordeal: [45, 45, 10], elite: [45, 45, 10], boss: [20, 50, 30], none: [60, 37, 3],
};

/** 战斗结束后调用：胜→奖励；败→死亡 */
export function resolveCombatEnd(run: RunState) {
  const c = run.combat;
  if (!c || c.result === 'ongoing') return;
  if (c.result === 'lost') {
    run.deadReason = c.lostReason;
    run.screen = 'dead';
    return;
  }
  // 回写生命：倒下/被劫者以 30% 站起
  for (const f of c.party) {
    const m = member(run, f.id);
    if (!m) continue;
    m.hp = f.down || f.captured || f.hp <= 0 ? Math.max(1, Math.ceil(m.maxHp * 0.3)) : Math.min(m.maxHp, f.hp);
  }
  run.stats.fights++;
  const enc = ENCOUNTERS[c.encounter];
  const tier = enc.tier;
  const gold = randInt(run, ...GOLD[tier]);
  run.gold += gold;
  run.stats.goldEarned += gold;
  const notes: string[] = [];
  let relic: string | null = null;
  if (rand(run) < RELIC_P[tier]) relic = randomRelic(run);
  let potion: string | null = null;
  if (rand(run) < POTION_P[tier]) potion = pick(run, ['zhaifan', 'zhaifan', 'qingxindan', 'huanhun']);
  const el = eligibleChars(run);
  run.reward = {
    tier, gold, picksLeft: el.length ? (tier === 'boss' ? 2 : 1) : 0, pickedChars: [], options: null,
    relic, potion, upgradeBonus: tier === 'boss', after: c.after, notes,
  };
  run.screen = 'reward';
}

/** 选卡第一步：指定角色 */
export function rewardChooseChar(run: RunState, who: CharId) {
  const r = run.reward;
  if (!r || r.picksLeft <= 0 || r.options) return;
  const el = eligibleChars(run);
  if (!el.includes(who)) return;
  if (r.pickedChars.includes(who) && el.some((x) => !r.pickedChars.includes(x))) return; // Boss 两次须分给不同角色
  r.options = { who, cards: rollCardOptions(run, who, r.tier) };
}

export function rewardPickCard(run: RunState, idx: number | null) {
  const r = run.reward;
  if (!r || !r.options) return;
  const who = r.options.who;
  if (idx !== null) {
    const card = r.options.cards[idx];
    if (!card) return;
    addCardTo(run, who, card);
  }
  r.pickedChars.push(who);
  r.picksLeft--;
  r.options = null;
  if (r.picksLeft === 0) {
    for (const m of run.party) m.missed = r.pickedChars.includes(m.id) ? 0 : m.missed + 1;
  }
}

export function addCardTo(run: RunState, who: CharId, card: CardInst) {
  const m = member(run, who);
  if (!m) return;
  m.deck.push({ uid: uid(run), id: card.id, up: card.up });
  run.stats.cardsAdded++;
}

export function rewardTakeRelic(run: RunState) {
  const r = run.reward;
  if (!r?.relic) return;
  gainRelic(run, r.relic);
  r.notes.push(`获得「${RELICS[r.relic].name}」`);
  r.relic = null;
}

export function rewardTakePotion(run: RunState) {
  const r = run.reward;
  if (!r?.potion) return;
  if (gainPotion(run, r.potion)) {
    r.notes.push(`获得「${POTIONS[r.potion].name}」`);
    r.potion = null;
  } else r.notes.push('丹药栏已满');
}

export function rewardTakeUpgrade(run: RunState) {
  const r = run.reward;
  if (!r?.upgradeBonus) return;
  r.upgradeBonus = false;
  run.pending.push({ kind: 'upgrade', who: null, source: 'Boss 赏' });
}

export function rewardDone(run: RunState) {
  const r = run.reward;
  if (!r) return;
  if (r.options) return;
  const after = r.after;
  run.reward = undefined;
  run.combat = undefined;
  if (after) openEvent(run, after);
  else completeNode(run);
}

export function cardPoolFor(who: CharId): string[] {
  return [...CHARS[who].rewardPool, ...NEUTRAL_POOL];
}

export function rollCardOptions(run: RunState, who: CharId, tier: RewardTier): CardInst[] {
  const m = member(run, who)!;
  const pool = cardPoolFor(who);
  const [wc, wu, wr] = RARITY_W[tier];
  const rareW = wr + m.pity;
  const out: CardInst[] = [];
  let sawRare = false;
  let allCommon = true;
  for (let i = 0; i < 3; i++) {
    let rar: Rarity = weighted<Rarity>(run, [['common', Math.max(0, wc - m.pity)], ['uncommon', wu], ['rare', rareW]]);
    if (i === 0 && m.plainStreak >= 2 && rar === 'common') rar = 'uncommon';
    let cands = pool.filter((id) => CARDS[id].rarity === rar && !out.some((o) => o.id === id));
    if (!cands.length) cands = pool.filter((id) => !out.some((o) => o.id === id));
    if (!cands.length) break;
    const id = pick(run, cands);
    const r2 = CARDS[id].rarity;
    if (r2 === 'rare') sawRare = true;
    if (r2 !== 'common') allCommon = false;
    out.push({ uid: uid(run), id, up: false });
  }
  m.pity = sawRare ? 0 : m.pity + 1.5;
  m.plainStreak = allCommon ? m.plainStreak + 1 : 0;
  return out;
}

/* ================= 待选（绑定法宝 / 观音授经 / 升级 / 删牌） ================= */
export function resolvePending(run: RunState, choice: { who?: CharId; cardIdx?: number; uid?: number; skip?: boolean }) {
  const p = run.pending[0];
  if (!p) return;
  if (choice.skip) {
    run.pending.shift();
    return;
  }
  switch (p.kind) {
    case 'bindRelic':
      if (choice.who && eligibleChars(run).includes(choice.who)) {
        run.relics.push({ id: p.relic, bound: choice.who });
        run.pending.shift();
      }
      break;
    case 'cardPick':
      if (!p.who && choice.who) p.who = choice.who;
      if (p.who && !p.cards) {
        p.cards = rollCardOptions(run, p.who, p.tier);
        return;
      }
      if (p.who && p.cards && choice.cardIdx !== undefined) {
        addCardTo(run, p.who, p.cards[choice.cardIdx]);
        run.pending.shift();
      }
      break;
    case 'upgrade':
    case 'remove':
      if (!p.who && choice.who) {
        p.who = choice.who;
        if (p.kind === 'remove') p.price = removePrice(run, choice.who);
        return;
      }
      if (p.who && choice.uid !== undefined) {
        const m = member(run, p.who)!;
        const card = m.deck.find((c) => c.uid === choice.uid);
        if (!card) return;
        if (p.kind === 'upgrade') {
          if (!canUpgrade(card)) return;
          card.up = true;
        } else {
          const isCurse = cardDef(card).rarity === 'curse';
          const price = p.price + (isCurse ? 50 : 0); // 删诅咒 +50
          if (run.gold < price) return;
          if (m.deck.length <= 4 && !isCurse) return; // 牌库下限 4
          run.gold -= price;
          m.deck = m.deck.filter((c) => c.uid !== card.uid);
          m.removeCount++;
        }
        run.pending.shift();
      }
      break;
  }
}

/** 若待选只有一个可选角色，自动填入（UI 便利） */
export function autoFillPending(run: RunState) {
  const p: Pending | undefined = run.pending[0];
  if (!p) return;
  const el = eligibleChars(run);
  if (el.length !== 1) return;
  if (p.kind === 'cardPick' && !p.who) resolvePending(run, { who: el[0] });
  else if (p.kind === 'cardPick' && p.who && !p.cards) resolvePending(run, { who: p.who });
  else if ((p.kind === 'upgrade' || p.kind === 'remove') && !p.who) resolvePending(run, { who: el[0] });
  else if (p.kind === 'bindRelic') resolvePending(run, { who: el[0] });
}

/* ================= 商店 ================= */
export function priceMul(run: RunState) {
  return run.relics.some((r) => r.id === 'baofu') ? 0.9 : 1;
}

export function openShop(run: RunState) {
  const el = eligibleChars(run);
  const mul = priceMul(run);
  const cards: NonNullable<RunState['shop']>['cards'] = [];
  for (let i = 0; i < 5; i++) {
    const owner = el[i % el.length];
    const rar = weighted<Rarity>(run, [['common', 50], ['uncommon', 40], ['rare', 10]]);
    const pool = cardPoolFor(owner);
    let cands = pool.filter((id) => CARDS[id].rarity === rar && !cards.some((x) => x.item.card.id === id && x.item.owner === owner));
    if (!cands.length) cands = pool.filter((id) => !cards.some((x) => x.item.card.id === id && x.item.owner === owner));
    if (!cands.length) continue;
    const id = pick(run, cands);
    const r = CARDS[id].rarity;
    const base = r === 'rare' ? randInt(run, 150, 180) : r === 'uncommon' ? randInt(run, 80, 110) : randInt(run, 45, 60);
    cards.push({ item: { card: { uid: uid(run), id, up: false }, owner }, price: Math.round(base * mul), sold: false });
  }
  const relicPool = Object.values(RELICS).filter((r) => r.pool && !run.relics.some((x) => x.id === r.id));
  const relics = shuffle(run, relicPool).slice(0, 2).map((r) => ({ item: r.id, price: Math.round((r.price ?? 160) * mul), sold: false }));
  const potions = ['zhaifan', pick(run, ['qingxindan', 'huanhun'])].map((id) => ({ item: id, price: Math.round(POTIONS[id].price * mul), sold: false }));
  run.shop = { cards, relics, potions, upgradeUsed: false };
  run.screen = 'shop';
}

export function removePrice(run: RunState, who: CharId) {
  const m = member(run, who);
  return Math.round((75 + 25 * (m?.removeCount ?? 0)) * priceMul(run));
}
export const UPGRADE_PRICE = 100;

export function shopBuy(run: RunState, kind: 'cards' | 'relics' | 'potions', idx: number): boolean {
  const s = run.shop;
  if (!s) return false;
  const it = s[kind][idx];
  if (!it || it.sold || run.gold < it.price) return false;
  if (kind === 'potions') {
    if (!gainPotion(run, it.item as string)) return false;
  } else if (kind === 'relics') gainRelic(run, it.item as string);
  else {
    const c = it.item as { card: CardInst; owner: CharId };
    addCardTo(run, c.owner, c.card);
  }
  run.gold -= it.price;
  it.sold = true;
  return true;
}

export function shopRemove(run: RunState) {
  if (!run.shop) return;
  run.pending.push({ kind: 'remove', who: null, price: 0 });
}

export function shopUpgrade(run: RunState) {
  const s = run.shop;
  if (!s || s.upgradeUsed || run.gold < UPGRADE_PRICE) return;
  s.upgradeUsed = true;
  run.gold -= UPGRADE_PRICE;
  run.pending.push({ kind: 'upgrade', who: null, source: '商店升级' });
}

export function leaveShop(run: RunState) {
  if (run.screen === 'shop') completeNode(run);
}

/* ================= 休息 ================= */
export function restHealAmount(m: Member) {
  return Math.ceil(m.maxHp * (CHARS[m.id].race === '人' ? 0.38 : 0.3));
}
export function restHeal(run: RunState) {
  if (run.screen !== 'rest') return;
  for (const m of run.party) m.hp = Math.min(m.maxHp, m.hp + restHealAmount(m));
  completeNode(run);
}
export function restUpgrade(run: RunState) {
  if (run.screen !== 'rest') return;
  run.pending.push({ kind: 'upgrade', who: null, source: '默经' });
  completeNode(run);
}

/* ================= 章末 ================= */
export function upgradedCards(run: RunState) {
  const out: { who: CharId; card: CardInst }[] = [];
  for (const m of run.party) for (const c of m.deck) if (c.up) out.push({ who: m.id, card: c });
  return out;
}
export function carryRelics(run: RunState) {
  return run.relics.filter((r) => !RELICS[r.id].starter).map((r) => r.id);
}

export { fighter };
