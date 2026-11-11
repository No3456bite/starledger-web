const{chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/cua/lib/node_modules/playwright-core'),assert=require('node:assert/strict');
(async()=>{const engine=process.env.TEST_ENGINE==='webkit'?webkit:chromium,b=await engine.launch(process.env.TEST_ENGINE==='webkit'?{}:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));const base=process.env.TEST_URL||'http://127.0.0.1:4178';await p.addInitScript(()=>{window.uiAnimations=[];const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){uiAnimations.push({id:this.id,className:this.className,frames,duration:options?.duration});return animate.call(this,frames,options)}});await p.goto(base);await p.waitForSelector('html[data-ready]');await p.locator('.book-switch').click();await p.locator('#dialog [data-action=settings]').click();await p.locator('[aria-controls=settings-appearance]').click();assert.equal(await p.locator('.paper-dialog-header button').first().getAttribute('aria-label'),'返回上一级');await p.locator('[data-action=dialog-back]').click();assert.equal(await p.locator('#dialog-title').textContent(),'主账本');assert.equal(await p.locator('.settings-root').count(),0);await p.locator('#dialog [data-action=backup]').click();await p.locator('#dialog [data-action=cloud]').click();await p.locator('[data-action=dialog-back]').click();assert.equal(await p.locator('#dialog-title').textContent(),'数据与备份');await p.locator('[data-action=dialog-back]').click();assert.equal(await p.locator('#dialog-title').textContent(),'主账本');await p.locator('#dialog [data-action=settings]').click();await p.locator('[aria-controls=settings-management]').click();await p.locator('[data-settings-action=manage-groups]').click();await p.locator('[data-action=dialog-back]').click();assert.equal(await p.locator('#dialog-title').textContent(),'主账本');await p.locator('#dialog [data-action=close]').click();console.log('PASS settings Back exits immediately with expanded tools, workspace/backup/cloud return stack');

// Keep the two upper-left actions distinct and animate every settings entry.
await p.evaluate(async()=>{const S=await import('./paper/domain/store.js'),F=await import('./paper/domain/fixture.js'),old=await S.read(),next=F.fixture();next.revision=old.revision+1;await S.write(next,old.revision)});
await p.reload();await p.waitForSelector('html[data-ready]');
const trace=()=>p.evaluate(()=>uiAnimations.length);
const animatedSince=async(before,label)=>assert.ok(await p.evaluate(n=>uiAnimations.slice(n).some(a=>a.duration>=260),before),label+' must animate');
const openSettings=async()=>{await p.locator('.book-switch').click();const n=await trace();await p.locator('#dialog [data-action=settings]').click();await animatedSince(n,'same-kind settings navigation')};
await openSettings();
const header=p.locator('.paper-dialog-header'),back=header.locator('[data-action=dialog-back]'),exit=header.locator('[data-action=dismiss-dialog]');
assert.equal(await back.isVisible(),true);assert.equal(await exit.isVisible(),true);
const bounds=await Promise.all([back.boundingBox(),exit.boundingBox(),p.locator('#dialog-title').boundingBox()]);
assert.ok(bounds[0].x<bounds[1].x&&bounds[1].x+bounds[1].width<=bounds[2].x);
assert.ok(bounds[0].width>=44&&bounds[0].height>=44&&bounds[1].width>=44);
for(const id of ['settings-appearance','settings-budget','settings-management','settings-data']){const n=await trace();await p.locator('[aria-controls='+id+']').click();await animatedSince(n,id);}
for(const action of ['budget','manage-groups','manage-categories','manage-tags','backup','cloud','folder']){
 const n=await trace();await p.locator('[data-settings-action='+action+']').first().click();await animatedSince(n,action);
 assert.equal(await back.isVisible(),true);assert.equal(await exit.isVisible(),true);
}
// A nested editor marked with > must animate too, including a reopened tool.
await p.locator('.category-management summary').first().click();let n=await trace();await p.locator('[data-settings-action=edit-category]').first().click();await animatedSince(n,'category editor');
n=await trace();await p.locator('[data-settings-action=edit-category]').first().click();await animatedSince(n,'explicit editor collapse');
const category=p.locator('[data-settings-action=edit-category]').first();n=await trace();await category.click();await animatedSince(n,'reopen category editor');
await exit.click();assert.equal(await p.locator('#dialog[open]').count(),0);
// Returning from a complete detail replacement animates in the reverse direction.
await p.locator('.book-switch').click();await p.locator('#dialog [data-action=backup]').click();n=await trace();await p.locator('#dialog [data-action=cloud]').click();await animatedSince(n,'backup to cloud');
n=await trace();await p.locator('[data-action=dialog-back]').click();await animatedSince(n,'cloud back to backup');
assert.ok(await p.evaluate(n=>uiAnimations.slice(n).some(a=>String(a.frames?.[0]?.transform).includes('-14px')),n));
await p.locator('[data-action=dismiss-dialog]').click();
console.log('PASS simultaneous upper-left Back + Close, 44px targets, every settings tool and forward/back motion');
// Restore Books as a real primary tab, independently of the removed settings entry.
await p.locator('#mobile-navigation a[href="#books"]').click();await p.waitForSelector('.paper-books');
assert.equal(await p.locator('#mobile-navigation a').count(),5);assert.equal(await p.locator('.paper-book').count(),3);
const book=await p.locator('.paper-book').first().getAttribute('data-name');
await p.locator('.paper-book').first().click();await p.waitForSelector('#search-query');
assert.ok(await p.locator('.filter-chips').textContent().then(t=>t.includes(book)));
await p.locator('#mobile-navigation a[href="#books"]').click();await p.waitForSelector('.paper-books');
await p.locator('#main [data-action=manage-books]').click();await p.locator('[data-action=edit-book]').first().click();
assert.equal(await p.locator('#book-profile-form [name=name]').inputValue(),book);
await p.locator('#dialog [data-action=close]').click();
await p.locator('#main [data-action=new-book]').click();await p.locator('#book-form [name=name]').fill('入口验收');await p.locator('#book-form [type=submit]').click();
await p.waitForSelector('#dialog:not([open])',{state:'attached'});await p.waitForFunction(()=>document.querySelector('.paper-books')?.textContent.includes('入口验收'));assert.ok(await p.locator('.paper-books').textContent().then(t=>t.includes('入口验收')));
await openSettings();assert.equal(await p.locator('.settings-root [data-settings-action=manage-books]').count(),0);await exit.click();
await p.emulateMedia({reducedMotion:'reduce'});await p.locator('.book-switch').click();await p.locator('#dialog [data-action=settings]').click();n=await trace();await p.locator('[aria-controls=settings-data]').click();await p.locator('[data-settings-action=backup]').click();assert.equal(await trace(),n);await exit.click();await p.emulateMedia({reducedMotion:'no-preference'});
console.log('PASS Books tab, browse/filter, manage/edit, create, removed settings entry and reduced-motion navigation');
await p.evaluate(async()=>{const S=await import('./paper/domain/store.js'),F=await import('./paper/domain/fixture.js'),old=await S.read(),next=F.fixture();next.rows=Array.from({length:6058},(_,i)=>({...next.rows[i%next.rows.length],id:'perf-'+i}));next.revision=old.revision+1;await S.write(next,old.revision)});await p.reload();await p.waitForSelector('html[data-ready]');const nav=p.locator('#mobile-navigation'),shield=p.locator('#mobile-navigation-shield');for(const page of ['search','month','accounts','home']){await p.evaluate(x=>location.hash=x,page);await p.waitForFunction(x=>document.querySelector('#main').dataset.page===x,page);const n=await nav.boundingBox(),s=await shield.boundingBox();assert.ok(Math.abs(n.height-s.height)<2);assert.equal(await shield.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(17, 18, 20)');assert.ok(await nav.evaluate(e=>getComputedStyle(e).contain.includes('paint')));assert.ok(await nav.evaluate(e=>getComputedStyle(e).backdropFilter==='none'))}console.log('PASS independent opaque navigation backing at every page transition with 6058 bills');assert.deepEqual(errors,[]);await b.close()})().catch(e=>{console.error(e);process.exit(1)})
