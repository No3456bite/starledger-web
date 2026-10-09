# StarLedger Web

一个本地优先、无需后端的个人账单 Web App，面向手机与桌面浏览器使用。

> **这是一个全 Codex 开发项目。** 从需求拆解、产品与交互设计、UI 实现、功能开发、Safari 兼容性修复，到自动化校验和文档维护，均由 OpenAI Codex 在用户的方向指导与实际验收下完成。StarLedger 是独立项目，并非 OpenAI 官方产品。

**在线体验：<https://no3456bite.github.io/starledger-web/>**

## 主要功能

### 记账与整理

- 记录支出、收入、转账和借贷，支持分类、小类、账户、账本、商家、备注与标签。
- 支持多币种和手动汇率，人民币统计与原币金额各自保留。
- 支持账单编辑、删除、批量选择与批量修改。
- 账本名称、图标（包括 Emoji）和排序均可调整。

### 账户与资产

- 管理储值／现金、信用卡和借贷关系账户。
- 支持账户分组、组内排序、隐藏账户以及是否计入净资产。
- 通过余额校准生成可追溯的“余额调整”，计算资产、负债和净资产。

### 统计与查账

- 首页展示净资产、月度收支、预算和最近账单，概览指标可配置。
- 月／年页面提供每日收支日历、年度趋势、分类柱图与环图。
- 查账支持关键词、日期范围、账本、类型、币种、账户、分类、小类和标签筛选。
- 筛选分组可调整顺序，搜索结果可继续进入批量处理。

### 本地 OCR 文本解析

- `recognizer.js` 可解析常见中文支付账单的 OCR 文本，并生成待确认的结构化记账建议。
- 识别逻辑在浏览器本地运行，不上传截图文字，也不会绕过确认直接写入账本。
- 当前主要覆盖微信、支付宝、云闪付等常见账单文本；识别结果仍需人工核对。

### 多主账本与完整备份

- 同一浏览器内可保存并切换多个主账本。
- 桌面 Chrome／Edge 可通过 File System Access API 连接 StarLedger 工作区文件夹。
- 可导出单个账本 CSV，也可导出包含所有本地主账本、配置、关联关系和备份摘要的完整 ZIP。摘要记录备份设备、时间及各主账本笔数。
- 可把 ZIP 手动存入 WebDAV 客户端或网盘同步的文件夹，再在另一台设备读取。网页不直接连接 WebDAV 服务器。
- 导入前可查看备份内容，选择合并导入或覆盖恢复。已有本机数据时会先在当前浏览器建立一个恢复点；设置页可恢复导入前数据。
- 导入会检查 ZIP 文件结构、CRC、账单格式及摘要一致性；旧版无摘要的完整 ZIP 仍可读取。

手动跨设备流程：在设备 A 的“设置 → 数据与备份”填写设备名称并导出完整 ZIP；把 ZIP 放进你使用的同步文件夹；在设备 B 下载该 ZIP 后用“读取完整备份 ZIP”打开，检查设备、时间、账本和笔数，再选择合并或覆盖。两台设备有同名账本时，合并按账单 ID 和更新时间保留较新的账单；时间相同则以导入文件为准。同名账本的设置以导入文件为准，关联关系按更新时间选取。若曾在两端分别删除同一账单，建议先核对再导入，因为完整 ZIP 只包含当前可见账单。

## 数据与隐私

StarLedger 采用 local-first 架构：

- 账单、配置与关联关系的可用副本保存在浏览器 IndexedDB 中。
- GitHub Pages 只托管静态 HTML、CSS 和 JavaScript，没有 StarLedger 业务后端，也不保存用户账本。
- OCR 文本解析在本地完成，不调用在线识别服务。
- 工作区文件夹和完整 ZIP 是跨设备迁移、外部保存和灾难恢复的主要方式。

浏览器数据仍可能在清除网站数据、无痕模式结束或系统回收存储时丢失。本机恢复点也保存在浏览器里，不能代替外部 ZIP。清除账本或浏览器数据前，请先导出完整 ZIP。单独的 CSV 只包含账单流水，不包含账户配置、排序、预算和关联关系。

## 技术实现

项目使用原生 Web 技术，不依赖前端框架或打包器，可直接作为静态网站部署。

