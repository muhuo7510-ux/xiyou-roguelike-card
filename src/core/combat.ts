// 战斗核心：纯逻辑，无 DOM。规则见 docs/design-v2-combat.md 第 2 节
import { CHARS } from '../data/characters';
import { ENCOUNTERS, ENEMIES } from '../data/enemies';
import { cardDef, cardFace } from './cards';
import { pick, rand, randInt, shuffle } from './rng';
import type { CombatState, EnemyState, Fighter, RunState } from './state';
import type { CardInst, CharId, Effect, EnemyMove, TargetKind } from './types';

export const HAND_LIMIT = 8;
export const GUARD_BLOCK = 4; // 未激活弟子的守势
export const MAX_ACTIVE_DISCIPLES = 2;
export const RESCUE_TURNS = 3;

export interface PlayTarget {
  enemy?: number; // enemy uid
  ally?: CharId;
}

export function hasRelic(run: RunState, id: string, who?: CharId): boolean {
  return run.relics.some((r) => r.id === id && (who === undefined || !r.bound || r.bound === who));
}
function relicBoundTo(run: RunState, id: string, who: CharId): boolean {
  return run.relics.some((r) => r.id === id && r.bound === who);
}

function log(c: CombatState, s: string) {
  c.log.push(s);
  if (c.log.length > 40) c.log.shift();
}

export function fighter(c: CombatState, id: CharId): Fighter | undefined {
  return c.party.find((f) => f.id === id);
}
export const alive = (f: Fighter) => !f.down && !f.captured;
export const livingEnemies = (c: CombatState) => c.enemies.filter((e) => !e.dead);
export const currentMove = (e: EnemyState): EnemyMove => ENEMIES[e.id].moves[e.moveIdx];

function newUid(run: RunState) {
  return ++run.uid;
}

/* ================= 开战 ================= */
export function startCombat(run: RunState, encounterId: string, after?: string): CombatState {
  const enc = ENCOUNTERS[encounterId];
  if (!enc) throw new Error('未知遭遇 ' + encounterId);
  const disciples = run.party.filter((m) => CHARS[m.id].role === 'disciple').length;
  const scale = enc.scaleByParty ? (disciples === 0 ? 0.85 : 1 + 0.15 * (disciples - 1)) : 1;

  let frontCount = 0;
  const party: Fighter[] = run.party.map((m) => {
    const def = CHARS[m.id];
    let row = def.row;
    if (row === 'front') {
      if (frontCount >= 2) row = 'back';
      else frontCount++;
    }
    return {
      id: m.id, name: def.name, race: def.race, role: def.role,
      hp: m.hp, maxHp: m.maxHp, block: 0, protect: 0, energy: 0, maxEnergy: 3, drawN: 3,
      drawPile: shuffle(run, m.deck.map((c) => ({ ...c }))), hand: [], discard: [], exhaust: [],
      row, down: m.hp <= 0, captured: false, active: false, handLimit: HAND_LIMIT,
      costReduce: 0, freeNext: false, repeatNext: 0, turnAtkBonus: 0, bangBonus: 0, longxiBonus: 0,
      horse: false, horseAbsorbed: 0, cloudRain: false, waterPlayed: false, scaleUsed: false,
      hitOnce: false, amuletUsed: false, zijinUsed: false, debuffs: 0, yaoqi: 0,
    };
  });

  const enemies: EnemyState[] = enc.enemies.map((id) => {
    const d = ENEMIES[id];
    const hp = Math.round(randInt(run, d.hp[0], d.hp[1]) * scale);
    return {
      uid: newUid(run), id, name: d.name, emoji: d.emoji, race: d.race, hp, maxHp: hp, block: 0, strength: 0,
      dmgMul: scale, revealed: false, scaleUsed: false,
      moveIdx: d.pattern === 'cycle' ? Math.floor(rand(run) * d.moves.length) : 0, dead: false,
    };
  });
  // 同名敌人编号
  const seen: Record<string, number> = {};
  enemies.forEach((e) => {
    if (enc.enemies.filter((x) => x === e.id).length > 1) e.name += '·' + '甲乙丙丁'[(seen[e.id] = (seen[e.id] ?? -1) + 1)];
  });

  const c: CombatState = {
    encounter: encounterId, turn: 0, party, enemies, current: null, selection: [],
    rainNext: false, dragonRainNext: false, dingfengUsed: false, rescueTimer: null,
    result: 'ongoing', after, log: [],
  };
  run.combat = c;
  log(c, `⚔️ ${enc.name}`);

  if (enc.script === 'loseRetainer') {
    const r = fighter(c, 'congA');
    if (r) {
      r.hp = 0;
      r.down = true;
      log(c, `${r.name}被妖兵拖走，倒下了！其牌库本场冻结。`);
    }
  }

  startTurn(run);
  // 开战效果（在首回合清甲之后）
  const tang = fighter(c, 'tang');
  if (tang) {
    if (relicBoundTo(run, 'jinlan', 'tang')) tang.protect += 5;
    if (relicBoundTo(run, 'foyuan', 'tang')) tang.protect += 3;
  }
  if (hasRelic(run, 'qiankunbu')) party.filter((f) => f.row === 'front' && alive(f)).forEach((f) => (f.block += 3));
  return c;
}

