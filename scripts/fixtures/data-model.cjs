// Synthetic records only. Never put an exported user ledger in this directory.
const base = {category:'餐饮',subcategory:'正餐',account2:'',reimbursement:'',note:'',image:'',role:'',tags:'',currency:'人民币',merchant:'',book:'测试账本',extras:'',created_at:'2026-10-01T00:00:00.000Z'};
function bill(id,date,type,amount,account,account2='',other={}){
  return {...base,id,date,type,amount:String(amount),account,account2,updated_at:date.replace(' ','T')+'.000Z',...other};
}
const rows = [
  bill('income','2026-10-01 10:00:00','收入',100,'现金'),
  bill('expense','2026-10-02 10:00:00','支出',25,'现金'),
  bill('transfer','2026-10-03 10:00:00','转账',30,'现金','银行卡'),
  bill('loan','2026-10-04 10:00:00','借贷',10,'银行卡','朋友'),
  bill('adjust','2026-10-05 10:00:00','余额调整',0,'现金','',{extras:'{"delta":5}'}),
  bill('usd','2026-10-06 10:00:00','支出',2,'美元账户','',{currency:'美元'}),
  bill('missing-fx','2026-10-07 10:00:00','支出',3,'现金','',{currency:'美元'}),
];
module.exports = {bill,rows};
