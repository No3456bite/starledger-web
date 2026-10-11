const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const start = source.indexOf("const AUTO_BACKUP_KEY=");
const end = source.indexOf('async function zipWorkspaceFiles(', start);
assert(start > 0 && end > start, 'auto backup module is present');

const stored = new Map();
const nodes = {
  autoCloudBackup: { checked: false },
  autoCloudBackupStatus: { textContent: '', dataset: {} }
};
let uploads = 0;
let changeDuringUpload = false;
let remoteTag = 'v1';
let pulls = 0;
let previews = 0;
let recoveryPoints = 0;
const encoder = new TextEncoder();
const localEntries = [
  { name: 'test_desktop.csv', data: 'id,amount\n1,5' },
  { name: 'StarLedgerConfig.json', data: JSON.stringify({ ledgers: { test: { theme: 'slate' } }, _starConfigUpdatedAt: 1 }) },
  { name: 'StarLedgerRelations.json', data: JSON.stringify({ ledgers: { test: { groups: [] } }, updatedAt: 'old' }) },
  { name: 'StarLedgerBackup.json', data: '{}' }
];
let remoteEntries = localEntries.map(entry => ({ name: entry.name, data: encoder.encode(entry.data) }));
const context = {
  Date, JSON, Error, Object, TextDecoder,
  SHARED_CONFIG_FILE: 'StarLedgerConfig.json',
  WORKSPACE_RELATIONS_FILE: 'StarLedgerRelations.json',
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
  cloudSyncJson: async () => ({ exists: true, etag: remoteTag }),
  cloudSyncRequest: async path => {
    if (path === '/backup' && vm.runInContext('autoBackupInFlight', context)) {
      uploads++;
      if (changeDuringUpload) vm.runInContext('markAutoBackupDirty()', context);
    }
    return { blob: async () => ({ size: 1 }) };
  },
  completeBackupEntries: async () => localEntries,
  StarLedgerZip: { create: () => new Uint8Array([1]), read: async () => remoteEntries },
  readCompleteBackup: async () => ({ snapshot: { names: ['test'] }, fileName: 'cloud.zip' }),
  savePrefs: async () => {},
  saveCompleteImportRecovery: async () => { recoveryPoints++; },
  downloadCloudBackup: async () => { previews++; },
  importCompleteBackup: async () => { previews++; },
  File: class {},
  stopAutoRefresh: () => {},
  applyWorkspaceSnapshot: async () => { pulls++; },
  folderHandle: null,
  backupExportName: () => 'backup.zip',
  prefs: { mainName: 'test' }
};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

(async () => {
  remoteEntries = remoteEntries.map(entry => entry.name === 'StarLedgerConfig.json'
    ? { ...entry, data: encoder.encode(JSON.stringify({ ledgers: { test: { theme: 'slate' } }, _starConfigUpdatedAt: 2 })) }
    : entry.name === 'StarLedgerRelations.json'
      ? { ...entry, data: encoder.encode(JSON.stringify({ ledgers: { test: { groups: [] } }, updatedAt: 'new' })) }
      : entry);
  assert.equal(await vm.runInContext('sameCloudBackupContent({})', context), true, 'generated timestamps do not create a conflict');
  remoteEntries = remoteEntries.map(entry => entry.name === 'test_desktop.csv'
    ? { ...entry, data: encoder.encode('id,amount\n1,6') } : entry);
  assert.equal(await vm.runInContext('sameCloudBackupContent({})', context), false, 'a changed bill creates a conflict');

  vm.runInContext('autoBackupReady=true;autoBackupState.remoteVersion="etag:v1";toggleAutoBackup(true)', context);
  await new Promise(resolve => setImmediate(resolve));
  vm.runInContext('autoBackupRemoteReady=true;autoBackupConflict="";autoBackupState.remoteVersion="etag:v1"', context);
  assert.equal(vm.runInContext('autoBackupPending()', context), false, 'enabling does not invent a local edit');
  assert.equal(uploads, 0, 'enabling only queues a backup');
  const first = vm.runInContext('autoBackupState.changeId', context);
  vm.runInContext('noteBackupWrite({csv:"same",prefs})', context);
  assert.equal(vm.runInContext('autoBackupState.changeId', context), first, 'opening an existing ledger is not a change');
  vm.runInContext('noteBackupWrite({csv:"changed",prefs:{mainName:"test"}})', context);
  assert.equal(vm.runInContext('autoBackupState.changeId', context), first + 1, 'saved bills queue a backup');

  changeDuringUpload = true;
  await vm.runInContext('runAutoBackup()', context);
  assert.equal(uploads, 1);
  assert.equal(vm.runInContext('autoBackupPending()', context), true, 'a later edit remains pending');
  changeDuringUpload = false;
  await vm.runInContext('runAutoBackup()', context);
  assert.equal(vm.runInContext('autoBackupPending()', context), false);
  assert.equal(uploads, 2);

  vm.runInContext('markAutoBackupDirty();toggleAutoBackup(false)', context);
  await vm.runInContext('runAutoBackup()', context);
  assert.equal(uploads, 2, 'disabled backup never uploads');

  vm.runInContext('autoBackupState.enabled=true;autoBackupState.savedId=autoBackupState.changeId;autoBackupLastCheck=0', context);
  remoteTag = 'v2';
  await vm.runInContext('checkRemoteBackupOnOpen(true)', context);
  assert.equal(pulls, 1, 'a newer remote backup loads when local data is clean');
  assert.equal(recoveryPoints, 1, 'automatic loading saves a local recovery point');
  assert.equal(vm.runInContext('autoBackupState.remoteVersion', context), 'etag:v2');
  vm.runInContext('markAutoBackupDirty()', context);
  remoteTag = 'v3';
  await vm.runInContext('checkRemoteBackupOnOpen(true)', context);
  assert.equal(pulls, 1, 'conflicting local edits stop automatic loading');
  assert.match(nodes.autoCloudBackupStatus.textContent, /暂停/);
  vm.runInContext('autoBackupState.remoteVersion="";autoBackupConflict=""', context);
  vm.runInContext('sameCloudBackupContent=async()=>true', context);
  await vm.runInContext('checkRemoteBackupOnOpen(true)', context);
  assert.equal(previews, 0, 'identical content needs no first-use review');
  assert.equal(vm.runInContext('autoBackupState.remoteVersion', context), 'etag:v3');
  vm.runInContext('sameCloudBackupContent=async()=>false;autoBackupState.remoteVersion=""', context);
  await vm.runInContext('checkRemoteBackupOnOpen(true)', context);
  assert.equal(previews, 1, 'divergent first-use data opens the import preview');
  await vm.runInContext('checkRemoteBackupOnOpen(true)', context);
  assert.equal(previews, 1, 'dismissed first-use review does not reopen on every focus');
  context.prefs.mainName = '';
  vm.runInContext('autoBackupState.remoteVersion="";autoBackupState.savedId=autoBackupState.changeId;autoBackupConflict=""', context);
  await vm.runInContext('checkRemoteBackupOnOpen(true)', context);
  assert.equal(pulls, 2, 'an empty device can load the cloud backup automatically');
  console.log('Automatic backup queue and upload tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
