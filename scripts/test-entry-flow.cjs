const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

function functionBlock(source, start, end) {
  const from = source.indexOf(start), to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from, `missing ${start}`);
  return source.slice(from, to);
}

const ui = fs.readFileSync('ui-runtime.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

test('dark theme keeps the page edge black in browser tabs and standalone', () => {
  const metas = [{content: ''}, {content: ''}];
  const root = {dataset: {}, style: {}};
  const context = {prefs: {appearance: 'dark'}, systemScheme: {matches: true}, document: {documentElement: root, querySelectorAll: () => metas}};
  vm.createContext(context);
  vm.runInContext(functionBlock(app, 'function applyTheme()', 'if(systemScheme.addEventListener)'), context);
  vm.runInContext('applyTheme()', context);
  assert.equal(root.style.backgroundColor, '#000000');
  assert.ok(metas.every(meta => meta.content === '#000000'));
});

test('Home and Search render the same bulk actions and select visible rows on the active page', () => {
  const bar = {innerHTML: ''};
  const checks = ['first', 'second'].map(id => ({dataset: {check: id}, closest: () => ({classList: {toggle() {}}})}));
  const classes = new Map();
  const context = {
    selection: new Set(['first', 'second']), section: 'home',
    window: {__slSelectionRelationLabel: () => '关联'},
    document: {
      body: {classList: {toggle: (name, value) => classes.set(name, value)}},
      querySelectorAll: selector => selector === '.rowcheck' || selector === '#pageBody .rowcheck' ? checks : []
    },
    $: () => bar
  };
  vm.createContext(context);
  vm.runInContext(functionBlock(app, 'function visibleSelectionChecks()', 'function toggleSelection('), context);
  vm.runInContext('renderSelection()', context);
  for (const action of ['selectAllVisible', 'cancelSelection', 'bulkEditSelection', 'rc12RelateSelection', 'deleteSelection']) {
    assert.match(bar.innerHTML, new RegExp(`id="${action}"`));
  }
  assert.equal(classes.get('selection-all-visible'), true);
  context.section = 'search';
  context.document.querySelectorAll = selector => selector === '.rowcheck' || selector === '#searchResults .rowcheck' ? checks : [];
  vm.runInContext('renderSelection()', context);
  assert.match(bar.innerHTML, /id="bulkEditSelection"/);
  assert.equal(classes.get('selection-all-visible'), true);
});

test('adding a new entry moves directly to the new card', () => {
  const task = {drafts: [{key: 'first', record: {amount: '5', account: '零钱', book: '日常'}}], active: 0};
  let renders = 0;
  const context = {rc12Task: task, rc12CaptureDraft() {}, rc12NewDraft: record => ({key: 'next', record}), rc12RenderTask() {renders++}, unique: () => []};
  vm.createContext(context);
  vm.runInContext(functionBlock(ui, 'function rc12AddDraft()', 'function rc12DeleteCurrentDraft()'), context);
  vm.runInContext('rc12AddDraft()', context);
  assert.equal(task.drafts.length, 2);
  assert.equal(task.active, 1);
  assert.equal(task.drafts[1].record.amount, '');
  assert.equal(renders, 1);
});

test('picking an old bill establishes the relation and opens its card', () => {
  const task = {drafts: [{key: 'new', existingId: '', relationRole: 'auto'}], active: 0, groups: [], detached: new Set()};
  let renders = 0, closes = 0, message = '';
  const context = {rc12Task: task, rows: [{id: 'old', amount: '12'}], rc12CaptureDraft() {}, rc12TaskGroupForKey: key => task.groups.find(group => group.members.includes(key)), rc12NewDraft: record => ({key: 'old-key', existingId: record.id, relationRole: 'auto'}), rc12Uid: () => 'group-1', rc21CloseAccountOverlay() {closes++}, rc12RenderTask() {renders++}, toast: text => {message = text}};
  vm.createContext(context);
  vm.runInContext(functionBlock(ui, 'function rc12AddExistingBills(', 'function rc12ApplyRelationForm('), context);
  assert.equal(vm.runInContext("rc12AddExistingBills(['old'])", context), 1);
  assert.equal(task.active, 1);
  assert.deepEqual([...task.groups[0].members], ['new', 'old-key']);
  assert.equal(renders, 1);
  assert.equal(closes, 1);
  assert.match(message, /保存后生效/);
});

test('a single entry opens the bill picker before the relation manager', () => {
  const task = {drafts: [{key: 'new'}], active: 0};
  let picker = 0, manager = 0;
  const context = {rc12Task: task, rc12TaskGroupForKey: () => null, rc12OpenExistingPicker() {picker++}, rc12OpenRelationManager() {manager++}};
  vm.createContext(context);
  vm.runInContext(functionBlock(ui, 'function rc12OpenRelationPickerOrManager()', 'function rc12OpenRelationManager()'), context);
  vm.runInContext('rc12OpenRelationPickerOrManager()', context);
  assert.equal(picker, 1);
  task.drafts.push({key: 'second'});
  vm.runInContext('rc12OpenRelationPickerOrManager()', context);
  assert.equal(manager, 1);
});

test('first keypad digit replaces an amount, while later digits continue it', () => {
  const input = {value: '435.01', blur() {}};
  const back = {classList: {remove() {}, add() {}}};
  const context = {replaceAmountOnNextKey: true, $: selector => selector === '#amountInput' ? input : selector === '.entryback' ? back : null, normalizeAmountExpression: value => value, setAmountExpression: value => {input.value = value}, amountSegment: value => value.split(/[+−×÷]/).at(-1), toast() {}};
  vm.createContext(context);
  vm.runInContext(functionBlock(app, 'function pressAmountKey(v)', 'function reconcileForm('), context);
  vm.runInContext("pressAmountKey('2'); pressAmountKey('5')", context);
  assert.equal(input.value, '25');
  context.replaceAmountOnNextKey = true; // Tapping a note or another control starts a new amount sequence.
  vm.runInContext("pressAmountKey('8')", context);
  assert.equal(input.value, '8');
});

test('complete backup falls back to browser download when the file picker is blocked', async () => {
  let clicked = false, confirmed = '';
  const showSaveFilePicker = async () => {const error = Error('unsupported context'); error.name = 'SecurityError'; throw error};
  const context = {
    window: {showSaveFilePicker}, showSaveFilePicker,
    document: {createElement: () => ({click() {clicked = true}, remove() {}}), body: {appendChild() {}}},
    URL: {createObjectURL: () => 'blob:test', revokeObjectURL() {}},
    setTimeout() {},
    showExportConfirm: name => {confirmed = name}
  };
  vm.createContext(context);
  vm.runInContext(functionBlock(app, 'async function saveBackupBlob(', 'async function exportCompleteBackup('), context);
  await vm.runInContext("saveBackupBlob({}, 'test.zip')", context);
  assert.equal(clicked, true);
  assert.equal(confirmed, 'test.zip');
});

test('last modification time updates for settings, but a backup alone does not change it', async () => {
  let dirty = 0;
  const context = {prefs: {mainName: '测试'}, native: false, folderHandle: null, put: async () => {}, applyTheme() {}, render() {}, markAutoBackupDirty() {dirty++}};
  vm.createContext(context);
  vm.runInContext(functionBlock(app, 'async function savePrefs(', 'function nativeCommand('), context);
  await vm.runInContext("savePrefs({budgets: {'2026-10': 2500}})", context);
  const changedAt = context.prefs.lastChangeAt;
  assert.ok(Number.isFinite(changedAt) && changedAt > 0);
  await vm.runInContext('savePrefs({lastExportAt: 12345, lastExportName: "test.zip"})', context);
  assert.equal(context.prefs.lastChangeAt, changedAt);
  assert.equal(dirty, 1);
});
