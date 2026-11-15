import test from 'node:test';
import assert from 'node:assert/strict';
import {createConnections} from '../paper/connections.js';
import * as B from '../paper/domain/backup.js';
import {Zip} from '../paper/domain/zip.js';
import {normalizeLedger} from '../paper/domain/workspace.js';

test('explicit widget refresh upgrades equal old backup and verifies summary read-back',async()=>{
 const s={...normalizeLedger({rows:[],prefs:{mainName:'生活'}},'生活'),revision:1};
 const entries=await B.entries(s),manifest=entries.find(e=>e.name===B.MANIFEST),m=JSON.parse(manifest.data);delete m.widget;manifest.data=JSON.stringify(m);
 let remote=Zip.create(entries),etag=1,puts=0,ignoreWrite=false;
 const saved=new Map([['starledger-paper-cloud',JSON.stringify({url:'https://example.test',token:'test',auto:false})]]);
 const originals=Object.fromEntries(['localStorage','document','fetch','setInterval'].map(k=>[k,globalThis[k]]));
 globalThis.localStorage={getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)};
 globalThis.document={querySelector:()=>null,visibilityState:'visible'};globalThis.setInterval=()=>0;
 globalThis.fetch=async(url,opts)=>{
  if(url.endsWith('/status'))return new Response(JSON.stringify({exists:true,etag:String(etag),bytes:remote.length}));
  if(opts.method==='PUT'){puts++;if(!ignoreWrite){remote=opts.body;etag++}return new Response('{}')}
  return new Response(remote);
 };
 try{
  const c=createConnections({state:()=>s,hasDraft:()=>false,toast:()=>{},esc:x=>x});
  assert.equal(await c.quickBackup(),'done');assert.equal(puts,0,'ordinary verify keeps the existing behavior');
  assert.equal(await c.quickBackup({refreshWidget:true}),'done');assert.equal(puts,1);assert.equal((await B.readZip(remote)).manifest.widget.format,'starledger-widget');
  const before=c.getBackupStatus().at;remote=Zip.create(entries);ignoreWrite=true;
  await assert.rejects(c.quickBackup({refreshWidget:true}),/上传后校验不一致/);assert.equal(c.getBackupStatus().at,before,'an unchanged old ZIP must not be marked newly backed up');
 }finally{for(const[k,v]of Object.entries(originals))if(v===undefined)delete globalThis[k];else globalThis[k]=v}
});
