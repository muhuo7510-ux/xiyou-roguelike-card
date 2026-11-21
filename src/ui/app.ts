// DOM 渲染与输入：只调用 core 的函数改状态，然后整屏重绘
import { CHARS } from '../data/characters';
import { CHAPTER1 } from '../data/chapter1';
import { ENCOUNTERS } from '../data/enemies';
import { POTIONS, RELICS } from '../data/relics';
import { canUpgrade, cardDef } from '../core/cards';
import * as C from '../core/combat';
import * as R from '../core/run';
import * as S from '../core/save';
import type { MetaState, RunState } from '../core/state';
import type { CharId } from '../core/types';
import { cardHTML, enemyHTML, esc, fighterHTML, hpBar, memberChip, potionsHTML, relicsHTML } from './views';

const kv: S.KV = {
  get: (k) => localStorage.getItem(k),
  set: (k, v) => localStorage.setItem(k, v),
  remove: (k) => localStorage.removeItem(k),
};

interface UI {
  view: 'title' | 'game' | 'help';
  sel: { who: CharId; idx: number } | null; // 等待选目标的牌
  potionSel: number | null; // 等待选目标的丹药
  deck: CharId | null; // 查看牌库
  tip: string | null;
  carryRelic: string | null;
  carryCards: number[];
}

let root: HTMLElement;
let run: RunState | null = null;
let meta: MetaState = S.loadMeta(kv);
const ui: UI = { view: 'title', sel: null, potionSel: null, deck: null, tip: null, carryRelic: null, carryCards: [] };

export function mountApp(el: HTMLElement) {
  root = el;
  root.addEventListener('click', onClick);
  (window as unknown as { __xy: unknown }).__xy = { get run() { return run; }, get meta() { return meta; }, get ui() { return ui; } };
  const q = new URLSearchParams(location.search);
  if (q.get('seed')) {
    startNew(Number(q.get('seed')));
    return;
  }
  render();
}

function startNew(seed = (Date.now() % 1e9) | 0) {
  run = R.newRun(seed, meta);
  ui.view = 'game';
  resetSel();
  after();
}

function resetSel() {
  ui.sel = null;
  ui.potionSel = null;
}

/** 每次操作后：自动补选、存档、重绘 */
function after() {
  if (run) {
    R.autoFillPending(run);
    if (run.screen === 'map') S.saveRun(kv, run);
  }
  render();
}

