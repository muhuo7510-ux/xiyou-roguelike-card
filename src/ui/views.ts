// 纯展示用的 HTML 片段（DOM 渲染层；移植小游戏时替换本目录即可）
import { CHARS } from '../data/characters';
import { POTIONS, RELICS } from '../data/relics';
import { cardDef, cardFace } from '../core/cards';
import { descDiffHtml } from '../core/text';
import type { EnemyState, Fighter, Member, RunState } from '../core/state';
import type { CardInst, CharId, EnemyMove } from '../core/types';
import { currentMove, enemyAttackValue } from '../core/combat';

export const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

const TYPE_LABEL: Record<string, string> = { attack: '攻击', skill: '技能', power: '能力', curse: '诅咒' };
const RARITY_LABEL: Record<string, string> = { basic: '起始', common: '普通', uncommon: '非凡', rare: '珍稀', curse: '诅咒', token: '衍生' };

/** 卡面关键词说明：悬停或点按/长按查看。长词在前，避免短词先匹配。 */
export const KEYWORDS: [string, string][] = [
  ['净化', '把你手里的 1 张诅咒移出本场（这场打完后，诅咒仍在牌库里）。若有「负面」层数，则先去掉 1 层。第一章没有来源会加负面。'],
  ['诅咒', '不能打出的坏牌。抽到时可能掉血，还会占着手牌位置。'],
  ['消耗', '打出后本场不会洗回牌库，战斗结束才回到牌组。'],
  ['护体', '一种不会在回合开始时清空的护甲。'],
  ['护甲', '抵消接下来受到的伤害。你的回合开始时清空（护体除外）。'],
  ['破隐', '本回合对该敌人造成的伤害无视护甲。'],
  ['负面', '战斗中的减益层数。第一章没有来源会给你加负面。'],
  ['守势', '本回未激活的弟子在回合结束时获得的护甲。'],
];

const KEYWORD_RE = new RegExp('(' + KEYWORDS.map(([k]) => k).join('|') + ')', 'g');
const KEYWORD_TIP: Record<string, string> = Object.fromEntries(KEYWORDS);

/** 只在文本节点里标注关键词，一次匹配，避免把说明里的词再次替换进属性 */
export function wrapKeywords(html: string): string {
  return html.split(/(<[^>]+>)/).map((part) => {
    if (!part || part.startsWith('<')) return part;
    return part.replace(KEYWORD_RE, (kw) => `<span class="kw" data-act="tip" data-tip="${esc(KEYWORD_TIP[kw])}">${kw}</span>`);
  }).join('');
}

export function cardHTML(c: CardInst, o: { cost?: number; playable?: boolean; selected?: boolean; owner?: CharId | null; act?: string; attrs?: string; price?: number; sold?: boolean; bonus?: number; static?: boolean; diffFrom?: CardInst } = {}) {
  const d = cardDef(c);
  const f = cardFace(c);
  const cost = o.cost ?? f.cost;
  const cls = ['card', `t-${d.type}`, `r-${d.rarity}`, o.playable === false ? 'dim' : '', o.selected ? 'sel' : '', c.up ? 'up' : '', o.sold ? 'sold' : '', o.static ? 'static' : ''].join(' ');
  const owner = o.owner ? `<span class="owner">${CHARS[o.owner].emoji}${CHARS[o.owner].name}</span>` : '';
  const costTxt = d.unplayable ? '✕' : String(cost);
  const beforeFace = o.diffFrom ? cardFace(o.diffFrom) : undefined;
  const costChanged = beforeFace !== undefined && beforeFace.cost !== cost;
  const costCls = ['cost', (cost < f.cost || costChanged) ? 'cheaper' : '', costChanged ? 'changed' : ''].filter(Boolean).join(' ');
  const price = o.price !== undefined ? `<div class="price">${o.sold ? '已售' : '💰' + o.price}</div>` : '';
  let desc = beforeFace ? descDiffHtml(beforeFace.desc, f.desc, esc) : esc(f.desc);
  desc = wrapKeywords(desc);
  const name = `${esc(d.name)}${c.up ? '<span class="plus">+</span>' : ''}`;
  const act = o.static || !o.act ? '' : `data-act="${o.act}"`;
  return `<div class="${cls}" ${act} ${o.attrs ?? ''}>
    <div class="${costCls}">${costTxt}</div>
    ${c.up ? '<span class="up-badge">已升级</span>' : ''}
    <div class="cname">${name}</div>
    <div class="ctype">${TYPE_LABEL[d.type]}·${RARITY_LABEL[d.rarity]}${d.tags?.length ? '·' + d.tags.join('') : ''}</div>
    <div class="cdesc">${desc}${o.bonus ? `<b class="bonus">伤害 +${o.bonus}</b>` : ''}</div>
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
