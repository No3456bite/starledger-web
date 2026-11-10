// Original pure CSV validation and merge rules, upstream 04f9f0b.
import {COLS,csv as csvWrite,extras} from './ledger.js';
const isDeletion=r=>extras(r)._starDeleted===true;
function csvParse(s,legacyBook='日常账本'){s=String(s).replace(/^\uFEFF/,'');let out=[],row=[],field='',quoted=false;for(let i=0;i<s.length;i++){let c=s[i];if(quoted){if(c==='"'&&s[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));out.push(row);row=[];field=''}else field+=c}if(quoted)throw Error('CSV 引号未闭合');if(field||row.length){row.push(field.replace(/\r$/,''));out.push(row)}let index=out.findIndex(r=>COLS.every(k=>r.includes(k))),legacy=false;if(index<0){index=out.findIndex(r=>['类型','日期','大类','小类','金额','账户','账户2'].every(k=>r.includes(k)));legacy=true}if(index<0)throw Error('CSV 格式不匹配：请选择账本 CSV 或小星的原始导入模板');let head=out[index].map(x=>x.replace(/^\uFEFF/,''));return out.slice(index+1).filter(r=>r.some(Boolean)).map((r,i)=>{let source=Object.fromEntries(head.map((k,j)=>[k,r[j]||'']));if(!legacy)return Object.fromEntries(COLS.map(k=>[k,source[k]||'']));let fields={'类型':'type','日期':'date','大类':'category','小类':'subcategory','金额':'amount','账户':'account','账户2':'account2','报销':'reimbursement','备注':'note','图片':'image','角色':'role','标签':'tags','币种':'currency','商家':'merchant'};let obj=Object.fromEntries(COLS.map(k=>[k,'']));for(let [a,b] of Object.entries(fields))obj[b]=source[a]||'';obj.type=obj.type==='支出或应付款'?'支出':obj.type==='收入或应收款'?'收入':obj.type;obj.date=obj.date.replace(/\//g,'-');obj.book=legacyBook||'日常账本';obj.currency=obj.currency||'人民币';obj.id='LEG-'+digest(JSON.stringify([obj.book,r]))+'-'+i;return obj})}
function validateImportCsv(data,label='CSV'){
 let seen=new Set(),problems=[];
 for(let [i,r] of data.entries()){
  let line=i+2,id=String(r.id||'').trim(),date=String(r.date||'').trim(),value=String(r.amount||'').trim();
  if(!id)problems.push(`第 ${line} 行缺少 ID`);
  else if(seen.has(id))problems.push(`第 ${line} 行重复 ID：${id}`);
  seen.add(id);
  let m=date.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/),parsed=Date.parse(date.replace(' ','T'));
  if(!Number.isFinite(parsed)||m&&new Date(Date.UTC(+m[1],+m[2]-1,+m[3])).toISOString().slice(0,10)!==`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`)problems.push(`第 ${line} 行日期无效`);
  if(!value||!Number.isFinite(Number(value)))problems.push(`第 ${line} 行金额无效`);
  if(!String(r.account||'').trim())problems.push(`第 ${line} 行缺少账户`);
 }
 if(problems.length)throw Error(`${label} 有 ${problems.length} 项数据问题：${problems.slice(0,5).join('；')}${problems.length>5?'；请先修正后重新导入':''}`);
}

function duplicateIdGroups(data){
 let byId=new Map();
 for(let [index,row] of data.entries()){let id=String(row.id||'').trim();if(id){let indexes=byId.get(id)||[];indexes.push(index);byId.set(id,indexes)}}
 return [...byId].filter(([,indexes])=>indexes.length>1).map(([id,indexes])=>{
  let stamp=index=>{let raw=data[index].updated_at||data[index].created_at||'',time=Date.parse(raw);return Number.isFinite(time)?time:0};
  let anchorIndex=indexes.reduce((best,index)=>stamp(index)>stamp(best)?index:best,indexes[0]);
  return {id,anchorIndex,allIndexes:indexes,extraIndexes:indexes.filter(index=>index!==anchorIndex)}
 });
}
function resolveDuplicateIds(data,decisions,createId){
 let groups=duplicateIdGroups(data),used=new Set(data.map(row=>String(row.id||'').trim())),remove=new Set(),replace=new Map();
 for(let group of groups)for(let index of group.extraIndexes){
  let choice=decisions[index];
  if(choice==='delete')remove.add(index);
  else if(choice==='keep'){let id=String(createId()).trim();if(!id||used.has(id))throw Error('新账单 ID 必须唯一');used.add(id);replace.set(index,id)}
  else throw Error('请逐条选择删除或保留重复账单');
 }
 return {rows:data.flatMap((row,index)=>remove.has(index)?[]:[replace.has(index)?{...row,id:replace.get(index)}:row]),deleted:remove.size,reassigned:replace.size};
}

function digest(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function sourceStamp(r){let raw=String(r?.updated_at||r?.created_at||'').trim(),t=raw?Date.parse(raw):NaN;return Number.isFinite(t)?t:0}
function mergeSourceRows(baseRows,mobileRows,desktopRows){
 let map=new Map(),sources=[baseRows,mobileRows,desktopRows];
 for(let rank=0;rank<sources.length;rank++)for(let r of sources[rank]||[]){
  if(!r?.id)continue;
  let stamp=sourceStamp(r),prev=map.get(r.id);
  if(!prev||stamp>prev.stamp||(stamp===prev.stamp&&rank>=prev.rank))map.set(r.id,{r,stamp,rank});
 }
 return [...map.values()].map(x=>x.r).filter(r=>!isDeletion(r)).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))||String(b.id||'').localeCompare(String(a.id||'')));
}
function clearDeletionFlag(r){
 let x={...r};
 try{let e=JSON.parse(x.extras||'{}');if(e&&typeof e==='object'&&!Array.isArray(e)){delete e._starDeleted;x.extras=Object.keys(e).length?JSON.stringify(e):''}}catch(e){}
 return x
}
function deletionRecord(r,now){
 let x={...r},e={};try{let v=JSON.parse(x.extras||'{}');if(v&&typeof v==='object'&&!Array.isArray(v))e=v}catch(err){}
 e._starDeleted=true;x.extras=JSON.stringify(e);x.updated_at=now;return x
}

export {csvParse,csvWrite,validateImportCsv,duplicateIdGroups,resolveDuplicateIds,mergeSourceRows,deletionRecord,sourceStamp};