/* ================= 输入 ================= */
function onClick(ev: Event) {
  const el = (ev.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!el) {
    if (ui.tip) {
      ui.tip = null;
      render();
    }
    return;
  }
  const a = el.dataset.act!;
  const d = el.dataset;
  ui.tip = null;
  switch (a) {
    case 'new': startNew(); return;
    case 'continue': {
      const r = S.loadRun(kv);
      if (r) { run = r; ui.view = 'game'; resetSel(); }
      break;
    }
    case 'help': ui.view = 'help'; break;
    case 'title': ui.view = 'title'; run = run && run.screen === 'map' ? run : null; break;
    case 'tip': ui.tip = d.tip ?? null; break;
    case 'deck': ui.deck = (d.who as CharId) ?? run?.party[0]?.id ?? null; break;
    case 'closeDeck': ui.deck = null; break;
    case 'node': R.chooseNode(run!, Number(d.idx)); break;
    case 'evopt': R.chooseEventOption(run!, Number(d.idx)); break;
    case 'evcont': R.eventContinue(run!); break;
    // 战斗
    case 'card': onCard(d.who as CharId, Number(d.idx)); break;
    case 'enemy': onEnemy(Number(d.uid)); break;
    case 'fighter': onFighter(d.who as CharId); break;
    case 'cancel': resetSel(); break;
    case 'endTurn': resetSel(); C.endTurn(run!); break;
    case 'combatDone': R.resolveCombatEnd(run!); resetSel(); onRunEnd(); break;
    case 'cpotion': ui.potionSel = ui.potionSel === Number(d.idx) ? null : Number(d.idx); ui.sel = null; break;
    case 'mpotion': ui.potionSel = ui.potionSel === Number(d.idx) ? null : Number(d.idx); break;
    case 'mpotionUse': if (ui.potionSel !== null) R.usePotionOnMap(run!, ui.potionSel, d.who as CharId); ui.potionSel = null; break;
    // 奖励
    case 'rwChar': R.rewardChooseChar(run!, d.who as CharId); break;
    case 'rwCard': R.rewardPickCard(run!, Number(d.idx)); break;
    case 'rwSkip': R.rewardPickCard(run!, null); break;
    case 'rwRelic': R.rewardTakeRelic(run!); break;
    case 'rwPotion': R.rewardTakePotion(run!); break;
    case 'rwUpgrade': R.rewardTakeUpgrade(run!); break;
    case 'rwDone': R.rewardDone(run!); break;
    // 商店
    case 'buy': R.shopBuy(run!, d.kind as 'cards' | 'relics' | 'potions', Number(d.idx)); break;
    case 'shopRemove': R.shopRemove(run!); break;
    case 'shopUpgrade': R.shopUpgrade(run!); break;
    case 'leaveShop': R.leaveShop(run!); break;
    // 休息
    case 'restHeal': R.restHeal(run!); break;
    case 'restUp': R.restUpgrade(run!); break;
    // 待选弹窗
    case 'pdWho': R.resolvePending(run!, { who: d.who as CharId }); break;
    case 'pdCard': R.resolvePending(run!, { cardIdx: Number(d.idx) }); break;
    case 'pdUid': R.resolvePending(run!, { uid: Number(d.uid) }); break;
    case 'pdSkip': R.resolvePending(run!, { skip: true }); break;
    // 结算
    case 'retry': S.clearRun(kv); startNew(); return;
    case 'carryRelic': ui.carryRelic = ui.carryRelic === d.id ? null : d.id!; break;
    case 'carryCard': {
      const u = Number(d.uid);
      if (ui.carryCards.includes(u)) ui.carryCards = ui.carryCards.filter((x) => x !== u);
      else if (ui.carryCards.length < 2) ui.carryCards.push(u);
      break;
    }
    case 'finish': finishChapter(); return;
  }
  after();
}

function onRunEnd() {
  if (!run) return;
  if (run.screen === 'dead') {
    meta.deaths++;
    meta.seenIntro = true;
    S.saveMeta(kv, meta);
    S.clearRun(kv);
  }
}

function finishChapter() {
  if (!run) return;
  const ups = R.upgradedCards(run).filter((x) => ui.carryCards.includes(x.card.uid));
  meta = { ...meta, ch2Unlocked: true, seenIntro: true, clears: meta.clears + 1, carry: { relic: ui.carryRelic, cards: ups.map((x) => ({ who: x.who, id: x.card.id })) } };
  S.saveMeta(kv, meta);
  S.clearRun(kv);
  run = null;
  ui.view = 'title';
  ui.carryCards = [];
  ui.carryRelic = null;
  render();
}

function onCard(who: CharId, idx: number) {
  const c = run!.combat!;
  ui.potionSel = null;
  if (c.current !== who) c.current = who;
  if (ui.sel && ui.sel.who === who && ui.sel.idx === idx) {
    ui.sel = null;
    return;
  }
  if (!C.canPlay(run!, who, idx).ok) {
    ui.sel = null;
    return;
  }
  const f = C.fighter(c, who)!;
  const card = f.hand[idx];
  const k = C.targetKind(card);
  const vt = C.validTargets(run!, f, card);
  const needs = (k === 'enemy' && vt.enemies.length > 1) || ((k === 'ally' || k === 'activeAlly') && vt.allies.length > 1);
  if (!needs) {
    C.playCard(run!, who, idx, { enemy: vt.enemies[0], ally: vt.allies[0] });
    ui.sel = null;
  } else ui.sel = { who, idx };
}

