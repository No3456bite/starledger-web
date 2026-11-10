const DATABASE='starledger-paper-production-v1';
const open=()=>new Promise((resolve,reject)=>{const request=indexedDB.open(DATABASE,1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshot');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
export async function read(){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('snapshot','readonly'),r=tx.objectStore('snapshot').get('active');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}finally{db.close()}}
export async function write(snapshot,expectedRevision){const db=await open();try{return await new Promise((resolve,reject)=>{
 const tx=db.transaction('snapshot','readwrite'),store=tx.objectStore('snapshot'),get=store.get('active');let conflict;
 get.onsuccess=()=>{try{const actual=get.result?.revision??-1;if(actual!==expectedRevision){conflict=Error('另一个窗口已修改账簿，请刷新后重试。当前草稿仍保留。');tx.abort();return}store.put(snapshot,'active')}catch(e){conflict=e;try{tx.abort()}catch{}reject(e)}};
 tx.oncomplete=()=>resolve(snapshot);tx.onabort=()=>reject(conflict||tx.error||Error('保存没有完成，请重试'));tx.onerror=()=>reject(tx.error);
})}finally{db.close()}}
