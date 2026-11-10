// Test oracle: unchanged pure financial functions from upstream 04f9f0b. No DOM renderer.
export function oracle(rows,prefs){
const CURRENCY_NAMES={CNY:"人民币",USD:"美元",EUR:"欧元",JPY:"日元"};const ledgerRuntimeRates={};const normalizeBookIcon=x=>x;const rc12ParseExtras=r=>{try{return JSON.parse(r.extras||"{}")}catch{return {}}};
function amount(r){return Number(r.amount)||0}function isCNY(r){return !r.currency||r.currency==='人民币'||r.currency==='CNY'}
function currencyCode(value){let v=String(value||'人民币').toUpperCase();return Object.keys(CURRENCY_NAMES).find(k=>CURRENCY_NAMES[k]===value)||v}
function fxInfo(r){try{let fx=JSON.parse(r.extras||'{}').fx,rate=Number(fx?.rate);return rate>0&&Number.isFinite(rate)?fx:null}catch(e){return null}}
function runtimeFxInfo(r){let code=currencyCode(r.currency),raw=ledgerRuntimeRates?.[code],rate=Number(typeof raw==='number'?raw:raw?.rate);return rate>0&&Number.isFinite(rate)?{rate,date:raw?.date||'',source:raw?.source||'runtime'}:null}
function cnyAmount(r){if(isCNY(r))return amount(r);let fx=fxInfo(r)||runtimeFxInfo(r),profile=prefs.accountProfiles?.[r.account],accountRate=currencyCode(profile?.currency)===currencyCode(r.currency)?Number(profile?.cnyRate):0;return fx?amount(r)*Number(fx.rate):accountRate>0?amount(r)*accountRate:null}
function accountCurrency(name){return currencyCode(prefs.accountProfiles?.[name]?.currency||'人民币')}
function accountRowAmount(r,name,target=accountCurrency(name)){return target===currencyCode(r.currency)?amount(r):target==='CNY'?cnyAmount(r):null}
function accountData(){let map=new Map();function ensure(k){if(k&&!map.has(k))map.set(k,{net:0,count:0,calibrated:false,unconverted:0})}
 for(let name of Object.keys(prefs.accountProfiles||{}))ensure(name);
 for(let r of rows){let a=r.account,b=r.account2;ensure(a);if(['转账','借贷'].includes(r.type))ensure(b);if(a&&map.has(a))map.get(a).count++;if(['转账','借贷'].includes(r.type)&&b&&map.has(b))map.get(b).count++;
  for(let [name,sign] of r.type==='支出'?[[a,-1]]:r.type==='收入'?[[a,1]]:['转账','借贷'].includes(r.type)?[[a,-1],[b,1]]:[]){if(!name||!map.has(name))continue;let value=accountRowAmount(r,name);if(value===null)map.get(name).unconverted++;else map.get(name).net+=sign*value}
  if(r.type==='余额调整'&&a&&map.has(a)){if(accountCurrency(a)!==currencyCode(r.currency)){map.get(a).unconverted++;continue}let delta=0;try{delta=Number(JSON.parse(r.extras||'{}').delta)||0}catch(e){}map.get(a).net+=delta;map.get(a).calibrated=true}
 }
 return [...map.entries()].sort((a,b)=>b[1].count-a[1].count||a[0].localeCompare(b[0],'zh-CN'))}
function accountGroups(){let groups=Array.isArray(prefs.accountGroups)?prefs.accountGroups.filter(g=>g&&typeof g.id==='string'&&typeof g.name==='string'&&g.name.trim()):[];return groups.length?groups:[{id:'default',name:'默认分组'}]}
function accountProfile(name){let old=prefs.accountTypes?.[name],data=prefs.accountProfiles?.[name]||{};return {type:data.type||((old==='debt'||/信用卡/.test(name))?'credit':/借贷|借入|借出|欠款/.test(name)?'personal':'stored'),include:data.include!==undefined?!!data.include:old!=='ignore',groupId:accountGroups().some(g=>g.id===data.groupId)?data.groupId:accountGroups()[0].id,limit:data.limit||'',note:data.note||'',icon:normalizeBookIcon(data.icon),iconId:String(data.iconId||''),hidden:!!data.hidden,currency:currencyCode(data.currency||'人民币'),cnyRate:Number(data.cnyRate)>0?Number(data.cnyRate):'',calibration:data.calibration||null}}
function accountViewData(){return accountData().map(([name,raw])=>{let p=accountProfile(name),c=p.calibration,net=c?Number(c.balance)+raw.net-Number(c.baseline):raw.net;return [name,{...raw,net,calibrated:!!c||raw.calibrated,profile:p}]})}
function accountCnyRate(profile){if(profile.currency==='CNY')return 1;let rate=Number(profile.cnyRate)||Number(ledgerRuntimeRates?.[profile.currency]?.rate||ledgerRuntimeRates?.[profile.currency]);return Number.isFinite(rate)&&rate>0?rate:null}
function financial(){let data=accountViewData().filter(([name,v])=>!v.profile.hidden),included=data.filter(([name,v])=>v.profile.include),unready=included.filter(([name,v])=>!v.calibrated),unconverted=included.filter(([name,v])=>v.unconverted),missingRates=included.filter(([name,v])=>!accountCnyRate(v.profile));if(unready.length||unconverted.length||missingRates.length)return{ready:false,missing:unready.length,unconverted:unconverted.length,missingRates:missingRates.length};let assets=included.reduce((n,[name,v])=>n+Math.max(0,v.net*accountCnyRate(v.profile)),0),debt=included.reduce((n,[name,v])=>n+Math.max(0,-v.net*accountCnyRate(v.profile)),0);return{ready:true,assets,debt,net:assets-debt}}
function stats(rs){let income=0,expense=0,other=0;for(let r of rs){let n=cnyAmount(r);if(n===null){other++;continue}if(r.type==='支出')expense+=n;if(r.type==='收入')income+=n}return {income,expense,net:income-expense,other}}
function recordHidden(r){return !!(prefs.accountProfiles?.[r.account]?.hidden||(['转账','借贷'].includes(r.type)&&prefs.accountProfiles?.[r.account2]?.hidden))}
function rc12BudgetChoice(r){
 let choice=rc12ParseExtras(r).budgetEffect;
 return r?.type==='支出'&&choice!=='none'?'expense':'none'
}
function rc12BudgetSpent(scoped){
 let spent=0;
 for(let r of scoped){
  let n=cnyAmount(r);if(n===null||!Number.isFinite(n))continue;
  if(rc12BudgetChoice(r)==='expense')spent+=Math.round(n*100)
 }
 return spent/100
}
return {accounts:accountViewData(),financial:financial(),stats:stats(rows.filter(r=>!recordHidden(r))),budget:rc12BudgetSpent(rows.filter(r=>!recordHidden(r)))};
}
