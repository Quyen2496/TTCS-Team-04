'use strict';
const crypto=require('node:crypto'),D=require('./domain'),A=require('./access'),Data=require('./ai-data'),Conversation=require('./ai-conversation'),Provider=require('./ai-provider'),Export=require('./ai-export'),Policy=require('./ai-policy'),Narration=require('./ai-narration');
function register(app,{store,route,ok,auth,options={}}){
 const rate=new Map(),busy=new Set(),env=options.aiEnv||process.env;
 const selected=req=>req.get('X-Homestay-Id')||req.query.homestayId||null;
 const session=(s,req,id)=>{const c=(s.aiConversations||[]).find(c=>c._id===id&&c.userId===req.user._id);if(!c)D.fail('Không tìm thấy cuộc trò chuyện.','NOT_FOUND',404);return c;};
 const current=(s,req)=>{const u=s.users.find(u=>u._id===req.user._id&&u.active);if(!u||(u.sessionVersion||0)!==(req.user.sessionVersion||0))D.fail('Phiên đăng nhập đã thay đổi. Vui lòng đăng nhập lại.','UNAUTHORIZED',401);return u;};
 const summary=c=>({_id:c._id,title:c.title,updatedAt:c.updatedAt});
 const visible=(s,u,m)=>{
  if(m.role==='user')return {_id:m._id,role:m.role,content:m.content,at:m.at};
  const r=m.result;
  if(!Policy.canView(s,u,r))return {_id:m._id,role:'assistant',at:m.at,result:{answer:'Quyền hoặc phạm vi cơ sở đã thay đổi. Hãy hỏi lại để lấy dữ liệu được phép hiện tại.',columns:[],rows:[],sources:[],restricted:true}};
  const {context,permission,requiredPermissions,propertyIds,bookingCodes,exportRows,...safe}=r;safe.exportable=r.intent==='export'?!!r.exportsReady&&Policy.canExport(u,r):Conversation.exportable(r,u);if(!safe.exportable){safe.exportsReady=false;safe.exportPrompt=null;}else if(r.intent!=='export'&&!r.exportsReady)safe.exportPrompt=r.exportPrompt||'Bạn có muốn xuất kết quả này thành file Excel hoặc PDF không?';return {_id:m._id,role:'assistant',at:m.at,result:safe};
 };
 app.get('/api/ai/status',auth(),route(async(req,res)=>{const s=await store.read(),u=current(s,req),c=Provider.config(env);Data.scope(s,u,selected(req));ok(res,{provider:c.provider,model:c.model||null,configured:c.ready,permissions:A.permissions(u),homestays:(u.role==='guest'?s.homestays.filter(h=>h.active):A.allowedProperties(s,u)).map(h=>({_id:h._id,name:h.name})),mode:c.ready?'AI hỗ trợ hiểu nhu cầu và diễn đạt từ dữ liệu kiểm chứng':'Tra cứu dữ liệu theo quy tắc — chưa bật mô hình AI'});}));
 app.get('/api/ai/sessions',auth(),route(async(req,res)=>{const s=await store.read();ok(res,(s.aiConversations||[]).filter(c=>c.userId===req.user._id).map(summary).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)));}));
 app.post('/api/ai/sessions',auth(),route(async(req,res)=>ok(res,await store.mutate(s=>{current(s,req);s.aiConversations||=[];const mine=s.aiConversations.filter(c=>c.userId===req.user._id);if(mine.length>=30)D.fail('Tối đa 30 cuộc trò chuyện. Xoá một cuộc cũ để tạo mới.');if(s.aiConversations.length>=3000)D.fail('Lịch sử đã đạt giới hạn lưu. Quản trị viên cần dọn lịch sử cũ.');const c={_id:D.id(),userId:req.user._id,title:'Cuộc trò chuyện mới',updatedAt:new Date().toISOString(),messages:[]};s.aiConversations.push(c);return summary(c);}),201)));
 app.get('/api/ai/sessions/:id',auth(),route(async(req,res)=>{const s=await store.read(),u=current(s,req),c=session(s,req,req.params.id);ok(res,{...summary(c),messages:c.messages.map(m=>visible(s,u,m))});}));
 app.patch('/api/ai/sessions/:id',auth(),route(async(req,res)=>{const title=req.body.title;if(typeof title!=='string'||!title.trim()||title.length>100)D.fail('Tên cuộc trò chuyện cần 1–100 ký tự.');ok(res,await store.mutate(s=>{current(s,req);const c=session(s,req,req.params.id);c.title=Provider.redact(title.trim());return summary(c);}));}));
 app.delete('/api/ai/sessions/:id',auth(),route(async(req,res)=>{await store.mutate(s=>{current(s,req);session(s,req,req.params.id);s.aiConversations=s.aiConversations.filter(c=>c._id!==req.params.id);});ok(res,{});}));
 app.post('/api/ai/chat',auth(),route(async(req,res)=>{
  const {question,sessionId,requestKey}=req.body;if(typeof question!=='string'||!question.trim()||question.length>1500||typeof requestKey!=='string'||!/^[a-f0-9]{32}$/.test(requestKey))D.fail('Câu hỏi cần 1–1500 ký tự và mã yêu cầu hợp lệ.');const action=Conversation.validateAction(req.body.action);
  const s=await store.read(),u=current(s,req),c=session(s,req,sessionId);Data.scope(s,u,selected(req));
  const fingerprint=crypto.createHash('sha256').update(JSON.stringify({question,selected:selected(req),...(action?{action}:{})})).digest('hex'),old=c.messages.find(m=>m.requestKey===requestKey);
  if(old){if(old.fingerprint!==fingerprint)D.fail('Mã yêu cầu đã dùng cho câu hỏi khác.','REQUEST_CONFLICT',409);return ok(res,visible(s,u,old));}
  const lock=u._id;if(busy.has(lock))D.fail('Trợ lý đang xử lý câu trước. Vui lòng chờ.','AI_BUSY',409);
  const now=Date.now();for(const [k,v]of rate)if(!v.some(t=>t>now-300000))rate.delete(k);const times=(rate.get(lock)||[]).filter(t=>t>now-300000);if(times.length>=20)throw new D.AppError(429,'RATE_LIMITED','Tối đa 20 câu hỏi trong 5 phút.',Math.ceil((times[0]+300000-now)/1000));rate.set(lock,[...times,now]);busy.add(lock);
  try{
   const last=c.messages.filter(m=>m.role==='assistant').at(-1);let prior=last?(Policy.canView(s,u,last.result)?{...(last.result.context||{})}:{intent:last.result.context?.intent,topic:last.result.context?.topic,metric:last.result.context?.metric}):{};
   if(last&&['recommendation','availability','quote','room_detail'].includes(last.result.intent)&&c.roomSearchScope!==selected(req))prior={...Provider.publicContext(last.result.context||{}),intent:'recommendation'};
   if(c.roomSearch&&c.roomSearchScope===selected(req)&&Policy.canView(s,u,c.roomSearchGuard))prior={...c.roomSearch,...prior,roomSearch:c.roomSearch};if(last&&Conversation.exportable(last.result,u)&&!prior.exportSourceId){prior.exportSourceId=last._id;prior.exportState='offer';}const local=Conversation.localPlan(question,prior,action);Policy.preflight(u,{metric:prior.metric,...local},question);
   const sensitive=Conversation.unsafe(question);
   const ai=sensitive?{fallback:true,reason:'scope',provider:'disabled'}:action||local.intent==='export'?{fallback:true,reason:'local_action',provider:'rules'}:await Provider.classify(question,prior,{env,fetch:options.aiFetch,timeout:options.aiTimeout||12000});
   const plan=local.intent==='unsupported'&&!sensitive&&ai.plan?ai.plan:{...local,...(ai.plan?.slots&&['recommendation','availability','quote','room_detail'].includes(local.intent)?{slots:ai.plan.slots}:{})};
   const output=await store.mutate(state=>{
    const live=current(state,req),thread=session(state,req,sessionId),view=Data.scope(structuredClone(state),live,selected(req));
    let r,context=prior;const messageId=D.id(),at=new Date().toISOString();
    if(action?.type==='select_room'){
     const source=thread.messages.find(m=>m._id===action.messageId&&m.role==='assistant');if(!source||!source.result.cards?.some(t=>t.roomTypeId===action.roomTypeId))D.fail('Phương án này không còn trong hội thoại. Bạn nhờ mình gợi ý lại nhé.','NOT_FOUND',404);
     if(!Conversation.visibleResult(state,live,source.result)||!view.roomTypes.some(t=>t._id===action.roomTypeId))D.fail('Loại phòng này ngoài phạm vi cơ sở bạn đang xem. Bạn chọn lại cơ sở hoặc nhờ mình gợi ý lại nhé.','FORBIDDEN',403);
     context=source.result.context||{};
    }
    if(plan.intent==='export'){
     const source=thread.messages.find(m=>m._id===(action?.messageId||prior.exportSourceId)&&m.role==='assistant');
     if(!source)r={intent:'export',answer:'Bạn muốn xuất kết quả nào vậy? Mình cần một danh sách hoặc báo cáo trong cuộc chat này trước nhé.',columns:[],rows:[],sources:['Hội thoại hiện tại'],context:{intent:'export'}};
     else{
      if(!Conversation.visibleResult(state,live,source.result)||!Policy.canExport(live,source.result))D.fail('Bạn chưa được cấp quyền xuất kết quả này. Mình vẫn có thể hỗ trợ những nội dung bạn được phép xem nhé.','FORBIDDEN',403);
      const can=Conversation.exportable(source.result,live),declined=action?.type==='export_decline'||/^(khong|khong can|de sau)[.!?\s]*$/.test(Provider.normalize(question));
      r={intent:'export',answer:!can?'Kết quả này chưa có bảng dữ liệu để xuất. Bạn hỏi mình một danh sách hoặc báo cáo cụ thể nhé.':declined?'Được nhé, mình giữ kết quả ở đây. Khi cần xuất file, bạn cứ nhắn mình.':'Được nhé! Bạn chọn Excel để làm việc với bảng dữ liệu, hoặc PDF để đọc và chia sẻ.',columns:[],rows:[],sources:source.result.sources||[],exportTargetId:source._id,exportsReady:can&&!declined,permission:source.result.permission,requiredPermissions:Policy.requirements(source.result),metric:source.result.metric,bookingCodes:source.result.bookingCodes,propertyIds:source.result.propertyIds,context:{...source.result.context,exportSourceId:source._id,exportState:declined?'declined':can?'ready':'none'}};
     }
    }else{r=Conversation.run(view,live,question,plan,context,{roomTypeId:action?.roomTypeId});Conversation.finish(r,live,question,messageId);}
    if(['recommendation','availability','quote','room_detail'].includes(r.intent)){thread.roomSearch={...r.context};delete thread.roomSearch.roomSearch;thread.roomSearchScope=selected(req);thread.roomSearchGuard={intent:r.intent,permission:r.permission,propertyIds:r.propertyIds};}
    r.at=at;r.engine=ai.fallback?'rules':'ai';r.provider=ai.provider;r.model=ai.model||null;r.fallbackReason=ai.reason||null;
    const m={_id:messageId,role:'assistant',at,result:r,requestKey,fingerprint};thread.messages.push({_id:D.id(),role:'user',at,content:Provider.redact(question)},m);thread.messages=thread.messages.slice(-40);thread.updatedAt=at;if(thread.title==='Cuộc trò chuyện mới')thread.title=Provider.redact(question).slice(0,60);
    if(Buffer.byteLength(JSON.stringify(state.aiConversations))>4*1024*1024||Buffer.byteLength(JSON.stringify(state))>14*1024*1024)D.fail('Lịch sử đã đạt dung lượng lưu. Xoá các cuộc trò chuyện cũ rồi hỏi lại.','AI_HISTORY_LIMIT',409);
    return {message:{...visible(state,live,m),session:summary(thread)},facts:Narration.facts(r),intent:r.intent};
   });
   if(output.facts&&!ai.fallback&&env.AI_NATURAL_RESPONSE!=='false'){
    const prose=await Provider.compose(output.facts,output.intent,{env,fetch:options.aiFetch,timeout:options.aiTimeout});
    const rendered=await store.mutate(state=>{const live=current(state,req),thread=session(state,req,sessionId),message=thread.messages.find(m=>m.requestKey===requestKey);if(!message)D.fail('Kết quả không còn trong hội thoại. Bạn hỏi lại nhé.','NOT_FOUND',404);if(Policy.canView(state,live,message.result)){if(!prose.fallback){message.result.answer=prose.answer;message.result.narrated=true;}else message.result.narrationReason=prose.reason;}return {...visible(state,live,message),session:summary(thread)};});ok(res,rendered);
   }else ok(res,output.message);
  }finally{busy.delete(lock);}
 }));
 app.get('/api/ai/sessions/:id/messages/:messageId/export',auth(),route(async(req,res)=>{
  const s=await store.read(),u=current(s,req),c=session(s,req,req.params.id),m=c.messages.find(m=>m._id===req.params.messageId&&m.role==='assistant');if(!m)D.fail('Không tìm thấy kết quả.','NOT_FOUND',404);
  const safe=visible(s,u,m);if(safe.result.restricted)D.fail('Không còn quyền xuất dữ liệu này.','FORBIDDEN',403);if(!Policy.canExport(u,m.result))D.fail('Chưa được cấp quyền xuất báo cáo.','FORBIDDEN',403);
  const format=req.query.format;if(!['xlsx','pdf','csv'].includes(format))D.fail('Định dạng xuất không hợp lệ.');
  if(m.result.totalRows>m.result.rows.length&&!m.result.exportRows)D.fail('Kết quả cũ chỉ lưu một phần bảng. Bạn hỏi lại báo cáo để xuất đủ dữ liệu nhé.','AI_LEGACY_PARTIAL',409);
  const r={...safe.result,rows:m.result.exportRows||safe.result.rows,at:m.at},file='HOMESTAY_AI_'+m._id+'.'+format;
  if(format==='xlsx')res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet').attachment(file).send(Export.xlsx(r));else if(format==='csv')res.type('text/csv; charset=utf-8').attachment(file).send(Export.csv(r));else res.type('application/pdf').attachment(file).send(await Export.pdf(r));
 }));
}
module.exports={register};
