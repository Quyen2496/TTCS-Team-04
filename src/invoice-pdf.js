'use strict';
const path=require('node:path');
const small=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín'];
function triplet(n,full){const h=Math.floor(n/100),t=Math.floor(n%100/10),u=n%10;const parts=[];if(h||full)parts.push(small[h]+' trăm');if(t>1)parts.push(small[t]+' mươi');else if(t===1)parts.push('mười');else if((h||full)&&u)parts.push('lẻ');if(u)parts.push(u===1&&t>1?'mốt':u===5&&t>0?'lăm':small[u]);return parts.join(' ');}
function moneyInWords(n){
 if(!Number.isSafeInteger(n)||n<0||n>10000000000)throw Error('Tiền không hợp lệ.');if(!n)return 'Không đồng';
 const groups=[];while(n){groups.push(n%1000);n=Math.floor(n/1000);}const units=['','nghìn','triệu','tỷ'];const parts=[];
 for(let i=groups.length-1;i>=0;i--)if(groups[i])parts.push(triplet(groups[i],i<groups.length-1)+' '+units[i]);
 const text=parts.join(' ').replace(/\s+/g,' ').trim();return text[0].toUpperCase()+text.slice(1)+' đồng';
}
function pdf(invoice){return new Promise((resolve,reject)=>{
 const PDFDocument=require('pdfkit'),p=invoice.settlement,doc=new PDFDocument({size:'A4',margin:40,bufferPages:true,info:{Title:'Hoá đơn '+invoice.number,Author:invoice.homestay.name,CreationDate:new Date(invoice.issuedAt),ModDate:new Date(invoice.issuedAt)}}),chunks=[];
 doc.on('data',c=>chunks.push(c));doc.on('error',reject);doc.on('end',()=>resolve(Buffer.concat(chunks)));
 try{
  doc.font(path.join(__dirname,'../public/assets/fonts/dejavu-sans.ttf'));
  const W=515,bottom=770,money=n=>new Intl.NumberFormat('vi-VN').format(n)+' đ';
  function heading(){doc.fontSize(17).fillColor('#225c49').text('HOÁ ĐƠN THANH TOÁN',40,40,{width:W});doc.fontSize(9).fillColor('#333').text('Số: '+invoice.number+' · Booking '+invoice.bookingCode);doc.moveDown(.5);}
  function columns(){const y=doc.y;doc.rect(40,y,W,25).fill('#eaf3ee');doc.fillColor('#183d32').fontSize(9).text('Khoản tiền',46,y+7,{width:235});doc.text('SL × đêm',285,y+7,{width:60});doc.text('Đơn giá',348,y+7,{width:85,align:'right'});doc.text('Thành tiền',435,y+7,{width:114,align:'right'});doc.y=y+29;}
  function nextPage(){doc.addPage();heading();columns();}
  heading();doc.text(invoice.homestay.name);doc.text(invoice.homestay.address||'Chưa cung cấp địa chỉ');if(invoice.homestay.phone)doc.text('Liên hệ: '+invoice.homestay.phone);
  doc.moveDown().text('Khách: '+invoice.guestName).text('Phòng '+invoice.roomNumber+' · '+invoice.roomTypeName).text('Lưu trú: '+invoice.checkIn+' → '+invoice.checkOut).text('Trả thực tế: '+new Date(invoice.actualCheckOut).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}));doc.moveDown();columns();
  for(const line of p.lines){doc.fontSize(9);const text=line.label+(line.note?' · '+line.note:'')+(line.reason?' · Lý do giá: '+line.reason:'');const height=Math.max(31,doc.heightOfString(text,{width:230})+16);if(doc.y+height>bottom)nextPage();const y=doc.y;doc.fillColor('#333').text(text,46,y+6,{width:230});doc.text(String(line.quantity)+' × '+line.nights,285,y+6,{width:60});doc.text(money(line.unitPrice),348,y+6,{width:85,align:'right'});doc.text(money(line.amount),435,y+6,{width:114,align:'right'});doc.moveTo(40,y+height).lineTo(555,y+height).strokeColor('#dce5df').stroke();doc.y=y+height+2;}
  if(doc.y+190>bottom){doc.addPage();heading();}doc.moveDown();
  for(const [label,value] of [['Tổng cộng',p.total],['Cọc đã nhận',p.deposit],['Thu khi trả phòng',p.paid.amount],['Cọc dư phải hoàn',p.refundDue]])doc.fontSize(10).text(label+': '+money(value),40,doc.y,{width:W,align:'right'});
  doc.moveDown().fontSize(9).text('Bằng chữ: '+moneyInWords(p.total),40,doc.y,{width:W});doc.text('Quyết toán: '+(p.paid.method==='TRANSFER'?'Chuyển khoản':'Tiền mặt')+(p.paid.reference?' · '+p.paid.reference:''),{width:W});
  if(p.earlyReason)doc.text('Trả sớm, giữ đủ đêm đã đặt: '+p.earlyReason,{width:W});
  doc.moveDown().fontSize(8).fillColor('#666').text('Chứng từ thanh toán nội bộ - không phải hoá đơn điện tử thuế.',{width:W});
  const pages=doc.bufferedPageRange();for(let i=0;i<pages.count;i++){doc.switchToPage(i);doc.page.margins.bottom=0;doc.fontSize(8).fillColor('#666').text(invoice.number+' · Trang '+(i+1)+'/'+pages.count,40,802,{width:W,align:'right',lineBreak:false});}doc.end();
 }catch(e){doc.destroy();reject(e);}
});}
module.exports={moneyInWords,pdf};
