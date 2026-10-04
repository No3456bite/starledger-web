// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: teal; icon-glyph: exchange-alt;
// StarLedger Safari Bridge v0.1

const CORE_MODULE = 'StarLedger/Scripts/Versions/StarLedgerCore_v1.1.0-rc14';
const fm = FileManager.iCloud();
const docs = fm.documentsDirectory();
const dataRoot = fm.joinPath(fm.joinPath(docs, 'StarLedger'), 'Data');
if (!fm.fileExists(dataRoot)) fm.createDirectory(dataRoot, true);
const bridgeCfgPath = fm.joinPath(dataRoot, 'StarLedgerSafariBridge.json');
const core = importModule(CORE_MODULE);

function readBridgeConfig() {
  try { return JSON.parse(fm.readString(bridgeCfgPath)); } catch (_) { return {}; }
}
function cleanFrontendURL(value) {
  let s = String(value || '').trim();
  if (!/^https:\/\//i.test(s)) return '';
  return s.split('#')[0];
}
function saveFrontendURL(value) {
  let url = cleanFrontendURL(value);
  if (!url) return '';
  let cfg = readBridgeConfig();
  fm.writeString(bridgeCfgPath, JSON.stringify({ ...cfg, frontendUrl: url, updatedAt: new Date().toISOString() }, null, 2));
  return url;
}
function shortcutText() {
  let p = args.shortcutParameter;
  if (typeof p === 'string' && p.trim()) return p;
  if (Array.isArray(p)) return p.map(x => String(x ?? '')).join('\n');
  if (args.plainTexts && args.plainTexts.length) return args.plainTexts.join('\n');
  return '';
}
function returnURL(q) {
  return saveFrontendURL(q.return) || cleanFrontendURL(readBridgeConfig().frontendUrl);
}
function withHash(base, pairs) {
  if (!base) return '';
  let hash = Object.entries(pairs).map(([k,v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v ?? ''))).join('&');
  return base.split('#')[0] + '#' + hash;
}
async function goBack(base, pairs) {
  let url = withHash(base, pairs);
  if (url) Safari.open(url);
}
async function alertError(message) {
  let a = new Alert(); a.title = 'StarLedger Safari Bridge'; a.message = String(message || '未知错误'); a.addAction('知道了'); await a.presentAlert();
}

async function main() {
  let q = args.queryParameters || {};
  let input = shortcutText();
  let action = String(q.action || (input ? 'ocr' : 'ping'));
  let front = returnURL(q);

  if (action === 'ping') {
    if (!front) throw Error('没有 Safari 前端地址。请从 StarLedger Safari 页面点击连接。');
    await goBack(front, { 'sl-bridge': 'connected', t: Date.now() });
    return;
  }

  if (action === 'applyClipboard') {
    if (!front) throw Error('没有 Safari 前端地址');
    let raw = Pasteboard.pasteString();
    if (!raw) throw Error('剪贴板里没有待同步数据');
    let envelope;
    try { envelope = JSON.parse(raw); } catch (_) { throw Error('剪贴板中的同步数据不是有效 JSON'); }
    let result = await core.bridgeApplyQueue(envelope);
    await goBack(front, { 'sl-sync': 'ok', batch: result.batchId || '', count: result.count || 0, rev: result.revision || '', t: Date.now() });
    return;
  }

  if (action === 'snapshot') {
    if (!front) throw Error('没有 Safari 前端地址');
    let snap = await core.bridgeSnapshot(String(q.mainName || ''));
    Pasteboard.copyString(JSON.stringify(snap));
    await goBack(front, { 'sl-snapshot-ready': '1', rev: snap.revision || '', t: Date.now() });
    return;
  }

  if (action === 'ocr') {
    if (!input) throw Error('没有收到 OCR 文本。快捷指令应把“提取的文本”作为运行脚本的输入。');
    if (!front) throw Error('尚未连接 Safari 前端。请先在 Safari StarLedger 中点击一次连接。');
    let payload = await core.bridgeRecognizeOCR(input, String(q.mainName || ''));
    let json = JSON.stringify(payload), encoded = encodeURIComponent(json);
    if (encoded.length <= 6000) {
      Safari.open(front.split('#')[0] + '#sl-ocr=' + encoded + '&t=' + Date.now());
    } else {
      Pasteboard.copyString(json);
      await goBack(front, { 'sl-ocr-clipboard': '1', t: Date.now() });
    }
    return;
  }

  throw Error('不支持的 Bridge 操作：' + action);
}

try { await main(); }
catch (e) {
  let q = args.queryParameters || {}, front = returnURL(q), msg = String(e && e.message || e);
  if (front) await goBack(front, { 'sl-error': msg.slice(0, 180), t: Date.now() });
  else await alertError(msg);
}
Script.complete();