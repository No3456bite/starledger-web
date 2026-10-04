
(()=>{
  function cleanBookName(value){return String(value||'').trim()}
  function validBookName(name){return !!name&&name.length<=60&&!/[,，;；\r\n]/.test(name)}
  function bookExists(name){return allBookNames().includes(name)}
  function normalizeBookOrder(order){
    let all=new Set(allBookNames()),out=[];
    for(let name of order||[])if(all.has(name)&&!out.includes(name))out.push(name);
    for(let name of allBookNames())if(!out.includes(name))out.push(name);
    return out
  }
  async function persistBookMeta(changes){
    await savePrefs(changes);
    window.__rc62Invalidate?.();
  }
  async function replaceBookInRows(source,dest){
    let count=rows.filter(r=>r.book===source).length;
    if(!count)return;
    if(native){
      let result=await nativeCommand('bulkPatch',null,null,{operation:{kind:'bookRename',target:source,dest}});
      prefs={...prefs,...result.settings};
      if(result.csv!==undefined)takeCsv(result.csv);
    }else{
      let next=rows.map(r=>r.book===source?{...r,book:dest}:r);
      await localWrite('replaceLedger',null,null,{csv:csvWrite(next),mainName:prefs.mainName,allowEmpty:true});
    }
    if(book===source)book=dest;
  }
  function bookForm(name){
    name=cleanBookName(name);if(!name)return;
    let profile=bookProfile(name),count=rows.filter(r=>r.book===name).length,isDefault=defaultBookName()===name;
    $('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config account-config-compact"><div class="account-config-head"><h2>${esc(name)}</h2><div class="account-head-actions">${isDefault?'':'<button type="button" data-bookdefault="'+esc(name)+'">设为默认</button>'}<button type="button" class="danger" data-bookdelete="${esc(name)}">删除</button></div></div><p class="muted account-summary">${count} 笔账单 · ${isDefault?'当前默认账本':'排序第 '+(orderedBookNames(true).indexOf(name)+1)+' 位'}</p><form id="bookProfileForm" data-book="${esc(name)}"><label class="field account-rename-full">账本名称<input name="name" maxlength="60" value="${esc(name)}" autocomplete="off"></label><label class="field include-toggle"><input type="checkbox" name="hidden" ${profile.hidden?'checked':''}>隐藏此账本</label><label class="field account-note-full">备注<input name="note" maxlength="160" value="${esc(profile.note)}" placeholder="可选"></label><p class="muted account-config-hint">列表第一项是普通新记账默认账本。OCR 优先沿用最近一笔账单的账本；若该账本被隐藏或删除，再退回第一项可用账本。隐藏不会删除历史账单。</p><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">保存账本</button></div></form></div></div>`;
    if(compactViewport())document.body.classList.add('dialog-open');activateAppTertiary('account')
  }
  function newInnerBookForm(){
    $('#overlay').innerHTML='<div class="modalback account-dialog-back"><div class="modal account-config"><h2>新建账本</h2><form id="newInnerBookForm"><label class="field">账本名称<input name="name" maxlength="60" required placeholder="例如：日常账本"></label><label class="field">备注<input name="note" maxlength="160" placeholder="可选"></label><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">创建账本</button></div></form></div></div>';
    if(compactViewport())document.body.classList.add('dialog-open');activateAppTertiary('account')
  }
  async function createInnerBook(form){
    let data=new FormData(form),name=cleanBookName(data.get('name')),note=cleanBookName(data.get('note'));
    if(!validBookName(name))throw Error('账本名称无效');
    if(bookExists(name))throw Error('已存在同名账本');
    let profiles={...(prefs.bookProfiles||{}),[name]:{hidden:false,note}},deleted=(prefs.deletedBooks||[]).filter(x=>x!==name),order=[...orderedBookNames(true),name];
    await persistBookMeta({bookProfiles:profiles,deletedBooks:deleted,bookOrder:order});
    close();bookForm(name)
  }
  async function setBookDefault(name){
    name=cleanBookName(name);if(!bookExists(name))return;
    let profiles={...(prefs.bookProfiles||{})},p={...bookProfile(name),hidden:false};profiles[name]=p;
    let order=normalizeBookOrder([name,...(prefs.bookOrder||[]).filter(x=>x!==name)]);
    await persistBookMeta({bookProfiles:profiles,bookOrder:order});
    close();render();toast('已设为默认账本：'+name)
  }
  async function saveBookProfile(form){
    let old=cleanBookName(form.dataset.book),data=new FormData(form),dest=cleanBookName(data.get('name')),hidden=data.get('hidden')==='on',note=cleanBookName(data.get('note'));
    if(!validBookName(dest))throw Error('账本名称无效');
    if(hidden&&orderedBookNames(false).filter(x=>x!==old).length===0)throw Error('至少保留一个可用账本');
    if(dest!==old&&bookExists(dest))throw Error('已存在同名账本；请先删除或改用其他名称');
    if(dest!==old)await replaceBookInRows(old,dest);
    if(hidden&&book===old)book='全部账本';
    let profiles={...(prefs.bookProfiles||{})},oldProfile=profiles[old]||bookProfile(old);
    delete profiles[old];profiles[dest]={...oldProfile,hidden,note};
    let order=normalizeBookOrder((prefs.bookOrder||[]).map(x=>x===old?dest:x));
    if(!order.includes(dest))order.push(dest);
    let deleted=(prefs.deletedBooks||[]).filter(x=>x!==dest);if(dest!==old&&!deleted.includes(old))deleted.push(old);
    await persistBookMeta({bookProfiles:profiles,bookOrder:order,deletedBooks:deleted});
    close();render();toast(dest===old?'账本设置已保存':'账本已改名为：'+dest)
  }
  function confirmBookDelete(name){
    name=cleanBookName(name);let count=rows.filter(r=>r.book===name).length,others=orderedBookNames(true).filter(x=>x!==name);
    if(!others.length){toast('至少需要保留一个账本');return}
    if(!count){deleteBookAfterMigration(name,'').catch(err=>toast(err.message));return}
    let dest=orderedBookNames(false).find(x=>x!==name)||others[0];
    $('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config"><h2>删除「${esc(name)}」？</h2><p class="muted">这个账本有 ${count} 笔账单。删除账本前必须把这些账单迁移到其他账本。</p><label class="field">迁移到<select id="bookDeleteDestination">${others.map(x=>`<option value="${esc(x)}" ${x===dest?'selected':''}>${esc(x)}</option>`).join('')}</select></label><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="button" class="button danger" data-bookconfirmdelete="${esc(name)}">迁移并删除</button></div></div></div>`;
    if(compactViewport())document.body.classList.add('dialog-open')
  }
  async function deleteBookAfterMigration(name,dest){
    name=cleanBookName(name);dest=cleanBookName(dest);
    let count=rows.filter(r=>r.book===name).length;
    if(count){if(!dest||dest===name||!bookExists(dest))throw Error('请选择迁移目标账本');await replaceBookInRows(name,dest)}
    let profiles={...(prefs.bookProfiles||{})};delete profiles[name];
    let order=(prefs.bookOrder||[]).filter(x=>x!==name),deleted=[...new Set([...(prefs.deletedBooks||[]),name])];
    if(book===name)book='全部账本';
    await persistBookMeta({bookProfiles:profiles,bookOrder:order,deletedBooks:deleted});
    close();render();toast('账本已删除'+(count?'，原账单已迁移到 '+dest:''))
  }

  // Click controls.
  document.addEventListener('click',e=>{
    let t=e.target.closest?.('#addInnerBook,[data-bookname],[data-bookdefault],[data-bookdelete],[data-bookconfirmdelete],[data-statsmode]');
    if(!t)return;
    if(Date.now()<window.__slSuppressBookClickUntil&&t.closest('.book-entry')){e.preventDefault();e.stopImmediatePropagation();return}
    e.preventDefault();e.stopImmediatePropagation();
    if(t.id==='addInnerBook')newInnerBookForm();
    else if(t.dataset.bookname)bookForm(t.dataset.bookname);
    else if(t.dataset.bookdefault)setBookDefault(t.dataset.bookdefault).catch(err=>toast(err.message));
    else if(t.dataset.bookdelete)confirmBookDelete(t.dataset.bookdelete);
    else if(t.dataset.bookconfirmdelete)deleteBookAfterMigration(t.dataset.bookconfirmdelete,$('#bookDeleteDestination')?.value).catch(err=>toast(err.message));
    else if(t.dataset.statsmode){statsMode=t.dataset.statsmode==='year'?'year':'month';day='';page=0;render()}
  },true);

  document.addEventListener('submit',e=>{
    if(e.target.id==='bookProfileForm'){e.preventDefault();e.stopImmediatePropagation();saveBookProfile(e.target).catch(err=>toast(err.message))}
    else if(e.target.id==='newInnerBookForm'){e.preventDefault();e.stopImmediatePropagation();createInnerBook(e.target).catch(err=>toast(err.message))}
  },true);

  // Long-press sorting: same interaction model as accounts, with text selection disabled.
  let drag=null,hold=null,pending=null;
  window.__slSuppressBookClickUntil=0;
  const clearHold=()=>{if(hold){clearTimeout(hold);hold=null}pending=null};
  const clearMarks=()=>document.querySelectorAll('.book-entry[data-bookentry]').forEach(x=>x.classList.remove('book-drop-before','book-drop-after'));
  const begin=start=>{if(!start)return;hold=null;pending=null;drag=start;start.item.classList.add('book-dragging')};
  const move=(x,y)=>{if(!drag)return;let hit=document.elementFromPoint(x,y)?.closest('.book-entry[data-bookentry]');clearMarks();if(!hit||hit===drag.item)return;let r=hit.getBoundingClientRect(),before=y<r.top+r.height/2;hit.classList.add(before?'book-drop-before':'book-drop-after');hit.parentNode.insertBefore(drag.item,before?hit:hit.nextSibling)};
  const finish=save=>{clearHold();if(!drag)return;let item=drag.item;item?.classList.remove('book-dragging');clearMarks();drag=null;window.__slSuppressBookClickUntil=Date.now()+650;if(save){let order=[...document.querySelectorAll('.book-entry[data-bookentry]')].map(x=>x.dataset.bookentry);if(order.length)persistBookMeta({bookOrder:order}).catch(err=>toast(err.message))}};
  const touchBy=(list,id)=>{for(let i=0;i<list.length;i++)if(list[i].identifier===id)return list[i];return null};

  document.addEventListener('touchstart',e=>{if(e.touches.length!==1)return;let item=e.target.closest('.book-entry[data-bookentry]');if(!item)return;clearHold();let t=e.changedTouches[0];pending={x:t.clientX,y:t.clientY,item,touchId:t.identifier,input:'touch'};hold=setTimeout(()=>{if(pending?.input==='touch')begin(pending)},420)},{passive:true});
  document.addEventListener('touchmove',e=>{if(pending?.input==='touch'){let t=touchBy(e.touches,pending.touchId);if(t&&Math.hypot(t.clientX-pending.x,t.clientY-pending.y)>10){clearHold();return}}if(drag?.input!=='touch')return;let t=touchBy(e.touches,drag.touchId);if(!t)return;if(e.cancelable)e.preventDefault();e.stopPropagation();move(t.clientX,t.clientY)},{passive:false,capture:true});
  document.addEventListener('touchend',e=>{if(drag?.input==='touch'&&touchBy(e.changedTouches,drag.touchId)){finish(true);return}if(pending?.input==='touch'&&touchBy(e.changedTouches,pending.touchId))clearHold()},{passive:true});
  document.addEventListener('touchcancel',()=>{if(drag?.input==='touch')finish(false);else clearHold()},{passive:true});

  document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch'||e.button!==0)return;let item=e.target.closest('.book-entry[data-bookentry]');if(!item)return;clearHold();pending={x:e.clientX,y:e.clientY,item,pointerId:e.pointerId,input:'pointer'};hold=setTimeout(()=>{if(pending?.input==='pointer'){begin(pending);try{item.setPointerCapture(e.pointerId)}catch(_){}}},420)});
  document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;if(pending?.input==='pointer'&&Math.hypot(e.clientX-pending.x,e.clientY-pending.y)>10){clearHold();return}if(drag?.input!=='pointer')return;e.preventDefault();move(e.clientX,e.clientY)},{passive:false});
  document.addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;if(drag?.input==='pointer')finish(true);else if(pending?.input==='pointer')clearHold()});
  document.addEventListener('pointercancel',()=>{if(drag?.input==='pointer')finish(false);else clearHold()});
  document.addEventListener('contextmenu',e=>{if(e.target.closest('.book-entry[data-bookentry]')){e.preventDefault();clearHold()}});
})();
