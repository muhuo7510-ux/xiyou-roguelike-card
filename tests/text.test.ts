import { describe, expect, it } from 'vitest';
import { cardFace, canUpgrade } from '../src/core/cards';
import { descDiffHtml } from '../src/core/text';
import { CARDS } from '../src/data/cards';
import { wrapKeywords } from '../src/ui/views';

const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

describe('升级描述对比', () => {
  it('把变化的数字标在 span.diff 里，未变的数字保持原样', () => {
    const html = descDiffHtml('造成 6 点伤害。棒。', '造成 9 点伤害。棒。', esc);
    expect(html).toContain('<span class="diff">9</span>');
    expect(html).toContain('造成 ');
    expect(html).toContain(' 点伤害。棒。');
    expect(html).not.toContain('class="diff">6');
  });

  it('文字改动也会标绿', () => {
    const html = descDiffHtml('本回合你的下一张攻击牌再结算一次。', '本回合你的下两张攻击牌各再结算一次。', esc);
    expect(html).toContain('<span class="diff">两</span>');
    expect(html).toContain('<span class="diff">各</span>');
  });

  it('锡杖轻叩升级后的对比含 7', () => {
    const before = cardFace({ uid: 1, id: 'xizhang', up: false });
    const after = cardFace({ uid: 1, id: 'xizhang', up: true });
    const html = descDiffHtml(before.desc, after.desc, esc);
    expect(after.desc).toContain('7');
    expect(html).toContain('<span class="diff">7</span>');
  });
});

describe('净化说明与关键词', () => {
  it('诵经、清心的卡面写明会移除手中诅咒', () => {
    for (const id of ['songjing', 'qingxin']) {
      expect(CARDS[id].desc).toMatch(/移除手中 1 张诅咒/);
      expect(CARDS[id].up?.desc).toMatch(/移除手中 1 张诅咒/);
      expect(CARDS[id].desc).toMatch(/净化/);
    }
  });

  it('wrapKeywords 给净化、诅咒、护甲加上说明', () => {
    const html = wrapKeywords('获得 5 点护甲。移除手中 1 张诅咒（或净化 1 层负面）。');
    expect(html).toContain('data-act="tip"');
    expect(html).toContain('>护甲</span>');
    expect(html).toContain('>诅咒</span>');
    expect(html).toContain('>净化</span>');
    expect(html.replace(/<[^>]+>/g, '')).toBe('获得 5 点护甲。移除手中 1 张诅咒（或净化 1 层负面）。');
    const tips = [...html.matchAll(/data-tip="([^"]*)"/g)].map((m) => m[1]);
    expect(tips.some((t) => t.includes('移出本场'))).toBe(true);
    expect(html).not.toContain('移出本场</span>');
  });

  it('已升级牌的名字带 +，且可升级判定正确', () => {
    expect(canUpgrade({ uid: 1, id: 'bangda', up: false })).toBe(true);
    expect(canUpgrade({ uid: 1, id: 'bangda', up: true })).toBe(false);
    expect(cardFace({ uid: 1, id: 'bangda', up: true }).name).toBe('棒打+');
  });
});
