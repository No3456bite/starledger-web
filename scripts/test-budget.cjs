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

test('income stays outside budget in expense plus income and income plus income groups', () => {
  const rows = [bill('spending', '支出', 876.59), bill('fee', '支出', 3),
    bill('deposit', '收入', 800, 'offset'), bill('final', '收入', 200), bill('reward', '收入', 50)];
  const groups = [{members: [{id: 'deposit', role: 'rebate'}, {id: 'final', role: 'normal'}, {id: 'fee', role: 'fee'}]},
    {members: [{id: 'reward', role: 'rebate'}, {id: 'spending', role: 'expense'}]}];
  assert.equal(budget(rows, groups), 879.59);
  assert.equal(Number((2500 - budget(rows, groups)).toFixed(2)), 1620.41);
  assert.equal(budget(rows.slice(2), groups), 0);
});

test('every expense counts unless its own budget switch is off', () => {
  const group = [{members: [{id: 'transfer', role: 'transfer'}, {id: 'other', role: 'normal'}]}];
  assert.equal(budget([bill('transfer', '支出', 100), bill('other', '收入', 100, 'offset')], group), 100);
  assert.equal(budget([bill('transfer', '支出', 100, 'none'), bill('other', '收入', 100)], group), 0);
  assert.equal(budget([bill('solo', '支出', 35)]), 35);
  assert.equal(budget([bill('move', '转账', 100), bill('loan', '借贷', 20)]), 0);
});

test('budget choice persists inside existing extras without replacing other metadata', () => {
  const sandbox = {rc12ParseExtras: row => {try {return JSON.parse(row.extras || '{}')} catch {return {}}}};
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  sandbox.record = {type: '支出', extras: JSON.stringify({fx: {rate: 7}, relation: 'old'})};
  const updated = vm.runInContext('rc12SetBudgetChoice(record, "none")', sandbox);
  assert.deepEqual(JSON.parse(updated.extras), {fx: {rate: 7}, relation: 'old', budgetEffect: 'none'});
  sandbox.record = {type: '支出', extras: 'older free text'};
  assert.deepEqual(JSON.parse(vm.runInContext('rc12SetBudgetChoice(record, "none")', sandbox).extras),
    {legacy: 'older free text', budgetEffect: 'none'});
});