function onEnemy(uid: number) {
  if (!ui.sel) return;
  C.playCard(run!, ui.sel.who, ui.sel.idx, { enemy: uid });
  ui.sel = null;
}

function onFighter(who: CharId) {
  const c = run!.combat!;
  if (ui.potionSel !== null) {
    C.usePotionInCombat(run!, ui.potionSel, who);
    ui.potionSel = null;
    return;
  }
  if (ui.sel) {
    const f = C.fighter(c, ui.sel.who)!;
    const vt = C.validTargets(run!, f, f.hand[ui.sel.idx]);
    if (vt.allies.includes(who)) {
      C.playCard(run!, ui.sel.who, ui.sel.idx, { ally: who });
      ui.sel = null;
      return;
    }
  }
  const f = C.fighter(c, who);
  if (f && f.active && C.alive(f)) {
    c.current = who;
    ui.sel = null;
  }
}

/* ================= 渲染 ================= */
function render() {
  let html = '';
  if (ui.view === 'title' || !run) html = titleView();
  if (ui.view === 'help') html = helpView();
  else if (ui.view === 'game' && run) html = gameView(run);
  if (ui.tip) html += `<div class="toast">${esc(ui.tip)}</div>`;
  root.innerHTML = html;
  const cur = root.querySelector('.step.current');
  if (cur && run?.screen === 'map') cur.scrollIntoView({ block: 'center' });
}

function titleView() {
  const has = !!S.loadRun(kv);
  return `<div class="screen title">
    <div class="seal">西游</div>
    <h1>八十一难</h1>
    <p class="sub">卡牌肉鸽 · 网页原型</p>
    <div class="menu">
      <button class="btn primary" data-act="new">🪷 开始 · 第一章 金蝉出关</button>
      ${has ? '<button class="btn" data-act="continue">📜 继续上次取经</button>' : ''}
      <button class="btn ${meta.ch2Unlocked ? '' : 'locked'}" disabled>${meta.ch2Unlocked ? '🔓 第二章 · 四众成行（制作中）' : '🔒 第二章 · 四众成行'}</button>
      <button class="btn ghost" data-act="help">❔ 玩法说明</button>
    </div>
    <p class="meta">通关 ${meta.clears} 次 · 轮回 ${meta.deaths} 次${meta.carry ? ' · 已备好二章携带' : ''}</p>
  </div>`;
}

function helpView() {
  return `<div class="screen help"><h2>玩法说明</h2><ul>
    <li>一章一局：按原著顺序走完难 1～9，死了就从本章开头重入轮回。</li>
    <li>每名角色有<b>自己的牌库、手牌和灵力</b>。弟子 3 灵力抽 3；唐僧有同伴时 2/2，独战时 3/3。</li>
    <li>每回合最多激活 2 名弟子，唐僧自动激活；未激活的弟子回合末得 4 点「守势」护甲。</li>
    <li>点头像切换当前出牌的角色，可穿插出牌（悟空打一张 → 唐僧紧箍咒 → 悟空再打）。</li>
    <li>前排 2 人、后排 3 人。敌人普通攻击打前排；🎯 招式会点名后排。</li>
    <li>弟子倒下本场冻结，胜后 30% 生命站起。唐僧生命归零则<b>被劫</b>：3 回合内取胜才能救回，否则本章失败。</li>
    <li>战后选卡：先指定给谁，再从他的牌池 3 选 1。Boss 给两次，须分给不同角色。</li>
    <li>难 8 揭帖收悟空（唐僧牌库加入紧箍咒），难 9 鹰愁涧收白龙马。</li>
  </ul><button class="btn primary" data-act="title">返回</button></div>`;
}

function ordealNo(run: RunState) {
  let n = 0;
  for (let i = 0; i < run.step && i < run.steps.length; i++) for (const o of run.steps[i].options) if (o.type === 'ordeal' && run.steps[i].chosen !== null) n = Math.max(n, o.ordeal ?? 0);
  return n;
}

