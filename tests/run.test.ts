import { describe, expect, it } from 'vitest';
import { autoRun } from '../src/core/autoplay';
import * as R from '../src/core/run';
import { loadRun, memoryKV, saveRun } from '../src/core/save';

describe('第一章流程', () => {
  it('难 1～9 顺序固定，含商店、休息与赶路分支', () => {
    const run = R.newRun(7);
    const ordeals = run.steps.flatMap((s) => s.options.filter((o) => o.type === 'ordeal').map((o) => o.ordeal));
    expect(ordeals).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    const types = run.steps.flatMap((s) => s.options.map((o) => o.type));
    for (const t of ['shop', 'rest', 'fight', 'event', 'guanyin', 'end']) expect(types).toContain(t);
  });

  it('选卡先指定角色，只从该角色牌池出牌', () => {
    const run = R.newRun(3);
    R.applyOps(run, [{ op: 'join', who: 'wukong' }]);
    R.beginFight(run, 'road_dao');
    run.combat!.result = 'won';
    R.resolveCombatEnd(run);
    expect(run.screen).toBe('reward');
    R.rewardChooseChar(run, 'wukong');
    const pool = new Set(R.cardPoolFor('wukong'));
    expect(run.reward!.options!.cards.length).toBe(3);
    expect(run.reward!.options!.cards.every((c) => pool.has(c.id))).toBe(true);
    const before = R.member(run, 'wukong')!.deck.length;
    R.rewardPickCard(run, 0);
    expect(R.member(run, 'wukong')!.deck.length).toBe(before + 1);
  });

  it('存档只在地图界面写入，可读回', () => {
    const kv = memoryKV();
    const run = R.newRun(5);
    saveRun(kv, run);
    expect(loadRun(kv)?.seed).toBe(5);
  });

  it('AI 能从开局走到章末（多个种子，收服两条路线都试）', () => {
    let wins = 0;
    let recruitedBoth = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const run = autoRun(R.newRun(seed), { n9Option: seed % 2 });
      if (run.screen === 'victory') {
        wins++;
        const ids = run.party.map((m) => m.id).sort();
        if (ids.join() === 'longma,tang,wukong') recruitedBoth++;
      } else expect(run.screen).toBe('dead');
    }
    expect(wins).toBeGreaterThan(10);
    expect(recruitedBoth).toBe(wins);
  });
});
