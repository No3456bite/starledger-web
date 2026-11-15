const {chromium,webkit}=require(process.env.PLAYWRIGHT_MODULE||'/opt/codex/runtimes/cua/lib/node_modules/playwright-core');
const assert=require('node:assert/strict');
(async()=>{
 const wk=process.env.TEST_ENGINE==='webkit',browser=await(wk?webkit:chromium).launch(wk?{}:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}),context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 let widgetStatus=200;
 await p.route('https://backup.example.test/**',async route=>{const path=new URL(route.request().url()).pathname,headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, OPTIONS'};if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers});if(path==='/widget-config')return route.fulfill({json:{endpoint:'https://backup.example.test/widget',token:'a'.repeat(64)},headers});if(path==='/widget')return route.fulfill({status:widgetStatus,json:{format:'starledger-widget',version:1,backedUpAt:'2026-11-15T10:30:00Z',ledgers:[{name:'生活',period:{label:'2026-11'},net:28650,budget:5000,expense:3280}]},headers});return route.fulfill({status:404,headers})});
 await p.goto(process.env.TEST_URL||'http://127.0.0.1:4178');await p.waitForSelector('html[data-ready]');
 await p.evaluate(()=>localStorage.setItem('starledger-paper-cloud',JSON.stringify({url:'https://backup.example.test',token:'synthetic-test',auto:false})));await p.reload();await p.waitForSelector('html[data-ready]');
 await p.locator('.book-switch').click();await p.locator('#dialog [data-action=settings]').click();
 await p.locator('[aria-controls=settings-data]').click();await p.locator('[data-settings-action=widget]').click();await p.waitForSelector('.widget-settings');
 await p.locator('.widget-examples').screenshot({path:'test-results/widget-layouts.png'});
 assert.equal(await p.locator('.widget-small').count(),1);assert.equal(await p.locator('.widget-medium').count(),1);
 await p.locator('[data-action=widget-pair]').click();await p.waitForSelector('.widget-pairing:not([hidden])');
 const pairing=JSON.parse(await p.locator('#widget-pairing-text').inputValue());assert.equal(pairing.token,'a'.repeat(64));assert.equal(JSON.stringify(pairing).includes('synthetic-test'),false);
 await p.locator('[data-action=widget-check]').click();await p.waitForFunction(()=>document.querySelector('[data-widget-status]').textContent.includes('28,650'));
 assert.match(await p.locator('[data-widget-status]').textContent(),/2026-11/);
 for(const width of [320,390,430]){await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await p.locator('.widget-settings').evaluate(n=>n.scrollWidth>n.clientWidth+1),false)}
 await p.setViewportSize({width:390,height:844});
 await p.locator('.widget-small').scrollIntoViewIfNeeded();await p.screenshot({path:'/tmp/starledger-widget-'+(wk?'webkit':'chromium')+'.png'});
 widgetStatus=404;await p.locator('[data-action=widget-check]').click();await p.waitForFunction(()=>document.querySelector('[data-widget-status]').textContent.includes('404'));
 const script=await(await context.request.get((process.env.TEST_URL||'http://127.0.0.1:4178')+'/paper/scriptable/StarLedgerWidget.js')).text();assert.match(script,/Script.setWidget/);
 assert.deepEqual(errors,[]);console.log('PASS widget settings, pairing scope, summary check, error help, downloads and mobile layout ('+(wk?'webkit':'chromium')+')');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
