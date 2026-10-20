'use strict';
const D=require('./domain');
const norm=q=>String(q||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
function prompt(previous={},empty=false){
 const search=previous.roomSearch||(['recommendation','availability','quote','room_detail'].includes(previous.intent)?previous:{});
 if(empty)return {question:'Bạn muốn mình hướng dẫn cách xem lại danh mục trên trang chủ không?',offer:null,search};
 if(!search.guestCount)return {question:'Bạn muốn mình gợi ý homestay và loại phòng cho bao nhiêu người?',offer:{step:'guests'},search};
 if(!search.checkIn||!search.checkOut)return {question:'Bạn dự định nhận và trả phòng ngày nào để mình gợi ý phòng phù hợp?',offer:{step:'dates'},search};
 return {question:'Bạn muốn ưu tiên mức giá hay tiện nghi nào khi chọn phòng?',offer:{step:'preferences'},search};
}
function followup(question,previous={},user={}){
 if((user.role!=='guest'&&!previous.publicInfo)||!previous.catalogOffer)return null;
 const q=norm(question),Data=require('./ai-data');let slots;
 if(previous.catalogOffer.step==='guests'&&/^\d{1,3}[.!?\s]*$/.test(q)){
  const guestCount=Number(q.replace(/[.!?\s]/g,''));if(guestCount<1||guestCount>100)D.fail('Bạn nhập số người từ 1 đến 100 nhé.');slots={guestCount};
 }else if(Data.extractGuests(question)!==undefined)slots={guestCount:Data.extractGuests(question)};
 else if(!/^(?:co|co nhe|dong y|duoc|ok|oke|goi y giup toi|tu van giup toi)[.!?\s]*$/.test(q)&&!Data.extractDates(question).length&&!require('./ai-preferences').hasRoomFollowup(question))return null;
 return {intent:'recommendation',catalogFollowup:true,...(slots?{slots}:{})};
}
module.exports={prompt,followup};
