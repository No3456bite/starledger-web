# StarLedger Web

当前主线：纯 Web App（local-first）。当前网页版本：Web v0.3 · rc13.4。

## 数据架构

- 账单、设置、账户、预算、关联关系：保存在浏览器本地 IndexedDB。
- localStorage：仅作为本地存储失败时的后备。
- GitHub Pages：只托管 HTML/CSS/JavaScript，不保存用户账本。
- CSV：导入、导出和恢复用的可移植格式。支持一次选择多个 CSV，也支持从文件夹递归导入。
- OCR：暂未迁移到 Web 主线，后续单独处理。

## 当前测试方式

打开：

https://no3456bite.github.io/starledger-web/

main 分支每次提交后会由 GitHub Actions 自动部署到 Pages。正常功能测试不需要再手动传 HTML 文件。

## 版本保护

- archive/scriptable-bridge-v0.1：切换纯 Web 主线前的 Safari + Scriptable Bridge 快照。
- legacy/scriptable/：保留 Core / Recognizer / SafariBridge 源码，便于回退和参考。

## 数据安全提示

当前主数据只在用户浏览器本地。主动清除该网站的数据会删除本地账本，因此应定期导出完整 CSV 备份。
