const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const wk=process.env.TEST_ENGINE==='webkit';
 const browser=await(wk?webkit:chromium).launch(wk?{}:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
 const desktop=process.env.TEST_VIEWPORT==='desktop';
 const page=await browser.newPage({viewport:{width:desktop?1280:390,height:844},serviceWorkers:'block'}),errors=[];
 page.setDefaultTimeout(15000);
 page.on('pageerror',error=>errors.push(error.message));
 await page.addInitScript(()=>{
  window.metricAnimations=[];
  const animate=Element.prototype.animate;
  Element.prototype.animate=function(frames,options){const key=this.closest('[data-metric]')?.dataset.metric;if(key)window.metricAnimations.push({key,frames});return animate.call(this,frames,options)};
 });
 await page.goto(process.env.TEST_URL||'http://127.0.0.1:4176');
 await page.waitForSelector('html[data-ready]');
 await page.evaluate(async()=>{const S=await import('./paper/domain/store.js'),{fixture}=await import('./paper/domain/fixture.js'),old=await S.read(),state=fixture();state.revision=old.revision+1;await S.write(state,old.revision)});
 await page.reload();await page.waitForSelector('html[data-ready]');
 assert.equal(await page.evaluate(()=>window.metricAnimations.length),0,'cold open must not imply a change');
 // Exercise the real persisted entry flow, not just the animation helper.
 const oldExpense=await page.locator('[data-metric=expense]').textContent();
 await page.locator(desktop?'.top-add':'.mobile-entry').click();for(const key of '12.34')await page.locator(`[data-key="${key}"]`).click();
 await page.locator('.text-save[data-action=save-entry]').click();
 await page.waitForSelector('#dialog:not([open])',{state:'attached'});
 const keys=await page.evaluate(()=>[...new Set(window.metricAnimations.map(a=>a.key))]);
 for(const key of ['net','expense','budget-left',...(desktop?['budget-used','account:招商银行']:[])])assert.ok(keys.includes(key),'missing animation for '+key);
 if(!desktop)assert.ok(!keys.includes('budget-used')&&!keys.includes('account:招商银行'),'hidden metrics must update without animation');
 assert.ok(!keys.includes('income')&&!keys.includes('budget-total'),'unchanged values must stay still');
 await page.waitForFunction(()=>!document.querySelector('[data-metric-value]'));
 assert.notEqual(await page.locator('[data-metric=expense]').textContent(),oldExpense);
 if(process.env.METRIC_SCREENSHOT)await page.screenshot({path:process.env.METRIC_SCREENSHOT});
 assert.equal(await page.locator('.metric-digit').count(),0,'animation markup is cleaned up');
 await page.evaluate(()=>window.metricAnimations=[]);
 await page.locator('[data-action=budget]').click();await page.locator('[name=budget]').fill('12000');
 await page.locator('#budget-form [type=submit]').click();await page.waitForSelector('#dialog:not([open])',{state:'attached'});
 const budgetKeys=await page.evaluate(()=>[...new Set(window.metricAnimations.map(a=>a.key))]);
 for(const key of ['budget-total','budget-left',...(desktop?['budget-used']:[])])assert.ok(budgetKeys.includes(key));
 assert.ok(!budgetKeys.includes('net')&&!budgetKeys.includes('expense'));
 await page.waitForFunction(()=>!document.querySelector('[data-metric-value]'));
 assert.equal(await page.locator('[data-metric=budget-total]').textContent(),'¥12,000.00');
 await page.evaluate(()=>window.metricAnimations=[]);
 await page.locator('[data-action=prev-month]').click();
 assert.equal(await page.evaluate(()=>window.metricAnimations.length),0,'period switches must not resemble balance changes');
 await page.locator('[data-action=next-month]').click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.locator(desktop?'.top-add':'.mobile-entry').click();for(const key of '1.23')await page.locator(`[data-key="${key}"]`).click();await page.locator('.text-save[data-action=save-entry]').click();
 await page.waitForSelector('#dialog:not([open])',{state:'attached'});
 assert.equal(await page.evaluate(()=>window.metricAnimations.length),0,'reduced motion uses the final values immediately');
 await page.emulateMedia({reducedMotion:'no-preference'});
 // Formatting boundaries, rapid rerenders, missing values and scope isolation.
 await page.evaluate(async()=>{
  const {captureMetrics,flipMetrics}=await import('./paper/motion.js?v=home-metrics2');
  const root=document.createElement('div');document.body.append(root);root.dataset.metricScope='test';
  const update=value=>{const node=document.createElement('span');node.dataset.metric='test';node.textContent=value;root.replaceChildren(node)};
  update('999.99');let old=captureMetrics(root,'test');update('-1,000.00');flipMetrics(root,old,'test');
  if(root.querySelector('.metric-readable').textContent!=='-1,000.00')throw Error('accessible target missing');
  old=captureMetrics(root,'test');if(old.get('test')!=='-1,000.00')throw Error('rapid capture read animation layers');
  update('0.00');flipMetrics(root,old,'test');
  if(captureMetrics(root,'other').size)throw Error('scope leaked');
  root.remove();
 });
 assert.deepEqual(errors,[]);
 console.log('PASS '+(desktop?'desktop':'mobile')+' homepage entry changes, unchanged digits, final values, period scope, reduced motion and rapid formatting changes');
 }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