function topBar(run: RunState) {
  return `<div class="topbar">
    <span class="chap">${CHAPTER1.name.split('·')[1]}</span>
    <span>📿 ${ordealNo(run)}/9</span>
    <span class="gold">💰${run.gold}</span>
    <span class="pots">${potionsHTML(run, run.screen === 'combat' ? 'cpotion' : 'mpotion')}</span>
    <span class="relics">${relicsHTML(run)}</span>
    <button class="mini" data-act="deck">🎴</button>
  </div>`;
}

function gameView(run: RunState) {
  let body = '';
  switch (run.screen) {
    case 'map': body = mapView(run); break;
    case 'event': body = eventView(run); break;
    case 'combat': body = combatView(run); break;
    case 'reward': body = rewardView(run); break;
    case 'shop': body = shopView(run); break;
    case 'rest': body = restView(run); break;
    case 'dead': body = deadView(run); break;
    case 'victory': body = victoryView(run); break;
  }
  let modal = '';
  if (run.pending.length) modal = pendingView(run);
  else if (ui.deck) modal = deckView(run, ui.deck);
  else if (ui.potionSel !== null && run.screen !== 'combat') modal = mapPotionView(run);
  return `<div class="screen game s-${run.screen}">${topBar(run)}<div class="body">${body}</div>${modal}</div>`;
}

/* ---------- 地图 ---------- */
function mapView(run: RunState) {
  const rows = run.steps.map((st, i) => {
    const state = i < run.step ? 'done' : i === run.step ? 'current' : 'future';
    const nodes = st.options.map((o, j) => {
      const chosen = st.chosen === j;
      const cls = ['node', `n-${o.type}`, chosen ? 'chosen' : '', state === 'done' && !chosen ? 'skipped' : ''].join(' ');
      const act = state === 'current' ? `data-act="node" data-idx="${j}"` : '';
      const num = o.type === 'ordeal' ? `<b class="num">${o.ordeal}</b>` : '';
      return `<div class="${cls}" ${act}>${num}<span class="ico">${o.icon}</span><span class="lbl">${esc(o.label)}</span></div>`;
    }).join(st.road ? '<span class="or">或</span>' : '');
    return `<div class="step ${state} ${st.road ? 'road' : 'fixed'}">${nodes}</div>`;
  }).join('');
  return `<div class="map"><div class="maptitle">${CHAPTER1.name} · 西行路线</div>${rows}</div>
    <div class="partybar">${run.party.map(memberChip).join('')}</div>`;
}

/* ---------- 事件 ---------- */
function eventView(run: RunState) {
  const ev = R.currentEvent(run)!;
  const res = run.event!.result;
  const opts = res !== undefined
    ? `<div class="result">${esc(res).replace(/\n/g, '<br>')}</div><button class="btn primary" data-act="evcont">继续</button>`
    : ev.options.map((o, i) => {
      const dis = o.needGold && run.gold < o.needGold ? 'disabled' : '';
      return `<button class="btn opt" data-act="evopt" data-idx="${i}" ${dis}><b>${esc(o.label)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ''}</button>`;
    }).join('');
  return `<div class="event">
    <div class="art">${ev.art}</div>
    <h2>${esc(ev.title)}</h2>
    <div class="text">${esc(ev.text).replace(/\n/g, '<br>')}</div>
    <div class="opts">${opts}</div>
    <div class="partybar">${run.party.map(memberChip).join('')}</div>
  </div>`;
}

