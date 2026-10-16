 'use strict';
(()=>{
 if(location.pathname==='/assistant.html'&&new URLSearchParams(location.search).get('compact')==='1'&&window.parent!==window){document.documentElement.classList.add('ai-compact');return;}
 let user;try{user=JSON.parse(sessionStorage.getItem('hs_user')||'null');}catch{sessionStorage.removeItem('hs_user');}
 const staff=location.pathname.startsWith('/admin')||(location.pathname==='/assistant.html'&&user&&user.role!=='guest'),current=new URLSearchParams(location.search).get('page')||(location.pathname==='/assistant.html'?'assistant':'overview');
 document.body.classList.add(staff?'staff-ui':'guest-ui');
 const svg=path=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
 const brand='<a class="brand" href="/" aria-label="HOMESTAY VIỆT – Trang chủ"><img class="brand-logo" src="/assets/brand/homestay-viet.png" alt="HOMESTAY VIỆT"></a>';
 const links=[['/','Trang chủ'],['/homestays.html','Homestay'],['/rooms.html','Xem phòng'],['/modules/bookings/index.html','Đặt phòng'],['/modules/lookup/index.html','Tra cứu booking']];
 if(user)links.push(['/assistant.html','Trợ lý AI']);
 if(user)links.push(user.role==='guest'?['/account.html','Tài khoản của tôi']:['/admin.html','Quản lý']);else links.push(['/login.html','Đăng nhập'],['/register.html','Đăng ký']);
 const admin=[['overview','Tổng quan',null],['homestays','Homestay cộng tác','homestays.view'],['owner','Chủ homestay','reports.view'],['reception','Booking & khách','bookings.view'],['board','Sơ đồ phòng','bookings.view'],['housekeeping','Buồng phòng','housekeeping.view'],['customers','Khách hàng','customers.view'],['rooms','Phòng & loại phòng','rooms.view'],['settings','Giá & chính sách','pricing.view'],['reports','Báo cáo','reports.view'],['invoices','Hoá đơn','invoices.view'],['emails','Lịch sử email','email.view'],['system','Vận hành & sao lưu','system.view'],['revenue-today','Doanh thu hôm nay','reports.revenue'],['users','Tài khoản & quyền','accounts.view'],['assistant','Trợ lý AI',null],['audit','Nhật ký','audit.view']];
 let header=document.querySelector('.topbar');if(!header){header=document.createElement('header');header.className='topbar';document.body.prepend(header);}
 HS.updateStaffNavigation=fresh=>{if(!staff)return;user=fresh;const list=document.querySelector('#sidebar nav');if(list)list.innerHTML=admin.filter(x=>(x[0]!=='revenue-today'||user.role==='reception')&&(!x[2]||HS.can(user,x[2]))).map(([id,label])=>`<a href="${id==='assistant'?'/assistant.html':'/admin.html?page='+id}" ${current===id||(['types','amenities'].includes(current)&&id==='rooms')?'class="active" aria-current="page"':''}>${label}</a>`).join('');};
 const menuIcon=svg('<path d="M4 6h16M4 12h16M4 18h16"/>');
 let nav;
 if(staff){
  nav=document.createElement('aside');nav.id='sidebar';nav.className='sidebar';nav.innerHTML=brand+'<button class="menu-close" aria-label="Đóng menu">×</button><p class="workspace-label">Quản lý lưu trú</p><nav aria-label="Quản trị">'+admin.filter(x=>(x[0]!=='revenue-today'||user?.role==='reception')&&(!x[2]||HS.can(user,x[2]))).map(([id,label])=>`<a href="${id==='assistant'?'/assistant.html':'/admin.html?page='+id}" ${current===id||(['types','amenities'].includes(current)&&id==='rooms')?'class="active" aria-current="page"':''}>${label}</a>`).join('')+'</nav><div class="side-bottom"><a href="/">Xem trang khách ↗</a><p>'+HS.esc(user?.username||'')+'</p></div>';document.body.prepend(nav);
  header.innerHTML=`<button class="menu-toggle" aria-label="Mở menu" aria-controls="sidebar" aria-expanded="false">${menuIcon}</button><span class="header-title">${HS.esc(admin.find(x=>x[0]===current)?.[1]||'Danh mục phòng')}</span><button class="btn secondary small-btn" id="logout">Đăng xuất</button>`;
 }else{
  header.innerHTML=brand+`<button class="guest-toggle" aria-label="Mở menu" aria-controls="guest-nav" aria-expanded="false">${menuIcon}</button><nav id="guest-nav" aria-label="Điều hướng chính">`+links.map(([url,label])=>`<a href="${url}" ${location.pathname===url||(url==='/'&&location.pathname==='/index.html')?'class="nav-current" aria-current="page"':''}>${label}</a>`).join('')+(user?'<button class="btn secondary small-btn" id="logout">Đăng xuất</button>':'')+'</nav>';
  nav=header.querySelector('nav');
  let footer=document.querySelector('.footer');if(!footer){footer=document.createElement('footer');footer.className='footer';(document.querySelector('main')||document.body).append(footer);}if(footer)footer.innerHTML='<div><img class="logo-footer" src="/assets/brand/homestay-viet.png" alt="HOMESTAY VIỆT"><p>Khám phá · Trải nghiệm · Gắn kết</p></div><a href="/modules/lookup/index.html">Tra cứu booking</a><a href="/login.html">Đăng nhập / Đăng ký</a>';
 }
 const toggle=header.querySelector(staff?'.menu-toggle':'.guest-toggle');let returnFocus;
 const mq=matchMedia(staff?'(min-width:1001px)':'(min-width:801px)');
 const backdrop=document.createElement('div');backdrop.className='menu-backdrop';document.body.append(backdrop);
 function visibility(){nav.inert=!mq.matches&&!document.body.classList.contains('menu-open');}
 function open(v){document.body.classList.toggle('menu-open',v);toggle.setAttribute('aria-expanded',String(v));visibility();if(v){returnFocus=document.activeElement;nav.querySelector('a')?.focus();}else returnFocus?.focus();}
 toggle.onclick=()=>open(!document.body.classList.contains('menu-open'));backdrop.onclick=()=>open(false);nav.addEventListener('click',ev=>{if(ev.target.closest('a'))open(false);});nav.querySelector('.menu-close')?.addEventListener('click',()=>open(false));
 document.addEventListener('keydown',ev=>{if(!document.body.classList.contains('menu-open'))return;if(ev.key==='Escape')open(false);if(ev.key==='Tab'){const list=[toggle,...nav.querySelectorAll('a,button')].filter(el=>el.offsetParent!==null),first=list[0],last=list.at(-1);if(ev.shiftKey&&document.activeElement===first){ev.preventDefault();last.focus();}else if(!ev.shiftKey&&document.activeElement===last){ev.preventDefault();first.focus();}}});mq.addEventListener('change',()=>{open(false);visibility();});visibility();
 document.getElementById('logout')?.addEventListener('click',()=>{sessionStorage.removeItem('hs_token');sessionStorage.removeItem('hs_user');sessionStorage.removeItem('hs_homestay');location.href='/';});
 if(user&&sessionStorage.getItem('hs_token')&&location.pathname!=='/assistant.html'&&!['/login.html','/register.html','/forgot-password.html','/reset-password.html'].includes(location.pathname)){
  const css=document.createElement('link');css.rel='stylesheet';css.href='/css/ai-widget.css';document.head.append(css);
  const script=document.createElement('script');script.src='/js/ai-widget.js';document.body.append(script);
 }
})();
