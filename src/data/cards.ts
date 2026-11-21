import type { CardDef } from '../core/types';

// 数值依据 docs/design-v2-combat.md 第 3、4.4 节
export const CARDS: Record<string, CardDef> = {};
function c(def: CardDef) {
  CARDS[def.id] = def;
}

/* ---------- 唐僧（人） ---------- */
c({ id: 'xizhang', name: '锡杖轻叩', owner: 'tang', type: 'attack', rarity: 'basic', target: 'enemy', cost: 1,
  desc: '造成 4 点伤害。', effects: [{ op: 'damage', n: 4 }],
  up: { desc: '造成 7 点伤害。', effects: [{ op: 'damage', n: 7 }] } });
c({ id: 'songjing', name: '诵经', owner: 'tang', type: 'skill', rarity: 'basic', target: 'none', cost: 1,
  desc: '获得 5 点护甲。若在后排，净化自己 1 层负面。', effects: [{ op: 'block', n: 5, to: 'self' }, { op: 'cleanse', onlyBack: true }],
  up: { desc: '获得 8 点护甲。若在后排，净化自己 1 层负面。', effects: [{ op: 'block', n: 8, to: 'self' }, { op: 'cleanse', onlyBack: true }] } });
c({ id: 'zhixin', name: '志心', owner: 'tang', type: 'skill', rarity: 'basic', target: 'none', cost: 1,
  desc: '获得 4 点护甲，抽 1 张牌。', effects: [{ op: 'block', n: 4, to: 'self' }, { op: 'draw', n: 1 }],
  up: { desc: '获得 7 点护甲，抽 1 张牌。', effects: [{ op: 'block', n: 7, to: 'self' }, { op: 'draw', n: 1 }] } });
c({ id: 'pudu', name: '普度', owner: 'tang', type: 'skill', rarity: 'basic', target: 'ally', cost: 2,
  desc: '指定一名队友（可选自己）获得 8 点护甲。', effects: [{ op: 'block', n: 8, to: 'target' }],
  up: { desc: '指定一名队友（可选自己）获得 12 点护甲。', effects: [{ op: 'block', n: 12, to: 'target' }] } });
c({ id: 'cifu', name: '赐福', owner: 'tang', type: 'skill', rarity: 'basic', target: 'activeAlly', cost: 0, exhaust: true,
  desc: '消耗。指定一名本回激活的队友：其下一张牌费用 -1。', effects: [{ op: 'costReduceNext', n: 1 }],
  up: { desc: '消耗。指定一名本回激活的队友：其下一张牌费用 -2。', effects: [{ op: 'costReduceNext', n: 2 }] } });
c({ id: 'jingu', name: '紧箍咒', owner: 'tang', type: 'skill', rarity: 'basic', target: 'wukong', cost: 1,
  desc: '指定悟空：本回合他的攻击牌伤害 +3；唐僧受到 2 点伤害。', effects: [{ op: 'jingu', upgraded: false }],
  up: { desc: '指定悟空：本回合攻击 +3，且下一张牌费用变为 0；不再自伤。', effects: [{ op: 'jingu', upgraded: true }] } });
c({ id: 'jiangliu', name: '江流', owner: 'tang', type: 'skill', rarity: 'common', target: 'none', cost: 0, exhaust: true,
  desc: '消耗。抽 1 张牌。', effects: [{ op: 'draw', n: 1 }],
  up: { desc: '消耗。抽 2 张牌。', effects: [{ op: 'draw', n: 2 }] } });
c({ id: 'jingang', name: '金刚咒', owner: 'tang', type: 'skill', rarity: 'uncommon', target: 'none', cost: 1,
  desc: '全队每人获得 3 点护甲。', effects: [{ op: 'block', n: 3, to: 'party' }],
  up: { desc: '全队每人获得 5 点护甲。', effects: [{ op: 'block', n: 5, to: 'party' }] } });
c({ id: 'chanding', name: '禅定', owner: 'tang', type: 'skill', rarity: 'common', target: 'none', cost: 1,
  desc: '抽 2 张牌，随机弃 1 张。', effects: [{ op: 'draw', n: 2 }, { op: 'discardRandom', n: 1 }],
  up: { desc: '抽 3 张牌，随机弃 1 张。', effects: [{ op: 'draw', n: 3 }, { op: 'discardRandom', n: 1 }] } });
