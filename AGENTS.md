# StarLedger Project Rules

> This file is the operating contract for any AI assistant or coding agent working on StarLedger.
> Read this file **before changing code**. Then read `docs/ARCHITECTURE.md` for the current module boundaries.
>
> 本文件优先级高于“顺手优化”“看起来更漂亮”“一次多修几个问题”等临时冲动。
> 项目的首要目标不是追求最漂亮的代码，而是：**保持现有功能稳定，让每次改动局部、可验证、可回退。**

## 1. 工作原则

### 1.1 先判断问题属于哪一层，再动代码

不要先搜关键词然后哪里像就改哪里。先确定问题的 owner：

- `app.js`：账本数据、状态、IndexedDB / workspace、主渲染、记一笔核心流程、统一滚动入口。
- `recognizer.js`：OCR 识别、文本解析、字段映射规则。
- `ui-runtime.js`：页面切换、滑动、动画、浮动控件、浏览器交互、visualViewport 等 UI 运行逻辑。
- `books-stats.js`：账本页和月/年统计相关控制逻辑。
- `mobile-compat.css`：iPhone / Safari browser-tab 的最终兼容覆盖层。
- `index.html`：静态页面骨架和仍然保留的历史 CSS 层；不要继续向里面追加新的 JS patch。
- `sw.js`：离线缓存和运行资源版本。
- `scripts/validate-build.mjs`：构建期不变量检查。

如果一个问题无法在它的 owner 内解决，先判断是不是边界设计有问题，再跨层修改。

### 1.2 一个概念只允许一个主要实现

优先复用现有统一入口，不要创造第二套做法。

例如：

- 页面滚动统一使用现有 page scroll helpers，不要有的地方改 `scrollTop`、有的地方 `window.scrollTo`、有的地方 `#content.scrollTo`。
- 页面切换应走现有导航/切页流程。
- Overlay / modal 应复用现有生命周期。
- Safari browser chrome 问题优先在 `mobile-compat.css` / 对应 UI controller 内解决。
- OCR 解析只在 `recognizer.js` 发展，不复制一套到 UI。

如果发现已经存在两套实现，先收口，再继续增加功能。

### 1.3 小步修改，限制 blast radius

评价改动风险时，优先看“能影响多少地方”，而不是看“改了多少行”。

以下属于高风险区域：

- 全局状态
- `render()`
- 页面导航
- 滚动容器
- Overlay / modal 生命周期
- Safari visualViewport
- IndexedDB / workspace 数据写入
- Service Worker
- OCR 公共解析规则

高风险改动一次只改一个系统，并且必须有针对性的回归检查。

## 2. 严格禁止的做法

除非用户明确要求，不要：

- 为了“代码更漂亮”重写仍在正常工作的模块。
- 在修 UI 时顺手改 OCR。
- 在修 OCR 时顺手重构动画。
- 在修 Safari 时顺手调整桌面端布局。
- 在功能修改中夹带大规模结构重构。
- 在结构重构中夹带行为变化。
- 向 `index.html` 继续追加新的 inline runtime script。
- 为一个新 bug 再增加一套平行状态、平行滚动或平行 modal 实现。
- 用大量 `setTimeout` 作为 UI 状态同步机制，除非有明确的浏览器原因并写清注释。
- 在不知道历史 CSS 为什么存在时直接删除它。
- 在 CI 失败时合并到 `main`。
- 未运行项目校验就直接推送 `main`。当前开发阶段暂不强制 PR；恢复发布冻结时，再同时恢复 PR 流程和生产发布门禁。
- 只因为本地/静态检查通过，就声称 iPhone Safari 视觉问题已经得到真机验证。

## 3. 修改工作流

非纯文本的小改动，默认执行以下流程：

1. 读取本文件和 `docs/ARCHITECTURE.md`。
2. 获取 `main` 最新状态，不依赖旧对话记忆判断当前代码。
3. 定位 owner 和受影响边界。
4. 明确此次改动的“不做事项”。
5. 创建独立分支。
6. 先做最小修复。
7. 运行现有 CI / 静态校验。
8. 检查 diff，确认没有无关改动。
9. 对典型回归补充测试、validator、断言或维护注释。
10. 当前开发阶段在本地校验通过后可直接推送 `main`；需要代码审查、风险较高或进入发布冻结时再使用 PR。
11. Pages 由 `main` 的 push 触发，部署任务必须依赖 `validate` 成功，但暂不检查 commit 是否关联已合并 PR。
12. 确认 `main` push 后的 Pages workflow 完整成功。
13. 对 Safari / iOS 键盘 / browser chrome 等无法自动证明的行为，明确告诉用户需要真机验收哪些路径。

重构和功能开发应尽量分开 PR。

## 4. Bug 修复后的“留疤”规则

重要 bug 不应只修掉，还应该留下防复发机制。

优先级：

1. 自动测试 / build validator；
2. 单一公共 helper / owner 收口；
3. 明确注释说明失败模式；
4. 回归清单；
5. 架构文档更新。

