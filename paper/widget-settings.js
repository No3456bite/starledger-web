import {WidgetModel as M} from './widget-model.js';
import {widgetSnapshot} from './domain/widget.js?v=widget3';
export function createWidgetSettings({open, esc, request, quickBackup, state, cloudDialog, toast, commit}) {
  const scriptUrl = new URL('./scriptable/StarLedgerWidget.js?v=3', import.meta.url).href;
  let draft, size='small', masked=false, codePromise;
  function generated(){return (codePromise ||= fetch(scriptUrl).then(r=>{if(!r.ok)throw Error('脚本下载失败');return r.text()})).then(code=>code.replace('const LOCAL_WIDGET_CONFIG = null;', 'const LOCAL_WIDGET_CONFIG = '+JSON.stringify(M.normalize(draft))+';'));}
  function sample(){return widgetSnapshot({[state().prefs.mainName]:state()},state().prefs.mainName).ledgers[0]}
  function preview(root){const c=draft[size],l=sample(),p=M.palette(c,matchMedia('(prefers-color-scheme: dark)').matches),spacing=M.spacing(c),node=root.querySelector('[data-editor-preview]');
    if(c.showUpdated){spacing.pad=Math.min(spacing.pad,12);spacing.gap=4}
    node.style.cssText=`--widget-bg:${p.background};--widget-ink:${p.text};--widget-muted:${p.secondary};--widget-accent:${p.accent};--widget-pad:${spacing.pad}px;--widget-gap:${spacing.gap}px;--widget-font:${c.fontSize}px;--widget-weight:${{regular:400,medium:500,semibold:600,bold:700}[c.weight]};text-align:${c.align}`;
    node.className='widget-live '+size;const available=(size==='small'?155:329)-2*spacing.pad,mainWidth=size==='small'?available:Math.floor(available*.48),auxWidth=size==='small'?(available-spacing.gap)/2:Math.max(55,available-mainWidth-14-45);const item=(i,main=false)=>`<div class="widget-live-item ${main?'main':''}"><small>${esc(M.label(i))}</small><b style="font-size:${M.numberSize(i,c,main)}px">${esc(M.display(l,i,c,main?mainWidth:auxWidth,main?M.numberSize(i,c,true):size==='small'?14:13,masked))}</b></div>`;
    node.innerHTML=`<header>${c.showTitle?`<span>${esc(c.title)}</span>`:'<span></span>'}${c.showDate?`<small>${esc(l.month)}</small>`:''}</header><div class="widget-live-body"><div class="widget-live-primary">${item(c.items[0],true)}${size==='medium'?'<span class="widget-glyph">↗</span>':''}</div><div class="widget-live-secondary">${c.items.slice(1).map(i=>item(i)).join('')}${size==='medium'?'<span class="widget-glyph">＋</span>':''}</div></div>${c.showUpdated?`<footer>数据 ${esc(l.updated)}</footer>`:''}`;
  }
  function editor(){const c=draft[size],options=(values,value)=>Object.entries(values).map(([v,l])=>`<option value="${esc(v)}" ${v===value?'selected':''}>${esc(l)}</option>`).join(''),check=(key,label)=>`<label class="check-field">${label}<input data-widget-option="${key}" type="checkbox" ${c[key]?'checked':''}></label>`;
    return `<section class="widget-editor"><div class="widget-editor-controls"><label>尺寸<select data-widget-size>${options({small:'小号',medium:'中号'},size)}</select></label><label>模板<select data-widget-template>${options({minimal:'极简模式',assets:'资产总览',monthly:'月度收支',budget:'预算管理',custom:'自定义'},c.template)}</select></label></div><div data-editor-preview></div><label class="check-field">隐藏预览金额<input data-widget-mask type="checkbox" ${masked?'checked':''}></label><p class="subtle">预览使用本机数据；桌面组件使用最后成功备份的数据。小号最多 3 项，中号最多 4 项。</p><label>标题<input data-widget-option="title" maxlength="24" value="${esc(c.title)}"></label>
    <div data-widget-items>${c.items.map((i,n)=>`<div class="widget-field-row" data-slot="${n}"><label>${n?'辅助数据 '+n:'主要数据'}<select data-widget-field>${options(M.fields,i.key)}</select></label><label>显示标签<input data-widget-label maxlength="24" placeholder="${esc(M.fields[i.key])}" value="${esc(i.label)}"></label>${i.key==='account'?`<label>指定账户<select data-widget-account>${options(Object.fromEntries(sample().accounts.map(a=>[a.name,a.name])),i.account)}</select></label>`:''}<div><button type="button" data-action="widget-up" data-index="${n}" ${n?'':'disabled'} aria-label="上移">↑</button><button type="button" data-action="widget-remove" data-index="${n}" ${n?'':'disabled'}>隐藏</button></div></div>`).join('')}</div><button type="button" data-action="widget-add" ${c.items.length>=(size==='small'?3:4)?'disabled':''}>＋ 添加展示数据</button>
    <details><summary>文字与数字</summary>${check('showTitle','显示标题')}${check('showDate','显示月份')}${check('showCurrency','显示货币符号')}${check('decimals','保留两位小数')}${check('grouping','千位分隔符')}${check('showUpdated','显示数据更新时间')}</details>
    <details><summary>外观与排版</summary><label>外观<select data-widget-option="appearance">${options({system:'跟随系统',light:'浅色',dark:'深色'},c.appearance)}</select></label><label>主金额字号<input data-widget-option="fontSize" type="range" min="22" max="32" value="${c.fontSize}"></label><label>字重<select data-widget-option="weight">${options({regular:'常规',medium:'中等',semibold:'半粗',bold:'粗体'},c.weight)}</select></label><label>对齐<select data-widget-option="align">${options({left:'左对齐',center:'居中',right:'右对齐'},c.align)}</select></label><label>信息密度<select data-widget-option="density">${options({loose:'宽松',standard:'标准',compact:'紧凑'},c.density)}</select></label>${[['background','背景颜色'],['text','主文字颜色'],['secondary','辅助文字颜色'],['accent','强调色']].map(([k,l])=>`<label>${l}（留空跟随外观）<input data-widget-option="${k}" value="${esc(c[k])}" placeholder="#RRGGBB" pattern="#[0-9a-fA-F]{6}|" maxlength="7"></label>`).join('')}</details>
    <div class="dialog-actions"><button type="button" class="primary" data-action="widget-save">保存配置</button><button type="button" class="secondary" data-action="widget-script">复制小组件脚本</button><button type="button" class="secondary" data-action="widget-download">下载完整脚本</button><button type="button" class="secondary" data-action="widget-reset">恢复默认配置</button></div><p class="connection-status" data-editor-status role="status" aria-live="polite">配置尚未修改。保存后请备份，云端配置会在组件下次刷新时生效。</p></section>`;
  }
  function refresh(root){root.querySelector('.widget-editor').outerHTML=editor();preview(root)}
  function input(t){const root=t.closest('.widget-settings');if(!root)return false;
    const c=draft[size],slot=t.closest('[data-slot]'),i=slot?Number(slot.dataset.slot):0;
    if(t.hasAttribute('data-widget-size')){size=t.value;refresh(root)}
    else if(t.hasAttribute('data-widget-template')){c.template=t.value;c.items=M.templates[t.value].slice(0,size==='small'?3:4).map(key=>({key,label:'',account:''}));refresh(root)}
    else if(t.hasAttribute('data-widget-mask')){masked=t.checked;preview(root)}
    else if(t.hasAttribute('data-widget-field')){c.items[i]={key:t.value,label:'',account:t.value==='account'?sample().accounts[0]?.name||'':''};refresh(root)}
    else if(t.hasAttribute('data-widget-label')){c.items[i].label=t.value;preview(root)}
    else if(t.hasAttribute('data-widget-account')){c.items[i].account=t.value;preview(root)}
    else if(t.dataset.widgetOption){c[t.dataset.widgetOption]=t.type==='checkbox'?t.checked:t.type==='range'?Number(t.value):t.value;preview(root)}else return false;
    const status=root.querySelector('[data-editor-status]');if(status)status.textContent='预览已更新；点击保存配置后，再通过备份同步。';return true;
  }
  function panel() {
    draft=M.normalize(state().prefs.widgetConfig);codePromise=fetch(scriptUrl).then(r=>{if(!r.ok)throw Error('脚本下载失败');return r.text()});codePromise.catch(()=>{});
    open('桌面小组件自定义', `<div class="widget-settings">
      <p class="intro">在主屏幕直接看净资产、预算与花销。数值来自最近一次成功上传的完整备份。</p>
      ${editor()}
      <div class="dialog-actions"><button type="button" class="primary" data-action="widget-pair">生成连接配置</button><button type="button" class="secondary" data-action="widget-check">检查云端金额</button></div>
      <div class="widget-pairing" hidden><label>小组件连接配置<textarea id="widget-pairing-text" rows="4" readonly spellcheck="false" aria-label="小组件连接配置"></textarea></label><button type="button" class="text-link" data-action="widget-copy">复制连接配置</button><p class="subtle">只用于你自己的 Scriptable，含只读令牌。更新 Worker 的 SYNC_TOKEN 可使旧配置失效。</p></div>
      <p class="connection-status" data-widget-status role="status" aria-live="polite">尚未检查云端金额</p>
      <button type="button" class="paper-workspace-row" data-action="widget-backup">立即备份并更新 →</button>
      <button type="button" class="paper-workspace-row" data-action="cloud">设置云备份与自动备份 →</button>
      <details class="backup-advanced" open><summary>添加到 iPhone：按顺序完成</summary><ol class="widget-help">
        <li><b>更新 Worker。</b>已有云备份也需要更新 Worker 到本版本。在 Cloudflare 的 Worker 项目通过 GitHub 构建部署；命令为 <code>npx wrangler deploy</code>。保留原四个 Secret，无需新增数据库。新版含模块依赖，不要仅粘贴 worker.mjs。未配置过云备份可先查看下方完整说明。</li>
        <li><b>保存一次云备份。</b>点“立即备份并更新”，按提示核对云端差异。旧备份没有摘要时，此按钮会更新备份格式。</li>
        <li><b>安装 Scriptable 并添加脚本。</b>在 App Store 安装 Scriptable；<a href="${esc(scriptUrl)}" download="StarLedgerWidget.js">下载小组件脚本</a>，或<button type="button" class="text-link" data-action="widget-script">复制脚本代码</button>。打开 Scriptable → ＋ → 粘贴代码 → 命名“星账本小组件” → 运行。</li>
        <li><b>连接星账本。</b>先保存自定义配置并备份，再复制脚本到 Scriptable，最后生成并复制连接配置。运行脚本时会尝试读取剪贴板，你也可以手动粘贴。账本默认采用当前主账本；主次指标以后在网页编辑并备份即可更新。凭据保存在 Scriptable 钥匙串里。</li>
        <li><b>添加到主屏幕。</b>长按桌面空白 → 编辑 / 添加小组件 → Scriptable → 选择小号或中号 → 添加。长按组件 → 编辑小组件 → Script 选“星账本小组件”。两种尺寸使用同一脚本，可以同时添加比较。小号整张点击打开首页；中号 ↗ 打开首页，＋ 打开“记一笔”。iOS 小号组件不支持分区点击。</li>
      </ol></details>
      <details class="backup-advanced"><summary>何时更新？数字如何计算？</summary><p class="notice">自动备份仅在网页可见且没有正在编辑的弹窗时运行；修改稳定至少一分钟，上传间隔至少一小时。小组件在 iOS 下次允许刷新时读取这份备份，不能保证即时刷新。关闭网页后仍可查看已备份数据。</p><p class="notice">净资产 / 总资产沿用账户校准、隐藏账户和汇率规则；支出与预算分别沿用首页口径，不计预算的支出仍计入花销。自定义账期也会保留。缺汇率时显示“待换算”，账户待校准时显示“待核实”。跨账期未备份会明确显示旧账期。</p><p class="notice">断网时使用上次缓存并标“离线”；卡片不显示备份时间；可用本页“检查云端金额”查看数据来源。重新运行脚本可手动刷新、切换账本或预览大小。当前支持 20 MiB 以内的完整备份。超过可用宽度的金额用“万 / 亿”显示，字号与位置保持不变；极端超长金额显示“数额过长”，完整金额请到网页核对。</p></details>
      <p class="subtle"><a href="https://github.com/No3456bite/starledger-web/blob/main/docs/IOS-WIDGET.md" target="_blank" rel="noopener">完整配置与排错说明</a> · 布局参考 <a href="https://developer.apple.com/design/human-interface-guidelines/widgets" target="_blank" rel="noopener">Apple 小组件设计指南</a></p>
    </div>`);preview(document.querySelector('.widget-settings'));
  }
  async function action(a, button) {
    if (a === 'widget') { panel(); return true; }
    if (!a.startsWith('widget-')) return false;
    const root = button.closest('.widget-settings');
    const status = root?.querySelector('[data-widget-status]');
    const say = text => { for(const node of [status,root?.querySelector('[data-editor-status]')])if(node?.isConnected)node.textContent=text; };
    const c=draft[size];
    if(a==='widget-up'){const i=Number(button.dataset.index);[c.items[i-1],c.items[i]]=[c.items[i],c.items[i-1]];refresh(root);return true}
    if(a==='widget-remove'){c.items.splice(Number(button.dataset.index),1);refresh(root);return true}
    if(a==='widget-add'){if(c.items.length<(size==='small'?3:4))c.items.push({key:'expense',label:'',account:''});refresh(root);return true}
    if(a==='widget-reset'){draft=M.normalize();refresh(root);return true}
    if (a === 'widget-copy') {
      const input = root.querySelector('#widget-pairing-text');
      try { await navigator.clipboard.writeText(input.value); toast('连接配置已复制到剪贴板');say('连接配置已复制到剪贴板，请在 Scriptable 中粘贴。');button.textContent='已复制 ✓'; }
      catch { input.focus(); input.select(); say('请长按配置文本，选择全选并复制。'); }
      return true;
    }
    button.disabled = true;
    try {
      if (a === 'widget-pair') {
        const data = await (await request('/widget-config')).json();
        if (!data.endpoint || !data.token) throw Error('Worker 返回的连接配置无效，请更新 Worker');
        if (!root.isConnected) return true;
        root.querySelector('#widget-pairing-text').value = JSON.stringify({...data, siteUrl: new URL('../', import.meta.url).href, ledger: state().prefs.mainName});
        root.querySelector('.widget-pairing').hidden = false;
        say('已生成只读连接配置，请点击复制并粘贴到 Scriptable。');
      } else if (a === 'widget-check') {
        say('正在读取最后一次云备份…');
        const data = await (await request('/widget')).json(), ledger = data.ledgers?.find(l => l.name === state().prefs.mainName) || data.ledgers?.[0];
        if (!ledger) throw Error('云端没有可显示的账本');
        const value = n => n === null ? '待核实' : '¥' + Number(n).toLocaleString('zh-CN', {maximumFractionDigits: 2});
        say(`${ledger.name} · ${ledger.period.label} 账期 · 净资产 ${value(ledger.net)} · 预算 ${ledger.budget === null ? '未设置' : value(ledger.budget)} · 支出 ${ledger.expenseUnknown ? '待换算' : value(ledger.expense)} · 备份 ${new Date(data.backedUpAt).toLocaleString('zh-CN')}`);
      } else if (a === 'widget-backup') {
        say('正在备份并核验…');
        const result = await quickBackup({refreshWidget: true});
        say(result === 'done' ? '备份已核验；小组件会在 iOS 下次刷新时读取。' : '请先完成云备份配置或核对云端差异。');
      } else if (a === 'widget-save') {
        draft=M.normalize(draft);await commit(n=>{n.prefs.widgetConfig=structuredClone(draft)});say('配置已保存到本机。请点“立即备份并更新”，成功后组件会自动取得配置。');button.textContent='已保存 ✓';
      } else if (a === 'widget-script' || a === 'widget-download') {
        if(a==='widget-download'){const code=await generated(),url=URL.createObjectURL(new Blob([code],{type:'text/javascript;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='StarLedgerWidget.js';link.click();setTimeout(()=>URL.revokeObjectURL(url),30000);say('脚本已生成，请在下载目录查看。');}
        else {
          try {
            if(typeof ClipboardItem==='undefined')throw Error('unsupported');
            await navigator.clipboard.write([new ClipboardItem({'text/plain':generated().then(code=>new Blob([code],{type:'text/plain'}))})]);
            say('小组件脚本已复制到剪贴板，请粘贴到 Scriptable。');button.textContent='已复制 ✓';
          }catch{const code=await generated();try{await navigator.clipboard.writeText(code);say('小组件脚本已复制到剪贴板。');button.textContent='已复制 ✓'}catch{let area=root.querySelector('[data-script-fallback]');if(!area){area=document.createElement('textarea');area.dataset.scriptFallback='';area.rows=8;area.readOnly=true;root.querySelector('.widget-editor').append(area)}area.value=code;area.focus();area.select();say('浏览器未允许自动复制。下方已选中完整脚本，请长按并复制。')}}
        }

      }
    } catch (e) { say(e.message + '。若提示 404，请先更新 Worker；若尚未配置，请打开云备份设置。'); }
    finally { button.disabled = false; }
    return true;
  }
  return {action,input};
}