/* ---------- 战斗 ---------- */
function combatView(run: RunState) {
  const c = run.combat!;
  const selCard = ui.sel ? C.fighter(c, ui.sel.who)!.hand[ui.sel.idx] : null;
  const vt = ui.sel && selCard ? C.validTargets(run, C.fighter(c, ui.sel.who)!, selCard) : { enemies: [], allies: [] };
  const potionTarget = ui.potionSel !== null;
  const enemies = c.enemies.map((e) => enemyHTML(e, vt.enemies.includes(e.uid))).join('');
  const slot = (row: 'front' | 'back', n: number) => {
    const fs = c.party.filter((f) => f.row === row);
    let s = fs.map((f) => fighterHTML(f, { current: c.current === f.id, targetable: vt.allies.includes(f.id) || (potionTarget && C.alive(f)) })).join('');
    for (let i = fs.length; i < n; i++) s += '<div class="ftr empty">空位</div>';
    return s;
  };
  const cur = c.current ? C.fighter(c, c.current) : undefined;
  let hand = '';
  if (cur) {
    hand = cur.hand.map((card, i) => cardHTML(card, {
      cost: C.effectiveCost(run, cur, card), playable: C.canPlay(run, cur.id, i).ok, bonus: C.attackBonus(run, cur, card),
      selected: !!ui.sel && ui.sel.who === cur.id && ui.sel.idx === i, act: 'card', attrs: `data-who="${cur.id}" data-idx="${i}"`,
    })).join('') || '<div class="empty-hand">（手牌已空）</div>';
  }
  const actives = c.party.filter((f) => f.active && C.alive(f));
  const tabs = actives.map((f) => `<button class="tab ${f.id === c.current ? 'on' : ''}" data-act="fighter" data-who="${f.id}">${CHARS[f.id].emoji}${CHARS[f.id].name} <b>${f.energy}</b>/${f.maxEnergy}</button>`).join('');
  const hint = ui.sel
    ? `<div class="hint">选择目标 <button class="mini" data-act="cancel">取消</button></div>`
    : potionTarget ? `<div class="hint">选择丹药目标（点我方头像） <button class="mini" data-act="cancel">取消</button></div>` : '';
  const rescue = c.rescueTimer !== null ? `<div class="rescue">‼️ 唐僧被劫！${c.rescueTimer} 回合内取胜才能救回师父</div>` : '';
  const solo = C.isSolo(c) && !C.fighter(c, 'tang')?.captured ? '<span class="tagline">唐僧独战 3/3</span>' : '';
  const over = c.result !== 'ongoing'
    ? `<div class="overlay"><div class="panel"><h2>${c.result === 'won' ? '🎉 胜利' : '💀 取经受阻'}</h2><p>${esc(c.result === 'won' ? ENCOUNTERS[c.encounter].name : c.lostReason ?? '')}</p>
       <button class="btn primary" data-act="combatDone">${c.result === 'won' ? '领取奖励' : '继续'}</button></div></div>` : '';
  return `<div class="combat">
    <div class="chead"><b>${esc(ENCOUNTERS[c.encounter].name)}</b><span>第 ${c.turn} 回合</span>${solo}</div>
    ${rescue}
    <div class="enemies">${enemies}</div>
    <div class="formation">
      <div class="rowlbl">前排</div><div class="row front">${slot('front', 2)}</div>
      <div class="rowlbl">后排</div><div class="row back">${slot('back', 3)}</div>
    </div>
    <div class="log">${c.log.slice(-3).map((l) => `<div>${esc(l)}</div>`).join('')}</div>
    ${hint}
    <div class="handbar">
      <div class="tabs">${tabs}</div>
      <div class="piles">${cur ? `牌库 ${cur.drawPile.length} · 弃 ${cur.discard.length} · 耗 ${cur.exhaust.length}` : ''}</div>
    </div>
    <div class="hand">${hand}</div>
    <div class="actions"><button class="btn primary end" data-act="endTurn">全队结束回合</button></div>
    ${over}
  </div>`;
}

