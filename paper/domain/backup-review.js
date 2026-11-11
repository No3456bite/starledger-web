import * as W from './workspace.js';
import * as B from './backup.js';
import {COLS} from './ledger.js';
const stable=value=>Array.isArray(value)?value.map(stable):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
const json=value=>JSON.stringify(stable(value));
// Only transport and backup bookkeeping differ across these representations.
// Preserve every bill, account, budget, category and relation in the comparison.
function normalized(ledgers){return Object.fromEntries(Object.keys(ledgers).sort().map(name=>{const ledger=W.normalizeLedger(ledgers[name],name);for(const key of ['lastExportAt','lastExportName','backupDeviceName','lastChangeAt','_starConfigUpdatedAt'])delete ledger.prefs[key];return[name,ledger]}))}
export async function workspaceHash(ledgers){const all=normalized(ledgers),names=Object.keys(all),active=names[0];if(!active)throw Error('备份没有主账本');return B.contentHash(await B.entries({...all[active],otherLedgers:Object.fromEntries(names.slice(1).map(name=>[name,all[name]]))}))}
export function compareWorkspaces(local,remote){const left=normalized(local),right=normalized(remote);return [...new Set([...Object.keys(left),...Object.keys(right)])].sort().map(name=>{const a=left[name],b=right[name],one=new Map((a?.rows||[]).map(row=>[row.id,row])),two=new Map((b?.rows||[]).map(row=>[row.id,row]));let localOnly=0,cloudOnly=0,changed=0;for(const[id,row]of one){if(!two.has(id))localOnly++;else if(json(COLS.map(key=>String(row[key]??'')))!==json(COLS.map(key=>String(two.get(id)[key]??''))))changed++}for(const id of two.keys())if(!one.has(id))cloudOnly++;return{name,localCount:one.size,cloudCount:two.size,localOnly,cloudOnly,changed,settingsChanged:json(a?.prefs)!==json(b?.prefs),relationsChanged:json(a?.relations)!==json(b?.relations)}})}
