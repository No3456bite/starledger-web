import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../paper/domain/ledger.js';
import {fixture} from '../paper/domain/fixture.js';
import {evaluateAmountExpression as evaluate,amountSaveValue as save} from '../paper/domain/amount.js';
import {oracle} from './reference-model.js';
const draft=(s,overrides={})=>({type:'支出',amount:'12.50',category:'餐饮',subcategory:'日常',account:'招商银行',account2:'支付宝',currency:'CNY',book:s.prefs.books[0],date:'2026-11-09T10:30',note:'',merchant:'',tags:'',inBudget:true,...overrides});
test('arithmetic precedence, decimals, negative results and invalid expressions',()=>{
 for(const [expr,n]of [['12+3×4',24],['0.1+0.2',.3],['10÷4',2.5],['−5+2',-3],['30−5−2',23]])assert.equal(evaluate(expr).value,n);
 for(const x of ['1÷0','1+','1××2','1e3+2','999999999999×9'])assert.equal(evaluate(x).ok,false,x);
 for(const x of ['','0','−1','1+2','1000000000001'])assert.equal(save(x).ok,false,x);
 assert.equal(save('1.005').value,1.01);
 assert.throws(()=>L.recordFromDraft(fixture(),draft(fixture(),{amount:'.001'})),/大于零/);
});
test('60 and 100 account fixtures match original calibration, net worth, rows and budget rules',()=>{
 for(const count of [60,100]){const s=fixture(count);const old=oracle(s.rows,s.prefs);const current=L.accountViews(s);assert.equal(current.length,count);for(const [name,a]of old.accounts){const b=current.find(x=>x.name===name);assert.equal(b.net,a.net,name);assert.equal(b.count,a.count);assert.equal(b.calibrated,a.calibrated);assert.equal(b.unconverted,a.unconverted)}assert.equal(L.financial(s).net,L.round(old.financial.net));assert.equal(L.budget(s,L.selectRows(s)).spent,L.round(old.budget));assert.equal(L.totals(s,L.selectRows(s)).expense,L.round(old.stats.expense));}
});
test('all four types preserve unknown metadata and move money with correct directions',()=>{
 const s=fixture();const before=L.accountViews(s).find(a=>a.name==='招商银行').net;
 for(const type of ['支出','收入','转账','借贷']){const next=structuredClone(s),r=L.recordFromDraft(next,draft(next,{type}));next.rows.unshift(r);assert.equal(r.account2,['转账','借贷'].includes(type)?'支付宝':'');assert.equal(L.round(L.accountViews(next).find(a=>a.name==='招商银行').net-before),type==='收入'?12.5:-12.5);const old=oracle(next.rows,next.prefs);assert.equal(L.financial(next).net,L.round(old.financial.net));}
 const old={...s.rows[0],extras:JSON.stringify({external:{nested:[1,2]},relationId:'keep'}),customField:'keep'};const edited=L.recordFromDraft(s,draft(s),old);assert.equal(edited.id,old.id);assert.equal(edited.created_at,old.created_at);assert.equal(edited.customField,'keep');assert.deepEqual(L.extras(edited).external,{nested:[1,2]});assert.equal(L.extras(edited).relationId,'keep');assert.throws(()=>L.recordFromDraft(s,draft(s,{type:'转账',account2:'招商银行'})),/不同/);
});
test('foreign currency, budget exclusions and cent rounding match original rules',()=>{
 const s=fixture();const variants=[{currency:'美元',amount:'1.01',extras:'{"fx":{"rate":7.125}}'},{currency:'美元',account:'美元账户',amount:'10',extras:''},{amount:'90',extras:'{"budgetEffect":"none"}'},{type:'收入',amount:'15'},{type:'转账',amount:'15',account2:'支付宝'}];s.rows=variants.map((v,i)=>({...s.rows[0],id:'fx'+i,...v}));const old=oracle(s.rows,s.prefs);assert.equal(L.budget(s,s.rows).spent,old.budget);assert.equal(L.totals(s,s.rows).expense,L.round(old.stats.expense));const missing={...s.rows[0],currency:'欧元',extras:''};assert.equal(L.cny(s,missing),null);assert.throws(()=>L.recordFromDraft(s,draft(s,{currency:'USD',fxRate:''})),/汇率/);s.prefs.accountProfiles['美元账户'].cnyRate='';assert.equal(L.financial(s).ready,false);
});
test('hidden accounts, month cycle, parent-child paths and zero calibration remain distinct',()=>{
 const s=fixture();s.prefs.accountProfiles['招商银行'].hidden=true;assert.ok(L.selectRows(s).every(r=>r.account!=='招商银行'));assert.equal(L.accountViews(s).length,60);assert.equal(L.hidden(s,{account:'支付宝',account2:'招商银行',type:'支出'}),false);assert.equal(L.hidden(s,{account:'支付宝',account2:'招商银行',type:'转账'}),true);s.prefs.monthStartDay=15;assert.deepEqual(L.cycle(s,2026,10),['2026-11-15','2026-12-15']);const map=L.categoryMap(s,'支出');assert.ok(map['餐饮'].includes('日常')&&map['交通'].includes('日常'));assert.ok(L.accountViews(s).some(a=>a.calibrated&&a.net===0));assert.ok(L.accountViews(s).some(a=>!a.calibrated));
});
test('snapshot rejects malformed settings and duplicates; round trip retains unknown extras; CSV has 19 columns',()=>{
 const s=fixture();s.rows[0].extras='{"future":{"one":1}}';const wrap=()=>({format:'starledger-paper-trial',version:1,state:structuredClone(s)});assert.deepEqual(L.validateSnapshot(wrap()),{rows:s.rows,prefs:s.prefs});for(const mutate of [x=>x.state.rows.push(x.state.rows[0]),x=>delete x.state.prefs.books,x=>x.state.prefs.accountProfiles['招商银行'].calibration.balance='bad',x=>x.state.prefs.monthStartDay=40,x=>x.state.rows[0].account='missing']){const x=wrap();mutate(x);assert.throws(()=>L.validateSnapshot(x));}assert.equal(L.csv(s.rows).split('\r\n')[0].slice(1).split(',').length,19);assert.ok(L.csv([{...s.rows[0],note:'a,"b"\nc'}]).includes('"a,""b""\nc"'));
});
