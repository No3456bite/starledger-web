
// Pure Web build. The legacy Scriptable bridge is archived in GitHub.
const BOOT=/*__BOOT__*/null;
const COLS=['id','date','type','category','subcategory','amount','account','account2','reimbursement','note','image','role','tags','currency','merchant','book','extras','created_at','updated_at'];
const labels={home:'首页',stats:'月/年',books:'账本',accounts:'账户',search:'查账'};
const navIcon=path=>`<svg viewBox="0 0 24 24" aria-hidden="true">${path}</svg>`;
const icons={
 home:navIcon('<path d="M3.5 10.5 12 3l8.5 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-5v-6H10v6H5a1.5 1.5 0 0 1-1.5-1.5Z"/>'),
 stats:navIcon('<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M8 2v4M16 2v4M3 9h18M8 13v4M12 13v4M16 13v4"/>'),
 books:navIcon('<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5Z"/><path d="M5 4.5v17M9 6h7"/>'),
 accounts:navIcon('<rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 14h2"/>'),
 search:navIcon('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>')
};
const SETTINGS_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.86 2.86-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21H9.6v-.1A1.7 1.7 0 0 0 8.5 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.86-2.86.06-.06A1.7 1.7 0 0 0 4.1 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2V9.6h.4A1.7 1.7 0 0 0 4.1 8.5a1.7 1.7 0 0 0-.34-1.88l-.06-.06L6.56 3.7l.06.06A1.7 1.7 0 0 0 8.5 4.1a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2h4v.4A1.7 1.7 0 0 0 15 4.1a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.86 2.86-.06.06A1.7 1.7 0 0 0 19.4 8.5a1.7 1.7 0 0 0 .6 1 1.7 1.7 0 0 0 1.1.4h.4v4h-.4a1.7 1.7 0 0 0-1.7 1.1Z"></path></svg>';
const BACK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"></path></svg>';
const today=new Date(),cycleToday=new Date(today.getFullYear(),today.getMonth()-(today.getDate()<Number(BOOT?.settings?.monthStartDay||1)?1:0),1),nowYear=cycleToday.getFullYear(),nowMonth=cycleToday.getMonth()+1;
let entryInstantRender=false;
let rows=[],revision='',native=!!BOOT?.native,section='home',year=nowYear,month=nowMonth,book='全部账本',query='',kind='全部类型',account='全部账户',category='全部分类',subcategory='全部小类',currencyFilter='全部币种',day='',page=0,pending=new Map(),seq=0,configured={};
let statsMode='month';

const PRIMARY_PAGE_ORDER=['home','stats','books','accounts','search'];
const PAGE_ORDER=[...PRIMARY_PAGE_ORDER,'settings'];
const compactViewport=()=>matchMedia('(max-width:760px)').matches;
const browserTabScrollMode=()=>compactViewport()&&document.documentElement.classList.contains('browser-tab');
let rc20TransitionDir=0,rc20TransitionTimer=0;
let rc21SettingsReturn='home';
let rc23OldPageHTML='',rc23OldScrollY=0;
let rc55OldFloatingHTML='',rc55OldFloatingTop=0,rc55OldFloatingVisible=false;
let rc27Animating=false,rc27QueuedPage='';
const rc27PageScroll=Object.fromEntries(PAGE_ORDER.map(k=>[k,0]));let rc27TargetScroll=0;
function getPageScroll(){let content=document.querySelector('#content');return compactViewport()&&!browserTabScrollMode()?(content?.scrollTop||0):(window.scrollY||document.documentElement.scrollTop||0)}
function scrollPageTo(v,behavior='auto'){v=Math.max(0,Number(v)||0);let content=document.querySelector('#content'),options={top:v,behavior};if(compactViewport()&&!browserTabScrollMode()){if(content)content.scrollTo(options)}else window.scrollTo(options)}
function setPageScroll(v){scrollPageTo(v,'auto')}
function rc55CaptureFloating(){
 const floating=document.querySelector('#floatingControls');
 if(!floating||floating.hidden||!floating.innerHTML.trim())return {visible:false,html:'',top:0};
 let top=Number.parseFloat(floating.style.top);
 if(!Number.isFinite(top))top=floating.getBoundingClientRect().top;
 return {visible:true,html:floating.innerHTML,top:Math.max(0,top||0)};
}
function rc55SceneHTML(contentHTML,scrollY,floatState){
 let scroll='<div class="rc55-scroll-snapshot" style="transform:translate3d(0,-'+Math.max(0,Number(scrollY)||0)+'px,0)">'+contentHTML+'</div>';
 let floating=floatState?.visible?'<div class="rc55-floating-snapshot" style="top:'+Math.max(0,Number(floatState.top)||0)+'px">'+floatState.html+'</div>':'';
 return scroll+floating;
}
function rc20SetPage(next){
 if(!prefs.mainName&&next!=='settings')next='home';
 let fromPrimary=PRIMARY_PAGE_ORDER.indexOf(section),toPrimary=PRIMARY_PAGE_ORDER.indexOf(next),
     fromPage=PAGE_ORDER.indexOf(section),toPage=PAGE_ORDER.indexOf(next),
     content=document.querySelector('#content'),
     canAnimate=compactViewport()&&!browserTabScrollMode()&&fromPrimary>=0&&toPrimary>=0&&fromPrimary!==toPrimary;
 rc20TransitionDir=canAnimate?(toPrimary>fromPrimary?1:-1):0;
 if(fromPage>=0)rc27PageScroll[section]=getPageScroll();
 if(canAnimate){
  window.__rc54PlaceFloating?.();
  rc23OldPageHTML=content?.innerHTML||'';
  rc23OldScrollY=content?.scrollTop||0;
  let floating=rc55CaptureFloating();
  rc55OldFloatingHTML=floating.html;
  rc55OldFloatingTop=floating.top;
  rc55OldFloatingVisible=floating.visible;
 }else{
  rc23OldPageHTML='';
  rc55OldFloatingHTML='';
  rc55OldFloatingVisible=false;
 }
 rc27TargetScroll=toPage>=0?(rc27PageScroll[next]||0):0;
 section=next;
}
function rc20AnimatePage(){
 let live=document.querySelector('#content'),
     viewport=document.querySelector('#pageViewport'),
     floatingLive=document.querySelector('#floatingControls'),
     backToTop=document.querySelector('#backToTop');
 if(!live||!viewport){
  rc20TransitionDir=0;rc23OldPageHTML='';return;
 }

 // Desktop and normal mobile browser tabs use one real document scroller.
 // Installed PWA mode keeps the mobile snapshot engine.
 if(!compactViewport()||browserTabScrollMode()){
  viewport.querySelectorAll('.rc27-page,.rc62-neighbor-scene').forEach(n=>n.remove());
  live.style.visibility='';
  if(floatingLive)floatingLive.style.visibility='';
  if(backToTop)backToTop.style.visibility='';
  rc27Animating=false;
  setPageScroll(rc27TargetScroll||0);
  rc20TransitionDir=0;rc23OldPageHTML='';rc55OldFloatingHTML='';rc55OldFloatingVisible=false;
  return;
 }

 if(!rc20TransitionDir||!rc23OldPageHTML){
  setPageScroll(rc27TargetScroll||0);
  window.__rc54PlaceFloating?.();
  rc20TransitionDir=0;rc23OldPageHTML='';
  return;
 }

 clearTimeout(rc20TransitionTimer);
 rc27Animating=true;
 window.__rc54PlaceFloating?.();
 let dir=rc20TransitionDir,
     newHTML=live.innerHTML||'',
     newFloating=rc55CaptureFloating(),
     old=document.createElement('div'),
     fresh=document.createElement('div');

 old.className='rc27-page rc27-old '+(dir>0?'left':'right');
 fresh.className='rc27-page rc27-new '+(dir>0?'right':'left');
 old.setAttribute('aria-hidden','true');
 fresh.setAttribute('aria-hidden','true');
 old.innerHTML=rc55SceneHTML(rc23OldPageHTML,rc23OldScrollY,{visible:rc55OldFloatingVisible,html:rc55OldFloatingHTML,top:rc55OldFloatingTop});
 fresh.innerHTML=rc55SceneHTML(newHTML,rc27TargetScroll||0,newFloating);

 live.style.visibility='hidden';
 if(floatingLive)floatingLive.style.visibility='hidden';
 if(backToTop)backToTop.style.visibility='hidden';

 viewport.querySelectorAll('.rc27-page').forEach(n=>n.remove());
 viewport.append(old,fresh);

 let finished=false;
 const finish=()=>{
  if(finished)return;
  finished=true;
  clearTimeout(rc20TransitionTimer);
  viewport.querySelectorAll('.rc27-page').forEach(n=>n.remove());
  setPageScroll(rc27TargetScroll||0);
  window.__rc54PlaceFloating?.();
  live.style.visibility='';
  if(floatingLive)floatingLive.style.visibility='';
  if(backToTop)backToTop.style.visibility='';
  rc27Animating=false;
  renderSelection();
  updateBackToTop();
  if(rc27QueuedPage&&rc27QueuedPage!==section){
   let next=rc27QueuedPage;rc27QueuedPage='';
   rc20SetPage(next);render();
  }else rc27QueuedPage='';
 };
 fresh.addEventListener('animationend',finish,{once:true});
 rc20TransitionTimer=setTimeout(finish,360);
 rc20TransitionDir=0;rc23OldPageHTML='';rc55OldFloatingHTML='';rc55OldFloatingVisible=false;
}

function rc6ApplyPageDefaults(target){
 if(target==='search'){
  searchPeriod='range';
  searchDateMode='range';
  searchRangeStart='';
  searchRangeEnd=localDate(new Date());
 }
 day='';
 page=0;
}
function rc6Navigate(target){
 if(!PRIMARY_PAGE_ORDER.includes(target)||target===section)return;
 if(rc27Animating){rc27QueuedPage=target;return}
 rc20SetPage(target);
 rc6ApplyPageDefaults(target);
 render();
}
function rc6EdgeBounce(direction){
 if(rc27Animating)return;
 const body=document.body,cls=direction==='right'?'rc6-edge-right':'rc6-edge-left';
 body.classList.remove('rc6-edge-left','rc6-edge-right');
 void body.offsetWidth;
 body.classList.add(cls);
 clearTimeout(window.__rc6EdgeTimer);
 window.__rc6EdgeTimer=setTimeout(()=>body.classList.remove(cls),280);
}

let selection=new Set(),longPressTimer=null,longPressStart=null,suppressRecordClick=false,composingQuery=false,calcState={left:null,op:null,fresh:false};
document.documentElement.classList.toggle('scriptable',native);
document.body.insertAdjacentHTML('beforeend','<div class="selectionbar" id="selectionBar"></div>');
const $=s=>document.querySelector(s);
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}


function syncDesktopLevelWidths(){
 if(compactViewport())return;
 let root=document.documentElement,
     side=document.querySelector('.side'),
     vw=Math.max(0,Math.round(window.innerWidth||document.documentElement.clientWidth||0)),
     vh=Math.max(0,Math.round(window.innerHeight||document.documentElement.clientHeight||0)),
     l1=Math.max(0,Math.round(side?.getBoundingClientRect().width||0)),
     remain=Math.max(0,vw-l1),
     l3;

 // The original compact editor is roughly 0.64 wide for every 1.0 high.
 // On roomy desktops, preserve that visual proportion instead of splitting 1:1.
 // On narrow desktop windows, fall back toward 1:1 so the editor never becomes unusably thin.
 if(remain>=1100){
   let aspectTarget=Math.round(vh*.64),
       lower=Math.min(540,Math.round(remain*.44)),
       upper=Math.min(720,Math.round(remain*.44));
   l3=Math.max(lower,Math.min(aspectTarget,upper));
 }else{
   l3=Math.floor(remain*.5);
 }
 let l2=Math.max(0,remain-l3);

 root.style.setProperty('--level1-px',l1+'px');
 root.style.setProperty('--level2-px',l2+'px');
 root.style.setProperty('--level3-px',l3+'px');
 root.style.setProperty('--viewport-px',vw+'px');
 root.style.setProperty('--viewport-h-px',vh+'px');
}
function setDesktopSidebarCollapsed(collapsed){
 if(compactViewport())collapsed=false;
 document.body.classList.toggle('side-collapsed',!!collapsed);
 let button=$('#sideToggle');
 if(button){button.textContent='';button.setAttribute('aria-label',collapsed?'展开左侧栏':'收起左侧栏');button.setAttribute('aria-expanded',String(!collapsed))}
 try{localStorage.setItem('star-ledger-side-collapsed',collapsed?'1':'0')}catch(e){}
 requestAnimationFrame(syncDesktopLevelWidths);
 setTimeout(syncDesktopLevelWidths,305);
}
function toggleDesktopSidebar(){setDesktopSidebarCollapsed(!document.body.classList.contains('side-collapsed'))}
try{requestAnimationFrame(()=>setDesktopSidebarCollapsed(localStorage.getItem('star-ledger-side-collapsed')==='1'))}catch(e){}


