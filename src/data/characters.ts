import type { CharDef, CharId } from '../core/types';

export const CHARS: Record<CharId, CharDef> = {
  tang: {
    id: 'tang', name: '唐僧', race: '人', maxHp: 40, emoji: '🧘', role: 'master', row: 'back',
    startDeck: ['xizhang', 'xizhang', 'songjing', 'songjing', 'zhixin', 'pudu', 'cifu'],
    startRelic: 'jinlan',
    rewardPool: ['jingang', 'chanding', 'fazhi', 'qingxin', 'jiangliu'],
    blurb: '经主。后排锁定，有同伴时 2 灵力抽 2，独战 3/3。生命归零则被劫，需救师。',
  },
  wukong: {
    id: 'wukong', name: '孙悟空', race: '妖', maxHp: 70, emoji: '🐒', role: 'disciple', row: 'front',
    startDeck: ['bangda', 'bangda', 'bangda', 'shenfa', 'shenfa', 'shenwaishen', 'huoyan', 'jindou'],
    startRelic: 'jingubang',
    rewardPool: ['lianji', 'haomao', 'qianjun', 'ruyi', 'jinjing', 'pomo', 'jindouzai', 'tida'],
    blurb: '妖·凶芒：打到半血以下的敌人追加 2 伤；击倒敌人得妖气（攻击+1）。',
  },
  longma: {
    id: 'longma', name: '白龙马', race: '龙', maxHp: 65, emoji: '🐉', role: 'disciple', row: 'front',
    startDeck: ['longlin', 'longlin', 'longxi', 'longxi', 'xingyun', 'bianma', 'tashui'],
    startRelic: 'bishuizhu',
    rewardPool: ['xianlang', 'longmen', 'hualong', 'tuoshi', 'longzhao'],
    blurb: '龙·龙鳞：每回合首次受击 -3；打出水/云雨牌后，下回合开始对全体敌人 2 伤。',
  },
  congA: {
    id: 'congA', name: '从人甲', race: '人', maxHp: 22, emoji: '🧑‍🦱', role: 'disciple', row: 'front', temporary: true,
    startDeck: ['kansha', 'kansha', 'dida', 'dida', 'hushi'], rewardPool: [],
    blurb: '长安随行的从人。难 6 后离队。',
  },
  congB: {
    id: 'congB', name: '从人乙', race: '人', maxHp: 22, emoji: '🧔', role: 'disciple', row: 'front', temporary: true,
    startDeck: ['kansha', 'kansha', 'dida', 'dida', 'hushi'], rewardPool: [],
    blurb: '长安随行的从人。难 6 后离队。',
  },
};
