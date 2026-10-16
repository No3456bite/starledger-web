const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('ui-runtime.js', 'utf8');
const start = source.indexOf('function rc12BudgetChoice(');
const end = source.indexOf('async function rc12ReadRelationsDesktop(', start);
assert.ok(start >= 0 && end > start, 'budget helpers must stay together');
const code = source.slice(start, end);

function bill(id, type, amount, budgetEffect, date = '2026-10-15 12:00:00') {
  return {id, type, amount, date, extras: budgetEffect ? JSON.stringify({budgetEffect}) : ''};
}

function budget(rows, groups = []) {
  const sandbox = {
    rows,
    groups,
    cnyAmount: row => Number(row.amount),
    rc12ParseExtras: row => JSON.parse(row.extras || '{}'),
    rc12GroupForBill: id => groups.find(group => group.members.some(member => member.id === id)) || null,
    rc12GroupRole: (group, id) => group.members.find(member => member.id === id)?.role || 'auto'
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return vm.runInContext('rc12BudgetSpent(rows)', sandbox);
}

test('linked freelance deposit and final payment never increase remaining budget', () => {
  const rows = [bill('spending', '支出', 876.59), bill('fee', '支出', 3),
    bill('deposit', '收入', 800), bill('final', '收入', 200), bill('reward', '收入', 50)];
  const groups = [{members: [{id: 'deposit', role: 'rebate'}, {id: 'final', role: 'normal'}, {id: 'fee', role: 'fee'}]},
    {members: [{id: 'reward', role: 'rebate'}, {id: 'spending', role: 'expense'}]}];
  assert.equal(budget(rows, groups), 879.59);
  assert.equal(Number((2500 - budget(rows, groups)).toFixed(2)), 1620.41);
});

test('only explicit linked offsets reduce spending and are capped at their purchase', () => {
  const rows = [bill('purchase', '支出', 60), bill('refund', '收入', 40, 'offset'),
    bill('extra-refund', '收入', 50, 'offset')];
  const groups = [{members: [{id: 'purchase', role: 'expense'}, {id: 'refund', role: 'refund'},
    {id: 'extra-refund', role: 'rebate'}]}];
  assert.equal(budget(rows), 60, 'unlinked income cannot offset spending');
  assert.equal(budget(rows, groups), 0, 'refunds cannot create a negative expense');
  assert.equal(budget([rows[0], rows[1]], groups), 20);
  assert.equal(budget([rows[1]], groups), 0, 'a refund alone cannot inflate another month');
});

test('excluded expense and fee are not eligible purchase offsets', () => {
  const rows = [bill('excluded', '支出', 100, 'none'), bill('fee', '支出', 3),
    bill('income', '收入', 80, 'offset')];
  const groups = [{members: [{id: 'excluded', role: 'expense'}, {id: 'fee', role: 'fee'},
    {id: 'income', role: 'refund'}]}];
  assert.equal(budget(rows, groups), 3);
});

test('legacy transfer role still excludes its expense until explicitly overridden', () => {
  const group = [{members: [{id: 'transfer', role: 'transfer'}, {id: 'other', role: 'normal'}]}];
  assert.equal(budget([bill('transfer', '支出', 100), bill('other', '收入', 100)], group), 0);
  assert.equal(budget([bill('transfer', '支出', 100, 'expense'), bill('other', '收入', 100)], group), 100);
});

test('budget choice persists inside existing extras without replacing other metadata', () => {
  const sandbox = {rc12ParseExtras: row => {try {return JSON.parse(row.extras || '{}')} catch {return {}}}};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  sandbox.record = {type: '收入', extras: JSON.stringify({fx: {rate: 7}, relation: 'old'})};
  const updated = vm.runInContext('rc12SetBudgetChoice(record, "offset")', sandbox);
  assert.deepEqual(JSON.parse(updated.extras), {fx: {rate: 7}, relation: 'old', budgetEffect: 'offset'});
  sandbox.record = {type: '收入', extras: 'older free text'};
  assert.deepEqual(JSON.parse(vm.runInContext('rc12SetBudgetChoice(record, "none")', sandbox).extras),
    {legacy: 'older free text', budgetEffect: 'none'});
});
