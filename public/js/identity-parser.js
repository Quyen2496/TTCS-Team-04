(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.HS.identityParser=api;})(typeof window!=='undefined'?window:globalThis,()=>{
 'use strict';
 const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();
 const day=value=>{const v=String(value||'').trim();let y,m,d,match;if((match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v)))[,y,m,d]=match;else if((match=/^(\d{2})[\s/.-]?(\d{2})[\s/.-]?(\d{4})$/.exec(v)))[,d,m,y]=match;else return '';const iso=`${y}-${m}-${d}`,date=new Date(iso+'T00:00:00Z');return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===iso&&+y>=1900&&+y<=2200?iso:'';};
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const gender=v=>{const x=fold(v).trim();return /^(nam|male|m)$/.test(x)?'MALE':/^(nu|female|f)$/.test(x)?'FEMALE':'';};
 function valid(key,value){
  const x=String(value||'').trim();if(!x)return false;
  if(key==='idNumber')return /^(?:\d{9}|\d{12})$/.test(x);
  if(key==='birthDate')return !!day(x)&&day(x)<=today();
  if(key==='issueDate')return !!day(x)&&day(x)<=today();
  if(key==='expiryDate')return !!day(x);
  if(key==='gender')return ['MALE','FEMALE','OTHER'].includes(x);
  if(key==='guestName')return x.length>=2&&x.length<=255&&/\p{L}/u.test(x)&&!/\d|[<>]/.test(x);
  if(key==='documentType')return x==='NATIONAL_ID';
  return x.length<=(['guestAddress','hometown','issuedBy'].includes(key)?500:100)&&!/[<>\u0000]/.test(x);
 }
 function qr(value){
  const parts=String(value||'').trim().split('|');if(parts.length!==7||!/^\d{12}$/.test(parts[0])||parts[1]&&!/^\d{9}$/.test(parts[1]))return null;
  const fields={documentType:'NATIONAL_ID',idNumber:parts[0],guestName:parts[2].trim(),birthDate:day(parts[3]),gender:gender(parts[4]),guestAddress:parts[5].trim(),issueDate:day(parts[6])};
  if(!['idNumber','guestName','birthDate','gender','guestAddress'].every(k=>valid(k,fields[k])))return null;
  if(!valid('issueDate',fields.issueDate))delete fields.issueDate;return {source:'QR',fields};
 }
 function ocr(value){
  const text=String(value||'').normalize('NFC').replace(/\r/g,'').slice(0,20000),plain=fold(text),fields={};
  const labels=[['guestName','ho va ten|ho ten|full name'],['birthDate','ngay[, ]*thang[, ]*nam sinh|ngay sinh|date of birth'],['gender','gioi tinh|sex|gender'],['nationality','quoc tich|nationality'],['hometown','que quan|place of origin'],['guestAddress','noi thuong tru|noi cu tru|place of residence|residence'],['expiryDate','co gia tri den|date of expiry|expiry date'],['issueDate','ngay[, ]*thang[, ]*nam cap|ngay cap|date of issue'],['issuedBy','noi cap|issuing authority'],['idNumber','so dinh danh ca nhan|personal identification number|so cmnd|so cccd|id no\\.?|so(?=\\s*[:：])|no\\.(?=\\s*[:：0-9])']];
  const re=new RegExp(labels.map(([key,pattern])=>'(?<'+key+'>'+pattern+')').join('|'),'g'),hits=[...plain.matchAll(re)];
  for(let i=0;i<hits.length;i++){
   const hit=hits[i],key=Object.keys(hit.groups).find(k=>hit.groups[k]!==undefined),next=hits[i+1];
   let candidate=text.slice(hit.index+hit[0].length,next?.index??text.length).replace(/^[\s/:：|.-]+/,'').trim();
   // Bilingual labels follow one another; skip their empty intermediate spans.
   if(!candidate)continue;
   if(['birthDate','issueDate','expiryDate'].includes(key)){const match=candidate.match(/\b(?:\d{2}[\s/.-]\d{2}[\s/.-]\d{4}|\d{8}|\d{4}-\d{2}-\d{2})\b/);candidate=day(match?.[0]);}
   else if(key==='idNumber')candidate=candidate.match(/\b(?:\d{12}|\d{9})\b/)?.[0]||'';
   else if(key==='gender')candidate=gender(candidate.split(/\s|\n/)[0]);
   else candidate=candidate.split('\n').filter(x=>x.trim()).slice(0,key==='guestName'?1:3).join(', ').replace(/\s+/g,' ').trim();
   if(valid(key,candidate))fields[key]=candidate;
  }
  if(!fields.idNumber&&fields.guestName&&fields.birthDate){const ids=[...text.matchAll(/\b\d{12}\b/g)].map(x=>x[0]);if(new Set(ids).size===1)fields.idNumber=ids[0];}
  if(fields.idNumber)fields.documentType='NATIONAL_ID';return {source:'OCR',fields};
 }
 return {fold,day,gender,valid,qr,ocr};
});
