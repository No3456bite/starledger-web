const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('app.js', 'utf8');
const start = source.indexOf('function duplicateIdGroups(');
const end = source.indexOf('function csvWrite(', start);
assert(start > 0 && end > start, 'duplicate ID review helpers are present');

const context = {Date, Map, Set, JSON, Object, Error, String, Number};
vm.createContext(context);
vm.runInContext(source.slice(start, end), context);

const first = {id: 'same', date: '2026-10-31 10:00:00', amount: '10.00', note: 'first', updated_at: '2026-10-31T10:00:00.000Z'};
const newer = {...first, note: 'newer', updated_at: '2026-10-31T11:00:00.000Z'};
const other = {id: 'other', date: '2026-10-31 12:00:00', amount: '20.00'};
const sample = [first, other, newer];
const groups = context.duplicateIdGroups(sample);
assert.equal(groups.length, 1);
assert.equal(groups[0].anchorIndex, 2, 'newest revision keeps the original ID');
assert.deepEqual(Array.from(groups[0].extraIndexes), [0]);
assert.equal(sample.length, 3, 'scanning must not mutate the ledger');

assert.throws(() => context.resolveDuplicateIds(sample, {}, () => 'fresh'), /逐条选择/,
  'duplicates require a user decision');
const removed = context.resolveDuplicateIds(sample, {0: 'delete'}, () => 'fresh');
assert.equal(removed.rows.length, 2);
assert.equal(removed.rows.find(row => row.id === 'same').note, 'newer');
const retained = context.resolveDuplicateIds(sample, {0: 'keep'}, () => 'fresh');
assert.equal(retained.rows.length, 3);
assert.equal(retained.rows.find(row => row.note === 'first').id, 'fresh');
assert.equal(retained.rows.find(row => row.note === 'newer').id, 'same');
assert.equal(new Set(retained.rows.map(row => row.id)).size, 3);
assert.equal(first.id, 'same', 'review must leave the original rows untouched');
assert.throws(() => context.resolveDuplicateIds(sample, {0: 'keep'}, () => 'same'), /唯一/,
  'a replacement ID cannot collide with an existing bill');

console.log('Duplicate ID review decisions passed.');
