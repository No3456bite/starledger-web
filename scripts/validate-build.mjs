import {readFileSync,existsSync,readdirSync} from 'node:fs';import {execFileSync} from 'node:child_process';
const read=p=>readFileSync(p,'utf8'),html=read('index.html'),app=read('paper/app.js');
for(const path of ['paper/app.js','paper/style.css','paper/workflows.css','paper/domain/migrate.js','paper/assets/fonts/fonts.css','legacy-ui.html'])if(!existsSync(path))throw Error('Missing '+path);
if(!html.includes('paper/app.js?v=nav-shield2')||html.includes('src="./app.js?'))throw Error('Incorrect active renderer');
if(app.includes('const fresh=fixture()')||!app.includes('await initialState()'))throw Error('Production must migrate legacy data or start empty');
if(!read('paper/domain/migrate.js').includes("transaction('state','readonly')"))throw Error('Legacy migration must be read only');
if(!read('paper/domain/store.js').includes('starledger-paper-production-v1'))throw Error('Missing isolated production store');
for(const dir of ['paper','paper/domain'])for(const name of readdirSync(dir))if(name.endsWith('.js'))execFileSync(process.execPath,['--check',dir+'/'+name]);
console.log('Production renderer, migration, assets and JS checks passed');
