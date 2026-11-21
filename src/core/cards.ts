import { CARDS } from '../data/cards';
import type { CardDef, CardFace, CardInst } from './types';

export function cardDef(c: CardInst | string): CardDef {
  const id = typeof c === 'string' ? c : c.id;
  const d = CARDS[id];
  if (!d) throw new Error('未知卡牌 ' + id);
  return d;
}

/** 合并升级后的牌面 */
export function cardFace(c: CardInst): CardFace & { name: string } {
  const d = cardDef(c);
  const base = { cost: d.cost, desc: d.desc, effects: d.effects, exhaust: d.exhaust, name: d.name };
  if (!c.up || !d.up) return base;
  return { ...base, ...d.up, name: d.name + '+' };
}

export function canUpgrade(c: CardInst): boolean {
  const d = cardDef(c);
  return !c.up && !!d.up && d.rarity !== 'curse' && d.rarity !== 'token';
}
