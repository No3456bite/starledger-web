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
      return {name, currency: 'CNY', asOf, period: {start, end, label: `${y}-${String(m + 1).padStart(2, '0')}`},
        net: f.ready ? f.net : null, assets: f.ready ? f.assets : null,
        balanceReady: f.ready, expense: totals.expense, expenseUnknown: L.totals(state, rows.filter(r => r.type === '支出')).unknown,
        budget: budget.has ? budget.value : null, budgetSpent: budget.spent,
        budgetLeft: budget.has ? budget.left : null, budgetUnknown: budget.unknown};
    })
  };
}
