// StarLedger browser recognizer v1.0.0-rc13
// Derived from the archived deterministic Scriptable recognizer.
// Pure local parser: no network access, no ledger writes.
(function(global){
'use strict';
// StarLedgerRecognizer v1.0.0-rc13
// Local deterministic OCR-text parser for common Chinese payment screenshots.
// Input: OCR text string. Output: structured suggestion only; never writes ledger data.
const META={project:'StarLedgerRecognizer',version:'1.0.0-rc13',schema:3};

const VERSION='1.0.0-rc13';
const MAX_TEXT=32000;
const MONEY_RE=/([+\-−]?)\s*(?:(¥|￥|RMB|CNY)\s*)?(\d{1,9}(?:,\d{3})*(?:\.\d{1,2})?)/gi;
const MONEY_HINT=/金额|实付|实收|支付|付款|收款|到账|合计|总计|共计|原价|原金额|商品金额|订单金额|应付|优惠|红包抵扣|红包优惠|红包金额|立减|折扣|抵扣|减免|券|手续费|服务费|配送费|运费|退款|退回/i;
const IGNORE_NUMBER_HINT=/余额|剩余|积分|额度|订单号|订单编号|交易单号|商户单号|流水号|凭证号|手机号|卡号|尾号|会员号/i;

function clamp01(n){return Math.max(0,Math.min(1,Number(n)||0))}
function round2(n){let x=Math.round((Number(n)+Math.sign(Number(n)||1)*Number.EPSILON)*100)/100;return Object.is(x,-0)?0:x}
function cleanText(source){return String(source||'').slice(0,MAX_TEXT).replace(/\u00a0/g,' ').replace(/[｜]/g,'|').replace(/[：]/g,':')}
function linesOf(source){return cleanText(source).split(/[\r\n]+/).map(x=>x.replace(/\s+/g,' ').trim()).filter(Boolean)}
function compact(s){return String(s||'').toLowerCase().replace(/[\s:_：·•|｜()（）\[\]【】]/g,'')}
function field(value,confidence,source,evidence=[]){return {value:value??'',confidence:clamp01(confidence),source:source||'',evidence:[...evidence]}}
function uniquePush(list,value){if(value&&!list.includes(value))list.push(value)}
function lineNeighborhood(lines,i,radius=1){return lines.slice(Math.max(0,i-radius),Math.min(lines.length,i+radius+1)).join(' ')}
function normalizeMoney(v){let n=Number(String(v||'').replace(/,/g,'').replace('−','-'));return Number.isFinite(n)?n:null}
function moneyClose(a,b,tol=.011){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tol}
function labelValue(line,re){let m=String(line||'').match(re);return m?String(m[1]||'').trim():''}
function nextValue(lines,i){for(let j=i+1;j<Math.min(lines.length,i+3);j++){let v=lines[j].trim();if(v&&!/^(?:详情|更多|完成|返回)$/.test(v))return v}return ''}

function detectPlatform(text,lines,evidence){
 const defs=[
  {value:'微信',keys:[['微信支付账单',9],['微信支付',7],['微信转账',8],['已存入零钱通',8],['已存入零钱',7],['交易单号',4.5],['商户单号',2.5],['零钱通',2.5],['微信零钱',2.5],['零钱',1.4],['微信',1.2]]},
  {value:'支付宝',keys:[['支付宝交易号',8],['支付宝',7],['订单号',4],['花呗',2.5],['余额宝',2.5],['蚂蚁',1.5],['账单详情',1]]},
  {value:'云闪付',keys:[['云闪付',9],['中国银联',7],['订单编号',5],['银联',3],['交易卡',2.5],['付款卡',2.5],['银联云闪付',8]]}
 ];
 let scores={};
 for(let d of defs){let score=0,hits=[];for(let [k,w] of d.keys)if(text.includes(k)){score+=w;hits.push(k)}scores[d.value]={score,hits}}
 let ranked=Object.entries(scores).sort((a,b)=>b[1].score-a[1].score),top=ranked[0],second=ranked[1];
 if(!top||top[1].score<3)return field('',.15,'platform-keywords');
 let gap=top[1].score-(second?.[1]?.score||0),confidence=clamp01(.35+Math.min(top[1].score,12)*.045+Math.min(gap,8)*.025);
 evidence.push('平台特征：'+top[0]+' ← '+top[1].hits.join('、'));
 return {...field(top[0],confidence,'platform-keywords',top[1].hits),scores:Object.fromEntries(Object.entries(scores).map(([k,v])=>[k,round2(v.score)]))}
}

function detectType(text,evidence){
 const income=[
  ['收款成功',8],['已收款',7],['收款金额',6],['到账金额',6],['已到账',5],['收钱到账',5],['收入',2.5],
  ['退款成功',6],['退款金额',5],['已退款',4],
  // WeChat received-red-packet pages use these phrases instead of “收款成功”.
  ['已存入零钱',9],['收款时间',7],['微信红包',2.8],['来自',1.2]
 ];
 const expense=[['付款成功',8],['支付成功',8],['已付款',6],['已支付',6],['付款金额',6],['支付金额',6],['支出',2.5],['扣款成功',6]];
 let inc=0,exp=0,ih=[],eh=[];
 for(let [k,w] of income)if(text.includes(k)){inc+=w;ih.push(k)}
 for(let [k,w] of expense)if(text.includes(k)){exp+=w;eh.push(k)}
 // A prominent standalone signed amount is meaningful on WeChat detail pages:
 // +52.00 normally means money received; −78.70 means money paid.
 if(/(?:^|\n)\s*\+\s*(?:[¥￥]\s*)?\d{1,9}(?:,\d{3})*(?:\.\d{1,2})?\s*(?:$|\n)/m.test(text)){inc+=6;ih.push('显式正号金额')}
 if(/(?:^|\n)\s*[−-]\s*(?:[¥￥]\s*)?\d{1,9}(?:,\d{3})*(?:\.\d{1,2})?\s*(?:$|\n)/m.test(text)){exp+=4.5;eh.push('显式负号金额')}
 let value=inc>exp?'收入':'支出',top=Math.max(inc,exp),gap=Math.abs(inc-exp);
 let confidence=top?clamp01(.52+top/24+gap/25):.46;
 if(inc&&exp)confidence=Math.max(.45,confidence-.12);
 if(top)evidence.push('收支判断：'+value+' ← '+(value==='收入'?ih:eh).join('、'));
 return {...field(value,confidence,'transaction-keywords',value==='收入'?ih:eh),scores:{收入:round2(inc),支出:round2(exp)}}
}

function moneyRole(context){
 const rules=[
  ['refund',/(?:退款金额|退款成功|已退款|退回金额|退款)/,115],
  ['final',/(?:实付金额|实际支付|实付|支付金额|付款金额|交易金额|本次付款|实际付款|实际收款|实收金额|收款金额|到账金额|实际到账)/,112],
  ['discount',/(?:优惠金额|优惠|红包抵扣|红包优惠|红包金额|立减|折扣|抵扣|减免|优惠券|券抵扣)/,101],
  ['fee',/(?:手续费|服务费|配送费|运费|附加费|技术服务费)/,96],
  ['original',/(?:原金额|原价|商品金额|订单金额|应付金额|应付|小计|原订单金额|原始金额)/,91],
  ['final',/(?:合计|总计|共计|应收金额)/,80],
  ['final',/(?:^|[\s:：])金额(?:[\s:：]|$)/,68]
 ];
 for(let r of rules)if(r[1].test(context))return {role:r[0],score:r[2],keyword:(context.match(r[1])||[])[0]||''};
 if(/余额|剩余|积分|额度/.test(context))return {role:'ignored',score:-100,keyword:'余额/积分/额度'};
 return {role:'unknown',score:0,keyword:''}
}
function matchInsideDate(line,index,length){
 let spans=[];for(let re of [/(?:20\d{2})[年\/.\-]\d{1,2}[月\/.\-]\d{1,2}日?/g,/\b\d{1,2}:\d{2}(?::\d{2})?\b/g])for(let m of line.matchAll(re))spans.push([m.index,m.index+m[0].length]);
 return spans.some(([a,b])=>index<b&&index+length>a)
}
function amountCandidates(lines){
 let out=[],seen=new Set();
 for(let i=0;i<lines.length;i++){
  let line=lines[i],ctx=lineNeighborhood(lines,i,1),prevCtx=(lines[i-1]||'')+' '+line,nextCtx=line+' '+(lines[i+1]||''),directRole=moneyRole(line),prevRole=moneyRole(prevCtx),nextRole=moneyRole(nextCtx),role=directRole.role!=='unknown'?directRole:prevRole.role!=='unknown'?prevRole:nextRole,hasHint=MONEY_HINT.test(line)||MONEY_HINT.test(prevCtx)||MONEY_HINT.test(nextCtx),ignoreHint=IGNORE_NUMBER_HINT.test(line)&&!MONEY_HINT.test(line);
  MONEY_RE.lastIndex=0;let m;
  while((m=MONEY_RE.exec(line))){
   let before=line[m.index-1]||'',after=line[m.index+m[0].length]||'';
   if(/\d/.test(before)||/\d/.test(after))continue;
   if(matchInsideDate(line,m.index,m[0].length))continue;
   let sign=m[1]==='-'||m[1]==='−'?-1:1,n=normalizeMoney(m[3]);if(n===null||n>1e8)continue;n*=sign;
   let hasCurrency=!!m[2],hasDecimal=/\./.test(m[3]);
   if(!hasCurrency&&!hasDecimal&&!hasHint)continue;
   if(ignoreHint&&!hasCurrency)continue;
   // Long integer IDs are not money unless explicitly labelled as an amount.
   if(!hasHint&&!hasCurrency&&!hasDecimal&&String(m[3]).replace(/,/g,'').length>=6)continue;
   let explicitSigned=/^[+−-]\s*(?:(?:¥|￥|RMB|CNY)\s*)?\d{1,9}(?:,\d{3})*(?:\.\d{1,2})?$/i.test(line.trim());
   // On WeChat detail pages the large signed amount itself is the final amount.
   // Do this before neighbourhood keywords such as “微信红包” can misclassify it as a discount.
   if(explicitSigned&&hasDecimal){role={role:'final',score:108,keyword:sign<0?'显式负号金额':'显式正号金额'}}
   let score=role.score;
   if(hasCurrency)score+=18;if(hasDecimal)score+=7;
   let early=i<Math.max(10,Math.ceil(lines.length*.36));
   if(early)score+=8;
   if(explicitSigned&&early)score+=18;
   // Legacy fallback for non-isolated negative amounts.
   if(sign<0&&hasDecimal&&early&&!explicitSigned)score+=24;
   if(line.length<=18)score+=4;
   if(role.role==='unknown'&&IGNORE_NUMBER_HINT.test(ctx))score-=35;
   let key=i+'|'+n+'|'+role.role;if(seen.has(key))continue;seen.add(key);
   out.push({value:Math.abs(n),signedValue:n,role:role.role,score,line:i,text:line,context:ctx,currency:hasCurrency?'CNY':'',keyword:role.keyword,raw:m[0]});
  }
 }
 return out.sort((a,b)=>b.score-a.score||a.line-b.line)
}
function bestRole(candidates,role){return candidates.filter(x=>x.role===role).sort((a,b)=>b.score-a.score||a.line-b.line)[0]||null}
function detectAmounts(lines,evidence,warnings){
 let candidates=amountCandidates(lines),best={final:bestRole(candidates,'final'),original:bestRole(candidates,'original'),discount:bestRole(candidates,'discount'),fee:bestRole(candidates,'fee'),refund:bestRole(candidates,'refund')};
 let final=best.final,mathValidated=false;
 // If no explicit final exists, a prominent standalone currency amount is usually the displayed payment amount.
 if(!final){
  let standalone=candidates.find(x=>x.role==='unknown'&&(x.score>=22||(x.signedValue<0&&x.score>=18)));
  if(!standalone){let bare=candidates.filter(x=>x.role==='unknown'&&x.score>=15);if(bare.length===1)standalone=bare[0]}
  if(standalone){final={...standalone,role:'final',score:standalone.score+18,inferredRole:true};evidence.push('主金额候选：显著金额 '+standalone.raw+' → '+standalone.value)}
 }
 // Arithmetic validation: original - discount + fee = final.
 if(final&&best.original){let discount=best.discount?.value||0,fee=best.fee?.value||0,expected=round2(best.original.value-discount+fee);if(moneyClose(expected,final.value)){
  mathValidated=true;final.score+=25;best.original.score+=15;if(best.discount)best.discount.score+=15;if(best.fee)best.fee.score+=15;
  evidence.push('金额校验：'+best.original.value+(discount?' - '+discount:'')+(fee?' + '+fee:'')+' = '+final.value);
 }}
 // Safe inference only when original plus at least one adjustment exists.
 if(!final&&best.original&&(best.discount||best.fee)){
  let inferred=round2(best.original.value-(best.discount?.value||0)+(best.fee?.value||0));
  if(inferred>=0){final={value:inferred,role:'final',score:62,line:-1,text:'',context:'',keyword:'数学推算',inferred:true};warnings.push('最终金额由原金额与优惠/费用推算，请人工核对');evidence.push('推算最终金额：'+inferred)}
 }
 if(!final&&best.refund){final={...best.refund,role:'final',score:best.refund.score-4};evidence.push('主金额采用退款金额：'+best.refund.value)}
 let topUnknown=candidates.filter(x=>x.role==='unknown').slice(0,3);
 if(final){let rivals=candidates.filter(x=>x!==final&&x.value!==final.value&&x.score>=final.score-10&&['final','unknown'].includes(x.role));if(rivals.length)warnings.push('检测到多个接近的主金额候选，请核对金额')}
 let confidence=final?clamp01(.46+Math.max(0,final.score)/190+(mathValidated?.17:0)-(final.inferred?.12:0)):0;
 if(final)evidence.push('主金额：'+final.value+(final.keyword?' ← '+final.keyword:''));
 let simple=x=>x?x.value:null;
 return {
  amount:field(final?round2(final.value):'',confidence,final?.inferred?'arithmetic-inference':'amount-ranking',final?[final.text].filter(Boolean):[]),
  amounts:{final:simple(final),original:simple(best.original),discount:simple(best.discount),fee:simple(best.fee),refund:simple(best.refund),mathValidated,candidates:candidates.slice(0,16).map(x=>({value:round2(x.value),role:x.role,score:round2(x.score),line:x.line,text:x.text,keyword:x.keyword||''}))},
  topUnknown
 }
}

function detectDate(lines,context,evidence){
 let nowRaw=String(context?.now||''),now=new Date(nowRaw.replace(' ','T'));if(!Number.isFinite(now.getTime()))now=new Date();
 let candidates=[];
 const patterns=[
  /(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})日?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/,
  /(20\d{2})[年\/.\-](\d{1,2})[月\/.\-](\d{1,2})日?/
 ];
 for(let i=0;i<lines.length;i++){
  let line=lines[i],ctx=lineNeighborhood(lines,i,1),labelScore=/(支付时间|付款时间|交易时间|创建时间|收款时间|到账时间|退款时间|时间|日期)/.test(ctx)?30:0;
  let m=line.match(patterns[0]);if(m){candidates.push({value:`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')} ${m[4].padStart(2,'0')}:${m[5]}:${(m[6]||'00').padStart(2,'0')}`,score:80+labelScore,line:i,text:line});continue}
  m=line.match(patterns[1]);if(m){candidates.push({value:`${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')} 00:00:00`,score:48+labelScore,line:i,text:line});continue}
  m=line.match(/(?:^|\s)(\d{1,2})[月\/.\-](\d{1,2})日?\s*(\d{1,2}):(\d{2})(?::(\d{2}))?/);if(m){let y=now.getFullYear();candidates.push({value:`${y}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')} ${m[3].padStart(2,'0')}:${m[4]}:${(m[5]||'00').padStart(2,'0')}`,score:55+labelScore,line:i,text:line})}
 }
 candidates.sort((a,b)=>b.score-a.score||a.line-b.line);let best=candidates[0];
 if(best){evidence.push('交易时间：'+best.value);return field(best.value,clamp01(.56+best.score/170),'ocr-date',[best.text])}
 let fallback=nowRaw||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`;
 return field(fallback,.2,'fallback-now')
}

function cleanMerchant(v){
 let s=String(v||'').replace(/^[：:\-—\s]+/,'').replace(/[>›]+$/,'').trim();
 if(!s||s.length>70||/^[-+¥￥\d.,\s]+$/.test(s))return '';
 // OCR often returns the next *label* from a two-column detail page as if it
 // were the value. Never accept known UI/field labels as merchant names.
 if(/^(?:微信支付|支付宝|云闪付|中国银联|账单|账单详情|交易详情|支付成功|付款成功|收款成功|当前状态|支付时间|交易时间|商品|商品说明|商户全称|商户名称|商家名称|收单机构|支付方式|付款方式|交易单号|商户单号|订单号|账单服务|联系商家|商家电话)$/.test(s))return '';
 return s.slice(0,60)
}
function merchantHistory(context){
 return (context?.merchants||context?.options?.merchants||[]).map(x=>typeof x==='string'?{name:x,count:0}:x).filter(x=>x&&x.name);
}
function merchantCompact(v){
 return compact(v).replace(/(?:有限责任公司|股份有限公司|有限公司|信息技术|网络科技|科技发展|电子商务|商贸|商业管理|支付科技|支付技术|公司)$/g,'');
}
function matchHistoricalMerchant(text,candidates,context){
 let history=merchantHistory(context),ct=compact(text),best=null;
 for(let item of history){
  let name=String(item.name||'').trim();if(name.length<2)continue;
  let hn=compact(name),core=merchantCompact(name),score=0,why='';
  if(hn&&ct.includes(hn)){score=112+Math.min(hn.length,12);why='OCR全文包含历史商家'}
  for(let c of candidates){
   let cv=compact(c.value),cc=merchantCompact(c.value);
   if(!cv)continue;
   if(cv===hn){score=Math.max(score,130);why='识别商家与历史商家完全一致'}
   else if(cv.includes(hn)||hn.includes(cv)){score=Math.max(score,122);why='识别商家与历史商家包含匹配'}
   else if(core&&cc&&(cc.includes(core)||core.includes(cc))){score=Math.max(score,116);why='商家主体名称匹配'}
  }
  score+=Math.min(Number(item.count)||0,20)*.25;
  if(!best||score>best.score)best={name,score,why,count:Number(item.count)||0}
 }
 return best&&best.score>=112?best:null
}
function detectMerchant(lines,platform,evidence,context={}){
 const defs=[
  {re:/^(?:商户全称|商户名称|商家名称|收款方|交易对象|交易对方)\s*[:：]?\s*(.*)$/i,score:.96},
  {re:/^(?:商家|对方)\s*[:：]?\s*(.*)$/i,score:.9},
  {re:/^(?:商品说明|商品)\s*[:：]?\s*(.*)$/i,score:.72}
 ];
 let candidates=[];
 for(let i=0;i<lines.length;i++)for(let d of defs){
  let m=lines[i].match(d.re);if(!m)continue;
  let direct=cleanMerchant(m[1]);
  if(direct)candidates.push({value:direct,confidence:d.score,line:i,text:lines[i]});
  // Only use the following OCR line when it isn't another field label.
  if(!direct){let next=cleanMerchant(nextValue(lines,i));if(next)candidates.push({value:next,confidence:d.score-.08,line:i,text:lines[i]+' → '+next})}
 }
 for(let i=0;i<lines.length;i++){
  let m=lines[i].match(/(?:向|给)\s*([^\s]{2,30})\s*(?:付款|支付|转账)/);
  if(m){let value=cleanMerchant(m[1]);if(value)candidates.push({value,confidence:.78,line:i,text:lines[i]})}
 }
 candidates.sort((a,b)=>b.confidence-a.confidence||a.line-b.line);

 // Prefer the user's own historical merchant vocabulary. This is deliberately
 // done against the whole OCR text because iOS OCR may flatten two-column rows
 // in an order that makes label/value adjacency unreliable.
 let historical=matchHistoricalMerchant(lines.join('\n'),candidates,context);
 if(historical){
  evidence.push('历史商家匹配：'+historical.name+' ← '+historical.why);
  return {...field(historical.name,.99,'merchant-history',[historical.why]),matchedHistory:true}
 }

 let best=candidates[0];
 if(best)evidence.push('商家/对方：'+best.value);
 return best?{...field(best.value,best.confidence,'merchant-label',[best.text]),matchedHistory:false}:{...field('',0,'merchant-label'),matchedHistory:false}
}


const ACCOUNT_ALIAS_GROUPS=[
 ['微信钱包','微信零钱','零钱'],
 ['零钱通','微信零钱通']
];
function dynamicAliasGroups(accountAliases){
 let groups=ACCOUNT_ALIAS_GROUPS.map(g=>g.slice()),map=accountAliases&&typeof accountAliases==='object'?accountAliases:{};
 for(let [name,aliases] of Object.entries(map)){
  let group=[name,...(Array.isArray(aliases)?aliases:[])].map(v=>String(v||'').trim()).filter(Boolean);
  if(group.length>1)groups.push([...new Set(group)])
 }
 return groups
}
function accountAliasTokens(value,accountAliases){
 let raw=String(value||'').trim(),c=compact(raw),result=[raw];
 for(let group of dynamicAliasGroups(accountAliases)){
  let compacted=group.map(compact);
  if(compacted.some(x=>x&&c&&(x===c||x.includes(c)||c.includes(x))))result.push(...group)
 }
 return [...new Set(result.filter(Boolean))]
}
function accountEquivalent(a,b,accountAliases){
 let aa=accountAliasTokens(a,accountAliases).map(compact),bb=new Set(accountAliasTokens(b,accountAliases).map(compact));
 return aa.some(x=>x&&bb.has(x))
}
const BANK_ALIASES=[
 ['工商银行',['工商银行','中国工商银行','工行']],['建设银行',['建设银行','中国建设银行','建行']],['招商银行',['招商银行','招行']],['农业银行',['农业银行','中国农业银行','农行']],['中国银行',['中国银行','中行']],['交通银行',['交通银行','交行']],['邮储银行',['邮储银行','中国邮政储蓄银行','邮政储蓄']],['平安银行',['平安银行']],['浦发银行',['浦发银行','上海浦东发展银行']],['兴业银行',['兴业银行']],['民生银行',['民生银行']],['中信银行',['中信银行']],['光大银行',['光大银行','中国光大银行']],['广发银行',['广发银行','广东发展银行']],['华夏银行',['华夏银行']]
];
function normalizeAccountMethodValue(value){
 let v=String(value||'').trim().replace(/^[\s:：\-—–·|｜]+|[\s:：\-—–·|｜]+$/g,'');
 if(!v)return '';
 if(/已存入零钱通|存入零钱通|转入零钱通/.test(v))return '零钱通';
 if(/已存入(?:微信)?零钱|存入(?:微信)?零钱|转入(?:微信)?零钱/.test(v))return '零钱';
 if(/微信零钱通/.test(v))return '零钱通';
 if(/微信零钱/.test(v))return '零钱';
 return v
}
function paymentMethodText(lines){
 const methodRe=/^(?:支付方式|付款方式|收款方式|支付账户|付款账户|扣款账户|交易卡|付款卡|银行卡|退款方式|退款到账方式|退款到账账户|退款账户|退回方式|退款至|到账方式|入账方式|收款账户|转入账户)\s*[\s:：\-—–·|｜]*\s*(.*)$/i,
       statusRe=/^(?:当前状态|状态)\s*[\s:：\-—–·|｜]*\s*(.*)$/i,
       fieldLabel=/^(?:当前状态|状态|支付时间|交易时间|收款时间|退款时间|商品|商品说明|商户全称|商户名称|商家名称|收单机构|支付方式|付款方式|退款方式|退款到账方式|退款到账账户|退款账户|退回方式|退款至|到账方式|入账方式|收款账户|转入账户|交易单号|商户单号|订单号|账单服务|联系商家|商家电话)$/;
 for(let i=0;i<lines.length;i++){
  let line=String(lines[i]||'').trim(),m=line.match(methodRe);
  if(m){
   let direct=normalizeAccountMethodValue(m[1]);
   if(direct&&!fieldLabel.test(direct))return {value:direct,line:i,text:line,source:'method-field'};
   let next=normalizeAccountMethodValue(nextValue(lines,i));
   if(next&&!fieldLabel.test(next))return {value:next,line:i,text:line+' → '+next,source:'method-next-line'}
  }
  let sm=line.match(statusRe);
  if(sm){
   let direct=normalizeAccountMethodValue(sm[1]),next='';
   if(!direct||fieldLabel.test(direct))next=normalizeAccountMethodValue(nextValue(lines,i));
   let value=direct&&!fieldLabel.test(direct)?direct:next;
   if(/^(?:零钱|零钱通)$/.test(value))return {value,line:i,text:line+(next?' → '+next:''),source:'status-destination'}
  }
  // OCR sometimes drops the label completely but preserves the destination phrase.
  if(/已存入零钱通/.test(line))return {value:'零钱通',line:i,text:line,source:'status-phrase'};
  if(/已存入(?:微信)?零钱/.test(line))return {value:'零钱',line:i,text:line,source:'status-phrase'}
 }
 return {value:'',line:-1,text:'',source:''}
}
function accountHints(text,lines,platform){
 let method=paymentMethodText(lines);
 if(!method.value){
  if(/已存入零钱通|退款(?:方式|到账方式|账户|至)[\s:：\-—–·|｜]*零钱通|零钱通/.test(text))method={value:'零钱通',line:-1,text:'OCR全文：零钱通',source:'full-text'};
  else if(/已存入(?:微信)?零钱|退款(?:方式|到账方式|账户|至)[\s:：\-—–·|｜]*(?:微信)?零钱|(?:微信零钱|零钱)(?!通)/.test(text))method={value:'零钱',line:-1,text:'OCR全文：零钱',source:'full-text'};
  else if(/余额宝/.test(text))method={value:'余额宝',line:-1,text:'OCR全文：余额宝',source:'full-text'};
  else if(/花呗/.test(text))method={value:'花呗',line:-1,text:'OCR全文：花呗',source:'full-text'};
  else if(/数字人民币/.test(text))method={value:'数字人民币',line:-1,text:'OCR全文：数字人民币',source:'full-text'};
 }
 let pool=(method.value+' '+text),hints=[];
 if(method.value==='零钱通')hints.push({name:'零钱通',literal:'零钱通',tokens:['零钱通','微信零钱通'],confidence:.995,source:'explicit-settlement'});
 else if(method.value==='零钱')hints.push({name:'微信钱包',literal:'零钱',tokens:['零钱','微信零钱','微信钱包'],confidence:.995,source:'explicit-settlement'});
 else{
  if(/零钱通/.test(pool))hints.push({name:'零钱通',literal:method.value||'零钱通',tokens:['零钱通','微信零钱通'],confidence:.98,source:'explicit-method'});
  if(/(?:微信零钱|零钱)(?!通)/.test(pool))hints.push({name:'微信钱包',literal:method.value||'零钱',tokens:['微信钱包','微信零钱','零钱'],confidence:.95,source:'explicit-method'});
 }
 if(/余额宝/.test(pool))hints.push({name:'余额宝',literal:method.value||'余额宝',tokens:['余额宝'],confidence:.98,source:'explicit-method'});
 if(/花呗/.test(pool))hints.push({name:'花呗',literal:method.value||'花呗',tokens:['花呗'],confidence:.98,source:'explicit-method'});
 if(/数字人民币/.test(pool))hints.push({name:'数字人民币',literal:method.value||'数字人民币',tokens:['数字人民币'],confidence:.98,source:'explicit-method'});
 for(let [bank,aliases] of BANK_ALIASES)if(aliases.some(x=>pool.includes(x))){
  let card=/信用卡/.test(pool)?'信用卡':/储蓄卡|借记卡/.test(pool)?'储蓄卡':'';
  hints.push({name:bank+(card?card:''),literal:method.value||'',tokens:[bank,...aliases,card].filter(Boolean),confidence:.94,source:'explicit-bank'})
 }
 if(!hints.length&&platform==='微信')hints.push({name:'微信钱包',literal:'',tokens:['微信钱包','微信'],confidence:.74,source:'platform-default'});
 if(!hints.length&&platform==='支付宝')hints.push({name:'支付宝',literal:'',tokens:['支付宝'],confidence:.68,source:'platform-default'});
 if(!hints.length&&platform==='云闪付')hints.push({name:'云闪付',literal:'',tokens:['云闪付','银联'],confidence:.66,source:'platform-default'});
 return {hints,method}
}
function matchAccount(accounts,hints,accountAliases){
 let list=(Array.isArray(accounts)?accounts:[]).map(x=>typeof x==='string'?x:x?.name).filter(Boolean),ranked=[];
 for(let account of list){
  let bestForAccount=null,accountCompact=compact(account),accountTokens=accountAliasTokens(account,accountAliases).map(compact).filter(Boolean);
  for(let h of hints){
   let score=0,matchKind='',literal=compact(h.literal||''),canonical=compact(h.name||'');
   if(literal&&accountCompact===literal){score=180;matchKind='exact-payment-method'}
   else if(literal&&accountEquivalent(account,h.literal,accountAliases)){score=150;matchKind='payment-method-alias'}
   else if(canonical&&accountCompact===canonical){score=138;matchKind='exact-rule-name'}
   for(let token of h.tokens||[]){
    let hintTokens=accountAliasTokens(token,accountAliases).map(compact).filter(Boolean);
    for(let ca of accountTokens)for(let ct of hintTokens){
     if(ca===ct&&score<126){score=126;matchKind='alias-exact'}
     else if((ca.includes(ct)||ct.includes(ca))&&score<86){score=86;matchKind='contains'}
    }
   }
   if(/信用卡/.test(h.name)&&/信用卡/.test(account))score+=12;
   if(/储蓄卡/.test(h.name)&&/储蓄卡|借记卡/.test(account))score+=12;
   if(h.source==='platform-default')score-=18;
   let item={account,hint:h,score,matchKind,matchedAlias:/alias/.test(matchKind)};
   if(!bestForAccount||item.score>bestForAccount.score)bestForAccount=item
  }
  if(bestForAccount)ranked.push(bestForAccount)
 }
 ranked.sort((a,b)=>b.score-a.score||a.account.localeCompare(b.account,'zh-CN'));
 let best=ranked[0];
 return best&&best.score>=76?{...best,candidates:ranked.slice(0,8).map(x=>({account:x.account,score:x.score,matchKind:x.matchKind,source:x.hint.source,literal:x.hint.literal||'',rule:x.hint.name||''}))}:null
}
function detectAccount(text,lines,platform,context,evidence){
 let {hints,method}=accountHints(text,lines,platform),matched=matchAccount(context?.accounts,hints,context?.accountAliases),bestHint=hints[0];
 if(matched){
  let confidence=clamp01(matched.hint.confidence*(matched.score>=150?1:matched.score>=120?.96:.9));
  evidence.push('账户匹配：'+matched.account+(method.value?' ← '+method.value:'')+'（'+matched.matchKind+'）');
  return {...field(matched.account,confidence,matched.hint.source,[method.text].filter(Boolean)),matched:true,suggested:matched.hint.name,paymentMethod:method.value,methodSource:method.source||'',aliasMatched:!!matched.matchedAlias,matchKind:matched.matchKind,candidates:matched.candidates}
 }
 if(bestHint){evidence.push('账户建议：'+bestHint.name+(method.value?' ← '+method.value:''));return {...field(bestHint.name,bestHint.confidence*.76,bestHint.source,[method.text].filter(Boolean)),matched:false,suggested:bestHint.name,paymentMethod:method.value,methodSource:method.source||'',candidates:[]}}
 return {...field('',0,'account-rules'),matched:false,suggested:'',paymentMethod:method.value,methodSource:method.source||'',candidates:[]}
}

function transferAccountMatch(raw,context){
 let value=normalizeAccountMethodValue(raw),accounts=Array.isArray(context?.accounts)?context.accounts:[];
 if(!value)return null;
 let exact=accounts.map(x=>typeof x==='string'?x:x?.name).filter(Boolean).find(a=>compact(a)===compact(value));
 if(exact)return {value:exact,matched:true,raw:value,matchKind:'exact-transfer-account'};
 let hint={name:value,literal:value,tokens:accountAliasTokens(value,context?.accountAliases),confidence:.995,source:'explicit-transfer'};
 let matched=matchAccount(accounts,[hint],context?.accountAliases);
 return matched?{value:matched.account,matched:true,raw:value,matchKind:matched.matchKind}:{value:'',matched:false,raw:value,matchKind:''}
}
function detectTransfer(text,lines,context,evidence){
 // WeChat commonly renders: “转入零钱通-来自零钱”. Treat the direction words as authoritative,
 // even when the same page also says “支付成功”. This is a ledger transfer, not consumption.
 let patterns=[
  /转入\s*([^\n\r\-—–]+?)\s*[\-—–]+\s*来自\s*([^\n\r]+)/i,
  /转入\s*([^\n\r]+?)\s+来自\s*([^\n\r]+)/i
 ];
 let m=null;for(let re of patterns){m=text.match(re);if(m)break}
 if(!m)return null;
 let destination=transferAccountMatch(m[1],context),source=transferAccountMatch(m[2],context);
 if(!destination?.matched&&!source?.matched)return null;
 let ev='明确转账：'+String(m[2]).trim()+' → '+String(m[1]).trim();evidence.push(ev);
 return {
  type:field('转账',.995,'explicit-transfer-phrase',[m[0]]),
  account:source?.matched?{...field(source.value,.995,'explicit-transfer-source',[m[0]]),matched:true,suggested:source.raw,matchKind:source.matchKind,candidates:[]}:null,
  account2:destination?.matched?{...field(destination.value,.995,'explicit-transfer-destination',[m[0]]),matched:true,suggested:destination.raw,matchKind:destination.matchKind,candidates:[]}:null,
  rawSource:String(m[2]).trim(),rawDestination:String(m[1]).trim()
 }
}

function historyRows(context){
 return Array.isArray(context?.history)?context.history:Array.isArray(context?.rows)?context.rows:[]
}
function validHistoryTerm(v){
 let s=compact(v);return s.length>=2&&!/^\d+$/.test(s)&&!/^20\d{2}(?:\d{2}){0,5}$/.test(s)&&!/^(?:微信|支付宝|云闪付|支付|付款|账单|订单|商家|商品|人民币|日常账本|消费时间|交易时间|支付时间)$/.test(s)?s:''
}
function historyVariants(value,kind='generic'){
 let raw=String(value||'').trim(),out=[];
 let push=v=>{v=validHistoryTerm(v);if(v&&v.length<=42&&!out.includes(v))out.push(v)};
 push(raw);
 for(let part of raw.split(/[\s,，;；|｜/\\:：()（）【】\[\]<>《》\-—_]+/))push(part);
 if(kind==='merchant'||kind==='note'){
  let stripped=merchantCompact(raw)
   .replace(/(?:会员商店|会员店|旗舰店|专营店|便利店|门店|商店|商品订单|商品|订单|消费|付款|收款|支付)$/g,'');
  push(stripped);
 }
 return out
}
function longestCommonRun(a,b){
 a=String(a||'');b=String(b||'');if(!a||!b)return 0;
 let prev=new Array(b.length+1).fill(0),best=0;
 for(let i=1;i<=a.length;i++){
  let cur=new Array(b.length+1).fill(0);
  for(let j=1;j<=b.length;j++)if(a[i-1]===b[j-1]){cur[j]=prev[j-1]+1;if(cur[j]>best)best=cur[j]}
  prev=cur
 }
 return best
}
function historyTermHit(term,ocr){
 if(!term)return {hit:false,score:0,kind:''};
 if(ocr.includes(term))return {hit:true,score:1,kind:'exact'};
 if(term.length>=4){
  let run=longestCommonRun(term,ocr),ratio=run/term.length;
  if(run>=4&&ratio>=.62)return {hit:true,score:.68,kind:'fuzzy-'+run}
 }
 return {hit:false,score:0,kind:''}
}
function categoryHistoryMatch(text,merchant,account,type,context,evidence){
 if(!['支出','收入'].includes(type))return null;
 let rows=historyRows(context);if(!rows.length)return null;
 let ocr=compact(text),merchantTerm=validHistoryTerm(merchant),accountTerm=validHistoryTerm(account),
     groups=new Map(),matched=0,totalScore=0,rowDebug=[];
 for(let row of rows){
  if(!row||String(row.type||'')!==type)continue;
  let category=String(row.category||'').trim(),subcategory=String(row.subcategory||'').trim();if(!category||!subcategory)continue;
  let score=0,reasons=[],semanticHits=0,independent=new Set();

  const fields=[
   ['merchant',row.merchant,9],
   ['note',row.note,5],
   ['account',row.account,3.5],
   ['tags',row.tags,2.5]
  ];
  for(let [kind,value,weight] of fields){
   let best=0,bestTerm='',bestKind='';
   for(let term of historyVariants(value,kind)){
    let hit=historyTermHit(term,ocr);
    if(hit.hit&&hit.score>best){best=hit.score;bestTerm=term;bestKind=hit.kind}
   }
   if(best){
    let gained=weight*best;score+=gained;independent.add(kind);
    if(kind==='merchant'||kind==='note'||kind==='tags')semanticHits++;
    reasons.push(kind+':'+bestTerm+'('+bestKind+')')
   }
  }

  // Parsed fields are secondary boosts, not the primary lookup direction.
  // Main direction: small historical fingerprints -> large OCR page.
  let rm=compact(row.merchant||''),rn=compact(row.note||'');
  if(merchantTerm&&((rm&&(rm===merchantTerm||rm.includes(merchantTerm)||merchantTerm.includes(rm)))||(rn&&rn.includes(merchantTerm)))){
   score+=5;semanticHits++;independent.add('parsedMerchant');reasons.push('parsedMerchant')
  }
  if(accountTerm&&accountEquivalent(row.account||'',account,context?.accountAliases)){
   score+=2.5;independent.add('parsedAccount');reasons.push('parsedAccount')
  }

  // Account-only matches are too common to infer a category.
  if(!semanticHits&&independent.size<2)continue;
  if(score<4.5)continue;

  matched++;totalScore+=score;
  let key=category+'\u0000'+subcategory,
      g=groups.get(key)||{category,subcategory,score:0,count:0,semanticHits:0,latest:'',rows:[]};
  g.score+=score;g.count++;g.semanticHits+=semanticHits;
  let d=String(row.date||'');if(d>g.latest)g.latest=d;
  if(g.rows.length<8)g.rows.push({date:d,merchant:row.merchant||'',note:row.note||'',account:row.account||'',score:round2(score),reasons});
  groups.set(key,g);
  if(rowDebug.length<40)rowDebug.push({category,subcategory,score:round2(score),reasons,date:d})
 }
 if(!groups.size)return null;
 let ranked=[...groups.values()].sort((a,b)=>b.score-a.score||b.count-a.count||String(b.latest).localeCompare(String(a.latest))),
     top=ranked[0],second=ranked[1],share=top.score/Math.max(totalScore,1),margin=top.score-(second?.score||0);
 let confidence=clamp01(.44+share*.32+Math.min(top.count,8)*.025+Math.min(margin,22)*.007+Math.min(top.semanticHits,6)*.012);
 if(top.count===1&&top.score<7)confidence=Math.min(confidence,.57);
 if(confidence<.58)return null;
 evidence.push('历史指纹分类：'+top.category+' / '+top.subcategory+'（匹配 '+matched+' 笔；该组合 '+top.count+' 笔）');
 return {
  category:field(top.category,confidence,'history-fingerprint',['历史字段→OCR全文']),
  subcategory:field(top.subcategory,confidence,'history-fingerprint',['历史字段→OCR全文']),
  debug:{
   direction:'history-small-to-ocr-large',
   matchedRows:matched,totalScore:round2(totalScore),topShare:round2(share),
   candidates:ranked.slice(0,8).map(x=>({category:x.category,subcategory:x.subcategory,score:round2(x.score),count:x.count,semanticHits:x.semanticHits,latest:x.latest,rows:x.rows})),
   matchedRowsDebug:rowDebug.slice(0,24)
  }
 }
}
function parseLedgerTime(v){
 let s=String(v||'').trim();if(!s)return NaN;
 let t=Date.parse(s.replace(' ','T'));return Number.isFinite(t)?t:NaN
}
function duplicateHistoryMatch(dateField,amount,merchant,account,type,context,evidence,warnings){
 if(!dateField||dateField.source!=='ocr-date'||!dateField.value)return null;
 let target=parseLedgerTime(dateField.value);if(!Number.isFinite(target))return null;
 let rows=historyRows(context),merchantTerm=validHistoryTerm(merchant),accountTerm=compact(account||''),amountNum=Number(amount),best=null;
 for(let row of rows){
  let t=parseLedgerTime(row?.date);if(!Number.isFinite(t))continue;
  let delta=Math.abs(target-t)/1000;if(delta>300)continue;
  let score=delta<=3?8:delta<=30?6.5:delta<=90?5:delta<=180?3.5:2,
      reasons=['时间差 '+Math.round(delta)+' 秒'],strong=delta<=3;
  let rowAmount=Number(row.amount);
  if(Number.isFinite(amountNum)&&Number.isFinite(rowAmount)){
   if(moneyClose(amountNum,rowAmount)){score+=5;strong=true;reasons.push('金额相同')}
   else score-=3
  }
  if(type&&String(row.type||'')===String(type)){score+=1;reasons.push('类型相同')}
  let rm=compact(row.merchant||''),rn=compact(row.note||'');
  if(merchantTerm&&((rm&&(rm.includes(merchantTerm)||merchantTerm.includes(rm)))||(rn&&rn.includes(merchantTerm)))){
   score+=3.5;strong=true;reasons.push('商家/备注相似')
  }
  if(accountTerm&&accountEquivalent(row.account||'',account,context?.accountAliases)){score+=2;reasons.push('账户相同/别名等价')}
  if(!strong||score<8)continue;
  if(!best||score>best.score||score===best.score&&delta<best.delta)best={row,score,delta,reasons}
 }
 if(!best)return null;
 let confidence=clamp01(.55+Math.min(best.score,16)*.028),
     r=best.row,msg='可能重复账单：'+String(r.date||'')+(r.amount?' · ¥'+Number(r.amount):'');
 warnings.push(msg);evidence.push('重复检测：'+msg+' ← '+best.reasons.join('、'));
 return {
  detected:true,confidence,message:msg,
  matched:{id:String(r.id||''),date:String(r.date||''),type:String(r.type||''),amount:String(r.amount||''),account:String(r.account||''),merchant:String(r.merchant||''),note:String(r.note||''),category:String(r.category||''),subcategory:String(r.subcategory||'')},
  reasons:best.reasons,deltaSeconds:round2(best.delta)
 }
}



// rc13 document grouper -----------------------------------------------------
// One screenshot may contain one transaction detail or many repeated rows.
// The grouper only decides row boundaries/context; each row is still parsed by
// the same single-transaction recognizer below.
function parseMonthHeader(line){
 let m=String(line||'').match(/^\s*(20\d{2})\s*年\s*(\d{1,2})\s*月(?:\s*[v∨⌄˅>]?)?\s*$/i);
 return m?{year:+m[1],month:+m[2]}:null
}
function parseListDateAnchor(line,yearHint){
 let s=String(line||'').trim(),m=s.match(/(?:(20\d{2})\s*年\s*)?(\d{1,2})\s*月\s*(\d{1,2})\s*日\s*(\d{1,2})\s*:\s*(\d{2})(?::(\d{2}))?/);
 if(!m)return null;
 let y=+(m[1]||yearHint||0),mo=+m[2],d=+m[3],hh=+m[4],mm=+m[5],ss=+(m[6]||0);
 if(!y||mo<1||mo>12||d<1||d>31||hh>23||mm>59||ss>59)return null;
 return {value:`${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')} ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`,year:y,month:mo,day:d,hour:hh,minute:mm,text:s}
}
function signedListAmount(line){
 let s=String(line||'').trim();if(!s||/余额|剩余|积分|额度/.test(s))return null;
 let m=s.match(/([+\-−])\s*(?:[¥￥]\s*)?(\d{1,9}(?:,\d{3})*(?:\.\d{1,2})?)/);
 if(!m)return null;
 let n=Number(m[2].replace(/,/g,''));if(!Number.isFinite(n)||n>1e8)return null;
 let signed=(m[1]==='-'||m[1]==='−')?-n:n;
 return {signed:round2(signed),value:round2(Math.abs(n)),raw:m[0],text:s}
}
function listMerchantCandidate(line){
 let s=String(line||'').trim();if(!s)return '';
 if(parseMonthHeader(s)||parseListDateAnchor(s,2000)||signedListAmount(s)){
  // A merchant and amount/date can share one OCR line. Remove the structured
  // fragments and keep only meaningful text that remains.
  s=s.replace(/(?:(?:20\d{2})\s*年\s*)?\d{1,2}\s*月\s*\d{1,2}\s*日\s*\d{1,2}\s*:\s*\d{2}(?::\d{2})?/g,' ')
     .replace(/[+\-−]\s*(?:[¥￥]\s*)?\d{1,9}(?:,\d{3})*(?:\.\d{1,2})?/g,' ').replace(/\s+/g,' ').trim()
 }
 if(!s||/^\d+$/.test(s)||/^[-+¥￥\d.,\s]+$/.test(s))return '';
 if(/^(?:零钱明细|零钱通明细|账单明细|账单|明细|全部交易|全部账单|收入|支出|筛选|关闭|返回)$/.test(s))return '';
 if(/零钱余额|账户余额|余额\s*[:：]?\s*[\d.,]+|^20\d{2}\s*年\s*\d{1,2}\s*月/.test(s))return '';
 return cleanMerchant(s)
}
function pageContextFromText(text){
 let t=String(text||'');
 if(/零钱通明细/.test(t))return {platform:'微信',pageType:'微信零钱通明细',accountHint:'零钱通'};
 if(/零钱明细/.test(t))return {platform:'微信',pageType:'微信零钱明细',accountHint:'零钱'};
 if(/微信/.test(t)&&/(?:账单明细|账单列表|全部账单)/.test(t))return {platform:'微信',pageType:'微信账单列表',accountHint:''};
 if(/支付宝/.test(t)&&/(?:账单|明细)/.test(t))return {platform:'支付宝',pageType:'支付宝账单列表',accountHint:''};
 return {platform:'',pageType:'重复账单列表',accountHint:''}
}
function groupDocument(source,context={}){
 let text=cleanText(source),lines=linesOf(text),nowRaw=String(context?.now||''),now=new Date(nowRaw.replace(' ','T'));if(!Number.isFinite(now.getTime()))now=new Date();
 let monthByLine=new Array(lines.length),active={year:now.getFullYear(),month:now.getMonth()+1};
 for(let i=0;i<lines.length;i++){let h=parseMonthHeader(lines[i]);if(h)active=h;monthByLine[i]={...active}}
 let anchors=[];
 for(let i=0;i<lines.length;i++){let hint=monthByLine[i]||active,a=parseListDateAnchor(lines[i],hint.year);if(a){if(hint.month===a.month)a.year=hint.year,a.value=`${hint.year}-${String(a.month).padStart(2,'0')}-${String(a.day).padStart(2,'0')} ${String(a.hour).padStart(2,'0')}:${String(a.minute).padStart(2,'0')}:00`;anchors.push({...a,line:i})}}
 let amounts=[],merchants=[];
 for(let i=0;i<lines.length;i++){let a=signedListAmount(lines[i]);if(a)amounts.push({...a,line:i});let m=listMerchantCandidate(lines[i]);if(m)merchants.push({value:m,line:i,text:lines[i]})}
 function assignNearest(candidates,maxDist){
  let by=new Map();
  for(let c of candidates){let best=null;for(let ai=0;ai<anchors.length;ai++){let d=Math.abs(c.line-anchors[ai].line);if(d>maxDist)continue;let afterPenalty=c.line>anchors[ai].line?0.12:0,score=d+afterPenalty;if(!best||score<best.score)best={ai,score,d}}if(best){let arr=by.get(best.ai)||[];arr.push({...c,distance:best.d});by.set(best.ai,arr)}}
  return by
 }
 let amountBy=assignNearest(amounts,6),merchantBy=assignNearest(merchants,6),ctx=pageContextFromText(text),groups=[],seen=new Set();
 for(let ai=0;ai<anchors.length;ai++){
  let a=anchors[ai],as=(amountBy.get(ai)||[]).sort((x,y)=>x.distance-y.distance||x.line-y.line),ms=(merchantBy.get(ai)||[]).sort((x,y)=>x.distance-y.distance||(x.line>a.line)-(y.line>a.line)||y.line-x.line),am=as[0],mc=ms[0];
  if(!am)continue;
  let merchant=mc?.value||'',key=[a.value,am.signed,compact(merchant)].join('|');if(seen.has(key))continue;seen.add(key);
  groups.push({index:groups.length,line:a.line,date:a.value,merchant,signedAmount:am.signed,amount:am.value,type:am.signed>=0?'收入':'支出',rawLines:[mc?.text||'',a.text,am.text].filter(Boolean),source:{dateLine:a.line,amountLine:am.line,merchantLine:mc?.line??-1}})
 }
 let strong=groups.filter(g=>g.amount>0&&g.date).length,merchantCount=groups.filter(g=>g.merchant).length,explicitList=ctx.pageType!=='重复账单列表',detected=strong>=2&&(explicitList||merchantCount>=Math.min(2,strong));
 return {detected,platform:ctx.platform,pageType:ctx.pageType,accountHint:ctx.accountHint,lineCount:lines.length,anchorCount:anchors.length,signedAmountCount:amounts.length,merchantCandidateCount:merchants.length,groups}
}
function groupSyntheticText(group,doc){
 let out=[];if(doc.platform)out.push(doc.platform);if(doc.pageType)out.push(doc.pageType);
 if(group.merchant)out.push('商家名称: '+group.merchant);
 out.push(group.date.replace(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):\d{2}$/,'$1年$2月$3日 $4:$5'));
 out.push((group.signedAmount>=0?'+':'-')+Number(group.amount).toFixed(2));
 if(doc.accountHint)out.push('支付方式: '+doc.accountHint);
 return out.join('\n')
}

function rc12MultiRecords(base,text,lines,amountInfo,transfer){
 let records=[{type:base.type,amount:base.amount,date:base.date,merchant:base.merchant,note:base.note,account:base.account,account2:base.account2,category:base.category,subcategory:base.subcategory,relationRole:transfer?'transfer':'auto'}],used=new Set();
 let main=Number(base.amount?.value),push=(kind,cand,type,role,needs=false)=>{if(!cand||!Number.isFinite(Number(cand.value))||Number(cand.value)<=0)return;let key=kind+'|'+cand.line+'|'+cand.value;if(used.has(key))return;if(Number.isFinite(main)&&moneyClose(Number(cand.value),main)&&kind!=='refund')return;used.add(key);records.push({type:field(type,.9,'rc12-explicit-cash-event',[cand.text||'']),amount:field(round2(cand.value),clamp01(.62+Math.max(0,cand.score||0)/220),'rc12-explicit-cash-event',[cand.text||'']),date:base.date,merchant:base.merchant,note:field('',1,'no-auto-note'),account:base.account,account2:field('',0,'account2-rules'),category:field('',0,'rc12-extra-event'),subcategory:field('',0,'rc12-extra-event'),relationRole:role,needsConfirmation:needs})};
 let cands=amountInfo.amounts?.candidates||[],findRole=role=>cands.filter(x=>x.role===role).sort((a,b)=>(b.score||0)-(a.score||0))[0];
 // Fee/refund are extra real flows only when the screenshot explicitly labels them and they are distinct from the main flow.
 let fee=findRole('fee'),feeSeparate=!!transfer||/(?:另付|另收|额外|另扣|扣收|收取)\s*(?:的)?\s*(?:手续费|服务费)|(?:手续费|服务费)\s*(?:另付|另收|额外扣除|单独扣除)/.test(text);if(feeSeparate)push('fee',fee,'支出','fee',true);
 if(base.type?.value!=='收入'||!amountInfo.amounts?.refund||!moneyClose(Number(amountInfo.amounts.refund),main))push('refund',findRole('refund'),'收入','refund',true);
 // Explicit cashback/rebate arrival. Do not treat ordinary discounts/coupons as income.
 let rebate=cands.filter(x=>/(?:返现(?:到账)?|现金奖励|奖励金到账|红包到账|返还到账)/.test(String(x.text||''))).sort((a,b)=>(b.score||0)-(a.score||0))[0];
 push('rebate',rebate,'收入','rebate',true);
 // A transfer already represents both account legs in one CSV transfer row; never duplicate it as two bills.
 let hints=records.length>=2?[{type:'compound',members:records.map((_,i)=>i),roles:records.map(r=>r.relationRole||'auto'),confidence:.82,source:'explicit-cash-events'}]:[];
 return {records,relationHints:hints}
}
function recognizeSingle(source,context={}){
 let text=cleanText(source),lines=linesOf(text),evidence=[],warnings=[];
 let platform=detectPlatform(text,lines,evidence),transfer=detectTransfer(text,lines,context,evidence),type=transfer?.type||detectType(text,evidence),amountInfo=detectAmounts(lines,evidence,warnings),date=detectDate(lines,context,evidence),merchant=transfer?field('',1,'transfer-no-merchant'):detectMerchant(lines,platform.value,evidence,context),account=transfer?.account||detectAccount(text,lines,platform.value,context,evidence),account2=transfer?.account2||field('',0,'account2-rules');
 if(platform.confidence<.6)warnings.push('支付平台识别置信度较低');
 if(type.confidence<.6)warnings.push('收支类型识别置信度较低，当前按支出预填');
 if(!amountInfo.amount.value&&amountInfo.amount.value!==0)warnings.push('未找到可靠的主金额');
 if(amountInfo.amount.confidence&&amountInfo.amount.confidence<.65)warnings.push('主金额置信度较低，请人工核对');
 if(!merchant.value&&!transfer)warnings.push('未可靠识别商家/交易对象');
 if(account.value&&!account.matched&&Array.isArray(context.accounts)&&context.accounts.length)warnings.push('识别到付款方式，但未匹配现有账户：'+account.suggested);
 if(amountInfo.amounts.refund!=null&&!transfer){if(type.value==='支出')type=field('收入',Math.max(type.confidence,.72),'refund-override',['退款金额']);amountInfo.amount=field(round2(amountInfo.amounts.refund),.9,'refund-amount',['退款金额']);evidence.push('退款金额存在：主金额采用退款金额')}
 let historyCategory=transfer?null:categoryHistoryMatch(text,merchant.value,account.value,type.value,context,evidence),category=historyCategory?.category||field('',0,transfer?'transfer-no-category':'history-category'),subcategory=historyCategory?.subcategory||field('',0,transfer?'transfer-no-category':'history-category');
 let duplicate=duplicateHistoryMatch(date,amountInfo.amount.value,merchant.value,account.value,type.value,context,evidence,warnings);
 let result={
  version:VERSION,
  platform,
  type,
  amount:amountInfo.amount,
  amounts:amountInfo.amounts,
  merchant,
  // Merchant belongs in the merchant field; do not duplicate it into notes.
  note:field('',1,'no-auto-note'),
  account,
  account2,
  category,
  subcategory,
  date,
  duplicate,
  warnings:[...new Set(warnings)],
  evidence:[...new Set(evidence)],
  debug:{lineCount:lines.length,normalizedLines:lines.slice(0,240),platformScores:platform.scores||{},typeScores:type.scores||{},paymentMethod:account.paymentMethod||'',accountSuggested:account.suggested||'',account2:account2.value||'',transfer:transfer?{source:transfer.rawSource,destination:transfer.rawDestination}:null,accountMatchKind:account.matchKind||'',accountMethodSource:account.methodSource||'',accountCandidates:account.candidates||[],categoryHistory:historyCategory?.debug||null,duplicate:duplicate||null}
 };
 let multi=rc12MultiRecords(result,text,lines,amountInfo,transfer);result.records=multi.records;result.relationHints=multi.relationHints;return result
}

function recognize(source,context={}){
 let doc=groupDocument(source,context);
 if(!doc.detected)return recognizeSingle(source,context);
 let parsed=doc.groups.map(g=>({group:g,result:recognizeSingle(groupSyntheticText(g,doc),context)})),first=parsed[0]?.result||recognizeSingle(source,context);
 let records=parsed.map(({group:g,result:r})=>({type:r.type,amount:r.amount,date:r.date,merchant:r.merchant,note:r.note,account:r.account,account2:r.account2,category:r.category,subcategory:r.subcategory,relationRole:'auto',needsConfirmation:!g.merchant||Number(r.amount?.confidence||0)<.6}));
 let summaries=parsed.map(({group:g,result:r},i)=>({index:i+1,date:g.date,signedAmount:g.signedAmount,merchant:g.merchant,type:r.type?.value||g.type,amount:r.amount?.value??g.amount,account:r.account?.value||'',category:r.category?.value||'',subcategory:r.subcategory?.value||'',warnings:r.warnings||[],source:g.source}));
 return {...first,version:VERSION,records,relationHints:[],warnings:[...new Set([`识别为${doc.pageType}，拆分 ${records.length} 笔`,...(first.warnings||[])])],evidence:[`文档分组：${doc.pageType} → ${records.length} 笔`,...(first.evidence||[])],documentGrouping:{detected:true,pageType:doc.pageType,platform:doc.platform,accountHint:doc.accountHint,lineCount:doc.lineCount,anchorCount:doc.anchorCount,signedAmountCount:doc.signedAmountCount,merchantCandidateCount:doc.merchantCandidateCount,groups:summaries},debug:{...(first.debug||{}),documentGrouping:{pageType:doc.pageType,groups:summaries}}}
}

global.StarLedgerRecognizer={meta:META,recognize,_test:{detectPlatform,detectType,amountCandidates,detectAmounts,detectDate,detectMerchant,detectAccount,detectTransfer,categoryHistoryMatch,duplicateHistoryMatch,historyVariants,rc12MultiRecords,groupDocument,groupSyntheticText,recognizeSingle}};
})(window);
