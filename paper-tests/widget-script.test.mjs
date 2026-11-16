import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../paper/scriptable/StarLedgerWidget.js',import.meta.url),'utf8');
const summary={format:'starledger-widget',version:1,backedUpAt:'2026-11-15T10:30:00Z',ledgers:[{name:'生活',period:{start:'2026-11-01',end:'2026-12-01',label:'2026-11'},net:28650,assets:30000,expense:3280,budget:5000,budgetSpent:3280,budgetLeft:1720}]};
async function run({family='small',status=200,offline=false,cache=null,configure=false,remote=summary,local=null}={}){
 const labels=[],links=[],files=new Map(),cfg={endpoint:'https://example.test/widget',token:'a'.repeat(64),siteUrl:'https://example.test/',ledger:'生活',metric:'net',cacheId:'test'},key='starledger.widget.v1.Test';
 if(cache)files.set('/docs/starledger-widget-test.json',JSON.stringify(cache));
 class Stack{set url(value){links.push(value)}addText(s){labels.push(s);return{rightAlignText(){},centerAlignText(){}}}addStack(){return new Stack()}addSpacer(){}layoutVertically(){}centerAlignContent(){}setPadding(){}}
 class Color{static dynamic(a){return a}}class Size{constructor(w,h){this.width=w;this.height=h}}
 let output;
 const context={console,Date,JSON,Number,String,Error,Map,Color,Size,Font:{systemFont(){},regularSystemFont(){},mediumSystemFont(){},semiboldSystemFont(){},boldSystemFont(){}},Device:{isUsingDarkAppearance:()=>false},config:{runsInWidget:true,widgetFamily:family},Script:{name:()=> 'Test',setWidget:w=>output=w,complete(){}},Keychain:{contains:()=>!configure,get:()=>JSON.stringify(cfg)},FileManager:{local:()=>({documentsDirectory:()=>'/docs',joinPath:(a,b)=>a+'/'+b,fileExists:p=>files.has(p),readString:p=>files.get(p),writeString:(p,v)=>files.set(p,v),remove:p=>files.delete(p)})},ListWidget:Stack,DateFormatter:class{string(){return '11/15 10:30'}},Request:class{constructor(){this.response={statusCode:status}}async loadString(){if(offline)throw Error('offline');return JSON.stringify(remote)}}};
 vm.createContext(context);await vm.runInContext('(async()=>{'+source.replace('const LOCAL_WIDGET_CONFIG = null;','const LOCAL_WIDGET_CONFIG = '+JSON.stringify(local)+';')+'})()',context);return{labels,links,files,output};
}
test('small and medium show backed-up numbers, medium adds remaining budget',async()=>{
 const a=await run(),b=await run({family:'medium'});assert.ok(a.output);assert.ok(a.labels.join('').includes('¥28,650'));assert.ok(a.labels.join('').includes('¥3,280'));assert.equal(a.labels.includes('剩余'),false);assert.ok(b.labels.includes('剩余预算')||b.labels.includes('本月支出'));assert.ok(a.links.includes('https://example.test/#home'));assert.ok(b.links.includes('https://example.test/#entry'));assert.equal(a.links.includes('https://example.test/#entry'),false);for(const r of [a,b])assert.equal(r.labels.some(l=>/备份|11\/15|10:30/.test(l)),false);
});
test('offline cache is explicit; revoked credentials clear it; fresh install never invents amounts',async()=>{
 const a=await run({offline:true,cache:summary});assert.ok(a.labels.some(l=>l.startsWith('离线')));
 const b=await run({status:401,cache:summary});assert.equal(b.files.size,0);assert.ok(b.labels.some(l=>l.includes('连接已失效')));assert.equal(b.labels.includes('¥28,650'),false);
 const c=await run({configure:true});assert.ok(c.labels.includes('请先连接星账本'));assert.equal(c.labels.some(l=>l.includes('¥')),false);
});

test('generated script applies embedded settings and follows newer remote display config',async()=>{
 const local={small:{title:'本地样式',items:[{key:'assets',label:'我的存款'}]}},a=await run({local});assert.ok(a.labels.includes('本地样式'));assert.ok(a.labels.includes('我的存款'));
 const remote=structuredClone(summary);remote.ledgers[0].config={small:{title:'云端更新',items:[{key:'expense',label:'本月花销'}]}};
 const b=await run({local,remote});assert.ok(b.labels.includes('云端更新'));assert.ok(b.labels.includes('本月花销'));assert.equal(b.labels.includes('本地样式'),false);
 const corrupt={...remote,version:99};const c=await run({remote:corrupt,cache:summary});assert.ok(c.labels.some(l=>l.includes('离线')));
});