function csvParse(s,legacyBook='日常账本'){s=String(s).replace(/^\uFEFF/,'');let out=[],row=[],field='',quoted=false;for(let i=0;i<s.length;i++){let c=s[i];if(quoted){if(c==='"'&&s[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'){row.push(field.replace(/\r$/,''));out.push(row);row=[];field=''}else field+=c}if(field||row.length){row.push(field.replace(/\r$/,''));out.push(row)}let index=out.findIndex(r=>COLS.every(k=>r.includes(k))),legacy=false;if(index<0){index=out.findIndex(r=>['类型','日期','大类','小类','金额','账户','账户2'].every(k=>r.includes(k)));legacy=true}if(index<0)throw Error('CSV 格式不匹配：请选择账本 CSV 或小星的原始导入模板');let head=out[index].map(x=>x.replace(/^\uFEFF/,''));return out.slice(index+1).filter(r=>r.some(Boolean)).map((r,i)=>{let source=Object.fromEntries(head.map((k,j)=>[k,r[j]||'']));if(!legacy)return Object.fromEntries(COLS.map(k=>[k,source[k]||'']));let fields={'类型':'type','日期':'date','大类':'category','小类':'subcategory','金额':'amount','账户':'account','账户2':'account2','报销':'reimbursement','备注':'note','图片':'image','角色':'role','标签':'tags','币种':'currency','商家':'merchant'};let obj=Object.fromEntries(COLS.map(k=>[k,'']));for(let [a,b] of Object.entries(fields))obj[b]=source[a]||'';obj.type=obj.type==='支出或应付款'?'支出':obj.type==='收入或应收款'?'收入':obj.type;obj.date=obj.date.replace(/\//g,'-');obj.book=legacyBook||'日常账本';obj.currency=obj.currency||'人民币';obj.id='LEG-'+digest(JSON.stringify([obj.book,r]))+'-'+i;return obj})}
function csvWrite(data){return '\uFEFF'+COLS.join(',')+'\r\n'+data.map(r=>COLS.map(k=>'"'+String(r[k]??'').replace(/"/g,'""')+'"').join(',')).join('\r\n')+'\r\n'}
function digest(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
function takeCsv(s){rows=csvParse(s);revision=digest(s);render()}
function amount(r){return Number(r.amount)||0}function isCNY(r){return !r.currency||r.currency==='人民币'||r.currency==='CNY'}
const CURRENCY_NAMES={CNY:'人民币',USD:'美元',EUR:'欧元',JPY:'日元',HKD:'港币',GBP:'英镑',AUD:'澳元',CAD:'加拿大元',SGD:'新加坡元',TWD:'新台币',KRW:'韩元',CHF:'瑞士法郎',NZD:'新西兰元',THB:'泰铢',MYR:'马来西亚林吉特',MOP:'澳门元'};
const POPULAR_CURRENCIES=['CNY','USD','EUR','JPY','HKD','GBP','AUD','CAD','SGD','TWD','KRW','CHF','NZD','THB','MYR','MOP'];
function currencyCode(value){let v=String(value||'人民币').toUpperCase();return Object.keys(CURRENCY_NAMES).find(k=>CURRENCY_NAMES[k]===value)||v}
function currencyLabel(code){if(CURRENCY_NAMES[code])return CURRENCY_NAMES[code]+' · '+code;try{return new Intl.DisplayNames(['zh-CN'],{type:'currency'}).of(code)+' · '+code}catch(e){return code}}
function currencyOptions(current){let codes;try{codes=Intl.supportedValuesOf('currency')}catch(e){codes=POPULAR_CURRENCIES}let common=POPULAR_CURRENCIES.map(code=>code==='CNY'?'人民币':code==='USD'?'美元':code),others=codes.filter(code=>!POPULAR_CURRENCIES.includes(code)),existing=unique('currency').filter(v=>!common.includes(v)&&!others.includes(v)),all=[...common,...others,...existing];if(current&&!all.includes(current))all.push(current);return `<optgroup label="常用币种">${common.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(currencyLabel(currencyCode(v)))}</option>`).join('')}</optgroup><optgroup label="全部币种">${all.slice(common.length).map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(currencyLabel(currencyCode(v)))}</option>`).join('')}</optgroup>`}
function money(n,c='人民币'){let value=Number(n||0),code=currencyCode(c);if(code==='CNY'||code==='USD')return(code==='CNY'?'¥':'$')+value.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});try{return new Intl.NumberFormat('zh-CN',{style:'currency',currency:code,minimumFractionDigits:2,maximumFractionDigits:2}).format(value)}catch(e){return String(c)+' '+value.toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2})}}
function fxInfo(r){try{let fx=JSON.parse(r.extras||'{}').fx,rate=Number(fx?.rate);return rate>0&&Number.isFinite(rate)?fx:null}catch(e){return null}}
let ledgerRuntimeRates={};
function runtimeFxInfo(r){let code=currencyCode(r.currency),raw=ledgerRuntimeRates?.[code],rate=Number(typeof raw==='number'?raw:raw?.rate);return rate>0&&Number.isFinite(rate)?{rate,date:raw?.date||'',source:raw?.source||'runtime'}:null}
function cnyAmount(r){if(isCNY(r))return amount(r);let fx=fxInfo(r)||runtimeFxInfo(r);return fx?amount(r)*Number(fx.rate):null}
function dateOf(r){return String(r.date).replace(/\//g,'-').slice(0,10)}function ym(r){return dateOf(r).slice(0,7)}
function cycleRange(y,m){let n=Math.max(1,Math.min(28,Number(prefs.monthStartDay)||1)),start=new Date(y,m-1,n),end=new Date(y,m,n);return [localDate(start),localDate(end)]}
function localDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function inCycle(dt,y,m){let [start,end]=cycleRange(y,m);return dt>=start&&dt<end}
function recordHidden(r){return !!(prefs.accountProfiles?.[r.account]?.hidden||prefs.accountProfiles?.[r.account2]?.hidden)}
function filtered(base,{monthOnly=false,yearOnly=false}={}){return base.filter(r=>{if(recordHidden(r))return false;let dt=dateOf(r);return (!yearOnly||(dt>=cycleRange(year,1)[0]&&dt<cycleRange(year+1,1)[0]))&&(!monthOnly||inCycle(dt,year,month))&&(!day||dt===day)&&(book==='全部账本'||r.book===book)&&(kind==='全部类型'||r.type===kind)&&(account==='全部账户'||r.account===account||r.account2===account)&&(category==='全部分类'||r.category===category)&&(subcategory==='全部小类'||r.subcategory===subcategory)&&(currencyFilter==='全部币种'||currencyCode(r.currency)===currencyCode(currencyFilter))&&(searchTag==='全部标签'||tagParts(r.tags).includes(searchTag))&&(!query||[r.date,r.type,r.category,r.subcategory,r.amount,r.account,r.account2,r.note,r.tags,r.merchant,r.book,r.currency,currencyCode(r.currency),money(amount(r),r.currency)].some(x=>String(x||'').toLowerCase().includes(query.toLowerCase())))}).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))}
function stats(rs){let income=0,expense=0,other=0;for(let r of rs){let n=cnyAmount(r);if(n===null){other++;continue}if(r.type==='支出')expense+=n;if(r.type==='收入')income+=n}return {income,expense,net:income-expense,other}}
function opts(values,current){return values.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('')}
function choices(field,first,current){let visible=rows.filter(r=>!recordHidden(r)),values;if(field==='account')values=accountNames();else if(field==='book')values=orderedBookNames(false).filter(name=>visible.some(r=>r.book===name));else values=[...new Set(visible.map(r=>r[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));return `<select data-filter="${field}" aria-label="${esc(first)}">${opts([first,...values],current)}</select>`}
function dateBanner(includeMonth=true){let years=[...new Set(rows.map(r=>{let d=new Date(dateOf(r)+'T00:00:00');if(!Number.isFinite(d.getTime()))return 0;if(d.getDate()<Number(prefs.monthStartDay||1))d.setMonth(d.getMonth()-1);return d.getFullYear()}).filter(Boolean))].sort((a,b)=>b-a);if(!years.includes(year))years.unshift(year);return `<span class="date-banner ${includeMonth?'':'year-only'}"><select data-filter="year" aria-label="年份">${opts(years.map(String),String(year))}</select>${includeMonth?`<select data-filter="month" aria-label="月份">${opts(Array.from({length:12},(_,i)=>String(i+1)),String(month))}</select>`:''}</span>`}
function commonFilters(includeMonth=true){return `<div class="date-filter-row">${dateBanner(includeMonth)}${choices('book','全部账本',book).replace('<select ','<select class="date-filter-book" ')}</div>`}
function metric(label,val,sub,klass=''){return `<div class="card metric"><div class="label">${label}</div><strong class="${klass}">${val}</strong>${sub?`<small>${sub}</small>`:''}</div>`}
function recordHeadline(r){let choice=prefs.recordTitle||'both';if(choice==='category')return r.category||r.subcategory||r.note||r.type;if(choice==='subcategory')return r.subcategory||r.category||r.note||r.type;if(choice==='both')return [r.category,r.subcategory].filter(Boolean).join(' / ')||r.note||r.type;return r.note||r.merchant||r.subcategory||r.type}
function records(rs,limit=10){if(!rs.length)return '<div class="empty">没有符合条件的账单</div>';let shown=rs.slice(0,limit);return shown.map((r,i)=>{let next=shown[i+1],monthBreak=!!next&&ym(r)!==ym(next);return `<div class="row ${monthBreak?'month-break':''}" data-rowid="${esc(r.id)}"><input class="rowcheck" type="checkbox" data-check="${esc(r.id)}" aria-label="选择账单" ${selection.has(r.id)?'checked':''}><button data-id="${esc(r.id)}"><span class="record-copy"><span class="record-first"><b class="title">${esc(recordHeadline(r))}</b><small class="record-wallet">－ ${esc(r.account||'未选账户')}</small></span><small class="record-note">${esc((prefs.recordTitle==='note'?[r.category,r.subcategory].filter(Boolean).join(' / '):r.note)||'　')}</small><small class="record-time">${esc(String(r.date||'').replace('T',' ').slice(0,19))}</small></span><span class="record-amount"><span class="amount ${r.type==='支出'?'negative':r.type==='收入'?'positive':''}">${r.type==='支出'?'-':''}${money(amount(r),r.currency)}</span>${!isCNY(r)&&cnyAmount(r)!==null?`<small class="amount-converted">≈ ${money(cnyAmount(r))}</small>`:''}</span></button></div>`}).join('')}
function displayAmount(n,group=true){let value=Number((Number(n)||0).toFixed(2));return group?value.toLocaleString('zh-CN',{maximumFractionDigits:2}):String(value)}
function categories(rs,type='支出'){let sums={};for(let r of rs)if(r.type===type&&cnyAmount(r)!==null)sums[(type==='收入'?r.subcategory:r.category)||'未分类']=(sums[(type==='收入'?r.subcategory:r.category)||'未分类']||0)+cnyAmount(r);return Object.entries(sums).sort((a,b)=>b[1]-a[1])}
function catList(rs,type='支出'){let a=categories(rs,type),total=a.reduce((n,x)=>n+x[1],0);return a.length?a.slice(0,9).map(([k,v])=>`<div class="category ${type==='收入'?'income-bars':'expense-bars'}"><button data-cat="${esc(k)}" data-cattype="${type}"><div class="categoryline"><b>${esc(k)}</b><span style="font-size:${Math.max(9,Math.min(13,Math.floor(103/Math.max(7,displayAmount(v).length+5))))}px">¥${displayAmount(v)} · ${total?(v/total*100).toFixed(1):0}%</span></div><div class="track"><div class="fill" style="width:${total?v/total*100:0}%"></div></div></button></div>`).join(''):`<div class="empty">这个期间没有人民币${type}</div>`}
let categoryChartMode='bar',categoryFlow='支出';
function donutChart(rs,type='支出'){let all=categories(rs,type),total=all.reduce((a,x)=>a+x[1],0);if(!total)return `<div class="empty">这个期间没有人民币${type}</div>`;let shown=all.slice(0,7),other=all.slice(7).reduce((n,x)=>n+x[1],0),items=other?[...shown,['其他',other]]:shown,colors=['#008f78','#e88742','#677bc5','#be709e','#66aeb2','#a4934e','#d06966','#89949a'],offset=0,c=2*Math.PI*42;let circles=items.map(([name,value],i)=>{let size=value/total*c,start=offset;offset+=size;return `<circle cx="60" cy="60" r="42" fill="none" stroke="${colors[i]}" stroke-width="16" stroke-dasharray="${size} ${c-size}" stroke-dashoffset="${-start}" transform="rotate(-90 60 60)"><title>${esc(name)} ¥${displayAmount(value)} · ${(value/total*100).toFixed(1)}%</title></circle>`}).join('');let full=displayAmount(total),font=Math.max(7,Math.min(14,Math.floor(90/full.length)));return `<div class="donut-layout"><div class="donut-chart"><svg viewBox="0 0 120 120" role="img" aria-label="${type}分类环图"><circle cx="60" cy="60" r="42" fill="none" stroke="var(--line)" stroke-width="16"/>${circles}<text class="donut-label" x="60" y="56" text-anchor="middle">${type}合计</text><text class="donut-total" x="60" y="74" text-anchor="middle" style="font-size:${font}px">¥${full}</text></svg></div><div class="donut-legend">${items.map(([name,value],i)=>{let content=`<span class="donut-dot" style="--dot:${colors[i]}"></span><span class="name">${esc(name)}</span><span class="value" style="font-size:${Math.max(8,Math.min(12,Math.floor(84/Math.max(6,displayAmount(value).length))))}px">${displayAmount(value)}</span>`;return other&&i===items.length-1?`<div class="donut-other">${content}</div>`:`<button data-cat="${esc(name)}" data-cattype="${type}" aria-label="查看${esc(name)}${type}账单">${content}</button>`}).join('')}</div></div>`}
function categoryPanel(rs,scope,title='分类统计'){let mode=categoryChartMode,type=categoryFlow;return `<div class="sectionhead category-head"><h2>${title}</h2><div class="category-controls"><div class="category-switch" role="group" aria-label="收入或支出">${['支出','收入'].map(k=>`<button type="button" class="${type===k?'active':''}" data-categoryflow="${k}" aria-pressed="${type===k}">${k}</button>`).join('')}</div><div class="category-switch" role="group" aria-label="分类图表样式">${[['bar','柱图'],['donut','环图']].map(([k,label])=>`<button type="button" class="${mode===k?'active':''}" data-categorymode="${k}" aria-pressed="${mode===k}">${label}</button>`).join('')}</div></div></div>${mode==='donut'?donutChart(rs,type):catList(rs,type)}`}
function yearlyNetChart(months){
 let incomeMax=Math.max(0,...months.map(m=>Number(m.income)||0)),
     expenseMax=Math.max(0,...months.map(m=>Number(m.expense)||0)),
     span=incomeMax+expenseMax||1,
     zero=expenseMax/span*100,
     overall=months.reduce((acc,m)=>({income:acc.income+m.income,expense:acc.expense+m.expense}),{income:0,expense:0}),
     positiveNets=months.map(m=>Math.max(0,(Number(m.income)||0)-(Number(m.expense)||0))),
     maxPositive=Math.max(0,...positiveNets),
     STAR_MAX_SIZE_PT=40;

 let total=(name,value,klass='')=>`<span><small>${name}</small><b class="${klass}" style="font-size:${Math.max(10,Math.min(14,Math.floor(114/Math.max(7,displayAmount(value).length+1))))}px">¥${displayAmount(value)}</b></span>`;

 return `<div class="year-flow-totals">
   ${total('总支出',overall.expense,'negative')}
   ${total('总收入',overall.income,'positive')}
   ${total('总结余',overall.income-overall.expense,overall.income-overall.expense<0?'negative':'positive')}
  </div>
  <div class="year-flow-list" style="--zero:${zero}%">
   <div class="year-flow-axis" aria-hidden="true"><span></span><span class="year-flow-axis-track"></span></div>
   ${months.map((m,i)=>{
     let income=Number(m.income)||0,
         expense=Number(m.expense)||0,
         red=expense/span*100,
         green=income/span*100,
         end=zero+green,
         has=income>0||expense>0,
         n=income-expense,
         label=has&&Math.abs(n)>=0.005?`${n<0?'−':''}${displayAmount(Math.abs(n))}`:'',
         starPt=n>0&&maxPositive>0?Math.max(4,Math.round((n/maxPositive)*STAR_MAX_SIZE_PT)):0;
     return `<button class="year-flow-row" data-month="${i+1}" aria-label="${i+1} 月收入 ${money(m.income)}，支出 ${money(m.expense)}，结余 ${money(n)}；查看月度">
       <b>${i+1}月</b>
       <span class="year-flow-plot" style="--zero:${zero}%">
        <span class="year-flow-bar expense" style="left:${zero-red}%;width:${red}%"></span>
        <span class="year-flow-bar income" style="left:${zero}%;width:${green}%"></span>
        ${starPt?`<span class="year-flow-star" aria-hidden="true" style="left:${zero}%;--star-size:${starPt}pt"></span>`:''}
        ${label?`<span class="year-flow-result ${n<0?'negative':n>0?'positive':''}" style="left:${end}%">${label}</span>`:''}
       </span>
      </button>`;
   }).join('')}
  </div>`;
}
function monthCards(rs){let s=stats(rs);return `<div class="card month-overview"><div class="overview-stats"><div><small>本月收入</small><strong class="positive">${money(s.income)}</strong></div><div><small>本月支出</small><strong class="negative">${money(s.expense)}</strong></div><div><small>本月结余</small><strong class="${s.net<0?'negative':'positive'}">${money(s.net)}</strong></div></div></div>${s.other?`<p class="muted">另有 ${s.other} 笔外币流水未折算，以上金额只统计人民币。</p>`:''}`}
function budgetKey(){return '__global_monthly__'}
function currentBudget(){let saved=prefs.budgets||{};if(Object.hasOwn(saved,budgetKey())){let raw=saved[budgetKey()],num=Number(raw);return raw===null||raw===''||!Number.isFinite(num)?{has:false,value:0}:{has:true,value:num}}let previous=Object.keys(saved).filter(k=>/^\d{4}-\d{2}\|/.test(k)).sort().pop();return previous?{has:true,value:Number(saved[previous])||0}:{has:false,value:0}}
function budgetForm(){let budget=currentBudget();$('#overlay').innerHTML=`<div class="modalback"><div class="modal"><h2>每月预算</h2><form id="budgetForm"><label class="field">预算金额（人民币）<input name="budget" type="number" min="0" step="0.01" inputmode="decimal" value="${budget.has?esc(budget.value):''}" required></label><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">保存</button></div></form></div></div>`}
function budgetState(){let spent=stats(rows.filter(r=>!recordHidden(r)&&inCycle(dateOf(r),year,month))).expense,{has,value}=currentBudget();return {spent,has,value,left:value-spent}}
const BANNER_DEFAULTS={homeAssets:['net','assets','debt'],homeMonth:['monthNet','monthIncome','monthExpense','budgetLeft'],monthPage:['monthNet','monthIncome','monthExpense','budgetLeft'],yearPage:['yearNet','yearIncome','yearExpense','monthAvgExpense']};
const BANNER_TITLES={homeAssets:'首页 · 资产概览',homeMonth:'首页 · 本月概览',monthPage:'月度页概览',yearPage:'年度页概览'};
const BANNER_POOLS={
 asset:[['net','净资产'],['assets','总资产'],['debt','总负债'],['accountCount','账户数'],['includedAccounts','计入净资产账户'],['calibratedAccounts','已校准账户']],
 month:[['monthNet','本月结余'],['monthIncome','本月收入'],['monthExpense','本月支出'],['budgetLeft','剩余预算'],['budgetAmount','每月预算'],['budgetUsed','预算使用率'],['dailyExpenseAvg','日均支出'],['monthlyExpenseAvg','月均支出'],['yearlyExpenseAvg','年均支出'],['avgExpense','平均每笔支出'],['maxExpense','最大单笔支出'],['maxIncome','最大单笔收入'],['expenseCount','支出笔数'],['incomeCount','收入笔数'],['billCount','账单笔数'],['activeDays','记账天数']],
 year:[['yearNet','年度结余'],['yearIncome','年度收入'],['yearExpense','年度支出'],['dailyExpenseAvg','日均支出'],['monthAvgExpense','月均支出'],['yearlyExpenseAvg','年均支出'],['avgExpense','平均每笔支出'],['maxExpense','最大单笔支出'],['maxMonthExpense','最大单月支出'],['expenseCount','支出笔数'],['incomeCount','收入笔数'],['billCount','账单笔数'],['activeMonths','记账月份']]
};
function bannerKind(key){return key==='homeAssets'?'asset':key==='yearPage'?'year':'month'}
function bannerPool(key){return BANNER_POOLS[bannerKind(key)]||[]}
function bannerLabel(key,id){return bannerPool(key).find(x=>x[0]===id)?.[1]||id}
let bannerDraftConfigs={};
// rc11.5: Banner has one persisted source of truth: prefs.bannerConfigs.
// A draft exists only while the configuration modal is open so the page can preview it.
function normalizeBannerSlots(key,source){let allowed=new Set(bannerPool(key).map(x=>x[0])),seen=new Set();return (Array.isArray(source)?source:[]).filter(id=>allowed.has(id)&&!seen.has(id)&&seen.add(id)).slice(0,4)}
function bannerConfig(key){let source=Object.prototype.hasOwnProperty.call(bannerDraftConfigs,key)?bannerDraftConfigs[key]:(prefs.bannerConfigs&&Object.prototype.hasOwnProperty.call(prefs.bannerConfigs,key)?prefs.bannerConfigs[key]:BANNER_DEFAULTS[key]);return normalizeBannerSlots(key,source)}
function bannerFormSlots(form,key){let fd=new FormData(form);return normalizeBannerSlots(key,[0,1,2,3].map(i=>String(fd.get('slot'+i)||'')))}
function bannerMetricsForKey(key){if(key==='homeAssets')return assetBannerMetrics(financial());if(key==='homeMonth'||key==='monthPage')return monthBannerMetrics(filtered(rows,{monthOnly:true}));if(key==='yearPage'){let rs=cycleYearRows(year),monthsData=Array.from({length:12},(_,i)=>{let mr=filtered(rows).filter(r=>inCycle(dateOf(r),year,i+1)),st=stats(mr);return {income:st.income,expense:st.expense,net:st.net}});return yearBannerMetrics(rs,monthsData)}return {}}
function bannerBelongsToVisiblePage(key){return (section==='home'&&(key==='homeAssets'||key==='homeMonth'))||(section==='stats'&&statsMode==='month'&&key==='monthPage')||(section==='stats'&&statsMode==='year'&&key==='yearPage')}
function refreshVisibleBanner(key){if(!bannerBelongsToVisiblePage(key))return;let node=$('#pageBody')?.querySelector('.metric-banner[data-bannerconfig="'+key+'"]'),html=renderMetricBanner(key,bannerMetricsForKey(key));if(node){if(html)node.outerHTML=html;else node.remove()}else if(html){render()}}
function clearBannerDraft(key,rerender=true){if(Object.prototype.hasOwnProperty.call(bannerDraftConfigs,key)){delete bannerDraftConfigs[key];if(rerender&&bannerBelongsToVisiblePage(key))render()}}
function cycleParts(dt){let d=new Date(String(dt).slice(0,10)+'T12:00:00');if(!Number.isFinite(d.getTime()))return null;if(d.getDate()<Math.max(1,Math.min(28,Number(prefs.monthStartDay)||1)))d.setMonth(d.getMonth()-1);return {year:d.getFullYear(),month:d.getMonth()+1}}
function utcDay(s){let [y,m,d]=String(s).slice(0,10).split('-').map(Number);return Date.UTC(y,m-1,d)/86400000}
function elapsedCycleDays(y,m){let [start,end]=cycleRange(y,m),now=localDate(today),total=Math.max(1,utcDay(end)-utcDay(start));if(now<start)return 0;if(now>=end)return total;return Math.max(1,Math.min(total,utcDay(now)-utcDay(start)+1))}
function currentCycleParts(){return cycleParts(localDate(today))||{year:today.getFullYear(),month:today.getMonth()+1}}
function elapsedCycleMonths(y){let c=currentCycleParts();return y<c.year?12:y>c.year?0:Math.max(1,Math.min(12,c.month))}
function cycleYearRows(y){let start=cycleRange(y,1)[0],end=cycleRange(y+1,1)[0];return filtered(rows).filter(r=>{let d=dateOf(r);return d>=start&&d<end})}
function historicalYearlyExpenseAvg(){let base=filtered(rows),current=currentCycleParts(),groups=new Map();for(let r of base){let cp=cycleParts(dateOf(r));if(!cp||cp.year>=current.year)continue;let g=groups.get(cp.year)||{months:new Set(),expense:0};g.months.add(cp.month);let n=cnyAmount(r);if(n!==null&&r.type==='支出')g.expense+=n;groups.set(cp.year,g)}let complete=[...groups.values()].filter(g=>g.months.size===12);return complete.length?complete.reduce((n,g)=>n+g.expense,0)/complete.length:null}
function metricMoney(value,klass=''){return {value:value===null||value===undefined?'—':money(value),klass}}
function metricCount(value,unit='笔'){return {value:`${Number(value||0).toLocaleString('zh-CN')} ${unit}`,klass:''}}
function assetBannerMetrics(f){let data=accountViewData(),included=data.filter(([name,v])=>v.profile.include),calibrated=included.filter(([name,v])=>v.calibrated),ready=f.ready;return {
 net:{label:'净资产',value:ready?money(f.net):'待校准',klass:ready?(f.net<0?'negative':'positive'):''},
 assets:{label:'总资产',value:ready?money(f.assets):'待校准',klass:''},debt:{label:'总负债',value:ready?money(f.debt):'待校准',klass:''},
 accountCount:{label:'账户数',...metricCount(data.length,'个')},includedAccounts:{label:'计入净资产账户',...metricCount(included.length,'个')},calibratedAccounts:{label:'已校准账户',...metricCount(calibrated.length,'个')}
 }}
function monthBannerMetrics(rs){let s=stats(rs),b=budgetState(),expenseRows=rs.filter(r=>r.type==='支出'&&cnyAmount(r)!==null),incomeRows=rs.filter(r=>r.type==='收入'&&cnyAmount(r)!==null),days=elapsedCycleDays(year,month),yearRows=cycleYearRows(year),months=elapsedCycleMonths(year),yearAvg=historicalYearlyExpenseAvg(),activeDays=new Set(rs.map(r=>dateOf(r))).size,maxExpense=expenseRows.length?Math.max(...expenseRows.map(r=>cnyAmount(r))):0,maxIncome=incomeRows.length?Math.max(...incomeRows.map(r=>cnyAmount(r))):0;return {
 monthNet:{label:'本月结余',...metricMoney(s.net,s.net<0?'negative':'positive')},monthIncome:{label:'本月收入',...metricMoney(s.income,'positive')},monthExpense:{label:'本月支出',...metricMoney(s.expense,'negative')},
 budgetLeft:{label:'剩余预算',value:b.has?money(b.left):'未设置',klass:b.has?(b.left<0?'negative':'positive'):''},budgetAmount:{label:'每月预算',value:b.has?money(b.value):'未设置',klass:''},budgetUsed:{label:'预算使用率',value:b.has&&b.value>0?`${(b.spent/b.value*100).toFixed(1)}%`:'—',klass:b.has&&b.value>0&&b.spent>b.value?'negative':''},
 dailyExpenseAvg:{label:'日均支出',...metricMoney(days?s.expense/days:null,'negative')},monthlyExpenseAvg:{label:'月均支出',...metricMoney(months?stats(yearRows).expense/months:null,'negative')},yearlyExpenseAvg:{label:'年均支出',...metricMoney(yearAvg,'negative')},
 avgExpense:{label:'平均每笔支出',...metricMoney(expenseRows.length?s.expense/expenseRows.length:null,'negative')},maxExpense:{label:'最大单笔支出',...metricMoney(maxExpense,'negative')},maxIncome:{label:'最大单笔收入',...metricMoney(maxIncome,'positive')},
 expenseCount:{label:'支出笔数',...metricCount(expenseRows.length)},incomeCount:{label:'收入笔数',...metricCount(incomeRows.length)},billCount:{label:'账单笔数',...metricCount(rs.length)},activeDays:{label:'记账天数',...metricCount(activeDays,'天')}
 }}
function yearBannerMetrics(rs,monthsData){let s=stats(rs),expenseRows=rs.filter(r=>r.type==='支出'&&cnyAmount(r)!==null),incomeRows=rs.filter(r=>r.type==='收入'&&cnyAmount(r)!==null),elapsed=elapsedCycleMonths(year),elapsedDays=elapsedCycleDays(year,12),yearAvg=historicalYearlyExpenseAvg(),maxExpense=expenseRows.length?Math.max(...expenseRows.map(r=>cnyAmount(r))):0,maxMonthExpense=Math.max(0,...monthsData.map(m=>Number(m.expense)||0)),activeMonths=monthsData.filter(m=>(m.income||m.expense)>0).length;return {
 yearNet:{label:'年度结余',...metricMoney(s.net,s.net<0?'negative':'positive')},yearIncome:{label:'年度收入',...metricMoney(s.income,'positive')},yearExpense:{label:'年度支出',...metricMoney(s.expense,'negative')},dailyExpenseAvg:{label:'日均支出',...metricMoney(elapsedDays?s.expense/elapsedDays:null,'negative')},monthAvgExpense:{label:'月均支出',...metricMoney(elapsed?s.expense/elapsed:null,'negative')},yearlyExpenseAvg:{label:'年均支出',...metricMoney(yearAvg,'negative')},avgExpense:{label:'平均每笔支出',...metricMoney(expenseRows.length?s.expense/expenseRows.length:null,'negative')},maxExpense:{label:'最大单笔支出',...metricMoney(maxExpense,'negative')},maxMonthExpense:{label:'最大单月支出',...metricMoney(maxMonthExpense,'negative')},expenseCount:{label:'支出笔数',...metricCount(expenseRows.length)},incomeCount:{label:'收入笔数',...metricCount(incomeRows.length)},billCount:{label:'账单笔数',...metricCount(rs.length)},activeMonths:{label:'记账月份',...metricCount(activeMonths,'个月')}
 }}
function bannerFitMode(subs){if(!subs.length)return'normal';let longest=Math.max(...subs.map(x=>Array.from(String(x.value??'')).length));if(subs.length===3&&longest>=12)return'compact';if(subs.length===3&&longest>=9)return'tight';if(subs.length===2&&longest>=15)return'compact';if(subs.length===2&&longest>=12)return'tight';return'normal'}
function renderMetricBanner(key,metrics){let ids=bannerConfig(key),items=ids.map(id=>metrics[id]).filter(Boolean);if(!items.length)return'';let main=items[0],subs=items.slice(1),fit=bannerFitMode(subs),subhtml=subs.length?`<span class="metric-banner-subs" data-count="${subs.length}" data-fit="${fit}">${subs.map(x=>`<span class="metric-banner-sub"><small>${esc(x.label)}</small><strong class="${x.klass||''}">${esc(x.value)}</strong></span>`).join('')}</span>`:'';return `<button type="button" class="card metric-banner metric-banner-count-${items.length}" data-bannerconfig="${key}" aria-label="设置${esc(BANNER_TITLES[key])}"><span class="metric-banner-main"><small>${esc(main.label)}</small><strong class="${main.klass||''}">${esc(main.value)}</strong></span>${subhtml}</button>`}
function bannerConfigSummary(key){let ids=bannerConfig(key);return ids.length?ids.map(id=>bannerLabel(key,id)).join(' · '):'不显示'}
function bannerSettingsCard(){let keys=['homeAssets','homeMonth','monthPage','yearPage'];return `<div class="card section banner-settings-card"><div class="sectionhead"><h2>概览卡片</h2><p>选择各页面优先显示的数据</p></div>${keys.map(key=>`<button type="button" class="banner-setting-row" data-bannerconfig="${key}"><span><b>${esc(BANNER_TITLES[key])}</b><small>${esc(bannerConfigSummary(key))}</small></span><span>调整　›</span></button>`).join('')}</div>`}
function bannerConfigForm(key){let pool=bannerPool(key),cfg=bannerConfig(key);bannerDraftConfigs[key]=[...cfg];let isMonth=bannerKind(key)==='month',budget=currentBudget(),slot=(i,label)=>`<label class="field">${label}<select name="slot${i}"><option value="">不显示</option>${pool.map(([id,name])=>`<option value="${esc(id)}" ${cfg[i]===id?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;$('#overlay').innerHTML=`<div class="modalback" data-banner-modal="${esc(key)}"><div class="modal banner-config-modal"><h2>${esc(BANNER_TITLES[key])}</h2><form id="bannerConfigForm" data-bannerkey="${esc(key)}"><div class="formgrid">${slot(0,'主指标')}${slot(1,'副指标 1')}${slot(2,'副指标 2')}${slot(3,'副指标 3')}${isMonth?`<label class="field full">每月预算（留空为未设置）<input name="monthlyBudget" type="number" min="0" step="0.01" inputmode="decimal" value="${budget.has?esc(budget.value):''}" placeholder="未设置"></label>`:''}</div><p class="muted">支持 1、1+1、1+2、1+3。修改指标时会直接预览到当前页面；取消则恢复。</p><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">保存</button></div></form></div></div>`}

function budgetCard(){let {spent,has,value,left}=budgetState();return `<button type="button" class="card budget-card budget-action section" id="setBudget" aria-label="${has?'修改':'设置'}每月预算"><small>剩余预算</small><strong class="${has?(left<0?'negative':'positive'):''}">${has?money(left):'未设置'}</strong><small>${has?`预算 ${money(value)} · 已支出 ${money(spent)}`:'点击设置预算'}</small></button>`}
function homeBudgetBanner(){let {has,left}=budgetState();return `<button type="button" class="card metric budget-action" id="setBudget" aria-label="${has?'修改':'设置'}每月预算"><div class="label">剩余预算</div><strong class="${has?(left<0?'negative':'positive'):''}">${has?money(left):'未设置'}</strong></button>`}
function trendChart(months){let max=Math.max(1,...months.flatMap(m=>[m.income,m.expense])),x=i=>62+i*25.5,y=v=>155-(Number(v)||0)/max*128;let path=k=>{let p=months.map((m,i)=>[x(i),y(m[k])]),d=`M ${p[0][0]} ${p[0][1]}`;for(let i=1;i<p.length;i++){let a=p[i-1],b=p[i],dx=(b[0]-a[0])*.35;d+=` C ${a[0]+dx} ${a[1]}, ${b[0]-dx} ${b[1]}, ${b[0]} ${b[1]}`}return d};let values=months.flatMap((m,i)=>[{i,k:'income',v:m.income},{i,k:'expense',v:m.expense}]),high=values.reduce((a,b)=>b.v>a.v?b:a),low=values.reduce((a,b)=>b.v<a.v?b:a);let annotation=(p,cls)=>`<circle cx="${x(p.i)}" cy="${y(p.v)}" r="4" fill="${p.k==='income'?'var(--up)':'var(--down)'}" stroke="var(--card)" stroke-width="2"/><text class="extreme-label ${cls}" x="${x(p.i)}" y="${cls==='high'?Math.max(13,y(p.v)-9):Math.min(169,y(p.v)+14)}" text-anchor="${p.i>8?'end':p.i<3?'start':'middle'}">${cls==='high'?'最高':'最低'} ${calendarAmount(p.v)}</text>`;return `<div class="trendwrap"><svg class="trend" viewBox="0 0 360 193" role="img" aria-label="年度收入和支出趋势及最大最小值">${[.75,.5,.25].map(n=>`<line class="guide" x1="59" x2="348" y1="${y(max*n)}" y2="${y(max*n)}"/><text class="guide-label" x="55" y="${y(max*n)+3}" text-anchor="end">${calendarAmount(max*n)}</text>`).join('')}<line class="gridline" x1="39" y1="155" x2="349" y2="155"/><path class="income-line" d="${path('income')}" fill="none" stroke-width="2.7"/><path class="expense-line" d="${path('expense')}" fill="none" stroke-width="2.7"/>${months.map((m,i)=>`<text x="${x(i)}" y="187" text-anchor="middle">${i+1}</text><circle class="income-line" cx="${x(i)}" cy="${y(m.income)}" r="2.5"/><circle class="expense-line" cx="${x(i)}" cy="${y(m.expense)}" r="2.5"/><rect class="month-hit" x="${x(i)-12}" y="12" width="24" height="150" data-month="${i+1}"><title>${i+1} 月 收入 ${money(m.income)} 支出 ${money(m.expense)}</title></rect>`).join('')}${annotation(high,'high')}${high.i===low.i&&high.k===low.k?'':annotation(low,'low')}</svg><div class="legend"><span class="dot"></span>收入<span class="dot exp"></span>支出</div></div>`}

const DEFAULT_PREFS={mainName:'',theme:'slate',appearance:'system',exportDays:7,lastExportAt:0,lastExportName:'',lastChangeAt:0,monthStartDay:1,budgets:{},accountTypes:{},accountProfiles:{},accountGroups:[{id:'default',name:'默认分组'}],recordTitle:'both',accountOrder:{},bookProfiles:{},bookOrder:[],deletedBooks:[],bookHintDismissed:false,searchFilterOrder:['book','kind','currencyFilter','account','category','subcategory'],bannerConfigs:{},deletedAccounts:[]};
const SHARED_CONFIG_FILE='StarLedgerConfig.json';
const SHARED_PREF_KEYS=['accountGroups','accountProfiles','accountTypes','accountAliases','recordTitle','accountOrder','bookProfiles','bookOrder','deletedBooks','bookHintDismissed','recordBlockOrder','searchFilterOrder','bannerConfigs','deletedAccounts','budgets','monthStartDay','theme','appearance','fxRates','exportDays'];
function sharedPrefSubset(source){
 let out={};
 for(let k of SHARED_PREF_KEYS)if(source&&source[k]!==undefined)out[k]=source[k];
 if(source&&typeof source.mainName==='string')out.mainName=source.mainName;
 if(source&&source._starConfigUpdatedAt!==undefined)out._starConfigUpdatedAt=Number(source._starConfigUpdatedAt)||0;
 return out
}
function applySharedPrefs(config){
 if(!config||typeof config!=='object'||Array.isArray(config))return false;
 let before=Number(prefs?._starConfigUpdatedAt||0),remote=Number(config._starConfigUpdatedAt||0);
 let patch=sharedPrefSubset(config);
 // The shared iCloud JSON is canonical whenever it exists; the timestamp is still
 // kept so phone/browser foreground refreshes can cheaply detect a newer version.
 prefs={...prefs,...patch};
 return remote!==before||Object.keys(patch).some(k=>k!=='_starConfigUpdatedAt');
}

const WORKSPACE_KEY='workspace-v1';
const ledgerCsvKey=name=>'ledger:'+String(name||'')+':csv';
const ledgerPrefsKey=name=>'ledger:'+String(name||'')+':prefs';
function normalizeWorkspace(value){
 let names=[...new Set((Array.isArray(value?.names)?value.names:[]).map(x=>String(x||'').trim()).filter(Boolean))];
 let active=String(value?.active||'').trim();
 if(active&&!names.includes(active))names.unshift(active);
 return {names,active:active||names[0]||'',folderName:String(value?.folderName||''),mode:String(value?.mode||'local'),readWrite:!!value?.readWrite,updatedAt:Number(value?.updatedAt||0)};
}
let workspace=normalizeWorkspace(null);
let prefs={...DEFAULT_PREFS,...(BOOT?.settings||{}),...(BOOT?.mainName?{mainName:BOOT.mainName}:{})},folderHandle=null,entryKind='支出',entryCategory='',busy=false,ocrReviewText='',pendingPrefill=BOOT?.prefillText||'';
const systemScheme=matchMedia('(prefers-color-scheme: dark)');
function applyTheme(){let mode=prefs.appearance==='system'?(systemScheme.matches?'dark':'light'):prefs.appearance;document.documentElement.dataset.mode=mode;document.documentElement.dataset.theme='neutral';document.documentElement.style.colorScheme=mode;document.documentElement.style.backgroundColor=mode==='dark'?'#000000':'#f7f7f5';document.querySelectorAll('meta[name="theme-color"]').forEach(meta=>meta.content=mode==='dark'?'#000000':'#f7f7f5')}
if(systemScheme.addEventListener)systemScheme.addEventListener('change',()=>{if(prefs.appearance==='system')applyTheme()});else if(systemScheme.addListener)systemScheme.addListener(()=>{if(prefs.appearance==='system')applyTheme()});
applyTheme();
// Web v0.2: IndexedDB is the canonical ledger store; localStorage is an emergency fallback.
function db(){return new Promise((resolve,reject)=>{let req=indexedDB.open('star-ledger-local-1',1);req.onupgradeneeded=()=>req.result.createObjectStore('state');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function putBundle(entries){
 if(native)return;
 let payload={...entries},target=String(entries?.prefs?.mainName||prefs?.mainName||workspace.active||'').trim();
 if(target){
  workspace=normalizeWorkspace({...workspace,names:[...workspace.names,target],active:target,updatedAt:Date.now()});
  if(Object.prototype.hasOwnProperty.call(entries,'csv'))payload[ledgerCsvKey(target)]=entries.csv;
  if(Object.prototype.hasOwnProperty.call(entries,'prefs'))payload[ledgerPrefsKey(target)]=entries.prefs;
  payload[WORKSPACE_KEY]=workspace;
 }
 let failure;
 try{
  let d=await db();
  await new Promise((res,rej)=>{let tx=d.transaction('state','readwrite'),store=tx.objectStore('state');for(let [key,value] of Object.entries(payload))store.put(value,key);tx.oncomplete=res;tx.onerror=()=>rej(tx.error||Error('存储失败'));tx.onabort=()=>rej(tx.error||Error('存储被中断'))});
  d.close();return
 }catch(e){failure=e}
 try{
  let current=JSON.parse(localStorage.getItem('star_ledger_bundle')||'{}'),next={...current,...payload},serialized=JSON.stringify(next);
  localStorage.setItem('star_ledger_bundle',serialized);
  if(localStorage.getItem('star_ledger_bundle')!==serialized)throw Error('写入后校验失败');
  return
 }catch(e){throw Error('设备存储不可用，账单没有保存。请用正常浏览器窗口打开并检查可用空间：'+(failure?.message||e.message))}
}
async function put(key,value){return putBundle({[key]:value})}
async function get(key){try{let d=await db(),v=await new Promise((res,rej)=>{let tx=d.transaction('state','readonly'),q=tx.objectStore('state').get(key);q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});d.close();if(v!==undefined)return v}catch(e){}try{return JSON.parse(localStorage.getItem('star_ledger_bundle')||'{}')[key]??null}catch(e){return null}}
async function ensurePersistentStorage(){
 try{
  if(!navigator.storage?.persist)return false;
  if(await navigator.storage.persisted?.())return true;
  return !!(await navigator.storage.persist());
 }catch(e){return false}
}
function initLocal(){return (async()=>{
 if(native)return;
 await ensurePersistentStorage();
 workspace=normalizeWorkspace(await get(WORKSPACE_KEY));
 let legacyPrefs=await get('prefs'),legacyCsv=await get('csv');
 if(!workspace.names.length&&legacyPrefs?.mainName){
  workspace=normalizeWorkspace({names:[legacyPrefs.mainName],active:legacyPrefs.mainName,mode:'local',updatedAt:Date.now()});
  await putBundle({[WORKSPACE_KEY]:workspace,[ledgerPrefsKey(legacyPrefs.mainName)]:legacyPrefs,[ledgerCsvKey(legacyPrefs.mainName)]:legacyCsv||csvWrite([])});
 }
 let active=workspace.active||legacyPrefs?.mainName||'';
 if(active){
  let saved=await get(ledgerPrefsKey(active))||legacyPrefs;
  let csv=await get(ledgerCsvKey(active))||legacyCsv;
  prefs={...DEFAULT_PREFS,...(saved||{}),mainName:active};
  if(csv){try{takeCsv(csv)}catch(e){toast('本机账本无法读取');render()}}else render();
 }else{
  if(legacyPrefs)prefs={...prefs,...legacyPrefs};
  render()
 }
 folderHandle=null;
 try{
  let savedFolder=await getFolder();
  if(savedFolder&&await permission(savedFolder,'read')){
   folderHandle=savedFolder;
   workspace=normalizeWorkspace({...workspace,folderName:savedFolder.name,mode:'linked',readWrite:await permission(savedFolder,'readwrite')});
  }
 }catch(e){}
 applyTheme();
 openPendingPrefill();
})()}

async function switchWorkspaceLedger(name,{silent=false}={}){
 name=String(name||'').trim();
 if(!name||!workspace.names.includes(name))throw Error('找不到这个主账本');
 let savedPrefs=await get(ledgerPrefsKey(name)),csv=await get(ledgerCsvKey(name));
 prefs={...DEFAULT_PREFS,...(savedPrefs||{}),mainName:name};
 workspace=normalizeWorkspace({...workspace,active:name,updatedAt:Date.now()});
 await putBundle({prefs,csv:csv||csvWrite([]),[WORKSPACE_KEY]:workspace});
 if(folderHandle&&workspace.readWrite){try{await writeSharedPrefs({mainName:name})}catch(e){toast('已切换，但工作区配置未能写回：'+e.message)}}
 book='全部账本';query='';kind='全部类型';account='全部账户';category='全部分类';subcategory='全部小类';currencyFilter='全部币种';day='';page=0;
 applyTheme();takeCsv(csv||csvWrite([]));
 window.dispatchEvent(new CustomEvent('star-ledger-main-changed',{detail:{name}}));
 if(!silent)toast('已切换主账本：'+name)
}
function workspacePicker(){
 if(workspace.names.length<2)return;
 $('#overlay').innerHTML=`<div class="modalback"><div class="modal"><div class="sectionhead"><h2>切换主账本</h2><button type="button" id="closeBtn">完成</button></div><div class="manage-list">${workspace.names.map(name=>`<button type="button" class="button ${name===prefs.mainName?'primary':''}" data-workspace-ledger="${esc(name)}"><span>${esc(name)}</span>${name===prefs.mainName?'<small>当前</small>':''}</button>`).join('')}</div></div></div>`
}
async function clearLocalLedger(){
 if(native)throw Error('当前为原生桥接模式，不能从网页清空');
 try{
  await new Promise((resolve,reject)=>{
   let req=indexedDB.deleteDatabase('star-ledger-local-1');
   req.onsuccess=()=>resolve();
   req.onerror=()=>reject(req.error||Error('无法清除本地数据库'));
   req.onblocked=()=>reject(Error('数据库仍被其他 StarLedger 页面占用，请关闭其他页面后重试'));
  });
 }finally{
  try{localStorage.removeItem('star_ledger_bundle')}catch(e){}
 }
 location.reload()
}
function filenameDate(name){let m=[...String(name||'').matchAll(/(20\d{2})[-_]?(0[1-9]|1[0-2])[-_]?(0[1-9]|[12]\d|3[01])(?:[_ -]?(\d{2})[:_-]?(\d{2})[:_-]?(\d{2}))?/g)].at(-1);if(!m)return 0;let d=new Date(+m[1],+m[2]-1,+m[3],+(m[4]||0),+(m[5]||0),+(m[6]||0));return d.getFullYear()===+m[1]&&d.getMonth()===+m[2]-1&&d.getDate()===+m[3]&&d.getTime()<=Date.now()?d.getTime():0}
function exportName(){let d=new Date(),pad=n=>String(n).padStart(2,'0');return `${prefs.mainName||'账本'}_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.csv`}
function backupExportName(){let d=new Date(),pad=n=>String(n).padStart(2,'0');return `StarLedger_完整备份_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.zip`}
let exportReminderDismissed=false;
function exportStatus(){
 if(native||workspace.readWrite||!prefs.mainName||!prefs.exportDays||exportReminderDismissed)return null;
 let since=Number(prefs.lastExportAt)||0,
     due=since+Number(prefs.exportDays)*86400000,
     days=since?Math.max(0,Math.ceil((Date.now()-since)/86400000)):null;
 if(!since||Date.now()>=due)return `<div class="backup-alert"><strong>建议导出一份完整 ZIP 备份</strong>${since?`上次完整导出：${new Date(since).toLocaleDateString('zh-CN')}，已过 ${days} 天。`:'还没有确认保存过完整备份。'}ZIP 会同时保存全部本地主账本、账户配置、排序、预算和账单关联；清除网站数据前请先下载。<div class="backup-actions"><button class="button primary" id="exportBackup">导出完整 ZIP</button><button class="button backup-snooze" id="dismissExportReminder">暂不备份</button><button class="button backup-never" id="disableExportReminder">永不提醒</button></div></div>`;
 return null
}
function parseOCRLegacy(input){let text=String(input||'').slice(0,12000),lines=text.split(/[\r\n]+/).map(x=>x.trim()).filter(Boolean),type=/收款成功|收入|已到账|到账金额|收款金额/.test(text)&&!/付款成功|支付成功/.test(text)?'收入':'支出';let candidates=[];for(let i=0;i<lines.length;i++){let line=lines[i];if(/余额|优惠|原价|券|手续费|订单号|单号|积分/.test(line))continue;for(let m of line.matchAll(/(?:[¥￥]\s*)?(-?\d{1,7}(?:,\d{3})*(?:\.\d{1,2})?)/g)){let n=Math.abs(Number(m[1].replace(/,/g,'')));if(n<=0||n>1e7||(!m[0].includes('¥')&&!m[0].includes('￥')&&!m[1].includes('.')))continue;let context=lines.slice(Math.max(0,i-1),i+1).join(' '),score=/(实付|支付金额|付款金额|交易金额|收款金额|到账金额|总计|合计)/.test(context)?10:/(¥|￥)/.test(m[0])?5:1;if(/余额|优惠|原价|券|手续费/.test(context))score-=8;candidates.push({n,score,i})}}candidates.sort((a,b)=>b.score-a.score||a.i-b.i);let dateMatch=text.match(/(20\d{2})[年\/-](\d{1,2})[月\/-](\d{1,2})日?\s*(\d{1,2}):(\d{2})/),date=dateMatch?`${dateMatch[1]}-${dateMatch[2].padStart(2,'0')}-${dateMatch[3].padStart(2,'0')} ${dateMatch[4].padStart(2,'0')}:${dateMatch[5]}:00`:'';let merchantLine=lines.find(x=>/^(?:收款方|交易对象|商家|商品说明|商品)[:：]/.test(x)),merchant=merchantLine?.replace(/^[^:：]+[:：]\s*/,'').slice(0,60)||'';return {type,amount:candidates[0]?.n?.toFixed(2)||'',date,merchant,note:merchant}}

function consumeHashPrefill(){
 let hash=String(location.hash||''),payload=null;
 try{
  if(hash.startsWith('#ocr=')){
   payload={v:1,action:'ocr',source:'ios-shortcuts',text:decodeURIComponent(hash.slice(5))};
  }else if(hash.startsWith('#sl=')){
   let raw=decodeURIComponent(hash.slice(4)),obj=JSON.parse(raw);
   if(obj&&Number(obj.v||1)>=1&&obj.action==='ocr'&&typeof obj.text==='string')payload=obj;
  }
 }catch(e){console.warn('OCR payload decode failed',e)}
 if(payload)try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}
 return payload||''
}
function ocrFieldValue(v){return v&&typeof v==='object'&&Object.prototype.hasOwnProperty.call(v,'value')?v.value:(v??'')}
function ocrMerchantHistory(){
 let counts=new Map();
 for(let r of rows){let name=String(r.merchant||'').trim();if(name)counts.set(name,(counts.get(name)||0)+1)}
 return [...counts].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,800)
}
function ocrContext(){
 let now=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,19).replace('T',' ');
 return {now,accounts:accountNames(),accountAliases:prefs.accountAliases||{},books:orderedBookNames(false),defaultBook:recentBookName(),history:rows,rows,merchants:ocrMerchantHistory()}
}
function ocrSuggestionToRecord(suggestion={}){
 let existingAccounts=accountNames(),existingBooks=orderedBookNames(false),type=String(ocrFieldValue(suggestion.type)||'支出');
 if(!['支出','收入','转账','借贷'].includes(type))type='支出';
 let rawAmount=Number(ocrFieldValue(suggestion.amount)),account=String(ocrFieldValue(suggestion.account)||''),account2=String(ocrFieldValue(suggestion.account2)||''),suggestedBook=String(ocrFieldValue(suggestion.book)||'').trim();
 if(account&&!existingAccounts.includes(account))account='';
 if(account2&&!existingAccounts.includes(account2))account2='';
 if(!existingBooks.includes(suggestedBook))suggestedBook=recentBookName();
 return {
  type,
  amount:Number.isFinite(rawAmount)&&rawAmount>=0?String(Math.abs(rawAmount)):'',
  date:String(ocrFieldValue(suggestion.date)||''),
  account,
  account2,
  book:suggestedBook,
  currency:'人民币',
  category:String(ocrFieldValue(suggestion.category)||''),
  subcategory:String(ocrFieldValue(suggestion.subcategory)||''),
  merchant:String(ocrFieldValue(suggestion.merchant)||''),
  note:String(ocrFieldValue(suggestion.note)||''),
  tags:'',
  relationRole:String(suggestion.relationRole||'auto')
 }
}
function recognizeOCRText(text){
 text=String(text||'').slice(0,32000);
 if(!text.trim())throw Error('OCR 没有提取到文字');
 let engine=window.StarLedgerRecognizer;
 if(!engine?.recognize)return {records:[parseOCRLegacy(text)],relationHints:[],warnings:['OCR 识别器未载入，已使用基础解析']};
 let result=engine.recognize(text,ocrContext()),sourceRecords=Array.isArray(result.records)&&result.records.length?result.records:[result];
 let records=sourceRecords.map(ocrSuggestionToRecord);
 return {records,relationHints:Array.isArray(result.relationHints)?result.relationHints:[],warnings:result.warnings||[],result}
}
function openPendingPrefill(){
 if(!prefs.mainName||!pendingPrefill)return;
 let payload=typeof pendingPrefill==='string'?{v:1,action:'ocr',source:'legacy',text:pendingPrefill}:pendingPrefill;
 // Consume first. No later lifecycle event may reuse this object.
 pendingPrefill='';
 if(payload?.action!=='ocr'||!payload?.text)return;
 try{
  let parsed=recognizeOCRText(payload.text);
  // Invalidate every pending close callback before replacing the old task.
  ocrOpenGeneration++;
  if(typeof rc12Task!=='undefined'&&rc12Task)rc12Task=null;
  let overlay=$('#overlay');
  if(overlay)overlay.innerHTML='';
  let accountOverlay=$('#accountOverlay');
  if(accountOverlay)accountOverlay.innerHTML='';
  document.body.classList.remove('dialog-open');
  ocrReviewText=payload.text;
  if(window.entryTaskOpenFromOCR)window.entryTaskOpenFromOCR(parsed);
  else entryForm(parsed.records[0]||{});
  if(parsed.warnings?.length)console.info('StarLedger OCR warnings',parsed.warnings);
 }catch(e){
  toast('OCR 解析失败：'+(e.message||e));
  console.warn(e)
 }
}
function showExportConfirm(name,complete=false){$('#overlay').innerHTML=`<div class="modalback"><div class="modal"><h2>备份是否已保存？</h2><p class="muted export-help">请确认 ${esc(name)} 已出现在“文件”App 或电脑下载目录。Safari 若只打开了预览，请先用共享菜单存储到“文件”。</p><div class="modalfooter"><button type="button" class="button" id="closeBtn">稍后确认</button><button type="button" class="button primary" id="confirmExport" data-exportname="${esc(name)}" data-complete="${complete?'1':'0'}">已保存备份</button></div></div></div>`}
async function exportLedger(){if(!prefs.mainName)throw Error('请先建立账本');let name=exportName(),csv=csvWrite(rows);if(native)throw Error('请在网页中导出主账本');if(window.showSaveFilePicker){try{let fh=await showSaveFilePicker({suggestedName:name,types:[{description:'CSV 账单备份',accept:{'text/csv':['.csv']}}]}),w=await fh.createWritable();await w.write(csv);await w.close();toast('已导出当前账本 CSV：'+name);return}catch(e){if(e.name==='AbortError')return}}let blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);showExportConfirm(name,false)}
function archiveLedgerName(name){return String(name||'账本').replace(/[\\/]/g,'／').trim()||'账本'}
async function completeBackupEntries(){
 if(native)throw Error('请在网页浏览器中导出完整 ZIP');if(!prefs.mainName)throw Error('请先建立账本');if(!window.StarLedgerZip)throw Error('ZIP 组件没有载入');
 let sourceNames=[...new Set([...workspace.names,prefs.mainName].map(x=>String(x||'').trim()).filter(Boolean))],mapped=new Map(),used=new Set();
 for(let name of sourceNames){let archive=archiveLedgerName(name);if(used.has(archive))throw Error('有两个主账本在 ZIP 中会使用相同文件名，请先改名');used.add(archive);mapped.set(name,archive)}
 let config={format:'star-ledger-config',version:2,mainName:mapped.get(prefs.mainName),activeLedger:mapped.get(prefs.mainName),ledgers:{},_starConfigUpdatedAt:Date.now()},relations={format:'star-ledger-relations',version:1,updatedAt:new Date().toISOString(),ledgers:{}},entries=[];
 for(let name of sourceNames){let archive=mapped.get(name),ledgerPrefs=name===prefs.mainName?prefs:await get(ledgerPrefsKey(name)),csv=name===prefs.mainName?csvWrite(rows):await get(ledgerCsvKey(name)),relation=await get('relations:'+name);ledgerPrefs={...DEFAULT_PREFS,...(ledgerPrefs||{}),mainName:archive};config.ledgers[archive]={...sharedPrefSubset(ledgerPrefs),mainName:archive};relations.ledgers[archive]=relation&&typeof relation==='object'?relation:{groups:[],suppressedLegacy:[],updatedAt:''};entries.push({name:archive+'_desktop.csv',data:csv||csvWrite([])})
 }
 entries.push({name:SHARED_CONFIG_FILE,data:JSON.stringify(config,null,2)},{name:WORKSPACE_RELATIONS_FILE,data:JSON.stringify(relations,null,2)});return entries
}
async function saveBackupBlob(blob,name){
 if(window.showSaveFilePicker){try{let fh=await showSaveFilePicker({suggestedName:name,types:[{description:'StarLedger 完整备份',accept:{'application/zip':['.zip']}}]}),w=await fh.createWritable();await w.write(blob);await w.close();await savePrefs({lastExportAt:Date.now(),lastExportName:name});toast('已保存完整备份：'+name);return}catch(e){if(e.name==='AbortError')return;throw e}}
 let url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);showExportConfirm(name,true)
}
async function exportCompleteBackup(){let name=backupExportName(),zip=StarLedgerZip.create(await completeBackupEntries());await saveBackupBlob(new Blob([zip],{type:'application/zip'}),name)}
async function zipWorkspaceFiles(file){
 if(!window.StarLedgerZip)throw Error('ZIP 组件没有载入');let entries=await StarLedgerZip.read(file),files=[],seen=new Set();
 for(let entry of entries){let base=String(entry.name||'').split('/').filter(Boolean).at(-1)||'',allowed=base===SHARED_CONFIG_FILE||base===WORKSPACE_RELATIONS_FILE||workspaceLedgerFile(base);if(!allowed)continue;if(seen.has(base))throw Error('ZIP 中存在重复的 StarLedger 文件：'+base);seen.add(base);files.push(new File([entry.data],base,{type:base.endsWith('.json')?'application/json':'text/csv'}))}
 if(!files.length)throw Error('ZIP 中没有找到 StarLedger 账本文件');return files
}
async function importCompleteBackup(file){
 let snapshot=await parseWorkspaceFiles(await zipWorkspaceFiles(file));if(!snapshot.names.length)throw Error('ZIP 中没有有效的主账本 CSV');if(!snapshot.configPresent||!snapshot.relationsPresent)throw Error('这不是完整备份：缺少配置或关联 JSON');if(snapshot.warnings.length)throw Error(snapshot.warnings.join('；'));
 if(prefs.mainName&&!confirm(`从完整备份读取 ${snapshot.names.length} 个主账本？\n\n同名本机账本会被备份内容替换；其他本机账本会保留。`))return;folderHandle=null;stopAutoRefresh();await applyWorkspaceSnapshot(snapshot,{folderName:file.name,mode:'snapshot',readWrite:false,askIfMultiple:true});toast('完整备份已恢复：'+snapshot.names.length+' 个主账本')
}
function accountData(){let map=new Map();function ensure(k){if(k&&!map.has(k))map.set(k,{net:0,count:0,calibrated:false})}
 for(let name of Object.keys(prefs.accountProfiles||{}))ensure(name);
 for(let r of rows){let a=r.account,b=r.account2,n=cnyAmount(r);ensure(a);if(['转账','借贷'].includes(r.type))ensure(b);if(a&&map.has(a))map.get(a).count++;if(b&&map.has(b))map.get(b).count++;if(n===null)continue;
  if(r.type==='支出'&&map.has(a))map.get(a).net-=n;
  else if(r.type==='收入'&&map.has(a))map.get(a).net+=n;
  else if(['转账','借贷'].includes(r.type)){if(map.has(a))map.get(a).net-=n;if(map.has(b))map.get(b).net+=n}
  else if(r.type==='余额调整'&&map.has(a)){let delta=0;try{delta=Number(JSON.parse(r.extras||'{}').delta)||0}catch(e){}map.get(a).net+=delta;map.get(a).calibrated=true}
 }
 return [...map.entries()].sort((a,b)=>b[1].count-a[1].count||a[0].localeCompare(b[0],'zh-CN'))}
function accountGroups(){let groups=Array.isArray(prefs.accountGroups)?prefs.accountGroups.filter(g=>g&&typeof g.id==='string'&&typeof g.name==='string'&&g.name.trim()):[];return groups.length?groups:[{id:'default',name:'默认分组'}]}
function accountProfile(name){let old=prefs.accountTypes?.[name],data=prefs.accountProfiles?.[name]||{};return {type:data.type||((old==='debt'||/信用卡/.test(name))?'credit':/借贷|借入|借出|欠款/.test(name)?'personal':'stored'),include:data.include!==undefined?!!data.include:old!=='ignore',groupId:accountGroups().some(g=>g.id===data.groupId)?data.groupId:accountGroups()[0].id,limit:data.limit||'',note:data.note||'',hidden:!!data.hidden,calibration:data.calibration||null}}
function accountViewData(){return accountData().map(([name,raw])=>{let p=accountProfile(name),c=p.calibration,net=c?Number(c.balance)+raw.net-Number(c.baseline):raw.net;return [name,{...raw,net,calibrated:!!c||raw.calibrated,profile:p}]})}
function orderedGroupMembers(groupId,members){let saved=Array.isArray(prefs.accountOrder?.[groupId])?prefs.accountOrder[groupId]:[],rank=new Map(saved.map((name,i)=>[name,i]));return members.map((entry,i)=>({entry,i})).sort((a,b)=>{let ai=rank.has(a.entry[0])?rank.get(a.entry[0]):1e9+a.i,bi=rank.has(b.entry[0])?rank.get(b.entry[0]):1e9+b.i;return ai-bi}).map(x=>x.entry)}
function orderedAccountNameList(names){let pool=new Set(names),result=[];for(let group of accountGroups()){let members=names.filter(name=>accountProfile(name).groupId===group.id),ordered=orderedGroupMembers(group.id,members.map(name=>[name,{}])).map(([name])=>name);for(let name of ordered)if(pool.delete(name))result.push(name)}for(let name of names)if(pool.delete(name))result.push(name);return result}
function financial(){let data=accountViewData().filter(([name,v])=>!v.profile.hidden),included=data.filter(([name,v])=>v.profile.include),unready=included.filter(([name,v])=>!v.calibrated);if(unready.length)return{ready:false,missing:unready.length};let assets=included.reduce((n,[name,v])=>n+Math.max(0,v.net),0),debt=included.reduce((n,[name,v])=>n+Math.max(0,-v.net),0);return{ready:true,assets,debt,net:assets-debt}}
function accountForm(name){let found=accountViewData().find(([k])=>k===name),v=found?.[1];if(!v)return;let p=v.profile,credit=p.type==='credit';$('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config account-config-compact"><div class="account-config-head"><h2>${esc(name)}</h2><div class="account-head-actions"><button type="button" data-hideaccount="${esc(name)}">${p.hidden?'显示':'隐藏'}</button><button type="button" class="danger" data-removeaccount="${esc(name)}">删除</button></div></div><p class="muted account-summary">${v.calibrated?'当前余额 '+money(v.net):'尚未校准'} · ${v.count} 笔账单</p><label class="field account-rename-full">账户名称<span class="account-rename-control"><input id="accountRenameInput" maxlength="60" value="${esc(name)}" autocomplete="off"><button type="button" class="button" data-requestaccountrename="${esc(name)}">改名</button></span></label><form id="accountProfileForm" data-account="${esc(name)}"><div class="account-compact-grid"><label class="field">重新校准<input type="number" name="actual" step="0.01" inputmode="decimal" placeholder="${v.calibrated?money(v.net):'当前实际余额'}"></label><label class="field">账户类型<select name="type" id="accountTypeSelect"><option value="stored" ${p.type==='stored'?'selected':''}>储值／现金</option><option value="credit" ${p.type==='credit'?'selected':''}>信用卡</option><option value="personal" ${p.type==='personal'?'selected':''}>借贷关系／人名</option></select></label><label class="field">所属分组<select name="groupId">${accountGroups().map(g=>`<option value="${esc(g.id)}" ${g.id===p.groupId?'selected':''}>${esc(g.name)}</option>`).join('')}</select></label><label class="field account-credit-limit" ${credit?'':'hidden'}>信用额度<input type="number" name="limit" min="0" step="0.01" inputmode="decimal" value="${esc(p.limit)}" placeholder="${p.limit?esc(p.limit):'信用卡额度'}"></label><label class="field include-toggle account-include-compact"><input type="checkbox" name="include" ${p.include?'checked':''}>计入净资产</label></div><label class="field account-note-full">备注<input name="note" maxlength="160" value="${esc(p.note)}" placeholder="例如所属银行、借贷对象说明"></label><p class="muted account-config-hint">账户改名会同步修改历史账单中的账户名称；隐藏只影响显示和统计；删除前会再次确认关联账单的处理方式。</p><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">保存账户</button></div></form></div></div>`;if(compactViewport())document.body.classList.add('dialog-open');activateAppTertiary('account')}
function groupForm(id){let groups=accountGroups(),group=groups.find(g=>g.id===id),isNew=!group,other=groups.filter(g=>g.id!==id),accounts=accountViewData();$('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config"><h2>${isNew?'新建分组':'管理分组 · '+esc(group.name)}</h2><form id="groupForm" data-group="${esc(id||'')}"><label class="field">分组名称<input name="name" maxlength="40" required value="${esc(group?.name||'')}"></label><label class="field">排列位置<select name="position">${Array.from({length:groups.length+(isNew?1:0)},(_,i)=>`<option value="${i}" ${i===(isNew?groups.length:groups.findIndex(g=>g.id===id))?'selected':''}>第 ${i+1} 个</option>`).join('')}</select></label><div class="group-choice"><strong>选择此分组的账户</strong><div>${accounts.map(([name,v])=>`<label class="group-account-option ${Array.from(name).length>10?'group-account-option-wide':''}"><input type="checkbox" name="member" value="${esc(name)}" ${!isNew&&v.profile.groupId===id?'checked':''}><span>${esc(name)}</span></label>`).join('')||'<small>尚无账户，记账后自动出现</small>'}</div></div><p class="muted">账户只属于一个分组。取消勾选的账户会移动到其他分组。</p><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">保存分组</button></div></form>${!isNew?`<div class="group-delete"><label class="field">删除此分组时，将账户移到<select id="groupDestination">${other.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label><button type="button" class="button danger" data-deletegroup="${esc(id)}" ${other.length?'':'disabled'}>删除分组</button></div>`:''}</div></div>`;if(compactViewport())document.body.classList.add('dialog-open');activateAppTertiary('account')}
function newAccountForm(){let groups=accountGroups();$('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config"><h2>添加账户</h2><form id="newAccountForm"><label class="field">账户名称<input name="name" maxlength="60" required placeholder="例如：现金、信用卡、某位亲友"></label><label class="field">类型<select name="type"><option value="stored">储值／现金</option><option value="credit">信用卡</option><option value="personal">借贷关系／人名</option></select></label><label class="field">所属分组<select name="groupId">${groups.map(g=>`<option value="${esc(g.id)}">${esc(g.name)}</option>`).join('')}</select></label><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">创建账户</button></div></form></div></div>`;if(compactViewport())document.body.classList.add('dialog-open');activateAppTertiary('account')}
async function createAccount(f){let data=new FormData(f),name=String(data.get('name')||'').trim();if(!name||name.length>60)throw Error('账户名无效');if(accountData().some(([k])=>k===name))throw Error('账户已存在；如果被隐藏，请先恢复');let profile={type:data.get('type'),groupId:data.get('groupId'),include:true,hidden:false,limit:'',note:'',calibration:null},aliases={...(prefs.accountAliases||{})};delete aliases[name];await savePrefs({accountProfiles:{...(prefs.accountProfiles||{}),[name]:profile},accountAliases:aliases,deletedAccounts:(prefs.deletedAccounts||[]).filter(k=>k!==name)});close();accountForm(name)}
async function setAccountHidden(name,hidden){let profile=accountProfile(name),count=rows.filter(r=>r.account===name||r.account2===name).length;await savePrefs({accountProfiles:{...(prefs.accountProfiles||{}),[name]:{...profile,hidden}}});close();render();toast(hidden?`已隐藏账户和相关的 ${count} 笔账单；可在账户页恢复`:'账户已恢复')}

function confirmAccountRename(name,dest){
 let count=rows.filter(r=>r.account===name||r.account2===name).length;
 $('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config"><h2>把「${esc(name)}」改成「${esc(dest)}」？</h2><p class="muted">将同步修改 ${count} 笔关联账单中的账户名称，并迁移该账户的类型、分组、校准、备注和排序设置。CSV 中的历史账户名称也会随账单更新。此操作不会自动合并已有账户。</p><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="button" class="button primary" data-confirmaccountrename="${esc(name)}" data-accountdest="${esc(dest)}">确认改名</button></div></div></div>`;
 if(compactViewport())document.body.classList.add('dialog-open');else activateAppTertiary('account')
}
async function renameAccount(name,dest){
 name=String(name||'').trim();dest=String(dest||'').trim();
 if(!name||!dest||dest.length>60||/[,，;；\r\n]/.test(dest))throw Error('账户名称无效');
 if(dest===name)throw Error('新名称与原名称相同');
 if(accountData().some(([k])=>k===dest))throw Error('已存在同名账户；本次只支持改名，不自动合并');
 let count=rows.filter(r=>r.account===name||r.account2===name).length;
 if(count){
  let op={kind:'accountMigrate',target:name,dest};
  if(native){let r=await nativeCommand('bulkPatch',null,null,{operation:op});prefs={...prefs,...r.settings};takeCsv(r.csv)}
  else{let changed=rows.map(r=>({...r,account:r.account===name?dest:r.account,account2:r.account2===name?dest:r.account2}));await localWrite('replaceLedger',null,null,{csv:csvWrite(changed),mainName:prefs.mainName,allowEmpty:true})}
 }
 let profiles={...(prefs.accountProfiles||{})},types={...(prefs.accountTypes||{})},orders={...(prefs.accountOrder||{})},aliases={...(prefs.accountAliases||{})};
 let profile=profiles[name]||accountProfile(name);profiles[dest]={...profile};delete profiles[name];
 if(Object.prototype.hasOwnProperty.call(types,name)){types[dest]=types[name];delete types[name]}
 for(let key of Object.keys(orders))if(Array.isArray(orders[key]))orders[key]=orders[key].map(v=>v===name?dest:v);
 let inherited=[...(Array.isArray(aliases[name])?aliases[name]:[]),name],prior=Array.isArray(aliases[dest])?aliases[dest]:[];
 delete aliases[name];
 aliases[dest]=[...new Set([...prior,...inherited].map(v=>String(v||'').trim()).filter(v=>v&&v!==dest))];
 let deleted=(prefs.deletedAccounts||[]).filter(v=>v!==name&&v!==dest);
 await savePrefs({accountProfiles:profiles,accountTypes:types,accountOrder:orders,accountAliases:aliases,deletedAccounts:deleted});
 close();render();toast(`账户已改名：${name} → ${dest}`)
}
function accountDeleteForm(name){let count=rows.filter(r=>r.account===name||r.account2===name).length,dest=accountViewData().map(([k])=>k).filter(k=>k!==name);$('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config"><h2>删除账户 · ${esc(name)}</h2><p class="muted">${count? `关联 ${count} 笔账单。删除不可直接撤回，请先导出完整 ZIP 备份。可选择迁入别的账户，或连这些账单一起删除。`:'没有关联账单；删除只移除账户设置。'}</p>${count?`<label class="field">迁入账户<select id="accountDeleteDestination">${dest.map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></label><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="button" class="button" id="exportBeforeAccountDelete">先导出完整备份</button></div><div class="modalfooter"><button type="button" class="button danger" data-deleteaccountmode="migrate" data-accountname="${esc(name)}" ${dest.length?'':'disabled'}>迁移账单后删除</button><button type="button" class="button danger" data-deleteaccountmode="bills" data-accountname="${esc(name)}">连账单一起删除</button></div>`:`<div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="button" class="button danger" data-deleteaccountmode="empty" data-accountname="${esc(name)}">删除账户</button></div>`}</div></div>`;if(compactViewport())document.body.classList.add('dialog-open');activateAppTertiary('account')}
function confirmAccountBillsDelete(name){let count=rows.filter(r=>r.account===name||r.account2===name).length;$('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config"><h2>永久删除 ${count} 笔账单？</h2><p class="muted">这些账单只要涉及「${esc(name)}」，整笔都会从当前手机账本移除。此操作没有自动撤回，请先保存完整 ZIP 备份。</p><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="button" class="button danger" data-confirmaccountbills="${esc(name)}">确认删除账单与账户</button></div></div></div>`;activateAppTertiary('account')}
async function deleteAccount(name,mode){let count=rows.filter(r=>r.account===name||r.account2===name).length,dest=$('#accountDeleteDestination')?.value;if(count&&mode==='migrate'&&(!dest||dest===name))throw Error('先选择迁入账户');if(count&&mode!=='migrate'&&mode!=='bills')throw Error('请选择关联账单的处理方式');if(count){let op={kind:mode==='migrate'?'accountMigrate':'accountDeleteBills',target:name,dest:dest||''};if(native){let r=await nativeCommand('bulkPatch',null,null,{operation:op});prefs={...prefs,...r.settings};takeCsv(r.csv)}else{let changed=mode==='migrate'?rows.map(r=>({...r,account:r.account===name?dest:r.account,account2:r.account2===name?dest:r.account2})):rows.filter(r=>r.account!==name&&r.account2!==name);await localWrite('replaceLedger',null,null,{csv:csvWrite(changed),mainName:prefs.mainName,allowEmpty:true})}}let profiles={...(prefs.accountProfiles||{})},aliases={...(prefs.accountAliases||{})};delete profiles[name];delete aliases[name];await savePrefs({accountProfiles:profiles,accountAliases:aliases,deletedAccounts:[...new Set([...(prefs.deletedAccounts||[]),name])]});close();render();toast('账户已删除')}
async function saveAccountForm(f){let name=f.dataset.account,form=new FormData(f),raw=accountData().find(([k])=>k===name)?.[1],current=accountProfile(name),type=form.get('type'),limit=form.get('limit'),actual=form.get('actual');if(!raw)throw Error('找不到账户');if(limit!==''&&(!Number.isFinite(Number(limit))||Number(limit)<0))throw Error('额度无效');let next={...current,type,include:form.has('include'),groupId:form.get('groupId'),limit:String(limit||''),note:String(form.get('note')||'').trim()};if(actual!==''){let v=Number(actual);if(!Number.isFinite(v)||type==='credit'&&v<0)throw Error('校准金额无效');next.calibration={balance:type==='credit'?-v:v,baseline:raw.net,at:Date.now()}}if(type!==current.type&&(type==='credit'||current.type==='credit')&&actual==='')throw Error('切换信用卡类型时，请同时输入当前金额重新校准');await savePrefs({accountProfiles:{...(prefs.accountProfiles||{}),[name]:next}});close();render()}
async function saveGroupForm(f){let name=String(new FormData(f).get('name')||'').trim(),groups=accountGroups(),id=f.dataset.group||'group-'+Date.now().toString(36),members=new Set(new FormData(f).getAll('member')),prior=groups.find(g=>g.id===id),fallback=groups.find(g=>g.id!==id)?.id||id;if(!name||groups.some(g=>g.id!==id&&g.name===name))throw Error('分组名不能为空或重复');groups=groups.filter(g=>g.id!==id);let position=Math.max(0,Math.min(groups.length,Number(f.elements.position.value)||0));groups.splice(position,0,{id,name});let profiles={...(prefs.accountProfiles||{})};for(let [account,v] of accountViewData()){let p=accountProfile(account);if(members.has(account))profiles[account]={...p,groupId:id};else if(prior&&p.groupId===id)profiles[account]={...p,groupId:fallback}}await savePrefs({accountGroups:groups,accountProfiles:profiles});close();render()}
async function deleteGroup(id){let groups=accountGroups(),dest=$('#groupDestination')?.value,group=groups.find(g=>g.id===id);if(!group||!dest||dest===id)throw Error('先选择迁入分组');let profiles={...(prefs.accountProfiles||{})};for(let [name] of accountViewData())if(accountProfile(name).groupId===id)profiles[name]={...accountProfile(name),groupId:dest};await savePrefs({accountGroups:groups.filter(g=>g.id!==id),accountProfiles:profiles});close();render()}
function cycleSetting(){return `<div class="setting-row"><span><b>月度起始日</b><small>例如设为 25 日：9 月从 9 月 25 日算到 10 月 24 日</small></span><select data-setting="monthStartDay" aria-label="月度起始日">${Array.from({length:28},(_,i)=>`<option value="${i+1}" ${Number(prefs.monthStartDay)===i+1?'selected':''}>${i+1} 日</option>`).join('')}</select></div>`}
function recordDisplaySetting(){return `<div class="setting-row"><span><b>账单主标题</b><small>账单列表里加粗显示的内容</small></span><select data-setting="recordTitle">${[['note','备注'],['category','大类'],['subcategory','小类'],['both','大类 / 小类']].map(([k,v])=>`<option value="${k}" ${prefs.recordTitle===k?'selected':''}>${v}</option>`).join('')}</select></div>`}
function configTools(){return `<div class="card section advanced-settings"><div class="sectionhead"><h2>高级设置</h2><p>工作区文件格式与兼容说明</p></div><details class="manage-details"><summary>查看 StarLedger 使用的 5 类文件</summary><p class="muted">网页只读取以下固定格式，文件夹中的其他内容会被忽略：</p><div class="manage-list"><span class="button">〈主账本〉_mobile.csv</span><span class="button">〈主账本〉_scriptable.csv</span><span class="button">〈主账本〉_desktop.csv</span><span class="button">${SHARED_CONFIG_FILE}</span><span class="button">${WORKSPACE_RELATIONS_FILE}</span></div><p class="muted">CSV 保存账单流水；StarLedgerConfig.json 保存账户、校准、预算、显示与排序设置；StarLedgerRelations.json 保存账单关联。选择工作区时三者会一起读取。</p></details></div>`}
function configBackup(){return {format:'star-ledger-settings',version:1,settings:Object.fromEntries(['accountGroups','accountProfiles','accountTypes','accountAliases','recordTitle','accountOrder','recordBlockOrder','searchFilterOrder','bannerConfigs','deletedAccounts','budgets','monthStartDay','theme','appearance'].map(k=>[k,prefs[k]]))}}
function validateConfigBackup(text){let data=JSON.parse(text);if(data?.format!=='star-ledger-settings'||data.version!==1||!data.settings||typeof data.settings!=='object')throw Error('不是星账本设置备份');let v=data.settings;if(!Array.isArray(v.accountGroups)||!v.accountGroups.length||typeof v.accountProfiles!=='object'||!v.accountProfiles||Array.isArray(v.accountProfiles))throw Error('账户设置格式不正确');let ids=v.accountGroups.map(g=>g.id),names=v.accountGroups.map(g=>g.name);if(ids.some(x=>typeof x!=='string'||!x)||names.some(x=>typeof x!=='string'||!x.trim())||new Set(ids).size!==ids.length||new Set(names).size!==names.length)throw Error('分组设置格式不正确');return Object.fromEntries(['accountGroups','accountProfiles','accountTypes','accountAliases','recordTitle','accountOrder','recordBlockOrder','searchFilterOrder','bannerConfigs','deletedAccounts','budgets','monthStartDay','theme','appearance'].filter(k=>v[k]!==undefined).map(k=>[k,v[k]]))}
async function exportConfig(){if(native){await nativeCommand('exportConfig');return}let blob=new Blob([JSON.stringify(configBackup(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='StarLedger_Settings_Backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
function activeFilterNotice(){let parts=[];if(query)parts.push('关键词：'+query);if(kind!=='全部类型')parts.push('类型：'+kind);if(account!=='全部账户')parts.push('账户：'+account);if(category!=='全部分类')parts.push('分类：'+category);if(subcategory!=='全部小类')parts.push('小类：'+subcategory);if(currencyFilter!=='全部币种')parts.push('币种：'+currencyLabel(currencyCode(currencyFilter)));if(day)parts.push('日期：'+day);return parts.length?`<div class="active-filters"><span>当前仍有查账条件：${parts.map(esc).join(' · ')}</span><button class="button" id="clearActiveFilters">清除条件</button></div>`:''}
function tagParts(s){return String(s||'').split(/[,，;；\s]+/).filter(Boolean)}

function accountManagementPage(){
 let data=accountViewData();
 return `<div class="card section"><div class="sectionhead"><h2>账户管理</h2></div><p class="muted">点击账户可改名、隐藏、删除或修改账户资料。改名会同步历史账单；隐藏不改 CSV；删除会先提示如何处理关联账单。</p><details class="manage-details"><summary>管理账户 · ${data.length} 个</summary><div class="account-management-list">${data.map(([name,v])=>`<button type="button" class="button ${v.profile.hidden?'account-management-hidden':''}" data-accountname="${esc(name)}"><span>${esc(name)}</span><small>${v.profile.hidden?'已隐藏 · ':''}${v.count} 笔 · 管理</small></button>`).join('')||'<p class="muted">尚无账户</p>'}</div></details></div>`
}
function managementPage(){let books=orderedBookNames(true),tags=[...new Set(rows.flatMap(r=>tagParts(r.tags)))].sort((a,b)=>a.localeCompare(b,'zh-CN'));return `<div class="card section"><div class="sectionhead"><h2>账本与标签</h2></div><p class="muted">修改会更新相关账单。与已有名称合并前可导出备份，或给原账单添加来源标签；合并不提供自动撤回。</p><details class="manage-details"><summary>管理账本名 · ${books.length} 个</summary><div class="manage-list">${books.map(v=>`<button type="button" class="button" data-managebook="${esc(v)}">${esc(v)} <small>${rows.filter(r=>r.book===v).length} 笔 · 改名</small></button>`).join('')||'<p class="muted">尚无账本</p>'}</div></details><details class="manage-details"><summary>管理标签 · ${tags.length} 个</summary><div class="manage-list">${tags.map(v=>`<button type="button" class="button" data-managetag="${esc(v)}">${esc(v)} <small>${rows.filter(r=>tagParts(r.tags).includes(v)).length} 笔 · 修改</small></button>`).join('')||'<p class="muted">尚无标签</p>'}</div></details></div>`}
function categoryManagementPage(){let groups=['支出','收入'].map(type=>{let relevant=rows.filter(r=>r.type===type),cats=[...new Set(relevant.map(r=>r.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));return `<details class="manage-details"><summary>${type}分类 · ${cats.length} 个大类</summary>${cats.map(cat=>{let items=relevant.filter(r=>r.category===cat),subs=[...new Set(items.map(r=>r.subcategory).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'));return `<div class="category-manage-group"><button type="button" class="button" data-managecategory="${esc(cat)}" data-categorytype="${type}">${esc(cat)} <small>${items.length} 笔 · 改名／合并</small></button><div class="manage-list">${subs.map(sub=>`<button type="button" class="button" data-managesubcategory="${esc(sub)}" data-parentcategory="${esc(cat)}" data-categorytype="${type}">${esc(sub)} <small>${items.filter(r=>r.subcategory===sub).length} 笔 · 改名</small></button>`).join('')}</div></div>`}).join('')||'<p class="muted">暂无已记账分类，可在记一笔时新建。</p>'}</details>`}).join('');return `<div class="card section"><div class="sectionhead"><h2>管理大类与小类</h2></div><p class="muted">改名会更新相关账单；改为已有名称时将合并。新分类在「记一笔」中建立并随账单保存。</p>${groups}</div>`}
function manageCategoryForm(kind,type,category,subcategory=''){let target=kind==='categoryRename'?category:subcategory,count=rows.filter(r=>r.type===type&&r.category===category&&(kind==='categoryRename'||r.subcategory===subcategory)).length;$('#overlay').innerHTML=`<div class="modalback"><div class="modal"><h2>修改${kind==='categoryRename'?'大类':'小类'} · ${esc(target)}</h2><p class="muted">影响 ${count} 笔${kind==='subcategoryRename'?'「'+esc(category)+'」下的':''}账单。合并前可先导出完整 ZIP 备份。</p><form id="categoryManageForm" data-kind="${kind}" data-type="${esc(type)}" data-category="${esc(category)}" data-target="${esc(target)}"><label class="field">新名称<input name="dest" maxlength="40" autocomplete="off" required></label><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">下一步</button></div></form></div></div>`}
function categoryOperationHit(r,op){return r.type===op.type&&r.category===op.category&&(op.kind==='categoryRename'||r.subcategory===op.target)}
function manageForm(type,name){let isTag=type==='tag',count=rows.filter(r=>isTag?tagParts(r.tags).includes(name):r.book===name).length;$('#overlay').innerHTML=`<div class="modalback"><div class="modal"><h2>${isTag?'管理标签':'修改账本名'} · ${esc(name)}</h2><p class="muted">影响 ${count} 笔。手机端通过增量 CSV 写入修改，原始导入副本保留。合并前建议导出完整备份。</p><form id="manageForm" data-type="${type}" data-name="${esc(name)}"><label class="field">新名称<input name="dest" maxlength="80" autocomplete="off" placeholder="输入新名称或已有名称" required></label><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">下一步</button></div></form>${isTag?`<hr><h3>删除标签</h3><button type="button" class="button" data-tagoperation="tagRemove" data-tagname="${esc(name)}">仅删除标签，保留账单</button> <button type="button" class="button" data-tagoperation="tagMigrate" data-tagname="${esc(name)}">迁移到别的标签</button> <button type="button" class="button danger" data-tagoperation="tagDeleteBills" data-tagname="${esc(name)}">删除这些账单</button>`:''}</div></div>`}
let pendingMergeOperation=null;
function mergeChoice(op){pendingMergeOperation=op;let count=rows.filter(r=>['categoryRename','subcategoryRename'].includes(op.kind)?categoryOperationHit(r,op):op.kind==='bookRename'?r.book===op.target:tagParts(r.tags).includes(op.target)).length;$('#overlay').innerHTML=`<div class="modalback"><div class="modal"><h2>合并到「${esc(op.dest)}」</h2><p class="muted">「${esc(op.target)}」涉及 ${count} 笔。直接合并后无法按原名称自动分开，请选一种处理方式。</p><div class="merge-choices"><button class="button" id="backupForMerge">先导出完整 ZIP 备份</button><label class="field">给原账单加来源标签<input id="mergeTraceTag" maxlength="60" value="${esc(('原_'+op.target).replace(/[,，;；\s]+/g,'_').slice(0,60))}"></label><button class="button" id="markAndMerge">加标签并合并</button><button class="button danger" id="directMerge">直接合并</button></div><div class="modalfooter"><button class="button" id="closeBtn">取消</button></div></div></div>`}
function transformBatch(source,op){let target=op.target,dest=op.dest;return source.flatMap(r=>{let parts=tagParts(r.tags),hit=['categoryRename','subcategoryRename'].includes(op.kind)?categoryOperationHit(r,op):op.kind==='bookRename'?r.book===target:['accountMigrate','accountDeleteBills'].includes(op.kind)?r.account===target||r.account2===target:parts.includes(target);if(!hit)return[r];if(['tagDeleteBills','accountDeleteBills'].includes(op.kind))return[];let next={...r};if(op.kind==='bookRename')next.book=dest;else if(op.kind==='categoryRename')next.category=dest;else if(op.kind==='subcategoryRename')next.subcategory=dest;else if(op.kind==='accountMigrate'){if(next.account===target)next.account=dest;if(next.account2===target)next.account2=dest}else next.tags=[...new Set(parts.map(x=>x===target?(op.kind==='tagRemove'?'':dest):x).filter(Boolean))].join(', ');if(op.traceTag)next.tags=[...new Set([...tagParts(next.tags),op.traceTag])].join(', ');return[next]})}
async function runBatch(op){if(!op.target||['bookRename','tagRename','categoryRename','subcategoryRename'].includes(op.kind)&&!op.dest)throw Error('请输入名称');if(native){let r=await nativeCommand('bulkPatch',null,null,{operation:op});prefs={...prefs,...r.settings};takeCsv(r.csv)}else{let next=transformBatch(rows,op);if(csvWrite(next)===csvWrite(rows))throw Error('没有需要修改的账单');await localWrite('replaceLedger',null,null,{csv:csvWrite(next),mainName:prefs.mainName,allowEmpty:true})}if(op.kind==='bookRename'&&book===op.target)book=op.dest;pendingMergeOperation=null;close();render();toast('修改完成')}
function appearanceCard(){let mode=prefs.appearance==='light'?'light':prefs.appearance==='dark'?'dark':systemScheme.matches?'dark':'light';return `<div class="card section appearance-card"><div class="sectionhead"><h2>外观配色</h2></div><div class="appearance-choices">${[['light','亮色'],['dark','深色']].map(([key,label])=>`<button type="button" class="appearance-choice ${key} ${mode===key?'active':''}" data-appearancechoice="${key}" aria-pressed="${mode===key}"><span class="appearance-preview"></span>${label}</button>`).join('')}</div><p class="muted">收支金额固定为绿色和红色；切换配色不会改变账单。</p></div>`}
function settingsPage(){
 let when=prefs.lastExportAt?new Date(prefs.lastExportAt).toLocaleString('zh-CN'):'尚无导出记录';
 return `<div class="card settings-basics"><div class="sectionhead"><h2>基础设置</h2></div>${cycleSetting()}${recordDisplaySetting()}</div>${bannerSettingsCard()}${configTools()}${accountManagementPage()}${managementPage()}${categoryManagementPage()}
 <div class="grid cols2">${appearanceCard()}
  <div class="card"><div class="sectionhead"><h2>导出提醒</h2></div>
   <p class="muted">StarLedger Web 的数据保存在当前设备。完整 ZIP 包含全部本地主账本、配置与账单关联；主动清除网站数据前请先导出。</p>
   <div class="setting-row"><span><b>提醒间隔</b><small>按上次完整 ZIP 导出时间起算</small></span><select data-setting="exportDays">${[[1,'每天'],[3,'每 3 天'],[7,'每 7 天'],[14,'每 14 天'],[30,'每 30 天'],[0,'关闭提醒']].map(([n,v])=>`<option value="${n}" ${prefs.exportDays==n?'selected':''}>${v}</option>`).join('')}</select></div>
   <p class="muted">上次导出：${esc(when)}<br>${esc(prefs.lastExportName||'尚未导出')}</p>
  </div>
 </div>
 <div class="card section workspace-settings"><div class="sectionhead"><h2>数据与备份</h2><p>${esc(workspace.folderName||'未连接工作区')}</p></div>
  <p class="muted">当前主账本：${esc(prefs.mainName||'未建立')} · ${rows.length.toLocaleString()} 笔。${workspace.readWrite?'当前浏览器已获得文件夹读写权限；账单与配置变化会同步写入固定工作区。':workspace.mode==='snapshot'?'已从文件夹读取到浏览器本地；当前浏览器只提供文件夹读取，网页不能在后台持续写回这个外部文件夹。':'尚未连接外部工作区；数据只保存在此浏览器。'}</p>
  <div class="workspace-actions"><button class="button" id="importFolder">${workspace.folderName?'重新选择工作区文件夹':'选择 StarLedger 工作区文件夹'}</button>
  ${workspace.names.length>1?`<button class="button" id="ledgerSwitchSettings">切换主账本（${workspace.names.length}）</button>`:''}
  <button class="button" id="newBook">新建主账本</button>
  <button class="button primary" id="exportBackup">导出完整备份 ZIP</button>
  <button class="button" id="importBackup">读取完整备份 ZIP</button>
  <button class="button" id="exportCsv">仅导出当前账本 CSV</button>
  ${workspace.readWrite?'<button class="button" id="refreshWorkspace">立即刷新工作区</button>':''}
  <button class="button" id="restorePrevious">恢复上一步</button>
  <button class="button danger" id="clearLedger">清空本机 StarLedger 数据</button></div>
  <p class="muted">完整 ZIP 与工作区使用同一套固定文件规则：账单 CSV、StarLedgerConfig.json 和 StarLedgerRelations.json。导入 ZIP 时会校验三类数据并恢复到本机。</p>
 </div>`
}
function accountPage(){let data=accountViewData(),f=financial(),groups=accountGroups();return `<div class="compact-inline-summary account-summary-strip">${f.ready?`净资产 ${money(f.net)} · 资产 ${money(f.assets)} · 负债 ${money(f.debt)}`:`待校准 ${f.missing} 个账户 · 点账户调整`}</div>${groups.map(group=>{let members=orderedGroupMembers(group.id,data.filter(([name,v])=>v.profile.groupId===group.id)),active=members.filter(([name,v])=>!v.profile.hidden),included=active.filter(([name,v])=>v.profile.include),uncalibrated=included.filter(([name,v])=>!v.calibrated).length,total=included.filter(([name,v])=>v.calibrated).reduce((n,[name,v])=>n+v.net,0);return `<div class="card section account-group"><div class="sectionhead"><button class="group-title" data-group="${esc(group.id)}">${esc(group.name)}　⌄</button><span class="group-total">${uncalibrated?`已校准 ${money(total)} · ${uncalibrated} 待校准`:money(total)}</span></div>${members.map(([name,v])=>`<div class="account-entry account-type-${esc(v.profile.type)} ${v.profile.hidden?'account-hidden':''}" data-accountentry="${esc(name)}" data-accountgroup="${esc(group.id)}"><button class="account-item account-name" data-accountname="${esc(name)}" aria-label="设置账户 ${esc(name)}"><span class="account-type-mark" aria-hidden="true"></span><span><b>${esc(name)}</b><small>${({stored:'储值／现金',credit:'信用卡',personal:'借贷关系'})[v.profile.type]}${v.profile.hidden?' · 已隐藏':v.profile.include?'':' · 不计入净资产'}${v.profile.note?' · '+esc(v.profile.note):''}</small></span></button><button class="account-item account-value" ${v.profile.hidden?'data-accountname':'data-accountquery'}="${esc(name)}" aria-label="${v.profile.hidden?'设置':'查询'}账户 ${esc(name)}"><span class="account-balance ${v.calibrated&&v.profile.type!=='personal'?(v.net>0?'positive':v.net<0?'negative':''):''}">${v.calibrated?money(v.net):'待校准'}<small>${v.profile.hidden?'已隐藏':'查看账单　›'}</small></span></button></div>`).join('')||'<div class="empty">这个分组还没有账户</div>'}</div>`}).join('')}<div class="account-page-actions"><button class="button add-group" id="addAccount">＋ 添加账户</button><button class="button add-group" id="addGroup">＋ 新建分组</button></div><p class="muted page-footnote">隐藏账户仍保留在账户页，但不参与账单显示、筛选和统计。账户资料、隐藏状态和分组保存在设置中，不改变账单 CSV。</p>`}
function continuousBillRows(){let end=cycleRange(year,month)[1];return filtered(rows).filter(r=>dateOf(r)<end).sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))}
function homeFinancialCard(f){return renderMetricBanner('homeAssets',assetBannerMetrics(f))}
function homeMonthSummary(rs){let s=stats(rs),banner=renderMetricBanner('homeMonth',monthBannerMetrics(rs));return `${banner}${s.other?`<p class="muted">另有 ${s.other} 笔外币流水未折算，以上金额只统计已换算流水。</p>`:''}`}
function homeV2(){let rs=filtered(rows,{monthOnly:true}),listRs=continuousBillRows(),f=financial();return `<div class="home-metrics">${homeFinancialCard(f)}${homeMonthSummary(rs)}</div><div class="grid cols2 section home-overview-grid"><div class="card">${categoryPanel(rs,'home')}</div><div class="card"><div class="sectionhead"><h2>最近账单</h2></div>${records(listRs,8)}<button class="record-link" data-viewall="home">查看全部账单　›</button></div></div>`}
function firstUsePage(){return `<div class="card importarea first-use-card">
 <div class="first-use-intro"><span class="first-use-kicker">第一次使用</span><h2>开始使用星账本</h2><p>选择适合你的开始方式。账单默认保存在当前浏览器，不会上传到服务器。</p></div>
 <div class="first-use-options">
  <button type="button" class="first-use-option first-use-option-primary" id="newBook"><span class="first-use-icon" aria-hidden="true">＋</span><span><b>创建新账本</b><small>从空白账本开始，稍后再添加账户和账单</small></span><span class="first-use-arrow" aria-hidden="true">→</span></button>
  <button type="button" class="first-use-option" id="importFolder"><span class="first-use-icon" aria-hidden="true">↗</span><span><b>打开已有数据</b><small>选择包含 StarLedger CSV 与设置文件的工作区文件夹</small></span><span class="first-use-arrow" aria-hidden="true">→</span></button>
  <button type="button" class="first-use-option" id="importBackup"><span class="first-use-icon" aria-hidden="true">⇧</span><span><b>恢复完整备份</b><small>读取 StarLedger 导出的 ZIP，恢复账单、配置与关联</small></span><span class="first-use-arrow" aria-hidden="true">→</span></button>
 </div>
 <div class="first-use-assurance"><span><b>本地优先</b><small>数据留在你的设备</small></span><span><b>完整可恢复</b><small>支持导出与读取 ZIP</small></span></div>
</div>`}
async function savePrefs(changes){
 let next={...prefs,...changes};
 if(native){
  let r=await nativeCommand('saveSettings',null,null,{settings:changes});
  prefs={...prefs,...r.settings};
 }else{
  prefs=next;
  if(folderHandle&&prefs.mainName){
   let shared=Object.fromEntries(Object.entries(changes).filter(([k])=>SHARED_PREF_KEYS.includes(k)||k==='mainName'));
   if(Object.keys(shared).length)await writeSharedPrefs(shared);
  }
  await put('prefs',prefs);
 }
 applyTheme();render();
}
function nativeCommand(action,record,id,extra={}){let key=++seq;return new Promise((resolve,reject)=>{pending.set(key,{resolve,reject});window.dispatchEvent(new CustomEvent('ledger-command',{detail:{key,action,record,id,revision,...extra}}))})}
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
function upsertById(list,row){let i=list.findIndex(x=>x.id===row.id);if(i>=0)list[i]=row;else list.unshift(row)}
async function folderReadCsv(name,required=false){
 try{
  let fh=await folderHandle.getFileHandle(name),f=await fh.getFile(),text=await f.text();
  return {rows:csvParse(text),meta:name+'|'+f.lastModified+'|'+f.size}
 }catch(e){
  if(e.name==='NotFoundError'&&!required)return {rows:[],meta:name+'|missing'};
  throw e
 }
}
function folderNames(name=prefs.mainName){return {base:name+'_mobile.csv',legacyBase:name+'_手机主账本.csv',mobile:name+'_scriptable.csv',desktop:name+'_desktop.csv'}}
async function readFolderSources(name=prefs.mainName){
 if(!folderHandle)throw Error('尚未连接 StarLedger/Data 文件夹');
 let names=folderNames(name);
 let [base,mobile,desktop]=await Promise.all([folderReadCsv(names.base),folderReadCsv(names.mobile),folderReadCsv(names.desktop)]);
 if(base.meta.endsWith('|missing')){let legacy=await folderReadCsv(names.legacyBase);if(!legacy.meta.endsWith('|missing'))base=legacy}
 if(!base.rows.length&&!mobile.rows.length&&!desktop.rows.length&&base.meta.endsWith('|missing')&&mobile.meta.endsWith('|missing')&&desktop.meta.endsWith('|missing'))throw Error('文件夹里没有找到「'+name+'」的账本数据');
 return {base:base.rows,mobile:mobile.rows,desktop:desktop.rows,meta:[base.meta,mobile.meta,desktop.meta].join('||')}
}
async function writeDesktopDelta(name,desktopRows){
 if(!folderHandle)throw Error('尚未连接 StarLedger/Data 文件夹');
 if(!await permission(folderHandle,'readwrite',true))throw Error('需要允许浏览器修改 StarLedger/Data 文件夹');
 let filename=folderNames(name).desktop,fh=await folderHandle.getFileHandle(filename,{create:true}),w=await fh.createWritable();
 await w.write(csvWrite(desktopRows));await w.close()
}
async function folderWrite(action,record,id,extra={}){
 if(busy)throw Error('正在保存，请稍候');busy=true;
 try{
  if(!prefs.mainName&&action!=='replaceLedger')throw Error('请先连接 StarLedger/Data 文件夹');
  let name=extra.mainName||prefs.mainName;
  if(!name)throw Error('主文件名为空');
  let sources;
  try{sources=await readFolderSources(name)}catch(e){
   if(action==='replaceLedger'&&extra.allowEmpty)sources={base:[],mobile:[],desktop:[],meta:''};
   else throw e
  }
  let current=mergeSourceRows(sources.base,sources.mobile,sources.desktop),desktop=sources.desktop.map(x=>({...x})),changedId=id,now=new Date().toISOString();
  let oldRecovery=await get('recovery');await putBundle({recoveryPrevious:oldRecovery,recovery:csvWrite(current)});

  if(action==='restorePrevious'){
   let previous=await get('recovery');
   if(!previous)throw Error('没有可恢复的上一版本');
   // recovery was just overwritten above; use the older recovery copy if present.
   let older=await get('recoveryPrevious');
   if(!older)throw Error('没有可恢复的上一版本');
   extra={...extra,csv:older,allowEmpty:true,mainName:name};
   action='replaceLedger'
  }

  if(action==='add'||action==='reconcile'){
   changedId='PC-'+Date.now()+'-'+Math.random().toString(36).slice(2,9);
   let row={...Object.fromEntries(COLS.map(k=>[k,''])),...record,id:changedId,created_at:now,updated_at:now};
   upsertById(desktop,clearDeletionFlag(row))
  }else if(action==='update'){
   let old=current.find(x=>x.id===id);if(!old)throw Error('找不到这笔账单');
   upsertById(desktop,clearDeletionFlag({...old,...record,id,updated_at:now}))
  }else if(action==='remove'||action==='bulkRemove'){
   let ids=action==='bulkRemove'?[...new Set(extra.ids||[])]:[id];
   if(!ids.length)throw Error('没有选择账单');
   for(let key of ids){let old=current.find(x=>x.id===key);if(!old)continue;upsertById(desktop,deletionRecord(old,now))}
  }else if(action==='replaceLedger'){
   let desired=csvParse(extra.csv);if(!desired.length&&!extra.allowEmpty)throw Error('不能导入空账本');
   let oldMap=new Map(current.map(r=>[r.id,r])),newMap=new Map(desired.map(r=>[r.id,r]));
   for(let [key,old] of oldMap)if(!newMap.has(key))upsertById(desktop,deletionRecord(old,now));
   for(let [key,row] of newMap){
    let old=oldMap.get(key),a=old?JSON.stringify({...old,updated_at:''}):'',b=JSON.stringify({...row,updated_at:''});
    if(!old||a!==b){
     let next=clearDeletionFlag({...row,id:key,created_at:row.created_at||old?.created_at||now,updated_at:now});
     upsertById(desktop,next)
    }
   }
  }else throw Error('不支持此操作');

  await writeDesktopDelta(name,desktop);
  let combined=mergeSourceRows(sources.base,sources.mobile,desktop),next=csvWrite(combined),nextPrefs={...prefs,mainName:name,lastChangeAt:Date.now(),undoBatch:null};
  if(action==='reconcile'&&extra.kind)nextPrefs.accountTypes={...prefs.accountTypes,[record.account]:extra.kind};

  await putBundle({csv:next,prefs:nextPrefs});
  prefs=nextPrefs;lastDeltaMeta='';volatileDeletion=false;takeCsv(next);
  if(!['add','update'].includes(action))close();
  if(!['add','update'].includes(action))toast('已写入 '+folderNames(name).desktop);
  openPendingPrefill();
  return {id:changedId}
 }finally{busy=false}
}
async function localWriteLegacy(action,record,id,extra={}){
 if(busy)throw Error('正在保存，请稍候');busy=true;
 try{
  let data=rows.map(x=>({...x})),changedId=id;
  if(action==='restorePrevious'){let previous=await get('recovery');if(!previous)throw Error('没有可恢复的上一版本');let current=csvWrite(rows);csvParse(previous);let nextPrefs={...prefs,lastChangeAt:Date.now()};await putBundle({recovery:current,csv:previous,prefs:nextPrefs});prefs=nextPrefs;takeCsv(previous);toast('已恢复上一版本');return {id:null}}
  if(action==='replaceLedger'){data=csvParse(extra.csv);if(!data.length&&!extra.allowEmpty)throw Error('不能导入空账本')}
  else if(action==='add'||action==='reconcile'){changedId='TX-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);data.unshift({...Object.fromEntries(COLS.map(k=>[k,''])),...record,id:changedId,created_at:new Date().toISOString(),updated_at:new Date().toISOString()})}
  else if(action==='bulkRemove'){let ids=new Set(extra.ids||[]);if(!ids.size||[...ids].some(x=>!data.some(r=>r.id===x)))throw Error('选择的账单已发生变化');data=data.filter(r=>!ids.has(r.id))}
  else{let i=data.findIndex(x=>x.id===id);if(i<0)throw Error('找不到这笔账单');if(action==='remove')data.splice(i,1);else data[i]={...data[i],...record,updated_at:new Date().toISOString()}}
  let next=csvWrite(data),nextPrefs={...prefs,lastChangeAt:Date.now(),undoBatch:null};
  if(action==='replaceLedger'){nextPrefs.mainName=extra.mainName||prefs.mainName;nextPrefs.lastExportAt=filenameDate(extra.filename)||0;nextPrefs.lastExportName=extra.filename||''}
  if(action==='reconcile'&&extra.kind)nextPrefs.accountTypes={...prefs.accountTypes,[record.account]:extra.kind};
  await putBundle({...prefs.mainName?{recovery:csvWrite(rows)}:{},csv:next,prefs:nextPrefs});prefs=nextPrefs;takeCsv(next);
  if(!['add','update'].includes(action))close();if(!['add','update'].includes(action))toast('已保存在本机缓存');openPendingPrefill();return{id:changedId}
 }finally{busy=false}
}
async function localWrite(action,record,id,extra={}){return folderHandle?folderWrite(action,record,id,extra):localWriteLegacy(action,record,id,extra)}
async function sendV2(action,record,id,extra={}){if(!native)return localWrite(action,record,id,extra);let result=await nativeCommand(action,record,id,extra);volatileDeletion=false;if(result.csv!==undefined){let scrollY=window.scrollY||document.documentElement.scrollTop||0;prefs={...prefs,...result.settings};takeCsv(result.csv);window.scrollTo(0,scrollY);requestAnimationFrame(()=>window.scrollTo(0,scrollY));applyTheme()}if(!['add','update'].includes(action))close();if(!['add','update'].includes(action))toast('已保存在本机账本');openPendingPrefill();return result}
function normalizeBookIcon(value){
 let text=String(value||'').trim();if(!text)return '';
 try{return [...new Intl.Segmenter('zh-CN',{granularity:'grapheme'}).segment(text)].slice(0,2).map(x=>x.segment).join('')}
 catch(_){return Array.from(text).slice(0,4).join('')}
}
function bookProfile(name){let p=prefs.bookProfiles?.[name]||{};return {hidden:!!p.hidden,note:String(p.note||''),icon:normalizeBookIcon(p.icon)}}
function bookDisplayIcon(name){let icon=bookProfile(name).icon;return icon||Array.from(String(name||''))[0]||'账'}
function allBookNames(){
 let deleted=new Set(prefs.deletedBooks||[]),out=[],seen=new Set(),push=name=>{name=String(name||'').trim();if(!name||deleted.has(name)||seen.has(name))return;seen.add(name);out.push(name)};
 for(let name of prefs.bookOrder||[])push(name);
 for(let name of Object.keys(prefs.bookProfiles||{}))push(name);
 for(let item of BOOT?.options?.books||[])push(item?.name);
 for(let r of rows)push(r.book);
 return out
}
function orderedBookNames(includeHidden=false){
 let names=allBookNames(),rank=new Map((prefs.bookOrder||[]).map((name,i)=>[name,i]));
 names=names.map((name,i)=>({name,i,rank:rank.has(name)?rank.get(name):1e9+i})).sort((a,b)=>a.rank-b.rank).map(x=>x.name);
 return includeHidden?names:names.filter(name=>!bookProfile(name).hidden)
}
function defaultBookName(){return orderedBookNames(false)[0]||orderedBookNames(true)[0]||'日常账本'}
function recentBookName(){
 let visible=new Set(orderedBookNames(false));
 let latest=rows.filter(r=>visible.has(String(r.book||'').trim())).slice().sort((a,b)=>{
  let ac=Date.parse(String(a.created_at||'')),bc=Date.parse(String(b.created_at||''));
  ac=Number.isFinite(ac)?ac:0;bc=Number.isFinite(bc)?bc:0;
  if(bc!==ac)return bc-ac;
  let byStamp=sourceStamp(b)-sourceStamp(a);
  if(byStamp)return byStamp;
  let byDate=String(b.date||'').localeCompare(String(a.date||''));
  if(byDate)return byDate;
  return String(b.id||'').localeCompare(String(a.id||''));
 })[0];
 return String(latest?.book||'').trim()||defaultBookName()
}
function unique(field){let options=BOOT?.options,source=field==='currency'?options?.currencies:null;if(field==='book')return orderedBookNames(false);return source?source.map(x=>x.name):[...new Set(rows.map(r=>r[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'zh-CN'))}
function accountNames(){let preferred=BOOT?.options?.accounts?.map(x=>x.name)||accountData().map(([k])=>k),names=[...new Set(preferred)].filter(v=>v&&!prefs.accountProfiles?.[v]?.hidden&&!(prefs.deletedAccounts||[]).includes(v));return orderedAccountNameList(names)}

function activateEntryTertiary(){
 // rc7.2.9: account/category/tag/currency/book pickers are children of the bill editor,
 // not app-level level 3. Keep their original centered floating-card behavior.
 return;
}

let appTertiaryKind='';
function activateAppTertiary(kind){
 if(compactViewport())return;
 let overlay=$('#overlay');
 if(!overlay)return;
 let panel=kind==='bill'?overlay.querySelector(':scope > .entryback'):overlay.querySelector(':scope > .account-dialog-back');
 if(!panel)return;

 let wasOpen=document.body.classList.contains('app-tertiary-open');
 appTertiaryKind=kind;
 panel.classList.add('app-level3-panel','app-level3-'+kind);
 let card=kind==='bill'?panel.querySelector(':scope > .entry'):panel.querySelector(':scope > .modal');
 card?.setAttribute('data-ui-level','3');

 syncDesktopLevelWidths();
 document.body.classList.add('app-tertiary-open');
 document.body.dataset.tertiary=kind;
 requestAnimationFrame(syncDesktopLevelWidths);

 // Re-rendering the same bill/account must not replay the slide.
 if(wasOpen){
  panel.classList.add('app-level3-visible');
 }else{
  requestAnimationFrame(()=>requestAnimationFrame(()=>panel.classList.add('app-level3-visible')));
 }
}
function closeAppTertiary(){
 let overlay=$('#overlay');
 if(compactViewport()||!document.body.classList.contains('app-tertiary-open'))return false;
 let panel=overlay?.querySelector(':scope > .app-level3-panel');
 if(panel?.classList.contains('app-level3-closing'))return true;

 if(panel){
  panel.classList.add('app-level3-closing');
  panel.classList.remove('app-level3-visible');
 }
 document.body.classList.remove('app-tertiary-open');
 document.body.classList.add('app-tertiary-returning');
 requestAnimationFrame(syncDesktopLevelWidths);

 setTimeout(()=>{
  if(overlay)overlay.innerHTML='';
  document.body.classList.remove('app-tertiary-returning');
  delete document.body.dataset.tertiary;
  appTertiaryKind='';
  document.body.classList.remove('dialog-open');
  ocrReviewText='';
 },300);
 return true;
}
function syncDesktopBookButton(){
 let select=$('#entry select[name=book]'),button=$('#openBookSheet');
 if(!button)return;
 let value=String(select?.value||'').trim();
 button.textContent=value||'选择账本';
 button.classList.toggle('empty',!value);
}
function setEntryBookValue(value){
 let select=$('#entry select[name=book]');
 if(!select||!value)return;
 let found=[...select.options].find(o=>o.value===value);
 if(!found){found=document.createElement('option');found.value=value;found.textContent=value;select.appendChild(found)}
 select.value=value;
 select.dataset.currentBook=value;
 syncDesktopBookButton();
}
function openBookSheet(){
 if(!$('#entry'))return;
 let names=unique('book').filter(v=>v&&v!=='全部账本'),
     current=String($('#entry select[name=book]')?.value||'').trim(),
     buttons=names.map(v=>`<button type="button" data-choosebook="${esc(v)}" class="${v===current?'active':''}"><span class="account-choice-text">${esc(v)}</span></button>`).join('');
 $('#accountOverlay').innerHTML=`<div class="modalback entry-choice-back"><div class="modal entry-choice-card account-sheet book-account-sheet"><div class="sectionhead"><h2>选择账本</h2><button type="button" id="closeEntrySheet">完成</button></div><input class="account-search" id="bookSearch" type="search" placeholder="搜索账本，也可输入新账本" autocomplete="off"><div class="entry-account-groups"><section class="entry-account-group"><h3>账本 · ${names.length}</h3><div class="account-options" id="bookOptions">${buttons}</div></section></div><button type="button" class="button" id="useNewBook" style="margin-top:10px;display:none">使用输入的新账本</button></div></div>`;
 activateEntryTertiary();
 requestAnimationFrame(()=>document.querySelectorAll('#bookOptions .account-choice-text').forEach(node=>node.classList.toggle('truncated',node.scrollWidth>node.clientWidth+1)));
}
function openEntryDatePicker(){
 let control=$('#entry [name=date]');if(!control)return;
 try{control.showPicker()}catch(e){control.focus();control.click()}
}
function openAccountSheet(field){let names=accountNames(),current=$('#entry [name="'+field+'"]')?.value||'',groups=accountGroups();let sections=groups.map(group=>{let members=names.filter(v=>accountProfile(v).groupId===group.id);return members.length?`<section class="entry-account-group"><h3>${esc(group.name)} · ${members.length}</h3><div class="account-options">${members.map(v=>`<button type="button" data-chooseaccount="${esc(v)}" class="${v===current?'active':''}"><span class="account-choice-text">${esc(v)}</span></button>`).join('')}</div></section>`:''}).join('');$('#accountOverlay').dataset.field=field;$('#accountOverlay').innerHTML=`<div class="modalback entry-choice-back"><div class="modal entry-choice-card account-sheet"><div class="sectionhead"><h2>选择账户</h2><button type="button" id="closeAccountSheet">完成</button></div><input class="account-search" id="accountSearch" type="search" placeholder="搜索账户，也可输入新账户" autocomplete="off"><div class="entry-account-groups" id="accountOptions">${sections}</div><button type="button" class="button" id="useNewAccount" style="margin-top:10px;display:none">使用输入的新账户</button></div></div>`;requestAnimationFrame(()=>document.querySelectorAll('.account-choice-text').forEach(node=>node.classList.toggle('truncated',node.scrollWidth>node.clientWidth+1)))}
function bookPicker(r){
 let names=unique('book').filter(v=>v&&v!=='全部账本'),
     current=String(r?.book||defaultBookName()).trim();
 if(current&&!names.includes(current))names.unshift(current);
 return `<select name="book" data-bookpick required>${!current?'<option value="" selected disabled>选择账本</option>':''}${names.map(v=>`<option value="${esc(v)}" ${v===current?'selected':''}>${esc(v)}</option>`).join('')}</select>`
}
function currencySymbol(value){let code=currencyCode(value);if(code==='CNY')return '¥';if(code==='USD')return '$';try{return new Intl.NumberFormat('en',{style:'currency',currency:code}).formatToParts(1).find(p=>p.type==='currency')?.value||code}catch(e){return code}}
function layoutEntryForm(){let form=$('#entry'),back=$('.entryback');if(!form||!back)return;back.querySelector('.entry')?.setAttribute('data-ui-level','2');
 let stash=document.createElement('div');stash.className='entry-mobile-stash';
 for(let selector of ['.entryhint','#categorySearch','#categoryResults','.category-tabs','.quick-grid','.custom-sub','.ocr-review']){let node=form.querySelector(selector);if(node)stash.appendChild(node)}
 let fields=form.querySelector('.entry-fields');for(let selector of ['[name=currency]','#fxField']){let node=fields.querySelector(selector)?.closest('label.field');if(node&&node.parentElement===fields)stash.appendChild(node)}
 let merchant=fields.querySelector('[name=merchant]')?.closest('label.field'),noteLabel=fields.querySelector('[name=note]')?.closest('label.field'),dateLabel=fields.querySelector('[name=date]')?.closest('label.field'),tagLabel=fields.querySelector('[name=tags]')?.closest('label.field');if(merchant){merchant.classList.remove('full');fields.insertBefore(merchant,noteLabel)}
 let accountField=fields.querySelector('[name=account]')?.closest('label.field'),bookField=fields.querySelector('[name=book]')?.closest('label.field');for(let [label,name,placeholder] of [[accountField,'account','付款／收款账户'],[bookField,'book','账本'],[merchant,'merchant','商家／对方']]){if(!label)continue;label.classList.add('entry-compact-field');label.classList.remove('full');for(let node of [...label.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();let control=label.querySelector('input:not([type=hidden]),select,button');if(control){control.setAttribute('aria-label',placeholder);if(name==='merchant')control.placeholder=placeholder;if(name==='account'&&!$('#entry [name=account]').value){control.textContent=placeholder;control.classList.add('empty')}if(name==='account'||name==='book')label.classList.add('entry-dropdown-field')}}
 let otherAccount=fields.querySelector('[name=account2]')?.closest('label.field');if(otherAccount){otherAccount.classList.remove('full');otherAccount.classList.add('entry-compact-field');fields.classList.add('entry-transfer-fields');for(let node of [...otherAccount.childNodes])if(node.nodeType===Node.TEXT_NODE)node.remove();let control=otherAccount.querySelector('button[data-accountfield]');if(control){control.setAttribute('aria-label','转入账户');otherAccount.classList.add('entry-dropdown-field');if(!fields.querySelector('[name=account2]').value){control.textContent='转入账户';control.classList.add('empty')}}}
 if(accountField&&bookField&&merchant){if(otherAccount)fields.prepend(accountField,otherAccount,bookField,merchant);else fields.prepend(accountField,bookField,merchant)}
 if(bookField){let bookSelect=bookField.querySelector('select[name=book]');if(bookSelect){bookSelect.dataset.currentBook=bookSelect.value||bookSelect.querySelector('option[selected]')?.value||'';bookField.classList.add('custom-book-field');let picker=document.createElement('span');picker.className='account-picker book-picker';let bookButton=document.createElement('button');bookButton.type='button';bookButton.id='openBookSheet';bookButton.className='custom-book-button';picker.appendChild(bookButton);bookField.appendChild(picker);bookSelect.hidden=true;bookSelect.classList.add('hidden-book-select');stash.appendChild(bookSelect)}}
 let tags=tagLabel?.querySelector('[name=tags]'),tagRow=document.createElement('div');tagRow.className='entry-tag-row';tagRow.innerHTML='<button type="button" id="openTagSheet" aria-label="搜索标签">⌕ 标签</button><span id="selectedTags" class="entry-selected-tags"></span>';if(tags){tagRow.appendChild(tags);tags.type='hidden';stash.appendChild(tagLabel)}
 let note=noteLabel?.querySelector('[name=note]'),date=dateLabel?.querySelector('[name=date]'),noteCard=document.createElement('div');noteCard.className='entry-note-card';if(note){let area=document.createElement('textarea');area.name='note';area.rows=1;area.placeholder=note.placeholder;area.value=note.value;area.autocomplete='off';note.replaceWith(area);noteCard.appendChild(area);stash.appendChild(noteLabel)}if(date){let time=document.createElement('div');time.className='entry-date-action';time.tabIndex=0;time.setAttribute('role','button');time.setAttribute('aria-label','修改账单日期时间');time.innerHTML='<span id="entryDateText"></span>';time.appendChild(date);noteCard.appendChild(time);stash.appendChild(dateLabel)}
 let amount=form.querySelector('.amount-control'),input=form.querySelector('#amountInput');amount.innerHTML='<button type="button" class="amount-category" id="entryCatButton" aria-label="选择大类"></button><button type="button" class="amount-subcategory" id="entrySubButton" aria-label="选择小类"></button><span class="entry-amount-value"></span><button type="button" class="amount-currency" id="entryCurrencyButton" aria-label="选择币种"></button>';amount.querySelector('.entry-amount-value').appendChild(input);input.readOnly=compactViewport();if(!compactViewport()){input.removeAttribute('readonly');input.setAttribute('autocomplete','off')}
 let preview=document.createElement('small');preview.id='amountFxPreview';preview.className='fx-preview';amount.after(preview);
 let tabs=form.querySelector('.type-tabs'),save=form.querySelector('.entrysave'),keypad=form.querySelector('.keypad');form.prepend(tabs);form.appendChild(fields);form.appendChild(tagRow);form.appendChild(noteCard);form.appendChild(stash);syncDesktopBookButton();if(keypad)form.appendChild(keypad);if(save)form.appendChild(save);
 form.addEventListener('invalid',e=>{if(e.target.closest('.entry-mobile-stash')){toast('请检查币种、汇率和账本字段');e.preventDefault()}},true);
 updateEntryChips();renderEntryTags();updateEntryDate();growEntryNote();
}
function tagPartsEntry(){return String($('#entry [name=tags]')?.value||'').split(/[,，;；\s]+/).filter(Boolean)}
function setEntryTags(parts){let input=$('#entry [name=tags]');if(!input)return;input.value=[...new Set(parts)].join(', ');renderEntryTags();renderEntryTagChoices()}
function renderEntryTags(){let box=$('#selectedTags');if(!box)return;let selected=tagPartsEntry(),counts=new Map();for(let item of BOOT?.options?.tags||rows.flatMap(r=>String(r.tags||'').split(/[,，;；\s]+/).filter(Boolean).map(name=>({name,count:1}))))counts.set(item.name,item.count);let popular=[...counts].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN')).map(([v])=>v),items=[...new Set([...selected,...popular])].slice(0,30),scroll=box.scrollLeft;box.innerHTML=items.map(v=>`<button type="button" data-toggletag="${esc(v)}" class="${selected.includes(v)?'active':''}">${esc(v)}</button>`).join('');box.scrollLeft=scroll}
function renderEntryTagChoices(){let box=$('#entryTagOptions');if(!box)return;let q=($('#entryTagSearch')?.value||'').trim().toLocaleLowerCase(),selected=tagPartsEntry(),counts=new Map();for(let item of BOOT?.options?.tags||rows.flatMap(r=>String(r.tags||'').split(/[,，;；\s]+/).filter(Boolean).map(name=>({name,count:1}))))counts.set(item.name,item.count);for(let v of selected)if(!counts.has(v))counts.set(v,0);let matches=[...counts].filter(([v])=>!q||v.toLocaleLowerCase().includes(q)).sort((a,b)=>Number(selected.includes(b[0]))-Number(selected.includes(a[0]))||b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));box.innerHTML=matches.map(([v])=>`<button type="button" data-toggletag="${esc(v)}" class="${selected.includes(v)?'active':''}">${esc(v)}</button>`).join('')+(q&&!counts.has($('#entryTagSearch')?.value.trim())?`<button type="button" data-toggletag="${esc($('#entryTagSearch').value.trim())}">＋ 新标签：${esc($('#entryTagSearch').value.trim())}</button>`:'')}
function openEntryTagSheet(){if(!$('#entry'))return;$('#accountOverlay').innerHTML='<div class="modalback entry-choice-back"><div class="modal entry-choice-card entry-tag-sheet"><div class="sectionhead"><h2>选择标签</h2><button type="button" id="closeEntrySheet">完成</button></div><input id="entryTagSearch" class="account-search" type="search" placeholder="搜索或创建标签" autocomplete="off"><div id="entryTagOptions" class="entry-tag-options"></div></div></div>';renderEntryTagChoices()}
function updateEntryDate(){let date=$('#entry [name=date]'),label=$('#entryDateText');if(date&&label){let m=date.value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);label.textContent=m?`${m[1]}年${Number(m[2])}月${Number(m[3])}日 ${m[4]}:${m[5]}`:date.value}}
function growEntryNote(){let area=$('#entry textarea[name=note]');if(area){area.style.height='auto';area.style.height=Math.min(area.scrollHeight,144)+'px';area.style.overflowY=area.scrollHeight>144?'auto':'hidden'}}
function entrySuggestions(input){let popup=$('#entrySuggestions'),q=input.value.trim().toLocaleLowerCase();if(!q||!popup||!input.isConnected){if(popup)popup.hidden=true;return}let counts=new Map(),field=input.name;for(let item of field==='merchant'&&BOOT?.options?.merchants?BOOT.options.merchants:rows.map(r=>({name:r[field],count:1}))){let v=String(item.name||'').trim();if(v&&v!==input.value&&v.toLocaleLowerCase().includes(q))counts.set(v,(counts.get(v)||0)+item.count)}let values=[...counts].sort((a,b)=>Number(b[0].toLocaleLowerCase().startsWith(q))-Number(a[0].toLocaleLowerCase().startsWith(q))||b[1]-a[1]).slice(0,7);if(!values.length){popup.hidden=true;return}popup.innerHTML=values.map(([v])=>`<button type="button" data-suggestfield="${field}" data-suggestvalue="${esc(v)}">${esc(v)}</button>`).join('');let rect=input.getBoundingClientRect(),width=Math.min(Math.max(rect.width,320),window.innerWidth-24),left=Math.min(Math.max(12,rect.left),window.innerWidth-width-12),visibleBottom=(window.visualViewport?.height||window.innerHeight)+(window.visualViewport?.offsetTop||0);popup.style.width=width+'px';popup.style.left=left+'px';popup.style.top=rect.bottom+5+'px';popup.style.maxHeight=Math.max(60,Math.min(190,visibleBottom-rect.bottom-12))+'px';popup.hidden=false}
function updateEntryChips(){let f=$('#entry');if(!f)return;let cat=f.elements.category?.value||f.elements.type?.value||'分类',sub=f.elements.subcategory?.value||'小类';let a=$('#entryCatButton'),b=$('#entrySubButton'),c=$('#entryCurrencyButton');if(a)a.textContent=cat;if(b)b.textContent=sub;if(c)c.textContent=currencySymbol(f.elements.currency?.value)}
function categoryChoices(){let f=$('#entry'),type=f?.elements.type?.value||'支出',counts=new Map();if(!['支出','收入'].includes(type)){counts.set(type,new Map((type==='转账'?['账户互转','信用还款','理财买入','理财赎回']:['借出','收款','借入','还款']).map((s,i)=>[s,10-i])))}else if(BOOT?.options?.categories?.[type])for(let item of BOOT.options.categories[type])counts.set(item.name,new Map(item.subcategories.map(x=>[x.name,x.count])));else for(let r of rows)if(r.type===type){let cat=r.category||(type==='收入'?'收入':'其他'),subs=counts.get(cat)||new Map();if(r.subcategory)subs.set(r.subcategory,(subs.get(r.subcategory)||0)+1);counts.set(cat,subs)}let cat=f?.elements.category?.value,sub=f?.elements.subcategory?.value;if(cat){let subs=counts.get(cat)||new Map();if(sub)subs.set(sub,(subs.get(sub)||0)+1);counts.set(cat,subs)}return counts}
function renderCategoryChoices(){let shell=$('#categorySheet'),list=$('#categoryColumn'),subs=$('#subcategoryColumn');if(!shell||!list||!subs)return;let q=($('#categorySheetSearch')?.value||'').trim().toLocaleLowerCase(),counts=categoryChoices(),categories=[...counts].filter(([cat,m])=>!q||cat.toLocaleLowerCase().includes(q)||[...m.keys()].some(v=>v.toLocaleLowerCase().includes(q))).sort((a,b)=>[...b[1].values()].reduce((n,x)=>n+x,0)-[...a[1].values()].reduce((n,x)=>n+x,0)||a[0].localeCompare(b[0],'zh-CN'));if(!categories.length){list.innerHTML='<p class="muted">没有匹配的大类</p>'+(['支出','收入'].includes($('#entry')?.elements.type?.value)?'<button type="button" id="newEntryCategory">＋ 新建大类</button>':'');subs.innerHTML='';return}let selected=shell.dataset.category;if(!categories.some(([cat])=>cat===selected))selected=categories[0][0];shell.dataset.category=selected;list.innerHTML=categories.map(([cat])=>`<button type="button" data-sheetcat="${esc(cat)}" class="${cat===selected?'active':''}">${esc(cat)}</button>`).join('')+(['支出','收入'].includes($('#entry')?.elements.type?.value)?'<button type="button" id="newEntryCategory">＋ 新建大类</button>':'');let all=[...(counts.get(selected)||new Map())].filter(([sub])=>!q||selected.toLocaleLowerCase().includes(q)||sub.toLocaleLowerCase().includes(q)).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN'));subs.innerHTML=all.map(([sub])=>`<button type="button" data-sheetsub="${esc(sub)}" class="${sub===$('#entry')?.elements.subcategory?.value&&selected===$('#entry')?.elements.category?.value?'active':''}">${esc(sub)}</button>`).join('')+'<button type="button" id="newEntrySub">＋ 新建小类</button>'}
function openCategorySheet(){let f=$('#entry');if(!f)return;$('#accountOverlay').innerHTML='<div class="modalback entry-choice-back"><div class="modal entry-choice-card"><div class="sectionhead"><h2>选择分类</h2><button type="button" id="closeEntrySheet">完成</button></div><input id="categorySheetSearch" class="account-search" type="search" placeholder="搜索大类或小类中的任意字" autocomplete="off"><div class="entry-category-columns"><div id="categoryColumn"></div><div id="subcategoryColumn"></div></div></div></div>';$('#categorySheetSearch').parentElement.id='categorySheet';$('#categorySheet').dataset.category=f.elements.category?.value||f.elements.type?.value||'';renderCategoryChoices()}
function syncCurrencySheet(){let f=$('#entry'),sheet=$('#currencySheet');if(!f||!sheet)return;let code=currencyCode(f.elements.currency.value),rate=f.elements.fxRate;sheet.querySelector('#sheetCurrency').value=f.elements.currency.value;sheet.querySelector('#sheetFxArea').hidden=code==='CNY';sheet.querySelector('#sheetFxRate').value=rate.value;sheet.querySelector('#sheetFxPreview').textContent=code==='CNY'?'':rate.value&&Number(f.elements.amount.value)>0?`约合人民币 ${money(Number(f.elements.amount.value)*Number(rate.value))}`:'填写汇率后显示人民币换算'}
function openCurrencySheet(){let f=$('#entry');if(!f)return;$('#accountOverlay').innerHTML=`<div class="modalback entry-choice-back"><div class="modal entry-choice-card" id="currencySheet"><div class="sectionhead"><h2>币种与汇率</h2><button type="button" id="closeEntrySheet">完成</button></div><label class="field">币种<select id="sheetCurrency">${currencyOptions(f.elements.currency.value)}</select></label><div id="sheetFxArea"><label class="field">1 单位外币兑人民币<input id="sheetFxRate" type="number" min="0.000001" step="any" inputmode="decimal" placeholder="输入汇率"></label><button type="button" class="button" id="lookupFxRateSheet">获取账单日期的参考汇率</button><small id="sheetFxPreview" class="fx-preview"></small><small class="muted">新账单默认按当前日期查询，历史账单按账单日期查询；实际金额以结算记录为准。</small></div></div></div>`;syncCurrencySheet();if(currencyCode(f.elements.currency.value)!=='CNY'&&!Number(f.elements.fxRate.value))lookupFxRate(true).then(syncCurrencySheet).catch(err=>{let node=$('#sheetFxPreview');if(node)node.textContent='暂时无法获取：'+err.message+'；可手动填写'})}

function normalizeAmountExpression(value){
 return String(value??'')
  .replace(/\s+/g,'')
  .replace(/[＋]/g,'+')
  .replace(/[－–—-]/g,'−')
  .replace(/[xX*]/g,'×')
  .replace(/\//g,'÷')
  .replace(/，/g,'.');
}
function amountNumberPattern(){return '[−]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)'}
function amountSeed(value){
 let raw=normalizeAmountExpression(value);
 if(!raw)return '';
 if(new RegExp('^'+amountNumberPattern()+'$').test(raw)){
  let n=Number(raw.replace('−','-'));
  if(Number.isFinite(n))return Object.is(n,-0)?'0':String(n);
 }
 return raw;
}
function amountSaveValue(value){
 let raw=normalizeAmountExpression(value);
 if(!raw)return {ok:false,error:'请输入金额'};
 let pure=new RegExp('^'+amountNumberPattern()+'$');
 if(!pure.test(raw))return {ok:false,error:'请先完成金额计算，金额必须是纯数字'};
 let n=Number(raw.replace('−','-'));
 if(!Number.isFinite(n))return {ok:false,error:'金额无效'};
 if(n<0)return {ok:false,error:'计算结果为负数，请调整账单类型或重新计算金额；负数不能保存'};
 if(n===0)return {ok:false,error:'金额必须大于 0'};
 if(n>1e12)return {ok:false,error:'金额过大'};
 return {ok:true,value:Math.round((n+Number.EPSILON)*100)/100};
}
function evaluateAmountExpression(value){
 let raw=normalizeAmountExpression(value);
 if(!raw)return {ok:false,error:'请先输入金额'};
 let num='(?:\\d+(?:\\.\\d*)?|\\.\\d+)',
     full=new RegExp('^[−]?'+num+'(?:[+−×÷]'+num+')+$');
 if(!full.test(raw))return {ok:false,error:'请先完成金额计算'};
 let pos=0,values=[],ops=[],
     precedence={'+':1,'−':1,'×':2,'÷':2},
     first=raw.match(new RegExp('^[−]?'+num));
 if(!first)return {ok:false,error:'计算式无效'};
 values.push(Number(first[0].replace('−','-')));
 pos=first[0].length;
 const apply=()=>{
  let op=ops.pop(),b=values.pop(),a=values.pop();
  if(!Number.isFinite(a)||!Number.isFinite(b))return {ok:false,error:'计算式无效'};
  if(op==='÷'&&b===0)return {ok:false,error:'不能除以 0'};
  let n=op==='+'?a+b:op==='−'?a-b:op==='×'?a*b:a/b;
  if(!Number.isFinite(n)||Math.abs(n)>1e12)return {ok:false,error:'计算结果无效'};
  values.push(n);return {ok:true}
 };
 while(pos<raw.length){
  let op=raw[pos++],match=raw.slice(pos).match(new RegExp('^'+num));
  if(!match)return {ok:false,error:'请先完成金额计算'};
  while(ops.length&&precedence[ops[ops.length-1]]>=precedence[op]){
   let result=apply();if(!result.ok)return result;
  }
  ops.push(op);values.push(Number(match[0]));pos+=match[0].length;
 }
 while(ops.length){let result=apply();if(!result.ok)return result}
 let n=values[0];
 n=Math.round((n+Math.sign(n||1)*Number.EPSILON)*100)/100;
 if(Object.is(n,-0))n=0;
 return {ok:true,value:n};
}
function amountSegment(value){
 let raw=normalizeAmountExpression(value),i=Math.max(raw.lastIndexOf('+'),raw.lastIndexOf('−'),raw.lastIndexOf('×'),raw.lastIndexOf('÷'));
 // A leading minus belongs to a negative result, not an operator boundary.
 if(i===0&&raw[0]==='−')i=-1;
 return raw.slice(i+1);
}
function syncAmountExpressionUI(){
 let input=$('#amountInput');if(!input)return;
 let raw=normalizeAmountExpression(input.value);
 if(input.value!==raw)input.value=raw;
 let len=Math.max(1,raw.length),
     max=compactViewport()?34:44,
     min=compactViewport()?20:24,
     size=Math.max(min,Math.min(max,max-Math.max(0,len-9)*1.15));
 input.style.setProperty('font-size',size+'px','important');
 requestAnimationFrame(()=>{try{input.scrollLeft=input.scrollWidth}catch(e){}});
 updateFxPreview();
}
function setAmountExpression(value){
 let input=$('#amountInput');if(!input)return;
 input.value=normalizeAmountExpression(value).slice(0,48);
 syncAmountExpressionUI();
}
function amountEquals(){
 let input=$('#amountInput');if(!input)return false;
 let raw=normalizeAmountExpression(input.value);
 // "=" on a pure number simply normalizes/rounds it.
 if(new RegExp('^'+amountNumberPattern()+'$').test(raw)){
  let n=Number(raw.replace('−','-'));
  if(!Number.isFinite(n)){toast('金额无效');return false}
  n=Math.round((n+Math.sign(n||1)*Number.EPSILON)*100)/100;
  if(Object.is(n,-0))n=0;
  setAmountExpression(String(n));
  if(n<0)toast('计算结果为负数，请调整账单类型或重新计算金额；负数不能保存');
  return true;
 }
 let result=evaluateAmountExpression(raw);
 if(!result.ok){toast(result.error);return false}
 setAmountExpression(String(result.value));
 if(result.value<0)toast('计算结果为负数，请调整账单类型或重新计算金额；负数不能保存');
 return true;
}
function updateFxPreview(){let form=$('#entry');if(!form)return;let code=currencyCode(form.elements.currency?.value),amount=Number(form.elements.amount?.value),rate=Number(form.elements.fxRate?.value),show=code!=='CNY';let label=show&&amount>0&&rate>0?`约合人民币 ${money(Math.round(amount*rate*100)/100)}`:show?'填写汇率后显示人民币换算':'';for(let node of [$('#amountFxPreview'),$('#fxPreview')])if(node){node.textContent=label;node.hidden=!show}}
const rc728OpenAccountSheet=openAccountSheet;
openAccountSheet=function(field){rc728OpenAccountSheet(field);activateEntryTertiary()};
const rc728OpenEntryTagSheet=openEntryTagSheet;
openEntryTagSheet=function(){rc728OpenEntryTagSheet();activateEntryTertiary()};
const rc728OpenCategorySheet=openCategorySheet;
openCategorySheet=function(){rc728OpenCategorySheet();activateEntryTertiary()};
const rc728OpenCurrencySheet=openCurrencySheet;
openCurrencySheet=function(){rc728OpenCurrencySheet();activateEntryTertiary()};

function entryForm(record){document.body.classList.remove('dialog-open');let r=record||{},edit=!!r.id,kind=r.type||entryKind,cat=['支出','收入'].includes(kind)?(r.category||entryCategory||(kind==='收入'?'收入':'餐饮')):'',frequent=['支出','收入'].includes(kind),catCounts={},subCounts={};if(BOOT?.options?.categories?.[kind])for(let item of BOOT.options.categories[kind]){catCounts[item.name]=item.count;if(item.name===cat)for(let sub of item.subcategories)subCounts[sub.name]=sub.count}else for(let x of rows)if(x.type===kind){catCounts[x.category||'收入']=(catCounts[x.category||'收入']||0)+1;if((x.category||'收入')===cat)subCounts[x.subcategory]=(subCounts[x.subcategory]||0)+1}let searchSubs=[...new Set(rows.filter(x=>x.type===kind&&x.subcategory).map(x=>JSON.stringify([x.category||'收入',x.subcategory])))].map(x=>JSON.parse(x)),cats=Object.keys(catCounts).sort((a,b)=>catCounts[b]-catCounts[a]),subs=Object.keys(subCounts).sort((a,b)=>subCounts[b]-subCounts[a]);if(!cats.includes(cat))cats.unshift(cat);let defaultSub=r.subcategory||(!frequent?({'转账':'账户互转','借贷':'借出'}[kind]||''):subs[0]||({'餐饮':'正餐','收入':'其他收入'}[cat]||'其他'));if(frequent&&!subs.includes(defaultSub))subs.unshift(defaultSub);let availableAccounts=accountNames(),acc=r.account||(availableAccounts.includes('微信钱包')?'微信钱包':availableAccounts[0]||''),t=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,19),tagChoices=(BOOT?.options?.tags?.map(x=>x.name)||[...new Set(rows.flatMap(x=>String(x.tags||'').split(/[,，;；\s]+/)).filter(Boolean))]).slice(0,12),fx=fxInfo(r),initialCurrency=r.currency||'人民币';$('#overlay').innerHTML=`<div class="entryback ${entryInstantRender?'entry-instant':''}"><div class="entry"><div class="entryhead"><button type="button" id="closeBtn">← 返回</button><h2>${edit?'编辑账单':'记一笔'}</h2><div class="entryhead-right">${edit?'<button type="button" id="desktopDeleteBtn" class="desktop-entry-delete">删除</button>':''}${native?`<button type="button" id="switchMain" class="smallbutton mobile-entry-switch">${esc(prefs.mainName)}　切换</button>`:''}</div></div><form id="entry"><div class="type-tabs">${['支出','收入','转账','借贷'].map(v=>`<button type="button" data-entrytype="${v}" class="${kind===v?'active':''}">${v}</button>`).join('')}</div><div class="amount-control"><label class="entryamount"><span>${kind==='支出'?'−':kind==='收入'?'＋':'¥'}</span><input id="amountInput" name="amount" inputmode="decimal" type="text" placeholder="0" value="${esc(amountSeed(r.amount))}" readonly></label><button type="button" class="smallbutton open-keypad" id="openKeypad">打开键盘</button></div><input type="hidden" name="type" value="${esc(kind)}"><input type="hidden" name="category" value="${esc(cat)}"><input type="hidden" name="subcategory" value="${esc(defaultSub)}"><input type="hidden" name="extras" value="${esc(r.extras||'')}">${frequent?`<div class="entryhint">分类和小类 · 点选或搜索</div><input type="search" id="categorySearch" class="category-search" placeholder="搜索分类或小类，输入部分文字即可" autocomplete="off"><div class="search-results" id="categoryResults" hidden>${searchSubs.map(([c,v])=>`<button type="button" data-searchcat="${esc(c)}" data-searchsub="${esc(v)}">${esc(c)} · ${esc(v)}</button>`).join('')}</div><div class="category-tabs">${cats.map(v=>`<button type="button" data-entrycat="${esc(v)}" class="${cat===v?'active':''}">${esc(v)}</button>`).join('')}</div><div class="quick-grid">${subs.map(v=>`<button type="button" data-entrysub="${esc(v)}" class="${defaultSub===v?'active':''}">${esc(v)}</button>`).join('')}<button type="button" class="add-sub" id="addSub" aria-label="新增小类">＋</button></div>`:`<div class="entryhint">${kind==='转账'?'转账类型':'借贷类型'}</div><div class="quick-grid">${(kind==='转账'?['账户互转','信用还款','理财买入','理财赎回']:['借出','收款','借入','还款']).map(v=>`<button type="button" data-entrysub="${v}" class="${defaultSub===v?'active':''}">${v}</button>`).join('')}</div>`}<div class="custom-sub ${frequent&&defaultSub&&!subs.includes(defaultSub)?'open':''}"><label class="field">新增小类<input id="subInput" value="${esc(defaultSub)}" placeholder="输入小类名称"></label></div>${ocrReviewText?`<details class="ocr-review"><summary>截图识别文字 · 请核对预填结果</summary><pre>${esc(ocrReviewText)}</pre></details>`:''}<div class="entry-fields"><label class="field">${kind==='借贷'&&['借入','收款'].includes(defaultSub)?'借贷对象':'付款／收款账户'}<span class="account-picker"><input name="account" type="hidden" value="${esc(acc)}"><button type="button" data-accountfield="account">${esc(acc)}</button></span></label><label class="field">${kind==='转账'?'转入账户':kind==='借贷'?'对方／内部账户':'账本'}${['转账','借贷'].includes(kind)?`<span class="account-picker"><input name="account2" type="hidden" value="${esc(r.account2||'')}"><button type="button" data-accountfield="account2">${esc(r.account2||'选择账户')}</button></span>`:bookPicker(r)}</label>${['转账','借贷'].includes(kind)?`<label class="field full">账本${bookPicker(r)}</label>`:''}<label class="field full">备注<input name="note" placeholder="这一笔是做什么的" value="${esc(r.note||'')}"></label><label class="field full date-field">日期时间 · 点选使用系统选择器<span class="date-control"><input name="date" type="datetime-local" step="60" required value="${esc((r.date||t).replace(' ','T').slice(0,16))}"><button type="button" id="openDatePicker" class="smallbutton">选择</button></span></label><label class="field">币种<select name="currency">${currencyOptions(initialCurrency)}</select></label><label class="field fx-field" id="fxField" ${isCNY({currency:initialCurrency})?'hidden':''}>兑人民币汇率 <small>1 单位外币 ≈ 多少人民币；留空则不折算</small><span class="fx-control"><input name="fxRate" type="number" min="0.000001" step="any" inputmode="decimal" placeholder="手动填写" value="${fx?esc(fx.rate):''}" data-rate-date="${esc(fx?.date||'')}" data-rate-source="${esc(fx?.source||'')}"><button type="button" class="smallbutton" id="lookupFxRate">查当日参考价</button></span><small id="fxHint">${fx?.date?`参考日期 ${esc(fx.date)} · 可手动修改`:isCNY({currency:initialCurrency})?'':'查询采用当日或此前最近的参考日汇率'}</small></label><label class="field">商家／对方<input name="merchant" value="${esc(r.merchant||'')}"></label><label class="field full">标签<input name="tags" value="${esc(r.tags||'')}" placeholder="可输入或点选已有标签">${tagChoices.length?`<span class="tag-choices">${tagChoices.map(v=>`<button type="button" data-addtag="${esc(v)}">${esc(v)}</button>`).join('')}</span>`:''}</label></div><div class="entrysave">${edit?'<button type="button" id="deleteBtn" class="button danger">删除</button>':''}<button class="button primary" type="submit">保存这笔账单</button></div><div class="keypad">${['⌫','清空','保存账单','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','收起','='].map(v=>`<button type="button" class="${v==='保存账单'?'keyconfirm':v==='收起'?'keyhide':v==='0'?'keyzero':v==='.'?'keydot':['+','−','×','÷'].includes(v)?'keyoperator':v==='='?'keyequals':''}" data-key="${v}">${v}</button>`).join('')}</div></form></div></div><div id="accountOverlay"></div><div id="entrySuggestions" class="entry-suggestions" hidden></div>`;$('#entry').dataset.id=r.id||'';entryKind=kind;entryCategory=cat;calcState={left:null,op:null,fresh:false};layoutEntryForm();syncAmountExpressionUI();activateAppTertiary('bill')}
async function lookupFxRate(silent=false){let form=$('#entry'),select=form?.elements.currency,input=form?.elements.fxRate,date=form?.elements.date?.value.slice(0,10),code=currencyCode(select?.value);if(!form||!input||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^[A-Z]{3}$/.test(code)||code==='CNY')throw Error('请先选好外币和账单日期');if(date>localDate(new Date()))throw Error('未来日期还没有参考汇率');let start=new Date(date+'T12:00:00');start.setDate(start.getDate()-10);let url=`https://api.frankfurter.dev/v2/rates?from=${localDate(start)}&to=${date}&base=${code.toLowerCase()}&quotes=cny`,button=$('#lookupFxRateSheet')||$('#lookupFxRate'),controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);button.disabled=true;button.textContent='查询中…';try{let response=await fetch(url,{signal:controller.signal}),data=await response.json();if(!response.ok)throw Error(data?.message||'接口暂不可用');let rates=Array.isArray(data)?data:Array.isArray(data?.rates)?data.rates:[],match=rates.filter(x=>x.quote==='CNY'&&x.date<=date&&Number(x.rate)>0).sort((a,b)=>b.date.localeCompare(a.date))[0];if(!match)throw Error('该日期附近没有人民币参考价');if($('#entry')!==form||currencyCode(form.elements.currency.value)!==code||form.elements.date.value.slice(0,10)!==date)return;input.value=String(match.rate);input.dataset.rateDate=match.date;input.dataset.rateSource='Frankfurter';updateFxPreview();syncCurrencySheet();$('#fxHint').textContent=`参考日期 ${match.date} · 1 ${code} ≈ ${match.rate} 人民币，可手动修改`;if(!silent)toast('已填入参考汇率，请核对实际结算价')}catch(e){if(e.name==='AbortError')throw Error('请求超时，可手动填写');throw e}finally{clearTimeout(timeout);if(button.isConnected){button.disabled=false;button.textContent=button.id==='lookupFxRateSheet'?'获取账单日期的参考汇率':'查当日参考价'}}}
function amountResult(){return amountEquals()}
function pressAmountKey(v){
 let input=$('#amountInput');if(!input)return;
 let back=$('.entryback');
 if(v!=='收起')back?.classList.remove('keypad-hidden','editing-text');
 if(v==='收起'){input.blur();back?.classList.add('keypad-hidden');return}
 if(v==='保存账单'){$('#entry')?.requestSubmit();return}
 if(v==='='){amountEquals();return}
 if(v==='清空'){setAmountExpression('');return}

 let raw=normalizeAmountExpression(input.value);
 if(v==='⌫'){setAmountExpression(raw.slice(0,-1));return}

 if(['+','−','×','÷'].includes(v)){
  if(!raw){toast('先输入金额');return}
  if(/[+−×÷]$/.test(raw)){setAmountExpression(raw.slice(0,-1)+v);return}
  if(raw.endsWith('.'))raw+='0';
  setAmountExpression(raw+v);return
 }

 if(v==='.'){
  let segment=amountSegment(raw);
  if(segment.includes('.'))return;
  setAmountExpression(raw+(segment?'':'0')+'.');return
 }

 if(/^\d$/.test(v)){
  let segment=amountSegment(raw);
  let decimals=segment.includes('.')?segment.split('.')[1].length:0;
  if(segment.includes('.')&&decimals>=2)return;
  if(segment==='0'&&!segment.includes('.')){
   setAmountExpression(raw.slice(0,-1)+v);
  }else{
   setAmountExpression(raw+v);
  }
 }
}
function reconcileForm(name){let found=accountData().find(([k])=>k===name),v=found?.[1];if(!v)return;$('#overlay').innerHTML=`<div class="modalback"><div class="modal reconcile-form"><h2>校准 · ${esc(name)}</h2><p class="muted">输入现在实际看到的账户余额。系统会计算差额，新增一笔“余额调整”，不计入收入或支出。</p><form id="reconcile"><label class="field">账户类型<select name="kind"><option value="asset" ${prefs.accountTypes[name]==='asset'?'selected':''}>资产</option><option value="debt" ${prefs.accountTypes[name]==='debt'?'selected':''}>负债（输入欠款额）</option><option value="ignore" ${prefs.accountTypes[name]==='ignore'?'selected':''}>不计入净资产</option></select></label><label class="field" style="margin-top:12px">实际余额／欠款额<input name="actual" type="number" min="0" step="0.01" inputmode="decimal" required></label><div class="reconcile-preview">当前流水推算：${money(v.net)}<br>确认后自动生成差额调整</div><div class="modalfooter"><button type="button" class="button" id="closeBtn">取消</button><button type="submit" class="button primary">确认平账</button></div></form></div></div>`;$('#reconcile').dataset.account=name}

function calendarAmount(n){return displayAmount(n,false)}
function calendar(rs){let [start,end]=cycleRange(year,month),first=new Date(start+'T00:00:00'),last=new Date(end+'T00:00:00'),offset=(first.getDay()+6)%7,by={};for(let r of rs)if(cnyAmount(r)!==null&&(r.type==='支出'||r.type==='收入')){let k=dateOf(r);by[k]??={income:0,expense:0};by[k][r.type==='收入'?'income':'expense']+=cnyAmount(r)}let html=['一','二','三','四','五','六','日'].map(n=>`<div class="dayname">${n}</div>`).join('');for(let i=0;i<offset;i++)html+='<div></div>';for(let d=new Date(first);d<last;d.setDate(d.getDate()+1)){let key=localDate(d),v=by[key],income=v?.income||0,expense=v?.expense||0,net=income-expense,has=income>0||expense>0,label=(d.getDate()===1||d.getTime()===first.getTime())&&Number(prefs.monthStartDay)>1?(d.getMonth()+1)+'/'+d.getDate():String(d.getDate()),line=(klass,value,title)=>{let chars=Math.max(4,String(value||'').length),fit=Math.max(6.2,Math.min(13.5,82/chars));return `<small class="cal-line ${klass}" style="--cal-fit:${fit.toFixed(2)}cqw" title="${esc(title)}">${value||'&nbsp;'}</small>`};html+=`<button class="day ${has?'has':''}" data-day="${key}" aria-label="${key} 支出${expense} 收入${income} 结余${net}"><span>${label}</span>${income>0&&expense>0?line('cal-expense',calendarAmount(Math.abs(expense)),'支出 '+money(expense)):line('cal-slot-empty','','')}${income>0&&expense>0?line('cal-income',calendarAmount(income),'收入 '+money(income)):line('cal-slot-empty','','')}${has?line(net>=0?'cal-net-positive':'cal-net-negative',(net<0?'−':'')+calendarAmount(Math.abs(net)),'合计 '+money(net)):line('cal-slot-empty','','')}</button>`}return html}
function yearCards(rs,monthsData){let s=stats(rs),banner=renderMetricBanner('yearPage',yearBannerMetrics(rs,monthsData));return `${banner}${s.other?`<p class="muted">${s.other} 笔外币流水未折算</p>`:''}`}
function monthly(){let rs=filtered(rows,{monthOnly:true}),listRs=continuousBillRows(),[start,end]=cycleRange(year,month),last=new Date(end+'T00:00:00');last.setDate(last.getDate()-1);return `${Number(prefs.monthStartDay)>1?`<p class="muted cycle-caption">本期 ${start} 至 ${localDate(last)}</p>`:''}${renderMetricBanner('monthPage',monthBannerMetrics(rs))}<div class="month-insights grid cols2"><div class="card calendar-card"><div class="sectionhead"><h2>每日收支</h2></div><div class="calendar">${calendar(rs)}</div></div><div class="card">${categoryPanel(rs,'month')}</div></div><div class="section card"><div class="sectionhead"><h2>${year} 年 ${month} 月账单</h2></div>${records(listRs,30)}<button class="record-link" data-viewall="month">查看全部账单　›</button></div>`}
function yearly(){let rs=filtered(rows,{yearOnly:true}),months=Array.from({length:12},(_,i)=>stats(rs.filter(r=>inCycle(dateOf(r),year,i+1))));return `${yearCards(rs,months)}<div class="grid cols2 section"><div class="card"><div class="sectionhead"><h2>收支趋势</h2></div>${trendChart(months)}</div><div class="card">${categoryPanel(rs,'year')}</div></div><div class="section card"><div class="sectionhead"><h2>月度总览</h2></div>${yearlyNetChart(months)}</div>`}
function statsPage(){return statsMode==='year'?yearly():monthly()}
function bookPage(){
 let names=orderedBookNames(true),defaultName=defaultBookName(),total=names.reduce((n,name)=>n+rows.filter(r=>r.book===name).length,0);
 return `<div class="card section book-list-card">
  <div class="sectionhead"><h2>账本 · ${names.length}</h2><span class="group-total">共 ${total} 笔账单</span></div>
  <div class="book-list">${names.map((name,i)=>{let p=bookProfile(name),count=rows.filter(r=>r.book===name).length;return `<div class="book-entry ${p.hidden?'book-hidden':''}" data-bookentry="${esc(name)}"><button type="button" class="book-item book-name" data-bookname="${esc(name)}" aria-label="管理账本 ${esc(name)}"><span class="book-avatar ${p.icon?'book-avatar-custom':'book-avatar-fallback'}" aria-hidden="true">${esc(bookDisplayIcon(name))}</span><span><b>${esc(name)}</b><small>${defaultName===name?'默认 · 新记账':''}${p.hidden?(defaultName===name?' · ':'')+'已隐藏':''}${p.note?' · '+esc(p.note):''}</small></span></button><button type="button" class="book-item book-count" data-bookname="${esc(name)}"><span><b>${count} 笔</b><small>编辑　›</small></span></button></div>`}).join('')||'<div class="empty">还没有账本</div>'}</div>
 </div>
 <button class="button add-group" id="addInnerBook">＋ 新建账本</button>
 <p class="muted">隐藏只会从新记账和筛选选择器中移除，历史账单仍保留。删除有账单的账本时必须先迁移到其他账本。</p>`
}
let searchPeriod='range',searchDateMode='range',searchRangeStart='',searchRangeEnd=localDate(new Date()),searchTag='全部标签';
function searchCurrencyOptions(){let values=[...new Set(rows.filter(r=>!recordHidden(r)).map(r=>currencyCode(r.currency)))],common=POPULAR_CURRENCIES.filter(k=>values.includes(k)),others=values.filter(k=>!common.includes(k)).sort();return `<select data-filter="currencyFilter" aria-label="账单币种"><option value="全部币种" ${currencyFilter==='全部币种'?'selected':''}>全部币种</option>${[...common,...others].map(code=>{let value=code==='CNY'?'人民币':code==='USD'?'美元':code;return `<option value="${esc(value)}" ${currencyCode(currencyFilter)===code?'selected':''}>${esc(currencyLabel(code))}</option>`}).join('')}</select>`}
function searchActiveChips(){let items=[];if(book!=='全部账本')items.push(['book',book]);if(kind!=='全部类型')items.push(['kind',kind]);if(currencyFilter!=='全部币种')items.push(['currencyFilter',currencyFilter]);if(account!=='全部账户')items.push(['account',account]);if(category!=='全部分类')items.push(['category',category]);if(subcategory!=='全部小类')items.push(['subcategory',subcategory]);if(searchTag!=='全部标签')items.push(['searchTag',searchTag]);return items.map(([k,v])=>`<button type="button" class="filter-chip" data-clearfilter="${k}">${esc(v)} <b>×</b></button>`).join('')}
function searchDateControl(){let label;if(searchDateMode==='month')label=`${year}年 ${month}月`;else if(searchRangeStart&&searchRangeEnd)label=searchRangeStart===searchRangeEnd?searchRangeStart:`${searchRangeStart} — ${searchRangeEnd}`;else if(searchRangeStart)label=`${searchRangeStart} 起`;else if(searchRangeEnd)label=`截至 ${searchRangeEnd}`;else label='全部时间';return `<span class="date-banner search-date-control"><button type="button" id="openSearchDate">${esc(label)}</button></span>`}
function searchBaseRows(){let rs=rows.slice();if(searchDateMode==='month')rs=rs.filter(r=>dateOf(r).slice(0,7)===`${year}-${String(month).padStart(2,'0')}`);else if(searchRangeStart||searchRangeEnd)rs=rs.filter(r=>(!searchRangeStart||dateOf(r)>=searchRangeStart)&&(!searchRangeEnd||dateOf(r)<=searchRangeEnd));return rs}
function rankedSearchValues(field,allLabel,parentCategory=''){let rs=searchBaseRows(),m=new Map();for(let r of rs){if(parentCategory&&String(r.category||'')!==parentCategory)continue;let v=String(r[field]||'').trim();if(!v)continue;m.set(v,(m.get(v)||0)+1)}if(field==='book')return orderedBookNames(false).filter(name=>m.has(name));return [...m].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],'zh-CN')).map(x=>x[0])}
function filterOption(key,value,current,label=value){return `<button type="button" class="search-filter-option ${current===value?'active':''}" data-searchset="${key}" data-searchvalue="${esc(value)}">${esc(label)}</button>`}
function refreshSearchBehind(){let node=$('#searchResults');if(node)node.innerHTML=searchResults();let pageNode=$('.search-page');if(pageNode){let old=pageNode.querySelector('.filter-chips');let chips=searchActiveChips();if(old)old.remove();if(chips){let toolbar=pageNode.querySelector('.search-toolbar');if(toolbar)toolbar.insertAdjacentHTML('afterend',`<div class="filter-chips">${chips}</div>`)}}}
let searchFilterOrder=Array.isArray(prefs.searchFilterOrder)?prefs.searchFilterOrder.slice():['book','kind','currencyFilter','account','category','subcategory','searchTag'];
function normalizeSearchFilterOrder(){let base=['book','kind','currencyFilter','account','category','subcategory','searchTag'];searchFilterOrder=[...searchFilterOrder.filter(x=>base.includes(x)),...base.filter(x=>!searchFilterOrder.includes(x))];prefs.searchFilterOrder=searchFilterOrder.slice()}
function updateSearchFilterSheetState(changedKey){
 let sheet=$('.search-filter-sheet');if(!sheet)return;
 sheet.querySelectorAll('.search-filter-group').forEach(g=>{
   let key=g.dataset.filtergroup,current=key==='book'?book:key==='kind'?kind:key==='currencyFilter'?currencyFilter:key==='account'?account:key==='category'?category:key==='subcategory'?subcategory:key==='searchTag'?searchTag:'';
   g.querySelectorAll('[data-searchset]').forEach(b=>b.classList.toggle('active',b.dataset.searchvalue===current));
 });
 // Category changes alter the available subcategory group; rebuild only that group, never the whole modal.
 if(changedKey==='category'){
   let old=sheet.querySelector('[data-filtergroup="subcategory"]');
   if(category==='全部分类'){if(old)old.remove()}
   else{
     let vals=rankedSearchValues('subcategory','全部小类',category);
     let html=`<div class="search-filter-group" data-filtergroup="subcategory" draggable="false"><div class="search-filter-title"><span class="filter-drag-handle">≡</span>小类</div><div class="search-filter-options">${filterOption('subcategory','全部小类',subcategory,'全部小类')}${vals.map(v=>filterOption('subcategory',v,subcategory)).join('')}</div></div>`;
     if(old)old.outerHTML=html;else{let cat=sheet.querySelector('[data-filtergroup="category"]');cat?.insertAdjacentHTML('afterend',html)}
   }
 }
}
function searchFilterSheet(keepPosition=false){
 let previous=$('.search-filter-sheet'),oldTop=keepPosition&&previous?previous.scrollTop:0;
 let books=rankedSearchValues('book'),accounts=orderedAccountNameList(rankedSearchValues('account').filter(name=>!accountProfile(name).hidden)),cats=rankedSearchValues('category'),subs=category!=='全部分类'?rankedSearchValues('subcategory','全部小类',category):[];
 let currencies=[...new Set(searchBaseRows().map(r=>String(r.currency||'').trim()).filter(Boolean))],tags=[...new Set(searchBaseRows().flatMap(r=>tagParts(r.tags)))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
 let types=['支出','收入','转账','借贷','应付款','应收款'];normalizeSearchFilterOrder();
 const defs={
  book:['账本','全部账本',book,books],kind:['类型','全部类型',kind,types],currencyFilter:['币种','全部币种',currencyFilter,currencies],
  account:['账户','全部账户',account,accounts],category:['大类','全部分类',category,cats],subcategory:['小类','全部小类',subcategory,subs],searchTag:['标签','全部标签',searchTag,tags]
 };
 const group=(key)=>{if(key==='subcategory'&&category==='全部分类')return '';let [title,all,current,vals]=defs[key];return `<div class="search-filter-group" data-filtergroup="${key}" draggable="false"><div class="search-filter-title"><span class="filter-drag-handle">≡</span>${title}</div><div class="search-filter-options">${filterOption(key,all,current,all)}${vals.map(v=>filterOption(key,v,current)).join('')}</div></div>`};
 $('#overlay').innerHTML=`<div class="modalback search-modalback"><div class="modal search-filter-sheet"><div class="sectionhead"><h2>筛选</h2><div class="search-filter-head-actions"><button type="button" id="toggleFilterSearch">搜索</button><button type="button" id="closeBtn">完成</button></div></div>
 <div class="search-filter-search" hidden><input id="searchFilterQuery" type="search" placeholder="搜索筛选项" autocomplete="off"></div>
 <div id="searchFilterGroups">${searchFilterOrder.filter(k=>k!=='subcategory').map(k=>group(k)+(k==='category'?group('subcategory'):'' )).join('')}</div>
 <div class="modalfooter"><button type="button" class="button" id="clearSearchFilters">清空筛选</button><button type="button" class="button primary" id="closeBtn2">完成</button></div></div></div>`;
 if(keepPosition){let sheet=$('.search-filter-sheet');if(sheet){sheet.scrollTop=oldTop;requestAnimationFrame(()=>sheet.scrollTop=oldTop)}}
}
function searchDateSheet(){let range=searchDateMode==='range',years=[...new Set(rows.map(r=>Number(dateOf(r).slice(0,4))).filter(Boolean))].sort((a,b)=>b-a);if(!years.includes(year))years.unshift(year);$('#overlay').innerHTML=`<div class="modalback search-modalback"><div class="modal search-date-sheet"><div class="sectionhead"><h2>日期</h2><div class="date-sheet-actions"><button type="button" id="clearSearchDate">清空</button><button type="button" id="closeBtn">完成</button></div></div><div class="range-mode-tabs"><button type="button" class="button ${!range?'active':''}" data-searchdatemode="month">按年月</button><button type="button" class="button ${range?'active':''}" data-searchdatemode="range">日期范围</button></div>${range?`<div class="range-fields"><label class="range-date-field"><span class="range-label">开始</span><input id="searchRangeStart" type="date" value="${esc(searchRangeStart)}"></label><label class="range-date-field"><span class="range-label">结束</span><input id="searchRangeEnd" type="date" value="${esc(searchRangeEnd)}"></label></div>`:`<div class="month-fields"><select id="searchMonthYear">${years.map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}年</option>`).join('')}</select><select id="searchMonthMonth">${Array.from({length:12},(_,i)=>i+1).map(m=>`<option value="${m}" ${m===month?'selected':''}>${m}月</option>`).join('')}</select></div>`}</div></div>`}
function searchResults(){let rs=filtered(rows,{monthOnly:searchDateMode==='month'});if(searchDateMode==='range'&&(searchRangeStart||searchRangeEnd))rs=rs.filter(r=>(!searchRangeStart||dateOf(r)>=searchRangeStart)&&(!searchRangeEnd||dateOf(r)<=searchRangeEnd));let s=stats(rs),foreign=currencyFilter!=='全部币种'&&currencyCode(currencyFilter)!=='CNY',nativeSum=foreign?{income:rs.filter(r=>r.type==='收入').reduce((v,r)=>v+amount(r),0),expense:rs.filter(r=>r.type==='支出').reduce((v,r)=>v+amount(r),0)}:null,summaryIncome=foreign?money(nativeSum.income,currencyFilter):money(s.income),summaryExpense=foreign?money(nativeSum.expense,currencyFilter):money(s.expense);return `${day?`<div class="summary">日期：${esc(day)} <button class="button quiet" id="clearDay">清除</button></div>`:''}<div class="compact-inline-summary"><span>共 ${rs.length} · 收 ${summaryIncome} · 支 ${summaryExpense}${s.other?` · 缺汇率 ${s.other}`:''}</span></div><div class="card">${records(rs,(page+1)*80)}${rs.length>(page+1)*80?'<button class="button" id="more" style="width:100%;margin-top:12px">继续显示</button>':''}</div>`}
function searchPage(){let chips=searchActiveChips();return `<div class="search-page"><div class="filters"><input class="search" id="query" value="${esc(query)}" placeholder="搜索备注、商家、币种或金额…" aria-label="搜索账单" autocomplete="off"></div><div class="search-toolbar">${searchDateControl()}<button type="button" class="filter-plus" id="openSearchFilters" aria-label="更多筛选"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6"/></svg><span>筛选</span></button></div>${chips?`<div class="filter-chips">${chips}</div>`:''}<div id="searchResults">${searchResults()}</div></div>`}
function openFullList(origin){let shown=continuousBillRows(),limit=origin==='home'?8:30,last=shown[Math.min(limit,shown.length)-1],target=last?.id;searchPeriod='range';searchDateMode='range';searchRangeStart='';searchRangeEnd='';rc20SetPage('search');let searchShown=filtered(rows),index=target?searchShown.findIndex(r=>r.id===target):-1;page=Math.max(0,Math.floor(Math.max(0,index)/80));render();if(target)requestAnimationFrame(()=>requestAnimationFrame(()=>{let row=[...document.querySelectorAll('#searchResults .row')].find(el=>el.dataset.rowid===target);if(!row)return;row.scrollIntoView({block:'center',behavior:'auto'});row.classList.add('jump-flash')}));else $('#content')?.scrollTo(0,0)}
function toast(msg){let old=$('.toast');if(old)old.remove();let d=document.createElement('div');d.className='toast';d.textContent=msg;document.body.appendChild(d);setTimeout(()=>d.remove(),3400)}

function visualAnchorCandidates(){
  let page=$('#content');if(!page)return[];
  let pr=browserTabScrollMode()?{top:0,bottom:window.innerHeight,height:window.innerHeight}:page.getBoundingClientRect(),center=pr.top+pr.height/2;
  return [...$('#pageBody').querySelectorAll('.card')].map((el,index)=>{
    let r=el.getBoundingClientRect();
    return {el,index,top:r.top,visible:r.bottom>pr.top&&r.top<pr.bottom,distance:Math.abs(r.top-center)};
  }).filter(x=>x.visible);
}
function captureVisualAnchor(){
  let page=$('#content'),items=visualAnchorCandidates(),scrollTop=getPageScroll();if(!page||!items.length)return{scrollTop,anchor:null};
  items.sort((a,b)=>a.distance-b.distance);
  let x=items[0],all=[...$('#pageBody').querySelectorAll('.card')],key=x.el.dataset.visualAnchor||'';
  return{scrollTop,anchor:{key,index:all.indexOf(x.el),top:x.top}};
}
function restoreVisualAnchor(state){
  let page=$('#content');if(!page||!state)return;
  let a=state.anchor,target=null;
  if(a?.key)target=$('#pageBody').querySelector('.card[data-visual-anchor="'+CSS.escape(a.key)+'"]');
  if(!target&&a&&a.index>=0)target=$('#pageBody').querySelectorAll('.card')[a.index]||null;
  if(target){
    let delta=target.getBoundingClientRect().top-a.top;
    if(Number.isFinite(delta)&&Math.abs(delta)>.25)setPageScroll(getPageScroll()+delta);
  }else setPageScroll(state.scrollTop||0);
  rc27TargetScroll=getPageScroll();
}
function renderKeepingVisualAnchor(mutator){
  let state=captureVisualAnchor();
  if(typeof mutator==='function')mutator();
  rc27TargetScroll=state.scrollTop||0;
  render();
  restoreVisualAnchor(state);
  requestAnimationFrame(()=>restoreVisualAnchor(state));
}

function render(){
 let nav=Object.entries(labels).map(([k,v])=>`<button class="navbtn ${section===k?'active':''}" data-go="${k}" ${!prefs.mainName&&k!=='home'?'disabled aria-disabled="true"':''}><span class="nav-icon">${icons[k]}</span><span class="nav-label">${v}</span></button>`).join('');
 $('#nav').innerHTML=nav;
 $('#mobileNav').innerHTML=Object.entries(labels).map(([k,v])=>`<button class="${section===k?'active':''}" data-go="${k}" ${!prefs.mainName&&k!=='home'?'disabled aria-disabled="true"':''}><span class="icon">${icons[k]}</span>${v}</button>`).join('');
 let titleNode=$('#title');if(titleNode){if(section==='stats')titleNode.innerHTML=`<span class="stats-title-switch"><button type="button" data-statsmode="month" class="${statsMode==='month'?'active':''}">月度</button><button type="button" data-statsmode="year" class="${statsMode==='year'?'active':''}">年度</button></span>`;else titleNode.textContent=section==='settings'?'设置':labels[section]}
 let settingsButton=$('#settingsBtn');if(settingsButton){settingsButton.innerHTML=section==='settings'?BACK_ICON:SETTINGS_ICON;settingsButton.setAttribute('aria-label',section==='settings'?'返回上一页':'设置')}
 let ledgerSwitch=$('#ledgerSwitch');if(ledgerSwitch){ledgerSwitch.hidden=section==='settings'||workspace.names.length<2;ledgerSwitch.textContent=(prefs.mainName||'主账本')+'　⌄'}
 let statusNode=$('#status');if(statusNode)statusNode.textContent=prefs.mainName?`${prefs.mainName} · ${rows.length.toLocaleString()} 笔 · ${workspace.readWrite?'工作区已连接':workspace.mode==='snapshot'?'文件夹快照':'浏览器本地'}`:'首次使用 · 数据默认保存在本机';
 $('#addBtn').hidden=section==='settings'||!prefs.mainName;
 $('#addBtn').disabled=!!(native&&BOOT?.ledgerReady===false);
 $('#refreshBill').hidden=section==='settings'||!prefs.mainName||native;

 $('#content').classList.toggle('settings-page',section==='settings');
 $('#pageBody')?.classList.toggle('settings-page',section==='settings');
 let pageBody=$('#pageBody');if(pageBody){pageBody.dataset.page=section;pageBody.dataset.statsMode=section==='stats'?statsMode:''}

 let controls=$('#controlsFrame'),headerFrame=$('#headerFrame'),floating=$('#floatingControls'),
     hasTopFilters=!!(prefs.mainName&&(section==='home'||section==='stats')),
     filterHTML=hasTopFilters?(commonFilters(section==='home'||statsMode==='month')+activeFilterNotice()):'';

 // rc7.2.6 frame semantics:
 // frame2 = filter anchor/slot; frame3 = title/status/actions.
 // Accounts/Search/Settings hide frame2 only. Frame3 must remain visible.
 if(headerFrame)headerFrame.hidden=false;

 if(compactViewport()){
  if(controls){
   controls.innerHTML='';
   controls.hidden=false;
   controls.style.setProperty('height','62px','important');
  }
  if(floating){
   floating.hidden=!hasTopFilters;
   floating.innerHTML=hasTopFilters?filterHTML:'';
  }
 }else{
  // Desktop keeps the same order in normal flow: filters first, title/actions second.
  if(controls){controls.hidden=!hasTopFilters;controls.innerHTML=filterHTML}
  if(floating){floating.hidden=true;floating.innerHTML=''}
 }

 const prefix=(volatileDeletion?'<div class="backup-alert">当前仅显示已导出的删除结果。手机原 CSV 未改变；请保存导出的 CSV，并重新导入后再继续记账。</div>':'')
  +(prefs.mainName&&section!=='settings'&&exportStatus()?exportStatus():'');
 const renderers={home:homeV2,stats:statsPage,books:bookPage,accounts:accountPage,search:searchPage,settings:settingsPage};
 $('#pageBody').innerHTML=prefix+(section==='settings'?settingsPage():!prefs.mainName?firstUsePage():(renderers[section]?.()||''));
 [...$('#pageBody').querySelectorAll('.card')].forEach((el,i)=>{el.dataset.visualAnchor=section+':'+i});

 renderSelection();
 rc20AnimatePage();
 requestAnimationFrame(()=>{updateBackToTop();window.__rc51SyncFloating?.();if(compactViewport()){window.__rc62AfterRender?.();window.__browserPagerAfterRender?.()}});
}

function updateBackToTop(){let button=$('#backToTop'),page=$('#content');if(!button||!page)return;let browser=browserTabScrollMode(),scroll=browser?getPageScroll():page.scrollTop,height=browser?Math.max(document.body.scrollHeight,document.documentElement.scrollHeight):page.scrollHeight,viewport=browser?window.innerHeight:page.clientHeight;button.hidden=height<=viewport+300||scroll<720||!!$('.entryback,.modalback')}
window.addEventListener('scroll',updateBackToTop,{passive:true});
$('#content')?.addEventListener('scroll',updateBackToTop,{passive:true});window.addEventListener('resize',updateBackToTop);

async function readCsvFile(file){let bytes=await file.arrayBuffer();try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes)}catch(e){return new TextDecoder('gb18030').decode(bytes)}}
function inferMainName(filename){return String(filename||'账本').replace(/\.csv$/i,'').replace(/_(?:scriptable|desktop|mobile|手机主账本)$/i,'').replace(/_\d{4}-\d{2}-\d{2}_\d{6}$/,'')||'账本'}
function askMainName(suggestion){let v=prompt('账本名称',suggestion);if(v===null)return'';v=v.trim();if(!v||/[\/:*?"<>|]/.test(v)||v.length>60)throw Error('主文件名不能为空，且不能含文件名保留字符');return v}
async function createBook(){
 let name=askMainName('我的账本');if(!name)return;
 if(workspace.names.includes(name)){await switchWorkspaceLedger(name);return}
 let nextPrefs={...DEFAULT_PREFS,mainName:name,appearance:prefs.appearance,theme:prefs.theme};
 if(folderHandle){
  if(!await permission(folderHandle,'readwrite',true))throw Error('需要允许浏览器写入工作区文件夹');
  await writeDesktopDelta(name,[]);
 }
 workspace=normalizeWorkspace({...workspace,names:[...workspace.names,name],active:name,updatedAt:Date.now()});
 prefs=nextPrefs;
 await putBundle({prefs,csv:csvWrite([]),[ledgerPrefsKey(name)]:nextPrefs,[ledgerCsvKey(name)]:csvWrite([]),['relations:'+name]:{groups:[],suppressedLegacy:[],updatedAt:''},[WORKSPACE_KEY]:workspace});
 if(folderHandle)await writeSharedPrefs({...nextPrefs,mainName:name});
 rows=[];revision=digest(csvWrite([]));book='全部账本';query='';kind='全部类型';account='全部账户';category='全部分类';subcategory='全部小类';currencyFilter='全部币种';day='';page=0;
 applyTheme();render();window.dispatchEvent(new CustomEvent('star-ledger-main-changed',{detail:{name}}));toast('已新建主账本：'+name)
}
async function getFolder(){try{let d=await db(),v=await new Promise((res,rej)=>{let tx=d.transaction('state','readonly'),q=tx.objectStore('state').get('folder');q.onsuccess=()=>res(q.result);q.onerror=()=>rej(q.error)});d.close();return v||null}catch(e){return null}}
async function storeFolder(handle){let d=await db();await new Promise((res,rej)=>{let tx=d.transaction('state','readwrite');tx.objectStore('state').put(handle,'folder');tx.oncomplete=res;tx.onerror=()=>rej(tx.error)});d.close()}
async function permission(handle,mode,request=false){try{let opts={mode};if(await handle.queryPermission(opts)==='granted')return true;if(request&&await handle.requestPermission(opts)==='granted')return true}catch(e){}return false}

async function readSharedConfig(handle=folderHandle){
 if(!handle)return {settings:null,meta:SHARED_CONFIG_FILE+'|none'};
 try{
  let fh=await handle.getFileHandle(SHARED_CONFIG_FILE),f=await fh.getFile(),text=await f.text(),data=JSON.parse(text);
  if(!data||typeof data!=='object'||Array.isArray(data))throw Error('设置 JSON 不是对象');
  return {settings:data,meta:SHARED_CONFIG_FILE+'|'+f.lastModified+'|'+f.size};
 }catch(e){
  if(e.name==='NotFoundError')return {settings:null,meta:SHARED_CONFIG_FILE+'|missing'};
  throw Error('读取 '+SHARED_CONFIG_FILE+' 失败：'+e.message);
 }
}
async function writeSharedPrefs(changes){
 if(!folderHandle)return;
 if(!await permission(folderHandle,'readwrite',true))throw Error('需要允许浏览器修改 StarLedger/Data 文件夹');
 let existing=(await readSharedConfig(folderHandle)).settings||{},patch=sharedPrefSubset(changes),
     stamp=Math.max(Date.now(),Number(existing._starConfigUpdatedAt||0)+1,Number(prefs._starConfigUpdatedAt||0)+1),
     next={...existing,...patch,mainName:prefs.mainName||existing.mainName||'',_starConfigUpdatedAt:stamp};
 let fh=await folderHandle.getFileHandle(SHARED_CONFIG_FILE,{create:true}),w=await fh.createWritable();
 await w.write(JSON.stringify(next));await w.close();
 prefs={...prefs,...sharedPrefSubset(next)};
 lastDeltaMeta='';
}
async function listLedgerNames(handle){
 let found=new Set();
 try{
  for await(let [name,entry] of handle.entries()){
   if(entry.kind!=='file')continue;
   let m=name.match(/^(.*)_(?:mobile|scriptable|desktop|手机主账本)\.csv$/);
   if(m&&m[1])found.add(m[1])
  }
 }catch(e){}
 return [...found].sort((a,b)=>a.localeCompare(b,'zh-CN'))
}
async function detectFolderMainName(handle,ask=true){
 let shared=null;try{shared=(await readSharedConfig(handle)).settings}catch(e){}
 let names=await listLedgerNames(handle),configuredName=String(shared?.mainName||'').trim();
 if(configuredName&&names.includes(configuredName))return configuredName;
 if(prefs.mainName&&names.includes(prefs.mainName))return prefs.mainName;
 if(names.length===1)return names[0];
 if(!names.length)return configuredName||prefs.mainName||'';
 if(!ask)return '';
 let menu=names.map((n,i)=>(i+1)+'. '+n).join('\n'),answer=prompt('检测到多个账本，请输入序号：\n'+menu,'1');
 if(answer===null)return'';
 let i=Number(answer)-1;if(!Number.isInteger(i)||i<0||i>=names.length)throw Error('账本序号无效');
 return names[i]
}
async function connectFolder(){
 if(!window.showDirectoryPicker){toast('此浏览器不支持直接连接文件夹；建议使用 Windows 上的 Chrome / Edge');return}
 let handle;try{handle=await showDirectoryPicker({mode:'readwrite'})}catch(e){if(e.name==='AbortError')return;throw e}
 stopFileObserver();folderHandle=handle;lastDeltaMeta='';
 try{await storeFolder(handle)}catch(e){}
 let detected=await detectFolderMainName(handle,true);
 if(!detected){toast('这个文件夹里没有检测到账本数据');render();return}
 prefs={...prefs,mainName:detected};
 let shared=await readSharedConfig(handle);
 if(shared.settings)applySharedPrefs(shared.settings);
 prefs.mainName=detected;
 await put('prefs',prefs);
 await refreshDelta(false);
 startAutoRefresh();
 toast('已连接「'+handle.name+'」；账单与 '+SHARED_CONFIG_FILE+' 已同步')
}
let pendingDelta=null;
function isDeletion(r){try{return JSON.parse(r.extras||'{}')._starDeleted===true}catch(e){return false}}
function fingerprint(r){return [String(r.date||'').replace('T',' ').replace(/\//g,'-').slice(0,19),r.type,Number(r.amount).toFixed(2),r.account,r.account2].join('|')}
// rc7: the browser watches all three canonical sources. Metadata checks
// catch missed notifications and are paused whenever this page is not visible.
let lastDeltaMeta='',checkingDelta=false,refreshTimer=null,observer=null,refreshDebounce=null,nativeChecking=false;
function visible(){return document.visibilityState!=='hidden'}
function stopFileObserver(){if(observer){observer.disconnect();observer=null}}
function stopAutoRefresh(){if(refreshTimer){clearInterval(refreshTimer);refreshTimer=null}if(refreshDebounce){clearTimeout(refreshDebounce);refreshDebounce=null}stopFileObserver()}
function scheduleAutoCheck(delay=350){if(!visible()||!prefs.mainName)return;if(refreshDebounce)clearTimeout(refreshDebounce);refreshDebounce=setTimeout(()=>{refreshDebounce=null;autoCheck().catch(()=>{})},delay)}
async function autoCheck(){if(!visible()||!prefs.mainName)return;if(native){await refreshNative();return}if(folderHandle)await refreshDelta(true)}
async function refreshNative(){
 if(nativeChecking||!visible())return;
 nativeChecking=true;
 try{
  let r=await nativeCommand('refresh'),changed=false;
  if(r.settings&&typeof r.settings==='object'){
   let before=Number(prefs._starConfigUpdatedAt||0),after=Number(r.settings._starConfigUpdatedAt||0);
   if(after!==before){prefs={...prefs,...r.settings};applyTheme();changed=true}
  }
  if(r.csv!==undefined&&digest(r.csv)!==revision){takeCsv(r.csv);changed=false}
  else if(changed)render();
 }catch(e){}finally{nativeChecking=false}
}
async function watchFolder(){
 if(native||!folderHandle||!visible()||observer||!('FileSystemObserver' in window))return;
 if(!await permission(folderHandle,'read'))return;
 try{
  let names=new Set([...Object.values(folderNames()),SHARED_CONFIG_FILE]);
  let w=new FileSystemObserver(records=>{
   if(records.some(r=>r.type==='unknown'||r.type==='errored'||names.has(r.changedHandle?.name)||r.relativePathComponents?.some(x=>names.has(x))))scheduleAutoCheck()
  });
  await w.observe(folderHandle);if(visible()&&folderHandle)observer=w;else w.disconnect()
 }catch(e){stopFileObserver()}
}
function startAutoRefresh(){stopAutoRefresh();if(!visible()||(!native&&!folderHandle))return;refreshTimer=setInterval(()=>{autoCheck().catch(()=>{})},60000);watchFolder().catch(()=>{})}
document.addEventListener('visibilitychange',()=>{if(visible()){startAutoRefresh();scheduleAutoCheck(0)}else stopAutoRefresh()});
window.addEventListener('pageshow',()=>{if(visible())scheduleAutoCheck(0)});
window.addEventListener('focus',()=>{if(visible())scheduleAutoCheck(200)});
async function refreshDelta(auto=false){
 if(checkingDelta||auto&&!visible())return;
 if(!folderHandle){if(!auto)await connectFolder();return}
 if(!await permission(folderHandle,'read',!auto)){if(!auto)throw Error('请重新允许读取StarLedger/Data 文件夹');return}
 if(auto&&$('#overlay').children.length)return;
 if(!prefs.mainName){
  let detected=await detectFolderMainName(folderHandle,!auto);if(!detected)return;
  prefs={...prefs,mainName:detected}
 }
 checkingDelta=true;
 try{
  let [sources,shared]=await Promise.all([readFolderSources(prefs.mainName),readSharedConfig(folderHandle)]);
  let meta=sources.meta+'||'+shared.meta;
  if(auto&&meta===lastDeltaMeta)return;
  if(shared.settings){
   let detectedMain=String(shared.settings.mainName||'').trim();
   applySharedPrefs(shared.settings);
   if(detectedMain)prefs.mainName=detectedMain;
  }
  let combined=mergeSourceRows(sources.base,sources.mobile,sources.desktop),csv=csvWrite(combined);
  lastDeltaMeta=meta;
  applyTheme();
  await putBundle({csv,prefs});
  if(digest(csv)!==revision)takeCsv(csv);else render();
  if(!auto)toast('已同步：基础 '+sources.base.length+' · 手机 '+sources.mobile.length+' · 电脑 '+sources.desktop.length+' · 设置 JSON')
 }catch(e){
  if(!auto)throw Error('读取StarLedger/Data 文件夹失败：'+e.message)
 }finally{checkingDelta=false}
}

/* Web v0.4 workspace folder engine.
 * Only the fixed StarLedger file names are read:
 *   <ledger>_mobile.csv / <ledger>_手机主账本.csv
 *   <ledger>_scriptable.csv
 *   <ledger>_desktop.csv
 *   StarLedgerConfig.json
 *   StarLedgerRelations.json
 * Everything else in the chosen folder is ignored.
 */
const WORKSPACE_RELATIONS_FILE='StarLedgerRelations.json';
const WORKSPACE_LEDGER_RE=/^(.*)_(mobile|scriptable|desktop|手机主账本)\.csv$/;

function workspaceLedgerFile(name){
 let m=String(name||'').match(WORKSPACE_LEDGER_RE);
 return m&&m[1]?{ledger:m[1],kind:m[2]}:null
}
function configForLedgerStore(store,name){
 if(!store||typeof store!=='object'||Array.isArray(store))return null;
 let nested=store.ledgers&&typeof store.ledgers==='object'&&!Array.isArray(store.ledgers)?store.ledgers[name]:null;
 if(nested&&typeof nested==='object'&&!Array.isArray(nested))return {...sharedPrefSubset(nested),mainName:name};
 if(String(store.mainName||'')===name)return {...sharedPrefSubset(store),mainName:name};
 return null
}
async function parseWorkspaceFiles(files){
 let byName=new Map(),warnings=[];
 for(let file of [...files]){
  let name=String(file?.name||'');
  if(name===SHARED_CONFIG_FILE||name===WORKSPACE_RELATIONS_FILE||workspaceLedgerFile(name)){
   let prev=byName.get(name),path=String(file.webkitRelativePath||file.name||'');
   if(!prev||path.split('/').length<String(prev.webkitRelativePath||prev.name||'').split('/').length)byName.set(name,file)
  }
 }
 let config=null,relationsStore=null,configFile=byName.get(SHARED_CONFIG_FILE),relationsFile=byName.get(WORKSPACE_RELATIONS_FILE);
 if(configFile){try{config=JSON.parse(await configFile.text())}catch(e){warnings.push(SHARED_CONFIG_FILE+' 格式无效')}}
 if(relationsFile){try{let v=JSON.parse(await relationsFile.text());if(v&&typeof v==='object'&&v.version===1&&v.ledgers&&typeof v.ledgers==='object')relationsStore=v;else warnings.push(WORKSPACE_RELATIONS_FILE+' 格式无效')}catch(e){warnings.push(WORKSPACE_RELATIONS_FILE+' 格式无效')}}
 let parts=new Map(),meta=[];
 for(let [name,file] of byName){
  let info=workspaceLedgerFile(name);if(!info)continue;
  let bucket=parts.get(info.ledger)||{base:[],mobile:[],desktop:[]};
  try{
   let parsed=csvParse(await readCsvFile(file));
   if(info.kind==='mobile'||info.kind==='手机主账本')bucket.base=parsed;
   else if(info.kind==='scriptable')bucket.mobile=parsed;
   else if(info.kind==='desktop')bucket.desktop=parsed;
   parts.set(info.ledger,bucket);
   meta.push(name+'|'+Number(file.lastModified||0)+'|'+Number(file.size||0))
  }catch(e){warnings.push(name+' 不是有效 StarLedger CSV')}
 }
 let ledgers=[];
 for(let [name,source] of [...parts.entries()].sort((a,b)=>a[0].localeCompare(b[0],'zh-CN'))){
  let merged=mergeSourceRows(source.base,source.mobile,source.desktop);
  let settings=configForLedgerStore(config,name);
  ledgers.push({name,csv:csvWrite(merged),settings,relations:relationsStore?.ledgers?.[name]||null,counts:{base:source.base.length,mobile:source.mobile.length,desktop:source.desktop.length,total:merged.length}})
 }
 let names=ledgers.map(x=>x.name),active='';
 for(let candidate of [config?.activeLedger,config?.mainName,workspace.active,prefs.mainName])if(candidate&&names.includes(String(candidate))){active=String(candidate);break}
 if(!active)active=names[0]||'';
 if(configFile)meta.push(SHARED_CONFIG_FILE+'|'+Number(configFile.lastModified||0)+'|'+Number(configFile.size||0));
 if(relationsFile)meta.push(WORKSPACE_RELATIONS_FILE+'|'+Number(relationsFile.lastModified||0)+'|'+Number(relationsFile.size||0));
 return {ledgers,names,active,warnings,meta:meta.sort().join('||'),configPresent:!!configFile,relationsPresent:!!relationsFile}
}
async function workspaceSnapshotFromDirectory(handle){
 let files=[];
 for await(let [name,entry] of handle.entries()){
  if(entry.kind!=='file')continue;
  if(name===SHARED_CONFIG_FILE||name===WORKSPACE_RELATIONS_FILE||workspaceLedgerFile(name)){
   try{files.push(await entry.getFile())}catch(e){}
  }
 }
 return parseWorkspaceFiles(files)
}
async function applyWorkspaceSnapshot(snapshot,{folderName='',mode='snapshot',readWrite=false,preferredActive='',askIfMultiple=false}={}){
 if(!snapshot?.names?.length)throw Error('这个文件夹没有找到 StarLedger 账本文件');
 let names=snapshot.names,active=names.includes(preferredActive)?preferredActive:names.includes(snapshot.active)?snapshot.active:names[0],entries={};
 for(let ledger of snapshot.ledgers){
  let localPrefs=await get(ledgerPrefsKey(ledger.name));
  let nextPrefs={...DEFAULT_PREFS,...(localPrefs||{}),...(ledger.settings||{}),mainName:ledger.name};
  entries[ledgerCsvKey(ledger.name)]=ledger.csv;
  entries[ledgerPrefsKey(ledger.name)]=nextPrefs;
  if(snapshot.relationsPresent)entries['relations:'+ledger.name]=ledger.relations||{groups:[],suppressedLegacy:[],updatedAt:''}
 }
 workspace=normalizeWorkspace({names,active,folderName,mode,readWrite,updatedAt:Date.now()});
 let activeLedger=snapshot.ledgers.find(x=>x.name===active),activePrefs=entries[ledgerPrefsKey(active)],activeCsv=activeLedger?.csv||csvWrite([]);
 entries[WORKSPACE_KEY]=workspace;entries.prefs=activePrefs;entries.csv=activeCsv;
 await putBundle(entries);
 prefs=activePrefs;applyTheme();takeCsv(activeCsv);
 window.dispatchEvent(new CustomEvent('star-ledger-main-changed',{detail:{name:active}}));
 if(snapshot.warnings?.length)toast('已读取工作区；'+snapshot.warnings.join('；'));
 else toast('已读取 '+names.length+' 个主账本');
 if(askIfMultiple&&names.length>1)setTimeout(workspacePicker,0)
}
async function importWorkspaceFileList(fileList){
 let files=[...fileList],root=String(files[0]?.webkitRelativePath||'').split('/')[0]||'已选择文件夹';
 let snapshot=await parseWorkspaceFiles(files);
 folderHandle=null;
 await applyWorkspaceSnapshot(snapshot,{folderName:root,mode:'snapshot',readWrite:false,askIfMultiple:true})
}
async function connectFolder(){
 if(window.showDirectoryPicker){
  let handle;try{handle=await showDirectoryPicker({mode:'readwrite'})}catch(e){if(e.name==='AbortError')return;throw e}
  let snapshot=await workspaceSnapshotFromDirectory(handle);
  if(!snapshot.names.length)throw Error('请选择 StarLedger/Data 文件夹；未发现固定格式的账本文件');
  stopFileObserver();folderHandle=handle;lastDeltaMeta=snapshot.meta;
  try{await storeFolder(handle)}catch(e){}
  let rw=await permission(handle,'readwrite',true);
  await applyWorkspaceSnapshot(snapshot,{folderName:handle.name,mode:'linked',readWrite:rw,askIfMultiple:true});
  startAutoRefresh();
  return
 }
 let input=$('#folderFile');if(input)input.click()
}
async function writeSharedPrefs(changes){
 if(!folderHandle)return;
 if(!await permission(folderHandle,'readwrite',true))throw Error('需要允许浏览器修改 StarLedger/Data 文件夹');
 let existing=(await readSharedConfig(folderHandle)).settings||{},name=String(prefs.mainName||'').trim();
 if(!name)throw Error('当前主账本为空');
 let previous=configForLedgerStore(existing,name)||{},patch=sharedPrefSubset({...prefs,...changes,mainName:name}),
     stamp=Math.max(Date.now(),Number(existing._starConfigUpdatedAt||0)+1,Number(previous._starConfigUpdatedAt||0)+1,Number(prefs._starConfigUpdatedAt||0)+1),
     ledgerSettings={...previous,...patch,mainName:name,_starConfigUpdatedAt:stamp},
     ledgers={...(existing.ledgers&&typeof existing.ledgers==='object'?existing.ledgers:{}),[name]:ledgerSettings},
     next={...existing,...ledgerSettings,format:'star-ledger-config',version:2,mainName:name,activeLedger:name,ledgers,_starConfigUpdatedAt:stamp};
 let fh=await folderHandle.getFileHandle(SHARED_CONFIG_FILE,{create:true}),w=await fh.createWritable();
 await w.write(JSON.stringify(next));await w.close();
 prefs={...prefs,...sharedPrefSubset(ledgerSettings),mainName:name};
 await putBundle({prefs});
 lastDeltaMeta=''
}
async function refreshDelta(auto=false){
 if(checkingDelta||auto&&!visible())return;
 if(!folderHandle){if(!auto)await connectFolder();return}
 if(!await permission(folderHandle,'read',!auto)){if(!auto)throw Error('请重新允许读取 StarLedger/Data 文件夹');return}
 if(auto&&$('#overlay').children.length)return;
 checkingDelta=true;
 try{
  let snapshot=await workspaceSnapshotFromDirectory(folderHandle);
  if(auto&&snapshot.meta===lastDeltaMeta)return;
  lastDeltaMeta=snapshot.meta;
  let preferred=workspace.names.includes(prefs.mainName)?prefs.mainName:'';
  await applyWorkspaceSnapshot(snapshot,{folderName:folderHandle.name,mode:'linked',readWrite:await permission(folderHandle,'readwrite'),preferredActive:preferred,askIfMultiple:false});
  if(!auto)toast('工作区已刷新：'+snapshot.names.length+' 个主账本')
 }catch(e){
  if(!auto)throw Error('读取 StarLedger/Data 文件夹失败：'+e.message)
 }finally{checkingDelta=false}
}
async function watchFolder(){
 if(native||!folderHandle||!visible()||observer||!('FileSystemObserver' in window))return;
 if(!await permission(folderHandle,'read'))return;
 try{
  let w=new FileSystemObserver(records=>{
   let hit=records.some(r=>{
    let names=[r.changedHandle?.name,...(r.relativePathComponents||[])].filter(Boolean);
    return r.type==='unknown'||r.type==='errored'||names.some(name=>name===SHARED_CONFIG_FILE||name===WORKSPACE_RELATIONS_FILE||workspaceLedgerFile(name))
   });
   if(hit)scheduleAutoCheck()
  });
  await w.observe(folderHandle);if(visible()&&folderHandle)observer=w;else w.disconnect()
 }catch(e){stopFileObserver()}
}

async function reviewDelta(csv,auto){let incoming=csvParse(csv),existing=new Map(rows.filter(r=>r.id).map(r=>[r.id,r])),fingerprints=new Set(rows.map(fingerprint)),seen=new Set(),candidates=[];for(let [i,source] of incoming.entries()){let r={...source};if(!r.id)r.id='DEL-'+digest(JSON.stringify(r))+'-'+i;if(seen.has(r.id))continue;seen.add(r.id);let previous=existing.get(r.id),conflict=!!previous;if(isDeletion(r)&&!previous)continue;if(previous&&JSON.stringify(previous)===JSON.stringify(r))continue;let duplicate=conflict||isDeletion(r)||fingerprints.has(fingerprint(r));if(!duplicate)fingerprints.add(fingerprint(r));candidates.push({r,duplicate,conflict})}if(!candidates.length){if(!auto)toast('已是最新的了');return}let safe=candidates.filter(x=>!x.duplicate);if(safe.length>0&&safe.length<=5&&!candidates.some(x=>x.duplicate)){await mergeRecords(safe.map(x=>x.r));return}pendingDelta=candidates;$('#overlay').innerHTML=`<div class="modalback"><div class="modal"><h2>核对待汇入账单</h2><p class="muted">主账本：${esc(prefs.mainName)} · 新增 ${safe.length} 笔 · 需核对 ${candidates.length-safe.length} 笔。修改、删除及疑似重复均需手动核对。时间精确到秒、收支类型、金额和账户一致的项已高亮且默认不选中。</p><form id="mergeReview"><div class="merge-list">${candidates.map(({r,duplicate,conflict})=>`<label class="merge-item ${duplicate?'suspect':''}"><input type="checkbox" name="merge" value="${esc(r.id)}" ${duplicate?'':'checked'}><span><b>${isDeletion(r)?'删除 · ':''}${esc(r.merchant||r.note||r.subcategory||r.type)} · ${money(amount(r),r.currency)}</b><small>${esc(r.date)} · ${esc(r.account)} ${isDeletion(r)?'· 删除待确认':conflict?'· 同一笔已变动':duplicate?'· 疑似重复':''}</small></span></label>`).join('')}</div><div class="modalfooter"><button type="button" class="button" id="closeBtn">稍后</button><button class="button primary" type="submit">汇入所选</button></div></form></div></div>`}
async function mergeRecords(rs){if(!rs.length){toast('没有选中账单');return}let selected=new Map(rs.map(r=>[r.id,r])),merged=[...rs.filter(r=>!isDeletion(r)),...rows.filter(r=>!selected.has(r.id))];await localWrite('replaceLedger',null,null,{csv:csvWrite(merged),filename:prefs.lastExportName,mainName:prefs.mainName,allowEmpty:true});toast('已汇入 '+rs.length+' 笔，记得导出完整 ZIP')}
async function mergeSelected(ids){let selected=new Set(ids),records=(pendingDelta||[]).filter(x=>selected.has(x.r.id)).map(x=>x.r);pendingDelta=null;await mergeRecords(records)}

function form(record){entryForm(record)}
let ocrOpenGeneration=0;
function closeSearchOverlay(){
 let overlay=$('#overlay'),back=overlay?.querySelector(':scope > .search-modalback');if(!back)return false;
 overlay.innerHTML='';overlay.classList.remove('safari-document-modal');
 for(let name of ['--sl-modal-left','--sl-modal-top','--sl-modal-width','--sl-modal-height'])overlay.style.removeProperty(name);
 document.body.classList.remove('dialog-open');return true
}
function close(){
 if(closeAppTertiary())return;
 if(closeSearchOverlay())return;
 let overlay=$('#overlay'),back=overlay?.querySelector('.entryback,.modalback'),generation=ocrOpenGeneration;
 if(!back){if(overlay)overlay.innerHTML='';document.body.classList.remove('dialog-open');ocrReviewText='';return}
 if(back.classList.contains('rc21-closing'))return;
 back.classList.add('rc21-closing');
 setTimeout(()=>{
   // A new OCR task may have opened during this closing animation. Never let
   // the stale timer erase the new entry UI.
   if(generation!==ocrOpenGeneration)return;
   if(overlay&&overlay.contains(back))overlay.innerHTML='';
   document.body.classList.remove('dialog-open');ocrReviewText=''
 },300)
}
function validate(r){if(!r.book||r.book==='全部账本'||r.book==='__new_book__'||!r.date||!r.type||!r.subcategory||!r.account||!Number.isFinite(Number(r.amount))||Number(r.amount)<=0)throw Error('请填写日期、金额、账本、小类和账户');if(['转账','借贷'].includes(r.type)&&!r.account2)throw Error('转账和借贷必须填写账户 2');if(['支出','应付款'].includes(r.type)&&!r.category)throw Error('支出必须填写大类')}
function send(action,record,id,extra={}){return sendV2(action,record,id,extra)}
window.__ledgerReply=function(result){let p=pending.get(result.key);if(!p)return;pending.delete(result.key);if(result.ok){if(result.options&&BOOT)BOOT.options=result.options;p.resolve(result);}else p.reject(Error(result.error||'保存失败'))};
window.__ledgerQueue=[];window.addEventListener('ledger-command',e=>{if(window.__ledgerWait){let done=window.__ledgerWait;window.__ledgerWait=null;done(e.detail)}else window.__ledgerQueue.push(e.detail)});
function renderSelection(){document.body.classList.toggle('selecting',selection.size>0);$('#selectionBar').innerHTML=selection.size?`<strong>已选 ${selection.size} 笔</strong><button class="button" id="cancelSelection">取消</button><button class="button danger selection-delete" id="deleteSelection">删除 ${selection.size} 笔</button>`:'';document.querySelectorAll('.rowcheck').forEach(input=>{input.checked=selection.has(input.dataset.check);input.closest('.row').classList.toggle('selected',input.checked)})}
function toggleSelection(id){if(selection.has(id))selection.delete(id);else selection.add(id);renderSelection()}
let pendingDeleteIds=null,deleteInProgress=false,volatileDeletion=false;
function deleteDialog(){return $('#entry')?$('#accountOverlay'):$('#overlay')}
function askDelete(ids){if(!ids.length)return;pendingDeleteIds=[...ids];deleteDialog().innerHTML=`<div class="modalback delete-confirm-back"><div class="modal" role="dialog" aria-modal="true" aria-label="确认删除账单"><h2>删除 ${ids.length} 笔账单？</h2><p>确认后会更新手机账本。</p><div class="modalfooter"><button type="button" class="button" id="cancelDelete">取消</button><button type="button" class="button danger destructive" id="confirmDelete">确认删除</button></div></div></div>`}
async function performDelete(){
 if(deleteInProgress||!pendingDeleteIds)return;
 deleteInProgress=true;
 let ids=[...pendingDeleteIds];
 try{await send('bulkRemove',null,null,{ids})}
 catch(err){deleteDialog().innerHTML=`<div class="modalback delete-confirm-back"><div class="modal"><h2>未能写入手机账本</h2><p class="muted">${esc(err.message)}。可以重试，或导出删掉这 ${ids.length} 笔后的完整 CSV，自行保存为备份。原文件暂不改变。</p><div class="modalfooter"><button type="button" class="button" id="cancelDelete">取消</button><button type="button" class="button" id="retryDelete">重试</button><button type="button" class="button danger destructive" id="exportAfterDelete">导出删除后的 CSV</button></div></div></div>` ;return}
 finally{deleteInProgress=false}
 pendingDeleteIds=null;selection.clear();renderSelection()
}

async function exportAfterDelete(){if(!pendingDeleteIds)return;let ids=new Set(pendingDeleteIds),snapshot=csvWrite(rows.filter(r=>!ids.has(r.id)));if(native){await nativeCommand('exportSnapshot',null,null,{csv:snapshot})}else{let blob=new Blob([snapshot],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=(prefs.mainName||'账本')+'_删除后备份.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000)}takeCsv(snapshot);volatileDeletion=true;render();selection.clear();renderSelection();pendingDeleteIds=null;close();toast('已导出删除后的 CSV；原账本未改变')}
function deleteSelection(){askDelete([...selection])}
function cancelLongPress(){if(longPressTimer){clearTimeout(longPressTimer);longPressTimer=null}longPressStart=null}
document.addEventListener('pointerdown',e=>{let button=e.target.closest('button[data-id]');if(!button||e.button!==0)return;longPressStart={x:e.clientX,y:e.clientY};longPressTimer=setTimeout(()=>{longPressTimer=null;longPressStart=null;suppressRecordClick=true;toggleSelection(button.dataset.id);setTimeout(()=>{suppressRecordClick=false},700)},550)});
document.addEventListener('pointermove',e=>{if(longPressStart&&Math.hypot(e.clientX-longPressStart.x,e.clientY-longPressStart.y)>12)cancelLongPress()});
document.addEventListener('pointerup',cancelLongPress);document.addEventListener('pointercancel',cancelLongPress);
document.addEventListener('contextmenu',e=>{let button=e.target.closest('button[data-id]');if(button){e.preventDefault();cancelLongPress();if(!suppressRecordClick)toggleSelection(button.dataset.id)}});
let accountDrag=null,accountHold=null,accountPending=null,suppressAccountClickUntil=0;
function clearAccountHold(){if(accountHold){clearTimeout(accountHold);accountHold=null}accountPending=null}
function clearAccountDropMarks(){document.querySelectorAll('.account-entry[data-accountentry]').forEach(x=>x.classList.remove('account-drop-before','account-drop-after'))}
function beginAccountDrag(start){if(!start)return;accountHold=null;accountPending=null;accountDrag=start;start.item.classList.add('account-dragging')}
function moveAccountDrag(clientX,clientY){if(!accountDrag)return;let hit=document.elementFromPoint(clientX,clientY)?.closest('.account-entry[data-accountentry]');clearAccountDropMarks();if(!hit||hit===accountDrag.item||hit.dataset.accountgroup!==accountDrag.groupId)return;let rect=hit.getBoundingClientRect(),before=clientY<rect.top+rect.height/2;hit.classList.add(before?'account-drop-before':'account-drop-after');hit.parentNode.insertBefore(accountDrag.item,before?hit:hit.nextSibling)}
function finishAccountDrag(save=true){clearAccountHold();if(!accountDrag)return;let {item,groupId}=accountDrag,scrollY=window.scrollY;item?.classList.remove('account-dragging');clearAccountDropMarks();accountDrag=null;suppressAccountClickUntil=Date.now()+650;if(save){let group=item?.closest('.account-group'),order=group?[...group.querySelectorAll('.account-entry[data-accountentry]')].map(x=>x.dataset.accountentry):[];if(order.length){let next={...(prefs.accountOrder||{}),[groupId]:order};savePrefs({accountOrder:next}).then(()=>requestAnimationFrame(()=>window.scrollTo(0,scrollY))).catch(err=>toast(err.message))}}}
function touchById(list,id){for(let i=0;i<list.length;i++)if(list[i].identifier===id)return list[i];return null}
// 触屏：长按成立前完全保留原生纵向滚动；长按成立后由 JS 接管本次手势，阻止页面跟着滑。
document.addEventListener('touchstart',e=>{if(e.touches.length!==1||selection.size)return;let item=e.target.closest('.account-entry[data-accountentry]');if(!item)return;clearAccountHold();let t=e.changedTouches[0];accountPending={x:t.clientX,y:t.clientY,item,groupId:item.dataset.accountgroup,touchId:t.identifier,input:'touch'};accountHold=setTimeout(()=>{let start=accountPending;if(!start||start.input!=='touch')return;beginAccountDrag(start)},420)},{passive:true});
document.addEventListener('touchmove',e=>{if(accountPending?.input==='touch'){let t=touchById(e.touches,accountPending.touchId);if(t&&Math.hypot(t.clientX-accountPending.x,t.clientY-accountPending.y)>10){clearAccountHold();return}}if(accountDrag?.input!=='touch')return;let t=touchById(e.touches,accountDrag.touchId);if(!t)return;if(e.cancelable)e.preventDefault();e.stopPropagation();moveAccountDrag(t.clientX,t.clientY)},{passive:false,capture:true});
document.addEventListener('touchend',e=>{if(accountDrag?.input==='touch'&&touchById(e.changedTouches,accountDrag.touchId)){finishAccountDrag(true);return}if(accountPending?.input==='touch'&&touchById(e.changedTouches,accountPending.touchId))clearAccountHold()},{passive:true});
document.addEventListener('touchcancel',e=>{if(accountDrag?.input==='touch'&&touchById(e.changedTouches,accountDrag.touchId)){finishAccountDrag(false);return}if(accountPending?.input==='touch')clearAccountHold()},{passive:true});
// 鼠标 / 触控板仍使用 Pointer Events；触屏交给上面的 touch 逻辑，避免 iOS 同时触发页面滚动。
document.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;let item=e.target.closest('.account-entry[data-accountentry]');if(!item||e.button!==0||selection.size)return;clearAccountHold();accountPending={x:e.clientX,y:e.clientY,item,groupId:item.dataset.accountgroup,pointerId:e.pointerId,input:'pointer'};accountHold=setTimeout(()=>{let start=accountPending;if(!start||start.input!=='pointer')return;beginAccountDrag(start);try{start.item.setPointerCapture(start.pointerId)}catch(err){}},420)});
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;if(accountPending?.input==='pointer'&&Math.hypot(e.clientX-accountPending.x,e.clientY-accountPending.y)>10){clearAccountHold();return}if(accountDrag?.input!=='pointer')return;e.preventDefault();moveAccountDrag(e.clientX,e.clientY)},{passive:false});
document.addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;if(accountDrag?.input==='pointer')finishAccountDrag(true);else if(accountPending?.input==='pointer')clearAccountHold()});
document.addEventListener('pointercancel',e=>{if(e.pointerType==='touch')return;if(accountDrag?.input==='pointer')finishAccountDrag(false);else if(accountPending?.input==='pointer')clearAccountHold()});
document.addEventListener('contextmenu',e=>{if(e.target.closest('.account-entry[data-accountentry]')){e.preventDefault();if(!accountDrag)clearAccountHold()}});

function rc21CloseAccountOverlay(){
 let owner=$('#accountOverlay'),back=owner?.querySelector('.modalback,.entryback');
 if(!back){if(owner)owner.innerHTML='';return}
 if(back.classList.contains('rc21-closing'))return;
 back.classList.add('rc21-closing');
 setTimeout(()=>{if(owner&&owner.contains(back))owner.innerHTML=''},300)
}
document.addEventListener('click',e=>{if(Date.now()<suppressAccountClickUntil&&e.target.closest('.account-entry[data-accountentry]')){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('click',e=>{if(!rc27Animating)return;let b=e.target.closest('#mobileNav [data-go]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();rc27QueuedPage=b.dataset.go||''},true);
document.addEventListener('click',e=>{if(e.target.closest?.('.entry-date-action')&&!compactViewport()){e.preventDefault();openEntryDatePicker();return}if(e.target.closest?.('.entry-amount-value')){if(compactViewport()){e.preventDefault();$('#amountInput')?.blur();$('.entryback')?.classList.remove('keypad-hidden','editing-text')}else $('#amountInput')?.focus();return}if(e.target.classList?.contains('delete-confirm-back')){pendingDeleteIds=null;let dialog=deleteDialog();if(dialog.id==='accountOverlay')rc21CloseAccountOverlay();else close();return}if(e.target.classList?.contains('entryback')){close();return}let textField=e.target.closest('.entry-amount-value')?.querySelector('#amountInput')||e.target.closest('.entry-compact-field')?.querySelector('input[name=merchant]')||(!e.target.closest('.entry-date-action')?e.target.closest('.entry-note-card')?.querySelector('textarea[name=note]'):null);if(textField&&document.activeElement!==textField)textField.focus();if(e.target.classList?.contains('account-dialog-back')){close();return}if(e.target.classList?.contains('entry-choice-back')){rc21CloseAccountOverlay();return}let t=e.target.closest('button,[data-go],[data-cat],[data-month],[data-day],[data-reconcile]');if(!t)return;
 if(t.id==='entryCatButton'||t.id==='entrySubButton')openCategorySheet()
 else if(t.id==='entryCurrencyButton')openCurrencySheet()
 else if(t.id==='closeEntrySheet'){rc21CloseAccountOverlay()}
 else if(t.dataset.sheetcat){$('#categorySheet').dataset.category=t.dataset.sheetcat;renderCategoryChoices()}
 else if(t.dataset.sheetsub){let f=$('#entry');f.elements.category.value=['支出','收入'].includes(f.elements.type.value)?$('#categorySheet').dataset.category:'';f.elements.subcategory.value=t.dataset.sheetsub;updateEntryChips();rc21CloseAccountOverlay()}
 else if(t.id==='newEntryCategory'){t.outerHTML='<div class="entry-new-sub"><input id="newCategoryName" maxlength="40" placeholder="新大类名称"><button type="button" id="confirmNewCategory">添加</button></div>';$('#newCategoryName').focus()}
 else if(t.id==='confirmNewCategory'){let v=$('#newCategoryName')?.value.trim();if(!v){toast('请输入大类名称');return}let f=$('#entry');f.elements.category.value=v;f.elements.subcategory.value='';updateEntryChips();$('#categorySheet').dataset.category=v;$('#categorySheetSearch').value='';renderCategoryChoices()}
 else if(t.id==='newEntrySub'){t.outerHTML='<div class="entry-new-sub"><input id="newSubName" maxlength="40" placeholder="新小类名称"><button type="button" id="confirmNewSub">添加</button></div>';$('#newSubName').focus()}
 else if(t.id==='confirmNewSub'){let v=$('#newSubName')?.value.trim();if(!v){toast('请输入小类名称');return}let f=$('#entry');f.elements.category.value=['支出','收入'].includes(f.elements.type.value)?$('#categorySheet').dataset.category:'';f.elements.subcategory.value=v;updateEntryChips();rc21CloseAccountOverlay()}
 else if(t.id==='lookupFxRateSheet')lookupFxRate(true).then(syncCurrencySheet).catch(err=>{let node=$('#sheetFxPreview');if(node)node.textContent='获取失败：'+err.message+'；可手动填写'})
 else if(t.id==='backToTop'){t.hidden=true;scrollPageTo(0,'smooth')}
 else if(t.id==='selectAllVisible'){document.querySelectorAll('#searchResults .rowcheck').forEach(input=>selection.add(input.dataset.check));renderSelection()}
 else if(t.id==='cancelSelection'){selection.clear();renderSelection()}
 else if(t.id==='openSearchDate')searchDateSheet()
 else if(t.id==='openSearchFilters')searchFilterSheet()
 else if(t.id==='toggleFilterSearch'){let box=$('.search-filter-search');if(box){box.hidden=!box.hidden;if(!box.hidden)$('#searchFilterQuery')?.focus()}}
 else if(t.id==='closeBtn2')close()
 else if(t.dataset.searchdatemode){searchDateMode=t.dataset.searchdatemode;searchPeriod=searchDateMode;day='';page=0;render();searchDateSheet()}
 else if(t.dataset.searchset){let k=t.dataset.searchset,v=t.dataset.searchvalue;if(k==='book')book=v;else if(k==='kind')kind=v;else if(k==='currencyFilter')currencyFilter=v;else if(k==='account')account=v;else if(k==='category'){category=v;subcategory='全部小类'}else if(k==='subcategory')subcategory=v;else if(k==='searchTag')searchTag=v;page=0;refreshSearchBehind();updateSearchFilterSheetState(k)}
 else if(t.id==='clearSearchDate'||t.id==='clearSearchRangeStart'){searchRangeStart='';searchRangeEnd=localDate(new Date());searchDateMode='range';searchPeriod='range';day='';page=0;render();searchDateSheet()}
 else if(t.id==='clearSearchFilters'){book='全部账本';kind='全部类型';currencyFilter='全部币种';account='全部账户';category='全部分类';subcategory='全部小类';searchTag='全部标签';searchDateMode='range';searchPeriod='range';searchRangeStart='';searchRangeEnd=localDate(new Date());page=0;refreshSearchBehind();searchFilterSheet()}
 else if(t.dataset.clearfilter){let f=t.dataset.clearfilter;if(f==='book')book='全部账本';else if(f==='kind')kind='全部类型';else if(f==='currencyFilter')currencyFilter='全部币种';else if(f==='account')account='全部账户';else if(f==='category'){category='全部分类';subcategory='全部小类'}else if(f==='subcategory')subcategory='全部小类';else if(f==='searchTag')searchTag='全部标签';page=0;render()}
 else if(t.dataset.bannerconfig)bannerConfigForm(t.dataset.bannerconfig)
 else if(t.id==='setBudget')budgetForm()
 else if(t.dataset.managecategory){manageCategoryForm('categoryRename',t.dataset.categorytype,t.dataset.managecategory)}
 else if(t.dataset.managesubcategory){manageCategoryForm('subcategoryRename',t.dataset.categorytype,t.dataset.parentcategory,t.dataset.managesubcategory)}
 else if(t.id==='exportConfig')exportConfig().catch(err=>toast('导出失败：'+err.message))
 else if(t.id==='importConfig'){if(native)nativeCommand('importConfig').then(r=>{if(r.cancelled)return;prefs={...prefs,...r.settings};applyTheme();render();toast('设置已导入')}).catch(err=>toast('导入失败：'+err.message));else $('#configFile').click()}
 else if(t.dataset.accountquery){searchPeriod='all';account=t.dataset.accountquery;book='全部账本';kind='全部类型';category='全部分类';subcategory='全部小类';currencyFilter='全部币种';query='';day='';page=0;rc20SetPage('search');render();$('#content')?.scrollTo(0,0)}
 else if(t.dataset.accountname&&!t.dataset.deleteaccountmode)accountForm(t.dataset.accountname)
 else if(t.dataset.group)groupForm(t.dataset.group)
 else if(t.id==='addGroup')groupForm('')
 else if(t.id==='addAccount')newAccountForm()
 else if(t.dataset.requestaccountrename){let name=t.dataset.requestaccountrename,dest=String($('#accountRenameInput')?.value||'').trim();if(!dest||dest.length>60||/[,，;；\r\n]/.test(dest))toast('账户名称无效');else if(dest===name)toast('新名称与原名称相同');else if(accountData().some(([k])=>k===dest))toast('已存在同名账户；请换一个名称');else confirmAccountRename(name,dest)}
 else if(t.dataset.confirmaccountrename)renameAccount(t.dataset.confirmaccountrename,t.dataset.accountdest).catch(err=>toast(err.message))
 else if(t.dataset.hideaccount){let name=t.dataset.hideaccount,hidden=accountProfile(name).hidden,count=rows.filter(r=>r.account===name||r.account2===name).length;if(hidden)setAccountHidden(name,false).catch(err=>toast(err.message));else{$('#overlay').innerHTML=`<div class="modalback account-dialog-back"><div class="modal account-config"><h2>隐藏 ${esc(name)}？</h2><p class="muted">${count?`相关 ${count} 笔账单将暂时不参与账单显示、筛选和统计。`:'当前没有关联账单。'}账户仍会保留在账户管理中，CSV 不改变，可以随时恢复。</p><div class="modalfooter"><button class="button" id="closeBtn">取消</button><button class="button primary" data-confirmhide="${esc(name)}">确认隐藏</button></div></div></div>`;if(compactViewport())document.body.classList.add('dialog-open');else activateAppTertiary('account')}}
 else if(t.dataset.confirmhide)setAccountHidden(t.dataset.confirmhide,true).catch(err=>toast(err.message))
 else if(t.dataset.unhideaccount)setAccountHidden(t.dataset.unhideaccount,false).catch(err=>toast(err.message))
 else if(t.dataset.removeaccount)accountDeleteForm(t.dataset.removeaccount)
 else if(t.dataset.deleteaccountmode){if(t.dataset.deleteaccountmode==='bills')confirmAccountBillsDelete(t.dataset.accountname);else deleteAccount(t.dataset.accountname,t.dataset.deleteaccountmode).catch(err=>toast(err.message))}
 else if(t.dataset.confirmaccountbills)deleteAccount(t.dataset.confirmaccountbills,'bills').catch(err=>toast(err.message))
 else if(t.id==='exportBeforeAccountDelete'){if(native)nativeCommand('exportLedger').then(()=>toast('请确认备份已保存，再选择删除方式')).catch(err=>toast(err.message));else exportCompleteBackup().catch(err=>toast(err.message))}
 else if(t.dataset.deletegroup)deleteGroup(t.dataset.deletegroup).catch(err=>toast(err.message))
 else if(t.id==='clearActiveFilters'){query='';kind='全部类型';account='全部账户';category='全部分类';subcategory='全部小类';currencyFilter='全部币种';day='';page=0;render()}
 else if(t.dataset.managebook)manageForm('book',t.dataset.managebook)
 else if(t.dataset.managetag)manageForm('tag',t.dataset.managetag)
 else if(t.id==='backupForMerge'){if(native)nativeCommand('exportLedger').then(()=>toast('请确认备份已保存，再选择合并方式')).catch(err=>toast(err.message));else exportCompleteBackup().catch(err=>toast(err.message))}
 else if(t.id==='markAndMerge'){let op=pendingMergeOperation,mark=$('#mergeTraceTag')?.value.trim();if(!op||!mark||/[,，;；\s]/.test(mark)){toast('请输入不含空格和分隔符的来源标签');return}runBatch({...op,traceTag:mark}).catch(err=>toast('合并失败：'+err.message))}
 else if(t.id==='directMerge'){if(pendingMergeOperation)runBatch(pendingMergeOperation).catch(err=>toast('合并失败：'+err.message))}
 
 else if(t.dataset.tagoperation){let name=t.dataset.tagname,kind=t.dataset.tagoperation;if(kind==='tagMigrate'){let form=$('#manageForm');form.elements.dest.focus();toast('输入目标标签名称并保存；已有标签会自动合并')}else if(kind==='tagDeleteBills'){let count=rows.filter(r=>tagParts(r.tags).includes(name)).length;$('#overlay').innerHTML=`<div class="modalback"><div class="modal"><h2>删除 ${count} 笔账单？</h2><p class="muted">包含「${esc(name)}」的账单将被删除。请确认后执行；此操作不提供自动撤回，请先导出备份。</p><div class="modalfooter"><button class="button" id="closeBtn">取消</button><button class="button danger" data-confirmtagdelete="${esc(name)}">删除 ${count} 笔</button></div></div></div>`}else runBatch({kind,target:name}).catch(err=>toast(err.message))}
 else if(t.dataset.confirmtagdelete)runBatch({kind:'tagDeleteBills',target:t.dataset.confirmtagdelete}).catch(err=>toast(err.message))
 else if(t.id==='hideKeypad')$('#overlay .entryback').classList.add('keypad-hidden')
 else if(t.id==='openKeypad'){let back=$('.entryback');$('#amountInput')?.blur();back?.classList.remove('keypad-hidden','editing-text')}
 else if(t.id==='lookupFxRate')lookupFxRate().catch(err=>toast('查询参考汇率失败：'+err.message))
 else if(t.id==='bulkEditSelection')window.__slBulkEdit?.open()
 else if(t.dataset.bulkfield)window.__slBulkEdit?.field(t.dataset.bulkfield)
 else if(t.dataset.bulkmode)window.__slBulkEdit?.mode(t.dataset.bulkmode)
 else if(t.id==='backBulkEdit')window.__slBulkEdit?.back()
 else if(t.id==='closeBulkEdit')window.__slBulkEdit?.close()
 else if(t.id==='removeBulkFieldOp')window.__slBulkEdit?.remove()
 else if(t.id==='saveBulkField')window.__slBulkEdit?.save()
 else if(t.id==='applyBulkEdit')window.__slBulkEdit?.apply().catch(err=>toast('批量修改失败：'+err.message))
 else if(t.id==='deleteSelection')deleteSelection()
 else if(t.id==='confirmDelete'||t.id==='retryDelete')performDelete()
 else if(t.id==='exportAfterDelete')exportAfterDelete().catch(err=>toast('导出失败：'+err.message))
 else if(t.id==='cancelDelete'){pendingDeleteIds=null;let dialog=deleteDialog();if(dialog.id==='accountOverlay')dialog.innerHTML='';else close()}
 else if(t.dataset.viewall)openFullList(t.dataset.viewall)
 else if(t.id==='sideToggle'){toggleDesktopSidebar()}
 else if(t.dataset.go){if(browserTabScrollMode()&&window.__browserPagerNavigate)window.__browserPagerNavigate(t.dataset.go);else rc6Navigate(t.dataset.go)}
 else if(t.dataset.id){if(suppressRecordClick){suppressRecordClick=false;return}if(selection.size){toggleSelection(t.dataset.id);return}let r=rows.find(x=>x.id===t.dataset.id);if(r)form(r)}
 else if(t.dataset.categorymode){renderKeepingVisualAnchor(()=>{categoryChartMode=t.dataset.categorymode})}
 else if(t.dataset.categoryflow){renderKeepingVisualAnchor(()=>{categoryFlow=t.dataset.categoryflow})}
 else if(t.dataset.cat){searchPeriod='all';kind=t.dataset.cattype||'支出';category=kind==='收入'?'全部分类':t.dataset.cat;subcategory=kind==='收入'?t.dataset.cat:'全部小类';rc20SetPage('search');page=0;render()}
 else if(t.dataset.month){month=Number(t.dataset.month);statsMode='month';rc20SetPage('stats');day='';render()}
 else if(t.dataset.day){searchPeriod='all';day=t.dataset.day;kind='全部类型';rc20SetPage('search');render()}
 else if(t.dataset.reconcile)accountForm(t.dataset.reconcile)
 else if(t.dataset.appearancechoice)savePrefs({appearance:t.dataset.appearancechoice}).catch(err=>toast(err.message))
 else if(t.dataset.entrytype){let f=$('#entry'),r=Object.fromEntries(new FormData(f));r.id=f.dataset.id;r.type=t.dataset.entrytype;r.subcategory='';r.category=r.type==='收入'?'收入':'餐饮';entryInstantRender=true;entryForm(r);entryInstantRender=false}
 else if(t.dataset.searchsub){let f=$('#entry'),r=Object.fromEntries(new FormData(f));r.id=f.dataset.id;r.category=t.dataset.searchcat;r.subcategory=t.dataset.searchsub;entryForm(r)}
 else if(t.dataset.entrycat){let f=$('#entry'),r=Object.fromEntries(new FormData(f));r.id=f.dataset.id;r.category=t.dataset.entrycat;r.subcategory='';entryForm(r)}
 else if(t.dataset.accountfield){openAccountSheet(t.dataset.accountfield)}
 else if(t.id==='openBookSheet'){openBookSheet()}
 else if(t.dataset.choosebook){setEntryBookValue(t.dataset.choosebook);rc21CloseAccountOverlay()}
 else if(t.id==='useNewBook'){let value=$('#bookSearch')?.value.trim();if(!value){toast('请输入账本名称');return}if(value.length>60){toast('账本名称过长');return}setEntryBookValue(value);rc21CloseAccountOverlay()}
 else if(t.dataset.chooseaccount){let sheet=$('#accountOverlay'),field=sheet.dataset.field||sheet.getAttribute('data-field'),input=$('#entry [name="'+field+'"]');input.value=t.dataset.chooseaccount;let button=$('#entry [data-accountfield="'+field+'"]');button.textContent=t.dataset.chooseaccount;button.classList.remove('empty');rc21CloseAccountOverlay()}
 else if(t.id==='closeAccountSheet'){rc21CloseAccountOverlay()}
 else if(t.id==='useNewAccount'){let name=$('#accountSearch').value.trim(),field=$('#accountOverlay').dataset.field;if(name){$('#entry [name="'+field+'"]').value=name;let button=$('#entry [data-accountfield="'+field+'"]');button.textContent=name;button.classList.remove('empty');rc21CloseAccountOverlay()}}
 else if(t.id==='openTagSheet'){openEntryTagSheet()}
 else if(t.dataset.removetag){setEntryTags(tagPartsEntry().filter(v=>v!==t.dataset.removetag))}
 else if(t.dataset.toggletag){let tags=tagPartsEntry(),v=t.dataset.toggletag;setEntryTags(tags.includes(v)?tags.filter(x=>x!==v):[...tags,v])}
 else if(t.dataset.suggestfield){let input=$('#entry [name='+t.dataset.suggestfield+']');if(input){input.value=t.dataset.suggestvalue;growEntryNote();$('#entrySuggestions').hidden=true;input.dispatchEvent(new Event('change',{bubbles:true}))}}
 else if(t.id==='openDatePicker'){openEntryDatePicker()}
 else if(t.dataset.addtag){let input=$('#entry [name=tags]'),parts=String(input.value||'').split(/[,，;；\s]+/).filter(Boolean);if(!parts.includes(t.dataset.addtag))parts.push(t.dataset.addtag);setEntryTags(parts)}
 else if(t.id==='addSub'){$('.custom-sub').classList.add('open');$('#subInput').value='';$('#entry [name=subcategory]').value='';$('#subInput').focus()}
 else if(t.dataset.entrysub){if($('#entry [name=type]').value==='借贷'){let f=$('#entry'),r=Object.fromEntries(new FormData(f));r.id=f.dataset.id;r.subcategory=t.dataset.entrysub;entryForm(r)}else{$('#entry [name=subcategory]').value=t.dataset.entrysub;$('#subInput').value=t.dataset.entrysub;document.querySelectorAll('[data-entrysub]').forEach(b=>b.classList.toggle('active',b===t))}}
 else if(t.dataset.key)pressAmountKey(t.dataset.key)
 else if(t.id==='settingsBtn'){if(section==='settings'){rc20SetPage(rc21SettingsReturn||'home')}else{rc21SettingsReturn=PRIMARY_PAGE_ORDER.includes(section)?section:'home';rc20SetPage('settings')}render()}
 else if(t.id==='addBtn')form()
 else if(t.id==='closeBtn'||t.classList.contains('modalback')){let bf=t.closest('#bannerConfigForm'),bm=t.closest('[data-banner-modal]');let bk=bf?.dataset.bannerkey||bm?.dataset.bannerModal||'';if(bk)clearBannerDraft(bk,true);if(t.closest('#accountOverlay'))rc21CloseAccountOverlay();else close()}
 else if(t.id==='deleteBtn'||t.id==='desktopDeleteBtn'){let id=$('#entry')?.dataset.id;if(id)askDelete([id])}
 else if(t.id==='switchMain'){nativeCommand('switchMain').then(r=>{prefs={...prefs,...r.settings};if(r.catalog)BOOT.catalog=r.catalog;BOOT.ledgerReady=!!r.ledgerReady;takeCsv(r.csv);if($('#entry'))entryForm();else render();toast('当前主文件名：'+prefs.mainName)}).catch(err=>toast(err.message))}
 else if(t.id==='newBook')createBook().catch(err=>toast(err.message))
 else if(t.id==='connectFolder')connectFolder().catch(err=>toast(err.message))
 else if(t.id==='refreshBill')location.reload()
 else if(t.id==='selectDelta')$('#deltaFile').click()
 else if(t.id==='dismissExportReminder'){exportReminderDismissed=true;render()}
 else if(t.id==='disableExportReminder'){savePrefs({exportDays:0}).then(()=>toast('已关闭完整备份提醒；可在设置中重新开启')).catch(err=>toast(err.message))}
 else if(t.id==='exportBackup')exportCompleteBackup().catch(err=>toast('导出失败：'+err.message))
 else if(t.id==='importBackup')$('#backupZip').click()
 else if(t.id==='exportCsv'){if(native)nativeCommand('exportLedger').then(r=>{if(r.exported)toast('已导出手机完整备份')}).catch(err=>toast(err.message));else exportLedger().catch(err=>toast(err.message))}
 else if(t.id==='restorePrevious'){if(confirm('恢复最近一次修改前的账本？恢复操作也可以再次撤回。'))send('restorePrevious').catch(err=>toast(err.message))}
 else if(t.id==='confirmExport'){if(t.dataset.complete==='1')savePrefs({lastExportAt:Date.now(),lastExportName:t.dataset.exportname}).then(()=>{close();toast('已记录本次完整备份')}).catch(err=>toast(err.message));else{close();toast('当前账本 CSV 已导出；完整备份提醒仍会保留')}}
 else if(t.id==='importFolder'){connectFolder().catch(err=>toast('工作区读取失败：'+err.message))}
 else if(t.id==='ledgerSwitch'||t.id==='ledgerSwitchSettings'){workspacePicker()}
 else if(t.dataset.workspaceLedger){let name=t.dataset.workspaceLedger;$('#overlay').innerHTML='';switchWorkspaceLedger(name).catch(err=>toast(err.message))}
 else if(t.id==='refreshWorkspace'){refreshDelta(false).catch(err=>toast(err.message))}
 else if(t.id==='clearLedger'){if(confirm('清空当前本地账本？\n\n这会删除此设备上 StarLedger 保存的账单、账户、标签、预算、关联关系和设置，并回到首次打开状态。此操作不能撤回，请先确认已经导出备份。'))clearLocalLedger().catch(err=>toast(err.message))}
 else if(t.id==='clearDay'){day='';render()}
 else if(t.id==='clearSearchPeriod'){searchPeriod='all';page=0;render()}
 else if(t.id==='more'){page++;render()}
});
document.addEventListener('change',async e=>{if(e.target.id==='backupZip'){try{let file=e.target.files[0];if(file)await importCompleteBackup(file)}catch(err){toast('完整备份读取失败：'+err.message)}finally{e.target.value=''}return}if(e.target.id==='configFile'){try{let file=e.target.files[0];if(file){let changes=validateConfigBackup(await file.text());await savePrefs(changes);toast('设置已导入')}}catch(err){toast('导入失败：'+err.message)}finally{e.target.value=''}return}if(e.target.matches('.rowcheck')){toggleSelection(e.target.dataset.check);return}if(e.target.id==='deltaFile'){try{let f=e.target.files[0];if(f){if(![prefs.mainName+'_scriptable.csv',prefs.mainName+'_desktop.csv'].includes(f.name)&&!confirm('文件名与当前主账本不一致，仍要核对汇入吗？'))return;await reviewDelta(await readCsvFile(f),false)}}catch(err){toast(err.message)}finally{e.target.value=''}return}if(e.target.id==='folderFile'){try{if(e.target.files?.length)await importWorkspaceFileList(e.target.files)}catch(err){toast('工作区读取失败：'+err.message)}finally{e.target.value=''}return}if(e.target.matches('[data-bookpick]')){syncDesktopBookButton();return}if(e.target.dataset.setting){let k=e.target.dataset.setting,v=e.target.value;savePrefs({[k]:['exportDays','monthStartDay'].includes(k)?Number(v):v}).catch(err=>toast(err.message));return}if(e.target.name==='date'&&e.target.closest('#entry')){updateEntryDate();return}if(e.target.id==='sheetCurrency'){let currency=$('#entry [name=currency]');currency.value=e.target.value;currency.dispatchEvent(new Event('change',{bubbles:true}));updateEntryChips();syncCurrencySheet();if(currencyCode(currency.value)!=='CNY')lookupFxRate().then(syncCurrencySheet).catch(err=>{let node=$('#sheetFxPreview');if(node)node.textContent='获取失败：'+err.message+'；可手动填写'});return}if(e.target.name==='currency'&&e.target.closest('#entry')){let field=$('#fxField'),rate=$('#entry [name=fxRate]'),isLocal=currencyCode(e.target.value)==='CNY';field.hidden=isLocal;rate.value='';rate.dataset.rateDate='';rate.dataset.rateSource='';$('#fxHint').textContent=isLocal?'':'查询采用当日或此前最近的参考日汇率';updateFxPreview();updateEntryChips();return}if(e.target.id==='searchRangeStart'||e.target.id==='searchRangeEnd'){if(e.target.id==='searchRangeStart')searchRangeStart=e.target.value;else searchRangeEnd=e.target.value;if(searchRangeStart&&searchRangeEnd&&searchRangeStart>searchRangeEnd){let x=searchRangeStart;searchRangeStart=searchRangeEnd;searchRangeEnd=x}searchDateMode='range';searchPeriod='range';day='';page=0;render();searchDateSheet();return}if(e.target.id==='searchMonthYear'||e.target.id==='searchMonthMonth'){if(e.target.id==='searchMonthYear')year=Number(e.target.value);else month=Number(e.target.value);searchDateMode='month';searchPeriod='month';day='';page=0;render();searchDateSheet();return}if(e.target.dataset.filter){let f=e.target.dataset.filter,v=e.target.value,apply=()=>{if(f==='year')year=Number(v);else if(f==='month')month=Number(v);else if(f==='book')book=v;else if(f==='kind')kind=v;else if(f==='account')account=v;else if(f==='category')category=v;else if(f==='subcategory')subcategory=v;else if(f==='currencyFilter')currencyFilter=v;day='';page=0};if(e.target.closest('#overlay')&&section==='search'){apply();searchFilterSheet()}else renderKeepingVisualAnchor(apply)}});
document.addEventListener('input',e=>{if(e.target.id==='query'){query=e.target.value;page=0;if(!e.isComposing&&!composingQuery){let target=$('#searchResults');if(target)target.innerHTML=searchResults()}}else if(e.target.id==='amountInput'){let normalized=normalizeAmountExpression(e.target.value).replace(/[^0-9.+−×÷]/g,'').slice(0,48);if(e.target.value!==normalized)e.target.value=normalized;syncAmountExpressionUI()}else if(e.target.id==='categorySheetSearch'){renderCategoryChoices()}else if(e.target.id==='entryTagSearch'){renderEntryTagChoices()}else if(e.target.matches('#entry textarea[name=note],#entry input[name=merchant]')){growEntryNote();if(!e.isComposing)entrySuggestions(e.target)}else if(e.target.id==='sheetFxRate'){let rate=$('#entry [name=fxRate]');rate.value=e.target.value;rate.dispatchEvent(new Event('input',{bubbles:true}));syncCurrencySheet()}else if(e.target.id==='subInput'){$('#entry [name=subcategory]').value=e.target.value}else if(e.target.name==='fxRate'&&e.target.closest('#entry')){updateFxPreview();e.target.dataset.rateDate='';e.target.dataset.rateSource='';let hint=$('#fxHint');if(hint)hint.textContent='手动输入的汇率'}else if(e.target.id==='categorySearch'){let q=e.target.value.trim().toLocaleLowerCase(),root=e.target.closest('.entry');root.querySelectorAll('[data-entrycat],[data-entrysub]').forEach(b=>b.hidden=!!q&&!b.textContent.toLocaleLowerCase().includes(q));root.querySelector('.category-tabs').hidden=!!q&&![...root.querySelectorAll('[data-entrycat]')].some(b=>!b.hidden);let results=root.querySelector('#categoryResults');results.hidden=!q;results.querySelectorAll('[data-searchsub]').forEach(b=>b.hidden=!q||!b.textContent.toLocaleLowerCase().includes(q))}else if(e.target.id==='accountSearch'){let q=e.target.value.trim().toLowerCase(),buttons=[...document.querySelectorAll('#accountOptions button')];buttons.forEach(b=>b.hidden=!b.dataset.chooseaccount.toLowerCase().includes(q));document.querySelectorAll('.entry-account-group').forEach(group=>group.hidden=![...group.querySelectorAll('button[data-chooseaccount]')].some(b=>!b.hidden));$('#useNewAccount').style.display=q&&!buttons.some(b=>b.dataset.chooseaccount.toLowerCase()===q)?'block':'none'}else if(e.target.id==='bookSearch'){let q=e.target.value.trim().toLowerCase(),buttons=[...document.querySelectorAll('#bookOptions button')];buttons.forEach(b=>b.hidden=!b.dataset.choosebook.toLowerCase().includes(q));let group=e.target.closest('.book-account-sheet')?.querySelector('.entry-account-group');if(group)group.hidden=!!q&&![...group.querySelectorAll('button[data-choosebook]')].some(b=>!b.hidden);let use=$('#useNewBook');if(use)use.style.display=q&&!buttons.some(b=>b.dataset.choosebook.toLowerCase()===q)?'block':'none'}});
document.addEventListener('compositionstart',e=>{if(e.target.id==='query')composingQuery=true});
document.addEventListener('compositionend',e=>{if(e.target.matches('#entry textarea[name=note],#entry input[name=merchant]'))entrySuggestions(e.target);if(e.target.id==='query'){composingQuery=false;query=e.target.value;page=0;let target=$('#searchResults');if(target)target.innerHTML=searchResults()}});

document.addEventListener('focusout',e=>{if(e.target.matches('#entry textarea[name=note],#entry input[name=merchant]'))setTimeout(()=>{let box=$('#entrySuggestions');if(box)box.hidden=true},190);});
document.addEventListener('scroll',()=>{let box=$('#entrySuggestions');if(box)box.hidden=true},true);
window.visualViewport?.addEventListener('resize',()=>{let active=document.activeElement;if(active?.matches('#entry textarea[name=note],#entry input[name=merchant]'))entrySuggestions(active)});
document.addEventListener('change',e=>{let f=e.target.closest?.('#bannerConfigForm');if(!f||!e.target.matches('select[name^="slot"]'))return;let key=f.dataset.bannerkey;bannerDraftConfigs[key]=bannerFormSlots(f,key);refreshVisibleBanner(key)});
async function commitBannerSettingsAfterClose(key,changes,slots){
 let previousPrefs=prefs,closeFinished=new Promise(resolve=>setTimeout(resolve,320));
 close();
 try{
  if(native){
   let saved=await nativeCommand('saveSettings',null,null,{settings:changes});
   // Read the configuration back from disk after writing it. rc11 Core clears its
   // config cache for reloadSettings, so the page renders only from persisted data.
   let loaded=await nativeCommand('reloadSettings');
   let settings=loaded?.settings||saved?.settings||{};
   let confirmed=normalizeBannerSlots(key,settings?.bannerConfigs?.[key]);
   if(JSON.stringify(confirmed)!==JSON.stringify(slots))throw Error('Banner 配置写入后重新读取不一致');
   prefs={...prefs,...settings};
  }else{
   await savePrefs(changes);
   let stored=await get('prefs');
   if(stored&&typeof stored==='object')prefs={...prefs,...stored};
  }
  delete bannerDraftConfigs[key];
  await closeFinished;
  window.__rc62Invalidate?.();
  render();
 }catch(err){
  prefs=previousPrefs;
  delete bannerDraftConfigs[key];
  await closeFinished;
  window.__rc62Invalidate?.();
  render();
  toast('Banner 设置保存失败：'+(err?.message||err));
 }
}

document.addEventListener('submit',e=>{if(e.target.id==='bannerConfigForm'){e.preventDefault();let f=e.target,key=f.dataset.bannerkey,slots=bannerFormSlots(f,key);let changes={bannerConfigs:{...(prefs.bannerConfigs||{}),[key]:slots}};if(bannerKind(key)==='month'){let raw=String(new FormData(f).get('monthlyBudget')||'').trim(),budgets={...(prefs.budgets||{})};if(raw==='')budgets[budgetKey()]=null;else{let v=Number(raw);if(!Number.isFinite(v)||v<0){toast('预算金额无效');return}budgets[budgetKey()]=v}changes.budgets=budgets}commitBannerSettingsAfterClose(key,changes,slots);return}if(e.target.id==='newAccountForm'){e.preventDefault();createAccount(e.target).catch(err=>toast(err.message));return}if(e.target.id==='accountProfileForm'){e.preventDefault();saveAccountForm(e.target).catch(err=>toast(err.message));return}if(e.target.id==='groupForm'){e.preventDefault();saveGroupForm(e.target).catch(err=>toast(err.message));return}if(e.target.id==='categoryManageForm'){e.preventDefault();let f=e.target,dest=f.elements.dest.value.trim(),op={kind:f.dataset.kind,type:f.dataset.type,category:f.dataset.category,target:f.dataset.target,dest};if(!dest||/[,，;；\n\r]/.test(dest)){toast('分类名称无效');return}if(dest===op.target){toast('新名称与原名称相同');return}let exists=rows.some(r=>r.type===op.type&&(op.kind==='categoryRename'?r.category===dest:r.category===op.category&&r.subcategory===dest));if(exists)mergeChoice(op);else runBatch(op).catch(err=>toast('修改失败：'+err.message));return}if(e.target.id==='manageForm'){e.preventDefault();let f=e.target,kind=f.dataset.type==='book'?'bookRename':'tagRename',dest=f.elements.dest.value.trim();if(dest===f.dataset.name){toast('新名称与原名称相同');return}{let op={kind,target:f.dataset.name,dest},exists=kind==='bookRename'?rows.some(r=>r.book===dest):rows.some(r=>tagParts(r.tags).includes(dest));if(exists)mergeChoice(op);else runBatch(op).catch(err=>toast('修改失败：'+err.message))}return}if(e.target.id==='budgetForm'){e.preventDefault();let v=Number(new FormData(e.target).get('budget'));if(!Number.isFinite(v)||v<0){toast('预算金额无效');return}savePrefs({budgets:{...(prefs.budgets||{}),[budgetKey()]:v}}).then(()=>close()).catch(err=>toast(err.message));return}if(e.target.id==='mergeReview'){e.preventDefault();let ids=[...e.target.querySelectorAll('input[name=merge]:checked')].map(x=>x.value);mergeSelected(ids).catch(err=>toast(err.message));return}if(e.target.id==='entry'){e.preventDefault();let f=e.target,amountCheck=amountSaveValue(f.elements.amount?.value);if(!amountCheck.ok){toast(amountCheck.error);return}let r=Object.fromEntries(new FormData(f));r.date=r.date.replace('T',' ');if(r.date.length===16)r.date+=':00';r.amount=amountCheck.value.toFixed(2);let fxText=String(r.fxRate||'').trim(),extras;try{extras=JSON.parse(r.extras||'{}');if(!extras||typeof extras!=='object'||Array.isArray(extras))extras={}}catch(err){extras={legacy:r.extras||''}}if(currencyCode(r.currency)==='CNY')delete extras.fx;else if(fxText){let rate=Number(fxText);if(!Number.isFinite(rate)||rate<=0||rate>1e8){toast('汇率须大于 0');return}let input=f.querySelector('[name=fxRate]');extras.fx={rate,date:input.dataset.rateDate||'',source:input.dataset.rateSource||'manual',quote:'CNY'}}else delete extras.fx;r.extras=Object.keys(extras).length?JSON.stringify(extras):'';delete r.fxRate;if(r.book==='__new_book__')r.book=String(r.newBookName||'').trim();delete r.newBookName;try{validate(r);if(f.dataset.saving==='1')return;f.dataset.saving='1';let button=f.querySelector('button[type=submit]');if(button)button.disabled=true;send(f.dataset.id?'update':'add',r,f.dataset.id||null).then(()=>close()).catch(err=>{delete f.dataset.saving;if(button)button.disabled=false;toast('保存失败：'+err.message)})}catch(err){toast(err.message)}}else if(e.target.id==='reconcile'){e.preventDefault();let f=e.target,name=f.dataset.account,info=accountData().find(([k])=>k===name)?.[1],kind=f.elements.kind.value,actual=Number(f.elements.actual.value);if(!info||!Number.isFinite(actual)||actual<0){toast('请输入正确余额');return}let target=kind==='debt'?-actual:actual,delta=Number((target-info.net).toFixed(2)),d=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,19).replace('T',' '),record={date:d,type:'余额调整',category:'',subcategory:'余额校准',amount:Math.abs(delta).toFixed(2),account:name,account2:'',book:'日常账本',currency:'人民币',note:'账户余额校准',extras:JSON.stringify({delta,actual,previous:info.net,kind})};send('reconcile',record,null,{kind}).catch(err=>toast(err.message))}});
window.__ledgerInstallCsv=function(csv){takeCsv(csv);openPendingPrefill();startAutoRefresh();return true};
window.__ledgerApplyRates=function(rates){if(rates&&typeof rates==='object'&&!Array.isArray(rates))ledgerRuntimeRates={...ledgerRuntimeRates,...rates};if(rows.length)render();return true};window.__starActive=window.__starActive||window;window.__starActive.__ledgerApplyRates=window.__ledgerApplyRates;
function receiveHashPrefill(){
 let payload=consumeHashPrefill();
 if(!payload)return false;
 pendingPrefill=payload;
 console.info('StarLedger OCR URL received',{source:payload.source||'url',length:String(payload.text||'').length});
 openPendingPrefill();
 return true
}
function hasIncomingOCRHash(){
 let hash=String(location.hash||'');
 return hash.startsWith('#ocr=')||hash.startsWith('#sl=')
}
window.addEventListener('hashchange',()=>{if(hasIncomingOCRHash())receiveHashPrefill()});
window.addEventListener('pageshow',()=>{if(hasIncomingOCRHash())receiveHashPrefill()});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&hasIncomingOCRHash())receiveHashPrefill()});
pendingPrefill=pendingPrefill||consumeHashPrefill();if(BOOT?.native){try{if(BOOT.deferCsv){$('#pageBody').innerHTML='<div class="card">正在载入账单…</div>'}else window.__ledgerInstallCsv(BOOT.csv||csvWrite([]))}catch(err){toast(err.message);render()}}else{$('#pageBody').innerHTML='<div class="card">正在读取星账本…</div>';initLocal().catch(err=>{toast(err.message);render()})}


document.addEventListener('click',e=>{
 if(e.target?.classList?.contains('search-modalback'))closeSearchOverlay()
},true);
