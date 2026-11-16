import {readFileSync,writeFileSync} from 'node:fs';
const model=readFileSync('paper/widget-model.js','utf8').replace(/export const WidgetModel=.*?;\s*$/,'');
const path='paper/scriptable/StarLedgerWidget.js',script=readFileSync(path,'utf8');
writeFileSync(path,script.replace(/\/\/ MODEL_START[\s\S]*?\/\/ MODEL_END/,'// MODEL_START\n'+model+'\n// MODEL_END'));
