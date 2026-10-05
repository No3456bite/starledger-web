/* rc14-search-filter-behavior */
(()=>{
 let holdTimer=null,startY=0,dragNode=null,reordering=false;
 const sheet=()=>document.querySelector('.search-filter-sheet');
 const saveOrder=()=>{
   const keys=[...document.querySelectorAll('#searchFilterGroups>[data-filtergroup]')].map(x=>x.dataset.filtergroup).filter(x=>x!=='subcategory');
   if(keys.length){let i=keys.indexOf('category');searchFilterOrder=keys.slice();if(i>=0)searchFilterOrder.splice(i+1,0,'subcategory');prefs.searchFilterOrder=searchFilterOrder.slice();try{let r=savePrefs?.({searchFilterOrder:searchFilterOrder.slice()});if(r?.catch)r.catch(()=>{})}catch(_){}}
 };
 const enterReorder=(node)=>{
   const sh=sheet();if(!sh||!node)return;reordering=true;sh.classList.add('reordering');dragNode=node;node.classList.add('dragging');
 };
 const finish=()=>{
   clearTimeout(holdTimer);holdTimer=null;
   if(dragNode)dragNode.classList.remove('dragging');
   document.querySelectorAll('.search-filter-group.drag-over').forEach(x=>x.classList.remove('drag-over'));
   if(reordering)saveOrder();
   dragNode=null;
 };
 document.addEventListener('pointerdown',e=>{
   const g=e.target.closest?.('.search-filter-group');
   if(!g||!sheet())return;
   startY=e.clientY;
   holdTimer=setTimeout(()=>enterReorder(g),430);
 },true);
 document.addEventListener('pointermove',e=>{
   if(holdTimer&&Math.abs(e.clientY-startY)>9){clearTimeout(holdTimer);holdTimer=null}
   if(!reordering||!dragNode)return;
   e.preventDefault();
   const groups=[...document.querySelectorAll('#searchFilterGroups>.search-filter-group')].filter(x=>x!==dragNode);
   const target=groups.find(g=>e.clientY<g.getBoundingClientRect().top+g.offsetHeight/2);
   groups.forEach(x=>x.classList.remove('drag-over'));
   if(target){target.classList.add('drag-over');target.before(dragNode)}
   else document.querySelector('#searchFilterGroups')?.append(dragNode);
 },{capture:true,passive:false});
 document.addEventListener('pointerup',finish,true);
 document.addEventListener('pointercancel',finish,true);
 document.addEventListener('input',e=>{
   if(e.target?.id!=='searchFilterQuery')return;
   const q=e.target.value.trim().toLocaleLowerCase();
   document.querySelectorAll('.search-filter-group').forEach(g=>{
     let visible=0;
     g.querySelectorAll('.search-filter-option').forEach(b=>{
       let ok=!q||b.textContent.toLocaleLowerCase().includes(q);b.hidden=!ok;if(ok)visible++;
     });
     g.hidden=!!q&&!visible;
   });
 },true);
})();

/* rc15-filter-selection-guard */
(()=>{
 const insideFilter=e=>e.target?.closest?.('.search-filter-sheet')&&!e.target?.closest?.('#searchFilterQuery');
 document.addEventListener('selectstart',e=>{if(insideFilter(e))e.preventDefault()},true);
 document.addEventListener('contextmenu',e=>{if(insideFilter(e))e.preventDefault()},true);
})();

/* rc18-unified-floating-dismiss */
(()=>{
  const closeBackdrop=(back)=>{
    if(!back||back.classList.contains('rc21-closing'))return;
    back.classList.add('rc21-closing');
    const owner=back.parentElement;
    setTimeout(()=>{
      if(owner&&(owner.id==='overlay'||owner.id==='accountOverlay')){if(owner.contains(back))owner.innerHTML=''}
      else if(back.isConnected)back.remove();
      document.body.classList.remove('dialog-open');
    },300);
  };
  document.addEventListener('click',e=>{
    const back=e.target.closest?.('.modalback,.entryback');
    if(!back||e.target!==back)return;
    e.preventDefault();e.stopPropagation();
    closeBackdrop(back);
  },true);
})();

/* rc22-account-compact-behavior */
document.addEventListener('change',e=>{
 if(e.target?.id!=='accountTypeSelect')return;
 const field=e.target.closest('form')?.querySelector('.account-credit-limit');
 if(field)field.hidden=e.target.value!=='credit';
},true);

/* rc114-rc54-floating-fixed */
(()=>{
  function placeFloating(){
    const scroller=document.querySelector('#content'),
          slot=document.querySelector('#controlsFrame'),
          floating=document.querySelector('#floatingControls');
    if(!scroller||!slot||!floating||floating.hidden||!floating.innerHTML.trim())return;

    // Frame 2 is now the filter's document-flow anchor.
    // Keep a 62px minimum (the original one-row filter footprint), but grow the
    // spacer when an active-filter notice makes the floating UI taller.
    if(matchMedia('(max-width:760px)').matches){
      const filterHeight=Math.ceil(floating.getBoundingClientRect().height||0);
      const reserved=Math.max(62,filterHeight+19);
      slot.style.setProperty('height',reserved+'px','important');
    }

    // Recover frame 2's document-flow Y even when the page is already scrolled.
    // The floating filter then stays fixed; frame 3/title scrolls away normally.
    const baseTop=slot.getBoundingClientRect().top + scroller.scrollTop;
    floating.style.top=Math.round(baseTop)+'px';
    floating.style.transform='none';
  }
  window.__rc51SyncFloating=placeFloating; // keep existing call sites compatible
  window.__rc54PlaceFloating=placeFloating;
  window.addEventListener('resize',()=>requestAnimationFrame(placeFloating),{passive:true});
  requestAnimationFrame(placeFloating);
})();

/* rc114-rc62-edge-overscroll-guard */
(()=>{
  if(document.documentElement.classList.contains('browser-tab'))return;
  const scroller=document.querySelector('#content');
  if(!scroller)return;
  let lastX=null,lastY=null;
  scroller.addEventListener('touchstart',e=>{
    if(e.touches&&e.touches.length===1){
      lastX=e.touches[0].clientX;lastY=e.touches[0].clientY;
    }else lastX=lastY=null;
  },{passive:true});
  scroller.addEventListener('touchmove',e=>{
    if(lastY===null||!e.touches||e.touches.length!==1)return;
    const x=e.touches[0].clientX,y=e.touches[0].clientY,dx=x-lastX,dy=y-lastY;
    // Hard-stop only a genuinely vertical pull beyond the top.
    // Horizontal drags are left to rc6.1's interactive pager.
    if(scroller.scrollTop<=0&&dy>0&&Math.abs(dy)>Math.abs(dx)*1.08)e.preventDefault();
    lastX=x;lastY=y;
  },{passive:false});
  const clear=()=>{lastX=lastY=null};
  scroller.addEventListener('touchend',clear,{passive:true});
  scroller.addEventListener('touchcancel',clear,{passive:true});
})();

