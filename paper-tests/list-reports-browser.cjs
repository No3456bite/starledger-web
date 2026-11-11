const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/cua/lib/node_modules/playwright-core');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const wk=process.env.TEST_ENGINE==='webkit',browser=await(wk?webkit:chromium).launch(wk?{}:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const url=process.env.TEST_URL||'http://127.0.0.1:4178';
 await p.goto(url);await p.waitForSelector('html[data-ready]');
 await p.evaluate(async()=>{const S=await import('./paper/domain/store.js'),F=await import('./paper/domain/fixture.js'),L=await import('./paper/domain/ledger.js'),old=await S.read(),next=F.fixture(),base=next.rows[0],today=L.localDate();next.rows=Array.from({length:150},(_,i)=>({...base,id:'list-'+i,merchant:i===0?'GPT Google gyp':i===1?'Salary':'账单 '+i,type:i===1?'收入':'支出',amount:i===1?'12345.67':i===0?'16.99':'23.45',date:today+' '+String(23-Math.floor(i/60)).padStart(2,'0')+':'+String(59-i%60).padStart(2,'0')+':00',currency:'CNY'}));next.revision=old.revision+1;await S.write(next,old.revision)});
 await p.reload();await p.waitForSelector('html[data-ready]');
 const hold=async row=>{await row.scrollIntoViewIfNeeded();await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));const box=await row.boundingBox();await p.mouse.move(box.x+Math.min(100,box.width/2),box.y+box.height/2);await p.mouse.down();try{await p.locator('#record-actions:popover-open').waitFor({state:'visible',timeout:3000})}finally{await p.mouse.up()}};
 const read=()=>p.evaluate(async()=>(await import('./paper/domain/store.js')).read()),start=await read();
 assert.equal(await p.locator('#home-records [data-entry]').count(),12);
 await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));
 await p.waitForFunction(()=>document.querySelectorAll('#home-records [data-entry]').length>12);
 assert.equal(await p.locator('#main [data-action=more-records]').count(),0);
 const loaded=await p.locator('#home-records [data-entry]').count();
 await p.evaluate(()=>scrollTo(0,0));
 await p.locator('#mobile-navigation a[href="#search"]').click();await p.waitForSelector('#search-query');
 await p.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await p.waitForFunction(()=>document.querySelectorAll('.all-transactions [data-entry]').length>40);
 assert.ok(await p.locator('.all-transactions [data-entry]').count()>=80);
 await p.locator('#search-query').fill('GPT');assert.equal(await p.locator('.all-transactions [data-entry]').count(),1);
 assert.equal(await p.locator('.transaction-title').textContent(),'GPT Google gyp');
 await p.evaluate(()=>document.fonts.ready);assert.ok(await p.evaluate(()=>document.fonts.check('16px LedgerSerif','GPT Google gyp')));
 const title=p.locator('.transaction-title');assert.ok(await title.evaluate(e=>{const s=getComputedStyle(e);return parseFloat(s.lineHeight)>=parseFloat(s.fontSize)*1.5&&parseFloat(s.paddingTop)>=1}));
 await p.locator('#search-query').fill('');await p.evaluate(()=>scrollTo(0,0));
 const first=p.locator('.all-transactions [data-entry]').first(),firstId=await first.getAttribute('data-entry');
 await hold(first);
 assert.equal(await p.locator('#record-actions:popover-open').count(),1);assert.equal(await p.locator('#dialog[open]').count(),0);await p.keyboard.press('Escape');assert.equal(await p.locator('#record-actions:popover-open').count(),0);await hold(first);await p.locator('#main h1').click();assert.equal(await p.locator('#record-actions:popover-open').count(),0);await hold(first);
 await p.locator('[data-action=quick-relate]').click();await p.locator('.all-transactions [data-entry]').nth(1).click();await p.locator('[data-action=quick-relate-save]').click();await p.waitForFunction(()=>!document.querySelector('.inline-relation-bar'));
 let state=await read();assert.equal(state.relations.groups.length,1);assert.equal(state.relations.groups[0].members.length,2);assert.deepEqual(state.rows,start.rows);
 await hold(first);await p.locator('[data-action=quick-delete]').click();await p.locator('[data-action=quick-delete-cancel]').click();assert.equal((await read()).rows.length,150);
 await hold(first);await p.locator('[data-action=quick-delete]').click();await p.locator('[data-action=quick-delete-confirm]').click();await p.waitForFunction(()=>!document.querySelector('#record-actions:popover-open'));state=await read();assert.equal(state.rows.length,149);assert.ok(!state.rows.some(r=>r.id===firstId));assert.ok(state.recovery);assert.equal(await p.locator('#dialog[open]').count(),0);
 console.log('PASS home/search continuous scrolling, readable Latin, inline relation and safe deletion without subpages');
 await p.locator('#mobile-navigation a[href="#month"]').click();await p.waitForSelector('.calendar');
 const mixed=p.locator('.day:not(.blank)').filter({has:p.locator('.day-income')}).first();assert.equal(await mixed.locator('.day-income').count(),1);assert.equal(await mixed.locator('.day-expense').count(),1);assert.match(await mixed.getAttribute('aria-label'),/收入12,345.67 支出/);
 const meta=await p.locator('.report-meta>span').evaluateAll(es=>es.slice(0,2).map(e=>{const r=e.getBoundingClientRect();return r.y+r.height/2}));assert.ok(Math.abs(meta[0]-meta[1])<1);
 await p.locator('[data-action=toggle-stat-period]').click();await p.waitForSelector('.year-chart');
 assert.ok(await p.locator('.year-chart-scroll').evaluate(e=>e.clientWidth<innerWidth&&e.scrollWidth>e.clientWidth&&e.scrollLeft>0));assert.equal(await p.locator('.bar-col').count(),12);assert.equal(await p.locator('.bar-values .chart-income').count(),12);assert.equal(await p.locator('.bar-values .chart-expense').count(),12);
 assert.equal(await p.locator('.chart-legend i').count(),2);assert.equal(await p.locator('.chart-legend').textContent(),'收入支出');
 for(const width of [320,390,1440]){await p.setViewportSize({width,height:844});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));fs.mkdirSync('/tmp/list-reports-qa',{recursive:true});await p.evaluate(()=>document.querySelector('.year-chart-scroll').scrollIntoView({block:'center'}));await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await p.screenshot({path:'/tmp/list-reports-qa/year-'+(wk?'webkit':'chromium')+'.png'});
 console.log('PASS daily income + expense, aligned summary, amount labels and color swatches without page overflow');
 // Exercise the real one-click backup protocol against an isolated fake Worker.
 let remote=null,version=0,puts=0,corrupt=false;
 await p.route('https://backup.example.test/**',async route=>{const req=route.request(),path=new URL(req.url()).pathname,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, PUT, OPTIONS'};if(req.method()==='OPTIONS')return route.fulfill({status:204,headers});if(path==='/status')return route.fulfill({json:{exists:!!remote,etag:String(version),updatedAt:new Date().toISOString(),bytes:remote?.length||0},headers});if(path==='/backup'&&req.method()==='PUT'){puts++;remote=req.postDataBuffer();version++;return route.fulfill({json:{ok:true},headers})}if(path==='/backup')return route.fulfill({body:corrupt?'broken ZIP':remote,status:200,headers:{...headers,'Content-Type':'application/zip'}});return route.fulfill({status:404,headers})});
 await p.evaluate(()=>{localStorage.setItem('starledger-paper-cloud',JSON.stringify({url:'https://backup.example.test',token:'test-only',auto:false}));localStorage.setItem('star-ledger-auto-backup-v1',JSON.stringify({lastSuccessAt:Date.now()-86400000}))});
 await p.goto(url+'/#home');await p.reload();await p.waitForSelector('html[data-ready]');assert.ok(await p.locator('.home-backup time').getAttribute('datetime'));
 await p.locator('[data-action=backup-now]').click();await p.waitForFunction(()=>document.querySelector('.home-backup:not([disabled])')&&document.querySelector('#toast').textContent.includes('已上传并核验'));assert.equal(puts,1);assert.equal(await p.locator('#dialog[open]').count(),0);
 const timestamp=await p.evaluate(()=>JSON.parse(localStorage.getItem('starledger-paper-backup-status')).at);
 await p.reload();await p.waitForSelector('html[data-ready]');await p.locator('[data-action=backup-now]').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('本机与云端一致'));assert.equal(puts,1);
 assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('starledger-paper-cloud')).auto),false);
 // Persisted baseline permits a changed local snapshot after reload, but blocks
 // an independently changed remote snapshot without overwriting either side.
 await p.evaluate(async()=>{const S=await import('./paper/domain/store.js'),old=await S.read(),next=structuredClone(old);next.rows[0].note='本机新修改';next.revision++;await S.write(next,old.revision)});await p.reload();await p.waitForSelector('html[data-ready]');state=await read();
 await p.locator('[data-action=backup-now]').click();await p.waitForFunction(()=>document.querySelector('#toast').textContent.includes('已上传并核验')&&!document.querySelector('.home-backup[disabled]'));assert.equal(puts,2);
 remote=Buffer.from(await p.evaluate(async()=>{const S=await import('./paper/domain/store.js'),B=await import('./paper/domain/backup.js'),next=await S.read();next.rows[0].note='另一设备的修改';const bytes=await B.exportZip(next);return btoa(Array.from(bytes,x=>String.fromCharCode(x)).join(''))}),'base64');version++;
 const beforeConflict=await p.evaluate(()=>JSON.parse(localStorage.getItem('starledger-paper-backup-status')).at);
 await p.locator('[data-action=backup-now]').click();await p.waitForSelector('#cloud-review-form');assert.equal(await p.locator('#dialog-title').textContent(),'核对云端备份');assert.equal(puts,2);assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('starledger-paper-backup-status')).at),beforeConflict);assert.deepEqual((await read()).rows,state.rows);
 await p.locator('#dialog [data-action=close]').first().click();
 // A failed read-back must never be recorded as a new successful backup.
 const validAt=await p.evaluate(()=>JSON.parse(localStorage.getItem('starledger-paper-backup-status')).at);corrupt=true;await p.locator('[data-action=backup-now]').click();await p.waitForFunction(()=>!document.querySelector('.home-backup[disabled]'));assert.equal(await p.evaluate(()=>JSON.parse(localStorage.getItem('starledger-paper-backup-status')).at),validAt);assert.equal(puts,2);assert.ok(timestamp<=validAt);
 assert.deepEqual((await read()).rows,state.rows);
 console.log('PASS migrated backup time, one-click verified upload, persistent baseline, conflict protection, no auto-enable and failed-backup safety');
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
