/* Minimal ZIP container support for StarLedger backups.
 * Exports use the portable "stored" method; imports also accept deflate when
 * the browser provides DecompressionStream('deflate-raw').
 */
(global=>{
'use strict';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
let crcTable;
function table(){if(crcTable)return crcTable;crcTable=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;crcTable[n]=c>>>0}return crcTable}
function crc32(bytes){let c=0xffffffff,t=table();for(let b of bytes)c=t[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function u16(view,at,value){view.setUint16(at,value,true)}
function u32(view,at,value){view.setUint32(at,value>>>0,true)}
function concat(parts,total=parts.reduce((n,x)=>n+x.length,0)){let out=new Uint8Array(total),at=0;for(let part of parts){out.set(part,at);at+=part.length}return out}
function bytes(value){if(value instanceof Uint8Array)return value;if(value instanceof ArrayBuffer)return new Uint8Array(value);return encoder.encode(String(value??''))}
function dosStamp(date=new Date()){let year=Math.max(1980,date.getFullYear());return {time:(date.getHours()<<11)|(date.getMinutes()<<5)|(date.getSeconds()>>1),date:((year-1980)<<9)|((date.getMonth()+1)<<5)|date.getDate()}}
function create(entries){
 let locals=[],centrals=[],offset=0,stamp=dosStamp();
 for(let entry of entries){
  let name=encoder.encode(String(entry.name||'')),data=bytes(entry.data),crc=crc32(data);
  if(!name.length||name.length>65535)throw Error('ZIP 文件名无效');
  let local=new Uint8Array(30+name.length),lv=new DataView(local.buffer);u32(lv,0,0x04034b50);u16(lv,4,20);u16(lv,6,0x0800);u16(lv,8,0);u16(lv,10,stamp.time);u16(lv,12,stamp.date);u32(lv,14,crc);u32(lv,18,data.length);u32(lv,22,data.length);u16(lv,26,name.length);local.set(name,30);
  let central=new Uint8Array(46+name.length),cv=new DataView(central.buffer);u32(cv,0,0x02014b50);u16(cv,4,20);u16(cv,6,20);u16(cv,8,0x0800);u16(cv,10,0);u16(cv,12,stamp.time);u16(cv,14,stamp.date);u32(cv,16,crc);u32(cv,20,data.length);u32(cv,24,data.length);u16(cv,28,name.length);u32(cv,38,0);u32(cv,42,offset);central.set(name,46);
  locals.push(local,data);centrals.push(central);offset+=local.length+data.length;
 }
 if(centrals.length>65535)throw Error('ZIP 文件数量过多');
 let centralSize=centrals.reduce((n,x)=>n+x.length,0),end=new Uint8Array(22),ev=new DataView(end.buffer);u32(ev,0,0x06054b50);u16(ev,8,centrals.length);u16(ev,10,centrals.length);u32(ev,12,centralSize);u32(ev,16,offset);
 return concat([...locals,...centrals,end],offset+centralSize+end.length)
}
function findEnd(data){let view=new DataView(data.buffer,data.byteOffset,data.byteLength),start=Math.max(0,data.length-65557);for(let at=data.length-22;at>=start;at--)if(data[at]===0x50&&data[at+1]===0x4b&&data[at+2]===0x05&&data[at+3]===0x06&&at+22+view.getUint16(at+20,true)===data.length)return at;throw Error('不是有效的 ZIP 文件')}
async function inflateRaw(data,limit){
 if(!global.DecompressionStream)throw Error('这个浏览器不能读取压缩过的 ZIP；请导入由 StarLedger 导出的完整备份');let reader=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),parts=[],size=0;
 while(true){let {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Error('ZIP 解压结果超过声明大小')}parts.push(value)}return concat(parts,size)
}
async function read(source,{maxEntries=256,maxUncompressed=256*1024*1024}={}){
 let data=source instanceof Uint8Array?source:new Uint8Array(source instanceof ArrayBuffer?source:await source.arrayBuffer()),view=new DataView(data.buffer,data.byteOffset,data.byteLength),end=findEnd(data),count=view.getUint16(end+10,true),centralSize=view.getUint32(end+12,true),at=view.getUint32(end+16,true),total=0,out=[];
 if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||view.getUint16(end+8,true)!==count)throw Error('不支持分卷 ZIP');
 if(count>maxEntries||at+centralSize>end)throw Error('ZIP 目录异常或文件数量过多');
 for(let i=0;i<count;i++){
  if(at+46>data.length||view.getUint32(at,true)!==0x02014b50)throw Error('ZIP 目录损坏');
  let flags=view.getUint16(at+8,true),method=view.getUint16(at+10,true),expectedCrc=view.getUint32(at+16,true),compressed=view.getUint32(at+20,true),uncompressed=view.getUint32(at+24,true),nameLength=view.getUint16(at+28,true),extraLength=view.getUint16(at+30,true),commentLength=view.getUint16(at+32,true),localAt=view.getUint32(at+42,true),nameBytes=data.slice(at+46,at+46+nameLength),name;
  try{name=decoder.decode(nameBytes)}catch(e){throw Error('ZIP 文件名不是 UTF-8')}
  at+=46+nameLength+extraLength+commentLength;
  if(flags&1)throw Error('不支持加密 ZIP');if(![0,8].includes(method))throw Error('ZIP 使用了不支持的压缩方式');if(localAt+30>data.length||view.getUint32(localAt,true)!==0x04034b50)throw Error('ZIP 文件内容损坏');
  if(view.getUint16(localAt+8,true)!==method)throw Error('ZIP 压缩信息不一致');let localNameLength=view.getUint16(localAt+26,true),localExtraLength=view.getUint16(localAt+28,true),start=localAt+30+localNameLength+localExtraLength,endAt=start+compressed;if(endAt>data.length)throw Error('ZIP 文件内容不完整');
  total+=uncompressed;if(total>maxUncompressed)throw Error('ZIP 解压后超过安全大小限制');
  let content=data.slice(start,endAt);if(method===8)content=await inflateRaw(content,uncompressed);if(content.length!==uncompressed||crc32(content)!==expectedCrc)throw Error('ZIP 文件校验失败：'+name);
  if(!name.endsWith('/'))out.push({name,data:content});
 }
 return out
}
const api={create,read,crc32};global.StarLedgerZip=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(globalThis);
