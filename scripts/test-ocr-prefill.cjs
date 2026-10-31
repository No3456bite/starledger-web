const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const from = source.indexOf('const OCR_PENDING_KEY=');
const to = source.indexOf('function ocrFieldValue(', from);
const openFrom = source.indexOf('function openPendingPrefill(');
const openTo = source.indexOf('function showExportConfirm(', openFrom);
assert(from > 0 && to > from && openFrom > 0 && openTo > openFrom);

const saved = new Map();
const storage = {
  getItem: key => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
  removeItem: key => saved.delete(key)
};
const text = '支付成功\n-32.30\n支付时间 2026年10月31日17:07:56';
let hash = '#ocr=' + encodeURIComponent(text), opened = 0, entry = false;
const context = {
  Date, JSON, console, sessionStorage: storage,
  location: {get hash() { return hash; }, pathname: '/', search: ''},
  history: {replaceState() { hash = ''; }},
  prefs: {mainName: 'ledger'}, pendingPrefill: '', ocrOpenGeneration: 0,
  window: {}, document: {body: {classList: {remove() {}}}},
  $: selector => selector === '#entry' ? (entry ? {} : null) : {innerHTML: ''},
  recognizeOCRText: input => ({records: [{amount: '32.3', text: input}], warnings: []}),
  toast() {}
};
vm.createContext(context);
vm.runInContext(source.slice(from, to) + source.slice(openFrom, openTo), context);
const run = code => vm.runInContext(code, context);

run('pendingPrefill=consumeHashPrefill()');
assert.equal(hash, '', 'the OCR text is removed from the visible URL');
assert.equal(run('restorePendingOCRPrefill().text'), text, 'the pending text survives a reload');
run('openPendingPrefill()');
assert.equal(opened, 0, 'do not use the old entry form before the task UI is ready');
assert.equal(run('pendingPrefill.text'), text, 'the pending OCR is not discarded early');
context.window.entryTaskOpenFromOCR = result => { opened++; entry = true; assert.equal(result.records[0].amount, '32.3'); };
run('openPendingPrefill()');
assert.equal(opened, 1);
assert.equal(run('pendingPrefill'), '', 'a successful open consumes only the in-memory request');
assert.equal(run('restorePendingOCRPrefill().text'), text, 'reload recovery remains until save or explicit close');
run('clearPendingOCRPrefill()');
assert.equal(run('restorePendingOCRPrefill()'), '', 'explicit completion clears the recovery request');

console.log('OCR URL handoff and reload recovery passed.');
