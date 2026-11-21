# 西游·八十一难 卡牌肉鸽 · 第一章网页原型

按 `docs/design-v2-combat.md` 第 4 节「第一章原型范围」实现：难 1～9（金蝉出关），一章一局、分角牌库 + 个人灵力。

## 运行

```bash
npm install
npm run dev        # 开发：http://localhost:5173
npm run build      # 类型检查 + 打包到 dist/
npm run preview    # 预览 dist：http://localhost:4173
npm test           # 战斗与流程单元测试（vitest）
npm run e2e        # 无头 Chrome 从开局打到章末结算并截图（需先 preview）
```

`?seed=123` 可固定随机种子。

## 玩法（10 行内）

1. 观音点化三选一，然后按原著顺序走难 1～9；难与难之间的赶路可选「战斗 / 奇遇」，必经一次商铺和一次歇脚。
2. 每人各有牌库、手牌和灵力：弟子 3 灵力抽 3；唐僧有同伴 2/2，独战 3/3。
3. 每回合最多激活 2 名弟子，唐僧自动激活；点头像或标签切换出牌角色，可穿插出牌。未激活弟子回合末得 4 守势。
4. 前排 2、后排 3。敌人普通攻击打前排，🎯 招式点名后排（唐僧）。
5. 弟子倒下本场冻结，胜后 30% 生命站起；唐僧归零被劫，3 回合内取胜才救得回，否则本章失败。
6. 胜后先指定角色再 3 选 1 选卡（Boss 两次，须给不同角色），另有斋钱、法宝、丹药。
7. 难 5 两名从人随行，难 6 折损离队；难 8 揭帖收悟空（唐僧得紧箍咒），难 9 收白龙马（力战或请观音后迎战水怪）。
8. 死亡从本章开头重来，重开时难 1～4 可「诵前缘」速过；通关后进入结算，选携带物，解锁第二章入口。

## 结构（逻辑与渲染分离，便于移植微信小游戏）

```
src/data/   纯数据：cards / characters / enemies / relics / events / chapter1
src/core/   纯逻辑（无 DOM）：combat 战斗、run 单章流程、rng 种子随机、save 存档（KV 抽象）、autoplay 自测 AI
src/ui/     DOM 渲染层：app（输入与整屏重绘）、views（HTML 片段）、style.css
tests/      vitest 单元测试
scripts/    playthrough.mjs（整章 e2e + 截图）、death-check.mjs（死亡重开）
```

移植小游戏时只需替换 `src/ui/`（改为 Canvas 渲染）并把 `save.ts` 的 KV 换成 `wx.getStorageSync / wx.setStorageSync`；`core` 与 `data` 不依赖浏览器 API。

## 已知简化

见提交说明与 docs；主要有：卡面数值不随法宝变化（战斗中额外加成以红字「伤害 +N」提示）、禅定/行路的弃牌为随机、筋斗云不含换位、紧箍咒只做「攻击 +3」（升级后加「下一张 0 费」）、破隐对全队生效、未做战斗内换位与激活名单手动选择界面（第一章同时最多 2 名弟子，用不到）。
