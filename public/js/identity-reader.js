'use strict';
HS.identityReader=(()=>{
 const e=HS.esc,P=HS.identityParser,loads=new Map(),sessions=new WeakMap();
 const fields=[['guestName','Họ và tên','text'],['documentType','Loại giấy tờ','document'],['idNumber','Số CMND hoặc CCCD','text'],['birthDate','Ngày sinh','date'],['gender','Giới tính','gender'],['nationality','Quốc tịch','text'],['guestAddress','Nơi thường trú','text'],['hometown','Quê quán','text'],['issueDate','Ngày cấp','date'],['expiryDate','Có giá trị đến','date'],['issuedBy','Nơi cấp','text']];
 const label=(key,value)=>key==='gender'?HS.genderLabel(value):key==='documentType'?(value==='NATIONAL_ID'?'CMND / CCCD':value==='PASSPORT'?'Hộ chiếu':''):key.endsWith('Date')&&value?value.split('-').reverse().join('/'):value;
 function script(src){if(!loads.has(src))loads.set(src,new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>{loads.delete(src);s.remove();reject(Error('Chưa tải được bộ đọc. Hãy tải lại trang và kiểm tra bản cập nhật.'));};document.head.append(s);}));return loads.get(src);}
 function html(){return `<section class="identity-capture" aria-label="Đọc thông tin CMND CCCD"><h3>Điền nhanh từ giấy tờ</h3><p>Chọn ảnh hoặc chụp CMND, CCCD để đọc QR và chữ trên thẻ. Kiểm tra kết quả trước khi điền vào hồ sơ.</p><label>Đọc cho khách<select data-id-target aria-label="Khách nhận thông tin từ giấy tờ"></select></label><div class="identity-images">${['front','back'].map((side,i)=>`<div class="identity-side"><strong>${i?'Mặt sau hoặc mặt có QR':'Mặt trước'}</strong><div class="identity-preview" data-id-preview="${side}"><span>Chưa chọn ảnh</span></div><div class="actions"><button type="button" class="btn secondary small-btn" data-id-pick="${side}">Chọn ảnh</button><button type="button" class="btn secondary small-btn" data-id-camera="${side}">Chụp ảnh</button><button type="button" class="btn secondary small-btn" data-id-rotate="${side}" disabled>Xoay ảnh</button></div><input type="file" data-id-file="${side}" accept="image/jpeg,image/png,image/webp" hidden><input type="file" data-id-camera-file="${side}" accept="image/jpeg,image/png,image/webp" capture="environment" hidden></div>`).join('')}</div><p>Ảnh rõ, đủ bốn góc, tránh lóa. Mỗi ảnh tối đa 8 MB, định dạng JPG, PNG hoặc WebP. Chụp cả hai mặt nếu thông tin nằm ở hai mặt.</p><div class="actions"><button type="button" class="btn primary" data-id-read disabled>Đọc thông tin</button><button type="button" class="btn secondary" data-id-cancel hidden>Dừng đọc</button><button type="button" class="btn secondary" data-id-clear disabled>Xoá ảnh và kết quả</button></div><label class="checkbox-label"><input type="checkbox" data-id-extra>Đọc thêm chữ trên thẻ để lấy quốc tịch, quê quán hoặc hạn dùng</label><progress class="identity-progress" data-id-progress max="100" value="0" hidden aria-label="Tiến độ đọc giấy tờ"></progress><p data-id-status role="status" aria-live="polite">Chưa chọn ảnh.</p><div class="identity-result" data-id-result hidden></div><p>Ảnh chỉ xử lý trên thiết bị này, không gửi sang dịch vụ AI và không lưu lên máy chủ. Khi lưu hồ sơ, hệ thống chỉ nhận những thông tin đã được bạn xác nhận.</p></section>`;}
 function mount(form,targets){
  sessions.get(form)?.destroy();const panel=form.querySelector('.identity-capture');if(!panel)return;
  const $=s=>panel.querySelector(s),target=$('[data-id-target]'),result=$('[data-id-result]'),read=$('[data-id-read]'),clear=$('[data-id-clear]'),cancel=$('[data-id-cancel]'),progress=$('[data-id-progress]'),status=$('[data-id-status]');
  target.innerHTML=targets.map((t,i)=>`<option value="${i}">${e(t.label)}</option>`).join('');
  let photos={},busy=false,pending=false,seq=0,worker=null,disposed=false;
  const current=()=>targets[Number(target.value)],inputFor=key=>form.elements.namedItem(current().names[key]||'');
  const notice=text=>{status.textContent=text;};
  function sync(){
   read.disabled=busy||!Object.keys(photos).length;clear.disabled=!Object.keys(photos).length&&!pending;cancel.hidden=!busy;target.disabled=busy||pending;
   panel.querySelectorAll('[data-id-pick],[data-id-camera],input[type=file],[data-id-extra]').forEach(x=>x.disabled=busy);panel.querySelectorAll('[data-id-rotate]').forEach(x=>x.disabled=busy||!photos[x.dataset.idRotate]);form.dataset.confirmationBlocked=String(busy||pending);HS.syncConfirmations(form);
  }
  function releasePhotos(){for(const value of Object.values(photos))URL.revokeObjectURL(value.url);photos={};panel.querySelectorAll('input[type=file]').forEach(x=>x.value='');panel.querySelectorAll('[data-id-preview]').forEach(x=>x.innerHTML='<span>Chưa chọn ảnh</span>');}
  function removeResult(){result.replaceChildren();result.hidden=true;pending=false;}
  function stop(){seq++;if(worker){void worker.terminate().catch(()=>{});worker=null;}busy=false;progress.hidden=true;sync();}
  const controller={destroy(){if(disposed)return;disposed=true;stop();releasePhotos();removeResult();form.removeEventListener('reset',reset);form.closest('dialog')?.removeEventListener('close',onClose);delete form.dataset.confirmationBlocked;}};
  sessions.set(form,controller);
  function reset(){stop();releasePhotos();removeResult();notice('Chưa chọn ảnh.');sync();}
  function onClose(){controller.destroy();}
  form.addEventListener('reset',reset);form.closest('dialog')?.addEventListener('close',onClose);
  target.addEventListener('change',()=>{reset();notice('Đã chuyển khách. Chọn ảnh giấy tờ của '+current().label+'.');});
  panel.querySelectorAll('[data-id-rotate]').forEach(button=>button.onclick=()=>{const photo=photos[button.dataset.idRotate];if(!photo||busy)return;removeResult();const original=photo.canvas,canvas=document.createElement('canvas');canvas.width=original.height;canvas.height=original.width;const ctx=canvas.getContext('2d');ctx.translate(canvas.width,0);ctx.rotate(Math.PI/2);ctx.drawImage(original,0,0);photo.canvas=canvas;$('[data-id-preview="'+button.dataset.idRotate+'"] img').src=canvas.toDataURL('image/jpeg',.9);notice('Đã xoay ảnh. Nhấn Đọc thông tin để đọc lại.');sync();});
  clear.onclick=reset;cancel.onclick=()=>{stop();notice('Đã dừng đọc. Hồ sơ đang nhập được giữ nguyên.');};
  panel.querySelectorAll('[data-id-pick]').forEach(btn=>btn.onclick=()=>$('[data-id-file="'+btn.dataset.idPick+'"]').click());
  panel.querySelectorAll('[data-id-camera]').forEach(btn=>btn.onclick=()=>$('[data-id-camera-file="'+btn.dataset.idCamera+'"]').click());
  async function decoded(file){
   let image;if(window.createImageBitmap)image=await createImageBitmap(file);else image=await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{URL.revokeObjectURL(url);resolve(img);};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Ảnh không đọc được.'));};img.src=url;});
   const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;if(!width||!height||width*height>32000000){image.close?.();throw Error('Ảnh quá lớn hoặc không hợp lệ. Chọn ảnh dưới 32 megapixel.');}
   const scale=Math.min(1,2200/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);canvas.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0,canvas.width,canvas.height);image.close?.();return canvas;
  }
  panel.querySelectorAll('input[type=file]').forEach(input=>input.onchange=async()=>{
   const file=input.files?.[0],side=input.dataset.idFile||input.dataset.idCameraFile;if(!file)return;const ticket=++seq;
   if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){notice('Chọn ảnh JPG, PNG hoặc WebP không quá 8 MB.');input.value='';return;}
   busy=true;removeResult();sync();notice('Đang kiểm tra ảnh…');
   try{const canvas=await decoded(file);if(ticket!==seq||disposed)return;if(photos[side])URL.revokeObjectURL(photos[side].url);photos[side]={canvas,url:URL.createObjectURL(file)};const img=document.createElement('img');img.alt=side==='front'?'Ảnh mặt trước để đối chiếu':'Ảnh mặt sau để đối chiếu';img.src=photos[side].url;$('[data-id-preview="'+side+'"]').replaceChildren(img);notice('Đã chọn ảnh. Nhấn Đọc thông tin để bắt đầu.');}catch{if(ticket===seq)notice('Không mở được ảnh. Hãy chọn JPG, PNG hoặc WebP rõ và đủ bốn góc.');}finally{if(ticket===seq){busy=false;sync();}}
  });
  function show(extracted,raw,source,confidence){
   const recognized=fields.filter(([key])=>extracted[key]&&inputFor(key)),who=current();
   if(!recognized.length){notice('Chưa tách được thông tin. Chụp rõ hơn hoặc nhập trực tiếp trong hồ sơ.');return;}
   pending=true;result.hidden=false;result.innerHTML=`<h4>Kết quả cho ${e(who.label)}</h4><p>Nguồn đọc: ${e(source)}${Number.isFinite(confidence)?' · Điểm đọc chữ '+Math.round(confidence)+'/100':''}. Chọn từng dòng muốn điền; dòng khác thông tin đã nhập được bỏ chọn sẵn.</p><div class="table-scroll" tabindex="0" aria-label="Đối chiếu kết quả đọc giấy tờ"><table><thead><tr><th>Điền</th><th>Thông tin</th><th>Đang nhập</th><th>Đọc được và có thể sửa</th></tr></thead><tbody>${recognized.map(([key,title,type])=>{const old=inputFor(key).value,value=extracted[key],same=!old||old===value;return `<tr><td><input type="checkbox" data-id-use="${key}" aria-label="Điền ${e(title)}" ${same?'checked':''}></td><td>${e(title)}</td><td class="identity-current">${e(label(key,old)||'Chưa có')}</td><td>${type==='gender'?`<select data-id-value="${key}" aria-label="${e(title)} đọc được">${[['MALE','Nam'],['FEMALE','Nữ'],['OTHER','Khác']].map(([v,t])=>`<option value="${v}" ${value===v?'selected':''}>${t}</option>`).join('')}</select>`:type==='document'?`<select data-id-value="${key}" aria-label="${e(title)} đọc được"><option value="NATIONAL_ID">CMND / CCCD</option></select>`:`<input type="${type}" data-id-value="${key}" aria-label="${e(title)} đọc được" value="${e(value)}" maxlength="${['guestAddress','hometown','issuedBy'].includes(key)?500:255}">`}</td></tr>`;}).join('')}</tbody></table></div>${extracted.expiryDate&&extracted.expiryDate<HS.today()?'<p class="notice warning">Ngày hết hạn đọc được đã qua. Kiểm tra lại giấy tờ và kết quả đọc.</p>':''}<p>${recognized.some(([k])=>k==='idNumber')?'':'Chưa đọc được số giấy tờ. '}${recognized.some(([k])=>k==='guestName')?'':'Chưa đọc được họ tên. '}Các mục không đọc được giữ nguyên; nhập bổ sung trong hồ sơ.</p><label class="checkbox-label"><input type="checkbox" data-id-verified>Tôi đã đối chiếu các thông tin sẽ điền với giấy tờ gốc của đúng khách.</label><div class="actions"><button type="button" class="btn primary" data-id-apply disabled>Điền các mục đã chọn</button><button type="button" class="btn secondary" data-id-discard>Bỏ kết quả</button></div>${raw?'<details><summary>Xem chữ OCR đọc được</summary><pre data-id-raw></pre></details>':''}`;
   if(raw)$('[data-id-raw]').textContent=raw;
   const apply=$('[data-id-apply]'),verified=$('[data-id-verified]');
   const ready=()=>{apply.disabled=!verified.checked||!result.querySelector('[data-id-use]:checked');};result.onchange=ready;
   $('[data-id-discard]').onclick=()=>{removeResult();notice('Đã bỏ kết quả. Hồ sơ giữ nguyên.');sync();};
   apply.onclick=()=>{
    if(!verified.checked||busy)return;const changes=[];
    for(const check of result.querySelectorAll('[data-id-use]:checked')){const key=check.dataset.idUse,value=$('[data-id-value="'+key+'"]').value.trim();if(!P.valid(key,value)){notice('Kiểm tra lại '+fields.find(x=>x[0]===key)[1]+' trước khi điền.');return;}changes.push([inputFor(key),value]);}
    if(!changes.length)return;const type=changes.find(([input])=>input===inputFor('documentType'))?.[1]||inputFor('documentType')?.value;if(changes.some(([input])=>input===inputFor('idNumber'))&&type!=='NATIONAL_ID'){notice('Chọn cả dòng Loại giấy tờ CMND / CCCD trước khi điền số giấy tờ.');return;}for(const [input,value] of changes){input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
    removeResult();releasePhotos();notice('Đã điền '+changes.length+' mục cho '+who.label+'. Kiểm tra hồ sơ rồi nhấn Lưu hoặc xác nhận nhận phòng.');sync();
   };
   notice('Đã đọc xong. Đối chiếu và chọn các mục cần điền.');sync();result.tabIndex=-1;result.scrollIntoView({block:'start'});result.focus({preventScroll:true});
  }
  read.onclick=async()=>{
   if(busy||!Object.keys(photos).length)return;const ticket=++seq;busy=true;removeResult();progress.hidden=false;progress.value=0;notice('Đang tìm QR trên giấy tờ…');sync();let timeout;
   try{
    await script('/vendor/identity/jsQR.js');let qrResult=null;const numbers=new Set();
    for(const photo of Object.values(photos)){const canvas=photo.canvas,ctx=canvas.getContext('2d',{willReadFrequently:true}),data=ctx.getImageData(0,0,canvas.width,canvas.height),code=window.jsQR(data.data,canvas.width,canvas.height,{inversionAttempts:'attemptBoth'});if(code){const found=P.qr(code.data);if(found){numbers.add(found.fields.idNumber);qrResult||=found;}}}
    if(ticket!==seq||disposed)return;
    if(numbers.size>1){notice('Hai ảnh có số giấy tờ khác nhau. Chọn lại đúng hai mặt của một khách.');return;}
    if(qrResult&&!$('[data-id-extra]').checked){busy=false;progress.hidden=true;show(qrResult.fields,'','QR trên ảnh');return;}
    notice(qrResult?'Đã có QR. Đang đọc thêm chữ trên thẻ…':'Không có QR phù hợp. Đang khởi tạo bộ đọc chữ tiếng Việt…');await script('/vendor/identity/tesseract.min.js');if(ticket!==seq||disposed)return;
    timeout=setTimeout(()=>{if(ticket===seq){stop();notice('Đọc ảnh mất quá nhiều thời gian. Chọn ảnh rõ hơn, ưu tiên mặt có QR, hoặc nhập thủ công.');}},90000);
    const instance=await Tesseract.createWorker(['vie','eng'],1,{workerPath:'/vendor/identity/worker.min.js',corePath:'/vendor/identity/core',langPath:'/vendor/identity/lang',workerBlobURL:false,cacheMethod:'none',logger:message=>{if(ticket!==seq||disposed)return;if(message.status==='recognizing text'){progress.value=Math.round((message.progress||0)*100);notice('Đang đọc chữ… '+progress.value+'%');}}});
    if(ticket!==seq||disposed){await instance.terminate();return;}worker=instance;await instance.setParameters({tessedit_pageseg_mode:'6'});
    let raw='',score=0,n=0;for(const photo of Object.values(photos)){const output=await instance.recognize(photo.canvas);if(ticket!==seq||disposed)return;raw+='\n'+output.data.text;const document=P.ocr(output.data.text);if(document.fields.idNumber)numbers.add(document.fields.idNumber);score+=output.data.confidence||0;n++;}
    await instance.terminate();worker=null;if(ticket!==seq||disposed)return;busy=false;progress.hidden=true;if(numbers.size>1){notice('Số giấy tờ đọc được trên các ảnh hoặc giữa QR và OCR không khớp. Đối chiếu ảnh, hoặc bỏ chọn Đọc thêm chữ để dùng QR.');return;}const found=P.ocr(raw);show({...found.fields,...(qrResult?.fields||{})},raw.trim(),qrResult?'QR và OCR từ ảnh':'OCR từ ảnh',score/n);
   }catch{if(ticket===seq&&!disposed){busy=false;notice('Chưa đọc được ảnh. Thử ảnh rõ hơn hoặc nhập thông tin trực tiếp.');}}
   finally{clearTimeout(timeout);if(ticket===seq){if(worker){void worker.terminate().catch(()=>{});worker=null;}busy=false;progress.hidden=true;sync();}}
  };
  sync();return controller;
 }
 function profiles(info){
  const people=[{...info,guestName:info.guestName||'Chưa có họ tên',label:'Khách đứng tên'},...(info.companionDetails||[]).map((p,i)=>({...p,guestName:p.fullName,label:'Khách đi cùng '+(i+1)}))];
  return people.map(person=>'<section class="identity-profile"><h3>'+e(person.label)+' · '+e(person.guestName||'Chưa có họ tên')+'</h3><dl>'+fields.filter(([key])=>key!=='guestName').map(([key,title])=>'<div '+(['guestAddress','hometown','issuedBy'].includes(key)?'class="identity-address"':'')+'><dt>'+e(title)+'</dt><dd>'+e(label(key,person[key])||'Chưa ghi nhận')+'</dd></div>').join('')+'</dl></section>').join('');
 }
 return {html,mount,profiles,fields,dispose:form=>sessions.get(form)?.destroy()};
})();
