import type { PotionDef, RelicDef } from '../core/types';

export const RELICS: Record<string, RelicDef> = {
  jinlan: { id: 'jinlan', name: '锦襕袈裟', emoji: '🧧', bound: true, starter: 'tang', pool: false, desc: '唐僧每场开局获得 5 点护体（不随回合清空）。' },
  jingubang: { id: 'jingubang', name: '如意金箍棒', emoji: '🪄', bound: true, starter: 'wukong', pool: false, desc: '悟空的「棒」牌伤害 +2。' },
  bishuizhu: { id: 'bishuizhu', name: '避水珠', emoji: '🔮', bound: true, starter: 'longma', pool: false, desc: '白龙马的水系伤害 +1。' },
  foyuan: { id: 'foyuan', name: '佛缘·护体', emoji: '🪷', bound: true, starter: 'tang', pool: false, desc: '金蝉遗泽：唐僧每场开局额外获得 3 点护体。' },
  qiankunbu: { id: 'qiankunbu', name: '乾坤布', emoji: '🧣', bound: false, pool: true, price: 160, desc: '全队：每场战斗开始，前排角色获得 3 点护甲。' },
  zijinbo: { id: 'zijinbo', name: '紫金钵', emoji: '🥣', bound: true, pool: true, price: 170, desc: '绑定：该角色每场第一张 1 费牌费用变为 0。' },
  hushenfu: { id: 'hushenfu', name: '护身符', emoji: '🧿', bound: true, pool: true, price: 160, desc: '绑定：该角色生命首次降到 0 时改为保留 1 点（每场 1 次）。' },
  dingfengzhen: { id: 'dingfengzhen', name: '定风针', emoji: '📍', bound: false, pool: true, price: 150, desc: '全队：每场第一次受到的攻击伤害 -2。' },
  baofu: { id: 'baofu', name: '包袱', emoji: '🎒', bound: false, pool: true, price: 150, desc: '全队：商店物价 -10%。' },
};

export const POTIONS: Record<string, PotionDef> = {
  zhaifan: { id: 'zhaifan', name: '斋饭', emoji: '🍚', target: 'ally', usableOnMap: true, price: 50, desc: '指定一人回复 8 点生命。' },
  qingxindan: { id: 'qingxindan', name: '清心丹', emoji: '💊', target: 'ally', usableOnMap: true, price: 60, desc: '移除该角色牌库（或手牌）中 1 张诅咒。' },
  huanhun: { id: 'huanhun', name: '还魂丹', emoji: '🌟', target: 'auto', usableOnMap: false, price: 70, desc: '弟子倒下时自动以 30% 生命站起；唐僧被劫时立即救回。每局限持 1 颗。' },
};
