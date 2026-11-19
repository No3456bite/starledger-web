import {readFileSync,existsSync,readdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(p,'utf8'),html=read('index.html'),app=read('paper/app.js');
for(const path of ['paper/app.js','paper/style.css','paper/workflows.css','paper/domain/migrate.js','paper/assets/fonts/fonts.css','legacy-ui.html'])if(!existsSync(path))throw Error('Missing '+path);
if(!html.includes('paper/app.js?v=home-metrics1')||html.includes('src="./app.js?'))throw Error('Incorrect active renderer');
if(!app.includes('./dialog-viewport.js?v=ios-focus9')||!read('scripts/build-site.mjs').includes('./paper/dialog-viewport.js?v=ios-focus9'))throw Error('Keyboard controller must bypass the previous offline cache and be precached');
if(app.includes('const fresh=fixture()')||!app.includes('await initialState()'))throw Error('Production must migrate legacy data or start empty');
if(!read('paper/domain/migrate.js').includes("transaction('state','readonly')"))throw Error('Legacy migration must be read only');
if(!read('paper/domain/store.js').includes('starledger-paper-production-v1'))throw Error('Missing isolated production store');
for(const dir of ['paper','paper/domain'])for(const name of readdirSync(dir))if(name.endsWith('.js'))execFileSync(process.execPath,['--check',dir+'/'+name]);
console.log('Production renderer, migration, assets and JS checks passed');

for(const path of ['paper/widget-settings.js','paper/domain/widget.js','paper/scriptable/StarLedgerWidget.js','cloudflare/widget.mjs'])if(!existsSync(path))throw Error('Missing widget resource '+path);
if(!app.includes('data-action="widget"')||!read('paper/domain/backup.js').includes('widget:widgetSnapshot('))throw Error('Widget settings and backed-up snapshot must ship together');
if(!read('paper/features.js').includes('connections.js?v=widget3')||!read('scripts/build-site.mjs').includes('./paper/domain/backup.js?v=widget3'))throw Error('Widget dependencies must bypass older offline caches');
execFileSync(process.execPath,['--check','paper/scriptable/StarLedgerWidget.js']);

if(!app.includes('./motion.js?v=home-metrics1')||!read('scripts/build-site.mjs').includes('./paper/motion.js?v=home-metrics1'))throw Error('Financial motion must bypass previous offline caches and be precached');
