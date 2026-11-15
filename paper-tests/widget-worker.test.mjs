import test from 'node:test';
import assert from 'node:assert/strict';
import {widgetSnapshot} from '../paper/domain/widget.js';
import {normalizeLedger} from '../paper/domain/workspace.js';
import * as B from '../paper/domain/backup.js';
import {Zip} from '../paper/domain/zip.js';
import worker from '../cloudflare/worker.mjs';
import {widgetToken} from '../cloudflare/widget.mjs';

const ledger = () => normalizeLedger({rows: [], prefs: {mainName:'生活', monthStartDay:25, budgets:{__global_monthly__:5000}}},'生活');
const bill = (id, date, amount, extra = {}) => ({id,date:date+' 12:00:00',type:'支出',category:'餐饮',subcategory:'午餐',account:'现金',account2:'',book:'日常账本',currency:'人民币',amount:String(amount),extras:'',...extra});

test('widget uses actual backup cycle, existing budget exclusions, hidden accounts and missing rates',()=>{
 const s=ledger();s.rows=[bill('a','2026-10-25',100),bill('b','2026-11-10',50,{extras:'{"budgetEffect":"none"}'}),bill('c','2026-11-25',900),bill('d','2026-11-10',999,{account:'隐藏'})];s.prefs.accountProfiles.隐藏={hidden:true};
 let l=widgetSnapshot({生活:s},'生活',new Date(2026,10,15,10)).ledgers[0];
 assert.deepEqual(l.period,{start:'2026-10-25',end:'2026-11-25',label:'2026-10'});assert.equal(l.expense,150);assert.equal(l.budgetSpent,100);assert.equal(l.budgetLeft,4900);
 s.rows.push(bill('fx','2026-11-15',5,{currency:'美元'}));l=widgetSnapshot({生活:s},'生活',new Date(2026,10,15)).ledgers[0];assert.equal(l.expenseUnknown,1);assert.equal(l.budgetUnknown,1);
 s.prefs.budgets.__global_monthly__=0;assert.equal(widgetSnapshot({生活:s},'生活').ledgers[0].budget,0);
 delete s.prefs.budgets.__global_monthly__;assert.equal(widgetSnapshot({生活:s},'生活').ledgers[0].budget,null);
 const jan=widgetSnapshot({生活:s},'生活',new Date(2027,0,3)).ledgers[0];assert.equal(jan.period.label,'2026-12');
});

test('snapshot is carried in the ZIP but does not change canonical data hash',async()=>{
 const s=ledger();s.otherLedgers={旅行:ledger()};const entries=await B.entries(s),task=await B.readZip(Zip.create(entries));
 assert.equal(task.manifest.widget.ledgers.length,2);assert.equal(task.manifest.widget.backedUpAt,task.manifest.createdAt);
 const h=await B.contentHash(entries);const manifest=entries.find(e=>e.name===B.MANIFEST);const m=JSON.parse(manifest.data);m.widget.backedUpAt='2099-01-01T00:00:00Z';manifest.data=JSON.stringify(m);assert.equal(await B.contentHash(entries),h);
});

test('widget capability only reads summaries; invalid, old and oversized backups fail closed',async()=>{
 const env={SYNC_TOKEN:'test-long-secret',DAV_FILE_URL:'https://dav.jianguoyun.com/dav/StarLedger/StarLedger-backup.zip',DAV_USERNAME:'test',DAV_PASSWORD:'test'};
 const original=globalThis.fetch;let writes=0,body=await B.exportZip(ledger()),exists=true,oversize=false;
 globalThis.fetch=async(url,options)=>{if(options.method==='PUT')writes++;return new Response(exists?body:null,{status:exists?200:404,headers:oversize?{'Content-Length':String(21*1024*1024)}:{}})};
 const call=(path,token=env.SYNC_TOKEN,method='GET')=>worker.fetch(new Request('https://example.workers.dev'+path,{method,headers:{Authorization:'Bearer '+token}}),env);
 try{
  const pairing=await (await call('/widget-config')).json();assert.match(pairing.token,/^[a-f0-9]{64}$/);assert.notEqual(pairing.token,env.SYNC_TOKEN);
  const response=await call('/widget',pairing.token);assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');const summary=await response.json();assert.equal(summary.format,'starledger-widget');assert.equal(JSON.stringify(summary).includes('accountProfiles'),false);
  for(const path of ['/backup','/status','/widget-config'])assert.equal((await call(path,pairing.token)).status,401);
  assert.equal((await call('/widget',pairing.token,'PUT')).status,405);assert.equal(writes,0);assert.equal((await call('/widget','wrong')).status,401);assert.equal((await call('/widget?token='+pairing.token,'')).status,401);
  assert.notEqual(await widgetToken('rotated-secret'),pairing.token);
  exists=false;assert.equal((await call('/widget')).status,404);exists=true;
  const entries=await B.entries(ledger());const manifest=entries.find(e=>e.name===B.MANIFEST),m=JSON.parse(manifest.data);delete m.widget;manifest.data=JSON.stringify(m);body=Zip.create(entries);assert.equal((await call('/widget')).status,409);
  body=new Uint8Array([80,75,0]);assert.equal((await call('/widget')).status,409);
  oversize=true;assert.equal((await call('/widget')).status,409);
 }finally{globalThis.fetch=original}
});