c({ id: 'fazhi', name: '锡杖法旨', owner: 'tang', type: 'attack', rarity: 'common', target: 'enemy', cost: 1,
  desc: '造成 7 点伤害，对妖族 +3。', effects: [{ op: 'damage', n: 7, vsRace: '妖', vsBonus: 3 }],
  up: { desc: '造成 10 点伤害，对妖族 +3。', effects: [{ op: 'damage', n: 10, vsRace: '妖', vsBonus: 3 }] } });
c({ id: 'qingxin', name: '清心', owner: 'tang', type: 'skill', rarity: 'rare', target: 'none', cost: 1,
  desc: '净化 1 层负面，获得 4 点护甲，抽 1 张牌。', effects: [{ op: 'cleanse' }, { op: 'block', n: 4, to: 'self' }, { op: 'draw', n: 1 }],
  up: { desc: '净化 1 层负面，获得 7 点护甲，抽 1 张牌。', effects: [{ op: 'cleanse' }, { op: 'block', n: 7, to: 'self' }, { op: 'draw', n: 1 }] } });
c({ id: 'bianzhe', name: '贬谪', owner: 'curse', type: 'curse', rarity: 'curse', target: 'none', cost: 0, unplayable: true, onDrawLoseHp: 2,
  desc: '诅咒。不能打出。抽到时唐僧失去 2 点生命。', effects: [] });

/* ---------- 孙悟空（妖） ---------- */
c({ id: 'bangda', name: '棒打', owner: 'wukong', type: 'attack', rarity: 'basic', target: 'enemy', cost: 1, tags: ['棒'],
  desc: '造成 6 点伤害。棒。', effects: [{ op: 'damage', n: 6 }],
  up: { desc: '造成 9 点伤害。棒。', effects: [{ op: 'damage', n: 9 }] } });
c({ id: 'shenfa', name: '身法', owner: 'wukong', type: 'skill', rarity: 'basic', target: 'none', cost: 1,
  desc: '获得 5 点护甲。', effects: [{ op: 'block', n: 5, to: 'self' }],
  up: { desc: '获得 8 点护甲。', effects: [{ op: 'block', n: 8, to: 'self' }] } });
c({ id: 'shenwaishen', name: '身外身法', owner: 'wukong', type: 'skill', rarity: 'basic', target: 'none', cost: 1,
  desc: '本回合你的下一张攻击牌再结算一次。', effects: [{ op: 'repeatNextAttack', n: 1 }],
  up: { desc: '本回合你的下两张攻击牌各再结算一次。', effects: [{ op: 'repeatNextAttack', n: 2 }] } });
c({ id: 'huoyan', name: '火眼一瞥', owner: 'wukong', type: 'skill', rarity: 'basic', target: 'enemy', cost: 1,
  desc: '给予一名敌人「破隐」到回合结束：对其伤害无视护甲。', effects: [{ op: 'reveal' }],
  up: { desc: '给予破隐，抽 1 张牌。', effects: [{ op: 'reveal' }, { op: 'draw', n: 1 }] } });
c({ id: 'jindou', name: '筋斗云', owner: 'wukong', type: 'skill', rarity: 'basic', target: 'none', cost: 0,
  desc: '抽 1 张牌。', effects: [{ op: 'draw', n: 1 }],
  up: { desc: '抽 2 张牌。', effects: [{ op: 'draw', n: 2 }] } });
c({ id: 'lianji', name: '连击', owner: 'wukong', type: 'attack', rarity: 'common', target: 'enemy', cost: 1, tags: ['棒'],
  desc: '造成 4 点伤害，手牌加入 1 张 0 费「棒影」。棒。', effects: [{ op: 'damage', n: 4 }, { op: 'addToHand', card: 'bangying', n: 1 }],
  up: { desc: '造成 6 点伤害，手牌加入 1 张 0 费「棒影」。棒。', effects: [{ op: 'damage', n: 6 }, { op: 'addToHand', card: 'bangying', n: 1 }] } });
c({ id: 'haomao', name: '毫毛', owner: 'wukong', type: 'skill', rarity: 'common', target: 'none', cost: 1,
  desc: '将 2 张 0 费「分身击」洗入牌库。', effects: [{ op: 'shuffleIntoDraw', card: 'fenshen', n: 2 }],
  up: { desc: '将 3 张 0 费「分身击」洗入牌库。', effects: [{ op: 'shuffleIntoDraw', card: 'fenshen', n: 3 }] } });
