import type { EventDef } from '../core/types';

export const EVENTS: Record<string, EventDef> = {};
function e(def: EventDef) {
  EVENTS[def.id] = def;
}

/* ---------- 诵前缘（重开时速过难 1～4） ---------- */
e({ id: 'recap', title: '诵前缘', art: '📿', ordeal: 1,
  text: '前世今生，你已历过一回。是重温金蝉旧事，还是诵一段前缘，径直出长安？',
  options: [
    { label: '速过难 1～4', hint: '默认：佛缘·护体、贬谪入库、斋钱 +30', ops: [
      { op: 'relic', id: 'foyuan' }, { op: 'addCard', who: 'tang', card: 'bianzhe' }, { op: 'gold', n: 30 }, { op: 'skipSteps', n: 3 }] },
    { label: '重温前缘', hint: '逐难再走一遍', next: 'n1' },
  ] });

/* ---------- 难 1～4 身世 ---------- */
e({ id: 'n1', title: '第一难 · 金蝉遭贬', art: '🪷', ordeal: 1,
  text: '灵山雷音，金蝉子听佛讲法时轻慢大教，被贬入东土轮回。佛祖垂怜，许你带一点佛缘下界——只是这贬谪之身，要靠西行一步步洗净。',
  options: [
    { label: '求一层护体', hint: '得法宝「佛缘·护体」；「贬谪」入唐僧牌库', ops: [{ op: 'relic', id: 'foyuan' }, { op: 'addCard', who: 'tang', card: 'bianzhe' }] },
    { label: '求一卷经文', hint: '唐僧得一张「诵经」；「贬谪」入唐僧牌库', ops: [{ op: 'addCard', who: 'tang', card: 'songjing' }, { op: 'addCard', who: 'tang', card: 'bianzhe' }] },
  ] });
e({ id: 'n2', title: '第二难 · 出胎几杀', art: '👶', ordeal: 2,
  text: '江州刺史陈光蕊赴任途中遭水贼刘洪杀害，殷小姐身怀六甲，被刘洪霸占。贼人几番欲害腹中之子。',
  options: [
    { label: '托梦南极星君，求保胎', hint: '65%：唐僧最大生命 +4；35%：生命 -5', ops: [{ op: 'chance', p: 0.65,
      win: [{ op: 'maxHp', who: 'tang', n: 4 }], lose: [{ op: 'loseHp', who: 'tang', n: 5 }],
      winText: '星君暗护，胎儿安然。唐僧最大生命 +4。', loseText: '虽保住性命，却伤了根本。唐僧生命 -5。' }] },
    { label: '隐忍避祸', hint: '斋钱 +15', ops: [{ op: 'gold', n: 15 }] },
  ] });
e({ id: 'n3', title: '第三难 · 满月抛江', art: '🌊', ordeal: 3,
  text: '婴儿满月，殷小姐咬指写下血书，将他缚在木板上抛入江中。木板随波漂到金山寺下，法明长老收养，取名江流。',
  options: [
    { label: '血书裹襁褓', hint: '斋钱 +50', ops: [{ op: 'gold', n: 50 }] },
    { label: '随江而流', hint: '唐僧牌库加入「江流」（0 费，抽 1，消耗）', ops: [{ op: 'addCard', who: 'tang', card: 'jiangliu' }] },
  ] });
e({ id: 'n4', title: '第四难 · 寻亲报冤', art: '⚖️', ordeal: 4,
  text: '十八年后，江流儿得知身世，持血书寻到母亲，又往长安搬来外公殷丞相的兵马。贼人刘洪就在眼前。',
  options: [
    { label: '亲手擒拿刘洪', hint: '一场弱战（唐僧独自出战 3 灵力 / 抽 3）', fight: 'liuhong', after: 'n4b' },
    { label: '交与官府了结', hint: '斋钱 +20', ops: [{ op: 'gold', n: 20 }] },
  ] });
e({ id: 'n4b', title: '第四难 · 冤仇得报', art: '⚖️', ordeal: 4,
  text: '刘洪伏法，陈光蕊被龙王救还阳世，一家团聚。江流儿却已心向佛门，出家为僧，法名玄奘。',
  options: [{ label: '继续', ops: [] }] });

/* ---------- 难 5 出城逢虎 ---------- */
e({ id: 'n5', title: '第五难 · 出城逢虎', art: '🐅', ordeal: 5,
  text: '唐王赐通关文牒，玄奘带两名从人出长安西去。行至河州卫界，天色未明，忽然一阵狂风，一只吊睛白额虎拦在路上！\n\n从人加入队伍。前排的从人会替你挡刀——护住师父。',
  options: [{ label: '迎战虎精', hint: '唐僧 2 灵力/抽 2；两名从人各 3/3，可自由切换出牌', ops: [{ op: 'join', who: 'congA' }, { op: 'join', who: 'congB' }], fight: 'hu' }] });

/* ---------- 难 6 折从落坑 ---------- */
e({ id: 'n6', title: '第六难 · 折从落坑', art: '🕳️', ordeal: 6,
  text: '马失前蹄，一行人跌进深坑。寅将军、熊山君领着妖兵围上来，从人甲当场被拖走——',
  options: [{ label: '死战护师', hint: '开场从人甲倒下（示范「同伴倒下」：冻结其牌库）', fight: 'zhecong', after: 'n6b' }] });
e({ id: 'n6b', title: '太白金星解围', art: '⭐', ordeal: 6,
  text: '妖魔散去，两名从人却已伤重，无法再随行西去。一位白发老翁拄杖而来，原来是太白金星。他拂尘一点：「圣僧莫怕，前路自有徒弟护你。」\n\n从人离队。',
  options: [
    { label: '请金星疗伤', hint: '唐僧回满生命', ops: [{ op: 'leave', who: 'congA' }, { op: 'leave', who: 'congB' }, { op: 'heal', who: 'tang', pct: 1 }] },
    { label: '求一颗仙丹', hint: '得「还魂丹」', ops: [{ op: 'leave', who: 'congA' }, { op: 'leave', who: 'congB' }, { op: 'potion', id: 'huanhun' }] },
  ] });