/* ================= 回合 ================= */
export function activatableDisciples(c: CombatState): Fighter[] {
  return c.party.filter((f) => f.role === 'disciple' && alive(f));
}

export function isSolo(c: CombatState): boolean {
  return activatableDisciples(c).length === 0;
}

export function startTurn(run: RunState) {
  const c = run.combat!;
  c.turn++;
  run.stats.turns++;
  for (const f of c.party) {
    f.block = 0;
    f.horseAbsorbed = 0;
    f.scaleUsed = false;
    f.turnAtkBonus = 0;
    f.repeatNext = 0;
    f.cloudRain = false;
    f.waterPlayed = false;
    f.active = false;
  }
  for (const e of c.enemies) e.scaleUsed = false;

  // 雨势 + 龙族被动
  const rain = (c.rainNext ? 2 : 0) + (c.dragonRainNext ? 2 : 0);
  c.rainNext = c.dragonRainNext = false;
  if (rain > 0) {
    for (const e of livingEnemies(c)) hitEnemy(run, null, e, rain, false);
    log(c, `🌧️ 雨势落下，对全体敌人造成 ${rain} 点伤害`);
    if (checkWin(c)) return;
  }

  // 选择激活弟子（最多 2 名），默认沿用上回
  const cands = activatableDisciples(c);
  let sel = cands.map((f) => f.id);
  if (cands.length > MAX_ACTIVE_DISCIPLES) {
    const prev = c.selection.filter((id) => sel.includes(id));
    sel = [...prev, ...sel.filter((id) => !prev.includes(id))].slice(0, MAX_ACTIVE_DISCIPLES);
  }
  c.selection = sel;
  const solo = cands.length === 0;
  for (const f of c.party) {
    if (f.role === 'master') {
      f.maxEnergy = f.drawN = solo ? 3 : 2;
      f.active = alive(f);
    } else {
      f.maxEnergy = f.drawN = 3;
      f.active = sel.includes(f.id);
    }
    if (f.active) {
      f.energy = f.maxEnergy;
      drawCards(run, f, f.drawN);
    } else {
      f.energy = 0;
    }
  }
  const actives = c.party.filter((f) => f.active);
  if (!c.current || !actives.some((f) => f.id === c.current)) {
    c.current = (actives.find((f) => f.role === 'disciple') ?? actives[0])?.id ?? null;
  }
}