目标是让半年以后新的对话即使不知道历史，也不容易重新犯同一个错误。

## 5. CSS 与 Safari 规则

StarLedger 的 CSS 有历史包袱，不能用“看起来重复”作为删除理由。

### 普通 UI CSS

- 优先修改已经拥有该组件的规则。
- 不要无止境增加新的末端 override。
- 同一组件重复出现多次时，先确认它们是否属于不同平台/不同历史行为。
- 只有确认行为一致后才能合并。

### Safari browser-tab

`mobile-compat.css` 是最终兼容层，加载顺序必须晚于历史 inline styles。

它负责：

- Safari browser chrome clearance
- document scrollbar suppression
- short-page scroll sentinel
- browser pager hand-off
- 其他明确只属于移动浏览器运行时的最终覆盖

普通组件美化不要放进 `mobile-compat.css`。

如果新的 Safari 修复需要改这里，必须写注释说明“它防止什么具体失败”。

## 6. JavaScript 架构规则

### app.js

保持它作为核心应用层。新增跨页面公共能力时，优先提供一个统一 helper，而不是让调用方自己操作 DOM/scroll/state。

### ui-runtime.js

浏览器交互和动画 workaround 集中在这里。不要反复 monkey-patch 同一个全局函数；如果发现多个 wrapper，优先考虑收口 owner。

### recognizer.js

OCR 应被视为独立子系统。UI 改动默认不得触碰它。

OCR 修改必须优先用已知样本/fixture 验证旧识别能力没有退化。

### books-stats.js

只承担账本和月/年页面特有控制逻辑。通用行为不要继续塞进这里。

## 7. 数据安全规则

账本数据高于 UI。

涉及以下内容时提高风险等级：

- CSV schema
- bill ID
- created_at / updated_at
- account balance
- relations
- IndexedDB migration
- workspace merge
- delete / bulk edit
- import / export

任何 UI 重构不得改变数据语义。

涉及删除、合并、迁移时，要优先保证：

- 可恢复
- 不静默丢数据
- 失败时不写半份状态
- 原始数据仍可导出

## 8. Service Worker 规则

新增或改名运行资源时：

- 更新 `sw.js` precache；
- 同步更新资源 query version；
- bump cache key；
- 更新 validator；
- 确认 Pages 部署成功。

不要出现 HTML 已引用新文件，但旧 Service Worker 仍缓存旧运行组合的情况。

## 9. 回归测试优先级

UI 相关修改至少按影响范围覆盖这些路径中的相关项：

- 冷启动首页
- 首页滚动后切月/年再返回
- 月/年滚动后切账本再返回
- Safari 地址栏展开 / 收起状态切页
- 回到顶部
- 查账筛选打开 / 关闭 / 滚动
- 记一笔打开 / 关闭
- 记一笔键盘打开 / 关闭
- 分类 / 账户 / 标签子浮层
- 多账单卡片
- 批量选择 / 批量修改
- 明暗模式
- Safari browser-tab
- standalone / PWA（涉及 viewport、滚动、导航时）

不要求每次人工全测；应按本次 change radius 选择相关路径。

## 10. 什么时候应该重构

不要按时间表为了“整洁”重构。

出现以下信号时再做针对性重构：

- 同一种 bug 连续出现两三次；
- 同一概念出现第二/第三套实现；
- 修改 A 经常误伤 B；
- 已经不敢删除某段代码，因为不知道谁依赖它；
- 一个功能必须跨多个无关文件才能完成；
- 大量特殊 if / timeout / wrapper 开始堆积；
- 新功能实现成本明显被历史结构拖高。

此时先定义重构目标，再做行为保持型重构。不要一边重构一边重新设计产品。

## 11. 面对未知问题

未来问题不可能全部提前预测。

遇到未知问题时，不追求“猜中所有原因”，而是：

1. 复现；
2. 判断属于哪一层；
3. 缩小状态空间；
4. 找最小责任范围；
5. 修复；
6. 把这次未知变成下一次已知的保护规则。

好架构的目标不是没有 bug，而是让 bug **局部、可解释、可修复、可回退**。

## 12. AI 对话行为要求

任何新的项目对话在开始代码工作前，应：

- 先读取 `AGENTS.md`；
- 再读取 `docs/ARCHITECTURE.md`；
- 检查当前仓库状态，而不是仅凭历史聊天；
- 对复杂任务先说明本轮目标和不做事项；
- 在执行中报告发现的重要风险，不用逐条播报低层操作；
- 用户明确说“先讨论/先分析”时，不要直接改代码；
- 用户要求直接修改时，不重复询问已经明确的信息；
- 无法自动验证的真机行为要明确说明，而不是假装已验证；
- 出现 CI 失败要先定位失败原因，不得绕过检查；
- 如果原先假设被证伪，应修正方案，而不是继续叠 patch。

---

**一句话准则：**

> 每次修改都应该让下一次修改更容易，而不是只让这一次“能跑”。