c({ id: 'qianjun', name: '千钧', owner: 'wukong', type: 'attack', rarity: 'uncommon', target: 'enemy', cost: 2, tags: ['棒'],
  desc: '造成 12 点伤害。棒。', effects: [{ op: 'damage', n: 12 }],
  up: { desc: '造成 16 点伤害。棒。', effects: [{ op: 'damage', n: 16 }] } });
c({ id: 'ruyi', name: '如意伸长', owner: 'wukong', type: 'power', rarity: 'rare', target: 'none', cost: 2, exhaust: true,
  desc: '本场「棒」牌伤害 +2。消耗。', effects: [{ op: 'power', key: 'bangBonus', n: 2 }],
  up: { cost: 1, desc: '本场「棒」牌伤害 +2。消耗。' } });
c({ id: 'jinjing', name: '金睛', owner: 'wukong', type: 'skill', rarity: 'common', target: 'enemy', cost: 1,
  desc: '给予破隐，抽 1 张牌。', effects: [{ op: 'reveal' }, { op: 'draw', n: 1 }],
  up: { cost: 0 } });
c({ id: 'pomo', name: '破魔', owner: 'wukong', type: 'attack', rarity: 'uncommon', target: 'enemy', cost: 1,
  desc: '对处于破隐或有护甲的敌人造成 9 点伤害，否则 4 点。', effects: [{ op: 'damageIfExposed', n: 9, otherwise: 4 }],
  up: { desc: '对破隐或有护甲的敌人造成 13 点伤害，否则 6 点。', effects: [{ op: 'damageIfExposed', n: 13, otherwise: 6 }] } });
c({ id: 'jindouzai', name: '筋斗再起', owner: 'wukong', type: 'skill', rarity: 'common', target: 'none', cost: 0,
  desc: '获得 4 点护甲，抽 1 张牌。', effects: [{ op: 'block', n: 4, to: 'self' }, { op: 'draw', n: 1 }],
  up: { desc: '获得 7 点护甲，抽 1 张牌。', effects: [{ op: 'block', n: 7, to: 'self' }, { op: 'draw', n: 1 }] } });
c({ id: 'tida', name: '踢打', owner: 'wukong', type: 'attack', rarity: 'common', target: 'enemy', cost: 1,
  desc: '造成 8 点伤害。', effects: [{ op: 'damage', n: 8 }],
  up: { desc: '造成 11 点伤害。', effects: [{ op: 'damage', n: 11 }] } });
c({ id: 'bangying', name: '棒影', owner: 'token', type: 'attack', rarity: 'token', target: 'enemy', cost: 0, tags: ['棒'], exhaust: true,
  desc: '造成 4 点伤害。棒。消耗。', effects: [{ op: 'damage', n: 4 }] });
c({ id: 'fenshen', name: '分身击', owner: 'token', type: 'attack', rarity: 'token', target: 'enemy', cost: 0, exhaust: true,
  desc: '造成 3 点伤害。消耗。', effects: [{ op: 'damage', n: 3 }] });

/* ---------- 白龙马（龙） ---------- */
c({ id: 'longlin', name: '龙鳞', owner: 'longma', type: 'skill', rarity: 'basic', target: 'none', cost: 1,
  desc: '获得 6 点护甲。', effects: [{ op: 'block', n: 6, to: 'self' }],
  up: { desc: '获得 9 点护甲。', effects: [{ op: 'block', n: 9, to: 'self' }] } });
c({ id: 'longxi', name: '龙息', owner: 'longma', type: 'attack', rarity: 'basic', target: 'enemy', cost: 1, tags: ['水'],
  desc: '造成 5 点伤害；本回合已打出云雨牌则 +3。水。', effects: [{ op: 'damage', n: 5, cloudRainBonus: 3 }],
  up: { desc: '造成 8 点伤害；本回合已打出云雨牌则 +3。水。', effects: [{ op: 'damage', n: 8, cloudRainBonus: 3 }] } });
c({ id: 'xingyun', name: '行云布雨', owner: 'longma', type: 'skill', rarity: 'basic', target: 'none', cost: 1, tags: ['云雨'],
  desc: '雨势：下回合开始时对全部敌人造成 2 点伤害。云雨。', effects: [{ op: 'rain' }],
  up: { cost: 0 } });