export function drawCards(run: RunState, f: Fighter, n: number) {
  for (let i = 0; i < n; i++) {
    if (f.hand.length >= f.handLimit) break;
    if (f.drawPile.length === 0) {
      if (f.discard.length === 0) break;
      f.drawPile = shuffle(run, f.discard);
      f.discard = [];
    }
    const card = f.drawPile.pop()!;
    f.hand.push(card);
    const d = cardDef(card);
    if (d.onDrawLoseHp) {
      const tang = fighter(run.combat!, 'tang');
      if (tang && alive(tang)) {
        tang.hp -= d.onDrawLoseHp;
        log(run.combat!, `抽到「${d.name}」，唐僧失去 ${d.onDrawLoseHp} 点生命`);
        if (tang.hp <= 0) onZeroHp(run, tang);
      }
    }
  }
}

/** 全队结束回合 → 敌人回合 → 下一回合 */
export function endTurn(run: RunState) {
  const c = run.combat!;
  if (c.result !== 'ongoing') return;
  const lm = fighter(c, 'longma');
  c.dragonRainNext = !!lm && alive(lm) && lm.waterPlayed;
  for (const f of c.party) {
    if (f.active) {
      f.discard.push(...f.hand);
      f.hand = [];
      f.energy = 0;
    } else if (f.role === 'disciple' && alive(f)) {
      f.block += GUARD_BLOCK;
      log(c, `${f.name}未激活，守势 +${GUARD_BLOCK} 护甲`);
    }
  }
  for (const e of c.enemies) e.revealed = false;

  // 敌人回合
  for (const e of c.enemies) {
    if (e.dead) continue;
    e.block = 0;
    enemyAct(run, e);
    if (c.result !== 'ongoing') return;
    const d = ENEMIES[e.id];
    e.moveIdx = (e.moveIdx + 1) % d.moves.length;
  }
  if (c.rescueTimer !== null) {
    c.rescueTimer--;
    if (c.rescueTimer <= 0) {
      lose(c, '救师超时：唐僧被妖怪掳走了');
      return;
    }
  }
  startTurn(run);
}

/* ================= 敌人行动 ================= */
function pickTarget(run: RunState, preferBack: boolean): Fighter | undefined {
  const c = run.combat!;
  const living = c.party.filter(alive);
  if (preferBack) {
    const tang = living.find((f) => f.id === 'tang');
    if (tang) return tang;
    const back = living.filter((f) => f.row === 'back');
    if (back.length) return pick(run, back);
  }
  const front = living.filter((f) => f.row === 'front');
  if (front.length) return pick(run, front);
  return living.length ? pick(run, living) : undefined;
}

export function enemyAttackValue(e: EnemyState, base: number) {
  return Math.max(0, Math.round(base * e.dmgMul) + e.strength);
}

function enemyAct(run: RunState, e: EnemyState) {
  const c = run.combat!;
  const m = currentMove(e);
  if (m.block) {
    e.block += m.block;
  }
  if (m.kind === 'buff') {
    e.strength += m.strength ?? 0;
    log(c, `${e.name}「${m.name}」，力量 +${m.strength}`);
    return;
  }
  if (m.kind === 'block') {
    log(c, `${e.name}「${m.name}」，护甲 +${m.block}`);
    return;
  }
  const dmg = enemyAttackValue(e, m.dmg ?? 0);
  if (m.kind === 'aoe') {
    log(c, `${e.name}「${m.name}」，对全队造成 ${dmg}`);
    for (const f of c.party.filter(alive)) {
      damageFighter(run, f, dmg, true);
      if (c.result !== 'ongoing') return;
    }
    return;
  }
  const times = m.times ?? 1;
  for (let i = 0; i < times; i++) {
    const t = pickTarget(run, m.kind === 'attackBack');
    if (!t) return;
    const dealt = damageFighter(run, t, dmg, true);
    log(c, `${e.name}「${m.name}」→ ${t.name} 受到 ${dealt} 伤害`);
    if (c.result !== 'ongoing') return;
  }
}

