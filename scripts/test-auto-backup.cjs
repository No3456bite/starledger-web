const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const start = source.indexOf("const AUTO_BACKUP_KEY=");
const end = source.indexOf('function showCloudSyncHelp(', start);
assert(start > 0 && end > start, 'automatic backup module is present');

const stored = new Map();
const nodes = {
  autoCloudBackup: { checked: false },
  autoCloudBackupStatus: { textContent: '', dataset: {} },
  localContentHash: { textContent: '' }
};
let localHash = 'A', remoteHash = 'A', remoteTag = 'v1', remoteExists = true;
let uploads = 0, pulls = 0, previews = 0, recoveries = 0, changeDuringUpload = false;
const context = {
  Date, JSON, Error, Object, console,
  BACKUP_MANIFEST_FILE: 'StarLedgerBackup.json',
  localStorage: {
    getItem: key => stored.get(key) ?? null,
    setItem: (key, value) => stored.set(key, value)
  },
  document: { hidden: false },
  $: selector => nodes[selector.slice(1)],
  setTimeout: () => 1,
  clearTimeout: () => {},
  toast: () => {},
  cloudSyncEndpoint: () => ({}),
  cloudSyncJson: async () => ({ exists: remoteExists, etag: remoteTag }),
  cloudSyncRequest: async (path, options = {}) => {
    if (path === '/backup' && options.method === 'PUT') {
      uploads++;
      remoteExists = true;
      remoteHash = localHash;
      remoteTag = 'v' + (Number(remoteTag.slice(1)) + 1);
      if (changeDuringUpload) {
        localHash = 'LATER';
        vm.runInContext('markAutoBackupDirty()', context);
      }
    }
    return { blob: async () => ({ size: 1 }) };
  },
  completeBackupEntries: async () => [
    { name: 'StarLedgerBackup.json', data: JSON.stringify({ contentHash: localHash }) }
  ],
  StarLedgerZip: { create: () => new Uint8Array([1]) },
  readCompleteBackup: async source => ({
    snapshot: { names: ['test'] },
    fileName: 'cloud.zip',
    contentHash: source instanceof Uint8Array ? localHash : remoteHash
  }),
  savePrefs: async () => {},
  saveCompleteImportRecovery: async () => { recoveries++; },
  showCompleteBackupPreview: () => { previews++; },
  stopAutoRefresh: () => {},
  applyWorkspaceSnapshot: async () => { localHash = remoteHash; pulls++; },
  folderHandle: null,
  pendingCompleteBackup: null,
  backupExportName: () => 'backup.zip',
  prefs: { mainName: 'test' }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);
const run = expression => vm.runInContext(expression, context);

(async () => {
  run('autoBackupReady=true;toggleAutoBackup(true)');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(run('autoBackupState.baseHash'), 'A', 'first connection adopts identical content');
  assert.equal(previews, 0, 'identical content never asks to merge');
  assert.equal(run('autoBackupPending()'), false, 'enabling does not invent an edit');

  localHash = 'B';
  run('markAutoBackupDirty()');
  await run('runAutoBackup()');
  assert.equal(uploads, 1, 'local-only change uploads');
  assert.equal(run('autoBackupState.baseHash'), 'B');
  assert.equal(run('autoBackupPending()'), false);

  remoteHash = 'C'; remoteTag = 'v3';
  await run('checkRemoteBackupOnOpen(true)');
  assert.equal(pulls, 1, 'remote-only change loads automatically');
  assert.equal(recoveries, 1, 'automatic load saves a recovery point');
  assert.equal(run('autoBackupState.baseHash'), 'C');

  localHash = 'D'; run('markAutoBackupDirty()');
  remoteHash = 'E'; remoteTag = 'v4';
  await run('checkRemoteBackupOnOpen(true)');
  assert.equal(pulls, 1, 'divergent changes do not replace local data');
  assert.equal(previews, 1, 'divergent changes offer a review');
  assert.match(nodes.autoCloudBackupStatus.textContent, /暂停/);

  run("autoBackupConflict='';autoBackupState.baseHash='C';autoBackupState.remoteVersion='etag:v3'");
  remoteHash = 'C'; remoteTag = 'v5';
  await run('checkRemoteBackupOnOpen(true)');
  assert.equal(run('autoBackupRemoteReady'), true, 'unchanged remote content permits pending local upload');
  await run('runAutoBackup()');
  assert.equal(uploads, 2);
  assert.equal(run('autoBackupState.baseHash'), 'D');

  remoteHash = 'D'; remoteTag = 'v7';
  await run('checkRemoteBackupOnOpen(true)');
  assert.equal(pulls, 1, 'a new ETag with identical content does not reload');
  assert.equal(previews, 1);

  remoteTag = '';
  await run('checkRemoteBackupOnOpen(true)');
  assert.equal(run('autoBackupState.baseHash'), 'D', 'content comparison works without ETag');
  assert.equal(previews, 1);

  localHash = 'F'; run('markAutoBackupDirty()');
  changeDuringUpload = true;
  await run('runAutoBackup()');
  assert.equal(run('autoBackupPending()'), true, 'an edit made during upload remains pending');
  changeDuringUpload = false;
  console.log('Automatic backup content-hash decisions passed.');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