/* ---------- 难 7 双叉岭上 ---------- */
e({ id: 'n7', title: '第七难 · 双叉岭上', art: '🏹', ordeal: 7,
  text: '双叉岭上猛兽成群，猎户刘伯钦提叉而来，邀圣僧到家中歇脚，明日再送一程。也有人说，岭上还藏着一伙山寇……',
  options: [
    { label: '随刘伯钦歇脚', hint: '休息：回血或默经升级', ops: [{ op: 'rest' }] },
    { label: '再打一程', hint: '唐僧独战两名山寇，奖励更好', fight: 'shankou' },
  ] });

/* ---------- 难 8 两界山头 ---------- */
e({ id: 'n8', title: '第八难 · 两界山头', art: '⛰️', ordeal: 8,
  text: '两界山下压着一只石猴，五百年风吹日晒，身上长满青苔。「师父！你揭了山顶那张帖子，我便保你西天取经！」',
  options: [{ label: '上山揭帖', hint: '孙悟空入队（自带牌库与如意金箍棒）；唐僧牌库加入「紧箍咒」',
    ops: [{ op: 'join', who: 'wukong' }, { op: 'addCard', who: 'tang', card: 'jingu' }], next: 'n8b' }] });
e({ id: 'n8b', title: '心猿未驯', art: '👹', ordeal: 8,
  text: '山崩石裂，大圣跳将出来。可五百年的山中业障化作一团戾气，缠在他身上不肯散去。唐僧念起观音所授真言——先降服这股心魔，金箍才算戴稳。',
  options: [{ label: '降服心猿', hint: 'Boss：唐僧 + 悟空同场。试试「紧箍咒」给悟空加攻', fight: 'xinyuan', after: 'n8c' }] });
e({ id: 'n8c', title: '受戒', art: '🙏', ordeal: 8,
  text: '戾气散尽，悟空拜师受戒，金箍入头。「师父，从今往后，老孙保你。」',
  options: [{ label: '继续西行', ops: [] }] });

/* ---------- 难 9 陡涧换马 ---------- */
e({ id: 'n9', title: '第九难 · 陡涧换马', art: '🐲', ordeal: 9,
  text: '蛇盘山鹰愁涧，一条小龙蹿出水面，一口把唐僧的白马连鞍带辔吞了下去。悟空掣棒便要打。',
  options: [
    { label: '力战小龙', hint: 'Boss：唐僧 + 悟空 vs 小龙（龙鳞减伤）。战后小龙化马入队', fight: 'xiaolong', after: 'n9win' },
    { label: '请观音收服', hint: '小龙直接入队；随后全队（含白龙马）迎战涧中水怪', ops: [{ op: 'join', who: 'longma' }], next: 'n9b' },
  ] });
e({ id: 'n9win', title: '小龙化马', art: '🐴', ordeal: 9,
  text: '观音菩萨驾云而至，原来这小龙是西海龙王三太子，在此等候取经人。菩萨摘下他颈下明珠，小龙化作白马。\n\n白龙马入队（自带牌库与避水珠）。',
  options: [{ label: '收下白龙马', ops: [{ op: 'join', who: 'longma' }] }] });
e({ id: 'n9b', title: '涧中水怪', art: '🦐', ordeal: 9,
  text: '小龙化马，涧里却还有几只趁乱作怪的水族。正好试试新收的白龙马——这一战，两名弟子同时激活。',
  options: [{ label: '迎战', hint: '唐僧 2/2 + 悟空 3/3 + 白龙马 3/3', fight: 'shuiguai' }] });

/* ---------- 赶路小事件 ---------- */
e({ id: 'wenlu', title: '问路', art: '🧓', text: '岔路口有位樵夫正在歇担。「往西去？前头山里不太平，老汉知道一条小路……」',
  options: [
    { label: '听他指路', hint: '斋钱 +25', ops: [{ op: 'gold', n: 25 }] },
    { label: '施舍干粮', hint: '斋钱 -15；唐僧回复 10 生命', needGold: 15, ops: [{ op: 'gold', n: -15 }, { op: 'heal', who: 'tang', n: 10 }] },
  ] });
e({ id: 'yemiao', title: '野庙', art: '🛕', text: '荒山野庙，香案积灰，佛像却还完好。庙后似有一口古井，隐约泛着光。',
  options: [
    { label: '拜佛诵经', hint: '升级一张牌', ops: [{ op: 'upgradePick' }] },
    { label: '探古井', hint: '50%：得一件法宝；50%：唐僧失去 6 生命', ops: [{ op: 'chance', p: 0.5,
      win: [{ op: 'relic' }], lose: [{ op: 'loseHp', who: 'tang', n: 6 }],
      winText: '井底捞起一件旧法宝！', loseText: '井沿湿滑，失足跌伤。唐僧生命 -6。' }] },
  ] });
e({ id: 'huayuan', title: '化缘人家', art: '🏠', text: '山脚一户人家，老婆婆见了僧人连忙让进屋：「师父可吃过斋了？」',
  options: [
    { label: '受斋', hint: '全队回复 20% 生命', ops: [{ op: 'heal', who: 'party', pct: 0.2 }] },
    { label: '只求一碗斋饭带走', hint: '得丹药「斋饭」', ops: [{ op: 'potion', id: 'zhaifan' }] },
  ] });

export const ROAD_EVENTS = ['wenlu', 'yemiao', 'huayuan'];
