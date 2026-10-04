# StarLedger Web

当前主线：纯 Web App（local-first）。当前网页版本：Web v0.4 · rc13.4。

## 数据架构

- IndexedDB 保存当前设备上的可用副本，并按“主账本”分别缓存账单、配置与关联关系。
- StarLedger 工作区文件夹是外部数据交换/备份位置。
- GitHub Pages 只托管 HTML/CSS/JavaScript，不保存用户账本。
- OCR 暂未迁移到 Web 主线，后续单独处理。

## StarLedger 工作区固定格式

网页只识别以下文件，文件夹内其他文件全部忽略：

- `<主账本>_mobile.csv`
- `<主账本>_手机主账本.csv`（旧版兼容）
- `<主账本>_scriptable.csv`
- `<主账本>_desktop.csv`
- `StarLedgerConfig.json`
- `StarLedgerRelations.json`

同一个主账本的 mobile / scriptable / desktop CSV 会按账单 ID 与更新时间合并。

`StarLedgerConfig.json` 负责账户资料、账户校准、预算、显示与排序设置；Web v0.4 支持多主账本配置，并兼容旧版单主账本配置。

`StarLedgerRelations.json` 保留各主账本的账单关联关系。

## 多主账本

选择工作区后，网页会读取其中所有符合固定命名规则的主账本。存在多个主账本时，可从页面顶部或设置页切换当前展示的主账本。

## 浏览器文件夹能力

支持 `showDirectoryPicker()` 的桌面浏览器可以把工作区作为持续读写位置，账单和配置变化会写回固定工作区。

iPhone/iPad Safari 当前不支持 `showDirectoryPicker()`，因此只能通过目录选择读取工作区快照；读取后的数据仍保存在浏览器本地。Safari 不能在后台持续写回已选择的 iCloud/网盘文件夹。

## 当前测试方式

https://no3456bite.github.io/starledger-web/

main 分支每次提交后会由 GitHub Actions 自动部署到 Pages。

## 版本保护

- `archive/web-v0.3-before-workspace-folder`：工作区文件夹改造前的 Web v0.3。
- `archive/scriptable-bridge-v0.1`：Safari + Scriptable Bridge 快照。
- `legacy/scriptable/`：旧 Core / Recognizer / SafariBridge 源码。
