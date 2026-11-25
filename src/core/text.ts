/** 纯文本工具：升级前后描述对比，不依赖 DOM */

/** 把 after 相对 before 的新增/改动字标绿（返回 HTML；escape 由调用方提供） */
export function descDiffHtml(before: string, after: string, escape: (s: string) => string): string {
  const n = before.length;
  const m = after.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = before[i - 1] === after[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const parts: { add: boolean; s: string }[] = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (before[i - 1] === after[j - 1]) {
      parts.push({ add: false, s: after[j - 1] });
      i--;
      j--;
    } else if (dp[i][j - 1] >= dp[i - 1][j]) {
      parts.push({ add: true, s: after[j - 1] });
      j--;
    } else i--;
  }
  while (j > 0) {
    parts.push({ add: true, s: after[--j] });
  }
  parts.reverse();
  let html = '';
  let buf = '';
  let add = false;
  const flush = () => {
    if (!buf) return;
    html += add ? `<span class="diff">${escape(buf)}</span>` : escape(buf);
    buf = '';
  };
  for (const p of parts) {
    if (p.add !== add) {
      flush();
      add = p.add;
    }
    buf += p.s;
  }
  flush();
  return html;
}
