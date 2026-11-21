// 纯数据类型：不依赖 DOM，便于移植微信小游戏
export type Race = '人' | '妖' | '仙' | '佛' | '龙' | '鬼';
export type CharId = 'tang' | 'wukong' | 'longma' | 'congA' | 'congB';
export type Rarity = 'basic' | 'common' | 'uncommon' | 'rare' | 'curse' | 'token';
export type CardType = 'attack' | 'skill' | 'power' | 'curse';
/** enemy=单体敌人; allEnemies=全体; ally=任一在场队友(含自己); activeAlly=本回激活的队友; wukong=在场悟空; none=无需目标 */
export type TargetKind = 'enemy' | 'allEnemies' | 'ally' | 'activeAlly' | 'wukong' | 'none';

export type Effect =
  | { op: 'damage'; n: number; vsRace?: Race; vsBonus?: number; cloudRainBonus?: number }
  | { op: 'damageAll'; n: number }
  | { op: 'damageIfExposed'; n: number; otherwise: number }
  | { op: 'block'; n: number; to: 'self' | 'tang' | 'target' | 'party' }
  | { op: 'blockOr'; n: number; tangMissingN: number } // 护法类：唐僧在则给唐僧，否则自己
  | { op: 'draw'; n: number }
  | { op: 'discardRandom'; n: number }
  | { op: 'heal'; n: number }
  | { op: 'cleanse'; onlyBack?: boolean }
  | { op: 'reveal' }
  | { op: 'repeatNextAttack'; n: number }
  | { op: 'addToHand'; card: string; n: number }
  | { op: 'shuffleIntoDraw'; card: string; n: number }
  | { op: 'power'; key: 'bangBonus' | 'longxiBonus'; n: number }
  | { op: 'costReduceNext'; n: number }
  | { op: 'jingu'; upgraded: boolean }
  | { op: 'rain' }
  | { op: 'horseToggle' };

export interface CardFace {
  cost: number;
  desc: string;
  effects: Effect[];
  exhaust?: boolean;
}

export interface CardDef extends CardFace {
  id: string;
  name: string;
  owner: CharId | 'neutral' | 'retainer' | 'curse' | 'token';
  type: CardType;
  rarity: Rarity;
  target: TargetKind;
  tags?: string[]; // 棒 / 水 / 云雨
  unplayable?: boolean;
  /** 抽到时触发（贬谪） */
  onDrawLoseHp?: number;
  up?: Partial<CardFace>;
}

export interface CardInst {
  uid: number;
  id: string;
  up: boolean;
}

export interface CharDef {
  id: CharId;
  name: string;
  race: Race;
  maxHp: number;
  emoji: string;
  role: 'master' | 'disciple';
  row: 'front' | 'back';
  startDeck: string[];
  startRelic?: string;
  rewardPool: string[];
  blurb: string;
  temporary?: boolean;
}

export type EnemyMoveKind = 'attack' | 'block' | 'buff' | 'attackBlock' | 'aoe' | 'attackBack';
export interface EnemyMove {
  name: string;
  kind: EnemyMoveKind;
  dmg?: number;
  times?: number;
  block?: number;
  strength?: number;
}
export interface EnemyDef {
  id: string;
  name: string;
  emoji: string;
  race: Race;
  hp: [number, number];
  moves: EnemyMove[];
  /** cycle=按顺序循环(起点随机); fixed=从第 0 招开始循环 */
  pattern: 'cycle' | 'fixed';
  dragonScale?: boolean;
  boss?: boolean;
}

export type RewardTier = 'normal' | 'ordeal' | 'elite' | 'boss' | 'none';
export interface EncounterDef {
  id: string;
  name: string;
  enemies: string[];
  tier: RewardTier;
  /** 按已入队弟子数微调敌人数值（赶路普通战） */
  scaleByParty?: boolean;
  /** 剧本：开场一名从人折损 */
  script?: 'loseRetainer';
}

export interface RelicDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  bound: boolean; // 绑定角色
  starter?: CharId;
  pool: boolean; // 可出现在点化/商店/掉落
  price?: number;
}

export interface PotionDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  target: 'ally' | 'none' | 'auto';
  usableOnMap: boolean;
  price: number;
}

export type EventOp =
  | { op: 'gold'; n: number }
  | { op: 'heal'; who: CharId | 'party'; n?: number; pct?: number }
  | { op: 'loseHp'; who: CharId; n: number }
  | { op: 'maxHp'; who: CharId; n: number }
  | { op: 'addCard'; who: CharId; card: string }
  | { op: 'relic'; id?: string } // 不给 id 则随机普通法宝
  | { op: 'potion'; id?: string }
  | { op: 'join'; who: CharId }
  | { op: 'leave'; who: CharId }
  | { op: 'flag'; key: string }
  | { op: 'rest' }
  | { op: 'cardPick'; who?: CharId; tier: RewardTier }
  | { op: 'upgradePick'; who?: CharId }
  | { op: 'skipSteps'; n: number }
  | { op: 'chance'; p: number; win: EventOp[]; lose: EventOp[]; winText: string; loseText: string };

export interface EventOption {
  label: string;
  hint?: string;
  ops?: EventOp[];
  next?: string; // 下一页事件
  fight?: string; // 进入战斗（遭遇 id）
  after?: string; // 战后事件页
  needGold?: number;
}

export interface EventDef {
  id: string;
  title: string;
  ordeal?: number;
  art: string; // emoji 占位
  text: string;
  options: EventOption[];
}
