// Shared by the single native dialog: keep its frame while a keyboard covers it.
// Viewport coordinates: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
// Never override global focus(), prevent text selection, or disable pinch zoom.
const keyboardField=element=>element instanceof HTMLElement&&!element.matches('[readonly],[disabled]')&&((element.matches('textarea,select')||element.isContentEditable)||element.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]):not([type=hidden]):not([type=button]):not([type=submit]):not([type=reset]):not([type=image])'));
const SCROLLERS='.entry-scroll,.dialog-content,.picker-scroll';
const nearly=(a,b)=>Math.abs(a-b)<2;
export function manageDialogViewport(dialog){
 const root=document.documentElement,body=document.body,viewport=window.visualViewport,keyboard=navigator.virtualKeyboard;
 const compact=()=>matchMedia('(max-width:760px)').matches;
 const touchDevice=()=>compact()||navigator.maxTouchPoints>0||matchMedia('(pointer:coarse)').matches;
 const fullScreen=()=>compact()||touchDevice()&&layoutHeight()<=500;
 const live=()=>({width:viewport?.width||root.clientWidth,height:viewport?.height||innerHeight,left:viewport?.offsetLeft||0,top:viewport?.offsetTop||0,scale:viewport?.scale||1});
 let idle=live(),frame=null,background=null,probe=null,virtualOverlay,active=false,focused=false,scheduled=0,touchY=0;
 const insets=new Set();
 function saveStyles(element,values){const previous=Object.keys(values).map(name=>[name,element.style.getPropertyValue(name),element.style.getPropertyPriority(name)]);for(const[name,value]of Object.entries(values))element.style.setProperty(name,value);return()=>{for(const[name,value,priority]of previous)if(value)element.style.setProperty(name,value,priority);else element.style.removeProperty(name)}}
 function layoutHeight(){return probe?.getBoundingClientRect().height||innerHeight}
 function setFrameSize(){dialog.style.setProperty('--dialog-frame-width',frame.width+'px');dialog.style.setProperty('--dialog-frame-height',frame.height+'px');dialog.dataset.compact=String(frame.viewportHeight<=700)}
 function place(v){if(!frame||!nearly(v.scale,1))return;dialog.style.setProperty('--dialog-frame-top',(window.scrollY+v.top+frame.top)+'px');dialog.style.setProperty('--dialog-frame-left',(window.scrollX+v.left+frame.left)+'px')}
 function visibleBottom(v){const rect=keyboard?.boundingRect;return Math.min(v.top+v.height,rect?.height>0?rect.top??rect.y:Infinity)}
 function clearInsets(){for(const element of insets)element.style.removeProperty('--dialog-keyboard-inset');insets.clear()}
 function revealField(v){const field=document.activeElement;if(!keyboardField(field)||!dialog.contains(field))return;const scroller=field.parentElement?.closest(SCROLLERS);if(!scroller)return;const bounds=scroller.getBoundingClientRect(),target=field.getBoundingClientRect(),header=dialog.querySelector('.paper-dialog-header')?.getBoundingClientRect(),top=Math.max(bounds.top,header?.bottom||v.top,v.top)+12,bottom=Math.min(bounds.bottom,visibleBottom(v))-16;if(bottom<=top)return;let delta=0;if(target.bottom>bottom)delta=target.bottom-bottom;else if(target.top<top&&target.height<=bottom-top)delta=target.top-top;if(delta)scroller.scrollTop=Math.max(0,Math.min(scroller.scrollHeight-scroller.clientHeight,scroller.scrollTop+delta))}
 function sync(){
  scheduled=0;const v=live();if(active&&!touchDevice()){afterClose();return}if(!active&&dialog.open&&touchDevice()){beforeOpen();afterRender();return}
  if(!active||!dialog.open){if(nearly(v.scale,1)&&!keyboardField(document.activeElement)&&(nearly(idle.width,v.width)||v.height>idle.height-100)&&v.height>idle.height-100)idle=v;return}
  if(!nearly(v.scale,1))return; // Preserve accessible user zoom/panning.
  focused=keyboardField(document.activeElement)&&dialog.contains(document.activeElement);
  const rotated=!nearly(frame.layoutWidth,root.clientWidth),covered=Math.max(frame.viewportHeight-v.height,keyboard?.boundingRect?.height||0)>100;
  if(rotated){const height=focused||covered?layoutHeight():v.height;frame={width:fullScreen()?root.clientWidth:Math.min(560,root.clientWidth-40),height:fullScreen()?height:Math.min(frame.height,height-48),viewportHeight:height,layoutWidth:root.clientWidth,top:0,left:0};if(!fullScreen()){frame.top=Math.max(24,(height-frame.height)/2);frame.left=(root.clientWidth-frame.width)/2}dialog.dataset.viewportMode=fullScreen()?'full':'card';setFrameSize()}
  else if(!focused&&!covered){if(fullScreen()){frame.height=v.height;frame.width=v.width;frame.viewportHeight=v.height;frame.top=frame.left=0;dialog.dataset.viewportMode='full'}else{dialog.removeAttribute('data-viewport-mode');clearInsets();const bounds=dialog.getBoundingClientRect();frame.width=bounds.width;frame.height=bounds.height;frame.viewportHeight=v.height;frame.left=bounds.left-v.left;frame.top=bounds.top-v.top;dialog.dataset.viewportMode='card'}setFrameSize();idle=v}
  place(v);dialog.dataset.keyboard=String(covered);
  // Grow only scroll range below the keyboard. Do not resize the scrollport,
  // header, amount display or the user's calculator/keypad preference.
  for(const element of [...insets])if(!element.isConnected){insets.delete(element)}
  for(const element of dialog.querySelectorAll(SCROLLERS)){const overlap=focused||covered?Math.max(0,element.getBoundingClientRect().bottom-visibleBottom(v)):0;element.style.setProperty('--dialog-keyboard-inset',Math.ceil(overlap)+'px');insets.add(element)}
  if(focused)revealField(v);
 }
 function schedule(){if(!scheduled)scheduled=requestAnimationFrame(sync)}
 function beforeOpen(){
  if(active||!touchDevice())return;
  const v=live(),unobscured=keyboardField(document.activeElement)||idle.height-v.height>100?nearly(idle.width,v.width)?idle.height:Math.max(v.height,innerHeight):v.height;
  probe=document.createElement('div');probe.className='dialog-layout-probe';probe.setAttribute('aria-hidden','true');probe.inert=true;body.append(probe);
  const scroll={x:window.scrollX,y:window.scrollY},restoreRoot=saveStyles(root,{overflow:'hidden'}),restoreBody=saveStyles(body,{position:'fixed',top:-scroll.y+'px',left:-scroll.x+'px',width:'100%',overflow:'hidden'});
  background={scroll,restoreRoot,restoreBody};active=true;focused=false;
  if(keyboard&&'overlaysContent'in keyboard){try{virtualOverlay=keyboard.overlaysContent;keyboard.overlaysContent=true}catch{}}
  frame={width:root.clientWidth,height:unobscured,viewportHeight:unobscured,layoutWidth:root.clientWidth,top:0,left:0};
  if(fullScreen())dialog.dataset.viewportMode='full';setFrameSize();place(live());
 }
 function afterRender(){
  if(!active){if(dialog.open&&touchDevice())beforeOpen();else return}
  if(!fullScreen()&&!dialog.hasAttribute('data-viewport-mode')){const v=live(),bounds=dialog.getBoundingClientRect();frame={...frame,width:bounds.width,height:bounds.height,top:bounds.top-v.top,left:bounds.left-v.left};dialog.dataset.viewportMode='card';setFrameSize()}
  sync();schedule();
 }
 function afterClose(){
  if(scheduled){cancelAnimationFrame(scheduled);scheduled=0}clearInsets();active=false;focused=false;frame=null;
  dialog.removeAttribute('data-viewport-mode');dialog.removeAttribute('data-compact');dialog.removeAttribute('data-keyboard');for(const name of ['--dialog-frame-width','--dialog-frame-height','--dialog-frame-top','--dialog-frame-left'])dialog.style.removeProperty(name);
  probe?.remove();probe=null;if(virtualOverlay!==undefined){try{keyboard.overlaysContent=virtualOverlay}catch{}virtualOverlay=undefined}
  if(background){const saved=background;background=null;saved.restoreBody();saved.restoreRoot();window.scrollTo({left:saved.scroll.x,top:saved.scroll.y,behavior:'instant'})}
 }
 // Focus handlers apply to every editable control, including picker searches,
 // account/category/tag forms, settings, filters, OCR and backup text areas.
 dialog.addEventListener('focusin',()=>{if(active){sync();schedule()}});
 dialog.addEventListener('focusout',schedule);
 dialog.addEventListener('input',schedule);
 new MutationObserver(schedule).observe(dialog,{subtree:true,childList:true});
 dialog.addEventListener('toggle',()=>{if(!dialog.open)afterClose()});
 dialog.addEventListener('close',()=>{if(!dialog.open)afterClose()});
 window.addEventListener('resize',schedule,{passive:true});window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('orientationchange',schedule,{passive:true});
 viewport?.addEventListener('resize',schedule,{passive:true});viewport?.addEventListener('scroll',schedule,{passive:true});keyboard?.addEventListener('geometrychange',schedule);
 dialog.addEventListener('touchstart',event=>{touchY=event.touches[0]?.clientY||0},{passive:true});
 dialog.addEventListener('touchmove',event=>{if(!active||event.touches.length!==1)return;const target=event.target;if(target===document.activeElement&&target.matches?.('input,textarea,[contenteditable]')||!window.getSelection()?.isCollapsed)return;const scroller=target.closest?.(SCROLLERS),y=event.touches[0].clientY,dy=y-touchY;touchY=y;if(!scroller||scroller.scrollHeight<=scroller.clientHeight+1||scroller.scrollTop<=0&&dy>0||scroller.scrollTop>=scroller.scrollHeight-scroller.clientHeight-1&&dy<0)event.preventDefault()},{passive:false});
 return{beforeOpen,afterRender,afterClose};
}