/* ---------- 奖励 ---------- */
function rewardView(run: RunState) {
  const r = run.reward!;
  const el = R.eligibleChars(run);
  let pick = '';
  if (r.options) {
    pick = `<h3>给 ${CHARS[r.options.who].emoji}${CHARS[r.options.who].name} 选一张牌</h3>
      <div class="cards three">${r.options.cards.map((c, i) => cardHTML(c, { act: 'rwCard', attrs: `data-idx="${i}"` })).join('')}</div>
      <button class="btn ghost" data-act="rwSkip">跳过（不要这张）</button>`;
  } else if (r.picksLeft > 0) {
    const others = el.filter((x) => !r.pickedChars.includes(x));
    const def = el.slice().sort((a, b) => R.member(run, b)!.missed - R.member(run, a)!.missed)[0];
    pick = `<h3>选卡：先指定给谁${r.tier === 'boss' ? '（Boss 两次，须分给不同角色）' : ''} · 剩 ${r.picksLeft} 次</h3>
      <div class="whos">${el.map((w) => {
        const dis = r.pickedChars.includes(w) && others.length > 0;
        const m = R.member(run, w)!;
        return `<button class="btn who ${w === def && m.missed >= 3 ? 'hl' : ''}" data-act="rwChar" data-who="${w}" ${dis ? 'disabled' : ''}>${CHARS[w].emoji} ${CHARS[w].name}<small>牌库 ${m.deck.length} 张${m.missed >= 3 ? ' · 久未得牌' : ''}</small></button>`;
      }).join('')}</div>`;
  }
  const items = [
    `<div class="ritem">💰 斋钱 +${r.gold}</div>`,
    r.relic ? `<button class="btn ritem" data-act="rwRelic">${RELICS[r.relic].emoji} 法宝「${RELICS[r.relic].name}」<small>${esc(RELICS[r.relic].desc)}</small></button>` : '',
    r.potion ? `<button class="btn ritem" data-act="rwPotion">${POTIONS[r.potion].emoji} 丹药「${POTIONS[r.potion].name}」<small>${esc(POTIONS[r.potion].desc)}</small></button>` : '',
    r.upgradeBonus ? `<button class="btn ritem" data-act="rwUpgrade">📖 Boss 赏：默经升级一张牌</button>` : '',
    ...r.notes.map((n) => `<div class="ritem done">✔ ${esc(n)}</div>`),
  ].join('');
  return `<div class="reward"><h2>战利品</h2><div class="ritems">${items}</div>${pick}
    ${r.options ? '' : `<button class="btn primary" data-act="rwDone">${r.picksLeft > 0 ? '放弃选卡，继续' : '继续西行'}</button>`}</div>`;
}

/* ---------- 商店 ---------- */
function shopView(run: RunState) {
  const s = run.shop!;
  const cards = s.cards.map((x, i) => cardHTML(x.item.card, { owner: x.item.owner, price: x.price, sold: x.sold,
    playable: !x.sold && run.gold >= x.price, act: 'buy', attrs: `data-kind="cards" data-idx="${i}"` })).join('');
  const relics = s.relics.map((x, i) => `<button class="btn ritem" data-act="buy" data-kind="relics" data-idx="${i}" ${x.sold || run.gold < x.price ? 'disabled' : ''}>${RELICS[x.item].emoji} ${RELICS[x.item].name} · ${x.sold ? '已售' : '💰' + x.price}<small>${esc(RELICS[x.item].desc)}</small></button>`).join('');
  const pots = s.potions.map((x, i) => `<button class="btn ritem" data-act="buy" data-kind="potions" data-idx="${i}" ${x.sold || run.gold < x.price ? 'disabled' : ''}>${POTIONS[x.item].emoji} ${POTIONS[x.item].name} · ${x.sold ? '已售' : '💰' + x.price}<small>${esc(POTIONS[x.item].desc)}</small></button>`).join('');
  return `<div class="shop"><h2>🏮 集镇商铺</h2>
    <h3>卡牌（买下进入所标角色的牌库）</h3><div class="cards">${cards}</div>
    <h3>法宝</h3>${relics}<h3>丹药</h3>${pots}
    <h3>服务</h3>
    <button class="btn ritem" data-act="shopRemove">✂️ 删牌（先选角色；各人首次 75，再删 +25；诅咒 +50）</button>
    <button class="btn ritem" data-act="shopUpgrade" ${s.upgradeUsed || run.gold < R.UPGRADE_PRICE ? 'disabled' : ''}>📖 升级一张牌 · 💰${R.UPGRADE_PRICE}（每店 1 次）</button>
    <button class="btn primary" data-act="leaveShop">离开商铺</button></div>`;
}

