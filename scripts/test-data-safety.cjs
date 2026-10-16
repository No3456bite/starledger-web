const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const Zip = require('../backup-zip.js');
const {bill,rows: fixtureRows} = require('./fixtures/data-model.cjs');

const source = fs.readFileSync('app.js','utf8');
function section(start,end){
 const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
 assert(a>=0&&b>a,`missing source section: ${start}`);
 return source.slice(a,b);
}
function context(values,code){let sandbox={Date,JSON,Map,Set,Object,Array,Error,...values};vm.createContext(sandbox);vm.runInContext(code,sandbox);return sandbox}
function run(sandbox,code){return vm.runInContext(code,sandbox)}

const csvCode=section('function csvParse(','function takeCsv(');
const cols=['id','date','type','category','subcategory','amount','account','account2','reimbursement','note','image','role','tags','currency','merchant','book','extras','created_at','updated_at'];
function csvContext(){return context({COLS:cols,digest:s=>String(s.length)},csvCode)}

test('19-column CSV round-trip and old Chinese CSV remain readable',()=>{
 const c=csvContext();c.fixtureRows=fixtureRows;
 const restored=run(c,'csvParse(csvWrite(fixtureRows))');
 assert.equal(restored.length,fixtureRows.length);
 assert.equal(restored[2].account2,'银行卡');
 assert.equal(restored[4].extras,'{"delta":5}');
 const old='类型,日期,大类,小类,金额,账户,账户2\n支出,2026/10/01 09:00:00,餐饮,正餐,12.50,现金,\n';
 c.old=old;
 const legacy=run(c,'csvParse(old,"旧账本")');
 assert.equal(legacy[0].book,'旧账本');
 assert.equal(legacy[0].date,'2026-10-01 09:00:00');
 assert.ok(legacy[0].id);
});

test('import diagnoses missing and duplicate IDs, impossible dates and nonnumeric amounts',()=>{
 const c=csvContext();c.fixtureRows=fixtureRows;
 const invalid=[{...fixtureRows[0],id:''},{...fixtureRows[0],id:'dup'},
  {...fixtureRows[1],id:'dup',date:'2026-02-30 10:00:00',amount:'not-money'}];
 c.invalid=invalid;
 assert.throws(()=>run(c,'validateImportCsv(invalid,"合成.csv")'),/ID|日期|金额/);
 assert.doesNotThrow(()=>run(c,'validateImportCsv(fixtureRows,"合成.csv")'));
 assert.throws(()=>run(c,'csvParse("id,date\\n\\\"unfinished")'),/引号未闭合/);
});

test('synthetic full ZIP restores CSV, account settings and relations in an isolated context',async()=>{
 const c=csvContext(),settings={mainName:'测试账本',accountProfiles:{'美元账户':{currency:'USD',cnyRate:7}}},relations={format:'star-ledger-relations',version:1,items:[{id:'r1'}]};c.fixtureRows=fixtureRows;
 const archived=Zip.create([
  {name:'测试账本_desktop.csv',data:run(c,'csvWrite(fixtureRows)')},
  {name:'StarLedgerConfig.json',data:JSON.stringify(settings)},
  {name:'StarLedgerRelations.json',data:JSON.stringify(relations)}
 ]);
 const restored=await Zip.read(archived),files=Object.fromEntries(restored.map(x=>[x.name,new TextDecoder().decode(x.data)]));
 const isolated=csvContext();isolated.backupCsv=files['测试账本_desktop.csv'];
 assert.equal(run(isolated,'csvParse(backupCsv)').length,fixtureRows.length);
 assert.equal(JSON.parse(files['StarLedgerConfig.json']).accountProfiles['美元账户'].currency,'USD');
 assert.equal(JSON.parse(files['StarLedgerRelations.json']).items[0].id,'r1');
});

