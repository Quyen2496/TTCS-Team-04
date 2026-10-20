'use strict';
(async()=>{
 const e=HS.esc,m=HS.money,container=document.getElementById('public-rooms'),home=['/','/index.html'].includes(location.pathname),params=new URLSearchParams(location.search);
 const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
 const groups=[['solo','Cho chuyến đi một mình','Nhỏ xinh, riêng tư và đủ tiện nghi.',t=>t.standardCapacity===1],['couple','Một kỳ nghỉ cho hai người','Từ phòng đôi ấm cúng đến studio có bếp.',t=>t.standardCapacity===2],['family','Gia đình ở cùng nhau','Thêm khoảng sinh hoạt cho cả nhà.',t=>t.standardCapacity>=3&&t.standardCapacity<=4],['group','Đi đông, ở thoải mái','Căn nhiều giường cho chuyến đi cùng nhau.',t=>t.standardCapacity>=5]];
 const link=(t,page)=>{const q=new URLSearchParams();for(const key of ['checkIn','checkOut','guestCount'])if(params.has(key))q.set(key,params.get(key));q.set('homestayId',t.homestayId);q.set(page==='detail'?'id':'roomTypeId',t._id);return(page==='detail'?'/room-detail.html?':'/modules/bookings/index.html?')+q;};
 const card=t=>`<article class="room-card"><a class="room-photo-link" href="${e(link(t,'detail'))}"><img class="room-image" src="${HS.thumbnail(t.photo)}" alt="Không gian minh hoạ ${e(t.name)}" loading="lazy" decoding="async" width="480" height="320"></a><div class="room-content"><div class="room-top"><span>${e(t.area||'—')} m²</span><span>${e(t.standardCapacity)}–${e(t.maxCapacity)} khách</span></div><h3><a href="${e(link(t,'detail'))}">${e(t.name)}</a></h3><p class="room-property">${e(t.homestayName||'')}${t.destination?' · '+e(t.destination):''}</p><p class="room-description">${e(t.bedDescription||t.description)}</p><div class="amenity-tags">${(t.amenities||[]).slice(0,3).map(a=>`<span class="tag">${e(a.name)}</span>`).join('')}<span class="tag">${e(t.roomCount||0)} phòng cùng loại</span></div><div class="room-price"><span>Từ</span><strong>${m(t.weekdayPrice)}</strong><span>/ đêm</span></div><div class="room-actions"><a href="${e(link(t,'detail'))}">Xem chi tiết</a><a class="btn primary" href="${e(link(t,'booking'))}">Chọn ngày</a></div></div></article>`;
 let properties=[],all=[],query='',property=params.get('homestayId')||'',type='',sort='number',page=1,group='';const size=12;
 function render(){
  let list=all.filter(t=>(!property||t.homestayId===property)&&(!type||t._id===type)&&(!group||groups.find(g=>g[0]===group)?.[3](t))&&(!query||normalize([t.name,t.homestayName,t.destination,t.description,...(t.amenities||[]).map(a=>a.name)].join(' ')).includes(normalize(query))));
  if(sort==='price')list.sort((a,b)=>a.weekdayPrice-b.weekdayPrice);if(sort==='price-desc')list.sort((a,b)=>b.weekdayPrice-a.weekdayPrice);if(sort==='capacity')list.sort((a,b)=>b.maxCapacity-a.maxCapacity);
  if(home){container.innerHTML=groups.map(([id,title,desc,test])=>{const items=list.filter(test);const featured=[];for(const t of items)if(!featured.some(x=>x.homestayId===t.homestayId))featured.push(t);return items.length?`<section class="room-category" id="${id}"><div class="results-heading"><div class="category-heading"><h2>${title}</h2><p>${desc}</p></div><a href="/rooms.html?group=${id}">Xem ${items.length} lựa chọn →</a></div><div class="room-grid">${featured.slice(0,3).map(card).join('')}</div></section>`:'';}).join('');return;}
  const pages=Math.max(1,Math.ceil(list.length/size));page=Math.max(1,Math.min(page,pages));
  container.innerHTML=list.length?'<div class="room-grid">'+list.slice((page-1)*size,page*size).map(card).join('')+'</div>':'<div class="empty"><h2>Chưa tìm thấy phòng phù hợp</h2><p>Thử từ khoá khác hoặc chọn tất cả homestay.</p></div>';
  document.getElementById('room-count').textContent=`${list.length} loại phòng phù hợp · Trang ${page}/${pages}`;
  document.getElementById('catalog-pagination').innerHTML=pages>1?`<button class="btn secondary" data-page="${page-1}" ${page===1?'disabled':''}>← Trước</button><span>Trang ${page} / ${pages}</span><button class="btn secondary" data-page="${page+1}" ${page===pages?'disabled':''}>Tiếp →</button>`:'';
  document.getElementById('catalog-pagination').querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=Number(b.dataset.page);render();document.getElementById('room-count').scrollIntoView({block:'start'});});
  const h=properties.find(h=>h._id===property),banner=document.getElementById('selected-property');banner.hidden=!h;
  if(h)banner.innerHTML=`<img src="${HS.thumbnail(h.photo)}" alt="Ảnh minh hoạ ${e(h.name)}"><div><p class="eyebrow">${e(h.destination||'Homestay địa phương')}</p><h2>${e(h.name)}</h2><p>${e(h.tagline||h.address)}</p><a href="/homestay-detail.html?id=${e(h._id)}">Xem cơ sở, tiện ích và chính sách →</a></div>`;
 }
 function typeOptions(){const sel=document.getElementById('room-type-filter');sel.innerHTML='<option value="">Tất cả loại phòng</option>'+all.filter(t=>!property||t.homestayId===property).map(t=>`<option value="${e(t._id)}">${e(t.name)}${property?'':' · '+e(t.homestayName)}</option>`).join('');sel.value=type;}
 try{
  [all,properties]=await Promise.all([HS.api('/api/public/room-types'),HS.api('/api/public/homestays')]);
  if(home){
   const sel=document.getElementById('home-homestay');sel.innerHTML='<option value="">Tất cả homestay</option>'+properties.map(h=>`<option value="${e(h._id)}">${e(h.name)} · ${e(h.destination||h.address)}</option>`).join('');
   if(HS.heroCarousel)HS.heroCarousel(properties);
   const destinations=document.getElementById('home-destinations');if(destinations)destinations.innerHTML=properties.slice(0,6).map(h=>`<a class="destination-tile" href="/homestay-detail.html?id=${e(h._id)}"><img src="${HS.thumbnail(h.photo)}" alt="Ảnh minh hoạ ${e(h.destination||h.name)}" loading="lazy" width="480" height="320"><span>${e(h.destination||h.name)}<small>${e(h.roomTypeCount||0)} loại phòng</small></span></a>`).join('');
   const count=document.getElementById('collection-count');if(count)count.textContent=`${properties.length} homestay · ${all.length} loại phòng · Chọn nơi ở theo cách của bạn`;
   
   const s=await HS.api('/api/public/settings');document.getElementById('home-policy').textContent=`Nhận phòng từ ${s.checkInTime} · Trả phòng trước ${s.checkOutTime}. Chính sách cụ thể được hiển thị tại từng cơ sở và trong báo giá.`;
  }else{
   group=params.get('group')||'';if(!groups.some(g=>g[0]===group))group='';
   const p=document.getElementById('property-filter');p.innerHTML='<option value="">Tất cả homestay</option>'+properties.map(h=>`<option value="${e(h._id)}">${e(h.name)} · ${e(h.destination||'')}</option>`).join('');p.value=property;
   if(property&&!properties.some(h=>h._id===property))throw Error('Homestay không tồn tại hoặc đã ngừng hoạt động.');
   p.onchange=()=>{property=p.value;type='';page=1;typeOptions();const q=new URLSearchParams(location.search);if(property)q.set('homestayId',property);else q.delete('homestayId');history.replaceState(null,'','?'+q);render();};
   typeOptions();document.getElementById('room-type-filter').onchange=ev=>{type=ev.target.value;page=1;render();};
   document.getElementById('room-group-filter').value=group;document.getElementById('room-group-filter').onchange=ev=>{group=ev.target.value;page=1;render();};
   document.getElementById('room-search').oninput=ev=>{query=ev.target.value.trim();page=1;render();};document.getElementById('room-sort').onchange=ev=>{sort=ev.target.value;page=1;render();};
   
  }
  render();
 }catch(error){container.innerHTML='<div class="notice error" role="alert">'+e(error.message)+'</div>';}
 if(home){const a=document.getElementById('home-in'),b=document.getElementById('home-out'),add=d=>new Date(Date.parse(d)+86400000).toISOString().slice(0,10);a.value=a.min=HS.today();b.value=b.min=add(a.value);a.onchange=()=>{if(!a.value)return;b.min=add(a.value);if(b.value<=a.value)b.value=b.min;};}
})();
