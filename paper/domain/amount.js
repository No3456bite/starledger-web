// Isolated original monetary rules from upstream 04f9f0b. No UI imports.
export function normalizeAmountExpression(value){
 return String(value??'')
  .replace(/\s+/g,'')
  .replace(/[＋]/g,'+')
  .replace(/[－–—-]/g,'−')
  .replace(/[xX*]/g,'×')
  .replace(/\//g,'÷')
  .replace(/，/g,'.');
}
export function amountNumberPattern(){return '[−]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)'}
export function amountSeed(value){
 let raw=normalizeAmountExpression(value);
 if(!raw)return '';
 if(new RegExp('^'+amountNumberPattern()+'$').test(raw)){
  let n=Number(raw.replace('−','-'));
  if(Number.isFinite(n))return Object.is(n,-0)?'0':String(n);
 }
 return raw;
}
export function amountSaveValue(value){
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
export function evaluateAmountExpression(value){
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
