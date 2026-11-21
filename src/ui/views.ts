// 纯展示用的 HTML 片段（DOM 渲染层；移植小游戏时替换本目录即可）
import { CHARS } from '../data/characters';
import { POTIONS, RELICS } from '../data/relics';
import { cardDef, cardFace } from '../core/cards';
import type { EnemyState, Fighter, Member, RunState } from '../core/state';
import type { CardInst, CharId, EnemyMove } from '../core/types';
import { currentMove, enemyAttackValue } from '../core/combat';

export const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

const TYPE_LABEL: Record<string, string> = { attack: '攻击', skill: '技能', power: '能力', curse: '诅咒' };
const RARITY_LABEL: Record<string, string> = { basic: '起始', common: '普通', uncommon: '非凡', rare: '珍稀', curse: '诅咒', token: '衍生' };

export function cardHTML(c: CardInst, o: { cost?: number; playable?: boolean; selected?: boolean; owner?: CharId | null; act?: string; attrs?: string; price?: number; sold?: boolean; bonus?: number } = {}) {
  const d = cardDef(c);
  const f = cardFace(c);
  const cost = o.cost ?? f.cost;
  const cls = ['card', `t-${d.type}`, `r-${d.rarity}`, o.playable === false ? 'dim' : '', o.selected ? 'sel' : '', c.up ? 'up' : '', o.sold ? 'sold' : ''].join(' ');
  const owner = o.owner ? `<span class="owner">${CHARS[o.owner].emoji}${CHARS[o.owner].name}</span>` : '';
  const costTxt = d.unplayable ? '✕' : String(cost);
  const costCls = cost < f.cost ? 'cost cheaper' : 'cost';
  const price = o.price !== undefined ? `<div class="price">${o.sold ? '已售' : '💰' + o.price}</div>` : '';
  return `<div class="${cls}" ${o.act ? `data-act="${o.act}"` : ''} ${o.attrs ?? ''}>
    <div class="${costCls}">${costTxt}</div>
    <div class="cname">${esc(f.name)}</div>
    <div class="ctype">${TYPE_LABEL[d.type]}·${RARITY_LABEL[d.rarity]}${d.tags?.length ? '·' + d.tags.join('') : ''}</div>
    <div class="cdesc">${esc(f.desc)}${o.bonus ? `<b class="bonus">伤害 +${o.bonus}</b>` : ''}</div>
    ${owner}${price}
  </div>`;
}

export function hpBar(hp: number, max: number, block = 0, protect = 0) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return `<div class="hpbar"><div class="hpfill" style="width:${pct}%"></div><span>${Math.max(0, hp)}/${max}</span>
    ${block ? `<b class="blk">🛡${block}</b>` : ''}${protect ? `<b class="prot">🪷${protect}</b>` : ''}</div>`;
}

export function intentHTML(e: EnemyState) {
  const m: EnemyMove = currentMove(e);
  const v = enemyAttackValue(e, m.dmg ?? 0);
  switch (m.kind) {
    case 'attack':
      return `⚔️ ${v}${m.times && m.times > 1 ? '×' + m.times : ''}`;
    case 'attackBack':
      return `🎯 后排 ${v}`;
    case 'aoe':
      return `🌊 全体 ${v}`;
    case 'block':
      return `🛡️ ${m.block}`;
    case 'buff':
      return `💢 力量+${m.strength}`;
    case 'attackBlock':
      return `⚔️ ${v} 🛡️ ${m.block}`;
  }
}

export function enemyHTML(e: EnemyState, targetable: boolean) {
  const m = currentMove(e);
  return `<div class="enemy ${e.dead ? 'dead' : ''} ${targetable ? 'targetable' : ''}" data-act="enemy" data-uid="${e.uid}">
    <div class="intent" title="${esc(m.name)}">${intentHTML(e)}<small>${esc(m.name)}</small></div>
    <div class="emoji">${e.dead ? '💨' : e.emoji}</div>
    <div class="ename">${esc(e.name)} <small class="race">${e.race}</small></div>
    ${hpBar(e.hp, e.maxHp, e.block)}
    <div class="badges">${e.strength ? `<i>💢${e.strength}</i>` : ''}${e.revealed ? '<i class="rv">👁️破隐</i>' : ''}</div>
  </div>`;
}

export function fighterHTML(f: Fighter, o: { current: boolean; targetable: boolean }) {
  const def = CHARS[f.id];
  let state = '';
  if (f.captured) state = '<i class="bad">被劫</i>';
  else if (f.down) state = '<i class="bad">倒下</i>';
  else if (f.active) state = '<i class="good">激活</i>';
  else state = '<i>待命·守势</i>';
  const pips = f.active ? `<div class="pips">${'<b class="on">●</b>'.repeat(f.energy)}${'<b>○</b>'.repeat(Math.max(0, f.maxEnergy - f.energy))}</div>` : '<div class="pips"></div>';
  const extra = [f.horse ? '🐴马形' : '', f.yaoqi ? `妖气${f.yaoqi}` : '', f.turnAtkBonus ? `紧箍+${f.turnAtkBonus}` : '', f.repeatNext ? `分身×${f.repeatNext}` : '',
    f.costReduce ? `减费${f.costReduce}` : '', f.freeNext ? '下张0费' : ''].filter(Boolean).map((s) => `<i>${s}</i>`).join('');
  return `<div class="ftr ${o.current ? 'cur' : ''} ${f.active ? 'act' : ''} ${f.down || f.captured ? 'out' : ''} ${o.targetable ? 'targetable' : ''}" data-act="fighter" data-who="${f.id}">
    <div class="femoji">${def.emoji}</div>
    <div class="fname">${def.name}<small>${def.race}</small></div>
    ${hpBar(f.hp, f.maxHp, f.block, f.protect)}
    ${pips}
    <div class="badges">${state}${extra}</div>
  </div>`;
}

export function memberChip(m: Member) {
  const d = CHARS[m.id];
  return `<div class="chip">${d.emoji}<span>${d.name}</span>${hpBar(m.hp, m.maxHp)}</div>`;
}

export function relicsHTML(run: RunState) {
  return run.relics
    .map((r) => {
      const d = RELICS[r.id];
      const who = r.bound ? `（${CHARS[r.bound].name}）` : '';
      return `<span class="relic" data-act="tip" data-tip="${esc(d.name + who + '：' + d.desc)}">${d.emoji}</span>`;
    })
    .join('');
}

export function potionsHTML(run: RunState, act: string) {
  let s = '';
  for (let i = 0; i < run.potionSlots; i++) {
    const id = run.potions[i];
    s += id
      ? `<span class="potion" data-act="${act}" data-idx="${i}" title="${esc(POTIONS[id].name + '：' + POTIONS[id].desc)}">${POTIONS[id].emoji}</span>`
      : '<span class="potion empty">·</span>';
  }
  return s;
}
