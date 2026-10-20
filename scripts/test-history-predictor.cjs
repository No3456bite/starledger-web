const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

const sandbox = {window: {}};
vm.runInNewContext(fs.readFileSync('history-predictor.js', 'utf8'), sandbox);
const predict = sandbox.window.StarLedgerHistoryPredictor.predict;
const bill = (amount, category, subcategory, merchant = '', extras = {}) => ({type: '支出', currency: '人民币', date: '2026-10-01 12:00:00', amount, category, subcategory, merchant, ...extras});

test('merchant plus nearby amount ranks the learned category first', () => {
  const history = [bill('420', '医疗', '医保', '市医院'), bill('450', '医疗', '医保', '市医院'), bill('435', '餐饮', '聚餐', '餐馆')];
  const result = predict({type: '支出', currency: '人民币', amount: '435.01', merchant: '市医院', date: '2026-10-20 11:00:00'}, history);
  assert.equal(result[0].category, '医疗');
  assert.equal(result[0].subcategory, '医保');
  assert.equal(result[0].confidence, '高');
});

test('amount-only suggestions rank historical patterns but do not claim high confidence', () => {
  const history = [bill('2.00', '交通', '公交'), bill('2.00', '交通', '公交'), bill('3500', '住房', '房租')];
  const small = predict({type: '支出', amount: '2.10', currency: '人民币'}, history);
  const large = predict({type: '支出', amount: '3450', currency: '人民币'}, history);
  assert.equal(small[0].category, '交通');
  assert.equal(large[0].category, '住房');
  assert.notEqual(small[0].confidence, '高');
});

test('payment platforms are not treated as distinctive merchants for automatic classification', () => {
  const history = [bill('15', '餐饮', '正餐', '微信支付'), bill('16', '餐饮', '正餐', '微信支付')];
  const result = predict({type: '支出', amount: '15.50', currency: '人民币', merchant: '微信支付'}, history);
  assert.equal(result[0].category, '餐饮');
  assert.notEqual(result[0].confidence, '高');
});

test('type, currency, deleted rows and the current bill are excluded', () => {
  const history = [bill('10', '餐饮', '午餐', '', {type: '收入'}), bill('10', '购物', '百货', '', {currency: '美元'}), bill('10', '交通', '地铁', '', {extras: JSON.stringify({_starDeleted: true})}), bill('10', '医疗', '医保', '', {id: 'editing'})];
  assert.equal(predict({id: 'editing', type: '支出', currency: '人民币', amount: '10'}, history).length, 0);
});
