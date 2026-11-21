import { describe, expect, it } from 'vitest';
import { canPlay, endTurn, fighter, playCard, startCombat, GUARD_BLOCK } from '../src/core/combat';
import { applyOps, newRun } from '../src/core/run';
import type { RunState } from '../src/core/state';
import type { CharId } from '../src/core/types';

function setup(join: CharId[] = [], enc = 'road_dao'): RunState {
  const run = newRun(42);
  applyOps(run, join.map((who) => ({ op: 'join' as const, who })));
  startCombat(run, enc);
  run.screen = 'combat';
  return run;
}
function giveHand(run: RunState, who: CharId, ids: string[]) {
  const f = fighter(run.combat!, who)!;
  f.hand = ids.map((id, i) => ({ uid: 9000 + i, id, up: false }));
  return f;
}

describe('分角牌库与个人灵力', () => {
  it('唐僧独战为 3 灵力 / 抽 3', () => {
    const run = setup();
    const t = fighter(run.combat!, 'tang')!;
    expect(t.maxEnergy).toBe(3);
    expect(t.energy).toBe(3);
    expect(t.hand.length).toBe(3);
  });

  it('有弟子时唐僧 2/2，弟子 3/3，各抽各的牌库', () => {
    const run = setup(['wukong']);
    const c = run.combat!;
    const t = fighter(c, 'tang')!;
    const w = fighter(c, 'wukong')!;
    expect([t.maxEnergy, t.hand.length]).toEqual([2, 2]);
    expect([w.maxEnergy, w.hand.length]).toEqual([3, 3]);
    const wukongIds = new Set(['bangda', 'shenfa', 'shenwaishen', 'huoyan', 'jindou']);
    expect(w.hand.every((x) => wukongIds.has(x.id))).toBe(true);
    expect(t.hand.some((x) => wukongIds.has(x.id))).toBe(false);
  });

  it('出牌只花出牌者自己的灵力', () => {
    const run = setup(['wukong']);
    const c = run.combat!;
    giveHand(run, 'wukong', ['shenfa']);
    const t = fighter(c, 'tang')!;
    expect(playCard(run, 'wukong', 0)).toBe(true);
    expect(fighter(c, 'wukong')!.energy).toBe(2);
    expect(t.energy).toBe(2);
    expect(fighter(c, 'wukong')!.block).toBe(5);
  });

  it('最多同时激活 2 名弟子；两名从人 + 唐僧都激活', () => {
    const run = setup(['congA', 'congB']);
    const act = run.combat!.party.filter((f) => f.active).map((f) => f.id).sort();
    expect(act).toEqual(['congA', 'congB', 'tang']);
  });

  it('超过 2 名可激活弟子时只激活 2 名，未激活者回合末得守势', () => {
    const run = setup(['wukong', 'longma', 'congA']);
    const c = run.combat!;
    const actives = c.party.filter((f) => f.active && f.role === 'disciple');
    expect(actives.length).toBe(2);
    const idle = c.party.find((f) => f.role === 'disciple' && !f.active)!;
    expect(idle.energy).toBe(0);
    expect(canPlay(run, idle.id, 0).ok).toBe(false);
    // 敌人改为不攻击，检查守势
    c.enemies.forEach((e) => { e.id = 'xiongShanjun'; e.moveIdx = 0; });
    endTurn(run);
    // 新回合开始会清甲，所以在敌人回合期间才有守势：检查日志
    expect(c.log.some((l) => l.includes(`守势 +${GUARD_BLOCK}`))).toBe(true);
  });
});

