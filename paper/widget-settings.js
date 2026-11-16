export function createWidgetSettings({open, esc, request, quickBackup, state, cloudDialog, toast}) {
  const scriptUrl = new URL('./scriptable/StarLedgerWidget.js?v=2', import.meta.url).href;
  function panel() {
    open('iPhone 桌面小组件', `<div class="widget-settings">
      <p class="intro">在主屏幕直接看净资产、预算与花销。数值来自最近一次成功上传的完整备份。</p>
      <div class="widget-examples" aria-label="小号与中号布局示意，使用示例金额">
        <figure><div class="widget-sample widget-small"><header><span class="widget-brand">✦ 星账本</span><span>11月</span></header><small>净资产</small><strong>¥28,650</strong><div class="widget-small-bottom"><div><small>预算</small><b>¥5,000</b></div><div><small>支出</small><b>¥3,280</b></div></div></div><figcaption>小号 · 点击整张卡片打开账本</figcaption></figure>
        <figure><div class="widget-sample widget-medium"><header><span class="widget-brand">✦ 星账本</span><span>11月</span></header><div class="widget-medium-grid"><div><small>净资产</small><strong>¥28,650</strong><footer>打开账本 ↗</footer></div><div><div class="widget-sample-row"><span>预算</span><b>¥5,000</b></div><div class="widget-sample-row"><span>支出</span><b>¥3,280</b></div><div class="widget-sample-row widget-remaining"><span>剩余</span><b>¥1,720</b></div><footer class="widget-entry-link">＋ 记一笔 ↗</footer></div></div></div><figcaption>中号 · 左侧打开账本，右侧直接记一笔</figcaption></figure>
      </div><p class="subtle">示例金额。配色沿用网页的纸白 / 深墨与玫瑰色，字形使用衬线数字与宋体。主金额可选净资产或总资产；卡片不显示备份时间。</p>
      <div class="dialog-actions"><button type="button" class="primary" data-action="widget-pair">生成连接配置</button><button type="button" class="secondary" data-action="widget-check">检查云端金额</button></div>
      <div class="widget-pairing" hidden><label>小组件连接配置<textarea id="widget-pairing-text" rows="4" readonly spellcheck="false" aria-label="小组件连接配置"></textarea></label><button type="button" class="text-link" data-action="widget-copy">复制连接配置</button><p class="subtle">只用于你自己的 Scriptable，含只读令牌。更新 Worker 的 SYNC_TOKEN 可使旧配置失效。</p></div>
      <p class="connection-status" data-widget-status role="status" aria-live="polite">尚未检查云端金额</p>
      <button type="button" class="paper-workspace-row" data-action="widget-backup">立即备份并更新 →</button>
      <button type="button" class="paper-workspace-row" data-action="cloud">设置云备份与自动备份 →</button>
      <details class="backup-advanced" open><summary>添加到 iPhone：按顺序完成</summary><ol class="widget-help">
        <li><b>更新 Worker。</b>已有云备份也需要更新 Worker 到本版本。在 Cloudflare 的 Worker 项目通过 GitHub 构建部署；命令为 <code>npx wrangler deploy</code>。保留原四个 Secret，无需新增数据库。新版含模块依赖，不要仅粘贴 worker.mjs。未配置过云备份可先查看下方完整说明。</li>
        <li><b>保存一次云备份。</b>点“立即备份并更新”，按提示核对云端差异。旧备份没有摘要时，此按钮会更新备份格式。</li>
        <li><b>安装 Scriptable 并添加脚本。</b>在 App Store 安装 Scriptable；<a href="${esc(scriptUrl)}" download="StarLedgerWidget.js">下载小组件脚本</a>，或<button type="button" class="text-link" data-action="widget-script">复制脚本代码</button>。打开 Scriptable → ＋ → 粘贴代码 → 命名“星账本小组件” → 运行。</li>
        <li><b>连接星账本。</b>在本页生成并复制连接配置，在脚本首次运行的输入框中粘贴。接着选择账本和主金额。凭据保存在 Scriptable 钥匙串里。</li>
        <li><b>添加到主屏幕。</b>长按桌面空白 → 编辑 / 添加小组件 → Scriptable → 选择小号或中号 → 添加。长按组件 → 编辑小组件 → Script 选“星账本小组件”。两种尺寸使用同一脚本，可以同时添加比较。小号整张点击打开网页；中号左侧打开网页，右侧打开“记一笔”。iOS 小号组件不支持分区点击。</li>
      </ol></details>
      <details class="backup-advanced"><summary>何时更新？数字如何计算？</summary><p class="notice">自动备份仅在网页可见且没有正在编辑的弹窗时运行；修改稳定至少一分钟，上传间隔至少一小时。小组件在 iOS 下次允许刷新时读取这份备份，不能保证即时刷新。关闭网页后仍可查看已备份数据。</p><p class="notice">净资产 / 总资产沿用账户校准、隐藏账户和汇率规则；支出与预算分别沿用首页口径，不计预算的支出仍计入花销。自定义账期也会保留。缺汇率时显示“待换算”，账户待校准时显示“待核实”。跨账期未备份会明确显示旧账期。</p><p class="notice">断网时使用上次缓存并标“离线”；卡片不显示备份时间；可用本页“检查云端金额”查看数据来源。重新运行脚本可手动刷新、切换账本或预览大小。当前支持 20 MiB 以内的完整备份。</p></details>
      <p class="subtle"><a href="https://github.com/No3456bite/starledger-web/blob/main/docs/IOS-WIDGET.md" target="_blank" rel="noopener">完整配置与排错说明</a> · 布局参考 <a href="https://developer.apple.com/design/human-interface-guidelines/widgets" target="_blank" rel="noopener">Apple 小组件设计指南</a></p>
    </div>`);
  }
  async function action(a, button) {
    if (a === 'widget') { panel(); return true; }
    if (!a.startsWith('widget-')) return false;
    const root = button.closest('.widget-settings');
    const status = root?.querySelector('[data-widget-status]');
    const say = text => { if (status?.isConnected) status.textContent = text; };
    if (a === 'widget-copy') {
      const input = root.querySelector('#widget-pairing-text');
      try { await navigator.clipboard.writeText(input.value); toast('连接配置已复制'); }
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
      } else if (a === 'widget-script') {
        const response = await fetch(scriptUrl); if (!response.ok) throw Error('脚本下载失败，请重试');
        const code = await response.text();
        try { await navigator.clipboard.writeText(code); toast('脚本已复制，在 Scriptable 新建脚本并粘贴'); }
        catch { const area = document.createElement('textarea'); area.value = code; area.rows = 8; area.readOnly = true; area.setAttribute('aria-label', 'Scriptable 脚本代码'); root.append(area); area.focus(); area.select(); say('请长按脚本代码，全选并复制。'); }
      }
    } catch (e) { say(e.message + '。若提示 404，请先更新 Worker；若尚未配置，请打开云备份设置。'); }
    finally { button.disabled = false; }
    return true;
  }
  return {action};
}
