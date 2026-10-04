// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: green; icon-glyph: magic;
// StarLedger · Scriptable bridge. Programmatic file/folder/module names are ASCII-only.
// UI strings and ledger content may remain Chinese.
module.exports.meta={project:'StarLedgerCore',version:'1.1.0-rc14'};
const fm=FileManager.iCloud(),docs=fm.documentsDirectory(),ROOT_NAME='StarLedger',LEGACY_ROOT_NAME='星账本';
const root=fm.joinPath(docs,ROOT_NAME),webRoot=fm.joinPath(root,'Web'),dataRoot=fm.joinPath(root,'Data'),scriptsRoot=fm.joinPath(root,'Scripts'),versionsRoot=fm.joinPath(scriptsRoot,'Versions'),legacyRoot=fm.joinPath(docs,LEGACY_ROOT_NAME);
for(let dir of [root,webRoot,dataRoot,scriptsRoot,versionsRoot])if(!fm.fileExists(dir))fm.createDirectory(dir,true);
const CONFIG_FILE='StarLedgerConfig.json',RELATIONS_FILE='StarLedgerRelations.json',DIAG_FILE='StarLedgerDiagnostic.txt',OCR_DIAG_FILE='StarLedgerOCRDiagnostic.txt';
const cfgPath=fm.joinPath(dataRoot,CONFIG_FILE),relationsPath=fm.joinPath(dataRoot,RELATIONS_FILE),diagPath=fm.joinPath(dataRoot,DIAG_FILE),ocrDiagPath=fm.joinPath(dataRoot,OCR_DIAG_FILE);
function versionParts(file,prefix,ext){
 let m=file.match(new RegExp('^'+prefix+'_v(\\d+)\\.(\\d+)\\.(\\d+)(?:-rc(\\d+(?:\\.\\d+)*))?\\.'+ext+'$','i'));
 if(!m)return null;return {base:[+m[1],+m[2],+m[3]],rc:m[4]?m[4].split('.').map(Number):null}
}
function compareVersion(a,b){for(let i=0;i<3;i++){let d=a.base[i]-b.base[i];if(d)return d}if(a.rc===null&&b.rc!==null)return 1;if(a.rc!==null&&b.rc===null)return-1;if(a.rc===null)return 0;let n=Math.max(a.rc.length,b.rc.length);for(let i=0;i<n;i++){let d=(a.rc[i]||0)-(b.rc[i]||0);if(d)return d}return 0}
function latestVersionedFile(dir,prefix,ext){
 if(!fm.fileExists(dir))return '';let items=[];for(let file of fm.listContents(dir)){let version=versionParts(file,prefix,ext);if(version)items.push({file,version})}
 items.sort((a,b)=>compareVersion(b.version,a.version)||b.file.localeCompare(a.file,'en'));return items[0]?.file||''
}
function latestViewerPath(){
 let file=latestVersionedFile(webRoot,'StarLedger','html');
 if(!file)throw Error('请把 StarLedger_v*.html 放进 iCloud Drive/Scriptable/StarLedger/Web 文件夹');
 return fm.joinPath(webRoot,file)
}
function latestRecognizerModuleName(){
 let file=latestVersionedFile(versionsRoot,'StarLedgerRecognizer','js');return file?'StarLedger/Scripts/Versions/'+file.replace(/\.js$/i,''):''
}
let recognizerCacheName='',recognizerCache=null;
function loadLatestRecognizer(){
 let name=latestRecognizerModuleName();if(!name)return null;if(name===recognizerCacheName&&recognizerCache)return recognizerCache;
 let mod=importModule(name),meta=mod?.meta;if(meta?.project!=='StarLedgerRecognizer')throw Error(name+' 的 meta.project 不正确');
 recognizerCacheName=name;recognizerCache=mod;return mod
}
function oldAsciiTarget(file){
 if(/^StarLedger_v\d+\.\d+\.\d+(?:-rc\d+(?:\.\d+)*)?\.html$/i.test(file))return [webRoot,file];
 if(file===CONFIG_FILE||file===DIAG_FILE||file==='StarLedgerDiagnostic_legacy.txt'||file==='StarLedger_Settings_Backup.json'||/\.csv$/i.test(file)||/_catalog\.json$/i.test(file))return [dataRoot,file];
 return null
}
function legacyTarget(file){
 if(file==='主文件名.json')return [dataRoot,CONFIG_FILE];
 if(file==='启动诊断.txt')return [dataRoot,'StarLedgerDiagnostic_legacy.txt'];
 if(file==='星账本_设置备份.json')return [dataRoot,'StarLedger_Settings_Backup.json'];
 let m=file.match(/^(.*)_手机主账本_上次备份\.csv$/);if(m)return [dataRoot,m[1]+'_mobile_previous.csv'];
 m=file.match(/^(.*)_手机主账本\.csv$/);if(m)return [dataRoot,m[1]+'_mobile.csv'];
 m=file.match(/^(.*)_选项目录\.json$/);if(m)return [dataRoot,m[1]+'_catalog.json'];
 m=file.match(/^账本_(v\d+\.\d+\.\d+(?:-rc\d+(?:\.\d+)*)?\.html)$/);if(m)return [webRoot,'StarLedger_'+m[1]];
 if(/^[\x20-\x7E]+$/.test(file)&&(/\.csv$/i.test(file)||/\.json$/i.test(file)))return [dataRoot,file];
 return null
}
async function copyIfMissing(src,dest){
 if(fm.fileExists(dest)||!fm.fileExists(src))return;
 try{if(fm.isFileStoredIniCloud(src))await fm.downloadFileFromiCloud(src);fm.copy(src,dest)}catch(e){trace?.('旧文件迁移跳过',String(e.message||e))}
}
async function migrateLegacyStorage(){
 // Previous ASCII layout: StarLedger files lived directly in the StarLedger root.
 for(let file of fm.listContents(root)){
  let target=oldAsciiTarget(file);if(!target)continue;
  await copyIfMissing(fm.joinPath(root,file),fm.joinPath(target[0],target[1]));
 }
 // Original Chinese layout: copy only; never overwrite or delete the old data.
 if(fm.fileExists(legacyRoot))for(let file of fm.listContents(legacyRoot)){
  let target=legacyTarget(file);if(!target)continue;
  await copyIfMissing(fm.joinPath(legacyRoot,file),fm.joinPath(target[0],target[1]));
 }
}let diagnostic=[];
function trace(stage,detail=''){diagnostic.push(new Date().toISOString()+' '+stage+(detail?' · '+String(detail).slice(0,180):''));try{fm.writeString(diagPath,diagnostic.join('\n'))}catch(e){}}
let activeOCRDiagnostic=null;
function ocrDiagPlain(value,depth=0){
 if(depth>8)return '[max-depth]';
 if(value===null||value===undefined||typeof value==='string'||typeof value==='number'||typeof value==='boolean')return value;
 if(Array.isArray(value))return value.slice(0,300).map(x=>ocrDiagPlain(x,depth+1));
 if(value instanceof Set)return [...value].slice(0,300).map(x=>ocrDiagPlain(x,depth+1));
 if(value instanceof Map)return Object.fromEntries([...value].slice(0,300).map(([k,v])=>[String(k),ocrDiagPlain(v,depth+1)]));
 if(typeof value==='object'){let out={};for(let [k,v] of Object.entries(value)){if(typeof v==='function')continue;out[k]=ocrDiagPlain(v,depth+1)}return out}
 return String(value)
}
function writeOCRDiagnostic(){
 if(!activeOCRDiagnostic)return;
 try{
  let d=activeOCRDiagnostic,parts=[
   'StarLedger OCR Diagnostic',
   'session: '+d.session,
   'started: '+d.started,
   'core: '+d.core,
   'mode: '+d.mode,
   'ledger: '+d.ledger,
   '',
   '=== RAW OCR ===',
   d.rawOCR||'',
   '',
   '=== CONTEXT ===',
   JSON.stringify(d.context||{},null,2),
   '',
   '=== EVENTS ==='
  ];
  for(let event of d.events||[])parts.push('\n['+event.time+'] '+event.stage+'\n'+JSON.stringify(event.data??{},null,2));
  fm.writeString(ocrDiagPath,parts.join('\n'))
 }catch(e){trace('OCR 诊断写入失败',String(e.message||e))}
}
function beginOCRDiagnostic(mode,name,raw,context={}){
 activeOCRDiagnostic={session:'OCR-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),started:new Date().toISOString(),core:'1.1.0-rc14',mode:String(mode||''),ledger:String(name||''),rawOCR:String(raw||'').slice(0,20000),context:ocrDiagPlain(context),events:[]};
 writeOCRDiagnostic()
}
function ocrDiag(stage,data={}){if(!activeOCRDiagnostic)return;activeOCRDiagnostic.events.push({time:new Date().toISOString(),stage:String(stage||''),data:ocrDiagPlain(data)});writeOCRDiagnostic()}
function ocrStateSnapshot(state){return {type:String(state?.type||''),amount:state?.amount??'',amountJsType:typeof state?.amount,category:String(state?.category||''),subcategory:String(state?.subcategory||''),account:String(state?.account||''),account2:String(state?.account2||''),book:String(state?.book||''),merchant:String(state?.merchant||''),note:String(state?.note||''),currency:String(state?.currency||''),date:String(state?.date||'')}}
const COLS=['id','date','type','category','subcategory','amount','account','account2','reimbursement','note','image','role','tags','currency','merchant','book','extras','created_at','updated_at'];
const header='\uFEFF'+COLS.join(',')+'\r\n';
function digest(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function safeName(v){v=String(v||'').trim();if(!v||v.length>60||/[\\/:*?"<>|]/.test(v))throw Error('主文件名无效');return v}
let configCache=null;
function configMirror(){let local=FileManager.local();return [local,local.joinPath(local.documentsDirectory(),'StarLedgerConfigMirror.json')]}
function readConfig(){if(configCache)return configCache;let cloud=null,mirror=null;try{cloud=JSON.parse(fm.readString(cfgPath))}catch(e){}
 try{let [local,path]=configMirror();if(local.fileExists(path))mirror=JSON.parse(local.readString(path))}catch(e){}
 let valid=x=>x&&typeof x==='object'&&!Array.isArray(x),value=valid(mirror)&&Number(mirror._starConfigUpdatedAt||0)>Number(cloud?._starConfigUpdatedAt||0)?mirror:cloud;
 configCache=valid(value)?{...value,mainName:typeof value.mainName==='string'?value.mainName:''}:{mainName:''};return configCache}
function saveConfig(v){let result={...v,_starConfigUpdatedAt:Math.max(Date.now(),Number(configCache?._starConfigUpdatedAt||0)+1)};fm.writeString(cfgPath,JSON.stringify(result));try{let [local,path]=configMirror();local.writeString(path,JSON.stringify(result))}catch(e){}configCache=result;return result}
// Rates are display-only reference prices. Fetch each configured currency once per viewer launch.
async function refreshAccountRates(codes){
 let wanted=[...new Set(codes)].filter(code=>/^[A-Z]{3}$/.test(code)&&code!=='CNY');
 let current=readConfig(),rates={...(current.fxRates||{})};
 if(!wanted.length)return rates;
 try{
  let request=new Request('https://api.frankfurter.dev/v2/rates?base=cny&quotes='+wanted.map(x=>x.toLowerCase()).join(','));
  request.timeoutInterval=6;
  let response=await request.loadJSON();
  if(!Array.isArray(response))throw Error('汇率接口没有返回列表');
  let changed=false;
  for(let row of response){let code=String(row.quote||'').toUpperCase(),perCny=Number(row.rate);
   if(wanted.includes(code)&&perCny>0&&Number.isFinite(perCny)){rates[code]={rate:1/perCny,date:row.date,source:'Frankfurter'};changed=true}}
  if(changed)saveConfig({...readConfig(),fxRates:rates});
 }catch(e){trace('账户汇率更新失败，沿用上次缓存',String(e.message||e))}
 return rates;
}
function pathFor(v){return fm.joinPath(dataRoot,safeName(v)+'_scriptable.csv')}
function desktopPath(v){return fm.joinPath(dataRoot,safeName(v)+'_desktop.csv')}
function basePath(v){return fm.joinPath(dataRoot,safeName(v)+'_mobile.csv')}
function optionsPath(v){return fm.joinPath(dataRoot,safeName(v)+'_catalog.json')}
function normalizeRelations(value){
 let groups=Array.isArray(value?.groups)?value.groups:[],seen=new Set(),out=[];
 for(let raw of groups){if(!raw||typeof raw!=='object')continue;let id=String(raw.id||'').trim();if(!id||seen.has(id))continue;seen.add(id);let members=[],mseen=new Set();for(let m of Array.isArray(raw.members)?raw.members:[]){let mid=String(typeof m==='string'?m:m?.id||'').trim();if(!mid||mseen.has(mid))continue;mseen.add(mid);members.push({id:mid,role:String(typeof m==='object'&&m?.role||'auto')})}if(members.length>=2)out.push({id,type:String(raw.type||'compound'),members,virtualAdjustments:Array.isArray(raw.virtualAdjustments)?raw.virtualAdjustments:[],createdAt:String(raw.createdAt||''),updatedAt:String(raw.updatedAt||'')})}
 return {groups:out,suppressedLegacy:[...new Set((Array.isArray(value?.suppressedLegacy)?value.suppressedLegacy:[]).map(x=>String(x||'').trim()).filter(Boolean))],updatedAt:String(value?.updatedAt||'')}
}
async function readRelationsStore(){try{await ensure(relationsPath)}catch(e){};if(!fm.fileExists(relationsPath))return {version:1,ledgers:{}};try{let v=JSON.parse(fm.readString(relationsPath));if(!v||typeof v!=='object')throw Error('invalid');if(v.version===1&&v.ledgers&&typeof v.ledgers==='object')return v}catch(e){trace('关联文件读取失败，按空关系继续',String(e.message||e))}return {version:1,ledgers:{}}}
async function readRelations(name){let store=await readRelationsStore();return normalizeRelations(store.ledgers?.[safeName(name)]||{})}
async function writeRelations(name,value){let store=await readRelationsStore(),key=safeName(name),next=normalizeRelations(value);next.updatedAt=new Date().toISOString();store={version:1,ledgers:{...(store.ledgers||{}),[key]:next},updatedAt:new Date().toISOString()};fm.writeString(relationsPath,JSON.stringify(store,null,2));return next}

async function ensure(path){if(fm.fileExists(path)&&fm.isFileStoredIniCloud(path))await fm.downloadFileFromiCloud(path)}
async function readDelta(v){let p=pathFor(v);await ensure(p);return fm.fileExists(p)?fm.readString(p):header}
async function readDesktop(v){let p=desktopPath(v);await ensure(p);return fm.fileExists(p)?fm.readString(p):header}
async function readBase(v){let p=basePath(v);await ensure(p);return fm.fileExists(p)?parse(fm.readString(p)):[]}
function deleted(r){try{return JSON.parse(r.extras||'{}')._starDeleted===true}catch(e){return false}}
function recordStamp(r){let raw=String(r.updated_at||r.created_at||'').trim(),t=raw?Date.parse(raw):NaN;return Number.isFinite(t)?t:0}
function combine(baseRows,deltaRows,desktopRows=[]){
 let map=new Map(),sources=[baseRows,deltaRows,desktopRows];
 for(let rank=0;rank<sources.length;rank++)for(let r of sources[rank]){
  if(!r?.id)continue;
  let stamp=recordStamp(r),prev=map.get(r.id);
  if(!prev||stamp>prev.stamp||(stamp===prev.stamp&&rank>=prev.rank))map.set(r.id,{r,stamp,rank});
 }
 let visible=[...map.values()].map(x=>x.r).filter(r=>!deleted(r));
 return serialize(visible.sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||''))));
}
async function readCombined(v){return combine(await readBase(v),parse(await readDelta(v)),parse(await readDesktop(v)))}
function buildOptions(name,csv){
 let counts=()=>new Map(),categories={'支出':counts(),'收入':counts()},accounts=counts(),books=counts(),tags=counts(),merchants=counts(),currencies=counts();
 let add=(map,value)=>{value=String(value||'').trim();if(value)map.set(value,(map.get(value)||0)+1)};
 for(let r of parse(csv)){
  if(Object.prototype.hasOwnProperty.call(categories,r.type)){let category=String(r.category||'').trim();if(category){let entry=categories[r.type].get(category)||{count:0,subcategories:counts()};entry.count++;add(entry.subcategories,r.subcategory);categories[r.type].set(category,entry)}}
  add(accounts,r.account);add(accounts,r.account2);add(books,r.book);add(merchants,r.merchant);add(currencies,r.currency);
  for(let tag of String(r.tags||'').split(/[,，;；\s]+/))add(tags,tag);
 }
 let sort=map=>[...map].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-CN'));
 return {version:1,mainName:name,revision:digest(csv),categories:Object.fromEntries(Object.entries(categories).map(([type,items])=>[type,[...items].map(([name,value])=>({name,count:value.count,subcategories:sort(value.subcategories)})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-CN'))])),accounts:sort(accounts),books:sort(books),tags:sort(tags),merchants:sort(merchants),currencies:sort(currencies)};
}
async function sharedOptions(name,csv){
 let path=optionsPath(name),revision=digest(csv);try{await ensure(path)}catch(e){trace('选项目录缓存不可读',e.message||e)}
 if(fm.fileExists(path)){try{let data=JSON.parse(fm.readString(path));if(data.version===1&&data.mainName===name&&data.revision===revision&&data.categories&&Array.isArray(data.accounts)&&Array.isArray(data.tags))return data}catch(e){}}
 let data=buildOptions(name,csv);try{fm.writeString(path,JSON.stringify(data))}catch(e){trace('选项目录暂未写入',e.message||e)}return data;
}
function quote(x){return '"'+String(x??'').replace(/"/g,'""')+'"'}
function serialize(rows){return header+rows.map(r=>COLS.map(k=>quote(r[k])).join(',')).join('\r\n')+(rows.length?'\r\n':'')}
function parse(csv){let text=String(csv).replace(/^\uFEFF/,''),records=[],record=[],cell='',quoted=false;for(let i=0;i<text.length;i++){let c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){cell+='"';i++}else if(c==='"')quoted=false;else cell+=c}else if(c==='"')quoted=true;else if(c===','){record.push(cell);cell=''}else if(c==='\n'){record.push(cell.replace(/\r$/,''));records.push(record);record=[];cell=''}else cell+=c}if(record.length||cell){record.push(cell.replace(/\r$/,''));records.push(record)}let head=records.shift();if(!head||!COLS.every(k=>head.includes(k)))throw Error('增量 CSV 格式不匹配');return records.filter(r=>r.some(Boolean)).map(r=>Object.fromEntries(head.map((k,i)=>[k,r[i]||''])))}

function recognizerHistory(csv){
 return parse(csv).filter(r=>r&&['支出','收入'].includes(r.type)&&r.category&&r.subcategory).map(r=>({id:r.id||'',date:r.date||'',type:r.type||'',category:r.category||'',subcategory:r.subcategory||'',amount:r.amount||'',account:r.account||'',account2:r.account2||'',merchant:r.merchant||'',note:r.note||'',tags:r.tags||'',book:r.book||''}))
}
function liveAccountOptions(csv){
 let cfg=readConfig(),counts=new Map(),profiles=cfg.accountProfiles&&typeof cfg.accountProfiles==='object'?cfg.accountProfiles:{},deleted=new Set(cfg.deletedAccounts||[]);
 let add=(value,weight=1)=>{value=String(value||'').trim();if(!value||deleted.has(value)||profiles[value]?.hidden)return;counts.set(value,(counts.get(value)||0)+weight)};
 for(let row of parse(csv)){add(row.account,1);add(row.account2,1)}
 for(let name of Object.keys(profiles))add(name,0);
 return [...counts].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'zh-CN'))
}
function liveVisibleAccounts(csv){return liveAccountOptions(csv).map(x=>x.name)}
function withLiveAccounts(options,csv){return {...options,accounts:liveAccountOptions(csv)}}
async function selectName(current){
 let files=fm.listContents(dataRoot),found=[];
 for(let file of files){
  let m=file.match(/^(.*)_(?:scriptable|desktop|mobile|手机主账本)\.csv$/);
  if(m&&m[1])found.push(m[1]);
 }
 let names=[...new Set([current,...found].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 let a=new Alert();a.title='主文件名';a.message='当前：'+(current||'未设置')+'\n手机写入「_scriptable.csv」，电脑写入「_desktop.csv」，两端都会合并读取。';
 a.addAction('使用当前名称');a.addAction('切换或新建');a.addCancelAction('取消');
 let choice=await a.presentAlert();if(choice===-1)return null;if(choice===0&&current)return current;
 let b=new Alert();b.title='选择主文件名';for(let n of names)b.addAction(n);b.addAction('输入新名称');b.addCancelAction('返回');
 let idx=await b.presentAlert();if(idx<0)return null;if(idx<names.length)return names[idx];
 let c=new Alert();c.title='设置主文件名';c.message='电脑和手机必须使用同一个主文件名。';c.addTextField('例如：我的账本',current||'');c.addAction('确定');c.addCancelAction('返回');
 if(await c.presentAlert()<0)return null;return safeName(c.textFieldValue(0))
}
async function chooseAtStart(){let c=readConfig();if(c.mainName){try{return safeName(c.mainName)}catch(e){}}let name=await selectName('');if(name===null)return null;saveConfig({...c,mainName:name});return name}
async function mutate(cmd,name){if(cmd.action==='switchMain'){let selected=await selectName(name);if(!selected)return {ok:true,csv:await readCombined(name),mainName:name,settings:{mainName:name},ledgerReady:fm.fileExists(basePath(name))||fm.fileExists(pathFor(name))||fm.fileExists(desktopPath(name))};saveConfig({...readConfig(),mainName:selected});return {ok:true,csv:await readCombined(selected),mainName:selected,catalog:await readCatalog(selected),settings:{mainName:selected},ledgerReady:fm.fileExists(basePath(selected))||fm.fileExists(pathFor(selected))||fm.fileExists(desktopPath(selected))}}
 if(cmd.action==='accountFx'){let code=String(cmd.code||'').toUpperCase();if(!/^[A-Z]{3}$/.test(code))throw Error('币种代码无效');let rates=await refreshAccountRates([code]);if(code!=='CNY'&&!rates[code])throw Error('没有该币种的参考汇率，请联网后再试');return {ok:true,settings:{fxRates:rates}}}
 if(cmd.action==='saveSettings'){let c=saveConfig({...readConfig(),...cmd.settings,mainName:name});return {ok:true,settings:c}}
 if(cmd.action==='reloadSettings'){configCache=null;return {ok:true,settings:{...readConfig(),mainName:name}}}
 if(cmd.action==='replaceLedger'){
  let desired=parse(String(cmd.csv||''));if(!desired.length&&!cmd.allowEmpty)throw Error('不能同步空账本');
  let current=parse(await readCombined(name)),delta=parse(await readDelta(name)),baseRows=await readBase(name),desktopRows=parse(await readDesktop(name)),now=new Date().toISOString(),oldMap=new Map(current.map(r=>[r.id,r])),newMap=new Map(desired.map(r=>[r.id,r]));
  for(let [id,old] of oldMap)if(!newMap.has(id)){let marker={...old,updated_at:now},e={};try{let v=JSON.parse(marker.extras||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))e=v}catch(_e){}e._starDeleted=true;marker.extras=JSON.stringify(e);let i=delta.findIndex(r=>r.id===id);if(i>=0)delta[i]=marker;else delta.unshift(marker)}
  for(let [id,row] of newMap){let old=oldMap.get(id),a=old?JSON.stringify({...old,updated_at:''}):'',b=JSON.stringify({...row,updated_at:''});if(!old||a!==b){let next={...Object.fromEntries(COLS.map(k=>[k,''])),...(old||{}),...row,id,created_at:row.created_at||old?.created_at||now,updated_at:now};try{let e=JSON.parse(next.extras||'{}');if(e&&typeof e==='object'&&!Array.isArray(e)){delete e._starDeleted;next.extras=Object.keys(e).length?JSON.stringify(e):''}}catch(_e){}let i=delta.findIndex(r=>r.id===id);if(i>=0)delta[i]=next;else delta.unshift(next)}}
  fm.writeString(pathFor(name),serialize(delta));let csv=combine(baseRows,delta,desktopRows),cfg=saveConfig({...readConfig(),undoBatch:null});return {ok:true,csv,settings:{...cfg,mainName:name}}
 }
 if(cmd.action==='refresh'){let current=await readCombined(name),settings={...readConfig(),mainName:name};return digest(current)===cmd.revision?{ok:true,settings}:{ok:true,csv:current,settings}}
 if(cmd.action==='importLedger'){
  let path;try{path=await DocumentPicker.openFile()}catch(e){return {ok:true,cancelled:true}}
  if(!path||!String(path).toLowerCase().endsWith('.csv'))throw Error('请选择 .csv 账本文件');
  let contents;try{contents=FileManager.local().readString(path)}catch(e){contents=fm.readString(path)}
  let records=parse(contents);if(!records.length)throw Error('CSV 没有账单记录');
  records=records.map((r,i)=>({...r,id:r.id||'PHONE-'+digest(JSON.stringify(r))+'-'+i}));
  let target=basePath(name);if(fm.fileExists(target)){let a=new Alert();a.title='替换手机端主账本？';a.message='将用选中的 '+records.length+' 笔替换手机端主账本副本。原始 CSV 不变，Scriptable 增量记录保留。';a.addDestructiveAction('替换副本');a.addCancelAction('取消');if(await a.presentAlert()<0)return {ok:true,cancelled:true}}
  if(fm.fileExists(target)){await ensure(target);fm.writeString(fm.joinPath(dataRoot,safeName(name)+'_mobile_previous.csv'),fm.readString(target))}
  fm.writeString(target,serialize(records));return {ok:true,csv:await readCombined(name),imported:records.length,settings:{...readConfig(),mainName:name}}
 }
 if(cmd.action==='exportLedger'){await DocumentPicker.exportString(await readCombined(name),safeName(name)+'_mobile_full_backup.csv');return {ok:true,exported:true}}
 if(cmd.action==='exportConfig'){
  let cfg=readConfig(),keys=['accountGroups','accountProfiles','accountTypes','accountAliases','recordTitle','accountOrder','recordBlockOrder','searchFilterOrder','bannerConfigs','deletedAccounts','budgets','monthStartDay','theme','appearance','fxRates'];
  let settings=Object.fromEntries(keys.map(k=>[k,cfg[k]]).filter(([k,v])=>v!==undefined));
  await DocumentPicker.exportString(JSON.stringify({format:'star-ledger-settings',version:1,settings},null,2),'StarLedger_Settings_Backup.json');
  return {ok:true,exported:true}
 }
 if(cmd.action==='importConfig'){
  let path;try{path=await DocumentPicker.openFile()}catch(e){return {ok:true,cancelled:true}}
  if(!path)return {ok:true,cancelled:true};
  let source;try{source=FileManager.local().readString(path)}catch(e){source=fm.readString(path)}
  let data=JSON.parse(source),v=data.settings;if(data.format!=='star-ledger-settings'||data.version!==1||!v||!Array.isArray(v.accountGroups)||!v.accountGroups.length||!v.accountProfiles||typeof v.accountProfiles!=='object'||Array.isArray(v.accountProfiles))throw Error('设置备份格式不正确');
  let ids=v.accountGroups.map(g=>g.id),names=v.accountGroups.map(g=>g.name);
  if(ids.some(x=>typeof x!=='string'||!x)||names.some(x=>typeof x!=='string'||!x.trim())||new Set(ids).size!==ids.length||new Set(names).size!==names.length)throw Error('分组设置格式不正确');
  let keys=['accountGroups','accountProfiles','accountTypes','accountAliases','recordTitle','accountOrder','recordBlockOrder','searchFilterOrder','bannerConfigs','deletedAccounts','budgets','monthStartDay','theme','appearance','fxRates'],changes=Object.fromEntries(keys.filter(k=>v[k]!==undefined).map(k=>[k,v[k]])),cfg=saveConfig({...readConfig(),...changes,mainName:name});
  return {ok:true,settings:cfg}
 }
 if(cmd.action==='exportSnapshot'){let text=String(cmd.csv||'');parse(text);await DocumentPicker.exportString(text,safeName(name)+'_删除后备份.csv');return {ok:true,exported:true}}
 if(cmd.action==='bulkPatch'){
  let current=await readCombined(name);if(cmd.revision&&digest(current)!==cmd.revision)throw Error('账单已有新变动，请刷新后重试');
  let visible=parse(current),deltaText=await readDelta(name),changes=parse(deltaText),baseRows=await readBase(name),base=new Set(baseRows.map(r=>r.id)),op=cmd.operation||{},target=String(op.target||'').trim(),dest=String(op.dest||'').trim();
  if(!target||target.length>80||dest.length>80)throw Error('名称无效');
  if(op.kind==='bookRename'&&!dest)throw Error('请输入新账本名');
  if(op.kind==='tagRename'&&!dest)throw Error('请输入新标签名');
  if(['categoryRename','subcategoryRename'].includes(op.kind)&&(!dest||!['支出','收入'].includes(op.type)||!op.category))throw Error('分类名称无效');
  if(op.kind==='accountMigrate'&&(!dest||dest===target))throw Error('请选择另一个账户');
  if(!['bookRename','tagRename','tagRemove','tagDeleteBills','accountMigrate','accountDeleteBills','categoryRename','subcategoryRename'].includes(op.kind))throw Error('不支持此批量操作');
  let traceTag=String(op.traceTag||'').trim();if(traceTag&&(traceTag.length>60||/[,，;；\s]/.test(traceTag)))throw Error('标记标签不能包含空格或分隔符');
  let changed=0;for(let row of visible){let parts=String(row.tags||'').split(/[,，;；\s]+/).filter(Boolean),hit=['categoryRename','subcategoryRename'].includes(op.kind)?row.type===op.type&&row.category===op.category&&(op.kind==='categoryRename'||row.subcategory===target):op.kind==='bookRename'?row.book===target:['accountMigrate','accountDeleteBills'].includes(op.kind)?row.account===target||row.account2===target:parts.includes(target);if(!hit)continue;
   let index=changes.findIndex(r=>r.id===row.id),next={...row,updated_at:new Date().toISOString()};
   if(op.kind==='bookRename')next.book=dest;
   else if(op.kind==='categoryRename')next.category=dest;
   else if(op.kind==='subcategoryRename')next.subcategory=dest;
   else if(op.kind==='accountMigrate'){if(next.account===target)next.account=dest;if(next.account2===target)next.account2=dest}
   else if(['tagDeleteBills','accountDeleteBills'].includes(op.kind)){if(base.has(row.id)){next.extras=JSON.stringify({_starDeleted:true})}else{if(index>=0)changes.splice(index,1);changed++;continue}}
   else next.tags=[...new Set(parts.map(x=>x===target?(op.kind==='tagRemove'?'':dest):x).filter(Boolean))].join(', ');
   if(traceTag&&['bookRename','tagRename','categoryRename','subcategoryRename'].includes(op.kind))next.tags=[...new Set([...String(next.tags||'').split(/[,，;；\s]+/).filter(Boolean),traceTag])].join(', ');
   if(index>=0)changes[index]=next;else changes.unshift(next);changed++
  }
  if(!changed)throw Error('没有需要修改的账单');
  let after=serialize(changes);fm.writeString(pathFor(name),after);
  let cfg=saveConfig({...readConfig(),undoBatch:null});
  return {ok:true,csv:combine(baseRows,changes,parse(await readDesktop(name))),changed,settings:{...cfg,mainName:name}}
 }

 if(cmd.action==='loadRelations')return {ok:true,relations:await readRelations(name)};
 if(cmd.action==='saveRelations'){let relations=await writeRelations(name,cmd.relations||{});return {ok:true,relations}}
 if(cmd.action==='batchCommit'){
  if(!fm.fileExists(basePath(name))&&!fm.fileExists(pathFor(name))&&!fm.fileExists(desktopPath(name)))throw Error('尚未导入 CSV，不能记账；请先在主账本中导入');
  let current=await readCombined(name);if(cmd.revision&&digest(current)!==cmd.revision)throw Error('账单已在另一处变动，请关闭后重新打开');
  let deltaBefore=await readDelta(name),relationsStoreBefore=fm.fileExists(relationsPath)?fm.readString(relationsPath):null,delta=parse(deltaBefore),visible=new Map(parse(current).map(r=>[r.id,r])),items=Array.isArray(cmd.records)?cmd.records:[];
  if(!items.length)throw Error('没有可保存的账单');let now=new Date().toISOString(),idMap={};
  for(let i=0;i<items.length;i++){let item=items[i]||{},existing=String(item.id||''),record=item.record&&typeof item.record==='object'?item.record:null;if(!record)throw Error('第 '+(i+1)+' 笔账单内容无效');let requested=String(item.newId||'').trim(),id=existing||(/^[A-Za-z0-9._:-]{6,120}$/.test(requested)?requested:('SC-'+Date.now()+'-'+i+'-'+Math.random().toString(36).slice(2,8)));idMap[String(item.tempId||id)]=id;let old=existing?visible.get(existing):null;if(existing&&!old)throw Error('第 '+(i+1)+' 笔账单已经发生变化，请刷新后重试');let next={...Object.fromEntries(COLS.map(k=>[k,''])),...(old||{}),...record,id,created_at:old?.created_at||now,updated_at:now},idx=delta.findIndex(r=>r.id===id);if(idx>=0)delta[idx]=next;else delta.unshift(next)}
  let relationState=normalizeRelations(cmd.relationState||{});relationState.groups=relationState.groups.map(g=>({...g,members:g.members.map(m=>({id:idMap[m.id]||m.id,role:m.role||'auto'}))}));
  let nextDelta=serialize(delta);try{fm.writeString(pathFor(name),nextDelta);let relations=await writeRelations(name,relationState),csv=combine(await readBase(name),delta,parse(await readDesktop(name))),cfg=saveConfig({...readConfig(),undoBatch:null});return {ok:true,csv,ids:idMap,relations,settings:{...cfg,mainName:name}}}catch(e){try{fm.writeString(pathFor(name),deltaBefore)}catch(_){}try{if(relationsStoreBefore===null){if(fm.fileExists(relationsPath))fm.remove(relationsPath)}else fm.writeString(relationsPath,relationsStoreBefore)}catch(_){}throw e}
 }
 if(['add','update','reconcile'].includes(cmd.action)&&!fm.fileExists(basePath(name))&&!fm.fileExists(pathFor(name))&&!fm.fileExists(desktopPath(name)))throw Error('尚未导入 CSV，不能记账；请先在主账本中导入');
 let current=await readCombined(name),removing=['remove','bulkRemove'].includes(cmd.action);
 if(cmd.revision&&digest(current)!==cmd.revision&&!removing)throw Error('账单已在另一处变动，请关闭后重新打开');
 let rows=parse(await readDelta(name)),baseRows=await readBase(name),base=new Map(baseRows.map(r=>[r.id,r])),id=cmd.id;
 if(cmd.action==='add'||cmd.action==='reconcile'){let r=cmd.record||{},time=new Date().toISOString(),clientId=String(cmd.clientId||'').trim();id=/^[A-Za-z0-9._:-]{6,120}$/.test(clientId)?clientId:'SC-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);rows.unshift({...Object.fromEntries(COLS.map(k=>[k,''])),...r,id,created_at:time,updated_at:time});if(cmd.action==='reconcile'&&cmd.kind)saveConfig({...readConfig(),accountTypes:{...(readConfig().accountTypes||{}),[r.account]:cmd.kind}})}
 else if(cmd.action==='update'||cmd.action==='remove'||cmd.action==='bulkRemove'){
  let ids=cmd.action==='bulkRemove'?[...new Set(cmd.ids||[])]:[id],visible=new Map(parse(current).map(r=>[r.id,r]));
  if(!ids.length)throw Error('没有选择账单');
  if(cmd.action==='update'&&ids.some(x=>!visible.has(x)))throw Error('选择的账单已发生变化，请重新打开');
  for(let key of ids){let index=rows.findIndex(r=>r.id===key),original=visible.get(key);
   if(!original)continue; // Repeated deletion is successful if the record is already absent.
   if(cmd.action==='update'){let changed={...original,...cmd.record,id:key,updated_at:new Date().toISOString()};if(index>=0)rows[index]=changed;else rows.unshift(changed)}
   else if(base.has(key)){let marker={...original,extras:JSON.stringify({_starDeleted:true}),updated_at:new Date().toISOString()};if(index>=0)rows[index]=marker;else rows.unshift(marker)}
   else if(index>=0)rows.splice(index,1)
  }
 }
 else throw Error('此操作请在网页主账本中完成');
 let next=serialize(rows),p=pathFor(name);
 // Scriptable FileManager.writeString 覆盖原文件；只保存增量 CSV，不覆盖主账本。
 fm.writeString(p,next);
 // Combine the exact rows handed to writeString. Immediate iCloud reads can return an older snapshot.
 let combined=combine(baseRows,rows,parse(await readDesktop(name)));
 let cfg=saveConfig({...readConfig(),undoBatch:null});
 return {ok:true,csv:combined,id,settings:{...cfg,mainName:name}}
}
function darkAtLaunch(){let appearance=readConfig().appearance;return appearance==='dark'||appearance!=='light'&&Device.isUsingDarkAppearance()}
function nativeNow(){let d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);return d.toISOString().slice(0,19).replace('T',' ')}
function flattenOCRValue(value,depth=0){
 if(depth>6||value===null||value===undefined)return '';
 if(typeof value==='string'){
  let s=value.trim();
  if(depth<3&&s&&((s[0]==='['&&s.endsWith(']'))||(s[0]==='{'&&s.endsWith('}')))){try{let parsed=JSON.parse(s),out=flattenOCRValue(parsed,depth+1);if(out.trim())return out}catch(e){}}
  return value
 }
 if(typeof value==='number'||typeof value==='boolean')return String(value);
 if(Array.isArray(value))return value.map(x=>flattenOCRValue(x,depth+1)).filter(Boolean).join('\n');
 if(typeof value==='object'){
  // Shortcuts may hand Scriptable a dictionary, a list of recognized text
  // blocks, or nested {text}/{ocr}/{lines}/{blocks} structures.
  for(let key of ['ocr','text','recognizedText','lines','blocks','items'])if(key in value){let out=flattenOCRValue(value[key],depth+1);if(out.trim())return out}
 }
 return ''
}
function incomingOCRText(){
 let q=args.queryParameters||{},p=args.shortcutParameter;
 let qText=flattenOCRValue(q.ocr);if(qText.trim())return qText;
 let pText=flattenOCRValue(p);if(pText.trim())return pText;
 return ''
}
async function recognizeOCR(source,context={}){
 let fallback=()=>{let result=nativeOCR(source);ocrDiag('recognizer.fallback',{result});return result};
 try{
  let moduleName=latestRecognizerModuleName(),mod=loadLatestRecognizer();if(!mod||typeof mod.recognize!=='function')return fallback();
  ocrDiag('recognizer.loaded',{module:moduleName,meta:mod.meta||{}});
  let result=await Promise.resolve(mod.recognize(String(source||''),{now:nativeNow(),...context}));if(!result||typeof result!=='object')return fallback();
  ocrDiag('recognizer.result',result);
  if(result.documentGrouping)ocrDiag('document.grouping',result.documentGrouping);
  let value=x=>x&&typeof x==='object'&&'value'in x?x.value:x,
      amountValue=value(result.amount),
      merchant=String(value(result.merchant)||''),
      accountObj=result.account&&typeof result.account==='object'?result.account:null,
      account=accountObj?.matched===false?'':String(value(result.account)||''),
      account2Obj=result.account2&&typeof result.account2==='object'?result.account2:null,
      account2=account2Obj?.matched===false?'':String(value(result.account2)||''),
      note=String(value(result.note)||''),
      category=String(value(result.category)||''),subcategory=String(value(result.subcategory)||''),
      mapped={type:String(value(result.type)||'支出'),amount:amountValue===null||amountValue===undefined||amountValue===''?'':String(amountValue),date:String(value(result.date)||nativeNow()),merchant,note,account,account2,category,subcategory,recognizer:result};
  let mapRecord=raw=>{let v=x=>x&&typeof x==='object'&&'value'in x?x.value:x,a=raw?.account&&typeof raw.account==='object'&&raw.account.matched===false?'':String(v(raw?.account)||''),a2=raw?.account2&&typeof raw.account2==='object'&&raw.account2.matched===false?'':String(v(raw?.account2)||'');return {type:String(v(raw?.type)||'支出'),amount:v(raw?.amount)===null||v(raw?.amount)===undefined?'':String(v(raw?.amount)||''),date:String(v(raw?.date)||mapped.date||nativeNow()),merchant:String(v(raw?.merchant)||mapped.merchant||''),note:String(v(raw?.note)||''),account:a,account2:a2,category:String(v(raw?.category)||''),subcategory:String(v(raw?.subcategory)||''),relationRole:String(raw?.relationRole||'auto'),needsConfirmation:!!raw?.needsConfirmation}};
  mapped.records=Array.isArray(result.records)&&result.records.length?result.records.map(mapRecord):[mapRecord(result)];mapped.relationHints=Array.isArray(result.relationHints)?result.relationHints:[];
  trace('Recognizer '+(result.version||''),JSON.stringify({platform:value(result.platform)||'',type:mapped.type,amount:mapped.amount,merchant,account:account||accountObj?.suggested||'',warnings:result.warnings||[]}).slice(0,170));
  ocrDiag('prefill.mapped',{type:mapped.type,amount:mapped.amount,amountJsType:typeof mapped.amount,date:mapped.date,merchant:mapped.merchant,note:mapped.note,account:mapped.account,account2:mapped.account2,category:mapped.category,subcategory:mapped.subcategory,accountMatched:!!accountObj?.matched,accountSuggested:accountObj?.suggested||''});
  return mapped
 }catch(e){trace('Recognizer 加载失败，使用内置 OCR',String(e.message||e));ocrDiag('recognizer.error',{message:String(e.message||e),stack:String(e.stack||'')});return fallback()}
}
function nativeOCR(source){
 let text=String(source||'').slice(0,12000),lines=text.split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean),candidates=[];
 for(let i=0;i<lines.length;i++){
  if(/余额|优惠|原价|券|手续费|订单号|单号|积分/.test(lines[i]))continue;
  for(let match of lines[i].matchAll(/(?:[¥￥]\s*)?(-?\d{1,7}(?:,\d{3})*(?:\.\d{1,2})?)/g)){
   let n=Math.abs(Number(match[1].replace(/,/g,'')));if(!n||n>1e7||!/[¥￥.]/.test(match[0]))continue;
   let context=lines.slice(Math.max(0,i-1),i+1).join(' '),score=/(实付|支付金额|付款金额|交易金额|收款金额|到账金额|总计|合计)/.test(context)?10:/[¥￥]/.test(match[0])?5:1;
   if(/余额|优惠|原价|券|手续费/.test(context))score-=8;candidates.push({n,score,i});
  }
 }
 candidates.sort((a,b)=>b.score-a.score||a.i-b.i);
 let m=text.match(/(20\d{2})[年\/-](\d{1,2})[月\/-](\d{1,2})日?\s*(\d{1,2}):(\d{2})/),date=m?`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')} ${m[4].padStart(2,'0')}:${m[5]}:00`:nativeNow();
 let merchant=lines.find(x=>/^(?:收款方|交易对象|商家|商品说明|商品)[:：]/.test(x))?.replace(/^[^:：]+[:：]\s*/,'').slice(0,60)||'';
 return {type:/收款成功|收入|已到账|到账金额|收款金额/.test(text)&&!/付款成功|支付成功/.test(text)?'收入':'支出',amount:candidates[0]?.n?.toFixed(2)||'',date,merchant,note:merchant};
}
async function nativeText(title,labels,values){let a=new Alert();a.title=title;labels.forEach((label,i)=>a.addTextField(label,String(values[i]??'')));a.addAction('确定');a.addCancelAction('取消');if(await a.presentAlert()<0)return null;return labels.map((_,i)=>a.textFieldValue(i).trim())}
async function nativeMessage(title,message){let a=new Alert();a.title=title;a.message=message;a.addAction('知道了');await a.presentAlert()}
function nativeChoices(options,type,category){return options.categories?.[type]?.find(x=>x.name===category)?.subcategories?.map(x=>x.name)||[]}
function nativeVisibleAccounts(options){let prefs=readConfig();return options.accounts.map(x=>x.name).filter(x=>!prefs.accountProfiles?.[x]?.hidden&&!(prefs.deletedAccounts||[]).includes(x))}
const FX_CURRENCY_CODES={人民币:'CNY',美元:'USD',欧元:'EUR',日元:'JPY',港币:'HKD',英镑:'GBP',澳元:'AUD',加拿大元:'CAD',新加坡元:'SGD',新台币:'TWD',韩元:'KRW',瑞士法郎:'CHF',新西兰元:'NZD',泰铢:'THB',马来西亚林吉特:'MYR',澳门元:'MOP'};
function nativeFxCode(currency){let code=FX_CURRENCY_CODES[currency]||String(currency||'').toUpperCase();if(!/^[A-Z]{3}$/.test(code))throw Error('请先选择三位标准币种代码，或使用常见币种名称');return code}
async function nativeFetchFx(state){
 state.fxRate='';state.fxDate='';state.fxSource='';
 let code=nativeFxCode(state.currency);if(code==='CNY')return;
 let date=state.date.slice(0,10);if(!/^\d{4}-\d\d-\d\d$/.test(date))throw Error('账单日期无效');
 let start=new Date(date+'T12:00:00Z');if(!Number.isFinite(start.getTime()))throw Error('账单日期无效');start.setUTCDate(start.getUTCDate()-10);
 let from=start.toISOString().slice(0,10),url='https://api.frankfurter.dev/v2/rates?from='+from+'&to='+date+'&base='+code.toLowerCase()+'&quotes=cny';
 let request=new Request(url);request.timeoutInterval=10;
 let data;try{data=await request.loadJSON()}catch(e){throw Error('参考汇率获取失败，请检查网络后点“重新获取”')}
 let match=Array.isArray(data)?data.filter(x=>x.quote==='CNY'&&x.date<=date&&Number(x.rate)>0).sort((a,b)=>b.date.localeCompare(a.date))[0]:null;
 if(!match)throw Error('该日期附近没有人民币参考汇率，请稍后重试');
 state.fxRate=String(match.rate);state.fxDate=match.date;state.fxSource='Frankfurter';
}
function nativeRecord(state){
 let r={date:state.date,type:state.type,category:['支出','收入'].includes(state.type)?state.category:'',subcategory:state.subcategory,amount:Number(state.amount).toFixed(2),account:state.account,account2:['转账','借贷'].includes(state.type)?state.account2:'',book:state.book,note:state.note,merchant:state.merchant,tags:[...new Set(state.tags)].join(', '),currency:state.currency,extras:''};
 if(nativeFxCode(state.currency)!=='CNY'&&state.fxRate){let rate=Number(state.fxRate);if(!Number.isFinite(rate)||rate<=0||!state.fxDate)throw Error('参考汇率无效，请重新获取');r.extras=JSON.stringify({fx:{rate,date:state.fxDate,source:state.fxSource||'Frankfurter',quote:'CNY'}})}
 if(!Number.isFinite(Number(state.amount))||Number(state.amount)<=0)throw Error('金额必须大于 0');
 if(!r.date||!r.book||!r.account||!r.subcategory)throw Error('请填写日期、账本、账户和小类');
 if(['支出','收入'].includes(r.type)&&!r.category)throw Error('请选择大类');
 if(['转账','借贷'].includes(r.type)&&(!r.account2||r.account2===r.account))throw Error('请选择不同的第二账户');
 if(nativeFxCode(state.currency)!=='CNY'&&!state.fxRate)throw Error('外币尚未取得参考汇率，请联网后在“更多”里重新获取');
 return r;
}
async function nativeEdit(state,field){
 if(field==='amount'||field==='note'){let title=field==='amount'?'金额':'备注',values=await nativeText(title,[title],[state[field]]);if(values)state[field]=values[0];return}
 if(field==='date'){let picker=new DatePicker();picker.initialDate=new Date(state.date.replace(' ','T'));let value=await picker.pickDateAndTime();if(value){let offset=new Date(value.getTime()-value.getTimezoneOffset()*60000);state.date=offset.toISOString().slice(0,19).replace('T',' ');if(nativeFxCode(state.currency)!=='CNY')await nativeFetchFx(state)}return}
}
function nativeValidateNames(state,options){
 let contains=(list,value)=>list.some(x=>x.name===value);
 let visible=nativeVisibleAccounts(options);
 if(!visible.includes(state.account)&&!state.allowed.accounts.has(state.account))throw Error('账户必须从可用历史中选择，或点“新建”');
 if(['转账','借贷'].includes(state.type)&&!visible.includes(state.account2)&&!state.allowed.accounts.has(state.account2))throw Error('第二账户必须从可用历史中选择，或点“新建”');
 if(!contains(options.books,state.book)&&!state.allowed.books.has(state.book))throw Error('账本必须从历史中选择，或点“新建”');
 if(['支出','收入'].includes(state.type)){
  let cats=options.categories?.[state.type]||[],entry=cats.find(x=>x.name===state.category);
  if(!entry&&!state.allowed.categories.has(state.type+'|'+state.category))throw Error('大类必须从历史中选择，或点“新建”');
  if(!entry?.subcategories?.some(x=>x.name===state.subcategory)&&!state.allowed.subcategories.has(state.type+'|'+state.category+'|'+state.subcategory))throw Error('小类必须从当前大类中选择，或点“新建”');
 }
 for(let tag of state.tags)if(!contains(options.tags,tag)&&!state.allowed.tags.has(tag))throw Error('标签必须从历史中选择，或点“新建”');
}
async function nativeEntry(name,ocrText=''){
 if(!fm.fileExists(basePath(name))&&!fm.fileExists(pathFor(name))&&!fm.fileExists(desktopPath(name)))throw Error('尚未导入 CSV；请先运行「OpenStarLedger」导入账单');
 let csv=await readCombined(name),options=withLiveAccounts(await sharedOptions(name,csv),csv),available=liveVisibleAccounts(csv),ocrCfg=readConfig();
 if(ocrText)beginOCRDiagnostic('nativeEntryOCR',name,ocrText,{accountSource:'live-combined-csv+profiles',accounts:available,accountAliases:ocrCfg.accountAliases||{},merchants:(options.merchants||[]).slice(0,240),books:(options.books||[]).slice(0,120)});
 let history=ocrText?recognizerHistory(csv):[],prefill=ocrText?await recognizeOCR(ocrText,{accounts:available,options,history,accountProfiles:ocrCfg.accountProfiles||{},accountAliases:ocrCfg.accountAliases||{}}):{};
 let suggestedAccount=String(prefill.account||''),recognizedAccountMatched=!!prefill.recognizer?.account?.matched,defaultAccount=available.includes(suggestedAccount)?suggestedAccount:ocrText&&!recognizedAccountMatched?'':available.includes('微信钱包')?'微信钱包':available[0]||'',defaultCurrency=readConfig().accountProfiles?.[defaultAccount]?.currency||'人民币',state={type:prefill.type||'支出',amount:prefill.amount||'',category:'',subcategory:'',account:defaultAccount,account2:available.includes(String(prefill.account2||''))?String(prefill.account2):'',book:options.books.find(x=>x.name==='日常账本')?.name||options.books[0]?.name||'',merchant:prefill.merchant||'',note:prefill.note||'',tags:[],currency:defaultCurrency,fxRate:'',fxDate:'',fxSource:'',date:prefill.date||nativeNow(),newAccountGroups:new Map(),allowed:{accounts:new Set(),books:new Set(),categories:new Set(),subcategories:new Set(),tags:new Set(),currencies:new Set()}};
 let typeCategories=options.categories?.[state.type]||[],prefCategory=String(prefill.category||''),categoryEntry=typeCategories.find(x=>x.name===prefCategory);
 state.category=categoryEntry?prefCategory:typeCategories[0]?.name||'';
 let availableSubs=nativeChoices(options,state.type,state.category),prefSubcategory=String(prefill.subcategory||'');state.subcategory=availableSubs.includes(prefSubcategory)?prefSubcategory:availableSubs[0]||'';
 let duplicateWarning=String(prefill.recognizer?.duplicate?.detected?prefill.recognizer.duplicate.message||'可能重复账单':'');if(ocrText&&duplicateWarning)ocrDiag('duplicate.warning',{message:duplicateWarning,duplicate:prefill.recognizer.duplicate});
 if(ocrText)ocrDiag('native.initialState',ocrStateSnapshot(state));
 while(true){
  let table=new UITable();table.showSeparators=true;let savePromise=null,presented=false;
  function refresh(){if(presented)table.reload()}
  function heading(title,detail=''){let row=new UITableRow();row.isHeader=true;row.addText(String(title??''),String(detail??''));table.addRow(row)}
  function option(label,detail,onSelect){let row=new UITableRow();row.height=48;row.dismissOnSelect=false;let left=row.addText(String(label??'')),right=row.addText(String(detail??''));left.widthWeight=64;right.widthWeight=36;right.rightAligned();row.onSelect=onSelect;table.addRow(row)}
  function item(label,value,field){let row=new UITableRow();row.height=48;row.dismissOnSelect=false;row.cellSpacing=8;let shown=value===null||value===undefined||value===''?'待选择':String(value),left=row.addText(String(label??'')),right=row.addText(shown);left.widthWeight=32;right.widthWeight=68;right.rightAligned();row.onSelect=async()=>{try{if(field==='account'||field==='account2')drawAccounts(field);else if(field==='tags')drawTags();else if(field==='more')drawMore();else if(['type','category','subcategory','book','merchant','currency'].includes(field))drawChoices(field);else{await nativeEdit(state,field);if(field==='date')drawMore();else draw()}}catch(e){await nativeMessage('修改失败',String(e.message||e))}};table.addRow(row)}
  async function createName(kind){let result=await nativeText('新建'+kind,['名称'],['']);if(!result)return null;let value=result[0];if(!value||value.length>60||/[,，;；\r\n]/.test(value)){await nativeMessage('名称无效','不能留空、超过 60 字或包含分隔符。');return null}return value}
  function selectType(type){if(state.type!==type){state.type=type;state.category=options.categories?.[type]?.[0]?.name||'';state.subcategory=['转账','借贷'].includes(type)?(type==='转账'?'账户互转':'借出'):nativeChoices(options,type,state.category)[0]||'';state.account2=''}draw()}
  async function selectCurrency(value){state.currency=value;try{await nativeFetchFx(state)}catch(e){await nativeMessage('参考汇率未取得',String(e.message||e))}drawMore()}
  function drawChoices(field,query=''){
   table.removeAllRows();let title={type:'类型',category:'大类',subcategory:'小类',book:'账本',merchant:'商家／对方',currency:'币种'}[field],back=field==='currency'?drawMore:draw;
   let entries=field==='type'?['支出','收入','转账','借贷'].map(name=>({name,count:0})):field==='category'?(options.categories?.[state.type]||[]):field==='subcategory'?['转账','借贷'].includes(state.type)?(state.type==='转账'?['账户互转','信用还款','理财买入','理财赎回']:['借出','收款','借入','还款']).map(name=>({name,count:0})):options.categories?.[state.type]?.find(x=>x.name===state.category)?.subcategories||[]:field==='book'?options.books:field==='merchant'?options.merchants:[...new Set(['人民币','美元','欧元','日元','港币','英镑',...options.currencies.map(x=>x.name)])].map(name=>({name,count:options.currencies.find(x=>x.name===name)?.count||0}));
   let all=[...entries];if(state[field]&&!all.some(x=>x.name===state[field]))all.unshift({name:state[field],count:0});
   option('‹ 返回'+(field==='currency'?'更多设置':'记账'),'',()=>back());
   let matches=query?all.filter(x=>x.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())):all;
   if(field!=='type')heading(query?'搜索结果 · '+matches.length:'全部'+title+' · '+matches.length);
   for(let x of matches)option((state[field]===x.name?'✓ ':'')+x.name,x.count?x.count+' 笔':'',async()=>{
    state[field]=x.name;
    if(field==='type'){state.category=options.categories?.[x.name]?.[0]?.name||'';state.subcategory=['转账','借贷'].includes(x.name)?(x.name==='转账'?'账户互转':'借出'):nativeChoices(options,x.name,state.category)[0]||'';state.account2=''}
    if(field==='category')state.subcategory=nativeChoices(options,state.type,x.name)[0]||'';
    if(field==='currency')await selectCurrency(x.name);else draw();
   });
   if(field!=='type')option('搜索'+title,'⌕',async()=>{let result=await nativeText('搜索'+title,['名称包含'],[query]);if(result)drawChoices(field,result[0])});
   if(['category','subcategory','book','currency','merchant'].includes(field)&&!(field==='subcategory'&&['转账','借贷'].includes(state.type)))option(field==='merchant'?'＋ 输入商家／对方':'＋ 新建'+title,'',async()=>{let value=await createName(title);if(!value)return;let exists=entries.some(x=>x.name===value);state[field]=value;if(!exists&&field!=='merchant')state.allowed[field==='book'?'books':field==='category'?'categories':field==='subcategory'?'subcategories':'currencies'].add(field==='category'?state.type+'|'+value:field==='subcategory'?state.type+'|'+state.category+'|'+value:value);if(field==='category')state.subcategory=nativeChoices(options,state.type,value)[0]||'';if(field==='currency')await selectCurrency(value);else draw()});
   refresh()
  }
  function drawAccounts(field,groupId='',query=''){
   table.removeAllRows();let cfg=readConfig(),groups=Array.isArray(cfg.accountGroups)?cfg.accountGroups.filter(g=>g&&g.id&&g.name):[];
   if(!groups.length)groups=[{id:'default',name:'默认分组'}];
   let extra=[...state.allowed.accounts].filter(x=>!options.accounts.some(a=>a.name===x)).map(name=>({name,count:0}));
   let all=[...options.accounts,...extra].filter(x=>!cfg.accountProfiles?.[x.name]?.hidden&&!(cfg.deletedAccounts||[]).includes(x.name)&&(field!=='account2'||x.name!==state.account));
   let forGroup=id=>all.filter(x=>{let chosen=state.newAccountGroups.get(x.name)||cfg.accountProfiles?.[x.name]?.groupId;return (groups.some(g=>g.id===chosen)?chosen:groups[0].id)===id});
   option(groupId||query?'‹ 返回分组':'‹ 返回记账','',()=>groupId||query?drawAccounts(field):draw());
   if(groupId){heading(groups.find(g=>g.id===groupId)?.name||'账户');for(let x of forGroup(groupId))option((state[field]===x.name?'✓ ':'')+x.name,x.count?x.count+' 笔':'新建',()=>{state[field]=x.name;if(field==='account'&&state.account2===x.name)state.account2='';draw()})}
   else if(query){let matches=all.filter(x=>x.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));heading('匹配的账户 · '+matches.length);for(let x of matches)option((state[field]===x.name?'✓ ':'')+x.name,x.count?x.count+' 笔':'新建',()=>{state[field]=x.name;if(field==='account'&&state.account2===x.name)state.account2='';draw()})}
   else{heading('常用账户');for(let x of all.slice(0,5))option((state[field]===x.name?'✓ ':'')+x.name,x.count+' 笔',()=>{state[field]=x.name;if(field==='account'&&state.account2===x.name)state.account2='';draw()});heading('按账本分组');for(let group of groups){let members=forGroup(group.id);if(members.length)option(group.name,members.length+' 个 ›',()=>drawAccounts(field,group.id))}}
   option('搜索账户','⌕',async()=>{let result=await nativeText('搜索账户',['名称包含'],[query]);if(result)drawAccounts(field,'',result[0])});
   option('＋ 新建账户','',async()=>{let value=await createName('账户');if(value){state.allowed.accounts.add(value);state.newAccountGroups.set(value,groupId||groups[0].id);state[field]=value;draw()}});
   refresh()
  }
  function drawTags(query=''){
   table.removeAllRows();let all=[...new Set([...state.tags,...options.tags.map(x=>x.name)])],counts=new Map(options.tags.map(x=>[x.name,x.count]));all.sort((a,b)=>(counts.get(b)||0)-(counts.get(a)||0)||a.localeCompare(b,'zh-CN'));
   option('‹ 完成，返回记账',state.tags.length+' 个已选',()=>draw());
   let visible=query?all.filter(x=>x.toLocaleLowerCase().includes(query.toLocaleLowerCase())):all;
   heading(query?'搜索：'+query:'全部标签 · '+all.length);
   for(let value of visible)option((state.tags.includes(value)?'✓ ':'')+value,counts.get(value)?counts.get(value)+' 笔':'',()=>{state.tags=state.tags.includes(value)?state.tags.filter(x=>x!==value):[...state.tags,value];drawTags(query)});
   option('搜索标签','⌕',async()=>{let result=await nativeText('搜索标签',['名称包含'],[query]);if(result)drawTags(result[0])});
   option('＋ 新建标签','',async()=>{let value=await createName('标签');if(value){state.allowed.tags.add(value);if(!state.tags.includes(value))state.tags.push(value);drawTags(query)}});
   refresh()
  }
  function drawMore(){table.removeAllRows();option('‹ 返回记账','',()=>draw());item('日期',state.date,'date');item('币种',state.currency,'currency');if(state.currency!=='人民币'&&String(state.currency).toUpperCase()!=='CNY'){option('人民币参考汇率',state.fxRate?(state.fxRate+' · '+state.fxDate):'尚未取得',()=>{});option('重新获取参考汇率','↻',async()=>{try{await nativeFetchFx(state)}catch(e){await nativeMessage('参考汇率未取得',String(e.message||e))}drawMore()})}refresh()}
  function draw(){table.removeAllRows();if(ocrText)ocrDiag('native.render',ocrStateSnapshot(state));
   if(duplicateWarning){let warn=new UITableRow();warn.height=54;warn.dismissOnSelect=false;warn.backgroundColor=new Color('#6a4b16');let wc=warn.addText('⚠︎ 可能重复账单',duplicateWarning.replace(/^可能重复账单：?/,'').trim());wc.titleColor=Color.white();wc.subtitleColor=new Color('#f0dfba');table.addRow(warn)}
   let types=new UITableRow();types.height=50;types.dismissOnSelect=false;types.cellSpacing=4;for(let value of ['支出','收入','转账','借贷']){let cell=types.addButton(String((state.type===value?'✓ ':'')+value));cell.widthWeight=25;cell.dismissOnTap=false;cell.onTap=()=>selectType(value)}table.addRow(types);
   item('金额',state.amount||'0.00','amount');item('商家',state.merchant||'未填商家','merchant');item('备注',state.note||'未填备注','note');
   if(['支出','收入'].includes(state.type))item('大类',state.category,'category');item('小类',state.subcategory,'subcategory');
   item('账户',state.account,'account');if(['转账','借贷'].includes(state.type))item('第二账户',state.account2,'account2');item('账本',state.book,'book');
   item('标签',state.tags.join('、')||'未选','tags');item('更多',state.date.slice(0,16)+' · '+state.currency,'more');
   let save=new UITableRow();save.height=56;save.backgroundColor=new Color('#126f5b');save.dismissOnSelect=true;let label=save.addText(String('保存这笔账单'));label.titleColor=Color.white();save.onSelect=()=>{savePromise=(async()=>{try{let record=nativeRecord(state);if(ocrText)ocrDiag('native.saveAttempt',{record});nativeValidateNames(state,options);let result=await mutate({action:'add',record},name);if(!parse(result.csv).some(x=>x.id===result.id))throw Error('写入后未找到这笔账单');await sharedOptions(name,result.csv);if(state.newAccountGroups.size){try{let cfg=readConfig(),profiles={...(cfg.accountProfiles||{})};for(let [account,groupId] of state.newAccountGroups)profiles[account]={...(profiles[account]||{}),groupId};saveConfig({...cfg,accountProfiles:profiles})}catch(e){trace('新账户分组暂未保存',e.message||e)}}return {ok:true}}catch(e){return {ok:false,error:String(e.message||e)}}})()};table.addRow(save);refresh()}
  draw();presented=true;await table.present(false);if(!savePromise)return;
  let result=await savePromise;if(result.ok)return;await nativeMessage('未能保存',result.error+'\n账单没有确认成功，请检查后重试');
  csv=await readCombined(name);options=await sharedOptions(name,csv);
 }
}
module.exports.runNative=async function(){try{await migrateLegacyStorage();let name=await chooseAtStart();if(name)await nativeEntry(name,incomingOCRText())}catch(e){ocrDiag('fatal.error',{message:String(e.message||e),stack:String(e.stack||'')});await nativeMessage('记一笔未打开',String(e.message||e)+'\n\nOCR 诊断已写入 StarLedger/Data/StarLedgerOCRDiagnostic.txt')}finally{Script.complete()}};
async function pageHTML(name,csv=null,prefillText=''){
 let viewerPath=latestViewerPath();await ensure(viewerPath);if(!fm.fileExists(viewerPath))throw Error('最新 StarLedger HTML 无法读取');trace('自动选择 StarLedger HTML',viewerPath);
 let ledgerReady=fm.fileExists(basePath(name))||fm.fileExists(pathFor(name))||fm.fileExists(desktopPath(name));
 let payload={native:true,mainName:name,deferCsv:true,settings:{...readConfig(),mainName:name},relations:await readRelations(name),ledgerReady,options:await sharedOptions(name,csv===null?await readCombined(name):csv),...(prefillText?{prefillText}: {})};
 let source=fm.readString(viewerPath),marker='/*__BOOT__*/null';
 if(!source||!source.includes(marker)||!source.includes('id="content"'))throw Error('账本.html 内容不完整或版本不匹配');
 let dark=darkAtLaunch(),bg=dark?'#000000':'#f7f7f5',mode=dark?'dark':'light';
 source=source.replace('<html lang="zh-CN">','<html lang="zh-CN" data-mode="'+mode+'" style="background:'+bg+';color-scheme:'+mode+'">');
 source=source.replace('<meta name="theme-color" content="#f6f7f4">','<meta name="theme-color" content="'+bg+'">');
 return source.replace(marker,'/*__BOOT__*/'+JSON.stringify(payload).replace(/</g,'\\u003c'));
}
async function loadPage(web,name,csv,prefillText=''){
 let html=await pageHTML(name,csv,prefillText);await web.loadHTML(html);
 trace('账本 HTML 已载入','字符数 '+html.length);
}
async function installCsv(web,csv){
 await web.evaluateJavaScript('window.__starActive=window.__starActive||window;window.__starActive.__ledgerChunks=[]; true;');
 for(let i=0;i<csv.length;i+=100000)await web.evaluateJavaScript('window.__starActive.__ledgerChunks.push('+JSON.stringify(csv.slice(i,i+100000)).replace(/</g,'\\u003c')+'); true;');
 await web.evaluateJavaScript('window.__starActive.__ledgerInstallCsv(window.__starActive.__ledgerChunks.join("")); delete window.__starActive.__ledgerChunks; true;');
}
async function main(mode='viewer'){let openWebEntry=mode==='webEntry'||mode==='webEntryOCR',ocrText=mode==='webEntryOCR'?incomingOCRText():'';trace('开始运行',mode);await migrateLegacyStorage();await ensure(cfgPath);let name=await chooseAtStart();if(!name){trace('取消');Script.complete();return}trace('主文件名已读取');
 let csv=await readCombined(name);trace('CSV 已读取','字符数 '+csv.length);
 let webOptions=withLiveAccounts(await sharedOptions(name,csv),csv),webAccounts=liveVisibleAccounts(csv),webCfg=readConfig();
 if(ocrText)beginOCRDiagnostic('webEntryOCR',name,ocrText,{accountSource:'live-combined-csv+profiles',accounts:webAccounts,accountAliases:webCfg.accountAliases||{},merchants:(webOptions.merchants||[]).slice(0,240),books:(webOptions.books||[]).slice(0,120)});
 let webHistory=ocrText?recognizerHistory(csv):[],webPrefill=ocrText?await recognizeOCR(ocrText,{accounts:webAccounts,options:webOptions,history:webHistory,accountProfiles:webCfg.accountProfiles||{},accountAliases:webCfg.accountAliases||{}}):{};
 let currencies=[...Object.values(readConfig().accountProfiles||{}).map(profile=>{try{return nativeFxCode(profile?.currency||'CNY')}catch(e){return ''}}),...parse(csv).map(row=>{try{return nativeFxCode(row.currency||'CNY')}catch(e){return ''}})];
 let rateRefresh=refreshAccountRates(currencies);
 let web=new WebView();await loadPage(web,name,csv,'');
 let closed=false,closeError=null;
 let dismissed=web.present(true).then(()=>{closed=true},e=>{closeError=e;closed=true});
 trace('WebView 已请求显示');
 // Present before the first evaluateJavaScript. On some iPhones pre-present evaluation leaves a blank view.
 await new Promise(resolve=>{Timer.schedule(250,false,resolve)});
 if(closed){trace('显示前已关闭');Script.complete();return}
 let state=JSON.parse(await web.evaluateJavaScript('JSON.stringify({page:!!document.querySelector("#content"),bridge:Array.isArray(window.__ledgerQueue),text:document.body?document.body.innerText.length:0,ready:typeof window.__ledgerInstallCsv==="function"})'));
 trace('显示后网页检查',JSON.stringify(state));
 if(!state.page||!state.bridge||!state.ready)throw Error('网页没有正常启动，请查看 StarLedger/Data/StarLedgerDiagnostic.txt');
 trace('CSV 已送入网页','分段数 '+Math.ceil(csv.length/100000));
 await installCsv(web,csv);
 if(openWebEntry){
  let defaults={book:webOptions.books?.find(x=>x.name==='日常账本')?.name||webOptions.books?.[0]?.name||''};
  let records=(ocrText&&Array.isArray(webPrefill.records)&&webPrefill.records.length?webPrefill.records:[ocrText?webPrefill:{}]).map(raw=>({type:raw.type||'支出',category:raw.category||'',subcategory:raw.subcategory||'',amount:raw.amount??'',date:raw.date||nativeNow(),merchant:raw.merchant||'',note:raw.note||'',account:webAccounts.includes(raw.account)?raw.account:'',account2:webAccounts.includes(raw.account2)?raw.account2:'',book:defaults.book,relationRole:raw.relationRole||'auto',needsConfirmation:!!raw.needsConfirmation}));
  let duplicateWarning=String(webPrefill.recognizer?.duplicate?.detected?webPrefill.recognizer.duplicate.message||'可能重复账单':'');if(ocrText)ocrDiag('web.entryRecords',{records,relationHints:webPrefill.relationHints||[],duplicateWarning});
  let payload={records,relationHints:webPrefill.relationHints||[]},js='(()=>{try{'+(ocrText?'ocrReviewText='+JSON.stringify(ocrText)+';':'')+'if(typeof entryTaskOpenFromOCR==="function")entryTaskOpenFromOCR('+JSON.stringify(payload)+');else if(typeof entryForm==="function")entryForm('+JSON.stringify(records[0]||{})+');else return false;'+(duplicateWarning?'if(typeof toast==="function")toast('+JSON.stringify(duplicateWarning)+');':'')+'return !!document.querySelector("#entry")}catch(e){return "ERR:"+String(e&&e.message||e)}})()';
  let opened=await web.evaluateJavaScript(js);if(opened!==true)throw Error('网页记一笔未能打开'+(typeof opened==='string'?'：'+opened:''));trace('网页记一笔已打开',ocrText?(records.length>1?'Recognizer 多账单预填 '+records.length+' 笔':'Recognizer 结构化预填'):'空白记一笔');
 }
 let latestRates=await rateRefresh;
 await web.evaluateJavaScript('window.__starActive.__ledgerApplyRates('+JSON.stringify(latestRates).replace(/</g,'\\u003c')+'); true;');
 let check=await web.evaluateJavaScript('JSON.stringify({title:document.querySelector("#title")?.textContent,entry:!!document.querySelector("#entry"),height:Math.round(document.body.getBoundingClientRect().height),background:getComputedStyle(document.body).backgroundColor})');
 trace('网页渲染状态',check);
 while(!closed){
  // Wait for a user command instead of evaluating JS repeatedly while an input has focus.
  let incoming=await Promise.race([
   web.evaluateJavaScript('(()=>{const queue=(window.__starActive||window).__ledgerQueue;if(queue.length){completion(JSON.stringify(queue.splice(0)))}else{window.__ledgerWait=command=>{window.__ledgerWait=null;completion(JSON.stringify([command,...queue.splice(0)]))}}})()',true).then(value=>({commands:JSON.parse(value)})),
   dismissed.then(()=>({closed:true}))
  ]);
  if(incoming.closed||closed)break;
  let commands=incoming.commands;
  for(let command of commands){
   let result;try{if(command.action==='openNativeEntry'){
    await nativeEntry(name,'');result={ok:true,csv:await readCombined(name),settings:readConfig()};
   }else result=await mutate(command,name);
   if(result.mainName)name=result.mainName;if(result.csv!==undefined)result.options=await sharedOptions(name,result.csv)}catch(e){trace('命令失败',command.action+' '+String(e.message||e));result={ok:false,error:String(e.message||e)}}
   result.key=command.key;
   await web.evaluateJavaScript('window.__starActive.__ledgerReply('+JSON.stringify(result).replace(/</g,'\\u003c')+'); true;',false);
  }
 }
 if(closeError)throw closeError;
 trace('用户关闭网页');
 Script.complete()}

async function bridgeReadyName(requested=''){
 await migrateLegacyStorage();await ensure(cfgPath);let cfg=readConfig(),name=String(requested||cfg.mainName||'').trim();
 if(name){name=safeName(name);if(cfg.mainName!==name)saveConfig({...cfg,mainName:name});return name}
 name=await chooseAtStart();if(!name)throw Error('尚未设置主文件名');return name
}
function bridgeBackupFile(path){try{return fm.fileExists(path)?{exists:true,text:fm.readString(path)}:{exists:false,text:''}}catch(e){return {exists:false,text:''}}}
function bridgeRestoreFile(path,snap){try{if(snap?.exists)fm.writeString(path,snap.text);else if(fm.fileExists(path))fm.remove(path)}catch(e){trace('Safari Bridge 回滚失败',String(e.message||e))}}
module.exports.bridgeSnapshot=async function(requested=''){
 let name=await bridgeReadyName(requested),csv=await readCombined(name),settings={...readConfig(),mainName:name},relations=await readRelations(name),options=await sharedOptions(name,csv);
 return {kind:'starledger-snapshot',version:1,mainName:name,csv,settings,relations,options,revision:digest(csv),createdAt:new Date().toISOString()}
};
module.exports.bridgeApplyQueue=async function(envelope){
 if(!envelope||envelope.kind!=='starledger-bridge-queue'||envelope.version!==1)throw Error('Safari 同步数据格式不正确');
 let name=await bridgeReadyName(envelope.mainName||''),commands=Array.isArray(envelope.commands)?envelope.commands:[];if(!commands.length)return {ok:true,batchId:String(envelope.batchId||''),count:0,revision:digest(await readCombined(name))};
 if(commands.length>250)throw Error('一次同步命令过多');
 let allowed=new Set(['add','update','remove','bulkRemove','reconcile','replaceLedger','saveSettings','bulkPatch','saveRelations','batchCommit']),deltaPath=pathFor(name),backups={delta:bridgeBackupFile(deltaPath),relations:bridgeBackupFile(relationsPath),config:bridgeBackupFile(cfgPath)},mirror=configMirror(),mirrorSnap=bridgeBackupFile(mirror[1]);
 try{
  let result=null;
  for(let raw of commands){let cmd=raw&&typeof raw==='object'?raw:null;if(!cmd||!allowed.has(cmd.action))throw Error('Safari 同步包含不支持的操作：'+String(cmd?.action||''));result=await mutate(cmd,name)}
  configCache=null;let csv=await readCombined(name);return {ok:true,batchId:String(envelope.batchId||''),count:commands.length,revision:digest(csv),mainName:name,settings:{...readConfig(),mainName:name},relations:await readRelations(name)}
 }catch(e){bridgeRestoreFile(deltaPath,backups.delta);bridgeRestoreFile(relationsPath,backups.relations);bridgeRestoreFile(cfgPath,backups.config);try{let local=mirror[0];if(mirrorSnap.exists)local.writeString(mirror[1],mirrorSnap.text);else if(local.fileExists(mirror[1]))local.remove(mirror[1])}catch(_e){}configCache=null;throw e}
};
module.exports.bridgeRecognizeOCR=async function(source,requested=''){
 let name=await bridgeReadyName(requested),csv=await readCombined(name),webOptions=withLiveAccounts(await sharedOptions(name,csv),csv),accounts=liveVisibleAccounts(csv),cfg=readConfig(),history=recognizerHistory(csv),prefill=await recognizeOCR(String(source||''),{accounts,options:webOptions,history,accountProfiles:cfg.accountProfiles||{},accountAliases:cfg.accountAliases||{}}),book=webOptions.books?.find(x=>x.name==='日常账本')?.name||webOptions.books?.[0]?.name||'';
 let records=(Array.isArray(prefill.records)&&prefill.records.length?prefill.records:[prefill]).map(raw=>({type:raw.type||'支出',category:raw.category||'',subcategory:raw.subcategory||'',amount:raw.amount??'',date:raw.date||nativeNow(),merchant:raw.merchant||'',note:raw.note||'',account:accounts.includes(raw.account)?raw.account:'',account2:accounts.includes(raw.account2)?raw.account2:'',book,relationRole:raw.relationRole||'auto',needsConfirmation:!!raw.needsConfirmation}));
 return {kind:'starledger-ocr-prefill',version:1,mainName:name,records,relationHints:prefill.relationHints||[],createdAt:new Date().toISOString()}
};
module.exports.run=async function(mode='viewer'){if(mode==='entry'||mode==='nativeEntry'||mode==='nativeEntryOCR')return module.exports.runNative();try{await main(mode)}catch(e){trace('脚本异常',e.message||e);ocrDiag('fatal.error',{message:String(e.message||e),stack:String(e.stack||'')});let a=new Alert();a.title='星账本未打开';a.message=String(e.message||e)+'\n可查看 StarLedger/Data/StarLedgerDiagnostic.txt；OCR 测试另见 StarLedgerOCRDiagnostic.txt。';a.addAction('知道了');await a.presentAlert();Script.complete()}};