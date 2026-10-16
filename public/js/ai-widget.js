'use strict';
(()=>{
 if(document.getElementById('hs-ai-widget')||window.parent!==window)return;
 let user;try{user=JSON.parse(sessionStorage.getItem('hs_user'));}catch{}
 if(!user||!sessionStorage.getItem('hs_token'))return;
 const key='hs_ai_widget_'+(user._id||user.username),threadKey='hs_ai_session_'+(user._id||user.username),margin=10,size=56;
 const read=()=>{try{return JSON.parse(sessionStorage.getItem(key)||'{}')||{};}catch{return {};}};
 const saved=read();let expanded=saved.open===true,frame=null,drag=null,suppressClick=false,sessionId=sessionStorage.getItem(threadKey)||'',returnFocus=null;
 const validId=id=>typeof id==='string'&&/^[a-f0-9]{24}$/.test(id);
 let x=Number.isFinite(saved.x)?saved.x:innerWidth-size-22,y=Number.isFinite(saved.y)?saved.y:innerHeight-size-22,px=Number.isFinite(saved.px)?saved.px:null,py=Number.isFinite(saved.py)?saved.py:null;
 const root=document.createElement('div');root.id='hs-ai-widget';root.innerHTML=`<section class="hs-ai-panel" id="hs-ai-panel" role="region" aria-label="Chat với trợ lý HOMESTAY" hidden><header class="hs-ai-widget-header"><button type="button" class="hs-ai-drag-handle" aria-label="Kéo khung chat; dùng các phím mũi tên để di chuyển" title="Kéo để di chuyển khung chat"><span aria-hidden="true">✧</span><span><strong>Trợ lý HOMESTAY</strong><small>Hỏi nhanh khi đang xem hệ thống</small></span></button><a class="hs-ai-expand" href="/assistant.html" title="Mở màn hình lớn" aria-label="Mở trợ lý ở màn hình lớn">↗</a><button type="button" class="hs-ai-minimize" aria-label="Thu gọn khung chat" title="Thu gọn">−</button></header><div class="hs-ai-frame-wrap"><p class="hs-ai-frame-loading" role="status">Đang mở hội thoại…</p></div></section><button type="button" class="hs-ai-bubble" aria-label="Mở chat với trợ lý HOMESTAY; kéo để di chuyển" aria-controls="hs-ai-panel" aria-expanded="false" title="Trợ lý AI · Bấm để mở, kéo để di chuyển"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-4 3V11.5A8.5 8.5 0 0 1 9.5 3h3a8.5 8.5 0 0 1 8.5 8.5Z" transform="translate(1 -1) scale(.9)"/><path d="m12 7 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/></svg></button>`;document.body.append(root);
 const bubble=root.querySelector('.hs-ai-bubble'),panel=root.querySelector('.hs-ai-panel'),handle=root.querySelector('.hs-ai-drag-handle'),expand=root.querySelector('.hs-ai-expand'),wrap=root.querySelector('.hs-ai-frame-wrap');
 function persist(){try{sessionStorage.setItem(key,JSON.stringify({x,y,px,py,open:expanded}));}catch{}}
 function link(){expand.href='/assistant.html'+(validId(sessionId)?'?session='+encodeURIComponent(sessionId):'');}
 function layout(){
  const vw=Math.min(innerWidth,window.visualViewport?.width||innerWidth),vh=Math.min(innerHeight,window.visualViewport?.height||innerHeight);
  x=Math.max(margin,Math.min(x,Math.max(margin,vw-size-margin)));y=Math.max(margin,Math.min(y,Math.max(margin,vh-size-margin)));
  bubble.style.left=x+'px';bubble.style.top=y+'px';
  const w=Math.min(390,vw-margin*2),h=Math.min(580,Math.max(180,vh-size-margin*3));
  panel.style.width=w+'px';panel.style.height=h+'px';
  const left=Math.max(margin,Math.min(x+size-w,vw-w-margin));
  const preferred=y-h-10;
  const top=preferred>=margin?preferred:y+size+10+h<=vh-margin?y+size+10:Math.max(margin,Math.min(y,vh-h-margin));
  px=Math.max(margin,Math.min(px??left,vw-w-margin));py=Math.max(margin,Math.min(py??top,vh-h-margin));panel.style.left=px+'px';panel.style.top=py+'px';
 }
 function open(value,focus=true){
  expanded=value;panel.hidden=!value;bubble.setAttribute('aria-expanded',String(value));bubble.setAttribute('aria-label',value?'Thu gọn chat với trợ lý HOMESTAY; kéo để di chuyển':'Mở chat với trợ lý HOMESTAY; kéo để di chuyển');
  if(value){
   returnFocus=document.activeElement;
   if(!frame){frame=document.createElement('iframe');frame.title='Hội thoại trợ lý HOMESTAY';frame.src='/assistant.html?compact=1'+(validId(sessionId)?'&session='+encodeURIComponent(sessionId):'');frame.addEventListener('load',()=>{wrap.querySelector('.hs-ai-frame-loading').hidden=true;if(expanded&&focus)frame.contentWindow.postMessage({type:'hs-ai-focus'},location.origin);});wrap.append(frame);}
   else if(focus)frame.contentWindow.postMessage({type:'hs-ai-focus'},location.origin);
  }else if(focus){(returnFocus?.isConnected&&returnFocus!==document.body?returnFocus:bubble).focus();}
  layout();persist();
 }
 function bindDrag(el,isPanel=false){
  el.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;drag={id:ev.pointerId,startX:ev.clientX,startY:ev.clientY,x:isPanel?px:x,y:isPanel?py:y,moved:false};el.setPointerCapture(ev.pointerId);});
  el.addEventListener('pointermove',ev=>{if(!drag||drag.id!==ev.pointerId)return;const dx=ev.clientX-drag.startX,dy=ev.clientY-drag.startY;if(Math.hypot(dx,dy)>5)drag.moved=true;if(!drag.moved)return;if(isPanel){px=drag.x+dx;py=drag.y+dy;}else{x=drag.x+dx;y=drag.y+dy;if(!expanded){px=null;py=null;}}root.classList.add('hs-ai-dragging');layout();});
  const end=ev=>{if(!drag||drag.id!==ev.pointerId)return;if(el===bubble)suppressClick=ev.type==='pointerup'&&drag.moved;drag=null;root.classList.remove('hs-ai-dragging');if(el.hasPointerCapture(ev.pointerId))el.releasePointerCapture(ev.pointerId);persist();};
  el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  el.addEventListener('keydown',ev=>{const delta={ArrowLeft:[-16,0],ArrowRight:[16,0],ArrowUp:[0,-16],ArrowDown:[0,16]}[ev.key];if(!delta)return;ev.preventDefault();if(isPanel){px+=delta[0];py+=delta[1];}else{x+=delta[0];y+=delta[1];if(!expanded){px=null;py=null;}}layout();persist();});
 }
 bindDrag(bubble);bindDrag(handle,true);
 bubble.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}open(!expanded);});
 root.querySelector('.hs-ai-minimize').onclick=()=>open(false);
 expand.onclick=()=>{expanded=false;persist();};
 window.addEventListener('resize',()=>{layout();persist();});
 window.visualViewport?.addEventListener('resize',()=>{layout();persist();});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&expanded){open(false);}});
 window.addEventListener('message',ev=>{
  if(ev.origin!==location.origin||ev.source!==frame?.contentWindow||!ev.data||typeof ev.data!=='object')return;
  if(ev.data.type==='hs-ai-session'&&(validId(ev.data.sessionId)||ev.data.sessionId===null)){sessionId=ev.data.sessionId||'';link();}
  if(ev.data.type==='hs-ai-minimize')open(false);
  if(ev.data.type==='hs-ai-fullscreen'){expanded=false;persist();}
  if(ev.data.type==='hs-ai-auth-expired'){expanded=false;persist();root.remove();}
 });
 link();layout();open(expanded,false);
})();