test('balances, transfer and loan semantics, edit and delete stay consistent',()=>{
 const code=section('function amount(','function currencyOptions(')+section('function fxInfo(','function dateOf(')+section('function stats(','function opts(')+section('function accountCurrency(','function accountForm(');
 const profiles={现金:{currency:'CNY',calibration:{balance:0,baseline:0}},银行卡:{currency:'CNY',calibration:{balance:0,baseline:0}},朋友:{currency:'CNY',calibration:{balance:0,baseline:0}},美元账户:{currency:'USD',cnyRate:7,calibration:{balance:0,baseline:0}}};
 const c=context({rows:fixtureRows.slice(),prefs:{accountProfiles:profiles},POPULAR_CURRENCIES:[],ledgerRuntimeRates:{}},code);
 assert.equal(run(c,'accountRawNet("现金","CNY")'),50);
 assert.equal(run(c,'accountRawNet("银行卡","CNY")'),20);
 assert.equal(run(c,'accountRawNet("朋友","CNY")'),10);
 assert.equal(run(c,'accountRawNet("美元账户","USD")'),-2);
 assert.equal(run(c,'stats(rows).income'),100);
 assert.equal(run(c,'stats(rows).expense'),39);
 assert.equal(run(c,'financial().ready'),false,'missing conversion cannot be shown as exact net worth');
 c.rows=fixtureRows.filter(r=>r.id!=='missing-fx');
 assert.equal(run(c,'financial().net'),66);
 c.rows=c.rows.map(r=>r.id==='expense'?{...r,amount:'35'}:r);
 assert.equal(run(c,'financial().net'),56);
 c.rows=c.rows.filter(r=>r.id!=='transfer');
 assert.equal(run(c,'financial().net'),56,'same-currency transfer changes accounts, not net worth');
});

const mergeCode=section('function sourceStamp(','async function folderReadCsv(');
test('three-source merge honors newer deletion; ZIP without tombstones can resurrect an old bill',()=>{
 const c=context({isDeletion:r=>{try{return JSON.parse(r.extras||'{}')._starDeleted===true}catch{return false}}},mergeCode);
 const old=bill('same','2026-10-01 10:00:00','支出',10,'现金');
 const deleted={...old,extras:'{"_starDeleted":true}',updated_at:'2026-10-09T00:00:00.000Z'};
 c.old=old;c.deleted=deleted;
 assert.equal(run(c,'mergeSourceRows([old],[],[deleted]).length'),0);
 assert.equal(run(c,'mergeSourceRows([old],[],[]).length'),1,'a visible-only older ZIP has no delete state');
});

function accountContext(fail=false,linked=false){
 const original=bill('tx','2026-10-01 10:00:00','转账',10,'甲','乙');
 const state={rows:[original],prefs:{mainName:'测试账本',accountProfiles:{甲:{type:'stored'},乙:{type:'stored'}},accountTypes:{甲:'stored'},accountOrder:{default:['甲','乙']},accountAliases:{甲:['旧甲']}},diskCsv:JSON.stringify([original]),diskPrefs:null,writes:[]};
 state.diskPrefs=JSON.stringify(state.prefs);
 const c=context({native:false,folderHandle:linked?{}:null,rows:state.rows,prefs:state.prefs,
  accountData:()=>[['甲',{}],['乙',{}]],accountProfile:()=>({type:'stored'}),
  csvWrite:rows=>JSON.stringify(rows),
  localWrite:async (_action,_r,_id,extra)=>{state.writes.push('csv');state.diskCsv=extra.csv;state.rows=JSON.parse(extra.csv);c.rows=state.rows},
  savePrefs:async changes=>{state.writes.push('prefs');if(fail)throw Error('settings write failed');c.prefs={...c.prefs,...changes};state.diskPrefs=JSON.stringify(c.prefs)},
  putBundle:async entries=>{state.writes.push('bundle');if(fail)throw Error('atomic write failed');state.diskCsv=entries.csv;state.diskPrefs=JSON.stringify(entries.prefs)},
  saveCompleteImportRecovery:async()=>{state.writes.push('recovery')},stopAutoRefresh:()=>{},storeFolder:async()=>{state.writes.push('disconnect')},
  $:()=>({value:'乙'}),takeCsv:csv=>{c.rows=JSON.parse(csv)},close:()=>{},render:()=>{},toast:()=>{}
 },section('async function renameAccount(','function accountDeleteForm(')+section('async function commitLocalAccountChange(','async function saveAccountForm('));
 return {c,state};
}
test('local account rename commits bills and settings together',async()=>{
 const {c,state}=accountContext();await run(c,'renameAccount("甲","新甲")');
 assert.deepEqual(state.writes,['bundle']);
 assert.equal(JSON.parse(state.diskCsv)[0].account,'新甲');
 assert.equal(JSON.parse(state.diskPrefs).accountProfiles['新甲'].type,'stored');
 assert.equal(JSON.parse(state.diskPrefs).accountProfiles['甲'],undefined);
});
test('failed local rename leaves both persisted and visible state unchanged',async()=>{
 const {c,state}=accountContext(true),beforeCsv=state.diskCsv,beforePrefs=state.diskPrefs;
 await assert.rejects(()=>run(c,'renameAccount("甲","新甲")'));
 assert.equal(state.diskCsv,beforeCsv);assert.equal(state.diskPrefs,beforePrefs);
 assert.equal(c.rows[0].account,'甲');assert.ok(c.prefs.accountProfiles['甲']);
});
test('failed local account deletion leaves bills and settings unchanged',async()=>{
 const {c,state}=accountContext(true),beforeCsv=state.diskCsv,beforePrefs=state.diskPrefs;
 await assert.rejects(()=>run(c,'deleteAccount("甲","bills")'));
 assert.equal(state.diskCsv,beforeCsv);assert.equal(state.diskPrefs,beforePrefs);
 assert.equal(c.rows.length,1);assert.ok(c.prefs.accountProfiles['甲']);
});

