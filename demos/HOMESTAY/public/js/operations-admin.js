'use strict';
HS.operations={
 from:HS.today(),
 key:()=>Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join(''),
 async render(page,{content,state,button}){
  const e=HS.esc;
  if(page==='housekeeping'){
   const rooms=await HS.api('/api/admin/housekeeping');
   content.innerHTML=`<section class="card"><h2>Phòng cần dọn</h2><p>Ưu tiên phòng có khách đến hôm nay.</p><div class="cleaning-grid">${rooms.map(r=>`<article class="cleaning-card"><h3>Phòng ${e(r.roomNumber)} · Tầng ${r.floor}</h3>${r.arrivalToday?'<p class="status">Có khách nhận hôm nay</p>':''}<div class="button-row">${button('Đã sạch','room-clean',r._id,'primary')}${button('Báo sự cố','room-incident',r._id,'danger')}</div></article>`).join('')||'<p>Không có phòng trống bẩn cần dọn.</p>'}</div></section><section class="card section-gap"><h2>Báo sự cố phòng trống</h2><p>Phòng đang có khách cần chuyển khách trước.</p><div class="cleaning-grid">${state.rooms.filter(r=>r.status!=='OCCUPIED').map(r=>`<article class="cleaning-card"><h3>Phòng ${e(r.roomNumber)}</h3><p>${e(HS.labels[r.status])}</p>${button('Báo sự cố','room-incident',r._id,'danger')}</article>`).join('')}</div></section>`;return true;
  }
  if(page==='board'){
   const started=performance.now(),board=await HS.api('/api/admin/room-board?from='+this.from+'&days=14');
   content.innerHTML=`<section class="card"><div class="toolbar"><label for="board-from">Từ ngày</label><input id="board-from" type="date" value="${this.from}">${button('Xem 14 ngày','board-refresh','','primary')}</div><p>Chạm booking để xem hồ sơ. Ngày trả phòng không chiếm một đêm.</p><div class="board-legend">${['PENDING','CONFIRMED','CHECKED_IN','MAINTENANCE','AVAILABLE'].map(k=>`<span class="board-${k}">${e(HS.labels[k]||'Trống')}</span>`).join('')}</div><div class="table-scroll room-board" tabindex="0" aria-label="Sơ đồ phòng 14 ngày"><table><thead><tr><th>Phòng / loại</th>${board.dates.map(d=>`<th>${e(d.slice(5))}</th>`).join('')}</tr></thead><tbody>${board.rooms.map(r=>`<tr><th>${e(r.roomNumber)}<br><small>${e(r.roomTypeName)}</small></th>${r.cells.map(c=>`<td class="board-${c.status}">${c.bookingCode?`<button type="button" class="board-cell" data-action="details" data-id="${e(c.bookingCode)}" title="${e(c.guestName||'')} · ${e(c.bookingCode)}" aria-label="${e(c.date)} · ${e(c.guestName||'')} · ${e(c.bookingCode)}">${e(HS.labels[c.status])}<small>${e(c.bookingCode)}${c.maintenance?' · Có bảo trì':''}</small></button>`:`<span>${e(c.status==='AVAILABLE'?'Trống':'Bảo trì')}</span>`}</td>`).join('')}</tr>`).join('')}</tbody></table></div><p class="muted" id="board-timing"></p></section>`;
   content.querySelector('#board-timing').textContent=`${board.rooms.length} phòng × ${board.dates.length} ngày · ${(performance.now()-started).toFixed(0)} ms`;return true;
  }
  return false;
 },
 async alerts(content){
  const alerts=await HS.api('/api/admin/shortage-alerts?days=14');
  const panel=document.createElement('section');panel.className='card section-gap';
  panel.innerHTML='<h2>Cảnh báo thiếu phòng · 14 ngày tới</h2>'+(alerts.length?alerts.map(a=>`<article class="notice error"><strong>${HS.esc(a.date)} · ${HS.esc(a.roomTypeName)}</strong><p>${a.bookingCount} booking / ${a.availableCount} phòng khả dụng</p><div class="button-row">${a.bookings.map(b=>`<button class="btn secondary small-btn" data-action="details" data-id="${HS.esc(b.bookingCode)}">${HS.esc(b.bookingCode)} · ${HS.esc(b.guestName)}</button>`).join('')}</div></article>`).join(''):'<p>Không có cảnh báo thiếu phòng.</p>');content.prepend(panel);
 },
 async handle(action,id,ctx){
  const {state,editor,request,load,field,select}=ctx,e=HS.esc,m=HS.money;
  if(action==='board-refresh'){this.from=document.getElementById('board-from').value;await load();return true;}
  const b=state.bookings?.find(b=>b.bookingCode===id),key=this.key();
  const post=(act,body)=>request(`/api/admin/bookings/${id}/${act}`,'POST',{...body,requestKey:key,expectedVersion:b.version||0});
  if(action==='details'){
   const r=state.rooms.find(r=>r._id===b.roomId);
   const rows=[['Họ tên',b.guestName],['Email',b.email||'Không cung cấp'],['Điện thoại',b.phone],['Nguồn',b.source==='COUNTER'?'Tại quầy':'Trực tuyến'],['Trạng thái',HS.labels[b.status]],['Loại phòng',b.roomTypeName],['Phòng',r?.roomNumber],['Đã gán',b.assignedAt?'Có':'Chưa'],['Kỳ lưu trú',b.checkIn+' – '+b.checkOut],['Số khách',b.guestCount],['Khách đi cùng',(b.companions||[]).join(', ')||'—'],['Giấy tờ',(b.documentType==='PASSPORT'?'Hộ chiếu: ':'CCCD/CMND: ')+(b.idNumber||'Chưa ghi nhận')],['Ngày sinh',b.birthDate||'Chưa cung cấp'],['Giới tính',HS.genderLabel(b.gender)],['Quốc tịch',b.nationality||'Chưa cung cấp'],['Địa chỉ',b.guestAddress||'Chưa cung cấp'],['Nhận thực tế',HS.dateTime(b.actualCheckIn)],['Trả thực tế',HS.dateTime(b.actualCheckOut)],['Tổng tiền',m(b.totalAmount)],['Cọc',m(b.depositAmount)],['Phải hoàn khi huỷ',m(b.refundAmount)],['Lý do huỷ',b.cancelReason||'—'],['Ghi chú',b.notes||'—'],['Nội bộ',b.internalNotes||'—']];
   editor('Booking '+id,`<dl class="lookup-details">${rows.map(([k,v])=>`<div><dt>${e(k)}</dt><dd>${e(v)}</dd></div>`).join('')}</dl>${HS.companionInfo(b.companionDetails)}<h3>Sổ cọc</h3>${this.ledger(b)}<h3>Lịch sử phòng</h3>${(b.roomHistory||[]).map(h=>`<p>${e(state.rooms.find(r=>r._id===h.oldRoomId)?.roomNumber)} → ${e(state.rooms.find(r=>r._id===h.newRoomId)?.roomNumber)} · ${e(h.actor)} · ${e(new Date(h.at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}))}<br>${e(h.reason)}</p>`).join('')||'<p>Chưa có lần gán/đổi.</p>'}`,()=>Promise.resolve(),true);return true;
  }
  if(action==='deposit'||action==='adjust-deposit'){
   const adjust=action==='adjust-deposit';
   const html=(adjust?select('Bút toán cần điều chỉnh','originalEntryId',(b.depositLedger||[]).map(x=>[x._id,`${m(x.amount)} · ${x.receivedAt} · ${x.reference||x.kind}`]),b.depositLedger?.[0]?._id)+field('Lý do điều chỉnh','reason'):'')+field(adjust?'Số tiền điều chỉnh (+/− VND)':'Tiền cọc (VND)','amount','','number')+select('Hình thức','method',[['CASH','Tiền mặt'],['TRANSFER','Chuyển khoản']],'CASH')+field('Ngày nhận','receivedAt',HS.today(),'date')+field('Mã tham chiếu (bắt buộc khi chuyển khoản)','reference','','text',false)+`<p>Đã nhận: ${m(b.depositAmount)} / ${m(b.totalAmount)}. Điều chỉnh dùng bút toán mới, giữ nguyên bản gốc.</p>`+this.ledger(b);
   editor((adjust?'Điều chỉnh tiền cọc ':'Ghi tiền cọc ')+id,html,payload=>post(adjust?'deposit-adjustment':'deposit',{...payload,amount:Number(payload.amount)}));if(adjust)document.getElementById('edit-amount').removeAttribute('min');return true;
  }
  if(action==='assign-room'){
   const rooms=await HS.api(`/api/admin/bookings/${id}/room-options`);
   editor('Gán / đổi phòng '+id,select('Phòng cùng loại còn trống toàn kỳ','roomId',rooms.map(r=>[r._id,`${r.roomNumber} · ${HS.labels[r.status]}`]),b.roomId)+field('Lý do (bắt buộc khi đổi phòng)','reason','','text',false),payload=>post('assign-room',payload));return true;
  }
  if(action==='confirm'){editor('Xác nhận '+id,'<p>Xác nhận booking và gỡ thời hạn giữ chỗ.</p>',()=>post('confirm',{}));return true;}
  if(action==='cancel'){
   const p=await HS.api(`/api/admin/bookings/${id}/cancel-preview`);
   editor('Huỷ '+id,select('Lý do','reason',[['Khách thay đổi kế hoạch','Khách thay đổi kế hoạch'],['Không liên hệ được khách','Không liên hệ được khách'],['Lỗi đặt phòng','Lỗi đặt phòng']],'Khách thay đổi kế hoạch')+`<p>Cọc: ${m(p.depositAmount)} · Hoàn ${p.refundPercent}% = <strong>${m(p.refundAmount)}</strong></p><p>Ghi nhận số tiền phải hoàn. Tiền được hoàn thủ công.</p>`,payload=>request(`/api/admin/bookings/${id}/cancel`,'POST',{...payload,requestKey:key,expectedVersion:p.version,expectedRefundAmount:p.refundAmount}));return true;
  }
  if(action==='checkin'){
   const local=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()),early=local<'14:00';
   const room=state.rooms.find(r=>r._id===b.roomId),gender=[['','Chưa cung cấp'],['MALE','Nam'],['FEMALE','Nữ'],['OTHER','Khác']],documents=[['NATIONAL_ID','CCCD / CMND'],['PASSPORT','Hộ chiếu']];
   const lead='<fieldset class="guest-section"><legend>Khách đứng tên</legend><div class="form-grid">'+field('Họ tên khách đứng tên','guestName',b.guestName)+field('Điện thoại','phone',b.phone,'tel')+field('Email','email',b.email,'email',false)+field('Ngày sinh (không bắt buộc)','birthDate',b.birthDate,'date',false)+select('Giới tính','gender',gender,b.gender||'')+field('Quốc tịch','nationality',b.nationality||'Việt Nam','text',false)+select('Loại giấy tờ','documentType',documents,b.documentType||'NATIONAL_ID')+field('Số CCCD / CMND / hộ chiếu','idNumber',b.idNumber)+'</div>'+field('Địa chỉ thường trú','guestAddress',b.guestAddress,'text',false)+'</fieldset>';
   const companions=Array.from({length:b.guestCount-1},(_,i)=>{const p=b.companionDetails?.[i]||{},prefix='companion'+i;return '<fieldset class="guest-section"><legend>Khách đi cùng '+(i+1)+'</legend><div class="form-grid">'+field('Họ tên',prefix,b.companions?.[i])+field('Ngày sinh',prefix+'BirthDate',p.birthDate,'date',false)+select('Giới tính',prefix+'Gender',gender,p.gender||'')+field('Quốc tịch',prefix+'Nationality',p.nationality||'Việt Nam','text',false)+select('Loại giấy tờ',prefix+'DocumentType',documents,p.documentType||'NATIONAL_ID')+field('Số giấy tờ (nếu có)',prefix+'IdNumber',p.idNumber,'text',false)+'</div>'+field('Địa chỉ thường trú',prefix+'Address',p.guestAddress,'text',false)+'</fieldset>';}).join('');
   editor('Nhận phòng '+id,`<div class="booking-summary"><strong>${e(b.roomTypeName)} · Phòng ${e(room?.roomNumber||'Chưa gán')}</strong><br>${e(b.checkIn)} → ${e(b.checkOut)} · ${b.numberOfNights} đêm · ${b.guestCount} khách<br>Tổng: ${m(b.totalAmount)} · Đã cọc: ${m(b.depositAmount)} · Còn lại: ${m(b.totalAmount-(b.depositAmount||0))}</div>`+lead+companions+field('Ghi chú nội bộ','internalNotes',b.internalNotes,'text',false)+(early?'<p class="notice">Đang nhận phòng trước 14:00.</p><label class="checkbox-label"><input type="checkbox" name="earlyAccepted" value="yes" required>Tiếp tục nhận sớm</label>':'')+'<p>Tên và giấy tờ khách đứng tên, tên đủ khách đi cùng là bắt buộc. Bổ sung thông tin còn lại khi khách cung cấp.</p>',payload=>post('checkin',{...payload,companions:Array.from({length:b.guestCount-1},(_,i)=>payload['companion'+i]),companionDetails:Array.from({length:b.guestCount-1},(_,i)=>{const p='companion'+i;return {birthDate:payload[p+'BirthDate'],gender:payload[p+'Gender'],nationality:payload[p+'Nationality'],documentType:payload[p+'DocumentType'],idNumber:payload[p+'IdNumber'],guestAddress:payload[p+'Address']};}),earlyAccepted:payload.earlyAccepted==='yes'}));return true;
  }
  if(action==='checkout'){editor('Trả phòng '+id,'<p>Xác nhận trả phòng, phòng sẽ chuyển sang trống bẩn.</p>',()=>post('checkout',{}));return true;}
  if(action==='room-clean'){await request(`/api/admin/rooms/${id}/clean`,'POST',{});HS.toast('Đã ghi nhận phòng sạch.');await load();return true;}
  if(action==='room-incident'){
   editor('Báo sự cố phòng '+state.rooms.find(r=>r._id===id)?.roomNumber,field('Ghi chú sự cố','note')+field('Bắt đầu bảo trì','startDate',HS.today(),'date')+field('Kết thúc bảo trì (không chiếm ngày này)','endDate',new Date(Date.parse(HS.today())+86400000).toISOString().slice(0,10),'date'),payload=>request(`/api/admin/rooms/${id}/incident`,'POST',{...payload,requestKey:key}));return true;
  }
  return false;
 },
 ledger(b){return (b.depositLedger||[]).map(x=>`<article class="sprint-history"><strong>${HS.money(x.amount)} · ${x.kind==='ADJUSTMENT'?'Điều chỉnh':'Cọc'} · ${x.method==='CASH'?'Tiền mặt':'Chuyển khoản'}</strong><p>${HS.esc(x.receivedAt)} · ${HS.esc(x.reference)} · ${HS.esc(x.actor)}</p><p>${HS.esc(x.reason)}</p></article>`).join('')||'<p>Chưa có bút toán cọc.</p>';}
};