c({ id: 'bianma', name: '负恩变马', owner: 'longma', type: 'skill', rarity: 'basic', target: 'none', cost: 0,
  desc: '切换马形态：不能打龙息；唐僧或前排队友受伤时代挡 2 点（每回合最多 6）。再打解除。', effects: [{ op: 'horseToggle' }] });
c({ id: 'tashui', name: '踏水', owner: 'longma', type: 'attack', rarity: 'basic', target: 'enemy', cost: 1, tags: ['水'],
  desc: '造成 4 点伤害，获得 3 点护甲。水。', effects: [{ op: 'damage', n: 4 }, { op: 'block', n: 3, to: 'self' }],
  up: { desc: '造成 6 点伤害，获得 5 点护甲。水。', effects: [{ op: 'damage', n: 6 }, { op: 'block', n: 5, to: 'self' }] } });
c({ id: 'xianlang', name: '掀浪', owner: 'longma', type: 'attack', rarity: 'uncommon', target: 'allEnemies', cost: 2, tags: ['水'],
  desc: '对全部敌人造成 6 点伤害。水。', effects: [{ op: 'damageAll', n: 6 }],
  up: { desc: '对全部敌人造成 9 点伤害。水。', effects: [{ op: 'damageAll', n: 9 }] } });
c({ id: 'longmen', name: '龙门', owner: 'longma', type: 'skill', rarity: 'common', target: 'none', cost: 1,
  desc: '获得 5 点护甲，抽 1 张牌。', effects: [{ op: 'block', n: 5, to: 'self' }, { op: 'draw', n: 1 }],
  up: { desc: '获得 8 点护甲，抽 1 张牌。', effects: [{ op: 'block', n: 8, to: 'self' }, { op: 'draw', n: 1 }] } });
c({ id: 'hualong', name: '化龙', owner: 'longma', type: 'power', rarity: 'rare', target: 'none', cost: 1, exhaust: true,
  desc: '本场「龙息」伤害 +3。消耗。', effects: [{ op: 'power', key: 'longxiBonus', n: 3 }],
  up: { cost: 0 } });
c({ id: 'tuoshi', name: '驮师', owner: 'longma', type: 'skill', rarity: 'common', target: 'none', cost: 0,
  desc: '唐僧获得 5 点护甲。', effects: [{ op: 'block', n: 5, to: 'tang' }],
  up: { desc: '唐僧获得 8 点护甲。', effects: [{ op: 'block', n: 8, to: 'tang' }] } });
c({ id: 'longzhao', name: '龙爪', owner: 'longma', type: 'attack', rarity: 'common', target: 'enemy', cost: 1,
  desc: '造成 7 点伤害。', effects: [{ op: 'damage', n: 7 }],
  up: { desc: '造成 10 点伤害。', effects: [{ op: 'damage', n: 10 }] } });

/* ---------- 中立 ---------- */
c({ id: 'yaozha', name: '疗伤药渣', owner: 'neutral', type: 'skill', rarity: 'common', target: 'none', cost: 1,
  desc: '回复 5 点生命。', effects: [{ op: 'heal', n: 5 }],
  up: { desc: '回复 8 点生命。', effects: [{ op: 'heal', n: 8 }] } });
c({ id: 'xinglu', name: '行路', owner: 'neutral', type: 'skill', rarity: 'common', target: 'none', cost: 0,
  desc: '抽 1 张牌，随机弃 1 张。', effects: [{ op: 'draw', n: 1 }, { op: 'discardRandom', n: 1 }],
  up: { desc: '抽 2 张牌，随机弃 1 张。', effects: [{ op: 'draw', n: 2 }, { op: 'discardRandom', n: 1 }] } });

/* ---------- 从人（临时） ---------- */
c({ id: 'kansha', name: '砍杀', owner: 'retainer', type: 'attack', rarity: 'basic', target: 'enemy', cost: 1,
  desc: '造成 5 点伤害。', effects: [{ op: 'damage', n: 5 }] });
c({ id: 'dida', name: '抵挡', owner: 'retainer', type: 'skill', rarity: 'basic', target: 'none', cost: 1,
  desc: '获得 5 点护甲。', effects: [{ op: 'block', n: 5, to: 'self' }] });
c({ id: 'hushi', name: '护师', owner: 'retainer', type: 'skill', rarity: 'basic', target: 'none', cost: 1,
  desc: '唐僧获得 5 点护甲。', effects: [{ op: 'block', n: 5, to: 'tang' }] });

export const NEUTRAL_POOL = ['yaozha', 'xinglu'];
