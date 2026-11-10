import {COLS,localDate,accountViews} from './ledger.js';
export function fixture(count=60,now=new Date()){
 const groups=['日常账户','储蓄与备用','信用账户','投资储备','旅行专项','家庭共享','往来借贷','归档账户'].map((name,i)=>({id:i?'group'+i:'daily',name}));
 const state={version:2,revision:0,rows:[],prefs:{mainName:'日常主账本',monthStartDay:1,budgets:{__global_monthly__:10000},accountGroups:groups,accountProfiles:{},accountOrder:{},books:['日常账本','旅行手记','家庭账本'],categories:{},appearance:'dark'}};
 const names=[];
 for(let i=0;i<count;i++){
  const g=Math.min(7,Math.floor(i/(count/8))),name=i===0?'招商银行':i===1?'支付宝':i===2?'美元账户':i===count-2?'家庭共同储备金 · 年度旅行与长期计划':groups[g].name+' '+String(i+1).padStart(2,'0');names.push(name);
  state.prefs.accountProfiles[name]={type:g===2?'credit':g===6?'personal':'stored',currency:i===2?'USD':'CNY',cnyRate:i===2?7.1:'',include:i<3,hidden:i===count-1,groupId:groups[g].id,note:i===count-2?'家庭长期共同计划':'',limit:g===2?30000:'',calibration:null};
  (state.prefs.accountOrder[groups[g].id]??=[]).push(name);
 }
 const bill=(date,type,category,subcategory,amount,account,extra={})=>{const id='sample-'+String(state.rows.length+1).padStart(4,'0');state.rows.push({...Object.fromEntries(COLS.map(k=>[k,''])),id,date:date+' 12:00:00',type,category,subcategory,amount:Number(amount).toFixed(2),account,currency:'人民币',book:'日常账本',created_at:date+'T12:00:00Z',updated_at:date+'T12:00:00Z',...extra})};
 const today=localDate(now),yesterday=localDate(new Date(now.getFullYear(),now.getMonth(),Math.max(1,now.getDate()-1)));
 bill(today,'支出','餐饮','咖啡',28,names[0],{merchant:'瑞幸咖啡'});bill(today,'支出','交通','地铁',6,names[1],{note:'地铁出行'});bill(yesterday,'收入','工作收入','工资',18500,names[0],{note:'工资收入'});bill(yesterday,'支出','日用','食品',186.5,names[1],{merchant:'盒马鲜生'});
 const thisMonth=localDate(new Date(now.getFullYear(),now.getMonth(),1));
 [['餐饮','正餐',2022],['交通','出行',931],['日用','用品',612],['居家','生活',704],['娱乐','休闲',603],['其他','日常',1191.7]].forEach(([c,s,n],i)=>bill(thisMonth,'支出',c,s,n,names[i%2],{note:c+' · 月内其他记录'}));
 const cats=['餐饮','交通','日用','居家','娱乐','其他','健康','学习','数码','运动','人情','宠物','家庭','办公','保险','通讯','汽车','园艺','公益','旅行'];
 for(let c=0;c<cats.length;c++)for(let s=0;s<12;s++)bill(localDate(new Date(now.getFullYear(),now.getMonth()-1,1+(c+s)%26)),'支出',cats[c],['日常','订阅','补充','维护','服务','材料','用品','设备','预约','会员','礼物','其他'][s],10+c+s,names[c%2],{note:'历史模拟记录'});
 const raw=accountViews(state);
 for(let i=0;i<names.length;i++){if(i===count-3)continue;const balance=i===0?86240:i===1?12680:i===2?4200:i%11===0?0:i>=16&&i<23?-1200-i*30:800+i*143.26;state.prefs.accountProfiles[names[i]].calibration={balance,baseline:raw.find(a=>a.name===names[i]).raw};}
 return state;
}