/* rc114-rc62-interactive-swipe */
(()=>{
 if(document.documentElement.classList.contains('browser-tab'))return;
 const viewport=document.querySelector('#pageViewport');
 const live=document.querySelector('#content');
 const floatingLive=document.querySelector('#floatingControls');
 const backToTop=document.querySelector('#backToTop');
 if(!viewport||!live)return;

 let g=null,suppressClickUntil=0,rafId=0,prewarmToken=0,busy=false;
 const neighborNodes=new Map();

 const blockedTarget=t=>!!t.closest(
  'input,select,textarea,[contenteditable="true"],.mobilebar,.modalback,.entryback,'+
  '#accountOverlay,.search-filter-sheet,.tag-choices,.category-tabs'
 );

 function savePreviewGlobals(){
  return {section,day,page,searchPeriod,searchDateMode,searchRangeStart,searchRangeEnd};
 }
 function restorePreviewGlobals(v){
  section=v.section;day=v.day;page=v.page;
  searchPeriod=v.searchPeriod;searchDateMode=v.searchDateMode;
  searchRangeStart=v.searchRangeStart;searchRangeEnd=v.searchRangeEnd;
 }

 function pageBodyHTMLFor(target){
  const prefix=
   (volatileDeletion
    ?'<div class="backup-alert">当前仅显示已导出的删除结果。手机原 CSV 未改变；请保存导出的 CSV，并重新导入后再继续记账。</div>'
    :'')+
   (prefs.mainName&&exportStatus()?exportStatus():'');
  if(!prefs.mainName){
   return prefix+firstUsePage();
  }
  const fn={home:homeV2,stats:statsPage,books:bookPage,accounts:accountPage,search:searchPage}[target];
  return prefix+(fn?fn():'');
 }

 function filterBaseTop(){
  // Frame 2 begins immediately after the safe-area. The header is now frame 3.
  const safe=document.querySelector('#safeFrame');
  return Math.max(0,safe?.offsetHeight||0);
 }

 function buildTargetScene(target){
  const saved=savePreviewGlobals();
  try{
   section=target;
   rc6ApplyPageDefaults(target);

   // This work happens during idle prewarming, not inside touchmove.
   const clone=live.cloneNode(true);
   const title=clone.querySelector('#title');
   if(title)title.textContent=target==='stats'?(statsMode==='year'?'年度':'月度'):(labels[target]||'');

   const pageBody=clone.querySelector('#pageBody');
   if(pageBody){
    pageBody.classList.remove('settings-page');
    pageBody.innerHTML=pageBodyHTMLFor(target);
   }

   const hasTopFilters=!!(prefs.mainName&&(target==='home'||target==='stats'));
   const slot=clone.querySelector('#controlsFrame');
   const previewHeader=clone.querySelector('#headerFrame');
   if(previewHeader)previewHeader.hidden=false;
   if(slot){
    slot.innerHTML='';
    slot.hidden=false;
    slot.style.setProperty('height','62px','important');
   }

   const floatState=hasTopFilters
    ?{visible:true,html:commonFilters(target==='home'||statsMode==='month')+activeFilterNotice(),top:filterBaseTop()}
    :{visible:false,html:'',top:0};

   return rc55SceneHTML(clone.innerHTML,rc27PageScroll[target]||0,floatState);
  }finally{
   restorePreviewGlobals(saved);
  }
 }

 function removeNeighborNodes(){
  for(const node of neighborNodes.values())node.remove();
  neighborNodes.clear();
 }

 function makeNeighborNode(target,side){
  const node=document.createElement('div');
  node.className='rc62-neighbor-scene';
  node.dataset.target=target;
  node.dataset.side=side;
  node.innerHTML=buildTargetScene(target);
  viewport.appendChild(node);
  neighborNodes.set(target,node);
  return node;
 }

 function positionPrewarmed(){
  const width=Math.max(1,viewport.clientWidth);
  const index=PRIMARY_PAGE_ORDER.indexOf(section);
  for(const [target,node] of neighborNodes){
   const ti=PRIMARY_PAGE_ORDER.indexOf(target);
   const x=ti<index?-width:width;
   node.style.setProperty('--rc62-x',x+'px');
   node.classList.remove('rc62-active','rc62-settling');
  }
 }

 function prewarmNow(token){
  if(token!==prewarmToken||busy||rc27Animating||section==='settings')return;
  removeNeighborNodes();
  const index=PRIMARY_PAGE_ORDER.indexOf(section);
  if(index<0)return;

  // Only the two pages that can actually be reached by one swipe are kept warm.
  if(index>0)makeNeighborNode(PRIMARY_PAGE_ORDER[index-1],'left');
  if(index<PRIMARY_PAGE_ORDER.length-1)makeNeighborNode(PRIMARY_PAGE_ORDER[index+1],'right');
  positionPrewarmed();
 }

 function schedulePrewarm(){
  const token=++prewarmToken;
  if(!compactViewport()){removeNeighborNodes();return}
  if(busy||rc27Animating||section==='settings')return;
  const run=()=>prewarmNow(token);
  if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:260});
  else setTimeout(run,80);
 }
 window.__rc62AfterRender=schedulePrewarm;
 // rc11: settings that alter page HTML must invalidate the already-built neighbour
 // scenes. Otherwise a later swipe can restore a stale Banner snapshot.
 window.__rc62Invalidate=()=>{
  ++prewarmToken;
  removeNeighborNodes();
  if(!busy&&!rc27Animating&&section!=='settings')schedulePrewarm();
 };

 function setLiveX(x){
  const px=x+'px';
  live.style.setProperty('--rc62-live-x',px);
  if(floatingLive)floatingLive.style.setProperty('--rc62-live-x',px);
  if(backToTop)backToTop.style.setProperty('--rc62-live-x',px);
 }

 function setNeighborX(node,x){
  if(node)node.style.setProperty('--rc62-x',x+'px');
 }

 function trackingOn(){
  live.classList.add('rc62-tracking');
  if(floatingLive)floatingLive.classList.add('rc62-tracking');
  if(backToTop)backToTop.classList.add('rc62-tracking');
 }

 function trackingOff(){
  live.classList.remove('rc62-tracking','rc62-settling');
  live.style.removeProperty('--rc62-live-x');
  live.style.removeProperty('--rc62-duration');
  live.style.removeProperty('--rc62-ease');
  if(floatingLive){
   floatingLive.classList.remove('rc62-tracking','rc62-settling');
   floatingLive.style.removeProperty('--rc62-live-x');
   floatingLive.style.removeProperty('--rc62-duration');
   floatingLive.style.removeProperty('--rc62-ease');
  }
  if(backToTop){
   backToTop.classList.remove('rc62-tracking','rc62-settling');
   backToTop.style.removeProperty('--rc62-live-x');
   backToTop.style.removeProperty('--rc62-duration');
   backToTop.style.removeProperty('--rc62-ease');
  }
 }

 function applyDrag(state,rawDx){
  if(!state||state.axis!=='x')return;
  const width=state.width;

  if(!state.target){
   const sign=state.dir<0?-1:1;
   const attempted=sign*rawDx>0?Math.abs(rawDx):0;
   const resisted=sign*Math.min(58,attempted*.34);
   state.displayDx=resisted;
   setLiveX(resisted);
   return;
  }

  let dx=state.dir<0?Math.min(0,rawDx):Math.max(0,rawDx);
  dx=Math.max(-width,Math.min(width,dx));
  state.displayDx=dx;
  setLiveX(dx);
  setNeighborX(state.neighbor,dx+(state.dir<0?width:-width));
 }

 function queueDrag(state,dx){
  state.pendingDx=dx;
  if(rafId)return;
  rafId=requestAnimationFrame(()=>{
   rafId=0;
   if(g===state)applyDrag(state,state.pendingDx);
  });
 }

 function beginHorizontal(state,dx){
  const index=PRIMARY_PAGE_ORDER.indexOf(section);
  if(index<0)return false;

  state.dir=dx<0?-1:1;
  state.target=state.dir<0
   ?(index<PRIMARY_PAGE_ORDER.length-1?PRIMARY_PAGE_ORDER[index+1]:null)
   :(index>0?PRIMARY_PAGE_ORDER[index-1]:null);
  state.width=Math.max(1,viewport.clientWidth);
  state.neighbor=state.target?neighborNodes.get(state.target)||null:null;

  // Idle prewarming normally makes this branch unnecessary. If the user swipes
  // immediately after a render, build only the one required neighbour once here.
  if(state.target&&!state.neighbor){
   state.neighbor=makeNeighborNode(state.target,state.dir<0?'right':'left');
   setNeighborX(state.neighbor,state.dir<0?state.width:-state.width);
  }

  busy=true;
  ++prewarmToken; // cancel pending idle rebuild
  state.axis='x';
  trackingOn();
  if(state.neighbor)state.neighbor.classList.add('rc62-active');
  applyDrag(state,dx);
  return true;
 }

 function settle(state,commit){
  if(rafId){cancelAnimationFrame(rafId);rafId=0}
  if(state.pendingDx!==undefined)applyDrag(state,state.pendingDx);

  const width=state.width||Math.max(1,viewport.clientWidth);
  const dx=state.displayDx||0;
  const currentEnd=commit?(state.dir<0?-width:width):0;
  const neighborEnd=commit?0:(state.dir<0?width:-width);
  const remaining=commit?Math.max(0,width-Math.abs(dx)):Math.abs(dx);
  const duration=Math.max(115,Math.min(230,110+145*(remaining/width)));
  const ease=commit?'cubic-bezier(.2,.85,.32,1)':'cubic-bezier(.18,.88,.3,1.05)';

  const participants=[live,floatingLive,backToTop,state.neighbor].filter(Boolean);
  for(const el of participants){
   el.classList.add('rc62-settling');
   el.style.setProperty('--rc62-duration',duration+'ms');
   el.style.setProperty('--rc62-ease',ease);
  }

  // Force transition start from the exact last tracking frame.
  void live.offsetWidth;
  requestAnimationFrame(()=>{
   setLiveX(currentEnd);
   if(state.neighbor)setNeighborX(state.neighbor,neighborEnd);
  });

  let done=false;
  const finish=()=>{
   if(done)return;
   done=true;

   if(commit&&state.target){
    rc27PageScroll[section]=live.scrollTop||0;
    section=state.target;
    rc27TargetScroll=rc27PageScroll[state.target]||0;
    rc6ApplyPageDefaults(state.target);
    rc20TransitionDir=0;
    rc23OldPageHTML='';
    rc55OldFloatingHTML='';
    rc55OldFloatingVisible=false;

    // Render while the warm neighbour still covers the viewport at x=0.
    render();
   }

   trackingOff();
   removeNeighborNodes();
   busy=false;
   window.__rc54PlaceFloating?.();
   updateBackToTop();
   schedulePrewarm();
  };

  const endNode=state.neighbor||live;
  endNode.addEventListener('transitionend',finish,{once:true});
  setTimeout(finish,duration+60);
 }

 document.addEventListener('touchstart',e=>{
  if(!compactViewport()||e.touches.length!==1||busy||rc27Animating||selection.size||section==='settings'||blockedTarget(e.target)){
   g=null;return;
  }
  if(!e.target.closest('#pageViewport,#floatingControls')){g=null;return}

  const t=e.touches[0];
  g={
   id:t.identifier,
   x:t.clientX,y:t.clientY,
   lastX:t.clientX,lastY:t.clientY,
   lastTime:performance.now(),
   velocityX:0,
   axis:'',
   dir:0,target:null,neighbor:null,
   width:0,displayDx:0,pendingDx:0
  };
 },{passive:true});

 document.addEventListener('touchmove',e=>{
  if(!g||e.touches.length!==1)return;
  const t=[...e.touches].find(x=>x.identifier===g.id);
  if(!t)return;

  const now=performance.now(),dx=t.clientX-g.x,dy=t.clientY-g.y;
  const ax=Math.abs(dx),ay=Math.abs(dy);

  if(!g.axis&&Math.max(ax,ay)>=10){
   if(ax>ay*1.16){
    if(!beginHorizontal(g,dx)){g=null;return}
   }else if(ay>ax*1.08){
    g.axis='y';
   }
  }

  if(g.axis==='x'){
   const dt=Math.max(1,now-g.lastTime);
   // A light low-pass filter avoids one noisy touch sample deciding the release.
   const sample=(t.clientX-g.lastX)/dt;
   g.velocityX=g.velocityX*.62+sample*.38;
   queueDrag(g,dx); // no DOM writes here; transform updates happen once per display frame
   if(e.cancelable)e.preventDefault();
  }

  g.lastX=t.clientX;
  g.lastY=t.clientY;
  g.lastTime=now;
 },{passive:false});

 function finish(e){
  if(!g)return;
  const state=g;g=null;
  if(state.axis!=='x')return;

  let t=null;
  if(e.changedTouches){
   for(const x of e.changedTouches)if(x.identifier===state.id){t=x;break}
  }
  const endX=t?t.clientX:state.lastX;
  const dx=endX-state.x;
  state.pendingDx=dx;
  applyDrag(state,dx);

  const progress=Math.abs(state.displayDx||0)/(state.width||1);
  const velocity=state.velocityX||0;
  const velocityTowardTarget=state.dir<0?velocity<-.34:velocity>.34;
  const directionStillValid=state.dir<0?dx<0:dx>0;
  const commit=!!state.target&&directionStillValid&&(progress>=.28||velocityTowardTarget);

  suppressClickUntil=Date.now()+430;
  settle(state,commit);
 }

 document.addEventListener('touchend',finish,{passive:true});
 document.addEventListener('touchcancel',()=>{
  if(g?.axis==='x'){
   const state=g;g=null;
   settle(state,false);
  }else g=null;
 },{passive:true});

 document.addEventListener('click',e=>{
  if(Date.now()<suppressClickUntil&&e.target.closest('#pageViewport,#floatingControls')){
   e.preventDefault();
   e.stopImmediatePropagation();
  }
 },true);

 window.addEventListener('resize',()=>{
  if(!compactViewport()){removeNeighborNodes();trackingOff();busy=false;return}
  if(!busy)positionPrewarmed();
 },{passive:true});

 // Warm the first pair after initial boot as well.
 schedulePrewarm();
})();

/* rc114-rc728-desktop-keyboard */
(()=>{
 document.addEventListener('keydown',e=>{
  if(!matchMedia('(min-width:761px)').matches)return;

  if(e.target?.closest?.('.entry-date-action')&&(e.key==='Enter'||e.key===' ')){
   e.preventDefault();openEntryDatePicker();return
  }

  let form=document.querySelector('#entry');
  if(!form||e.ctrlKey||e.metaKey||e.altKey)return;

  let target=e.target,
      isAmount=target?.id==='amountInput',
      otherEditable=!isAmount&&target?.matches?.('input,textarea,select,[contenteditable="true"]');
  if(otherEditable)return;

  let key=e.key,map={'-':'−','–':'−','—':'−','*':'×','x':'×','X':'×','/':'÷','Decimal':'.'},
      value=map[key]||key;

  if(/^\d$/.test(value)||value==='.'||['+','−','×','÷','='].includes(value)){
   e.preventDefault();pressAmountKey(value);return
  }
  if(key==='Backspace'){
   e.preventDefault();pressAmountKey('⌫');return
  }
 },true);
})();

/* rc114-rc729-account-level3-continuity */
(()=>{
 const overlay=document.querySelector('#overlay');
 if(!overlay)return;
 new MutationObserver(()=>{
   if(matchMedia('(max-width:760px)').matches)return;
   if(document.body.dataset.tertiary!=='account')return;
   const panel=overlay.querySelector(':scope > .account-dialog-back');
   if(panel&&!panel.classList.contains('app-level3-panel'))activateAppTertiary('account');
 }).observe(overlay,{childList:true});
})();

/* rc114-rc7210-level-width-sync */
(()=>{
 const sync=()=>{try{syncDesktopLevelWidths()}catch(e){}};
 window.addEventListener('resize',sync,{passive:true});
 window.addEventListener('orientationchange',sync,{passive:true});
 requestAnimationFrame(sync);
 setTimeout(sync,320);
})();

/* rc114-rc7211-sidebar-resize-observer */
(()=>{
 if(!('ResizeObserver' in window))return;
 const side=document.querySelector('.side');
 if(!side)return;
 const ro=new ResizeObserver(()=>{try{syncDesktopLevelWidths()}catch(e){}});
 ro.observe(side);
})();

/* rc114-rc7213-sidebar-transition-sync */
(()=>{
 const side=document.querySelector('.side');
 if(!side)return;
 side.addEventListener('transitionend',e=>{
   if(e.propertyName==='width'){try{syncDesktopLevelWidths()}catch(err){}}
 });
})();

