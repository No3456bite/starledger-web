// Variables used by Scriptable.
// icon-color: deep-purple; icon-glyph: chart-pie;
// StarLedger Widget v3 — small / medium. No account credentials in this file.
// Layout reference: https://developer.apple.com/design/human-interface-guidelines/widgets
// Run in Scriptable once to paste the pairing JSON generated in StarLedger Settings.

// MODEL_START
// Shared by the browser preview, backup snapshot and generated standalone script.
(function(g){
const fields={net:'净资产',assets:'总资产',debt:'总负债',account:'账户余额',income:'本月收入',expense:'本月支出',monthNet:'本月结余',budget:'本月预算',budgetSpent:'预算已支出',budgetLeft:'剩余预算',budgetRatio:'预算使用比例',todayExpense:'今日支出',weekExpense:'本周支出',yearIncome:'本年收入',yearExpense:'本年支出',yearNet:'本年结余',date:'当前日期',month:'当前月份',updated:'数据更新时间'};
const templates={minimal:['net'],assets:['net','assets','debt'],monthly:['expense','income','monthNet'],budget:['budget','budgetSpent','budgetLeft','budgetRatio'],custom:['net','budget','expense']};
function normalize(raw={}){raw=raw&&typeof raw==='object'?raw:{};const out={version:1};for(const size of ['small','medium']){const r=raw[size]||{},count=size==='small'?2:3;out[size]={title:String(r.title??'星账本').slice(0,24),showTitle:r.showTitle!==false,showDate:r.showDate!==false,showCurrency:r.showCurrency!==false,decimals:r.decimals===true,grouping:r.grouping!==false,showUpdated:r.showUpdated===true,appearance:['light','dark'].includes(r.appearance)?r.appearance:'system',background:color(r.background),text:color(r.text),secondary:color(r.secondary),accent:color(r.accent),fontSize:Math.max(22,Math.min(32,Number(r.fontSize)||28)),weight:['regular','medium','semibold','bold'].includes(r.weight)?r.weight:'semibold',align:['center','right'].includes(r.align)?r.align:'left',density:['loose','compact'].includes(r.density)?r.density:'standard',template:templates[r.template]?r.template:'custom',items:(Array.isArray(r.items)&&r.items.length?r.items:templates.custom.map(key=>({key}))).slice(0,count+1).map(raw=>{const i=raw&&typeof raw==='object'?raw:{};return ({key:fields[i.key]?i.key:'net',label:String(i.label||'').slice(0,24),account:String(i.account||'').slice(0,80)})})};}return out}
function color(v){return /^#[0-9a-f]{6}$/i.test(v||'')?v:''}
function palette(c,dark){dark=c.appearance==='dark'||c.appearance==='system'&&dark;return{background:c.background||(dark?'#1C1C1E':'#F2F2F7'),text:c.text||(dark?'#FFFFFF':'#1C1C1E'),secondary:c.secondary||(dark?'#AEAEB2':'#636366'),accent:c.accent||(dark?'#64D2FF':'#007AFF')}}
function value(l,item){if(item.key==='account'){const a=l.accounts?.find(a=>a.name===item.account);return{value:a?.value??null,currency:a?.currency||'CNY'}}return{value:l[item.key]??null,currency:'CNY'}}
function format(l,item,c,mask=false){const {value:v,currency}=value(l,item);if(mask&&!['date','month','updated'].includes(item.key))return '••••';if(v===null)return item.key==='budget'||item.key==='budgetLeft'||item.key==='budgetRatio'?'未设置':'待核实';if(typeof v==='string')return item.key==='updated'?v.slice(5,16)+' UTC':v;if(!Number.isFinite(v))return '待核实';if(item.key==='budgetRatio')return v.toFixed(c.decimals?1:0)+'%';const sign=c.showCurrency?(currency==='CNY'?'¥':currency+' '):'';return sign+v.toLocaleString('en-US',{useGrouping:c.grouping,minimumFractionDigits:c.decimals?2:0,maximumFractionDigits:c.decimals?2:0})}
function label(i){return i.label||fields[i.key]||'金额'}
function display(l,i,c,width,size,mask=false){let str=format(l,i,c,mask);const measure=s=>[...s].reduce((n,ch)=>n+size*(/\d/.test(ch)?.61:/[,.]/.test(ch)?.27:.63),0);if(measure(str)>width&&i.key==='updated')str=String(l.updated||'').slice(11,16);if(measure(str)>width&&i.key==='date')str=String(l.date||'').slice(5);if(measure(str)>width){const {value:v,currency}=value(l,i);if(typeof v==='number'&&Math.abs(v)>=10000&&i.key!=='budgetRatio'){const unit=Math.abs(v)>=1e8?'亿':'万';str=(c.showCurrency?(currency==='CNY'?'¥':currency+' '):'')+(v/(unit==='亿'?1e8:1e4)).toFixed(1)+unit;}}return measure(str)>width?'数额过长':str}
function numberSize(i,c,main){return ['date','month','updated'].includes(i.key)?(main?14:11):main?c.fontSize:14}
function spacing(c){return c.density==='compact'?{pad:12,gap:4}:c.density==='loose'?{pad:18,gap:8}:{pad:16,gap:6}}
g.StarLedgerWidgetModel={fields,templates,normalize,palette,format,display,label,numberSize,spacing};
})(globalThis);

// MODEL_END
const M = globalThis.StarLedgerWidgetModel;
const LOCAL_WIDGET_CONFIG = null;
const KEY = 'starledger.widget.v1.' + Script.name();
const fm = FileManager.local();
const ink = Color.dynamic(new Color('#1C1C1E'), new Color('#FFFFFF'));
const muted = Color.dynamic(new Color('#716B65'), new Color('#A6A3A0'));
const accent = Color.dynamic(new Color('#007AFF'), new Color('#64D2FF'));
const rule = Color.dynamic(new Color('#D6D0C7'), new Color('#333436'));
const red = Color.dynamic(new Color('#B43D3D'), new Color('#FF9999'));
let settings=null;try{settings=Keychain.contains(KEY)?JSON.parse(Keychain.get(KEY)):null}catch(_){}

function validateSettings(value) {
  if (!value || !/^https:\/\/[^\s/@?#:]+(?::\d+)?\/widget$/.test(value.endpoint || '') || !/^[a-f0-9]{64}$/.test(value.token || '')) throw Error('连接配置无效，请从星账本设置重新生成并复制。');
  if (!/^https:\/\/[^\s/@?#]+(?:\/[^\s?#]*)?$/.test(value.siteUrl || '')) throw Error('网页地址无效。');
  return value;
}
async function configure() {
  const a = new Alert(); a.title = '连接星账本'; a.message = '粘贴网页「设置 → 数据与备份 → 桌面小组件自定义」生成的连接配置。';
  let pasted='';try{const clip=Pasteboard.pasteString();if(clip&&clip.trim().startsWith('{'))pasted=clip}catch(_){}a.addTextField('连接配置 JSON', pasted); a.addAction('连接'); a.addCancelAction('取消');
  if (await a.presentAlert() < 0) return false;
  let parsed;try{parsed=JSON.parse(a.textFieldValue(0).trim().replace(/^```(?:json)?\s*|\s*```$/g,'').replace(/[“”]/g,'"'))}catch(_){throw Error('连接配置不是完整 JSON。请复制网页生成的整段配置，不要复制 Worker 地址或脚本代码。')}
  const value=validateSettings(parsed);value.cacheId=UUID.string();
  const data=await fetchSummary(value);
  if(!data.ledgers.some(l=>l.name===value.ledger)){
    const ledger=new Alert();ledger.title='显示哪个主账本？';data.ledgers.forEach(l=>ledger.addAction(l.name));ledger.addCancelAction('取消');const i=await ledger.presentSheet();if(i<0)return false;value.ledger=data.ledgers[i].name;
  }
  value.metric='net';
  Keychain.set(KEY, JSON.stringify(value));
  if (settings && settings.cacheId) { const old = cachePath(settings); if (fm.fileExists(old)) fm.remove(old); }
  settings = value; writeCache(data); return true;
}
function cachePath(value = settings) { return fm.joinPath(fm.documentsDirectory(), 'starledger-widget-' + value.cacheId + '.json'); }
function validateSummary(data) {
  if (!data || data.format !== 'starledger-widget' || data.version !== 1 || !Array.isArray(data.ledgers) || !data.ledgers.length || !Number.isFinite(Date.parse(data.backedUpAt))) throw Error('摘要格式无效，请更新网页、Worker 和脚本。');
  for (const l of data.ledgers) {
    if (typeof l.name !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(l.period && l.period.end || '') || !/^\d{4}-\d{2}-\d{2}$/.test(l.period && l.period.start || '') || !/^\d{4}-\d{2}$/.test(l.period.label || '')) throw Error('账期格式无效。');
    for (const key of ['net', 'assets', 'budget', 'budgetLeft', 'expense', 'budgetSpent']) if (l[key] !== null && (typeof l[key] !== 'number' || !Number.isFinite(l[key]))) throw Error('金额格式无效。');
  }
  return data;
}
async function fetchSummary(value) {
  const req = new Request(value.endpoint); req.headers = {Authorization: 'Bearer ' + value.token}; req.timeoutInterval = 20;
  const text = await req.loadString(), status = req.response.statusCode;
  if (status !== 200) {
    const e = Error(status === 401 ? '连接已失效，请重新配置' : status === 404 ? '未找到摘要，请更新 Worker 并备份' : status === 409 ? '请在网页立即备份并更新' : '暂时无法读取云备份');
    e.noCache = status === 401 || status === 403; throw e;
  }
  return validateSummary(JSON.parse(text));
}
function writeCache(data) { try { fm.writeString(cachePath(), JSON.stringify(data)); } catch (_) {} }
async function loadSummary() {
  try { const data = await fetchSummary(settings); writeCache(data); return {data, cached: false}; }
  catch (e) {
    if (e.noCache) { if (fm.fileExists(cachePath())) fm.remove(cachePath()); throw e; }
    if (fm.fileExists(cachePath())) { try { return {data: validateSummary(JSON.parse(fm.readString(cachePath()))), cached: true}; } catch (_) {} }
    throw e;
  }
}
function text(parent,value,size=12,color=ink,weight='regular',align='left') {
  const t=parent.addText(String(value));t.font=(Font[weight+'SystemFont']||Font.systemFont)(size);t.textColor=color;t.lineLimit=1;t.minimumScaleFactor=1;
  if(align==='right')t.rightAlignText();else if(align==='center')t.centerAlignText();return t;
}
function today(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function base(){const w=new ListWidget();w.setPadding(16,16,16,16);w.backgroundColor=Color.dynamic(new Color('#F2F2F7'),new Color('#1C1C1E'));w.refreshAfterDate=new Date(Date.now()+3600000);if(settings)w.url=siteLink();return w}
function siteLink(action='home'){return settings.siteUrl.split('#')[0]+'#'+action}
// Scriptable exposes system fonts but no monospaced-digit feature switch.
// Give only numeric glyphs equal-width cells, retaining proportional system punctuation.
function figures(parent,value,size,color,width,align,weight){
  const line=parent.addStack();line.size=new Size(width,size*1.25);
  let str=String(value);const estimate=s=>[...s].reduce((n,ch)=>n+size*(/\d/.test(ch)?.61:/[,.]/.test(ch)?.27:.63),0);
  if(estimate(str)>width&&/\d/.test(str)){
    const raw=Number(str.replace(/[^0-9.\-]/g,''));
    if(Number.isFinite(raw)&&Math.abs(raw)>=10000){const suffix=Math.abs(raw)>=1e8?'亿':'万';str=str.replace(/-?[\d,]+(?:\.\d+)?/, (raw/(suffix==='亿'?1e8:1e4)).toFixed(1)+suffix)}
  }
  if(estimate(str)>width){text(line,'数额过长',12,color,'regular',align);return}
  if(align==='right'||align==='center')line.addSpacer();
  for(const ch of str){const cell=line.addStack();cell.size=new Size(size*(/\d/.test(ch)?.61:/[,.]/.test(ch)?.27:.63),size*1.25);const t=text(cell,ch,size,color,weight);t.centerAlignText()}
  if(align!=='right')line.addSpacer();
}
function makeWidget(data,cached,family){
  const w=base(),small=family!=='medium',l=data.ledgers.find(l=>l.name===settings.ledger);
  if(!l)throw Error('备份中没有此账本，请重新选择');
  // Old summaries and old Keychain settings migrate to stable defaults.
  const fallback=M.normalize(LOCAL_WIDGET_CONFIG||{});
  if(!l.config&&!LOCAL_WIDGET_CONFIG&&settings.metric==='assets')for(const k of ['small','medium'])fallback[k].items[0].key='assets';
  const c=M.normalize(l.config||LOCAL_WIDGET_CONFIG||fallback)[small?'small':'medium'],p=M.palette(c,Device.isUsingDarkAppearance()),sp=M.spacing(c);
  const color=k=>new Color(p[k]);w.backgroundColor=color('background');if(c.showUpdated){sp.pad=Math.min(sp.pad,12);sp.gap=4}w.setPadding(sp.pad,sp.pad,sp.pad,sp.pad);w.url=siteLink();
  const available=(small?155:329)-2*sp.pad, mainWidth=small?available:Math.floor(available*.48),auxWidth=small?(available-sp.gap)/2:available-mainWidth-14;
  const header=w.addStack();if(c.showTitle)text(header,c.title,12,color('text'),'semibold');header.addSpacer();
  const old=today()>=l.period.end||today()<l.period.start;
  const stale=l.asOf&&l.asOf!==today();if(c.showDate||cached||old||stale)text(header,(cached?'离线 ':old?'旧账期 ':stale?'旧数据 ':'')+(c.showDate?l.period.label:''),10,color('secondary'));
  w.addSpacer(sp.gap);
  const body=small?w:w.addStack(),left=small?body:body.addStack();
  if(!small){left.layoutVertically();left.size=new Size(mainWidth,86);left.url=siteLink()}
  function item(parent,i,primary,width){const label=M.label(i),value=M.display(l,i,c,width,M.numberSize(i,c,primary));text(parent,label,primary?11:10,color('secondary'),'regular',c.align);parent.addSpacer(2);figures(parent,value,M.numberSize(i,c,primary),color('text'),width,c.align,primary?c.weight:'medium')}
  item(left,c.items[0],true,mainWidth);
  if(small){w.addSpacer(sp.gap);const row=w.addStack();for(let i=1;i<c.items.length;i++){if(i>1)row.addSpacer(sp.gap);const col=row.addStack();col.layoutVertically();col.size=new Size(auxWidth,36);item(col,c.items[i],false,auxWidth)}}
  else{left.addSpacer();text(left,'↗',12,color('accent'));body.addSpacer(14);const right=body.addStack();right.layoutVertically();right.size=new Size(auxWidth,86);right.url=siteLink('entry');for(const i of c.items.slice(1)){const r=right.addStack();text(r,M.label(i),10,color('secondary'));r.addSpacer(3);figures(r,M.display(l,i,c,Math.max(55,auxWidth-45),13),13,color('text'),Math.max(55,auxWidth-45),'right','medium');right.addSpacer(5)}right.addSpacer();text(right,'＋',13,color('accent'))}
  if(c.showUpdated){w.addSpacer(3);text(w,'数据 '+data.backedUpAt.slice(5,16).replace('T',' ')+' UTC',9,color('secondary'))}
  return w;
}
function errorWidget(message) { const w = base(); text(w, '星账本', 13, accent, 'medium'); w.addSpacer(); const t = text(w, message, 13); t.lineLimit = 4; w.addSpacer(); text(w, '在 Scriptable 运行脚本设置', 10, muted); return w; }
async function main() {
  let family = config.widgetFamily || 'small';
  if (!config.runsInWidget) {
    if (!settings) { if (!await configure()) return; }
    else {
      const menu = new Alert(); menu.title = '星账本小组件'; menu.message = '预览会读取最后一次云备份，不会上传或修改账本。';
      menu.addAction('刷新并预览小号'); menu.addAction('刷新并预览中号'); menu.addAction('重新配置 / 切换账本'); menu.addCancelAction('取消');
      const choice = await menu.presentSheet(); if (choice < 0) return;
      if (choice === 2 && !await configure()) return;
      family = choice === 1 ? 'medium' : 'small';
    }
  }
  let widget;
  try { if (!settings) throw Error('请先连接星账本'); validateSettings(settings); const result = await loadSummary(); widget = makeWidget(result.data, result.cached, family); }
  catch (e) { widget = errorWidget(e.message); }
  if (config.runsInWidget) Script.setWidget(widget);
  else if (family === 'medium') await widget.presentMedium(); else await widget.presentSmall();
}
try { await main(); } catch (e) { if (config.runsInWidget) Script.setWidget(errorWidget(e.message)); else { const a = new Alert(); a.title = '尚未完成设置'; a.message = e.message; a.addAction('好'); await a.presentAlert(); } }
Script.complete();
