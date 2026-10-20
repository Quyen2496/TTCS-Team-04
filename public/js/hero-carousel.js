'use strict';
HS.heroCarousel=function(properties){
 const root=document.querySelector('.travel-hero'),first=document.getElementById('hero-photo');
 if(!root||!first)return;
 const slides=(properties||[]).filter(h=>h.active!==false).map(h=>({...h,src:HS.localPhoto(h.photo||(h.images||[])[0])})).filter(h=>h.src!=='/modules/bookings/assets/room-placeholder.svg');
 if(!slides.length)return;
 const layer=document.getElementById('hero-slides'),footer=document.getElementById('hero-footer'),controls=document.getElementById('hero-controls'),caption=document.getElementById('hero-caption'),counter=document.getElementById('hero-counter'),toggle=document.getElementById('hero-toggle'),dots=document.getElementById('hero-dots'),prev=document.getElementById('hero-prev'),next=document.getElementById('hero-next');
 if(!layer||!footer||!controls)return;
 root.setAttribute('role','region');root.setAttribute('aria-roledescription','trình chiếu');root.setAttribute('aria-label','Giới thiệu các homestay');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let current=first,buffer=first.cloneNode(false),index=0,busy=false,timer=null,automatic=!reduced.matches,hover=false,visible=true,ready=false,touch=null,preloaded=null;
 buffer.removeAttribute('id');buffer.removeAttribute('fetchpriority');buffer.alt='';buffer.setAttribute('aria-hidden','true');buffer.hidden=true;layer.append(buffer);
 dots.innerHTML=slides.map((h,i)=>`<button type="button" data-hero-slide="${i}" aria-label="Xem ${HS.esc(h.name)}" aria-current="${i===0?'true':'false'}"><span></span></button>`).join('');
 const stop=()=>{clearTimeout(timer);timer=null;};
 const schedule=()=>{stop();if(ready&&automatic&&!hover&&visible&&!document.hidden&&!busy&&slides.length>1)timer=setTimeout(()=>show(index+1,1),3000);};
 const state=()=>{toggle.textContent=automatic?'Ⅱ':'▶';toggle.setAttribute('aria-label',automatic?'Tạm dừng trình chiếu':'Phát trình chiếu');toggle.title=toggle.getAttribute('aria-label');caption.setAttribute('aria-live',automatic?'off':'polite');root.dataset.autoplay=String(automatic);};
 const update=()=>{const h=slides[index];caption.innerHTML=`<span class="hero-location">${HS.esc(h.destination||'Homestay địa phương')}</span><a href="/homestay-detail.html?id=${encodeURIComponent(h._id)}"><strong>${HS.esc(h.name)}</strong><span>Khám phá homestay →</span></a>`;counter.textContent=(index+1)+' / '+slides.length;root.dataset.heroSlide=String(index);dots.querySelectorAll('[data-hero-slide]').forEach(b=>b.setAttribute('aria-current',String(Number(b.dataset.heroSlide)===index)));};
 const load=(img,slide)=>new Promise((resolve,reject)=>{let done=false;const finish=error=>{if(done)return;done=true;clearTimeout(timeout);img.onload=img.onerror=null;error?reject(error):resolve();};const timeout=setTimeout(()=>finish(Error('Image timeout')),12000);img.onload=()=>finish();img.onerror=()=>finish(Error('Image unavailable'));img.src=slide.src;if(img.complete&&img.naturalWidth)finish();});
 const preload=()=>{if(slides.length>1){preloaded=new Image();preloaded.src=slides[(index+1)%slides.length].src;}};
 async function show(wanted,direction=1){
  if(!ready||busy)return;const target=(wanted+slides.length)%slides.length;if(target===index){schedule();return;}
  busy=true;stop();
  try{
   await load(buffer,slides[target]);buffer.alt='Ảnh minh hoạ '+slides[target].name;buffer.hidden=false;
   if(!reduced.matches){
    const incoming=buffer.animate([{transform:`translateX(${direction*100}%)`},{transform:'translateX(0)'}],{duration:650,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'}),outgoing=current.animate([{transform:'translateX(0)'},{transform:`translateX(${-direction*100}%)`}],{duration:650,easing:'cubic-bezier(.22,.61,.36,1)',fill:'both'});
    await Promise.allSettled([incoming.finished,outgoing.finished]);current.hidden=true;incoming.cancel();outgoing.cancel();
   }else current.hidden=true;
   current.setAttribute('aria-hidden','true');buffer.setAttribute('aria-hidden','false');[current,buffer]=[buffer,current];index=target;update();preload();
  }catch{buffer.hidden=true;}
  finally{busy=false;schedule();}
 }
 function manual(wanted,direction){automatic=false;state();stop();show(wanted,direction);}
 prev.onclick=()=>manual(index-1,-1);next.onclick=()=>manual(index+1,1);
 dots.onclick=ev=>{const b=ev.target.closest('[data-hero-slide]');if(b){const target=Number(b.dataset.heroSlide);manual(target,target<index?-1:1);}};
 toggle.onclick=()=>{automatic=!automatic;state();schedule();};
 root.addEventListener('mouseenter',()=>{hover=true;stop();});root.addEventListener('mouseleave',()=>{hover=false;schedule();});
 // Keyboard focus stops automatic motion until the visitor explicitly resumes it.
 root.addEventListener('focusin',ev=>{if(ev.target!==toggle){automatic=false;state();stop();}});
 root.addEventListener('keydown',ev=>{if(ev.target.closest('.hero-controls')&&['ArrowLeft','ArrowRight'].includes(ev.key)){ev.preventDefault();manual(index+(ev.key==='ArrowRight'?1:-1),ev.key==='ArrowRight'?1:-1);}});
 root.addEventListener('touchstart',ev=>{if(ev.touches.length===1&&!ev.target.closest('button,a'))touch={x:ev.touches[0].clientX,y:ev.touches[0].clientY};else touch=null;},{passive:true});
 root.addEventListener('touchend',ev=>{if(!touch)return;const dx=ev.changedTouches[0].clientX-touch.x,dy=ev.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.4)manual(index+(dx<0?1:-1),dx<0?1:-1);},{passive:true});
 document.addEventListener('visibilitychange',schedule);
 const motionChanged=()=>{if(reduced.matches)automatic=false;state();schedule();};reduced.addEventListener('change',motionChanged);
 if('IntersectionObserver'in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;schedule();},{threshold:.15}).observe(root);
 load(current,slides[0]).then(()=>{current.hidden=false;root.classList.add('has-photo');footer.hidden=false;controls.hidden=slides.length<2;ready=true;state();update();preload();schedule();}).catch(()=>{current.hidden=true;footer.hidden=true;});
};
