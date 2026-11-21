// 简易 AI：用于自测整章流程（单元测试 / 调试），不参与正式游戏
import { canUpgrade, cardDef } from './cards';
import { alive, canPlay, endTurn, livingEnemies, playCard, validTargets } from './combat';
import * as R from './run';
import type { RunState } from './state';

export function autoCombatStep(run: RunState): void {
  const c = run.combat!;
  for (let guard = 0; guard < 30 && c.result === 'ongoing'; guard++) {
    let played = false;
    const actors = c.party.filter((f) => f.active && alive(f));
    // 唐僧最后出（先让弟子打）
    actors.sort((a, b) => (a.role === 'master' ? 1 : 0) - (b.role === 'master' ? 1 : 0));
    for (const f of actors) {
      const order = f.hand
        .map((card, i) => ({ card, i, d: cardDef(card) }))
        .filter((x) => canPlay(run, f.id, x.i).ok)
        .sort((a, b) => score(b.d.id, b.d.type) - score(a.d.id, a.d.type));
      const best = order[0];
      if (!best) continue;
      const vt = validTargets(run, f, best.card);
      const enemies = livingEnemies(c).filter((e) => vt.enemies.includes(e.uid)).sort((a, b) => a.hp - b.hp);
      const allies = c.party.filter((x) => vt.allies.includes(x.id)).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
      let ally = allies[0]?.id;
      if (best.d.id === 'cifu') ally = allies.find((x) => x.role === 'disciple')?.id ?? ally;
      if (playCard(run, f.id, best.i, { enemy: enemies[0]?.uid, ally })) {
        played = true;
        break;
      }
    }
    if (!played) break;
  }
  if (c.result === 'ongoing') endTurn(run);
}

function score(id: string, type: string): number {
  if (id === 'bianma') return -10; // 简化：不变马
  if (type === 'power') return 9;
  if (id === 'jingu' || id === 'shenwaishen' || id === 'huoyan' || id === 'xingyun') return 8;
  if (id === 'cifu' || id === 'jindou' || id === 'jiangliu') return 7;
  if (type === 'attack') return 5;
  return 3;
}

export interface AutoOptions {
  n9Option?: number; // 0=力战小龙 1=请观音收服
  n4Option?: number;
  maxActions?: number;
}

/** 推进一步；返回 false 表示结束（胜利或死亡） */
export function autoStep(run: RunState, opt: AutoOptions = {}): boolean {
  if (run.pending.length) {
    R.autoFillPending(run);
    const p = run.pending[0];
    if (!p) return true;
    const el = R.eligibleChars(run);
    if (p.kind === 'bindRelic') R.resolvePending(run, { who: el[el.length - 1] });
    else if (p.kind === 'cardPick') {
      if (!p.who) R.resolvePending(run, { who: el[el.length - 1] });
      else if (!p.cards) R.resolvePending(run, { who: p.who });
      else R.resolvePending(run, { cardIdx: 0 });
    } else if (!p.who) R.resolvePending(run, { who: el[el.length - 1] });
    else {
      const m = R.member(run, p.who)!;
      const c = p.kind === 'upgrade' ? m.deck.find(canUpgrade) : m.deck.find((x) => cardDef(x).rarity === 'curse');
      if (c) R.resolvePending(run, { uid: c.uid });
      if (run.pending[0] === p) R.resolvePending(run, { skip: true });
    }
    return true;
  }
  switch (run.screen) {
    case 'map': {
      const st = R.currentStep(run)!;
      const fi = st.options.findIndex((o) => o.type === 'fight');
      R.chooseNode(run, fi >= 0 ? fi : 0);
      return true;
    }
    case 'event': {
      if (run.event?.result !== undefined) {
        R.eventContinue(run);
        return true;
      }
      const ev = R.currentEvent(run)!;
      let idx = 0;
      if (ev.id === 'n9') idx = opt.n9Option ?? 0;
      if (ev.id === 'n4') idx = opt.n4Option ?? 0;
      if (ev.id === 'recap') idx = 0;
      R.chooseEventOption(run, idx);
      return true;
    }
    case 'combat':
      autoCombatStep(run);
      if (run.combat!.result !== 'ongoing') R.resolveCombatEnd(run);
      return true;
    case 'reward': {
      const r = run.reward!;
      if (r.options) R.rewardPickCard(run, 0);
      else if (r.picksLeft > 0) {
        const el = R.eligibleChars(run).filter((x) => !r.pickedChars.includes(x));
        const who = (el.length ? el : R.eligibleChars(run)).sort((a, b) => R.member(run, b)!.missed - R.member(run, a)!.missed)[0];
        R.rewardChooseChar(run, who);
      } else {
        R.rewardTakeRelic(run);
        R.rewardTakePotion(run);
        R.rewardTakeUpgrade(run);
        R.rewardDone(run);
      }
      return true;
    }
    case 'shop': {
      const s = run.shop!;
      const i = s.cards.findIndex((x) => !x.sold && x.price <= run.gold);
      if (i >= 0) R.shopBuy(run, 'cards', i);
      R.leaveShop(run);
      return true;
    }
    case 'rest': {
      const low = run.party.some((m) => m.hp < m.maxHp * 0.6);
      if (low) R.restHeal(run);
      else R.restUpgrade(run);
      return true;
    }
    case 'dead':
    case 'victory':
      return false;
  }
  return false;
}

export function autoRun(run: RunState, opt: AutoOptions = {}): RunState {
  const max = opt.maxActions ?? 5000;
  for (let i = 0; i < max && autoStep(run, opt); i++);
  return run;
}
