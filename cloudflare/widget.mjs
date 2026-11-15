import {readZip} from '../paper/domain/backup.js';

// A domain-separated capability: it cannot authenticate to /backup or /widget-config.
export async function widgetToken(secret) {
  const bytes = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', bytes.encode(secret), {name: 'HMAC', hash: 'SHA-256'}, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, bytes.encode('starledger:widget:read:v1')))].map(n => n.toString(16).padStart(2, '0')).join('');
}
export async function readWidgetBackup(response) {
  const max = 20 * 1024 * 1024;
  if (Number(response.headers.get('Content-Length')) > max) throw Error('备份超过小组件的 20 MiB 读取限制');
  const reader = response.body.getReader(), chunks = []; let size = 0;
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => { reader.cancel().catch(() => {}); reject(Error('读取云备份超时，请稍后重试')); }, 12000); });
  try {
    while (true) {
      const {done, value} = await Promise.race([reader.read(), timeout]); if (done) break;
      size += value.length;
      if (size > max) { await reader.cancel(); throw Error('备份超过小组件的 20 MiB 读取限制'); }
      chunks.push(value);
    }
  } finally { clearTimeout(timer); }
  const bytes = new Uint8Array(size); let at = 0;
  for (const chunk of chunks) { bytes.set(chunk, at); at += chunk.length; }
  const task = await readZip(bytes, {maxUncompressed: max}), widget = task.manifest?.widget;
  if (widget?.format !== 'starledger-widget' || widget.version !== 1 || !Array.isArray(widget.ledgers) || !widget.ledgers.length || !Number.isFinite(Date.parse(widget.backedUpAt))) throw Error('此备份还没有小组件摘要，请在新版星账本点“立即备份并更新”');
  return widget;
}