/** 对我方造成伤害，返回实际掉血 */
export function damageFighter(run: RunState, t: Fighter, n: number, isAttack: boolean): number {
  const c = run.combat!;
  if (isAttack && n > 0 && !c.dingfengUsed && hasRelic(run, 'dingfengzhen')) {
    n = Math.max(0, n - 2);
    c.dingfengUsed = true;
  }
  if (isAttack && n > 0 && t.race === '龙' && !t.scaleUsed) {
    n = Math.max(1, n - 3);
    t.scaleUsed = true;
  }
  const lm = fighter(c, 'longma');
  if (n > 0 && lm && lm !== t && lm.horse && alive(lm) && (t.id === 'tang' || t.row === 'front')) {
    const absorb = Math.min(2, n, 6 - lm.horseAbsorbed);
    if (absorb > 0) {
      n -= absorb;
      lm.horseAbsorbed += absorb;
      applyRaw(run, lm, absorb);
      log(c, `白龙马代挡 ${absorb} 点`);
      if (c.result !== 'ongoing') return 0;
    }
  }
  return applyRaw(run, t, n);
}

function applyRaw(run: RunState, t: Fighter, n: number): number {
  if (n <= 0 || !alive(t)) return 0;
  const p = Math.min(t.protect, n);
  t.protect -= p;
  n -= p;
  const b = Math.min(t.block, n);
  t.block -= b;
  n -= b;
  if (n > 0) {
    t.hp -= n;
    if (t.race === '人' && !t.hitOnce) {
      t.hitOnce = true;
      t.handLimit = HAND_LIMIT + 1; // 人·志心
    }
    if (t.hp <= 0) onZeroHp(run, t);
  }
  return n;
}

function onZeroHp(run: RunState, t: Fighter) {
  const c = run.combat!;
  if (relicBoundTo(run, 'hushenfu', t.id) && !t.amuletUsed) {
    t.amuletUsed = true;
    t.hp = 1;
    log(c, `🧿 护身符护住了${t.name}，保留 1 点生命`);
    return;
  }
  const pi = run.potions.indexOf('huanhun');
  if (pi >= 0) {
    run.potions.splice(pi, 1);
    t.hp = Math.max(1, Math.ceil(t.maxHp * 0.3));
    log(c, `🌟 还魂丹生效，${t.name}以 ${t.hp} 生命站起`);
    return;
  }
  t.hp = 0;
  t.active = false;
  t.energy = 0;
  run.stats.downs++;
  if (t.id === 'tang') {
    t.captured = true;
    c.rescueTimer = RESCUE_TURNS;
    log(c, `‼️ 唐僧被劫！${RESCUE_TURNS} 回合内取胜才能救回师父`);
  } else {
    t.down = true;
    log(c, `${t.name}倒下了（本场冻结）`);
  }
  if (c.current === t.id) c.current = c.party.find((f) => f.active && alive(f))?.id ?? null;
  const anyAlive = c.party.some(alive);
  const tang = fighter(c, 'tang');
  if (!anyAlive || (tang && tang.captured && activatableDisciples(c).length === 0)) {
    lose(c, tang?.captured ? '弟子尽倒，唐僧被掳' : '全队覆没');
  }
}

function lose(c: CombatState, reason: string) {
  c.result = 'lost';
  c.lostReason = reason;
  log(c, '💀 ' + reason);
}

function checkWin(c: CombatState): boolean {
  if (c.result === 'ongoing' && livingEnemies(c).length === 0) {
    c.result = 'won';
    log(c, '🎉 胜利！');
  }
  return c.result === 'won';
}

/* ================= 出牌 ================= */
export function effectiveCost(run: RunState, f: Fighter, card: CardInst): number {
  const base = cardFace(card).cost;
  if (f.freeNext) return 0;
  if (base === 1 && !f.zijinUsed && relicBoundTo(run, 'zijinbo', f.id)) return 0;
  return Math.max(0, base - f.costReduce);
}

