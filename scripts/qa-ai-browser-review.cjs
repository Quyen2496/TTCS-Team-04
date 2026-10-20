'use strict';
// Independent checks against public facts read directly from Atlas, never
// generating expected answers with the assistant's router or response code.
const fs=require('node:fs/promises'),path=require('node:path'),mongoose=require('mongoose');require('dotenv').config({path:path.join(__dirname,'../.env')});
const root=path.join(__dirname,'../docs/ai-qa'),norm=q=>String(q||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase();
(async()=>{
 try{
  await mongoose.connect(process.env.MONGODB_URI,{serverSelectionTimeoutMS:6000});
  const fields=['homestays._id','homestays.name','homestays.active','homestays.style','homestays.landscapes','homestays.experiences','homestays.highlights','homestays.settings.cancellationRules','homestays.settings.payment.enabled','homestays.settings.payment.provider','settings.cancellationRules','settings.payment.enabled','settings.payment.provider','roomTypes._id','roomTypes.name','roomTypes.active','roomTypes.homestayId','roomTypes.amenityIds','roomTypes.maxCapacity','amenities._id','amenities.name','amenities.active','rooms._id','rooms.roomTypeId','rooms.homestayId','rooms.status','rooms.incidents','bookings.roomId','bookings.status','bookings.roomSegments','bookings.checkIn','bookings.checkOut','bookings.holdExpiresAt'];
  const {data:s}=await mongoose.connection.collection('homestay_state').findOne({_id:'state'},{projection:Object.fromEntries(fields.map(f=>['data.'+f,1]))});
  const h=s.homestays.find(h=>h.name==='Mộc Miên Đà Lạt Homestay'),type=s.roomTypes.find(t=>t.homestayId===h._id&&t.name==='Phòng đôi Mộc Miên'),rules=h._id===s.homestays[0]._id?s.settings.cancellationRules:h.settings?.cancellationRules||s.settings.cancellationRules;
  const amenities=s.amenities.filter(a=>a.active&&type.amenityIds.includes(a._id)).map(a=>a.name).sort();
  for(const label of process.argv.slice(2)){
   const file=path.join(root,label,'results.json'),doc=JSON.parse(await fs.readFile(file,'utf8'));
   for(const c of doc.results){const r=c.result,a=norm(r.answer),checks=[],check=(ok,message)=>checks.push({ok:!!ok,message});check(c.http===200,'Câu hỗ trợ công khai không bị chặn');
    if(c.id==='A1')check(!r.rows.length&&a.includes('homestay nao'),'Chỉ hỏi cơ sở còn thiếu');
    if(['A2','A3'].includes(c.id))check(JSON.stringify(r.rows)===JSON.stringify(rules.map(x=>[h.name,x.hoursBefore,x.refundPercent])),'Đúng chính sách hoàn cọc của cơ sở theo Atlas, không phải tỷ lệ đặt cọc');
    if(c.id==='A4'){const expected=s.homestays.filter(h=>h.active).flatMap(h=>(h._id===s.homestays[0]._id?s.settings.cancellationRules:h.settings?.cancellationRules||s.settings.cancellationRules).map(x=>[h.name,x.hoursBefore,x.refundPercent]));check(JSON.stringify(r.rows)===JSON.stringify(expected),'Tất cả cơ sở công khai có chính sách riêng đúng Atlas');}
    if(c.id.startsWith('A'))check(/chinh sach.*chot|chinh sach da chot|homestay nao/.test(a),'Phân biệt chính sách hiện tại và booking hoặc hỏi đúng cơ sở');
    if(c.id==='B'){check(a.includes('le tan')&&a.includes('chu homestay'),'Hướng dẫn liên hệ đúng bộ phận');check(a.includes('khong tu')&&a.includes('chua tao phieu'),'Không tự sửa hoặc báo đã tạo sự cố');check(a.includes('chua xac dinh')&&a.includes('boi thuong'),'Không kết luận trách nhiệm hay bồi thường');}
    if(c.id==='C')check(a.includes('bua sang')&&a.includes('homestay nao')&&!a.includes('tra so lieu'),'Hỏi đúng cơ sở khi hỏi bữa sáng');
    if(c.id==='D'){check(r.detail?.name===type.name&&r.detail.homestayName===h.name,'Đúng đối tượng phòng/cơ sở');check(JSON.stringify([...(r.detail?.amenities||[])].sort())===JSON.stringify(amenities),'Danh sách tiện nghi khớp nguồn Atlas');check(/^tien nghi cua/.test(a),'Trả thẳng tiện nghi');}
    if(c.id==='E'){
     const from='2026-10-20',to='2026-10-22',types=s.roomTypes.filter(t=>t.active&&t.homestayId===h._id&&t.maxCapacity>=2);
     const expected=types.map(t=>{const count=s.rooms.filter(room=>room.roomTypeId===t._id&&!((room.incidents||[]).some(i=>i.startDate<to&&(i.resolvedDate||i.endDate)>from)||(!room.incidents?.length&&room.status==='MAINTENANCE'))&&!s.bookings.some(b=>['PENDING','CONFIRMED','CHECKED_IN'].includes(b.status)&&!(b.status==='PENDING'&&Date.parse(b.holdExpiresAt)<=Date.now())&&(b.roomSegments||[{roomId:b.roomId,checkIn:b.checkIn,checkOut:b.checkOut}]).some(seg=>seg.roomId===room._id&&seg.checkIn<to&&seg.checkOut>from))).length;return {name:t.name,count};}).filter(t=>t.count>0);
     check(r.intent==='availability'&&JSON.stringify(r.rows.map(row=>({name:row[1],count:row[2]})).sort((a,b)=>a.name.localeCompare(b.name)))===JSON.stringify(expected.sort((a,b)=>a.name.localeCompare(b.name))),'Phòng trống khớp đếm độc lập từ phòng, bảo trì và booking Atlas');check(a.includes(from)&&a.includes(to)&&a.includes('2 khach'),'Không hỏi lại ngày/số khách');
    }
    if(c.id==='F')check(a.includes('netflix')&&a.includes('youtube premium')&&/khong xac nhan|chua.*xac nhan/.test(a),'Không suy thuê bao trả phí từ Smart TV');
    if(c.id==='G')check(a.includes('apple pay')&&a.includes('google pay')&&a.includes('chua duoc trien khai')&&a.includes('qr'),'Trả đủ phương thức; không suy ví điện tử từ QR');
    if(c.id==='V1')check(JSON.stringify(r.rows)===JSON.stringify(rules.map(x=>[h.name,x.hoursBefore,x.refundPercent])),'Không dấu và đảo thứ tự tên vẫn trả đúng chính sách nguồn');
    if(['V2','V6'].includes(c.id)){const breakfastEvidence=[...(h.experiences||[]),...(h.highlights||[])].some(v=>/an sang|bua sang/.test(norm(v)));check(r.rows?.length===1&&r.rows[0][0]===h.name&&a.includes('bua sang'),'Đúng cơ sở và đúng dịch vụ');check(breakfastEvidence&&a.includes('co thong tin cong khai'),'Phục vụ bữa sáng có bằng chứng riêng');check(a.includes('chua co thong tin')&&a.includes('phu phi chua'),'Không suy bao gồm trong giá hoặc tự đặt mức phí');}
    if(c.id==='V3')check(a.includes('netflix: chua')&&a.includes('youtube premium: chua'),'Tài khoản trả phí chưa được xác nhận');
    if(c.id==='V4'){check(r.rows.filter(row=>row[1]!=='Bữa sáng').length===rules.length&&r.rows.some(row=>row[1]==='Bữa sáng'),'Trả đủ huỷ/hoàn tiền và bữa sáng');check(r.rows.every(row=>row[0]===h.name),'Câu nhiều ý không đổi cơ sở');}
    if(c.id==='V5')check(a.includes('apple pay va google pay chua')&&a.includes('co chuyen khoan qr'),'Tách ví chưa triển khai và QR được bật thực tế');
    if(c.id==='V7')check(r.detail?.name===type.name&&JSON.stringify([...(r.detail?.amenities||[])].sort())===JSON.stringify(amenities),'Sau chủ đề sự cố vẫn đọc đúng tiện nghi phòng hiện tại');
    if(c.id==='V8'){check(r.cards?.length&&r.cards.every(card=>card.guestCount===2),'Đề xuất đúng hai người');check(r.cards?.every(card=>{const h=s.homestays.find(h=>h._id===card.homestayId);return h&&((h.landscapes||[]).includes('mountain')||/nui|doi|cao nguyen/.test(norm(h.style)));}),'Phòng trên núi có bằng chứng từ thông tin cơ sở thật');}
    c.checks=checks;c.verdict=checks.every(c=>c.ok)?'Đạt':'Lỗi';
   }
   doc.review={at:new Date().toISOString(),source:'Atlas projection read only; independent public facts and availability arithmetic',passed:doc.results.filter(c=>c.verdict==='Đạt').length,total:doc.results.length,expectedCancellation:rules,expectedAmenities:amenities};await fs.writeFile(file,JSON.stringify(doc,null,2));console.log(label,JSON.stringify(doc.review));
  }
 }finally{await mongoose.disconnect();}
})().catch(e=>{console.error(e.name+': '+e.message.replace(/mongodb[^\s]+/g,'[redacted]'));process.exitCode=1;});
