// Local history-based suggestions for a draft bill. Scores rank candidates; they are not probabilities.
(function(global){
'use strict';
function text(value){return String(value||'').toLocaleLowerCase().replace(/[\s·•_\-—()（）【】\[\]，,。.:：;；/\\]/g,'')}
function grams(value){let s=text(value),out=new Set();for(let i=0;i<s.length-1;i++)out.add(s.slice(i,i+2));return out}
function similarity(a,b){let aa=grams(a),bb=grams(b);if(!aa.size||!bb.size)return 0;let hit=0;for(let part of aa)if(bb.has(part))hit++;return hit/(aa.size+bb.size-hit)}
function currency(value){let s=String(value||'人民币').toUpperCase();return !s||s==='人民币'?'CNY':s==='美元'?'USD':s}
function informativeMerchant(value){return !new Set(['微信','微信支付','支付宝','支付宝支付','财付通','付款','收款','商户','商家']).has(text(value))}
function exactCents(value){let n=Number(value);return Number.isFinite(n)&&n>0&&Math.abs(n*100-Math.round(n*100))<1e-6?Math.round(n*100):null}
function hours(value){let m=String(value||'').match(/(?:T|\s)(\d{1,2}):\d{2}/);return m?Number(m[1]):null}
function deleted(row){if(row.deleted_at||row.is_deleted)return true;try{return JSON.parse(row.extras||'{}')._starDeleted===true}catch{return false}}
function scoreRow(draft,row){
 let amount=Number(draft.amount),old=Number(row.amount),merchant=text(draft.merchant),oldMerchant=text(row.merchant),note=text(draft.note),oldNote=text(row.note),score=.1,reasons=[];
 let merchantMatch=0;
 if(merchant&&oldMerchant){
  if(merchant===oldMerchant)merchantMatch=1;
  else if(merchant.length>=3&&oldMerchant.length>=3&&(merchant.includes(oldMerchant)||oldMerchant.includes(merchant)))merchantMatch=.8;
  else merchantMatch=similarity(merchant,oldMerchant)
 }
 if(merchantMatch){score+=8*merchantMatch;reasons.push(merchantMatch===1?'同商家':'商家相似')}
 let noteMatch=note&&oldNote?similarity(note,oldNote):0;if(noteMatch>=.3){score+=2.8*noteMatch;reasons.push('备注相似')}
 if(amount>0&&old>0){let same=exactCents(amount)!==null&&exactCents(amount)===exactCents(old),close=Math.exp(-Math.abs(Math.log((amount+1)/(old+1)))*3);score+=same?4:2.6*close;if(same)reasons.push('金额相同');else if(close>=.7)reasons.push('金额接近')}
 if(draft.account&&row.account===draft.account){score+=.8;reasons.push('同账户')}
 if(draft.book&&row.book===draft.book)score+=.2;
 let hour=hours(draft.date),oldHour=hours(row.date);if(hour!==null&&oldHour!==null&&Math.abs(hour-oldHour)<=3){score+=.35;reasons.push('时段相近')}
 let d=Date.parse(String(draft.date||'').replace(' ','T')),r=Date.parse(String(row.date||'').replace(' ','T'));if(Number.isFinite(d)&&Number.isFinite(r))score+=.35*Math.exp(-Math.abs(d-r)/86400000/365);
 return {score,reasons,merchantMatch}
}
function predict(draft,history,limit=3){
 if(!draft||!['支出','收入'].includes(draft.type)||!Array.isArray(history))return [];
 let amount=Number(draft.amount),hasSignal=amount>0||text(draft.merchant).length>=2||text(draft.note).length>=2;if(!hasSignal)return [];
 let groups=new Map();
 for(let row of history){
  if(!row||(row.id&&row.id===draft.id)||row.type!==draft.type||currency(row.currency)!==currency(draft.currency)||!row.category||!row.subcategory||deleted(row))continue;
  let old=Number(row.amount);if(!Number.isFinite(old)||old<=0)continue;
  let match=scoreRow(draft,row),key=row.category+'\u0000'+row.subcategory,g=groups.get(key)||{category:row.category,subcategory:row.subcategory,count:0,items:[],accounts:new Map()};
  g.count++;g.items.push(match);if(row.account)g.accounts.set(row.account,(g.accounts.get(row.account)||0)+1);groups.set(key,g)
 }
 let ranked=[...groups.values()].map(g=>{
  g.items.sort((a,b)=>b.score-a.score);let best=g.items[0],support=g.items.filter(item=>item.score>=best.score-1.3).length,top=g.items.slice(0,Math.min(4,g.items.length));
  let score=top.reduce((sum,item)=>sum+item.score,0)/top.length+Math.min(1.4,Math.log1p(support)*.5);
  let account=[...g.accounts].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
  return {category:g.category,subcategory:g.subcategory,account,count:g.count,support,score,reasons:best.reasons,merchantMatch:best.merchantMatch}
 }).sort((a,b)=>b.score-a.score||b.support-a.support||b.count-a.count).slice(0,Math.max(1,limit));
 let margin=ranked[0]?.score-(ranked[1]?.score||0);
 return ranked.map((item,index)=>({...item,confidence:index===0&&informativeMerchant(draft.merchant)&&item.merchantMatch>=.8&&item.support>=2&&margin>=1.2?'高':index===0&&item.score>=3.2&&margin>=.7?'中':'低'}))
}
global.StarLedgerHistoryPredictor={predict,_test:{scoreRow,similarity,exactCents,informativeMerchant}}
})(window);