| 层 | 实现 |
| --- | --- |
| 页面与样式 | 原生 HTML/CSS、响应式布局、深浅色主题、移动端底部导航 |
| 应用核心 | 原生 JavaScript，负责状态、记账、统计、筛选、导入导出与 IndexedDB |
| 本地存储 | IndexedDB；localStorage 仅作为存储不可用时的应急回退 |
| 工作区 | File System Access API；按账单 ID 与更新时间合并 CSV 来源 |
| OCR 解析 | 独立的确定性本地解析器，不访问网络、不直接写账本 |
| 完整备份 | 自有轻量 ZIP 容器实现，支持 stored 导出、stored/deflate 导入和 CRC32 校验 |
| 离线能力 | Service Worker 预缓存运行资源，支持安装为 PWA |
| 移动兼容 | 针对 iPhone Safari browser-tab、visualViewport、地址栏和浮层生命周期的兼容层 |
| 持续集成 | GitHub Actions 执行 JavaScript 语法、构建不变量和 ZIP 编解码测试，通过后部署 Pages |

主要文件职责：

- `app.js`：账单数据、IndexedDB、工作区、页面渲染和核心业务流程。
- `recognizer.js`：OCR 文本的本地结构化解析。
- `ui-runtime.js`：页面切换、浮层、移动交互和浏览器兼容控制。
- `books-stats.js`：账本页与月／年统计控制。
- `ui-foundation.css`：共享视觉规范和响应式页面样式。
- `mobile-compat.css`：iPhone Safari 的最终兼容覆盖层。
- `backup-zip.js`：完整备份 ZIP 的创建、读取与校验。
- `sw.js`：离线资源缓存与版本更新。

更详细的维护边界见 [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)。AI 或 coding agent 修改项目前必须先阅读 [AGENTS.md](./AGENTS.md)。

## StarLedger 工作区格式

网页只识别以下固定文件，文件夹中的其他文件会被忽略：

- `<主账本>_mobile.csv`
- `<主账本>_手机主账本.csv`（旧版兼容）
- `<主账本>_scriptable.csv`
- `<主账本>_desktop.csv`
- `StarLedgerConfig.json`
- `StarLedgerRelations.json`

同一主账本的 mobile、scriptable 和 desktop CSV 会按账单 ID 与更新时间合并。

- `StarLedgerConfig.json` 保存多主账本配置、账户资料、预算、显示选项和排序。
- `StarLedgerRelations.json` 保存各主账本的账单关联关系。
- 完整 ZIP 还包含 `StarLedgerBackup.json`，记录导出设备、时间、账本和笔数；设备名称只保存在本机设置，不会覆盖另一台设备的名称。
- 完整 ZIP 与工作区使用同一套数据规则，因此配置和账单可以一并恢复。

## 浏览器差异

- 桌面 Chrome／Edge：支持连接文件夹并持续读写工作区。
- iPhone／iPad Safari：不支持 `showDirectoryPicker()`，可读取文件夹快照或导入完整 ZIP；之后的数据保存在浏览器本地，无法在后台持续写回 iCloud／网盘文件夹。
- 其他现代浏览器：核心记账、统计、IndexedDB 和 ZIP 备份可用；文件夹连接能力取决于浏览器是否实现 File System Access API。

## 本地运行与验证

项目没有安装依赖。请通过 HTTP 服务打开，不要直接双击 `index.html`：

```bash
cd starledger-web
python3 -m http.server 4173
```

然后访问 `http://127.0.0.1:4173/`。

提交前的基础校验：

```bash
node --check app.js
node --check ui-runtime.js
node --check books-stats.js
node --check recognizer.js
node --check sw.js
node scripts/validate-build.mjs
node scripts/test-backup-zip.cjs
```

## 部署与版本保护

- `main` 每次提交后由 GitHub Actions 自动校验并部署到 GitHub Pages。
- `rollback/pre-modern-ui-20261006`：现代 UI 改造前的回退点。
- `archive/web-v0.3-before-workspace-folder`：工作区文件夹改造前的 Web v0.3。
- `archive/scriptable-bridge-v0.1`：Safari + Scriptable Bridge 快照。
- `legacy/scriptable/`：旧 Core、Recognizer 和 SafariBridge 源码。
