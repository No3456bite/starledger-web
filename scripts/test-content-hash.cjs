const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');

const source = fs.readFileSync('app.js', 'utf8');
const hashStart = source.indexOf('async function backupContentHash(');
const hashEnd = source.indexOf('async function completeBackupEntries(', hashStart);
const parseStart = source.indexOf('function csvParse(');
const parseEnd = source.indexOf('function csvWrite(', parseStart);
const readStart = source.indexOf('async function readCompleteBackup(');
const readEnd = source.indexOf('function backupSummaryTime(', readStart);
assert(hashStart > 0 && parseStart > 0 && readStart > 0);

const context = {
  JSON, Date, Error, Object, Set, Map, TextEncoder, TextDecoder,
  crypto: webcrypto,
  COLS: ['id', 'amount'],
  SHARED_CONFIG_FILE: 'StarLedgerConfig.json',
  WORKSPACE_RELATIONS_FILE: 'StarLedgerRelations.json',
  BACKUP_MANIFEST_FILE: 'StarLedgerBackup.json'
};
vm.createContext(context);
vm.runInContext(source.slice(parseStart, parseEnd) + source.slice(hashStart, hashEnd), context);
const csv = rows => '\uFEFFid,amount\r\n' + rows.map(([id, amount]) => `"${id}","${amount}"`).join('\r\n') + '\r\n';
const entries = (rows, settings = { theme: 'dark' }, groups = [], stamp = 1) => [
  { name: 'test_desktop.csv', data: csv(rows) },
  { name: 'StarLedgerConfig.json', data: JSON.stringify({ ledgers: { test: settings }, _starConfigUpdatedAt: stamp }) },
  { name: 'StarLedgerRelations.json', data: JSON.stringify({ ledgers: { test: { groups } }, updatedAt: String(stamp) }) },
  { name: 'StarLedgerBackup.json', data: JSON.stringify({ createdAt: stamp }) }
];
const hash = data => { context.testEntries = data; return vm.runInContext('backupContentHash(testEntries)', context); };

(async () => {
  const original = entries([['1', '5'], ['2', '10']]);
  const code = await hash(original);
  assert.match(code, /^[0-9a-f]{64}$/);
  assert.equal(await hash(entries([['2', '10'], ['1', '5']], { theme: 'dark' }, [], 999)), code,
    'row order and generated backup timestamps do not change the content code');
  assert.notEqual(await hash(entries([['1', '6'], ['2', '10']])), code, 'a changed bill changes the code');
  assert.notEqual(await hash(entries([['1', '5'], ['2', '10']], { theme: 'light' })), code,
    'a changed setting changes the code');
  assert.notEqual(await hash(entries([['1', '5'], ['2', '10']], { theme: 'dark' }, [{ name: 'cash' }])), code,
    'changed relations change the code');

  const summary = { format: 'star-ledger-backup', version: 1, createdAt: new Date().toISOString(),
    activeLedger: 'test', ledgerCount: 1, recordCount: 2, ledgers: [{ name: 'test', records: 2 }] };
  context.zipWorkspaceFiles = async () => ({ contentEntries: original.slice(0, 3), manifest: { ...summary, contentHash: code } });
  context.parseWorkspaceFiles = async () => ({
    names: ['test'], active: 'test', configPresent: true, relationsPresent: true, warnings: [],
    ledgers: [{ name: 'test', counts: { total: 2 } }]
  });
  vm.runInContext(source.slice(readStart, readEnd), context);
  assert.equal((await vm.runInContext("readCompleteBackup({},'new.zip')", context)).contentHash, code);
  context.zipWorkspaceFiles = async () => ({ contentEntries: original.slice(0, 3), manifest: summary });
  assert.equal((await vm.runInContext("readCompleteBackup({},'old.zip')", context)).contentHash, code,
    'old backups without a content code remain readable');
  context.zipWorkspaceFiles = async () => ({ contentEntries: original.slice(0, 3),
    manifest: { ...summary, contentHash: '0'.repeat(64) } });
  await assert.rejects(() => vm.runInContext("readCompleteBackup({},'tampered.zip')", context), /内容码与账本内容不一致/);
  console.log('Backup content-code normalization and manifest validation passed.');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
