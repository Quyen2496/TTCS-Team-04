'use strict';
const D=require('./domain');
function options(query={}){
 const page=Number(query.page??1),size=Number(query.pageSize??10),search=String(query.search||'').trim();
 if(!Number.isSafeInteger(page)||page<1||![10,20,50].includes(size)||search.length>200)D.fail('Trang, số dòng hoặc từ khoá tìm kiếm không hợp lệ.');
 return {page,size,search};
}
function paginate(rows,input,{reverse=false,personal=false,searchable=false}={}){
 const unfilteredTotal=rows.length,keys=personal?['bookingCode','guestName','email','status']:['bookingCode','status'],q=input.search.toLowerCase();
 let matching=searchable&&q?rows.filter(row=>keys.map(k=>row[k]).join(' ').toLowerCase().includes(q)):rows;
 if(reverse)matching=matching.slice().reverse();
 const total=matching.length,pages=Math.max(1,Math.ceil(total/input.size)),page=Math.min(input.page,pages),start=(page-1)*input.size;
 return {rows:matching.slice(start,start+input.size),pagination:{page,size:input.size,total,unfilteredTotal,pages,start:total?start+1:0,end:Math.min(start+input.size,total)}};
}
module.exports={options,paginate};
