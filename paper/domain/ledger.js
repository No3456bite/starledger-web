import {amountSaveValue} from './amount.js';
export const COLS=['id','date','type','category','subcategory','amount','account','account2','reimbursement','note','image','role','tags','currency','merchant','book','extras','created_at','updated_at'];
export const CURRENCIES={CNY:'人民币',USD:'美元',EUR:'欧元',JPY:'日元',HKD:'港币',GBP:'英镑',AUD:'澳元',CAD:'加拿大元',SGD:'新加坡元',TWD:'新台币',KRW:'韩元',CHF:'瑞士法郎',NZD:'新西兰元',THB:'泰铢',MYR:'马来西亚林吉特',MOP:'澳门元'};
// Preserve the original app's full ISO currency choices, including imported ledgers.
try{const names=new Intl.DisplayNames(['zh-CN'],{type:'currency'});for(const c of Intl.supportedValuesOf('currency'))if(!CURRENCIES[c])CURRENCIES[c]=names.of(c)||c}catch{}
// Resolve legacy currency labels once, rather than allocating the full ISO list for every bill.
const currencyNames=new Map();for(const[k,name]of Object.entries(CURRENCIES))if(!currencyNames.has(name))currencyNames.set(name,k);
export const code=value=>currencyNames.get(value)||String(value||'CNY').toUpperCase();
export const extras=row=>{try{const x=JSON.parse(row.extras||'{}');return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}catch{return {legacy:row.extras||''}}};
export const localDate=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const localTime=()=>`${localDate()} ${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}:00`;
export const round=n=>Math.round((n+Number.EPSILON)*100)/100;
export function profile(state,name){const p=state.prefs.accountProfiles[name]||{};return {type:'stored',include:true,hidden:false,groupId:'daily',currency:'CNY',note:'',...p,currency:code(p.currency)}}
export function cny(state,row){if(code(row.currency)==='CNY')return Number(row.amount)||0;const fx=Number(extras(row).fx?.rate)||Number(state.prefs.fxRates?.[code(row.currency)]?.rate||state.prefs.fxRates?.[code(row.currency)]),p=profile(state,row.account),rate=fx>0?fx:p.currency===code(row.currency)?Number(p.cnyRate):0;return rate>0&&Number.isFinite(rate)?Number(row.amount)*rate:null}
export function hidden(state,row){return extras(row)._starDeleted===true||profile(state,row.account).hidden||(['转账','借贷'].includes(row.type)&&profile(state,row.account2).hidden)}
export function cycle(state,y,m){const day=Math.min(28,Math.max(1,Number(state.prefs.monthStartDay)||1));return [localDate(new Date(y,m,day)),localDate(new Date(y,m+1,day))]}
export function selectRows(state,{y,m,year=false,query='',type='',account='',category='',subcategory='',book='',currency='',tag='',from='',to=''}={}){
 const range=y!=null?(year?[cycle(state,y,0)[0],cycle(state,y+1,0)[0]]:cycle(state,y,m)):null,q=query.toLocaleLowerCase();
 return state.rows.filter(r=>!hidden(state,r)&&(!range||(r.date>=range[0]&&r.date<range[1]))&&(!from||r.date.slice(0,10)>=from)&&(!to||r.date.slice(0,10)<=to)&&(!type||r.type===type)&&(!account||r.account===account||(['转账','借贷'].includes(r.type)&&r.account2===account))&&(!category||r.category===category)&&(!subcategory||r.subcategory===subcategory)&&(!book||r.book===book)&&(!currency||code(r.currency)===currency)&&(!tag||String(r.tags||'').split(/[,，]/).map(t=>t.trim()).includes(tag))&&(!q||[r.note,r.merchant,r.category,r.subcategory,r.account,r.account2,r.tags,r.amount,r.book,r.date].some(v=>String(v||'').toLocaleLowerCase().includes(q)))).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id));
}
export function totals(state,rows){let income=0,expense=0,unknown=0;for(const r of rows){if(!['支出','收入'].includes(r.type))continue;const n=cny(state,r);if(n===null){unknown++;continue}if(r.type==='收入')income+=n;else expense+=n}return {income:round(income),expense:round(expense),net:round(income-expense),unknown}}
export function budget(state,rows){let spent=0,unknown=0;for(const r of rows){if(r.type!=='支出'||extras(r).budgetEffect==='none')continue;const n=cny(state,r);if(n===null)unknown++;else spent+=Math.round(n*100)/100}const value=state.prefs.budgets?.__global_monthly__,has=value!==null&&value!==undefined&&value!=='';return {has,value:Number(value)||0,spent:round(spent),left:round((Number(value)||0)-spent),unknown}}
export function accountViews(state){
 const map=new Map();const ensure=name=>{if(name&&!map.has(name))map.set(name,{name,p:profile(state,name),raw:0,count:0,unconverted:0,calibrated:false})};
 Object.keys(state.prefs.accountProfiles).forEach(ensure);
 for(const r of state.rows){if(extras(r)._starDeleted)continue;ensure(r.account);if(['转账','借贷'].includes(r.type))ensure(r.account2);if(r.account)map.get(r.account).count++;if(['转账','借贷'].includes(r.type)&&r.account2)map.get(r.account2).count++;
  const refs=r.type==='支出'?[[r.account,-1]]:r.type==='收入'?[[r.account,1]]:['转账','借贷'].includes(r.type)?[[r.account,-1],[r.account2,1]]:[];
  for(const[name,sign]of refs){if(!name)continue;const a=map.get(name),value=a.p.currency===code(r.currency)?Number(r.amount):a.p.currency==='CNY'?cny(state,r):null;if(value===null)a.unconverted++;else a.raw+=sign*value;}
  if(r.type==='余额调整'&&r.account){const a=map.get(r.account);if(a.p.currency!==code(r.currency))a.unconverted++;else{a.raw+=Number(extras(r).delta)||0;a.calibrated=true}}
 }
 const rank=new Map(Object.values(state.prefs.accountOrder||{}).flat().map((n,i)=>[n,i]));
 return [...map.values()].map(a=>({...a,net:a.p.calibration?Number(a.p.calibration.balance)+a.raw-Number(a.p.calibration.baseline):a.raw,calibrated:a.calibrated||!!a.p.calibration})).sort((a,b)=>(rank.get(a.name)??1e9)-(rank.get(b.name)??1e9)||b.count-a.count||a.name.localeCompare(b.name,'zh-CN'));
}
export function financial(state,views=accountViews(state)){const items=views.filter(a=>a.p.include&&!a.p.hidden),missing=items.filter(a=>!a.calibrated||a.unconverted||(a.p.currency!=='CNY'&&!(Number(a.p.cnyRate||state.prefs.fxRates?.[a.p.currency]?.rate||state.prefs.fxRates?.[a.p.currency])>0)));if(missing.length)return {ready:false,missing:missing.map(a=>a.name)};let assets=0,debt=0;for(const a of items){const n=a.net*(a.p.currency==='CNY'?1:Number(a.p.cnyRate||state.prefs.fxRates?.[a.p.currency]?.rate||state.prefs.fxRates?.[a.p.currency]));assets+=Math.max(0,n);debt+=Math.max(0,-n)}return {ready:true,assets:round(assets),debt:round(debt),net:round(assets-debt)}}
export function categoryMap(state,type){if(type==='转账')return {'转账':['账户互转','信用还款','理财买入','理财赎回']};if(type==='借贷')return {'借贷':['借出','收款','借入','还款']};const map=new Map();for(const r of state.rows.filter(r=>r.type===type&&!extras(r)._starDeleted)){if(!map.has(r.category))map.set(r.category,new Map());const subs=map.get(r.category);if(r.subcategory)subs.set(r.subcategory,(subs.get(r.subcategory)||0)+1)}for(const[c,subs]of Object.entries(state.prefs.categories?.[type]||{})){if(!map.has(c))map.set(c,new Map());for(const sub of subs)if(!map.get(c).has(sub))map.get(c).set(sub,0)}return Object.fromEntries([...map].sort((a,b)=>[...b[1].values()].reduce((s,n)=>s+n,0)-[...a[1].values()].reduce((s,n)=>s+n,0)).map(([c,subs])=>[c,[...subs].sort((a,b)=>b[1]-a[1]).map(([s])=>s)]))}
export function recordFromDraft(state,d,previous){
 const legacyUnchanged=previous&&String(Number(d.amount))===String(Number(previous.amount))&&Number(previous.amount)<=0;const checked=legacyUnchanged?{ok:true,value:Number(previous.amount)}:amountSaveValue(d.amount);if(!checked.ok)throw Error(checked.error);if(!legacyUnchanged&&checked.value<=0)throw Error('金额四舍五入后必须大于零');
 if(!['支出','收入','转账','借贷','应付款','应收款','余额调整'].includes(d.type)&&d.type!==previous?.type)throw Error('请选择账单类型');
 if((!d.category&&['支出','应付款'].includes(d.type))||(!d.subcategory&&d.type!=='余额调整'))throw Error('请选择完整的大小类');
 if(!d.account||!state.prefs.accountProfiles[d.account]||profile(state,d.account).hidden)throw Error('请选择可用账户');
 const transfer=['转账','借贷'].includes(d.type);if(transfer&&(!d.account2||d.account===d.account2||!state.prefs.accountProfiles[d.account2]||profile(state,d.account2).hidden))throw Error('请选择不同的转入／对方账户');
 if(!state.prefs.books.includes(d.book))throw Error('请选择账本');
 const date=String(d.date||'').replace('T',' ');if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(date)||!Number.isFinite(new Date(date.replace(' ','T')).getTime()))throw Error('请填写有效日期');
 const currency=code(d.currency);if(!CURRENCIES[currency])throw Error('不支持的币种');const a=profile(state,d.account);if(a.currency!==currency&&a.currency!=='CNY')throw Error('账单币种须与此账户的主币种一致');
 if(transfer){const b=profile(state,d.account2);if(b.currency!==currency&&b.currency!=='CNY')throw Error('对方账户币种与本笔不兼容，请核对');}
 const ex=extras(previous||{});if(d.inBudget===false)ex.budgetEffect='none';else delete ex.budgetEffect;
 if(currency!=='CNY'){const rate=Number(d.fxRate);if(d.fxRate&&(!(rate>0)||!Number.isFinite(rate)))throw Error('汇率必须大于零');if(rate>0)ex.fx={...(ex.fx||{}),rate,source:'manual',quote:'CNY'};else delete ex.fx;if((a.currency==='CNY'||transfer&&profile(state,d.account2).currency==='CNY')&&!(rate>0))throw Error('人民币账户记外币需要填写汇率');}else delete ex.fx;
 const now=new Date().toISOString();return {...Object.fromEntries(COLS.map(k=>[k,''])),...previous,id:previous?.id||crypto.randomUUID(),created_at:previous?.created_at||now,updated_at:now,type:d.type,date:date.length===16?date+':00':date,amount:checked.value.toFixed(2),category:d.category,subcategory:d.subcategory,account:d.account,account2:transfer?d.account2:'',book:d.book.trim(),currency:CURRENCIES[currency]||currency,note:d.note||'',merchant:d.merchant||'',tags:d.tags||'',reimbursement:d.reimbursement??previous?.reimbursement??'',role:d.role??previous?.role??'',image:d.image??previous?.image??'',extras:Object.keys(ex).length?JSON.stringify(ex):''};
}
export const csv=rows=>'\uFEFF'+COLS.join(',')+'\r\n'+rows.map(r=>COLS.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n';
export function validateSnapshot(value){
 const fail=message=>{throw Error(message||'快照结构无效；请选择此试用版导出的 JSON')},obj=x=>x&&typeof x==='object'&&!Array.isArray(x),safe=k=>!['__proto__','constructor','prototype'].includes(k),str=x=>typeof x==='string';
 if(value?.format!=='starledger-paper-trial'||value.version!==1||!obj(value.state))fail('请选择此试用版导出的 JSON 快照；原版 ZIP 尚未开放');
 const s=value.state,p=s.prefs;
 if(!Array.isArray(s.rows)||!obj(p)||!obj(p.accountProfiles)||!Array.isArray(p.accountGroups)||!p.accountGroups.length||!obj(p.accountOrder)||!Array.isArray(p.books)||!p.books.length||p.books.some(b=>!str(b)||!b.trim())||!str(p.mainName)||!obj(p.budgets)||!Number.isFinite(Number(p.budgets.__global_monthly__))||Number(p.budgets.__global_monthly__)<0||!Number.isInteger(p.monthStartDay)||p.monthStartDay<1||p.monthStartDay>28)fail();
 const groups=new Set();for(const g of p.accountGroups){if(!obj(g)||!str(g.id)||!safe(g.id)||!str(g.name)||!g.id||!g.name||groups.has(g.id))fail('分组资料无效');groups.add(g.id)}
 for(const [name,a]of Object.entries(p.accountProfiles)){if(!safe(name)||!name||!obj(a)||!groups.has(a.groupId)||!['stored','credit','personal'].includes(a.type)||!CURRENCIES[code(a.currency)]||a.cnyRate&&(!(Number(a.cnyRate)>0)||!Number.isFinite(Number(a.cnyRate))))fail('账户资料无效');if(a.calibration&&(!obj(a.calibration)||!Number.isFinite(Number(a.calibration.balance))||!Number.isFinite(Number(a.calibration.baseline))))fail('账户校准资料无效')}
 for(const [g,names]of Object.entries(p.accountOrder))if(!groups.has(g)||!Array.isArray(names)||names.some(n=>!str(n)||!Object.hasOwn(p.accountProfiles,n)))fail('账户顺序无效');
 if(p.categories){if(!obj(p.categories))fail();for(const categories of Object.values(p.categories)){if(!obj(categories)||Object.entries(categories).some(([c,subs])=>!safe(c)||!Array.isArray(subs)||subs.some(x=>!str(x))))fail('分类资料无效')}}
 const ids=new Set();for(const r of s.rows){if(!obj(r)||!str(r.id)||!r.id||ids.has(r.id))fail('快照有缺失或重复账单 ID');ids.add(r.id);if(COLS.some(k=>!str(r[k]))||!['支出','收入','转账','借贷','余额调整'].includes(r.type)||!Number.isFinite(Number(r.amount))||Number(r.amount)<0||!/^\d{4}-\d{2}-\d{2} /.test(r.date)||!Number.isFinite(Date.parse(r.date.replace(' ','T')))||!Object.hasOwn(p.accountProfiles,r.account)||!CURRENCIES[code(r.currency)]||(['转账','借贷'].includes(r.type)&&!Object.hasOwn(p.accountProfiles,r.account2)))fail('快照包含无效账单');}
 return structuredClone({rows:s.rows,prefs:p});
}
