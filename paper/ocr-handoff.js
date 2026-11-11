// Transport only: use the existing recognizer and entry task for bill semantics.
const KEY='star-ledger-ocr-pending-v1',MAX_AGE=10*60*1000,MAX_SIZE=262144;
const scalar=v=>v&&typeof v==='object'&&Object.hasOwn(v,'value')?v.value:v;
export const ocrValue=v=>['string','number'].includes(typeof scalar(v))?scalar(v):'';
export function normalizeOCRPayload(input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('OCR 结果格式无效');
 if(input.action==='ocr-clipboard')return{action:'ocr-clipboard',...(input.reason==='incomplete-link'?{reason:'incomplete-link',partialText:typeof input.partialText==='string'?input.partialText.slice(0,32000):''}:{})};
 if(input.action!=='ocr'&&input.kind!=='starledger-ocr-prefill')throw Error('不是星账本的 OCR 结果');
 const payload={action:'ocr',mainName:typeof input.mainName==='string'?input.mainName:''};
 if(Array.isArray(input.records)&&input.records.length){if(input.records.length>50)throw Error('一次最多接收 50 笔识别结果');if(input.records.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw Error('OCR 账单格式无效');payload.records=input.records;payload.relationHints=Array.isArray(input.relationHints)?input.relationHints:[]}
 else if(typeof input.text==='string'&&input.text.trim()){if(input.text.length>32000)throw Error('识别文字过长，请分批发送');payload.text=input.text}
 else throw Error('没有收到识别文字或账单');
 return payload;
}
export function isOCRHash(hash){return /^#(?:ocr|sl|sl-ocr|sl-ocr-clipboard)=/.test(hash)}
// Decode valid byte runs while preserving literal Unicode, %, + and & in the
// valid prefix of a cut URL. Missing bytes are never treated as a complete bill.
const readablePrefix=raw=>raw.replace(/(?:%[0-9a-f]{2})+/gi,run=>new TextDecoder('utf-8').decode(Uint8Array.from(run.match(/%[0-9a-f]{2}/gi),byte=>parseInt(byte.slice(1),16))));
const incompleteLink=raw=>({action:'ocr-clipboard',reason:'incomplete-link',partialText:readablePrefix(raw).slice(0,32000)});
export function decodeOCRHash(hash){
 if(!isOCRHash(hash))return null;
 if(hash.length>MAX_SIZE)throw Error('OCR 链接过长，请使用剪贴板传回');
 if(hash.startsWith('#ocr=')){const raw=hash.slice(5);let text;try{text=decodeURIComponent(raw)}catch{ text=readablePrefix(raw);if(text.includes('\uFFFD')||/%[0-9a-f]$/i.test(raw))return incompleteLink(raw)}return normalizeOCRPayload({action:'ocr',text})}
 const params=new URLSearchParams(hash.slice(1));if(params.has('sl-ocr-clipboard'))return{action:'ocr-clipboard'};
 const raw=params.get('sl-ocr')??params.get('sl');let parsed;try{parsed=JSON.parse(raw)}catch{return{action:'ocr-clipboard',reason:'incomplete-link',partialText:String(raw||'').slice(0,32000)}}return normalizeOCRPayload(parsed);
}

export function decodeOCRClipboard(text){
 if(typeof text!=='string'||!text.trim())throw Error('剪贴板为空，请先运行快捷指令或粘贴识别结果');
 if(text.length>MAX_SIZE)throw Error('OCR 结果过长，请分批发送');
 if(/^\s*[{[]/.test(text)){let value;try{value=JSON.parse(text)}catch{throw Error('OCR 结果 JSON 不完整，请重新复制')}return normalizeOCRPayload(value)}
 return normalizeOCRPayload({action:'ocr',text});
}
export function createOCRInbox(storage){
 let queue=[];try{const saved=JSON.parse(storage.getItem(KEY)||'null');queue=(Array.isArray(saved)?saved:saved?[saved]:[]).filter(item=>item.at&&Date.now()-item.at>=0&&Date.now()-item.at<MAX_AGE).map(item=>({...item,id:item.id||crypto.randomUUID(),payload:normalizeOCRPayload(item.payload)}))}catch{}
 const persist=()=>{try{if(queue.length)storage.setItem(KEY,JSON.stringify(queue));else storage.removeItem(KEY)}catch{}};persist();
 return{peek:()=>queue[0],add(payload){payload=normalizeOCRPayload(payload);const duplicate=queue.find(item=>JSON.stringify(item.payload)===JSON.stringify(payload));if(duplicate)return duplicate;if(queue.length>=5)throw Error('已有 5 次识别结果等待核对，请先处理');const item={at:Date.now(),id:crypto.randomUUID(),payload};queue.push(item);persist();return item},replace(id,payload){const item=queue.find(item=>item.id===id);if(!item)throw Error('待处理结果不存在，请重新发送');item.payload=normalizeOCRPayload(payload);persist();return item},remove(id){queue=queue.filter(item=>item.id!==id);persist()}};
}