export function targetKind(card: CardInst): TargetKind {
  return cardDef(card).target;
}

export function validTargets(run: RunState, f: Fighter, card: CardInst): { enemies: number[]; allies: CharId[] } {
  const c = run.combat!;
  const k = targetKind(card);
  if (k === 'enemy') return { enemies: livingEnemies(c).map((e) => e.uid), allies: [] };
  if (k === 'ally') return { enemies: [], allies: c.party.filter(alive).map((x) => x.id) };
  if (k === 'activeAlly') return { enemies: [], allies: c.party.filter((x) => x.active && alive(x)).map((x) => x.id) };
  if (k === 'wukong') {
    const w = fighter(c, 'wukong');
    return { enemies: [], allies: w && alive(w) ? ['wukong'] : [] };
  }
  void f;
  return { enemies: [], allies: [] };
}

export function canPlay(run: RunState, who: CharId, handIdx: number): { ok: boolean; reason?: string } {
  const c = run.combat;
  if (!c || c.result !== 'ongoing') return { ok: false, reason: '战斗已结束' };
  const f = fighter(c, who);
  if (!f || !alive(f)) return { ok: false, reason: '角色无法行动' };
  if (!f.active) return { ok: false, reason: '本回未激活' };
  const card = f.hand[handIdx];
  if (!card) return { ok: false, reason: '无此牌' };
  const d = cardDef(card);
  if (d.unplayable) return { ok: false, reason: '不能打出' };
  if (f.horse && card.id === 'longxi') return { ok: false, reason: '马形态不能打龙息' };
  if (effectiveCost(run, f, card) > f.energy) return { ok: false, reason: '灵力不足' };
  const k = d.target;
  if (k !== 'none' && k !== 'allEnemies') {
    const t = validTargets(run, f, card);
    if (t.enemies.length + t.allies.length === 0) return { ok: false, reason: '没有可选目标' };
  }
  return { ok: true };
}

export function playCard(run: RunState, who: CharId, handIdx: number, target: PlayTarget = {}): boolean {
  const chk = canPlay(run, who, handIdx);
  if (!chk.ok) return false;
  const c = run.combat!;
  const f = fighter(c, who)!;
  const card = f.hand[handIdx];
  const d = cardDef(card);
  const face = cardFace(card);
  const k = d.target;
  const vt = validTargets(run, f, card);
  if (k === 'enemy') {
    if (target.enemy === undefined || !vt.enemies.includes(target.enemy)) {
      if (vt.enemies.length === 1) target.enemy = vt.enemies[0];
      else return false;
    }
  }
  if (k === 'ally' || k === 'activeAlly' || k === 'wukong') {
    if (!target.ally || !vt.allies.includes(target.ally)) {
      if (vt.allies.length === 1 || k === 'wukong') target.ally = vt.allies[0];
      else return false;
    }
  }
  // 付费
  const base = face.cost;
  const cost = effectiveCost(run, f, card);
  if (f.freeNext) f.freeNext = false;
  else if (base === 1 && !f.zijinUsed && relicBoundTo(run, 'zijinbo', f.id)) f.zijinUsed = true;
  else if (f.costReduce > 0 && base > 0) f.costReduce = 0;
  f.energy -= cost;
  f.hand.splice(handIdx, 1);
  log(c, `${f.name}打出「${face.name}」`);

  resolveEffects(run, f, card, face.effects, target);
  if (d.type === 'attack' && f.repeatNext > 0 && c.result === 'ongoing') {
    f.repeatNext--;
    log(c, `身外身法：「${face.name}」再结算一次`);
    resolveEffects(run, f, card, face.effects, target);
  }
  if (d.tags?.includes('水') || d.tags?.includes('云雨')) f.waterPlayed = true;
  if (d.tags?.includes('云雨')) f.cloudRain = true;

  if (face.exhaust || d.type === 'power') f.exhaust.push(card);
  else f.discard.push(card);
  checkWin(c);
  return true;
}