test('account deletion migrates both account references and removes obsolete configuration',async()=>{
 const {c,state}=accountContext();await run(c,'deleteAccount("甲","migrate")');
 assert.deepEqual(state.writes,['bundle']);
 const record=JSON.parse(state.diskCsv)[0],settings=JSON.parse(state.diskPrefs);
 assert.equal(record.account,'乙');assert.equal(record.account2,'乙');
 assert.equal(settings.accountProfiles['甲'],undefined);
 assert.equal(settings.accountTypes['甲'],undefined);
 assert.equal(settings.accountOrder.default.includes('甲'),false);
});

test('linked workspace account failure creates a recovery point before writing and disconnects',async()=>{
 const {c,state}=accountContext(true,true);
 await assert.rejects(()=>run(c,'renameAccount("甲","新甲")'),/恢复|工作区/);
 assert.equal(state.writes[0],'recovery');
 assert.equal(c.folderHandle,null);
});

test('a failed IndexedDB transaction is not reported as saved by localStorage',async()=>{
 const data={};const ls={getItem:key=>data[key]??null,setItem:(key,value)=>{data[key]=value}};
 const c=context({native:false,prefs:{mainName:'测试账本'},workspace:{names:['测试账本'],active:'测试账本',mode:'local'},WORKSPACE_KEY:'workspace-v1',LOCAL_FALLBACK_ACTIVE_KEY:'star_ledger_fallback_active',ledgerCsvKey:n=>'ledger:'+n+':csv',ledgerPrefsKey:n=>'ledger:'+n+':prefs',normalizeWorkspace:x=>x,localStorage:ls,noteBackupWrite:()=>{},db:async()=>({close:()=>{},transaction:()=>{throw Error('quota abort')}})},section('async function putBundle(','async function ensurePersistentStorage('));
 await assert.rejects(()=>run(c,'putBundle({csv:"new",prefs:{mainName:"测试账本"}})'));
 assert.equal(data.star_ledger_bundle,undefined);
});

test('emergency fallback stays authoritative after IndexedDB reappears',async()=>{
 const data={};let opens=0;
 const ls={getItem:key=>data[key]??null,setItem:(key,value)=>{data[key]=value}};
 const c=context({native:false,prefs:{mainName:'测试账本'},workspace:{names:['测试账本'],active:'测试账本',mode:'local'},WORKSPACE_KEY:'workspace-v1',LOCAL_FALLBACK_ACTIVE_KEY:'star_ledger_fallback_active',ledgerCsvKey:n=>'ledger:'+n+':csv',ledgerPrefsKey:n=>'ledger:'+n+':prefs',normalizeWorkspace:x=>x,localStorage:ls,noteBackupWrite:()=>{},db:async()=>{opens++;throw Error('IDB unavailable')}},section('async function putBundle(','async function ensurePersistentStorage('));
 await run(c,'putBundle({csv:"new",prefs:{mainName:"测试账本"}})');
 assert.equal(data.star_ledger_fallback_active,'1');
 c.db=async()=>{opens++;throw Error('stale IndexedDB copy')};
 assert.equal(await run(c,'get("csv")'),'new');
 assert.equal(opens,1,'fallback reads must not prefer stale IndexedDB values');
 await run(c,'putBundle({csv:"newer",prefs:{mainName:"测试账本"}})');
 assert.equal(await run(c,'get("csv")'),'newer');
 assert.equal(opens,1,'writes stay on the same backend until explicit migration');
});

test('failed local preference write does not change visible settings',async()=>{
 const c=context({native:false,prefs:{mainName:'测试账本',appearance:'light'},folderHandle:null,
  put:async()=>{throw Error('storage full')},markAutoBackupDirty:()=>{},applyTheme:()=>{},render:()=>{}
 },section('async function savePrefs(','function nativeCommand('));
 await assert.rejects(()=>run(c,'savePrefs({appearance:"dark"})'),/storage full/);
 assert.equal(c.prefs.appearance,'light');
});