describe('伤害、法宝与种族', () => {
  it('金箍棒让悟空的棒牌 +2，紧箍咒再 +3 且唐僧自伤 2', () => {
    const run = setup(['wukong']);
    const c = run.combat!;
    const e = c.enemies[0];
    e.hp = e.maxHp = 100;
    e.block = 0;
    giveHand(run, 'wukong', ['bangda']);
    playCard(run, 'wukong', 0, { enemy: e.uid });
    expect(e.hp).toBe(100 - 8);
    const t = giveHand(run, 'tang', ['jingu']);
    t.protect = 0;
    t.block = 0;
    const hp0 = t.hp;
    playCard(run, 'tang', 0, {});
    expect(t.hp).toBe(hp0 - 2);
    giveHand(run, 'wukong', ['bangda']);
    playCard(run, 'wukong', 0, { enemy: e.uid });
    expect(e.hp).toBe(100 - 8 - 11);
  });

  it('身外身法让下一张攻击再结算一次；凶芒在半血以下追加 2', () => {
    const run = setup(['wukong']);
    const c = run.combat!;
    const e = c.enemies[0];
    e.hp = e.maxHp = 40;
    e.block = 0;
    const w = giveHand(run, 'wukong', ['shenwaishen', 'bangda']);
    playCard(run, 'wukong', 0);
    playCard(run, 'wukong', 0, { enemy: e.uid });
    // 第一次 8 → 32；第二次 8 → 24（24 不低于 20，不触发凶芒）
    expect(e.hp).toBe(24);
    w.energy = 3;
    giveHand(run, 'wukong', ['bangda']);
    playCard(run, 'wukong', 0, { enemy: e.uid });
    // 8 → 16 < 20，凶芒 +2 → 14
    expect(e.hp).toBe(14);
  });

  it('破隐无视护甲；龙鳞敌人每回首次受击 -3', () => {
    const run = setup(['wukong'], 'xiaolong');
    const c = run.combat!;
    const e = c.enemies[0];
    e.block = 10;
    giveHand(run, 'wukong', ['huoyan', 'bangda']);
    playCard(run, 'wukong', 0, { enemy: e.uid });
    const hp0 = e.hp;
    playCard(run, 'wukong', 0, { enemy: e.uid });
    expect(e.block).toBe(10);
    expect(e.hp).toBe(hp0 - (8 - 3));
  });

  it('锦襕袈裟开局给唐僧 5 点护体，护体不随回合清空', () => {
    const run = setup(['wukong'], 'xiongShanjun' in {} ? 'road_dao' : 'road_dun');
    const t = fighter(run.combat!, 'tang')!;
    expect(t.protect).toBe(5);
    run.combat!.enemies.forEach((e) => { e.id = 'xiongShanjun'; e.moveIdx = 0; });
    endTurn(run);
    expect(t.protect).toBe(5);
  });
});

describe('倒下与救师', () => {
  it('弟子倒下后冻结，唐僧在无弟子可激活时转为独战 3/3', () => {
    const run = setup(['congA']);
    const c = run.combat!;
    const r = fighter(c, 'congA')!;
    r.hp = 1;
    r.block = 0;
    c.enemies.forEach((e) => { e.id = 'xiaoyaoDao'; e.moveIdx = 0; e.strength = 0; });
    endTurn(run);
    expect(r.down).toBe(true);
    expect(r.active).toBe(false);
    const t = fighter(c, 'tang')!;
    expect(t.maxEnergy).toBe(3);
  });

  it('唐僧生命归零进入救师，超时则本章失败', () => {
    const run = setup(['wukong']);
    const c = run.combat!;
    const t = fighter(c, 'tang')!;
    t.hp = 1;
    t.protect = 0;
    // 让敌人专打后排
    c.enemies.forEach((e) => { e.id = 'huJing'; e.moveIdx = 3; e.hp = e.maxHp = 999; });
    endTurn(run);
    expect(t.captured).toBe(true);
    expect(c.rescueTimer).toBe(2);
    expect(c.result).toBe('ongoing');
    endTurn(run);
    endTurn(run);
    expect(c.result).toBe('lost');
  });

  it('打出牌后敌人全灭即胜利', () => {
    const run = setup(['wukong']);
    const c = run.combat!;
    c.enemies.forEach((e) => { e.hp = 1; e.block = 0; });
    giveHand(run, 'wukong', ['bangda']);
    playCard(run, 'wukong', 0, { enemy: c.enemies[0].uid });
    expect(c.result).toBe('won');
  });
});
