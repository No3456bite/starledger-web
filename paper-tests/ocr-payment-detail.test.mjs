import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync('paper/domain/recognizer.js','utf8'),sandbox={window:{},console};
vm.runInNewContext(source,sandbox);
const recognize=text=>sandbox.window.StarLedgerRecognizer.recognize(text,{accounts:['微信零钱','支付宝'],now:'2026-11-16 10:55:00'});
// Transcribed from the supplied screenshot. Order/transaction IDs are synthetic.
const receipt=readFileSync('paper-tests/fixtures/wechat-pinduoduo.txt','utf8');
test('WeChat merchant-profile receipt uses the card merchant, never the product order ID',()=>{
 for(const raw of [receipt,receipt.replace('商品 商户单号','商品\n商户单号'),receipt.replaceAll('支付方式 零钱','支付方式\n零钱'),receipt.replace('-3.80','－3. 80'),receipt.replace('-3.80','— 3．80')]){
  const r=recognize(raw);assert.equal(r.records.length,1);assert.equal(r.type.value,'支出');assert.equal(r.amount.value,3.8);assert.equal(r.merchant.value,'拼多多');assert.equal(r.account.value,'微信零钱');assert.equal(r.date.value,'2026-11-16 10:50:14');
 }
});
test('order identifiers and payment provider never become fallback merchants',()=>{
 const r=recognize(receipt.replace(/拼多多\n/g,''));assert.equal(r.merchant.value,'');assert.equal(r.amount.value,3.8);
 const explicit=recognize(receipt+'\n商户名称 某某便利店');assert.equal(explicit.merchant.value,'某某便利店');
 assert.equal(readFileSync('recognizer.js','utf8'),source,'legacy and production parser copies stay aligned');
});
