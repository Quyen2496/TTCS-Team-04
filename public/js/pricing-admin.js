'use strict';
HS.pricingAdmin = (() => {
  const e = HS.esc, money = HS.money;
  const labels = {AUTO:'Tự động theo thứ trong tuần', WEEKDAY:'Ngày thường', SATURDAY:'Thứ Bảy', SUNDAY:'Chủ nhật', EVENT:'Lễ / sự kiện'};
  let month = HS.today().slice(0, 7), typeId = '';
  const input = (label, name, value = '', type = 'text', required = true) => `<div class="field"><label for="price-${name}">${e(label)}</label><input id="price-${name}" name="${name}" type="${type}" value="${e(value)}" ${required?'required':''} ${type==='number'?'min="1" step="1"':''}></div>`;
  const select = (label, name, options, selected) => `<div class="field"><label for="price-${name}">${e(label)}</label><select id="price-${name}" name="${name}">${options.map(([value,text])=>`<option value="${e(value)}" ${selected===value?'selected':''}>${e(text)}</option>`).join('')}</select></div>`;
  const button = (text, action, id = '', cls = 'secondary') => `<button type="button" class="btn ${cls} small-btn" data-action="${action}" data-id="${e(id)}">${text}</button>`;
  const dateLabel = date => date.split('-').reverse().join('/');
  const rateFields = t => `<div class="form-grid">${input('Ngày thường · Thứ Hai–thứ Sáu (VND)','weekdayPrice',t.weekdayPrice,'number')}${input('Thứ Bảy (VND)','saturdayPrice',t.saturdayPrice??t.weekendPrice,'number')}${input('Chủ nhật (VND)','sundayPrice',t.sundayPrice??t.weekendPrice,'number')}${input('Lễ / sự kiện (VND)','eventPrice',t.eventPrice,'number')}</div><p class="admin-note">Giá thứ Bảy, Chủ nhật và lễ / sự kiện phải cao hơn giá ngày thường. Giá này áp dụng cho từng đêm của loại phòng.</p>`;

  async function render(state) {
    if (!state.roomTypes.length) return '<p>Thêm loại phòng trước khi cấu hình lịch giá.</p>';
    if (!state.roomTypes.some(t=>t._id===typeId)) typeId=state.roomTypes[0]._id;
    const data=await HS.api('/api/admin/pricing/calendar?'+new URLSearchParams({month,roomTypeId:typeId}));
    const rates=data.rates;
    const offset=(new Date(month+'-01T00:00:00Z').getUTCDay()+6)%7;
    const days=data.days.map(d=>`<button type="button" class="price-day kind-${d.dayKind.toLowerCase()}" data-action="price-day" data-id="${d.night}" aria-label="Chỉnh ${dateLabel(d.night)}: ${e(d.label)}, ${e(money(d.basePrice))}"><span class="day-number">${Number(d.night.slice(-2))}<span class="day-full-date">/${d.night.slice(5,7)}</span></span><span class="daily-kind">${e(d.dayKind==='EVENT'?d.eventName:labels[d.dayKind])}</span><strong>${money(d.basePrice)}</strong><span class="day-source">${d.customPrice?'Giá riêng':d.overrideApplied?'Đã đặt loại ngày':'Tự động'}</span></button>`).join('');
    return `<div class="toolbar"><div><h2>Lịch giá & ngày sự kiện</h2><p class="muted">Chọn ngày để đặt sự kiện, đổi thành ngày thường hoặc nhập giá riêng.</p></div>${button('Đặt ngày / khoảng ngày','price-range','','primary')}</div>
      <div class="pricing-controls">${input('Tháng xem lịch','month',month,'month')}${select('Loại phòng xem giá','roomTypeId',state.roomTypes.map(t=>[t._id,t.name]),typeId)}${button('Xem lịch','price-view')}${button('Chỉnh bảng giá loại phòng','price-rates',typeId)}</div>
      <div class="rate-summary">${[['Ngày thường',rates.weekdayPrice],['Thứ Bảy',rates.saturdayPrice],['Chủ nhật',rates.sundayPrice],['Lễ / sự kiện',rates.eventPrice]].map(([name,price])=>`<div><span>${name}</span><strong>${money(price)}</strong><small>/ đêm</small></div>`).join('')}</div>
      <div class="price-legend"><span class="legend-weekday">Ngày thường</span><span class="legend-weekend">Thứ Bảy / Chủ nhật</span><span class="legend-event">Lễ / sự kiện</span></div>
      <div class="price-calendar" aria-label="Lịch giá ${e(month)} của ${e(data.roomTypeName)}"><div class="calendar-head">${['T2','T3','T4','T5','T6','T7','CN'].map(d=>`<span>${d}</span>`).join('')}</div><div class="calendar-days">${'<span class="calendar-blank" aria-hidden="true"></span>'.repeat(offset)}${days}</div></div>
      <p class="admin-note">Tính tiền theo đêm: nhận 19/10, trả 20/10 chỉ tính đêm 19/10. Sự kiện 20/10 áp dụng cho đêm 20/10. Giá riêng được ưu tiên; để trống sẽ dùng bảng giá theo loại ngày.</p>`;
  }

  async function handleAction(target, {state,editor,request,render}) {
    const action=target.dataset.action, id=target.dataset.id;
    if (!action.startsWith('price-')) return false;
    if (action==='price-view') {
      const next=document.getElementById('price-month').value;
      if (!/^(20\d{2}|2100)-(0[1-9]|1[0-2])$/.test(next)) throw new Error('Chọn tháng hợp lệ từ năm 2000 đến 2100.');
      month=next;typeId=document.getElementById('price-roomTypeId').value;
      await render();return true;
    }
    if (action==='price-rates') {
      const t=state.roomTypes.find(t=>t._id===id);
      editor('Bảng giá · '+t.name,rateFields(t),b=>request('/api/admin/room-types/'+t._id+'/prices','PUT',Object.fromEntries(['weekdayPrice','saturdayPrice','sundayPrice','eventPrice'].map(k=>[k,Number(b[k])]))));
      return true;
    }
    if (action==='price-day'||action==='price-range') {
      const date=id||month+'-01',rule=state.pricingCalendar?.[date],kind=rule?.kind||'AUTO';
      const html=`<div class="form-grid">${input('Từ ngày (bao gồm)','startDate',date,'date')}${input('Đến ngày (bao gồm)','endDate',date,'date')}</div>${select('Áp dụng loại ngày','kind',Object.entries(labels),kind)}<div id="event-name-field">${input('Tên lễ / sự kiện','name',rule?.name||'','text',false)}</div><div id="day-price-fields"><h3>Giá riêng cho khoảng ngày (VND / đêm)</h3><p class="admin-note">Để trống để dùng giá mặc định của loại ngày. Cùng một cấu hình sẽ thay thế các ngày trong khoảng đã chọn.</p><div class="form-grid">${state.roomTypes.map(t=>input(t.name,'rate_'+t._id,rule?.prices?.[t._id]??'','number',false)).join('')}</div></div><p class="admin-note">Chọn “Tự động” sẽ gỡ loại ngày và giá riêng đã đặt trong khoảng này. Sự kiện được đặt theo ngày / năm cụ thể.</p>`;
      editor(action==='price-day'?'Chỉnh ngày '+dateLabel(date):'Đặt ngày / khoảng ngày',html,b=>{
        const prices={};for(const t of state.roomTypes){const raw=b['rate_'+t._id];if(raw!==undefined&&raw.trim()!=='')prices[t._id]=Number(raw);}
        return request('/api/admin/pricing/calendar','PUT',{startDate:b.startDate,endDate:b.endDate,kind:b.kind,name:b.name||'',prices});
      });
      const kindSelect=document.getElementById('price-kind');
      const update=()=>{const event=kindSelect.value==='EVENT',auto=kindSelect.value==='AUTO';document.getElementById('event-name-field').hidden=!event;document.getElementById('price-name').required=event;document.getElementById('day-price-fields').hidden=auto;};
      kindSelect.onchange=update;update();return true;
    }
    return false;
  }
  return {render,handleAction};
})();