/* ---------- 休息 ---------- */
function restView(run: RunState) {
  const heals = run.party.map((m) => `${CHARS[m.id].name} +${Math.min(R.restHealAmount(m), m.maxHp - m.hp)}`).join('，');
  return `<div class="rest"><div class="art">🔥</div><h2>歇脚 / 化缘</h2><p>二选一：</p>
    <button class="btn opt" data-act="restHeal"><b>🍚 化缘回血</b><small>全队回复 30% 最大生命（人族 38%）：${heals}</small></button>
    <button class="btn opt" data-act="restUp"><b>📖 默经升级</b><small>指定一名角色，升级其牌库中 1 张牌（全队只升 1 张）</small></button>
    <div class="partybar">${run.party.map(memberChip).join('')}</div></div>`;
}

/* ---------- 死亡 / 结算 ---------- */
function statsHTML(run: RunState) {
  const mins = Math.max(1, Math.round((Date.now() - run.stats.startedAt) / 60000));
  return `<div class="stats">
    <div>📿 已过难数<b>${ordealNo(run)}/9</b></div><div>⚔️ 胜场<b>${run.stats.fights}</b></div>
    <div>🔁 总回合<b>${run.stats.turns}</b></div><div>💰 获得斋钱<b>${run.stats.goldEarned}</b></div>
    <div>🎴 新增卡牌<b>${run.stats.cardsAdded}</b></div><div>⏱️ 用时<b>${mins} 分</b></div></div>`;
}

function deadView(run: RunState) {
  return `<div class="dead"><div class="art">🌀</div><h2>取经失败 · 重入轮回</h2><p>${esc(run.deadReason ?? '')}</p>
    ${statsHTML(run)}<p class="small">本章构筑清空。重开时难 1～4 可「诵前缘」速过。</p>
    <button class="btn primary" data-act="retry">重入本章</button><button class="btn ghost" data-act="title">回到主页</button></div>`;
}

function victoryView(run: RunState) {
  const relics = R.carryRelics(run);
  const ups = R.upgradedCards(run);
  return `<div class="victory"><div class="art">🏯</div><h2>第一章 · 金蝉出关 通关！</h2>
    <p>师徒三众已齐：唐僧、孙悟空、白龙马。<b>第二章 · 四众成行</b> 已解锁（内容制作中）。</p>
    ${statsHTML(run)}
    <div class="partybar">${run.party.map(memberChip).join('')}</div>
    <h3>章间携带：法宝（选 1）</h3>
    <div class="carry">${relics.length ? relics.map((id) => `<button class="btn who ${ui.carryRelic === id ? 'hl' : ''}" data-act="carryRelic" data-id="${id}">${RELICS[id].emoji} ${RELICS[id].name}</button>`).join('') : '<span class="small">（没有可携带的非起始法宝）</span>'}</div>
    <h3>章间携带：已升级牌（最多 2 张，回到原角色）</h3>
    <div class="cards">${ups.length ? ups.map((x) => cardHTML(x.card, { owner: x.who, selected: ui.carryCards.includes(x.card.uid), act: 'carryCard', attrs: `data-uid="${x.card.uid}"` })).join('') : '<span class="small">（没有升级过的牌）</span>'}</div>
    <button class="btn primary" data-act="finish">确认携带，回到主页</button></div>`;
}

/* ---------- 弹窗 ---------- */
function whoButtons(run: RunState, act: string) {
  return R.eligibleChars(run).map((w) => `<button class="btn who" data-act="${act}" data-who="${w}">${CHARS[w].emoji} ${CHARS[w].name}</button>`).join('');
}

