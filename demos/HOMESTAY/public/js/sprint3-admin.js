'use strict';
HS.sprint3={
 async handle(action,id,{state,load,checkin}){
  if(!['change-booking','walk-in','change-history'].includes(action))return false;
  const e=HS.esc,m=HS.money,b=state.bookings?.find(b=>b.bookingCode===id);
  document.getElementById('sprint3-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='sprint3-dialog';dialog.className='dialog sprint-dialog';
  const title=action==='walk-in'?'Booking tại quầy':action==='change-history'?'Lịch sử thay đổi '+id:'Đổi ngày / loại phòng '+id;
  const types=state.roomTypes.filter(t=>t.active&&(!b||t.homestayId===b.homestayId));
  const field=(label,name,value='',type='text',required=true)=>`<div class="field"><label for="s3-${name}">${label}</label><input id="s3-${name}" name="${name}" type="${type}" value="${e(value)}" ${required?'required':''} ${type==='date'?`min="${HS.today()}"`:''} ${type==='number'?'min="1" max="100" step="1"':''}></div>`;
  const controls=`<div class="field"><label for="s3-type">Loại phòng</label><select name="roomTypeId" id="s3-type" required>${types.map(t=>`<option value="${t._id}" ${t._id===b?.roomTypeId?'selected':''}>${e(state.homestays.find(h=>h._id===t.homestayId)?.name)} · ${e(t.name)}</option>`).join('')}</select></div><div class="form-grid">${field('Ngày nhận','checkIn',b?.checkIn||HS.today(),'date')}${field('Ngày trả','checkOut',b?.checkOut||new Date(Date.parse(HS.today())+86400000).toISOString().slice(0,10),'date')}</div>`;
  const guestFields=action==='walk-in'?`${field('Số khách','guestCount',1,'number')}<div class="form-grid">${field('Họ tên khách','guestName')}${field('Điện thoại','phone','','tel')}</div>${field('Email (tuỳ chọn)','email','','email',false)}`:`<p>${e(b.guestName)} · ${b.guestCount} khách · ${e(HS.labels[b.status])}</p>`;
  dialog.innerHTML=`<h2>${e(title)}</h2><form class="stack">${action==='change-history'?'<div id="s3-history"></div>':guestFields+controls+'<button type="button" class="btn secondary" id="s3-preview-btn">Xem phòng & báo giá</button><section id="s3-preview" class="sprint-preview" aria-live="polite" hidden></section>'}<p id="s3-error" class="notice error" role="alert" hidden></p><div class="actions"><button type="button" class="btn secondary" id="s3-close">${action==='change-history'?'Đóng':'Huỷ'}</button>${action==='change-history'?'':'<button class="btn primary" id="s3-save" disabled>Xác nhận & lưu</button>'}</div></form>`;
  document.body.append(dialog);dialog.querySelector('#s3-close').onclick=()=>dialog.close();
  dialog.showModal();
  if(action==='change-history'){
   dialog.querySelector('#s3-history').innerHTML=(b.changeHistory||[]).slice().reverse().map(h=>`<article class="sprint-history"><strong>${e(h.actor)} · ${e(new Date(h.at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}))}</strong><p>${e(h.old.roomTypeName)} → ${e(h.new.roomTypeName)}</p><p>${e(h.old.checkIn)} – ${e(h.old.checkOut)} → ${e(h.new.checkIn)} – ${e(h.new.checkOut)}</p><p>${m(h.old.totalAmount)} → ${m(h.new.totalAmount)} · Cọc: ${m(h.depositAmount)}</p></article>`).join('')||'<p>Chưa có lần thay đổi nào.</p>';return true;
  }
  const form=dialog.querySelector('form'),error=dialog.querySelector('#s3-error'),box=dialog.querySelector('#s3-preview'),save=dialog.querySelector('#s3-save'),previewBtn=dialog.querySelector('#s3-preview-btn');
  let preview=null,busy=false;
  const key=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  const invalidate=()=>{preview=null;save.disabled=true;box.hidden=true;};
  form.addEventListener('input',ev=>{if(['checkIn','checkOut','guestCount','roomTypeId'].includes(ev.target.name))invalidate();});
  form.addEventListener('change',ev=>{if(['checkIn','checkOut','guestCount','roomTypeId'].includes(ev.target.name))invalidate();});
  previewBtn.onclick=async()=>{
   if(busy)return;error.hidden=true;invalidate();
   const fields=['checkIn','checkOut',...(action==='walk-in'?['guestCount']:[])];
   if(fields.some(name=>!form.elements[name].reportValidity()))return;
   busy=true;previewBtn.disabled=true;
   try{
    const payload=HS.formData(form);if(action==='walk-in')payload.guestCount=Number(payload.guestCount);
    preview=await HS.api(action==='walk-in'?'/api/admin/walk-in-bookings/preview':`/api/admin/bookings/${id}/change-preview`,{method:'POST',body:payload});
    const q=preview.quote,rooms=preview.availableRooms;
    box.innerHTML=`<div class="field"><label for="s3-room">Phòng còn trống trong toàn kỳ</label><select id="s3-room" name="roomId">${rooms.map(r=>`<option value="${r._id}" ${r._id===preview.roomId?'selected':''}>Phòng ${e(r.roomNumber)} · ${e(HS.labels[r.status])}</option>`).join('')}</select></div><dl>${(action==='walk-in'?[['Tổng tiền',m(q.totalAmount)],['Số đêm',q.numberOfNights]]:[['Tiền cũ',m(preview.old.totalAmount)],['Tiền mới',m(q.totalAmount)],['Chênh lệch',(preview.difference>0?'+':'')+m(preview.difference)],['Cọc đã nhận',m(preview.depositAmount)],['Còn phải trả',m(preview.balanceDue)]]).map(([label,value])=>`<div><dt>${label}</dt><dd>${e(value)}</dd></div>`).join('')}</dl>${preview.excessDeposit?`<p class="notice">Cọc dư ${m(preview.excessDeposit)}. Cọc vẫn giữ nguyên; chưa ghi nhận hoàn tiền.</p>`:''}<details><summary>Giá từng đêm</summary>${q.nightlyPrices.map(n=>`<p>${e(n.night)} · ${m(n.lineTotal)}</p>`).join('')}</details>`;
    if(action!=='walk-in')box.querySelector('select').onchange=async ev=>{
     save.disabled=true;previewBtn.disabled=true;busy=true;
     try{const next=await HS.api(`/api/admin/bookings/${id}/change-preview`,{method:'POST',body:{...HS.formData(form),roomId:ev.target.value}});preview=next;save.disabled=false;}catch(err){invalidate();error.textContent=err.message;error.hidden=false;}finally{busy=false;previewBtn.disabled=false;}
    };
    box.hidden=false;save.disabled=false;box.scrollIntoView({block:'start'});
   }catch(err){error.textContent=err.message;error.hidden=false;}finally{busy=false;previewBtn.disabled=false;}
  };
  form.onsubmit=async ev=>{
   ev.preventDefault();if(busy||!preview)return;error.hidden=true;busy=true;save.disabled=true;previewBtn.disabled=true;
   [...form.elements].filter(el=>el.tagName==='INPUT'||el.tagName==='SELECT').forEach(el=>el.setAttribute('aria-busy','true'));
   try{
    const payload={...HS.formData(form),requestKey:key};
    let output;
    if(action==='walk-in'){Object.assign(payload,{guestCount:Number(payload.guestCount),expectedTotalAmount:preview.quote.totalAmount,expectedSettingsVersion:preview.quote.settingsSnapshot.version});output=await HS.api('/api/admin/walk-in-bookings',{method:'POST',body:payload});}
    else{Object.assign(payload,{expectedVersion:preview.version,previewToken:preview.previewToken});output=await HS.api(`/api/admin/bookings/${id}/change`,{method:'POST',body:payload});}
    await load();
    if(action==='walk-in'){
     dialog.innerHTML=`<h2>Đã tạo booking tại quầy</h2><p>Mã booking để đọc cho khách:</p><strong class="sprint-code">${e(output.bookingCode)}</strong><p>${e(output.roomTypeName)} · ${e(output.checkIn)} – ${e(output.checkOut)}</p><p>Đã xác nhận · ${m(output.totalAmount)}</p><p>${payload.email?'Email đã được lưu trong hồ sơ.':'Khách không cung cấp email.'}</p><div class="actions"><button class="btn secondary" id="s3-done">Đóng</button><button class="btn primary" id="s3-checkin">Mở thủ tục nhận phòng</button></div>`;
     dialog.querySelector('#s3-done').onclick=()=>dialog.close();dialog.querySelector('#s3-checkin').onclick=()=>{dialog.close();checkin(output.bookingCode);};
    }else{dialog.close();HS.toast('Đã đổi booking và giữ nguyên tiền cọc.');}
   }catch(err){error.textContent=err.message;error.hidden=false;}
   finally{busy=false;save.disabled=false;previewBtn.disabled=false;[...form.elements].forEach(el=>el.removeAttribute('aria-busy'));}
  };
  return true;
 }
};
