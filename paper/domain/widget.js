import {WidgetModel} from '../widget-model.js';
import * as L from './ledger.js';

// Generated from the same immutable state as the ZIP, not from the selected UI month.
export function widgetSnapshot(ledgers, activeLedger, now = new Date()) {
  const asOf = L.localDate(now);
  return {
    format: 'starledger-widget', version: 1, backedUpAt: now.toISOString(), activeLedger,
    ledgers: Object.entries(ledgers).map(([name, state]) => {
      const day = Math.min(28, Math.max(1, Number(state.prefs.monthStartDay) || 1));
      const date = new Date(now.getFullYear(), now.getMonth() - (now.getDate() < day ? 1 : 0), 1);
      const y = date.getFullYear(), m = date.getMonth(), [start, end] = L.cycle(state, y, m);
      const rows = L.selectRows(state, {y, m}), totals = L.totals(state, rows), budget = L.budget(state, rows), f = L.financial(state);
      const all=L.selectRows(state), views=L.accountViews(state), today=L.localDate(now), monday=new Date(now);monday.setDate(now.getDate()-(now.getDay()+6)%7);
      const week=L.localDate(monday), yearRows=L.selectRows(state,{y,m:0,year:true}), yt=L.totals(state,yearRows);
      const total=(rs,type)=>{const t=L.totals(state,rs.filter(r=>r.type===type));return t.unknown?null:type==='收入'?t.income:t.expense};
      return {config:WidgetModel.normalize(state.prefs.widgetConfig), accounts:views.filter(a=>!a.p.hidden).map(a=>({name:a.name,currency:a.p.currency,value:a.calibrated&&!a.unconverted?L.round(a.net):null})),
        debt:f.ready?f.debt:null,income:total(rows,'收入'),monthNet:totals.unknown?null:totals.net,
        todayExpense:total(all.filter(r=>r.date.slice(0,10)===today),'支出'),weekExpense:total(all.filter(r=>r.date.slice(0,10)>=week&&r.date.slice(0,10)<=today),'支出'),
        yearIncome:total(yearRows,'收入'),yearExpense:total(yearRows,'支出'),yearNet:yt.unknown?null:yt.net,
        date:today,month:`${y}-${String(m+1).padStart(2,'0')}`,updated:now.toISOString().slice(0,16).replace('T',' ')+' UTC',budgetRatio:budget.has&&budget.value>0&&!budget.unknown?L.round(budget.spent/budget.value*100):null,
        name, currency: 'CNY', asOf, period: {start, end, label: `${y}-${String(m + 1).padStart(2, '0')}`},
        net: f.ready ? f.net : null, assets: f.ready ? f.assets : null,
        balanceReady: f.ready, expense: total(rows,'支出'), expenseUnknown: L.totals(state, rows.filter(r => r.type === '支出')).unknown,
        budget: budget.has ? budget.value : null, budgetSpent: budget.unknown?null:budget.spent,
        budgetLeft: budget.has&&!budget.unknown ? budget.left : null, budgetUnknown: budget.unknown};
    })
  };
}