function resolveEffects(run: RunState, f: Fighter, card: CardInst, effects: Effect[], target: PlayTarget) {
  const c = run.combat!;
  const d = cardDef(card);
  const isAttack = d.type === 'attack';
  const getEnemy = () => {
    let e = c.enemies.find((x) => x.uid === target.enemy && !x.dead);
    if (!e) {
      const l = livingEnemies(c);
      e = l.length ? l[0] : undefined;
      if (e) target.enemy = e.uid;
    }
    return e;
  };
  for (const ef of effects) {
    if (c.result !== 'ongoing') return;
    switch (ef.op) {
      case 'damage': {
        const e = getEnemy();
        if (!e) break;
        let n = ef.n + attackBonus(run, f, card);
        if (ef.vsRace && e.race === ef.vsRace) n += ef.vsBonus ?? 0;
        if (ef.cloudRainBonus && f.cloudRain) n += ef.cloudRainBonus;
        hitEnemy(run, f, e, n, isAttack);
        break;
      }
      case 'damageIfExposed': {
        const e = getEnemy();
        if (!e) break;
        const base = e.revealed || e.block > 0 ? ef.n : ef.otherwise;
        hitEnemy(run, f, e, base + attackBonus(run, f, card), isAttack);
        break;
      }
      case 'damageAll': {
        const n = ef.n + attackBonus(run, f, card);
        for (const e of livingEnemies(c)) hitEnemy(run, f, e, n, isAttack);
        break;
      }
      case 'block': {
        const targets: Fighter[] = [];
        if (ef.to === 'self') targets.push(f);
        else if (ef.to === 'tang') {
          const t = fighter(c, 'tang');
          if (t && alive(t)) targets.push(t);
        } else if (ef.to === 'target') {
          const t = target.ally ? fighter(c, target.ally) : f;
          if (t && alive(t)) targets.push(t);
        } else targets.push(...c.party.filter(alive));
        targets.forEach((t) => (t.block += ef.n));
        break;
      }
      case 'blockOr': {
        const t = fighter(c, 'tang');
        if (t && alive(t)) t.block += ef.n;
        else f.block += ef.tangMissingN;
        break;
      }
      case 'draw':
        drawCards(run, f, ef.n);
        break;
      case 'discardRandom':
        for (let i = 0; i < ef.n && f.hand.length; i++) {
          const idx = Math.floor(rand(run) * f.hand.length);
          f.discard.push(...f.hand.splice(idx, 1));
        }
        break;
      case 'heal':
        f.hp = Math.min(f.maxHp, f.hp + ef.n);
        break;
      case 'cleanse': {
        if (ef.onlyBack && f.row !== 'back') break;
        if (f.debuffs > 0) f.debuffs--;
        else {
          const ci = f.hand.findIndex((x) => cardDef(x).rarity === 'curse');
          if (ci >= 0) {
            f.exhaust.push(...f.hand.splice(ci, 1));
            log(c, '净化：手中诅咒移出本场');
          }
        }
        break;
      }
      case 'reveal': {
        const e = getEnemy();
        if (e) e.revealed = true;
        break;
      }
      case 'repeatNextAttack':
        f.repeatNext += ef.n;
        break;
      case 'addToHand':
        for (let i = 0; i < ef.n; i++) if (f.hand.length < f.handLimit) f.hand.push({ uid: newUid(run), id: ef.card, up: false });
        break;
      case 'shuffleIntoDraw':
        for (let i = 0; i < ef.n; i++) f.drawPile.push({ uid: newUid(run), id: ef.card, up: false });
        shuffle(run, f.drawPile);
        break;
      case 'power':
        f[ef.key] += ef.n;
        break;
      case 'costReduceNext': {
        const t = target.ally ? fighter(c, target.ally) : f;
        if (t) t.costReduce += ef.n;
        break;
      }
      case 'jingu': {
        const w = fighter(c, 'wukong');
        if (!w || !alive(w)) break;
        w.turnAtkBonus += 3;
        if (ef.upgraded) w.freeNext = true;
        else applyRaw(run, f, 2);
        break;
      }
      case 'rain':
        c.rainNext = true;
        break;
      case 'horseToggle':
        f.horse = !f.horse;
        log(c, f.horse ? '白龙马化为马形，护持左右' : '白龙马解除马形');
        break;
    }
  }
}