/* legacy-inline-15 */
(()=>{
const RC12_RELATIONS_FILE='StarLedgerRelations.json';
const RC12_ROLE_LABELS={auto:'自动',transfer:'转账本金',expense:'消费',fee:'手续费',refund:'退款',rebate:'返现/红包',normal:'普通关联'};
const RC12_ROLE_OPTIONS=Object.entries(RC12_ROLE_LABELS);
let rc12Relations=rc12NormalizeRelations(BOOT?.relations||{}),rc12RelationsLoaded=!!BOOT?.relations,rc12Task=null,rc12TaskInternal=false,rc12TaskSeq=0,rc12RelationPickerQuery='';
const rc12BaseEntryForm=entryForm,rc12BaseForm=form,rc12BaseRecords=records,rc12BaseRenderSelection=renderSelection,rc12BaseClose=close,rc12BaseBudgetState=budgetState,rc12BaseConnectFolder=connectFolder,rc12BaseRefreshDelta=refreshDelta,rc12BasePerformDelete=performDelete,rc12BaseNativeCommand=nativeCommand;

function rc12Uid(prefix='D'){return prefix+'-'+Date.now().toString(36)+'-'+(++rc12TaskSeq).toString(36)+'-'+Math.random().toString(36).slice(2,7)}
function rc12NormalizeRelations(value){
 let groups=Array.isArray(value?.groups)?value.groups:[],seen=new Set(),out=[];
 for(let raw of groups){if(!raw||typeof raw!=='object')continue;let id=String(raw.id||'').trim();if(!id||seen.has(id))continue;seen.add(id);let members=[],mseen=new Set();for(let m of Array.isArray(raw.members)?raw.members:[]){let mid=String(typeof m==='string'?m:m?.id||'').trim();if(!mid||mseen.has(mid))continue;mseen.add(mid);members.push({id:mid,role:String(typeof m==='object'&&m?.role||'auto')})}if(members.length>=2)out.push({id,type:String(raw.type||'compound'),members,virtualAdjustments:Array.isArray(raw.virtualAdjustments)?raw.virtualAdjustments:[],createdAt:String(raw.createdAt||''),updatedAt:String(raw.updatedAt||'')})}
 let suppressedLegacy=[...new Set((Array.isArray(value?.suppressedLegacy)?value.suppressedLegacy:[]).map(x=>String(x||'').trim()).filter(Boolean))];
 return {groups:out,suppressedLegacy,updatedAt:String(value?.updatedAt||'')}
}
function rc12CloneRelations(value=rc12Relations){return rc12NormalizeRelations(JSON.parse(JSON.stringify(value||{})))}
nativeCommand=function(action,record,id,extra={}){return rc12BaseNativeCommand(action,record,id,extra).then(result=>{if(result?.relations)rc12Relations=rc12NormalizeRelations(result.relations);return result})};
function rc12ParseExtras(r){try{let v=JSON.parse(r?.extras||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch(e){return {}}}
function rc12LegacyGroups(){
 let suppressed=new Set(rc12Relations.suppressedLegacy||[]),map=new Map();for(let r of rows){let rel=String(rc12ParseExtras(r).relation||'').trim();if(!rel)continue;let list=map.get(rel)||[];list.push(r.id);map.set(rel,list)}
 return [...map].filter(([rel,ids])=>ids.length>=2&&!suppressed.has('legacy:'+rel)).map(([rel,ids])=>({id:'legacy:'+rel,type:'legacy',members:ids.map(id=>({id,role:rc12InferRole(rows.find(r=>r.id===id))})),legacy:true,createdAt:'',updatedAt:''}))
}
function rc12AllGroups(){
 let explicit=rc12Relations.groups||[],claimed=new Set(explicit.flatMap(g=>g.members.map(m=>m.id))),legacy=rc12LegacyGroups().map(g=>({...g,members:g.members.filter(m=>!claimed.has(m.id))})).filter(g=>g.members.length>=2);return [...explicit,...legacy]
}
function rc12GroupForBill(id){return rc12AllGroups().find(g=>g.members.some(m=>m.id===id))||null}
function rc12GroupRole(group,id){return group?.members?.find(m=>m.id===id)?.role||'auto'}
function rc12InferRole(r){
 if(!r)return'auto';let text=[r.category,r.subcategory,r.note,r.merchant,r.tags].join(' ');
 if(r.type==='转账')return'transfer';
 if(/手续费|服务费|附加费/.test(text))return'fee';
 if(r.type==='收入'&&/退款|退回|退款返款/.test(text))return'refund';
 if(r.type==='收入'&&/返现|红包|奖励|优惠返/.test(text))return'rebate';
 if(r.type==='支出')return'expense';
 return'normal'
}
function rc12ResolvedRole(group,r){let role=rc12GroupRole(group,r?.id);return !role||role==='auto'?rc12InferRole(r):role}
function rc12BudgetImpact(r){let n=cnyAmount(r);if(n===null)return null;let g=rc12GroupForBill(r.id);if(!g)return r.type==='支出'?n:0;let role=rc12ResolvedRole(g,r);if(role==='transfer')return 0;if(role==='refund'||role==='rebate')return-n;if(role==='fee'||role==='expense')return n;return r.type==='支出'?n:0}
function rc12GroupBudget(group){let total=0,other=0;for(let m of group?.members||[]){let r=rows.find(x=>x.id===m.id);if(!r)continue;let n=rc12BudgetImpact(r);if(n===null)other++;else total+=n}return {total,other}}

async function rc12ReadRelationsDesktop(){
 if(folderHandle&&await permission(folderHandle,'read')){try{let fh=await folderHandle.getFileHandle(RC12_RELATIONS_FILE),file=await fh.getFile(),store=JSON.parse(await file.text());return rc12NormalizeRelations(store?.ledgers?.[prefs.mainName]||{})}catch(e){if(e.name!=='NotFoundError')console.warn(e)}}
 let local=await get('relations:'+String(prefs.mainName||''));return rc12NormalizeRelations(local||{})
}
async function rc12WriteRelationsDesktop(value){
 value=rc12NormalizeRelations(value);value.updatedAt=new Date().toISOString();
 if(folderHandle){
  if(!await permission(folderHandle,'readwrite',true))throw Error('需要允许修改 StarLedger/Data 文件夹');let store={format:'star-ledger-relations',version:1,updatedAt:value.updatedAt,ledgers:{}};
  try{let fh=await folderHandle.getFileHandle(RC12_RELATIONS_FILE),file=await fh.getFile(),parsed=JSON.parse(await file.text());if(parsed&&parsed.format==='star-ledger-relations'&&parsed.version===1&&parsed.ledgers)store=parsed}catch(e){if(e.name!=='NotFoundError')throw e}
  store={...store,format:'star-ledger-relations',version:1,updatedAt:value.updatedAt,ledgers:{...(store.ledgers||{}),[prefs.mainName]:value}};let fh=await folderHandle.getFileHandle(RC12_RELATIONS_FILE,{create:true}),w=await fh.createWritable();await w.write(JSON.stringify(store));await w.close()
 }
 await put('relations:'+String(prefs.mainName||''),value);return value
}
async function rc12LoadRelations(force=false){
 try{let next;if(native){let r=await nativeCommand('loadRelations');next=r.relations}else next=await rc12ReadRelationsDesktop();rc12Relations=rc12NormalizeRelations(next||{});rc12RelationsLoaded=true;if(force)render();return rc12Relations}catch(e){console.warn('relations load failed',e);rc12RelationsLoaded=true;return rc12Relations}
}
async function rc12SaveRelations(value){let next=rc12NormalizeRelations(value);if(native){let r=await nativeCommand('saveRelations',null,null,{relations:next});next=rc12NormalizeRelations(r.relations||next)}else next=await rc12WriteRelationsDesktop(next);rc12Relations=next;render();return next}

// Budget remains raw for ordinary bills. Only linked bills gain relation semantics.
budgetState=function(){let scoped=rows.filter(r=>!recordHidden(r)&&inCycle(dateOf(r),year,month)),spent=0;for(let r of scoped){let impact=rc12BudgetImpact(r);if(impact!==null)spent+=impact}let {has,value}=currentBudget();return {spent,has,value,left:value-spent}};

records=function(rs,limit=10){
 if(!rs.length)return '<div class="empty">没有符合条件的账单</div>';let shown=rs.slice(0,limit);return shown.map((r,i)=>{let next=shown[i+1],monthBreak=!!next&&ym(r)!==ym(next),group=rc12GroupForBill(r.id),badge=group?`<small class="relation-badge">关联 · ${group.members.length}</small>`:'';return `<div class="row ${monthBreak?'month-break':''} ${group?'compound-row':''}" data-rowid="${esc(r.id)}"><input class="rowcheck" type="checkbox" data-check="${esc(r.id)}" aria-label="选择账单" ${selection.has(r.id)?'checked':''}><button data-id="${esc(r.id)}"><span class="record-copy"><span class="record-first"><b class="title">${esc(recordHeadline(r))}</b><small class="record-wallet">－ ${esc(r.account||'未选账户')}</small>${badge}</span><small class="record-note">${esc((prefs.recordTitle==='note'?[r.category,r.subcategory].filter(Boolean).join(' / '):r.note)||'　')}</small><small class="record-time">${esc(String(r.date||'').replace('T',' ').slice(0,19))}</small></span><span class="record-amount"><span class="amount ${r.type==='支出'?'negative':r.type==='收入'?'positive':''}">${r.type==='支出'?'-':''}${money(amount(r),r.currency)}</span>${!isCNY(r)&&cnyAmount(r)!==null?`<small class="amount-converted">≈ ${money(cnyAmount(r))}</small>`:''}</span></button></div>`}).join('')
};

let bulkEditDraft=null;
const BULK_EDIT_FIELDS=[
 ['type','类型'],['category','大类'],['subcategory','小类'],['amount','金额'],
 ['account','账户'],['account2','转入账户'],['book','账本'],['currency','币种'],
 ['merchant','商家'],['note','备注'],['tags','标签'],['date','日期']
];
function bulkSelectedRows(){let ids=new Set(selection);return rows.filter(r=>ids.has(r.id))}
function bulkSharedValue(field){
 let values=[...new Set(bulkSelectedRows().map(r=>String(r[field]??'').trim()))];
 if(values.length===1)return values[0]||'空';
 return values.length?'多个值':'空'
}
function bulkOpLabel(field,op){
 if(!op)return '未修改';
 if(op.mode==='clear')return '清除';
 let value=String(op.value??'').trim();
 if(field==='tags'){
   if(op.mode==='append')return '追加：'+value;
   if(op.mode==='remove')return '移除：'+value;
 }
 if(field==='note'&&op.mode==='append')return '追加：'+value;
 return '改为：'+value
}
function bulkEditOptions(field){
 let values=[];
 if(field==='type')values=['支出','收入','转账','借贷','应付款','应收款'];
 else if(field==='category')values=[...new Set(rows.map(r=>String(r.category||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 else if(field==='subcategory')values=[...new Set(rows.map(r=>String(r.subcategory||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 else if(field==='account'||field==='account2')values=accountNames();
 else if(field==='book')values=orderedBookNames(false);
 else if(field==='currency')values=[...new Set(rows.map(r=>String(r.currency||'').trim()).filter(Boolean))];
 return values
}
function renderBulkEditMain(){
 if(!bulkEditDraft)return;
 let count=bulkEditDraft.ids.length,changed=Object.keys(bulkEditDraft.ops).length;
 $('#overlay').innerHTML=`<div class="modalback account-dialog-back bulk-edit-back"><div class="modal account-config bulk-edit-sheet">
   <div class="account-config-head bulk-edit-head"><h2>修改 ${count} 笔账单</h2><div class="account-head-actions"><button type="button" id="closeBulkEdit">取消</button></div></div>
   <p class="muted bulk-edit-intro">这里只设置批量规则。未修改的字段保持每笔原值；已设置的字段会统一应用到全部 ${count} 笔。</p>
   <div class="bulk-edit-list">
    ${BULK_EDIT_FIELDS.map(([field,label])=>`<button type="button" class="bulk-edit-item" data-bulkfield="${field}">
      <span class="bulk-edit-copy"><b>${label}</b><small>当前：${esc(bulkSharedValue(field))}</small></span>
      <span class="bulk-edit-state ${bulkEditDraft.ops[field]?'changed':''}">${esc(bulkOpLabel(field,bulkEditDraft.ops[field]))}<i>›</i></span>
    </button>`).join('')}
   </div>
   <div class="bulk-edit-summary">${changed?`已设置 ${changed} 个字段，将应用到 ${count} 笔账单`:'尚未设置修改内容'}</div>
   <div class="modalfooter bulk-edit-footer"><button type="button" class="button" id="closeBulkEdit">取消</button><button type="button" class="button primary" id="applyBulkEdit" ${changed?'':'disabled'}>应用修改</button></div>
 </div></div>`;
 document.body.classList.add('dialog-open')
}
function renderBulkFieldEditor(field){
 if(!bulkEditDraft)return;
 let label=BULK_EDIT_FIELDS.find(x=>x[0]===field)?.[1]||field,op=bulkEditDraft.ops[field]||null,
     weak=['merchant','note','tags'].includes(field),values=bulkEditOptions(field),mode=op?.mode||'replace',value=String(op?.value??'');
 let modeButtons='';
 if(field==='tags')modeButtons=[['replace','替换'],['append','追加'],['remove','移除'],['clear','清除']].map(([k,l])=>`<button type="button" class="${mode===k?'active':''}" data-bulkmode="${k}">${l}</button>`).join('');
 else if(field==='note')modeButtons=[['replace','替换'],['append','追加'],['clear','清除']].map(([k,l])=>`<button type="button" class="${mode===k?'active':''}" data-bulkmode="${k}">${l}</button>`).join('');
 else if(field==='merchant')modeButtons=[['replace','替换'],['clear','清除']].map(([k,l])=>`<button type="button" class="${mode===k?'active':''}" data-bulkmode="${k}">${l}</button>`).join('');
 let input='';
 if(mode!=='clear'){
   if(values.length)input=`<select id="bulkFieldValue">${values.map(v=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(field==='currency'?currencyLabel(currencyCode(v)):v)}</option>`).join('')}</select>`;
   else if(field==='date')input=`<input id="bulkFieldValue" type="datetime-local" value="${esc(value.replace(' ','T').slice(0,16))}">`;
   else if(field==='amount')input=`<input id="bulkFieldValue" type="number" min="0.01" step="0.01" inputmode="decimal" value="${esc(value)}" placeholder="统一金额">`;
   else if(field==='note')input=`<textarea id="bulkFieldValue" rows="4" placeholder="${mode==='append'?'追加到每笔备注后面':'统一备注'}">${esc(value)}</textarea>`;
   else input=`<input id="bulkFieldValue" type="text" value="${esc(value)}" placeholder="${field==='tags'?'标签，多个可用逗号分隔':'统一修改为…'}">`;
 }
 $('#overlay').innerHTML=`<div class="modalback account-dialog-back bulk-edit-back"><div class="modal account-config bulk-edit-sheet bulk-field-sheet" data-bulkfieldeditor="${field}">
   <div class="account-config-head bulk-edit-head"><h2>${esc(label)}</h2><div class="account-head-actions"><button type="button" id="backBulkEdit">返回</button></div></div>
   <p class="muted">当前选中的 ${bulkEditDraft.ids.length} 笔会一起修改；这里不会逐笔设置。</p>
   ${weak?`<div class="bulk-edit-modes">${modeButtons}</div>`:''}
   <label class="field bulk-field-control" ${mode==='clear'?'hidden':''}><span>${mode==='append'?'追加内容':mode==='remove'?'移除内容':'统一改为'}</span>${input}</label>
   ${mode==='clear'?'<div class="bulk-clear-note">这个字段会从全部已选账单中清空。</div>':''}
   <div class="modalfooter"><button type="button" class="button" id="removeBulkFieldOp" ${op?'':'disabled'}>恢复未修改</button><button type="button" class="button primary" id="saveBulkField">确定</button></div>
 </div></div>`;
 document.body.classList.add('dialog-open')
}
function openBulkEditSelection(){
 let ids=[...selection];if(!ids.length)return;
 bulkEditDraft={ids,ops:{}};
 renderBulkEditMain()
}
function setBulkEditMode(mode){
 let sheet=document.querySelector('[data-bulkfieldeditor]');if(!sheet||!bulkEditDraft)return;
 let field=sheet.dataset.bulkfieldeditor,old=bulkEditDraft.ops[field];
 bulkEditDraft.ops[field]={mode,value:old?.value||''};
 renderBulkFieldEditor(field)
}
function saveBulkField(){
 let sheet=document.querySelector('[data-bulkfieldeditor]');if(!sheet||!bulkEditDraft)return;
 let field=sheet.dataset.bulkfieldeditor,op=bulkEditDraft.ops[field]||{mode:'replace',value:''},mode=op.mode||'replace',input=$('#bulkFieldValue'),value=mode==='clear'?'':String(input?.value??'').trim();
 if(mode!=='clear'&&!value){toast('请填写修改内容');return}
 if(field==='amount'&&(!(Number(value)>0)||!Number.isFinite(Number(value)))){toast('金额必须大于 0');return}
 if(field==='date'){value=value.replace('T',' ');if(value.length===16)value+=':00'}
 bulkEditDraft.ops[field]={mode,value};renderBulkEditMain()
}
function clearBulkFieldOp(){
 let sheet=document.querySelector('[data-bulkfieldeditor]');if(!sheet||!bulkEditDraft)return;
 delete bulkEditDraft.ops[sheet.dataset.bulkfieldeditor];renderBulkEditMain()
}
function applyBulkOperation(record,field,op){
 let next={...record},value=op.value??'';
 if(field==='tags'){
   let existing=tagParts(next.tags),incoming=String(value).split(/[,，]/).map(x=>x.trim()).filter(Boolean);
   if(op.mode==='clear')next.tags='';
   else if(op.mode==='append')next.tags=[...new Set([...existing,...incoming])].join(', ');
   else if(op.mode==='remove'){let drop=new Set(incoming);next.tags=existing.filter(x=>!drop.has(x)).join(', ')}
   else next.tags=[...new Set(incoming)].join(', ')
 }else if(field==='note'&&op.mode==='append'){
   next.note=[String(next.note||'').trim(),String(value).trim()].filter(Boolean).join(' ')
 }else if(op.mode==='clear')next[field]='';
 else next[field]=field==='amount'?String(Number(value)):value;
 return next
}
async function applyBulkEditSelection(){
 if(!bulkEditDraft||!Object.keys(bulkEditDraft.ops).length){toast('还没有设置修改内容');return}
 let ids=new Set(bulkEditDraft.ids),ops=bulkEditDraft.ops,now=new Date().toISOString(),
     next=rows.map(r=>{if(!ids.has(r.id))return r;let n={...r};for(let [field,op] of Object.entries(ops))n=applyBulkOperation(n,field,op);n.updated_at=now;return n});
 await localWrite('replaceLedger',null,null,{csv:csvWrite(next),mainName:prefs.mainName,allowEmpty:true});
 let count=ids.size;bulkEditDraft=null;selection.clear();close();render();renderSelection();toast('已批量修改 '+count+' 笔账单')
}

window.__slBulkEdit={
 open:openBulkEditSelection,
 field:renderBulkFieldEditor,
 mode:setBulkEditMode,
 back:renderBulkEditMain,
 close:()=>{bulkEditDraft=null;close()},
 remove:clearBulkFieldOp,
 save:saveBulkField,
 apply:applyBulkEditSelection
};

renderSelection=function(){
 document.body.classList.toggle('selecting',selection.size>0);let ids=[...selection],groups=ids.map(rc12GroupForBill).filter(Boolean),same=ids.length>=2&&groups.length===ids.length&&groups.every(g=>g.id===groups[0].id),relLabel=same?'解除关联':'关联';
 $('#selectionBar').innerHTML=selection.size?`<button class="button" id="selectAllVisible">全选</button><button class="button" id="cancelSelection">取消</button><button class="button" id="bulkEditSelection">修改</button><button class="button selection-relate" id="rc12RelateSelection" ${selection.size<2&&!same?'disabled':''}>${relLabel}</button><button class="button danger selection-delete" id="deleteSelection">删除 ${selection.size} 笔</button>`:'';document.querySelectorAll('.rowcheck').forEach(input=>{input.checked=selection.has(input.dataset.check);input.closest('.row').classList.toggle('selected',input.checked)});document.body.classList.toggle('selection-all-visible',!!document.querySelectorAll('#searchResults .rowcheck').length&&[...document.querySelectorAll('#searchResults .rowcheck')].every(input=>selection.has(input.dataset.check)))
};

function rc12TaskKey(record,index=0){return record?.id?'bill:'+record.id:rc12Uid('draft')}
function rc12NewDraft(record={},index=0){let key=rc12TaskKey(record,index);return {key,existingId:String(record?.id||''),record:{...record},relationRole:String(record?.relationRole||'auto')}}
function rc12TaskGroupForKey(key){return rc12Task?.groups?.find(g=>g.members.includes(key))||null}
function rc12TaskDraftLabel(draft,index){let r=draft.record||{},name=r.note||r.merchant||r.subcategory||r.category||r.type||'新账单',amt=Number(r.amount);return `${index+1}. ${name}${amt>0?' · '+money(amt,r.currency||'人民币'):''}`}
function rc12StartTask(recordsInput=[{}],opts={}){
 let list=(Array.isArray(recordsInput)?recordsInput:[recordsInput]).map((r,i)=>rc12NewDraft(r||{},i));if(!list.length)list=[rc12NewDraft({},0)];rc12Task={drafts:list,active:Math.max(0,Math.min(list.length-1,Number(opts.active)||0)),groups:[],detached:new Set(),legacySources:new Set(),source:opts.source||'new'};
 if(Array.isArray(opts.groups))for(let g of opts.groups){if(g?.legacy||String(g?.id||'').startsWith('legacy:'))rc12Task.legacySources.add(String(g.id));let members=(g.members||[]).map(m=>{let id=typeof m==='string'?m:m.id,found=list.find(d=>d.existingId===id||d.key===id);return found?.key}).filter(Boolean);if(members.length>=2)rc12Task.groups.push({id:g.legacy?rc12Uid('RG'):String(g.id||rc12Uid('RG')),members,roles:Object.fromEntries(members.map(k=>{let d=list.find(x=>x.key===k),raw=(g.members||[]).find(m=>(typeof m==='string'?m:m.id)===d?.existingId);return[k,String(typeof raw==='object'&&raw.role||d?.relationRole||'auto')]})),sourceId:String(g.id||'')})}
 if(Array.isArray(opts.relationHints))for(let hint of opts.relationHints){let members=(hint.members||[]).map(i=>list[Number(i)]?.key).filter(Boolean);if(members.length>=2)rc12Task.groups.push({id:rc12Uid('RG'),members,roles:Object.fromEntries(members.map((k,i)=>[k,String(hint.roles?.[i]||list.find(d=>d.key===k)?.relationRole||'auto')])),sourceId:''})}
 rc12RenderTask(0)
}
function rc12CaptureDraft(){
 let f=$('#entry');if(!rc12Task||!f)return;let draft=rc12Task.drafts[rc12Task.active],raw=Object.fromEntries(new FormData(f));raw.id=draft.existingId||'';raw.date=String(raw.date||'').replace('T',' ');if(raw.date.length===16)raw.date+=':00';if(raw.book==='__new_book__')raw.book=String(raw.newBookName||'').trim();delete raw.newBookName;raw._fxRate=String(raw.fxRate||'');delete raw.fxRate;draft.record={...draft.record,...raw,id:draft.existingId||''}
}
function rc12DraftAmountCny(draft){let r=draft?.record||{},n=Number(normalizeAmountExpression(r.amount).replace('−','-'));if(!Number.isFinite(n)||n<=0)return null;if(currencyCode(r.currency)==='CNY')return n;let rate=Number(r._fxRate||fxInfo(r)?.rate);return Number.isFinite(rate)&&rate>0?n*rate:null}
function rc12TaskGroupBudget(group){let total=0,unknown=0;for(let key of group?.members||[]){let d=rc12Task?.drafts?.find(x=>x.key===key);if(!d)continue;let n=rc12DraftAmountCny(d);if(n===null){unknown++;continue}let role=group.roles?.[key]||d.relationRole||rc12InferRole(d.record);if(role==='refund'||role==='rebate')total-=n;else if(role==='fee'||role==='expense')total+=n;else if(role==='normal'&&d.record?.type==='支出')total+=n}return {total,unknown}}
function rc12RecordForSave(draft,index){
 let r={...draft.record};let check=amountSaveValue(r.amount);if(!check.ok)throw Error(`第 ${index+1} 笔：${check.error}`);r.amount=check.value.toFixed(2);r.date=String(r.date||'').replace('T',' ');if(r.date.length===16)r.date+=':00';let extras;try{extras=JSON.parse(r.extras||'{}');if(!extras||typeof extras!=='object'||Array.isArray(extras))extras={}}catch(e){extras={legacy:r.extras||''}}let fxText=String(r._fxRate||'').trim();if(currencyCode(r.currency)==='CNY')delete extras.fx;else if(fxText){let rate=Number(fxText);if(!Number.isFinite(rate)||rate<=0||rate>1e8)throw Error(`第 ${index+1} 笔：汇率无效`);extras.fx={rate,date:'',source:'manual',quote:'CNY'}}r.extras=Object.keys(extras).length?JSON.stringify(extras):'';delete r._fxRate;delete r.id;delete r.relationRole;validate(r);return r
}
function rc12AugmentEntry(direction=0){
 let f=$('#entry'),entry=f?.closest('.entry'),back=f?.closest('.entryback');if(!f||!entry||!back||!rc12Task)return;back.classList.toggle('rc12-multi',rc12Task.drafts.length>1);entry.classList.remove('rc12-from-left','rc12-from-right');if(direction)entry.classList.add(direction>0?'rc12-from-right':'rc12-from-left');let draft=rc12Task.drafts[rc12Task.active],group=rc12TaskGroupForKey(draft.key),gb=group?rc12TaskGroupBudget(group):null,summary=group?`关联 · ${group.members.length} 笔${gb&&!gb.unknown?' · 实际预算 '+money(gb.total):''}`:'',mobile=matchMedia('(max-width:760px)').matches;
 entry.setAttribute('role','dialog');entry.setAttribute('aria-modal','true');entry.setAttribute('aria-label',draft.existingId?'编辑账单':'记一笔');
 let old=entry.querySelector('.rc12-taskbar');if(old)old.remove();let bar=document.createElement('div');bar.className='rc12-taskbar';let relationLabel=group?`关联·${group.members.length}`:'关联',deleteLabel=draft.existingId?'移出':'删除';bar.innerHTML=`<div class="rc12-tasknav"><button type="button" id="rc12PrevDraft" aria-label="上一笔" ${rc12Task.active<=0?'disabled':''}>‹</button><b>${rc12Task.active+1}/${rc12Task.drafts.length}</b><button type="button" id="rc12NextDraft" aria-label="下一笔" ${rc12Task.active>=rc12Task.drafts.length-1?'disabled':''}>›</button>${!mobile&&summary?`<span class="rc12-current-relation">${summary}</span>`:''}</div><div class="rc12-taskactions"><button type="button" id="rc12AddDraft">＋新增</button><button type="button" id="rc12ManageRelations" ${summary?`title="${esc(summary)}"`:''}>${relationLabel}</button><button type="button" id="rc12DeleteDraft" ${rc12Task.drafts.length<=1?'disabled':''}>${deleteLabel}</button></div>`;
 let head=entry.querySelector('.entryhead'),right=head?.querySelector('.entryhead-right'),tag=f.querySelector('.entry-tag-row'),note=f.querySelector('.entry-note-card');if(head)head.insertBefore(bar,right||null);else if(tag)tag.after(bar);else if(note)note.before(bar);else f.prepend(bar);
 let h=entry.querySelector('.entryhead h2');if(h){h.hidden=mobile;h.textContent=mobile?'':(rc12Task.source==='compound'?'复合账单':'记一笔')+` · ${rc12Task.active+1}/${rc12Task.drafts.length}`}
 let ledgerBtn=entry.querySelector('#switchMain');if(ledgerBtn&&mobile){ledgerBtn.textContent=prefs.mainName||'账本';ledgerBtn.title='切换账本';ledgerBtn.setAttribute('aria-label','切换账本')}
 let submit=f.querySelector('button[type=submit]');if(submit)submit.textContent=`确认保存（${rc12Task.drafts.length}笔）`;let keySave=f.querySelector('[data-key="保存账单"]');if(keySave)keySave.textContent=`保存 ${rc12Task.drafts.length} 笔`;
 entry.dataset.rc12Task='1';
 rc12BindMobileSwipe(entry)
}
let rc123Swipe=null,rc123Motion=null,rc123Scalar=0,rc123SuppressClickUntil=0;

function rc123GhostHydrate(clone,draft,index){
 let r=draft?.record||{},type=r.type||'支出',amount=amountSeed(r.amount),date=String(r.date||'').replace(' ','T').slice(0,16);
 clone.dataset.rc123Index=String(index);
 clone.setAttribute('aria-hidden','true');
 try{clone.inert=true}catch(_e){}
 let form=clone.querySelector('form#entry');if(form)form.dataset.id=draft?.existingId||'';
 let amountInput=clone.querySelector('#amountInput');if(amountInput)amountInput.value=amount;
 let sign=clone.querySelector('.entryamount>span');if(sign)sign.textContent=type==='支出'?'−':type==='收入'?'＋':'¥';
 clone.querySelectorAll('[data-entrytype]').forEach(b=>b.classList.toggle('active',b.dataset.entrytype===type));
 const set=(name,value)=>{clone.querySelectorAll(`[name="${name}"]`).forEach(el=>{try{el.value=value??''}catch(_e){}})};
 set('type',type);set('category',r.category||'');set('subcategory',r.subcategory||'');set('account',r.account||'');set('account2',r.account2||'');set('book',r.book||'');set('currency',r.currency||'人民币');set('merchant',r.merchant||'');set('note',r.note||'');set('tags',r.tags||'');if(date)set('date',date);
 clone.querySelectorAll('[data-entrycat]').forEach(b=>b.classList.toggle('active',b.dataset.entrycat===(r.category||'')));
 clone.querySelectorAll('[data-entrysub]').forEach(b=>b.classList.toggle('active',b.dataset.entrysub===(r.subcategory||'')));
 for(const name of ['account','account2']){let input=clone.querySelector(`[name="${name}"]`),button=input?.closest('.account-picker')?.querySelector('button');if(button)button.textContent=input.value||(name==='account2'?'选择账户':'选择账户')}
 let nav=clone.querySelector('.rc12-tasknav>b');if(nav)nav.textContent=`${index+1}/${rc12Task?.drafts?.length||1}`;
 let prev=clone.querySelector('#rc12PrevDraft'),next=clone.querySelector('#rc12NextDraft');if(prev)prev.disabled=index<=0;if(next)next.disabled=index>=(rc12Task?.drafts?.length||1)-1;
 let group=rc12TaskGroupForKey(draft?.key),rel=clone.querySelector('#rc12ManageRelations');if(rel)rel.textContent=group?`关联·${group.members.length}`:'关联';
 let del=clone.querySelector('#rc12DeleteDraft');if(del)del.textContent=draft?.existingId?'移出':'删除';
 let ledger=clone.querySelector('#switchMain');if(ledger)ledger.textContent=prefs.mainName||'账本';
 let submit=clone.querySelector('button[type=submit]');if(submit)submit.textContent=`确认保存（${rc12Task?.drafts?.length||1}笔）`;
 let keySave=clone.querySelector('[data-key="保存账单"]');if(keySave)keySave.textContent=`保存 ${rc12Task?.drafts?.length||1} 笔`;
 return clone
}
function rc123MakeGhost(entry,index,kind){
 if(!rc12Task||index<0||index>=rc12Task.drafts.length)return null;
 let clone=entry.cloneNode(true);clone.classList.remove('rc12-swipe-dragging','rc12-swipe-return','rc12-from-left','rc12-from-right','rc123-live-card');clone.classList.add('rc123-stack-card','rc123-'+kind);clone.style.visibility='hidden';rc123GhostHydrate(clone,rc12Task.drafts[index],index);entry.parentElement.appendChild(clone);try{clone.scrollTop=entry.scrollTop}catch(_e){}return clone
}
function rc123SyncGeometry(pack){
 if(!pack?.entry?.isConnected)return;
 let r=pack.entry.getBoundingClientRect(),back=pack.back||pack.entry.closest('.entryback'),
     documentModal=document.documentElement.classList.contains('browser-tab')&&back?.closest('#overlay')?.classList.contains('safari-document-modal'),
     origin=documentModal&&back?back.getBoundingClientRect():null,
     left=origin?r.left-origin.left:r.left,
     top=origin?r.top-origin.top:r.top,
     w=Math.round(r.width*100)/100,
     h=Math.round(r.height*100)/100;
 for(let card of [pack.prev,pack.next,pack.next2].filter(Boolean)){
  card.style.setProperty('left',left+'px','important');
  card.style.setProperty('top',top+'px','important');
  card.style.setProperty('width',w+'px','important');
  card.style.setProperty('min-width',w+'px','important');
  card.style.setProperty('max-width',w+'px','important');
  card.style.setProperty('height',h+'px','important');
  card.style.setProperty('min-height',h+'px','important');
  card.style.setProperty('max-height',h+'px','important');
  card.style.setProperty('box-sizing','border-box','important');
 }
}
function rc123PrepareStack(entry){
 let back=entry?.closest('.entryback');if(!entry||!back)return null;
 back.querySelectorAll('.rc123-stack-card').forEach(n=>n.remove());try{back._rc123Resize?.disconnect()}catch(_e){}
 entry.classList.add('rc123-live-card');let i=rc12Task?.active??0,pack={back,entry,prev:null,next:null,next2:null};
 pack.prev=rc123MakeGhost(entry,i-1,'prev');pack.next=rc123MakeGhost(entry,i+1,'next');pack.next2=rc123MakeGhost(entry,i+2,'next2');back._rc123Pack=pack;rc123SyncGeometry(pack);
 if('ResizeObserver'in window){let ro=new ResizeObserver(()=>{rc123SyncGeometry(pack);rc123ApplyScalar(rc123Scalar,pack)});ro.observe(entry);back._rc123Resize=ro}
 rc123ApplyScalar(0,pack);return pack
}
function rc124RefreshStackAfterInsert(entry,previousCount){
 if(!entry||!rc12Task)return;let back=entry.closest('.entryback');if(!back)return;back.classList.toggle('rc12-multi',rc12Task.drafts.length>1);
 let nav=entry.querySelector('.rc12-tasknav>b'),prevBtn=entry.querySelector('#rc12PrevDraft'),nextBtn=entry.querySelector('#rc12NextDraft'),delBtn=entry.querySelector('#rc12DeleteDraft');
 if(nav)nav.textContent=`${rc12Task.active+1}/${rc12Task.drafts.length}`;if(prevBtn)prevBtn.disabled=rc12Task.active<=0;if(nextBtn)nextBtn.disabled=rc12Task.active>=rc12Task.drafts.length-1;if(delBtn)delBtn.disabled=rc12Task.drafts.length<=1;
 let submit=entry.querySelector('button[type=submit]');if(submit)submit.textContent=`确认保存（${rc12Task.drafts.length}笔）`;let keySave=entry.querySelector('[data-key="保存账单"]');if(keySave)keySave.textContent=`保存 ${rc12Task.drafts.length} 笔`;
 rc123StopMotion();rc123Swipe=null;rc123Scalar=0;
 // A one-card task had no swipe listeners yet. Once the inserted card makes it a stack,
 // bind the existing gesture system in place instead of rebuilding the live form.
 if(previousCount<2){rc12BindMobileSwipe(entry);return}
 // Existing gestures close over this pack object, so refresh its cards in place.
 let pack=back._rc123Pack;if(!pack||pack.entry!==entry){rc123PrepareStack(entry);return}
 for(let card of [pack.prev,pack.next,pack.next2])try{card?.remove()}catch(_e){}
 let i=rc12Task.active;pack.prev=rc123MakeGhost(entry,i-1,'prev');pack.next=rc123MakeGhost(entry,i+1,'next');pack.next2=rc123MakeGhost(entry,i+2,'next2');back._rc123Pack=pack;rc123SyncGeometry(pack);rc123ApplyScalar(0,pack)
}
function rc123ApplyScalar(value,pack=$('#entry')?.closest('.entryback')?._rc123Pack){
 if(!pack?.entry?.isConnected)return;let s=Math.max(-1,Math.min(1,Number(value)||0));rc123Scalar=s;let p=Math.abs(s),live=pack.entry,prev=pack.prev,next=pack.next,next2=pack.next2;
 const show=(el,on)=>{if(!el)return;el.style.visibility=on?'visible':'hidden'};
 const tr=(el,x,y,opacity,z)=>{if(!el)return;el.style.transform=`translate3d(${x}pt,${y}pt,0)`;el.style.opacity=String(Math.max(0,Math.min(1,opacity)));el.style.zIndex=String(z)};
 if(s>0){
  // Next: current peels to the upper-left; the next bill rises from +5pt to centre; the following bill becomes the new +5pt back card.
  show(prev,false);show(next,!!next);show(next2,!!next2&&p>.001);tr(live,-11*p,-11*p,1-p,4);tr(next,5*(1-p),5*(1-p),1,3);tr(next2,10-5*p,10-5*p,p,2)
 }else if(s<0){
  // Previous: previous bill fades in from the upper-left; current bill retreats to +5pt; the old back card leaves to the lower-right.
  show(prev,!!prev);show(next,!!next);show(next2,false);tr(prev,-11*(1-p),-11*(1-p),p,4);tr(live,5*p,5*p,1,3);tr(next,5+5*p,5+5*p,1-p,2)
 }else{
  // Resting state is one clean live card. Neighbour cards are revealed only
  // after a real horizontal gesture starts.
  show(prev,false);show(next,false);show(next2,false);tr(live,0,0,1,3);tr(next,5,5,1,2);tr(prev,-11,-11,0,4);tr(next2,10,10,0,1)
 }
}
function rc123StopMotion(){if(rc123Motion?.raf)cancelAnimationFrame(rc123Motion.raf);rc123Motion=null}
function rc123AnimateTo(target,onDone){
 rc123StopMotion();let from=rc123Scalar,to=Math.max(-1,Math.min(1,target)),distance=Math.abs(to-from);if(distance<.002){rc123ApplyScalar(to);onDone?.();return}
 let start=performance.now(),duration=Math.max(105,Math.min(210,95+distance*105)),motion={raf:0,cancelled:false};rc123Motion=motion;
 const tick=now=>{if(rc123Motion!==motion)return;let t=Math.min(1,(now-start)/duration),e=1-Math.pow(1-t,3);rc123ApplyScalar(from+(to-from)*e);if(t<1)motion.raf=requestAnimationFrame(tick);else{rc123Motion=null;rc123ApplyScalar(to);onDone?.()}};motion.raf=requestAnimationFrame(tick)
}
function rc123CommitDirection(dir){
 if(!rc12Task||!dir)return;let target=rc12Task.active+dir;if(target<0||target>=rc12Task.drafts.length){rc123AnimateTo(0);return}rc12CaptureDraft();rc12Task.active=target;rc123Scalar=0;rc123Swipe=null;rc123Motion=null;rc12RenderTask(0)
}
function rc123ProgrammaticSwitch(index){
 if(!rc12Task||index<0||index>=rc12Task.drafts.length||index===rc12Task.active)return;let dir=index>rc12Task.active?1:-1;if(Math.abs(index-rc12Task.active)!==1){rc12CaptureDraft();rc12Task.active=index;rc123Scalar=0;rc12RenderTask(0);return}rc123AnimateTo(dir,()=>rc123CommitDirection(dir))
}
function rc12BindMobileSwipe(entry){
 if(!entry||!matchMedia('(max-width:760px)').matches||!rc12Task)return;let back=entry.closest('.entryback');if(!back)return;rc123StopMotion();rc123Scalar=0;let pack=rc123PrepareStack(entry);if(rc12Task.drafts.length<2)return;
 const blocked=target=>!!target.closest('input,textarea,select,[contenteditable="true"],.category-tabs,.entry-selected-tags,.tag-choices,.account-options,.search-results');
 // rc12.5: a full card transition needs a deliberately longer drag. Halfway is the only commit threshold.
 const travel=()=>Math.max(150,Math.min(210,entry.clientWidth*.46));
 entry.addEventListener('touchstart',ev=>{
  if(ev.touches.length!==1||blocked(ev.target))return;
  rc123StopMotion();let t=ev.touches[0];
  // Lock one gesture to the page that was active when the finger went down. It may end only on that page or one adjacent page.
  rc123Swipe={id:t.identifier,x:t.clientX,y:t.clientY,axis:'',startIndex:rc12Task.active,startScalar:rc123Scalar,moved:false}
 }, {passive:true});
 entry.addEventListener('touchmove',ev=>{
  let g=rc123Swipe;if(!g||ev.touches.length!==1||rc12Task.active!==g.startIndex)return;
  let t=[...ev.touches].find(x=>x.identifier===g.id);if(!t)return;
  let dx=t.clientX-g.x,dy=t.clientY-g.y,ax=Math.abs(dx),ay=Math.abs(dy);
  if(!g.axis&&Math.max(ax,ay)>=7){if(ax>ay*1.06)g.axis='x';else if(ay>ax*1.08)g.axis='y'}
  if(g.axis!=='x')return;if(ev.cancelable)ev.preventDefault();g.moved=true;
  // rc12.5 reverses the pager direction: drag left -> next page, drag right -> previous page.
  let raw=g.startScalar-dx/travel(),hasNext=g.startIndex<rc12Task.drafts.length-1,hasPrev=g.startIndex>0;
  // Never let a single touch gesture travel beyond one adjacent page. At an edge keep only a small elastic resistance.
  raw=Math.max(-1,Math.min(1,raw));if(raw>0&&!hasNext)raw=Math.min(.16,raw*.22);if(raw<0&&!hasPrev)raw=Math.max(-.16,raw*.22);
  back.classList.add('rc123-tracking');rc123ApplyScalar(raw,pack)
 }, {passive:false});
 const finish=()=>{
  let g=rc123Swipe;if(!g)return;rc123Swipe=null;back.classList.remove('rc123-tracking');
  if(g.axis!=='x'||rc12Task.active!==g.startIndex){if(Math.abs(rc123Scalar)>.001)rc123AnimateTo(0);return}
  let s=rc123Scalar,dir=s>0?1:s<0?-1:0,valid=dir>0?g.startIndex<rc12Task.drafts.length-1:dir<0?g.startIndex>0:false;
  // No velocity shortcut: >= 50% finishes the page switch; < 50% always returns to the original page.
  let commit=valid&&Math.abs(s)>=.5;rc123SuppressClickUntil=Date.now()+420;
  if(commit)rc123AnimateTo(dir,()=>{if(rc12Task&&rc12Task.active===g.startIndex)rc123CommitDirection(dir)});else rc123AnimateTo(0)
 };
 entry.addEventListener('touchend',finish,{passive:true});entry.addEventListener('touchcancel',()=>{if(!rc123Swipe)return;rc123Swipe=null;back.classList.remove('rc123-tracking');rc123AnimateTo(0)},{passive:true});
 if(!window.__rc123ClickGuard){window.__rc123ClickGuard=true;window.addEventListener('click',ev=>{if(Date.now()<rc123SuppressClickUntil&&ev.target?.closest?.('.entry[data-rc12-task="1"]')){ev.preventDefault();ev.stopImmediatePropagation()}},true)}
}
function rc12RenderTask(direction=0){
 if(!rc12Task)return;let draft=rc12Task.drafts[rc12Task.active],hadEntry=!!$('#entry'),oldInstant=entryInstantRender;rc123StopMotion();rc123Swipe=null;rc123Scalar=0;
 rc12TaskInternal=true;if(hadEntry)entryInstantRender=true;
 try{rc12BaseEntryForm({...draft.record,id:draft.existingId||''})}finally{entryInstantRender=oldInstant;rc12TaskInternal=false}
 rc12AugmentEntry(matchMedia('(max-width:760px)').matches?0:direction)
}
function rc12SwitchDraft(index,direction=0){if(!rc12Task||index<0||index>=rc12Task.drafts.length||index===rc12Task.active)return;if(matchMedia('(max-width:760px)').matches&&$('#entry')){rc123ProgrammaticSwitch(index);return}rc12CaptureDraft();rc12Task.active=index;rc12RenderTask(direction||1)}
function rc12AddDraft(){if(!rc12Task)return;rc12CaptureDraft();let current=rc12Task.drafts[rc12Task.active]?.record||{},from=rc12Task.active,now=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,19),record={type:'支出',amount:'',date:now,account:current.account||'',book:current.book||unique('book')[0]||'',currency:current.currency||'人民币',category:'',subcategory:'',merchant:'',note:'',tags:''},draft=rc12NewDraft(record);if(matchMedia('(max-width:760px)').matches&&$('#entry')){let previousCount=rc12Task.drafts.length;rc12Task.drafts.splice(from+1,0,draft);rc124RefreshStackAfterInsert($('#entry').closest('.entry'),previousCount);return}let target=rc12Task.drafts.length;rc12Task.drafts.push(draft);rc12Task.active=target;rc12RenderTask(1)}
function rc12DeleteCurrentDraft(){if(!rc12Task||rc12Task.drafts.length<=1)return;rc12CaptureDraft();let removed=rc12Task.drafts.splice(rc12Task.active,1)[0];for(let g of rc12Task.groups){delete g.roles[removed.key];g.members=g.members.filter(k=>k!==removed.key)}rc12Task.groups=rc12Task.groups.filter(g=>g.members.length>=2);rc12Task.active=Math.min(rc12Task.active,rc12Task.drafts.length-1);rc12RenderTask(matchMedia('(max-width:760px)').matches?0:-1)}
function rc12RoleSelect(key,current){return `<select data-rc12-role="${esc(key)}">${RC12_ROLE_OPTIONS.map(([v,l])=>`<option value="${v}" ${v===current?'selected':''}>${l}</option>`).join('')}</select>`}
function rc12OpenRelationManager(){
 if(!rc12Task)return;rc12CaptureDraft();let activeKey=rc12Task.drafts[rc12Task.active].key,activeGroup=rc12TaskGroupForKey(activeKey),checked=new Set(activeGroup?.members||[]);$('#accountOverlay').innerHTML=`<div class="modalback entry-choice-back"><div class="modal entry-choice-card rc12-relation-sheet"><div class="sectionhead"><h2>关联本次账单</h2><button type="button" id="closeEntrySheet">完成</button></div><p class="muted">同一任务可以有多笔账单，只有选中的账单形成关联组。每笔账单最多属于一个组。</p><form id="rc12RelationForm"><div class="rc12-relation-list">${rc12Task.drafts.map((d,i)=>{let belongs=rc12TaskGroupForKey(d.key),groupNo=belongs?rc12Task.groups.indexOf(belongs)+1:0,current=belongs?.roles?.[d.key]||d.relationRole||rc12InferRole(d.record);return `<label class="rc12-relation-item"><input type="checkbox" name="member" value="${esc(d.key)}" ${checked.has(d.key)?'checked':''}><span><b>${esc(rc12TaskDraftLabel(d,i))}</b><small>${d.existingId?'已有账单':'本次新建'} · ${belongs?'关联组 '+groupNo:'未关联'}</small></span>${rc12RoleSelect(d.key,current)}</label>`}).join('')}</div><div class="rc12-relation-actions"><button type="button" class="button" id="rc12PickExisting">从查账添加</button><button type="button" class="button" id="rc12DetachSelected">解除所选关联</button><button type="submit" class="button primary">建立／更新关联</button></div></form></div></div>`;activateEntryTertiary()
}
function rc12OpenExistingPicker(){
 if(!rc12Task)return;let existing=new Set(rc12Task.drafts.map(d=>d.existingId).filter(Boolean)),q=rc12RelationPickerQuery.trim().toLowerCase(),items=rows.filter(r=>!existing.has(r.id)&&(!q||[r.note,r.merchant,r.category,r.subcategory,r.account,r.amount,r.date].some(v=>String(v||'').toLowerCase().includes(q)))).slice(0,120);$('#accountOverlay').innerHTML=`<div class="modalback entry-choice-back"><div class="modal entry-choice-card rc12-existing-picker"><div class="sectionhead"><h2>从查账添加</h2><button type="button" id="rc12BackToRelations">返回</button></div><input id="rc12ExistingSearch" class="account-search" type="search" placeholder="搜索账单" value="${esc(rc12RelationPickerQuery)}"><form id="rc12ExistingPickerForm"><div class="rc12-existing-list">${items.map(r=>`<label><input type="checkbox" name="bill" value="${esc(r.id)}"><span><b>${esc(recordHeadline(r))} · ${money(amount(r),r.currency)}</b><small>${esc(r.date)} · ${esc(r.account)}</small></span></label>`).join('')||'<p class="muted">没有匹配账单</p>'}</div><div class="modalfooter"><button type="submit" class="button primary">加入本次任务</button></div></form></div></div>`;activateEntryTertiary()
}
function rc12ApplyRelationForm(form){
 let selected=[...form.querySelectorAll('input[name=member]:checked')].map(x=>x.value);if(selected.length<2){toast('至少选择 2 笔账单才能建立关联');return false}let roles={};for(let key of selected)roles[key]=[...form.querySelectorAll('[data-rc12-role]')].find(node=>node.dataset.rc12Role===key)?.value||'auto';let selectedSet=new Set(selected),activeKey=rc12Task.drafts[rc12Task.active].key,old=rc12TaskGroupForKey(activeKey),id=old?.id||rc12Uid('RG');
 if(old)for(let key of old.members)if(!selectedSet.has(key))rc12Task.detached.add(key);for(let key of selected)rc12Task.detached.delete(key);let groups=[];for(let g of rc12Task.groups){if(g===old)continue;let kept=g.members.filter(k=>!selectedSet.has(k));if(kept.length>=2)groups.push({...g,members:kept,roles:Object.fromEntries(kept.map(k=>[k,g.roles[k]||'auto']))})}groups.push({id,members:selected,roles,sourceId:old?.sourceId||''});rc12Task.groups=groups;rc21CloseAccountOverlay();rc12RenderTask();return true
}
function rc12DetachMembers(keys){let set=new Set(keys),next=[];for(let key of keys)rc12Task.detached.add(key);for(let g of rc12Task.groups){let kept=g.members.filter(k=>!set.has(k));if(kept.length>=2)next.push({...g,members:kept,roles:Object.fromEntries(kept.map(k=>[k,g.roles[k]||'auto']))})}rc12Task.groups=next;rc21CloseAccountOverlay();rc12RenderTask()}
function rc12TaskRelationsForCommit(){
 let groupedKeys=new Set(rc12Task.groups.flatMap(g=>g.members)),detached=rc12Task.detached||new Set(),groups=[];
 for(let g of rc12Relations.groups||[]){let kept=g.members.filter(m=>{let d=rc12Task.drafts.find(x=>x.existingId===m.id);if(!d)return true;return !groupedKeys.has(d.key)&&!detached.has(d.key)});if(kept.length>=2)groups.push({...g,members:kept})}
 for(let g of rc12Task.groups){let members=g.members.map(key=>{let d=rc12Task.drafts.find(x=>x.key===key),id=d?.existingId||key;return {id,role:g.roles?.[key]||d?.relationRole||'auto'}}).filter(m=>m.id);if(members.length>=2)groups.push({id:g.sourceId&&!String(g.sourceId).startsWith('legacy:')?g.sourceId:g.id||rc12Uid('RG'),type:'compound',members,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}
 let suppressedLegacy=[...new Set([...(rc12Relations.suppressedLegacy||[]),...(rc12Task.legacySources||[])])];
 return {groups,suppressedLegacy}
}
async function rc12DesktopBatchCommit(items,relationState){
 let now=new Date().toISOString(),idMap={};if(folderHandle){
  let sources=await readFolderSources(prefs.mainName),current=mergeSourceRows(sources.base,sources.mobile,sources.desktop),desktop=sources.desktop.map(r=>({...r})),currentMap=new Map(current.map(r=>[r.id,r]));
  for(let [i,item] of items.entries()){let id=item.id||('PC-'+Date.now()+'-'+i+'-'+Math.random().toString(36).slice(2,8));idMap[item.tempId]=id;let old=item.id?currentMap.get(item.id):null;if(item.id&&!old)throw Error('有账单已经发生变化，请刷新后重试');upsertById(desktop,clearDeletionFlag({...Object.fromEntries(COLS.map(k=>[k,''])),...(old||{}),...item.record,id,created_at:old?.created_at||now,updated_at:now}))}
  let mapped=rc12NormalizeRelations({...relationState,groups:(relationState.groups||[]).map(g=>({...g,members:g.members.map(m=>({id:idMap[m.id]||m.id,role:m.role||'auto'}))}))}),before=rc12CloneRelations(),beforeDesktop=sources.desktop.map(r=>({...r}));await writeDesktopDelta(prefs.mainName,desktop);try{await rc12WriteRelationsDesktop(mapped)}catch(e){try{await writeDesktopDelta(prefs.mainName,beforeDesktop)}catch(_csvRollback){}try{await rc12WriteRelationsDesktop(before)}catch(_relationRollback){}throw e}let combined=mergeSourceRows(sources.base,sources.mobile,desktop),csv=csvWrite(combined),nextPrefs={...prefs,lastChangeAt:Date.now(),undoBatch:null};await putBundle({csv,prefs:nextPrefs});prefs=nextPrefs;rc12Relations=mapped;lastDeltaMeta='';takeCsv(csv);return {ids:idMap,relations:mapped}
 }
 let data=rows.map(r=>({...r})),map=new Map(data.map((r,i)=>[r.id,i]));for(let [i,item] of items.entries()){let id=item.id||('TX-'+Date.now()+'-'+i+'-'+Math.random().toString(36).slice(2,8));idMap[item.tempId]=id,old=item.id&&map.has(item.id)?data[map.get(item.id)]:null;if(item.id&&!old)throw Error('有账单已经发生变化');let row={...Object.fromEntries(COLS.map(k=>[k,''])),...(old||{}),...item.record,id,created_at:old?.created_at||now,updated_at:now};if(old)data[map.get(item.id)]=row;else data.unshift(row)}let mapped=rc12NormalizeRelations({...relationState,groups:(relationState.groups||[]).map(g=>({...g,members:g.members.map(m=>({id:idMap[m.id]||m.id,role:m.role||'auto'}))}))});let csv=csvWrite(data),nextPrefs={...prefs,lastChangeAt:Date.now(),undoBatch:null};await putBundle({recovery:csvWrite(rows),csv,prefs:nextPrefs,['relations:'+String(prefs.mainName||'')]:mapped});prefs=nextPrefs;rc12Relations=mapped;takeCsv(csv);return {ids:idMap,relations:mapped}
}
async function rc12CommitTask(){
 if(!rc12Task)return;if(!rc12RelationsLoaded)await rc12LoadRelations(false);rc12CaptureDraft();let items=[];try{for(let [i,d] of rc12Task.drafts.entries())items.push({tempId:d.key,id:d.existingId||'',record:rc12RecordForSave(d,i)})}catch(e){toast(e.message);return}let relations=rc12TaskRelationsForCommit(),f=$('#entry');if(f?.dataset.saving==='1')return;if(f)f.dataset.saving='1';let submit=f?.querySelector('button[type=submit]');if(submit)submit.disabled=true;
 try{let result;if(native){result=await nativeCommand('batchCommit',null,null,{records:items,relationState:relations,relationGroups:relations.groups});prefs={...prefs,...(result.settings||{})};rc12Relations=rc12NormalizeRelations(result.relations||relations);if(result.csv!==undefined)takeCsv(result.csv)}else result=await rc12DesktopBatchCommit(items,relations);let count=items.length;rc12Task=null;ocrReviewText='';rc12BaseClose();render();toast(`已保存 ${count} 笔账单${relations.groups.length?'及关联关系':''}`)}catch(e){if(f){delete f.dataset.saving;if(submit)submit.disabled=false}toast('保存失败：'+(e.message||e))}
}

entryForm=function(record){
 if(rc12TaskInternal)return rc12BaseEntryForm(record);
 // Existing entry controls re-render the current card by calling entryForm again.
 if(rc12Task&&$('#entry')){let current=rc12Task.drafts[rc12Task.active];current.record={...current.record,...record,id:current.existingId||record?.id||''};rc12RenderTask();return}
 rc12StartTask([record||{}],{source:record?.id?'edit':'new'})
};
form=function(record){
 if(record?.id){let group=rc12GroupForBill(record.id);if(group){let members=group.members.map(m=>rows.find(r=>r.id===m.id)).filter(Boolean),active=Math.max(0,members.findIndex(r=>r.id===record.id));if(members.length>=2){rc12StartTask(members,{source:'compound',active,groups:[group]});return}}}
 rc12StartTask([record||{}],{source:record?.id?'edit':'new'})
};
window.entryTaskOpenFromOCR=function(payload){let records=Array.isArray(payload?.records)&&payload.records.length?payload.records:[{}];rc12StartTask(records,{source:'ocr',active:0,relationHints:payload?.relationHints||[]});toast(records.length>1?`OCR 识别到 ${records.length} 笔流水，请逐张核对`:'已预填识别结果，请核对后保存')};
close=function(){if(rc12Task&&$('#entry'))rc12Task=null;return rc12BaseClose()};

async function rc12RelateSelected(){
 let ids=[...selection];if(!ids.length){toast('没有选择账单');return}
 let all=rc12AllGroups(),touch=[...new Set(ids.map(id=>rc12GroupForBill(id)).filter(Boolean))],same=touch.length===1&&ids.every(id=>touch[0].members.some(m=>m.id===id)),groups=(rc12Relations.groups||[]).map(g=>({...g,members:g.members.map(m=>({...m}))})),suppressed=new Set(rc12Relations.suppressedLegacy||[]);
 if(same){let target=touch[0],remove=new Set(ids),next=groups.filter(g=>g.id!==target.id);if(target.legacy){suppressed.add(target.id);let kept=target.members.filter(m=>!remove.has(m.id));if(kept.length>=2)next.push({id:rc12Uid('RG'),type:'compound',members:kept.map(m=>({...m})),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()})}else{let kept=target.members.filter(m=>!remove.has(m.id));if(kept.length>=2)next.push({...target,members:kept,updatedAt:new Date().toISOString()})}await rc12SaveRelations({groups:next,suppressedLegacy:[...suppressed]});selection.clear();renderSelection();toast('已解除所选账单的关联');return}
 if(ids.length<2){toast('至少选择 2 笔账单才能建立关联');return}
 let mergeIds=new Set(ids),roles=new Map(),explicitTouch=new Set();for(let g of touch){for(let m of g.members){mergeIds.add(m.id);roles.set(m.id,m.role||'auto')}if(g.legacy)suppressed.add(g.id);else explicitTouch.add(g.id)}let next=groups.filter(g=>!explicitTouch.has(g.id)),members=[...mergeIds].map(id=>({id,role:roles.get(id)||rc12InferRole(rows.find(r=>r.id===id))}));next.push({id:touch.find(g=>!g.legacy)?.id||rc12Uid('RG'),type:'compound',members,createdAt:touch.find(g=>!g.legacy)?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()});await rc12SaveRelations({groups:next,suppressedLegacy:[...suppressed]});selection.clear();renderSelection();toast(`已关联 ${members.length} 笔账单`)
}

performDelete=async function(){let ids=pendingDeleteIds?[...pendingDeleteIds]:[];await rc12BasePerformDelete();if(ids.length&&pendingDeleteIds===null){let remove=new Set(ids),groups=(rc12Relations.groups||[]).map(g=>({...g,members:g.members.filter(m=>!remove.has(m.id))})).filter(g=>g.members.length>=2);if(JSON.stringify(groups)!==JSON.stringify(rc12Relations.groups))rc12SaveRelations({groups,suppressedLegacy:rc12Relations.suppressedLegacy||[]}).catch(()=>{})}};
connectFolder=async function(){let r=await rc12BaseConnectFolder();await rc12LoadRelations(true);return r};
refreshDelta=async function(auto=false){let r=await rc12BaseRefreshDelta(auto);if(!auto)await rc12LoadRelations(true);return r};

// Capture submit before the original single-bill handler.
document.addEventListener('submit',e=>{
 if(e.target.id==='entry'&&rc12Task){e.preventDefault();e.stopImmediatePropagation();rc12CommitTask();return}
 if(e.target.id==='rc12RelationForm'){e.preventDefault();e.stopImmediatePropagation();rc12ApplyRelationForm(e.target);return}
 if(e.target.id==='rc12ExistingPickerForm'){e.preventDefault();e.stopImmediatePropagation();let ids=[...e.target.querySelectorAll('input[name=bill]:checked')].map(x=>x.value);for(let id of ids){if(rc12Task.drafts.some(d=>d.existingId===id))continue;let r=rows.find(x=>x.id===id);if(r)rc12Task.drafts.push(rc12NewDraft(r))}rc12OpenRelationManager();return}
},true);

document.addEventListener('click',e=>{let t=e.target.closest('button');if(!t)return;
 if(t.id==='rc12PrevDraft'){e.preventDefault();rc12SwitchDraft(rc12Task.active-1,-1)}
 else if(t.id==='rc12NextDraft'){e.preventDefault();rc12SwitchDraft(rc12Task.active+1,1)}
 else if(t.id==='rc12AddDraft'){e.preventDefault();rc12AddDraft()}
 else if(t.id==='rc12DeleteDraft'){e.preventDefault();rc12DeleteCurrentDraft()}
 else if(t.id==='rc12ManageRelations'){e.preventDefault();rc12OpenRelationManager()}
 else if(t.id==='rc12PickExisting'){e.preventDefault();rc12OpenExistingPicker()}
 else if(t.id==='rc12BackToRelations'){e.preventDefault();rc12OpenRelationManager()}
 else if(t.id==='rc12DetachSelected'){e.preventDefault();let form=$('#rc12RelationForm'),keys=[...form.querySelectorAll('input[name=member]:checked')].map(x=>x.value);if(!keys.length){toast('先选择要解除的账单');return}rc12DetachMembers(keys)}
 else if(t.id==='rc12RelateSelection'){e.preventDefault();rc12RelateSelected().catch(err=>toast('关联失败：'+err.message))}
},true);

document.addEventListener('input',e=>{if(e.target.id==='rc12ExistingSearch'){rc12RelationPickerQuery=e.target.value;let pos=e.target.selectionStart;rc12OpenExistingPicker();requestAnimationFrame(()=>{let q=$('#rc12ExistingSearch');q?.focus();try{q?.setSelectionRange(pos,pos)}catch(_e){}})}},true);

// Load the sidecar after browser folder initialization; native already received it in BOOT.
setTimeout(()=>rc12LoadRelations(true).catch(()=>{}),native?120:900);
window.addEventListener('star-ledger-main-changed',()=>{rc12Task=null;rc12LoadRelations(true).catch(()=>{})});
window.addEventListener('focus',()=>{if(!native&&folderHandle)rc12LoadRelations(false).catch(()=>{})});
requestAnimationFrame(()=>{try{render()}catch(e){console.warn('rc12 initial render',e)}});
})();

/* starledger-pwa-register */
if('serviceWorker' in navigator&&location.protocol==='https:')window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));

/* web-v051-safari-document-modal-controller */
(()=>{
  const root=document.documentElement;
  const overlay=document.getElementById('overlay');
  if(!overlay||!root.classList.contains('browser-tab'))return;

  let modalActive=false;
  const isPhone=()=>matchMedia('(max-width:760px)').matches;
  const hasPrimaryModal=()=>!!overlay.querySelector(':scope > .entryback, :scope > .account-dialog-back');

  const place=()=>{
    if(!modalActive||!isPhone())return;
    const vv=window.visualViewport;
    const scrollX=window.scrollX||document.documentElement.scrollLeft||0;
    const scrollY=window.scrollY||document.documentElement.scrollTop||0;
    const left=scrollX+(vv?.offsetLeft||0);
    const top=scrollY+(vv?.offsetTop||0);
    const width=vv?.width||document.documentElement.clientWidth||window.innerWidth;
    const height=vv?.height||window.innerHeight;
    overlay.style.setProperty('--sl-modal-left',left+'px');
    overlay.style.setProperty('--sl-modal-top',top+'px');
    overlay.style.setProperty('--sl-modal-width',width+'px');
    overlay.style.setProperty('--sl-modal-height',height+'px');
  };

  const clear=()=>{
    modalActive=false;
    overlay.classList.remove('safari-document-modal');
    for(const name of ['--sl-modal-left','--sl-modal-top','--sl-modal-width','--sl-modal-height']){
      overlay.style.removeProperty(name);
    }
  };

  const sync=()=>{
    const active=isPhone()&&hasPrimaryModal();
    if(active){
      modalActive=true;
      overlay.classList.add('safari-document-modal');
      place();
    }else if(modalActive){
      clear();
    }
  };

  new MutationObserver(sync).observe(overlay,{childList:true});
  window.addEventListener('resize',place,{passive:true});
  window.addEventListener('orientationchange',place,{passive:true});
  window.visualViewport?.addEventListener('resize',place,{passive:true});
  window.visualViewport?.addEventListener('scroll',place,{passive:true});
  sync();
})();

/* web-v044-browser-tab-interactions */
(()=>{
  const root=document.documentElement;
  if(!root.classList.contains('browser-tab'))return;

  const live=document.querySelector('#content');
  const floating=document.querySelector('#floatingControls');
  if(!live)return;

  // The Safari tint-anchor experiment is intentionally disabled:
  // transparent/off-screen anchors are not useful sampling targets, while
  // visible anchors cause chrome tint blocks. Keep the page edge native.
  document.querySelectorAll('.safari-tint-anchor').forEach(el=>el.remove());

  let gesture=null,busy=false,stage=null,currentFilter=null,targetFilter=null,settleTimer=0,suppressUntil=0,cacheToken=0;
  const pageCache=new Map();

  const blocked=t=>!!t.closest(
    'input,select,textarea,[contenteditable="true"],.mobilebar,.modalback,.entryback,'+
    '#accountOverlay,.search-filter-sheet,.tag-choices,.category-tabs'
  );

  const saveGlobals=()=>({
    section,day,page,searchPeriod,searchDateMode,searchRangeStart,searchRangeEnd
  });
  const restoreGlobals=v=>{
    section=v.section;day=v.day;page=v.page;
    searchPeriod=v.searchPeriod;searchDateMode=v.searchDateMode;
    searchRangeStart=v.searchRangeStart;searchRangeEnd=v.searchRangeEnd;
  };

  function hasFilters(target){
    return !!(prefs.mainName&&(target==='home'||target==='stats'));
  }
  function filterHTMLFor(target){
    if(!hasFilters(target))return'';
    const saved=saveGlobals();
    try{
      section=target;
      rc6ApplyPageDefaults(target);
      return commonFilters(target==='home'||statsMode==='month')+activeFilterNotice();
    }finally{restoreGlobals(saved)}
  }

  function pageHTMLFor(target){
    const saved=saveGlobals();
    try{
      section=target;
      rc6ApplyPageDefaults(target);

      const clone=live.cloneNode(true);
      clone.classList.remove('browser-pager-tracking','browser-pager-settling');
      clone.style.transform='';

      const title=clone.querySelector('#title');
      if(title){
        if(target==='stats'){
          title.innerHTML='<span class="stats-title-switch"><button type="button" class="'+(statsMode==='month'?'active':'')+'">月度</button><button type="button" class="'+(statsMode==='year'?'active':'')+'">年度</button></span>';
        }else title.textContent=labels[target]||'';
      }

      const body=clone.querySelector('#pageBody');
      if(body){
        body.classList.remove('settings-page');
        const prefix=
          (volatileDeletion
            ?'<div class="backup-alert">当前仅显示已导出的删除结果。手机原 CSV 未改变；请保存导出的 CSV，并重新导入后再继续记账。</div>'
            :'')+
          (prefs.mainName&&exportStatus()?exportStatus():'');
        if(!prefs.mainName){
          body.innerHTML=prefix+firstUsePage();
        }else{
          const fn={home:homeV2,stats:statsPage,books:bookPage,accounts:accountPage,search:searchPage}[target];
          body.innerHTML=prefix+(fn?fn():'');
        }
      }

      const slot=clone.querySelector('#controlsFrame');
      if(slot){
        slot.innerHTML='';
        slot.hidden=false;
        slot.style.setProperty('height','62px','important');
      }

      return rc55SceneHTML(clone.innerHTML,rc27PageScroll[target]||0,{visible:false,html:'',top:0});
    }finally{
      restoreGlobals(saved);
    }
  }

  let cacheStateKey='';

  function stateKey(){
    return [
      revision,
      year,month,book,query,kind,account,category,subcategory,currencyFilter,day,
      statsMode,searchPeriod,searchDateMode,searchRangeStart,searchRangeEnd,
      Number(prefs?._starConfigUpdatedAt||0)
    ].join('|');
  }

  function captureCurrent(){
    if(!PRIMARY_PAGE_ORDER.includes(section)||busy)return;
    pageCache.set(section,{
      html:currentSnapshot(),
      filterHTML:hasFilters(section)
        ?(floating&&!floating.hidden&&floating.innerHTML.trim()?floating.innerHTML:filterHTMLFor(section))
        :'',
      hasFilter:hasFilters(section),
      retained:true
    });
  }

  function buildCache(){
    const key=stateKey();
    if(cacheStateKey&&cacheStateKey!==key){
      pageCache.clear();
    }
    cacheStateKey=key;

    // Always retain the real page exactly as the user last left it.
    captureCurrent();

    const token=++cacheToken;
    const run=()=>{
      if(token!==cacheToken||busy)return;
      for(const target of PRIMARY_PAGE_ORDER){
        if(pageCache.has(target))continue;
        pageCache.set(target,{
          html:pageHTMLFor(target),
          filterHTML:filterHTMLFor(target),
          hasFilter:hasFilters(target),
          retained:false
        });
      }
    };
    if('requestIdleCallback' in window)requestIdleCallback(run,{timeout:220});
    else setTimeout(run,45);
  }

  window.__browserPagerAfterRender=buildCache;
  window.__browserPagerInvalidate=()=>{
    ++cacheToken;
    cacheStateKey='';
    pageCache.clear();
    buildCache();
  };

  function dataFor(target){
    let data=pageCache.get(target);
    if(!data){
      data={
        html:pageHTMLFor(target),
        filterHTML:filterHTMLFor(target),
        hasFilter:hasFilters(target),
        retained:false
      };
      pageCache.set(target,data);
    }
    return data;
  }

  function viewportBox(){
    const vv=window.visualViewport,
          scrollY=window.scrollY||document.documentElement.scrollTop||0,
          scrollX=window.scrollX||document.documentElement.scrollLeft||0,
          visualHeight=Math.max(1,vv?.height||window.innerHeight||document.documentElement.clientHeight),
          layoutHeight=Math.max(visualHeight,window.innerHeight||0,document.documentElement.clientHeight||0),
          // Safari's bottom browser chrome sits outside visualViewport. Give
          // the actual page snapshot enough paint area to continue behind it.
          bottomOverscan=Math.max(180,Math.min(320,(layoutHeight-visualHeight)+180));
    return {
      top:scrollY+(vv?.offsetTop||0),
      left:scrollX+(vv?.offsetLeft||0),
      width:Math.max(1,vv?.width||window.innerWidth||document.documentElement.clientWidth),
      height:visualHeight,
      paintHeight:visualHeight+bottomOverscan
    };
  }

  function pinStageToViewport(){
    if(!stage?.isConnected)return;
    const vv=window.visualViewport,
          scrollY=window.scrollY||document.documentElement.scrollTop||0,
          scrollX=window.scrollX||document.documentElement.scrollLeft||0;
    stage.style.top=(scrollY+(vv?.offsetTop||0))+'px';
    stage.style.left=(scrollX+(vv?.offsetLeft||0))+'px';
  }

  function currentSnapshot(){
    return rc55SceneHTML(live.innerHTML,getPageScroll(),{visible:false,html:'',top:0});
  }

  function removeStage(){
    if(stage?.isConnected)stage.remove();
    stage=null;
    currentFilter=null;
    targetFilter=null;
    if(floating){
      floating.style.removeProperty('opacity');
      floating.style.removeProperty('transition');
      floating.style.removeProperty('pointer-events');
      floating.style.removeProperty('visibility');
    }
  }

  function makeStage(target,dir){
    removeStage();
    // Preserve the exact page being left before any filter snapshot is hidden.
    captureCurrent();
    const box=viewportBox(),targetData=dataFor(target);
    const holder=document.createElement('div');
    holder.className='browser-pager-stage';
    holder.style.top=box.top+'px';
    holder.style.left=box.left+'px';
    holder.style.width=box.width+'px';
    holder.style.height=box.paintHeight+'px';

    const current=document.createElement('div');
    current.className='browser-pager-pane browser-pager-current';
    current.innerHTML=currentSnapshot();

    const next=document.createElement('div');
    next.className='browser-pager-pane browser-pager-target';
    next.innerHTML=targetData.html;
    next.style.setProperty('--browser-pane-x',(dir<0?box.width:-box.width)+'px');

    holder.append(current,next);
    document.body.appendChild(holder);
    stage=holder;

    const currentHasFilter=hasFilters(section);
    if(currentHasFilter&&floating?.innerHTML.trim()){
      const ghost=document.createElement('div');
      ghost.className='browser-pager-filter-ghost browser-pager-filter-current';
      ghost.innerHTML=floating.innerHTML;
      ghost.style.opacity='1';
      holder.appendChild(ghost);
      currentFilter=ghost;
    }
    if(targetData.hasFilter){
      const ghost=document.createElement('div');
      ghost.className='browser-pager-filter-ghost browser-pager-filter-target';
      ghost.innerHTML=targetData.filterHTML;
      ghost.style.opacity='0';
      holder.appendChild(ghost);
      targetFilter=ghost;
    }
    if(floating){
      // Never animate the real fixed filter. A snapshot handles the fade so
      // Safari does not recompose the fixed layer on the final frame.
      floating.style.visibility='hidden';
      floating.style.pointerEvents='none';
      floating.style.transition='none';
    }

    return {box,current,next,targetData,currentHasFilter};
  }

  function targetFor(dir){
    const i=PRIMARY_PAGE_ORDER.indexOf(section);
    if(i<0)return'';
    const next=i+(dir<0?1:-1);
    return next>=0&&next<PRIMARY_PAGE_ORDER.length?PRIMARY_PAGE_ORDER[next]:'';
  }

  function begin(target,dir){
    if(busy||!target||target===section)return null;
    const built=makeStage(target,dir);
    busy=true;
    return {
      target,dir,width:built.box.width,
      current:built.current,next:built.next,
      currentHasFilter:built.currentHasFilter,
      targetHasFilter:built.targetData.hasFilter,
      x:0
    };
  }

  function setProgress(state,rawX){
    let x=state.dir<0?Math.min(0,rawX):Math.max(0,rawX);
    x=Math.max(-state.width,Math.min(state.width,x));
    state.x=x;

    state.current.style.setProperty('--browser-pane-x',x+'px');
    state.next.style.setProperty('--browser-pane-x',(x+(state.dir<0?state.width:-state.width))+'px');

    const p=Math.max(0,Math.min(1,Math.abs(x)/state.width));
    if(currentFilter){
      currentFilter.style.opacity=String(state.currentHasFilter?1-p:0);
    }
    if(targetFilter){
      targetFilter.style.opacity=String(state.targetHasFilter?p:0);
    }
  }

  function settle(state,commit,duration){
    const currentEnd=commit?(state.dir<0?-state.width:state.width):0;
    const targetEnd=commit?0:(state.dir<0?state.width:-state.width);
    const ease=commit?'cubic-bezier(.2,.85,.32,1)':'cubic-bezier(.18,.88,.3,1.05)';

    for(const pane of [state.current,state.next]){
      pane.classList.add('browser-pager-settling');
      pane.style.setProperty('--browser-pager-duration',duration+'ms');
      pane.style.setProperty('--browser-pager-ease',ease);
    }
    if(currentFilter)currentFilter.style.transition='opacity '+duration+'ms '+ease;
    if(targetFilter)targetFilter.style.transition='opacity '+duration+'ms '+ease;

    void state.current.offsetWidth;
    requestAnimationFrame(()=>{
      state.current.style.setProperty('--browser-pane-x',currentEnd+'px');
      state.next.style.setProperty('--browser-pane-x',targetEnd+'px');
      if(currentFilter)currentFilter.style.opacity=commit?'0':(state.currentHasFilter?'1':'0');
      if(targetFilter)targetFilter.style.opacity=commit&&state.targetHasFilter?'1':'0';
    });

    let done=false;
    const finish=()=>{
      if(done)return;
      done=true;
      clearTimeout(settleTimer);

      if(commit){
        // Safari expands its browser chrome when a navigation restores the
        // document to the exact top. If the outgoing page is already scrolled,
        // keep a 1px physical scroll sentinel for targets whose saved position
        // is logically the top. The shift is visually imperceptible but keeps
        // the compact toolbar state continuous across short pages.
        const outgoingScroll=getPageScroll();
        if(outgoingScroll>0&&(rc27PageScroll[state.target]||0)<=0){
          rc27PageScroll[state.target]=1;
        }

        // Render the target behind the already-arrived cached page.
        rc6Navigate(state.target);
        // rc6Navigate restores the target document scroll. Keep the absolute
        // snapshot pinned to the same visual viewport position so it does not
        // jump during the handoff, while still remaining part of the document
        // paint that Safari uses behind its browser chrome.
        pinStageToViewport();
        requestAnimationFrame(pinStageToViewport);
        // Keep the cached target/filter for one more paint, then reveal live DOM.
        requestAnimationFrame(()=>requestAnimationFrame(()=>{
          // The target filter snapshot still covers the fixed-filter handoff.
          // Remove snapshots only after the live target has painted twice.
          removeStage();
          busy=false;
          buildCache();
          updateBackToTop();
        }));
      }else{
        removeStage();
        busy=false;
      }
    };

    state.next.addEventListener('transitionend',finish,{once:true});
    settleTimer=setTimeout(finish,duration+70);
  }

  window.__browserPagerNavigate=target=>{
    if(!compactViewport()||!PRIMARY_PAGE_ORDER.includes(target)||target===section){
      if(target!==section)rc6Navigate(target);
      return;
    }
    if(busy)return;
    const from=PRIMARY_PAGE_ORDER.indexOf(section),to=PRIMARY_PAGE_ORDER.indexOf(target),dir=to>from?-1:1;
    const state=begin(target,dir);
    if(!state)return;
    requestAnimationFrame(()=>requestAnimationFrame(()=>settle(state,true,225)));
  };

  document.addEventListener('touchstart',e=>{
    if(e.touches?.length!==1||busy||section==='settings'||selection?.size||document.querySelector('.modalback,.entryback')||blocked(e.target)){
      gesture=null;return;
    }
    if(!e.target.closest('#pageViewport')){gesture=null;return}
    const t=e.touches[0];
    gesture={
      id:t.identifier,x:t.clientX,y:t.clientY,lastX:t.clientX,lastY:t.clientY,
      lastTime:performance.now(),vx:0,axis:'',dir:0,target:'',state:null
    };
  },{passive:true});

  document.addEventListener('touchmove',e=>{
    if(!gesture||e.touches?.length!==1)return;
    const t=[...e.touches].find(x=>x.identifier===gesture.id);if(!t)return;
    const now=performance.now(),dx=t.clientX-gesture.x,dy=t.clientY-gesture.y,ax=Math.abs(dx),ay=Math.abs(dy);

    if(!gesture.axis&&Math.max(ax,ay)>=10){
      if(ax>ay*1.16){
        gesture.axis='x';
        gesture.dir=dx<0?-1:1;
        gesture.target=targetFor(gesture.dir);
        if(gesture.target)gesture.state=begin(gesture.target,gesture.dir);
      }else if(ay>ax*1.08){
        gesture.axis='y';
        return;
      }
    }

    if(gesture.axis==='x'&&gesture.state){
      const dt=Math.max(1,now-gesture.lastTime),sample=(t.clientX-gesture.lastX)/dt;
      gesture.vx=gesture.vx*.62+sample*.38;
      setProgress(gesture.state,dx);
      if(e.cancelable)e.preventDefault();
    }

    gesture.lastX=t.clientX;gesture.lastY=t.clientY;gesture.lastTime=now;
  },{passive:false});

  const endGesture=e=>{
    if(!gesture)return;
    const g=gesture;gesture=null;
    if(g.axis!=='x'||!g.state)return;

    suppressUntil=Date.now()+430;
    let t=null;
    for(const x of (e.changedTouches||[]))if(x.identifier===g.id){t=x;break}
    const dx=(t?t.clientX:g.lastX)-g.x;
    setProgress(g.state,dx);

    const progress=Math.abs(g.state.x||0)/g.state.width;
    const velocityToward=g.dir<0?g.vx<-.34:g.vx>.34;
    const valid=g.dir<0?dx<0:dx>0;
    const commit=valid&&(progress>=.23||velocityToward);
    const remaining=commit?1-progress:progress;
    const duration=Math.max(120,Math.min(230,125+100*remaining));
    settle(g.state,commit,duration);
  };

  document.addEventListener('touchend',endGesture,{passive:true});
  document.addEventListener('touchcancel',()=>{
    if(gesture?.state){
      const state=gesture.state;gesture=null;settle(state,false,175);
    }else gesture=null;
  },{passive:true});

  document.addEventListener('click',e=>{
    if(Date.now()<suppressUntil&&e.target.closest('#pageViewport')){
      e.preventDefault();e.stopImmediatePropagation();
    }
  },true);

  const keepStagePinned=()=>{
    if(busy&&stage?.isConnected)pinStageToViewport();
  };
  window.addEventListener('scroll',keepStagePinned,{passive:true});
  window.visualViewport?.addEventListener('scroll',keepStagePinned,{passive:true});

  window.addEventListener('resize',()=>{
    if(busy){
      // Safari may resize visualViewport while its chrome expands/collapses.
      // Re-pin instead of exposing the live page mid-transition.
      pinStageToViewport();
    }
  },{passive:true});
  window.visualViewport?.addEventListener('resize',keepStagePinned,{passive:true});

  buildCache();
})();