function pendingView(run: RunState) {
  const p = run.pending[0];
  let inner = '';
  if (p.kind === 'bindRelic') {
    inner = `<h3>${RELICS[p.relic].emoji} 「${RELICS[p.relic].name}」绑定给谁？</h3><p class="small">${esc(RELICS[p.relic].desc)}</p><div class="whos">${whoButtons(run, 'pdWho')}</div>`;
  } else if (p.kind === 'cardPick') {
    if (!p.cards) inner = `<h3>选卡：先指定角色</h3><div class="whos">${whoButtons(run, 'pdWho')}</div>`;
    else inner = `<h3>给 ${CHARS[p.who!].name} 选一张牌</h3><div class="cards three">${p.cards.map((c, i) => cardHTML(c, { act: 'pdCard', attrs: `data-idx="${i}"` })).join('')}</div>
      <button class="btn ghost" data-act="pdSkip">跳过</button>`;
  } else {
    const title = p.kind === 'upgrade' ? `${p.source}：升级一张牌` : '删牌';
    if (!p.who) inner = `<h3>${title} · 先选角色</h3><div class="whos">${whoButtons(run, 'pdWho')}</div><button class="btn ghost" data-act="pdSkip">取消</button>`;
    else {
      const m = R.member(run, p.who)!;
      const cards = m.deck.map((c) => {
        const curse = cardDef(c).rarity === 'curse';
        const ok = p.kind === 'upgrade' ? canUpgrade(c) : run.gold >= p.price + (curse ? 50 : 0) && (m.deck.length > 4 || curse);
        return cardHTML(c, { playable: ok, act: ok ? 'pdUid' : undefined, attrs: `data-uid="${c.uid}"`, price: p.kind === 'remove' ? p.price + (curse ? 50 : 0) : undefined });
      }).join('');
      inner = `<h3>${title} · ${CHARS[p.who].name}</h3>${p.kind === 'remove' ? `<p class="small">牌库至少保留 4 张。持有 💰${run.gold}</p>` : ''}<div class="cards">${cards}</div>
        <button class="btn ghost" data-act="pdSkip">${p.kind === 'upgrade' ? '放弃升级' : '取消'}</button>`;
    }
  }
  return `<div class="overlay"><div class="panel">${inner}</div></div>`;
}

function deckView(run: RunState, who: CharId) {
  const m = R.member(run, who) ?? run.party[0];
  const tabs = run.party.map((x) => `<button class="tab ${x.id === m.id ? 'on' : ''}" data-act="deck" data-who="${x.id}">${CHARS[x.id].emoji}${CHARS[x.id].name}</button>`).join('');
  const relics = run.relics.filter((r) => r.bound === m.id || !r.bound).map((r) => `${RELICS[r.id].emoji}${RELICS[r.id].name}`).join('、');
  return `<div class="overlay"><div class="panel">
    <div class="tabs">${tabs}</div>
    <p class="small">${esc(CHARS[m.id].blurb)}</p>
    ${hpBar(m.hp, m.maxHp)}
    <p class="small">法宝：${relics || '无'}</p>
    <div class="cards">${m.deck.map((c) => cardHTML(c)).join('')}</div>
    <button class="btn primary" data-act="closeDeck">关闭</button></div></div>`;
}

function mapPotionView(run: RunState) {
  const id = run.potions[ui.potionSel!];
  if (!id) return '';
  const p = POTIONS[id];
  const btns = p.usableOnMap ? run.party.map((m) => `<button class="btn who" data-act="mpotionUse" data-who="${m.id}">${CHARS[m.id].emoji} ${CHARS[m.id].name} ${m.hp}/${m.maxHp}</button>`).join('') : '<p class="small">此丹药会在需要时自动生效。</p>';
  return `<div class="overlay"><div class="panel"><h3>${p.emoji} ${p.name}</h3><p class="small">${esc(p.desc)}</p><div class="whos">${btns}</div>
    <button class="btn ghost" data-act="cancel">关闭</button></div></div>`;
}
