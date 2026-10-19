'use strict';
const personal=new Set(['guestName','phone','email','idNumber','notes','internalNotes','guestAddress','nationality','companions','birthDate','gender','documentType','companionDetails','hometown','issueDate','expiryDate','issuedBy']);
const internal=new Set(['password','sessionVersion','fingerprint','requestKey','ip','changeRequests','operationRequests','financialRequests','leaseToken']);
function sanitize(value,{personalAllowed=true,fullDocuments=false}={}){
 if(Array.isArray(value))return value.map(x=>sanitize(x,{personalAllowed,fullDocuments}));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).filter(([k])=>!internal.has(k)&&(personalAllowed||!personal.has(k))).map(([k,v])=>[k,k==='idNumber'&&!fullDocuments&&v?'••••'+String(v).slice(-4):sanitize(v,{personalAllowed,fullDocuments})]));
}
module.exports={sanitize};
