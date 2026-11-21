import type { CardInst, CharId, EventDef, Race, RewardTier } from './types';

export interface Member {
  id: CharId;
  hp: number;
  maxHp: number;
  deck: CardInst[];
  removeCount: number; // 删牌次数（按角色分别加价）
  pity: number; // 珍稀悲悯（按角色）
  plainStreak: number; // 连续全普通次数
  missed: number; // 连续没轮到选卡的战斗数
}

export interface RelicInst {
  id: string;
  bound?: CharId;
}

export type MapNodeType = 'guanyin' | 'ordeal' | 'fight' | 'event' | 'shop' | 'rest' | 'end';
export interface MapNode {
  type: MapNodeType;
  label: string;
  icon: string;
  ordeal?: number;
  event?: string;
  encounter?: string;
}
export interface MapStep {
  options: MapNode[];
  chosen: number | null;
  road: boolean;
}

export type Screen = 'map' | 'event' | 'combat' | 'reward' | 'shop' | 'rest' | 'dead' | 'victory';

export interface RewardState {
  tier: RewardTier;
  gold: number;
  picksLeft: number;
  pickedChars: CharId[];
  options: { who: CharId; cards: CardInst[] } | null;
  relic: string | null;
  potion: string | null;
  upgradeBonus: boolean;
  after?: string;
  notes: string[];
}

export interface ShopItem<T> {
  item: T;
  price: number;
  sold: boolean;
}
export interface ShopState {
  cards: ShopItem<{ card: CardInst; owner: CharId }>[];
  relics: ShopItem<string>[];
  potions: ShopItem<string>[];
  upgradeUsed: boolean;
}

export interface EventState {
  id: string;
  custom?: EventDef; // 观音点化等动态事件
  result?: string;
}

export type Pending =
  | { kind: 'bindRelic'; relic: string }
  | { kind: 'cardPick'; who: CharId | null; tier: RewardTier; cards?: CardInst[] }
  | { kind: 'upgrade'; who: CharId | null; source: string }
  | { kind: 'remove'; who: CharId | null; price: number };

/* ---------- 战斗 ---------- */
export interface Fighter {
  id: CharId;
  name: string;
  race: Race;
  role: 'master' | 'disciple';
  hp: number;
  maxHp: number;
  block: number;
  protect: number; // 护体：不随回合清空
  energy: number;
  maxEnergy: number;
  drawN: number;
  drawPile: CardInst[];
  hand: CardInst[];
  discard: CardInst[];
  exhaust: CardInst[];
  row: 'front' | 'back';
  down: boolean;
  captured: boolean;
  active: boolean;
  handLimit: number;
  costReduce: number;
  freeNext: boolean;
  repeatNext: number;
  turnAtkBonus: number;
  bangBonus: number;
  longxiBonus: number;
  horse: boolean;
  horseAbsorbed: number;
  cloudRain: boolean;
  waterPlayed: boolean;
  scaleUsed: boolean;
  hitOnce: boolean;
  amuletUsed: boolean;
  zijinUsed: boolean;
  debuffs: number;
  yaoqi: number;
}

export interface EnemyState {
  uid: number;
  id: string;
  name: string;
  emoji: string;
  race: Race;
  hp: number;
  maxHp: number;
  block: number;
  strength: number;
  dmgMul: number;
  revealed: boolean;
  scaleUsed: boolean;
  moveIdx: number;
  dead: boolean;
}

export interface CombatState {
  encounter: string;
  turn: number;
  party: Fighter[];
  enemies: EnemyState[];
  current: CharId | null;
  selection: CharId[];
  rainNext: boolean;
  dragonRainNext: boolean;
  dingfengUsed: boolean;
  rescueTimer: number | null;
  result: 'ongoing' | 'won' | 'lost';
  lostReason?: string;
  after?: string;
  log: string[];
}

export interface RunStats {
  fights: number;
  turns: number;
  goldEarned: number;
  cardsAdded: number;
  startedAt: number;
  downs: number;
}

export interface RunState {
  version: 1;
  seed: number;
  rng: number;
  uid: number;
  chapter: number;
  gold: number;
  party: Member[];
  relics: RelicInst[];
  potions: string[];
  potionSlots: number;
  steps: MapStep[];
  step: number;
  screen: Screen;
  event?: EventState;
  combat?: CombatState;
  reward?: RewardState;
  shop?: ShopState;
  pending: Pending[];
  usedEvents: string[];
  stats: RunStats;
  deadReason?: string;
  toast?: string;
}

export interface MetaState {
  seenIntro: boolean;
  ch2Unlocked: boolean;
  clears: number;
  deaths: number;
  carry?: { relic: string | null; cards: { who: CharId; id: string }[] };
}
