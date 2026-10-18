const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync('recognizer.js', 'utf8'), sandbox);
const recognize = sandbox.window.StarLedgerRecognizer.recognize;
const base = {now: '2026-10-18 12:00:00', accounts: ['零钱', '医保卡', '储蓄卡']};
const oldBill = (amount, account = '医保卡', category = '医疗', subcategory = '医保', type = '支出', currency = '人民币') =>
  ({date: '2026-09-12 08:00:00', type, amount: String(amount), account, category, subcategory, currency, merchant: '某医院'});
const scan = (text, history) => recognize(text, {...base, history});
const pay = amount => `微信支付\n付款成功\n¥${amount}\n2026-10-18 11:30:00`;

test('amount-only WeChat payment prefills the unanimous historical account and categories', () => {
  const result = scan(pay('435.01'), [oldBill('435.01'), oldBill('435.01')]);
  assert.equal(result.merchant.value, '');
  assert.equal(result.account.value, '医保卡');
  assert.equal(result.category.value, '医疗');
  assert.equal(result.subcategory.value, '医保');
  assert.equal(result.amountHistoryMatched, true);
  assert.equal(result.records[0].amountHistoryMatched, true);
});

test('different cents, transaction type, and currency cannot match', () => {
  for (const history of [
    [oldBill('435.02')],
    [oldBill('435.01', '医保卡', '医疗', '医保', '收入')],
    [oldBill('435.01', '医保卡', '医疗', '医保', '美元')]
  ]) {
    const result = scan(pay('435.01'), history);
    assert.equal(result.amountHistoryMatched, false);
    assert.equal(result.category.value, '');
  }
});

test('conflicting historical classifications remain unfilled', () => {
  const result = scan(pay('435.01'), [oldBill('435.01'), oldBill('435.01', '储蓄卡', '餐饮', '晚餐')]);
  assert.equal(result.amountHistoryMatched, false);
  assert.equal(result.category.value, '');
});

test('explicit payment account is not replaced by amount history', () => {
  const result = scan(pay('435.01') + '\n支付方式: 零钱', [oldBill('435.01')]);
  assert.equal(result.account.value, '零钱');
  assert.equal(result.amountHistoryMatched, false);
});