function attackBonus(run: RunState, f: Fighter, card: CardInst): number {
  const d = cardDef(card);
  if (d.type !== 'attack') return 0;
  let n = f.yaoqi + f.turnAtkBonus;
  if (d.tags?.includes('棒')) n += f.bangBonus + (relicBoundTo(run, 'jingubang', f.id) ? 2 : 0);
  if (d.tags?.includes('水') && relicBoundTo(run, 'bishuizhu', f.id)) n += 1;
  if (card.id === 'longxi') n += f.longxiBonus;
  return n;
}

/** 对敌人造成伤害（含龙鳞、破隐、凶芒、妖气） */
export function hitEnemy(run: RunState, f: Fighter | null, e: EnemyState, n: number, isAttack: boolean): number {
  const c = run.combat!;
  if (e.dead) return 0;
  if (f && f.race === '佛' && (e.race === '妖' || e.race === '鬼')) n = Math.floor(n * 1.2);
  if (isAttack && ENEMIES[e.id].dragonScale && !e.scaleUsed && n > 0) {
    n = Math.max(1, n - 3);
    e.scaleUsed = true;
  }
  if (!e.revealed) {
    const b = Math.min(e.block, n);
    e.block -= b;
    n -= b;
  }
  e.hp -= n;
  let total = n;
  if (f && f.race === '妖' && n > 0 && e.hp > 0 && e.race !== '佛' && e.hp < e.maxHp / 2) {
    e.hp -= 2;
    total += 2;
    log(c, `凶芒追加 2 伤害`);
  }
  if (e.hp <= 0) {
    e.hp = 0;
    e.dead = true;
    log(c, `${e.name}被击倒`);
    if (f && f.race === '妖' && f.yaoqi < 5) {
      f.yaoqi++;
      log(c, `${f.name}妖气 +1（攻击 +${f.yaoqi}）`);
    }
  }
  return total;
}

/* ================= 丹药（战斗中） ================= */
export function usePotionInCombat(run: RunState, idx: number, who: CharId): boolean {
  const c = run.combat!;
  const id = run.potions[idx];
  const t = fighter(c, who);
  if (!id || !t || !alive(t) || c.result !== 'ongoing') return false;
  if (id === 'zhaifan') {
    t.hp = Math.min(t.maxHp, t.hp + 8);
    log(c, `🍚 ${t.name}吃斋饭，回复 8 生命`);
  } else if (id === 'qingxindan') {
    const piles = [t.hand, t.drawPile, t.discard];
    let removed: CardInst | undefined;
    for (const p of piles) {
      const i = p.findIndex((x) => cardDef(x).rarity === 'curse');
      if (i >= 0) {
        removed = p.splice(i, 1)[0];
        break;
      }
    }
    if (!removed) return false;
    const m = run.party.find((x) => x.id === who)!;
    m.deck = m.deck.filter((x) => x.uid !== removed!.uid);
    log(c, `💊 清心丹：移除了「${cardDef(removed).name}」`);
  } else return false;
  run.potions.splice(idx, 1);
  return true;
}

/** 选择本回激活的弟子（仅在可激活者 > 2 时有意义；下回合生效） */
export function setSelection(c: CombatState, ids: CharId[]) {
  c.selection = ids.slice(0, MAX_ACTIVE_DISCIPLES);
}
