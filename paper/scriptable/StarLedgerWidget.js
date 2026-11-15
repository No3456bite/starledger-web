// Variables used by Scriptable.
// icon-color: green; icon-glyph: chart-pie;
// StarLedger Widget v1 — small / medium. No account credentials in this file.
// Layout reference: https://developer.apple.com/design/human-interface-guidelines/widgets
// Run in Scriptable once to paste the pairing JSON generated in StarLedger Settings.

const KEY = 'starledger.widget.v1.' + Script.name();
const fm = FileManager.local();
const ink = Color.dynamic(new Color('#171719'), new Color('#F5F5F7'));
const muted = Color.dynamic(new Color('#6C6C70'), new Color('#B0B0B7'));
const accent = Color.dynamic(new Color('#526958'), new Color('#A6C3AD'));
const red = Color.dynamic(new Color('#B43D3D'), new Color('#FF9999'));
let settings = Keychain.contains(KEY) ? JSON.parse(Keychain.get(KEY)) : null;

function validateSettings(value) {
  if (!value || !/^https:\/\/[^\s/@?#:]+(?::\d+)?\/widget$/.test(value.endpoint || '') || !/^[a-f0-9]{64}$/.test(value.token || '')) throw Error('连接配置无效，请从星账本设置重新生成并复制。');
  if (!/^https:\/\/[^\s/@?#]+(?:\/[^\s?#]*)?$/.test(value.siteUrl || '')) throw Error('网页地址无效。');
  return value;
}
async function configure() {
  const a = new Alert(); a.title = '连接星账本'; a.message = '粘贴网页「设置 → 数据与备份 → iPhone 桌面小组件」生成的连接配置。';
  a.addTextField('连接配置 JSON', ''); a.addAction('连接'); a.addCancelAction('取消');
  if (await a.presentAlert() < 0) return false;
  const value = validateSettings(JSON.parse(a.textFieldValue(0).trim()));
  value.cacheId = UUID.string();
  const data = await fetchSummary(value);
  const ledger = new Alert(); ledger.title = '显示哪个主账本？';
  data.ledgers.forEach(l => ledger.addAction(l.name)); ledger.addCancelAction('取消');
  const i = await ledger.presentSheet(); if (i < 0) return false;
  value.ledger = data.ledgers[i].name;
  const metric = new Alert(); metric.title = '主金额'; metric.message = '净资产扣除负债；总资产显示计入汇总的正资产。';
  metric.addAction('净资产（推荐）'); metric.addAction('总资产'); metric.addCancelAction('取消');
  const choice = await metric.presentSheet(); if (choice < 0) return false;
  value.metric = choice === 1 ? 'assets' : 'net';
  Keychain.set(KEY, JSON.stringify(value));
  if (settings && settings.cacheId) { const old = cachePath(settings); if (fm.fileExists(old)) fm.remove(old); }
  settings = value; writeCache(data); return true;
}
function cachePath(value = settings) { return fm.joinPath(fm.documentsDirectory(), 'starledger-widget-' + value.cacheId + '.json'); }
function validateSummary(data) {
  if (!data || data.format !== 'starledger-widget' || data.version !== 1 || !Array.isArray(data.ledgers) || !data.ledgers.length || !Number.isFinite(Date.parse(data.backedUpAt))) throw Error('摘要格式无效，请更新网页、Worker 和脚本。');
  for (const l of data.ledgers) {
    if (typeof l.name !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(l.period && l.period.end || '') || !/^\d{4}-\d{2}-\d{2}$/.test(l.period && l.period.start || '') || !/^\d{4}-\d{2}$/.test(l.period.label || '')) throw Error('账期格式无效。');
    for (const key of ['net', 'assets', 'budget', 'budgetLeft', 'expense', 'budgetSpent']) if (l[key] !== null && (typeof l[key] !== 'number' || !Number.isFinite(l[key]))) throw Error('金额格式无效。');
  }
  return data;
}
async function fetchSummary(value) {
  const req = new Request(value.endpoint); req.headers = {Authorization: 'Bearer ' + value.token}; req.timeoutInterval = 20;
  const text = await req.loadString(), status = req.response.statusCode;
  if (status !== 200) {
    const e = Error(status === 401 ? '连接已失效，请重新配置' : status === 404 ? '未找到摘要，请更新 Worker 并备份' : status === 409 ? '请在网页立即备份并更新' : '暂时无法读取云备份');
    e.noCache = status === 401 || status === 403; throw e;
  }
  return validateSummary(JSON.parse(text));
}
function writeCache(data) { try { fm.writeString(cachePath(), JSON.stringify(data)); } catch (_) {} }
async function loadSummary() {
  try { const data = await fetchSummary(settings); writeCache(data); return {data, cached: false}; }
  catch (e) {
    if (e.noCache) { if (fm.fileExists(cachePath())) fm.remove(cachePath()); throw e; }
    if (fm.fileExists(cachePath())) { try { return {data: validateSummary(JSON.parse(fm.readString(cachePath()))), cached: true}; } catch (_) {} }
    throw e;
  }
}
function text(parent, value, size = 12, color = ink, weight = 'regular') {
  const t = parent.addText(String(value)); t.font = weight === 'bold' ? Font.boldSystemFont(size) : weight === 'medium' ? Font.mediumSystemFont(size) : Font.systemFont(size);
  t.textColor = color; t.lineLimit = 1; t.minimumScaleFactor = 0.65; return t;
}
function money(n, compact = false) {
  if (n === null) return '待核实';
  if (compact && Math.abs(n) >= 1000000) return '¥' + (n / 10000).toFixed(1) + '万';
  return '¥' + n.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 2});
}
function row(parent, label, value, color = ink, size = 12) {
  const r = parent.addStack(); r.centerAlignContent(); text(r, label, size, muted); r.addSpacer(6); const t = text(r, value, size, color, 'medium'); t.rightAlignText();
}
function stamp(iso) { const f = new DateFormatter(); f.dateFormat = 'MM/dd HH:mm'; return f.string(new Date(iso)); }
function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function base() { const w = new ListWidget(); w.setPadding(14, 14, 14, 14); w.backgroundColor = Color.dynamic(new Color('#F4F4F7'), new Color('#242426')); w.refreshAfterDate = new Date(Date.now() + 60 * 60 * 1000); if (settings) w.url = settings.siteUrl; return w; }
function makeWidget(data, cached, family) {
  const w = base(), small = family !== 'medium';
  const l = data.ledgers.find(l => l.name === settings.ledger);
  if (!l) throw Error('备份中没有此账本，请重新运行脚本选择');
  const old = today() >= l.period.end || today() < l.period.start;
  const label = settings.metric === 'assets' ? '总资产' : '净资产';
  const title = w.addStack(); text(title, l.name, 11, accent, 'medium'); title.addSpacer(5); text(title, (old ? '旧 ' : '') + l.period.label.slice(5) + '月', 10, old ? red : muted);
  w.addSpacer(small ? 6 : 10);
  const area = small ? w : w.addStack();
  const left = small ? area : area.addStack(); if (!small) left.layoutVertically();
  text(left, label, 11, muted); text(left, money(l[settings.metric || 'net'], small), small ? 26 : 30, ink, 'bold');
  let right = left;
  if (!small) { area.addSpacer(20); right = area.addStack(); right.layoutVertically(); right.addSpacer(1); }
  else w.addSpacer(5);
  row(right, '预算', l.budget === null ? '未设置' : money(l.budget, small), ink, small ? 11 : 12); right.addSpacer(3);
  row(right, '支出', l.expenseUnknown ? '待换算' : money(l.expense, small), ink, small ? 11 : 12);
  if (!small) {
    right.addSpacer(3); row(right, '剩余', l.budget === null ? '未设置' : l.budgetUnknown ? '待换算' : money(l.budgetLeft), l.budgetLeft < 0 ? red : accent);
    if (l.budget > 0 && !l.budgetUnknown) {
      right.addSpacer(8); const progress = right.addStack(); progress.size = new Size(122, 4); progress.backgroundColor = Color.dynamic(new Color('#DDDDE2'), new Color('#48484D')); progress.cornerRadius = 2;
      const width = Math.max(0, Math.min(1, l.budgetSpent / l.budget)) * 122;
      if (width > 0) { const fill = progress.addStack(); fill.size = new Size(width, 4); fill.backgroundColor = l.budgetLeft < 0 ? red : accent; fill.cornerRadius = 2; }
      progress.addSpacer();
    }
  }
  w.addSpacer();
  text(w, (cached ? '缓存 · ' : '备份 ') + stamp(data.backedUpAt), 9, muted);
  if (old && !small) text(w, '旧账期 ' + l.period.label + ' · 请在网页备份', 10, red);
  return w;
}
function errorWidget(message) { const w = base(); text(w, '星账本', 13, accent, 'medium'); w.addSpacer(); const t = text(w, message, 13); t.lineLimit = 4; w.addSpacer(); text(w, '在 Scriptable 运行脚本设置', 10, muted); return w; }
async function main() {
  let family = config.widgetFamily || 'small';
  if (!config.runsInWidget) {
    if (!settings) { if (!await configure()) return; }
    else {
      const menu = new Alert(); menu.title = '星账本小组件'; menu.message = '预览会读取最后一次云备份，不会上传或修改账本。';
      menu.addAction('刷新并预览小号'); menu.addAction('刷新并预览中号'); menu.addAction('重新配置 / 切换账本'); menu.addCancelAction('取消');
      const choice = await menu.presentSheet(); if (choice < 0) return;
      if (choice === 2 && !await configure()) return;
      family = choice === 1 ? 'medium' : 'small';
    }
  }
  let widget;
  try { if (!settings) throw Error('请先连接星账本'); validateSettings(settings); const result = await loadSummary(); widget = makeWidget(result.data, result.cached, family); }
  catch (e) { widget = errorWidget(e.message); }
  if (config.runsInWidget) Script.setWidget(widget);
  else if (family === 'medium') await widget.presentMedium(); else await widget.presentSmall();
}
try { await main(); } catch (e) { if (config.runsInWidget) Script.setWidget(errorWidget(e.message)); else { const a = new Alert(); a.title = '尚未完成设置'; a.message = e.message; a.addAction('好'); await a.presentAlert(); } }
Script.complete();
