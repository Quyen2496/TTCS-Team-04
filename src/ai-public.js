'use strict';
const crypto=require('node:crypto'),D=require('./domain'),Conversation=require('./ai-conversation'),Data=require('./ai-data'),Provider=require('./ai-provider'),Scope=require('./ai-scope'),Understanding=require('./ai-understanding'),Policy=require('./ai-policy'),Narration=require('./ai-narration');
function register(app,{store,route,ok,options={}}){
 const visitors=new Map(),rates=new Map(),env=options.aiEnv||process.env;let globalCalls=[];
 const summary=c=>({_id:c._id,title:c.title,updatedAt:c.updatedAt});
 const visible=m=>{if(m.role==='user')return {_id:m._id,role:m.role,at:m.at,content:m.content};const {context,permission,requiredPermissions,propertyIds,bookingCodes,exportRows,narrationFacts,...r}=m.result;return {_id:m._id,role:'assistant',at:m.at,result:{...r,exportable:false,exportsReady:false,exportPrompt:null}};};
 const selected=req=>req.get('X-Homestay-Id')||req.query.homestayId||null;
 function identity(req,res,next){
  try{
   const now=Date.now();for(const [k,v]of visitors)if(v.expires<=now)visitors.delete(k);
   for(const [k,v]of rates)if(v.every(t=>t<=now-300000))rates.delete(k);
   const origin=req.get('Origin');if(req.get('Sec-Fetch-Site')==='cross-site'||origin&&new URL(origin).host!==req.get('Host'))D.fail('Chỉ hỗ trợ hội thoại trên website homestay.','FORBIDDEN',403);
   let token=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('hs_ai_visitor='))?.slice(14);
   if(!/^[a-f0-9]{48}$/.test(token||'')||!visitors.has(token)){
    if(req.method!=='GET'||!req.path.endsWith('/status'))D.fail('Phiên tư vấn đã hết. Tải lại trợ lý để bắt đầu.','AI_VISITOR_EXPIRED',401);
    if(visitors.size>=200||rates.size>=2000)D.fail('Trợ lý đang bận. Bạn thử lại sau ít phút nhé.','RATE_LIMITED',429);
    token=crypto.randomBytes(24).toString('hex');visitors.set(token,{created:now,expires:now+3600000,user:{_id:D.id(),role:'guest',anonymous:true,permissions:[],active:true},sessions:[],busy:false});
   }
   const v=visitors.get(token);v.expires=Math.min(now+3600000,v.created+14400000);
   res.cookie('hs_ai_visitor',token,{httpOnly:true,sameSite:'strict',secure:req.secure||req.get('X-Forwarded-Proto')==='https',path:'/api/public/ai',maxAge:Math.max(0,v.expires-now)});req.visitor=v;next();
  }catch(error){next(error);}
 }
 const thread=(req,id)=>{const c=req.visitor.sessions.find(c=>c._id===id);if(!c)D.fail('Không tìm thấy cuộc trò chuyện.','NOT_FOUND',404);return c;};
 const profile=(question,plan)=>plan?.publicInfo?'policy':/tien nghi|gia tham khao/.test(Provider.normalize(question))?'catalog':'availability';
 const load=async kind=>structuredClone(await (store.readPublic?store.readPublic(kind):store.read()));
 const catalog=async(req,all=false,question,plan,source)=>{const s=source||await load(question?profile(question,plan):'policy');s.aiConversations=[];return Data.publicScope(s,plan?require('./ai-query-scope').selection(s,req.visitor.user,question,plan,all?null:selected(req)):all?null:selected(req));};
 const budget=req=>{const now=Date.now(),ip=req.ip,times=(rates.get(ip)||[]).filter(t=>t>now-300000);globalCalls=globalCalls.filter(t=>t>now-300000);if(times.length>=20||globalCalls.length>=120)throw new D.AppError(429,'RATE_LIMITED','Trợ lý đã nhận nhiều câu hỏi. Bạn thử lại sau ít phút nhé.',300);rates.set(ip,[...times,now]);globalCalls.push(now);};
 app.get('/api/public/ai/status',identity,route(async(req,res)=>{const s=await catalog(req);ok(res,{runtime:require('./ai-telemetry').runtime(),anonymous:true,role:'guest',roleLabel:'Khách chưa đăng nhập',understandingMode:Understanding.enabled(env)?'semantic':'rules',configured:Provider.health(env,options.aiFetch).some(p=>p.configured),provider:null,model:null,permissions:[],homestays:s.homestays.map(h=>({_id:h._id,name:h.name})),mode:'Hỗ trợ tìm phòng, báo giá và chính sách lưu trú. Đăng nhập khi tiếp tục đặt phòng.'});}));
 app.get('/api/public/ai/sessions',identity,(req,res)=>ok(res,req.visitor.sessions.map(summary).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))));
 app.post('/api/public/ai/sessions',identity,route(async(req,res)=>{if(req.visitor.sessions.length>=3)D.fail('Tối đa 3 hội thoại tư vấn. Bạn xoá một cuộc cũ để tạo mới.');const c={_id:D.id(),title:'Cuộc trò chuyện mới',updatedAt:new Date().toISOString(),messages:[]};req.visitor.sessions.push(c);ok(res,summary(c),201);}));
 app.get('/api/public/ai/sessions/:id',identity,route(async(req,res)=>{const c=thread(req,req.params.id);ok(res,{...summary(c),messages:c.messages.map(visible)});}));
 app.patch('/api/public/ai/sessions/:id',identity,route(async(req,res)=>{const c=thread(req,req.params.id),title=req.body.title;if(typeof title!=='string'||!title.trim()||title.length>100)D.fail('Tên hội thoại cần 1–100 ký tự.');c.title=Provider.redact(title.trim());ok(res,summary(c));}));
 app.delete('/api/public/ai/sessions/:id',identity,route(async(req,res)=>{thread(req,req.params.id);if(req.visitor.busy)D.fail('Đợi câu hỏi hiện tại xử lý xong.','AI_BUSY',409);req.visitor.sessions=req.visitor.sessions.filter(c=>c._id!==req.params.id);ok(res,{});}));
 app.post('/api/public/ai/chat',identity,route(async(req,res)=>{
  const {question,sessionId,requestKey}=req.body,v=req.visitor,u=v.user,c=thread(req,sessionId);
  if(typeof question!=='string'||!question.trim()||question.length>1500||typeof requestKey!=='string'||!/^[a-f0-9]{32}$/.test(requestKey))D.fail('Câu hỏi cần 1–1500 ký tự và mã yêu cầu hợp lệ.');
  const action=Conversation.validateAction(req.body.action),fingerprint=crypto.createHash('sha256').update(JSON.stringify({question,selected:selected(req),action})).digest('hex');
  const old=c.messages.find(m=>m.requestKey===requestKey);
  const send=m=>{const data={...visible(m),session:summary(c)};return m.result.denied?res.status(403).json({success:false,code:'FORBIDDEN',message:m.result.answer,data}):ok(res,data);};
  if(old){if(old.fingerprint!==fingerprint)D.fail('Mã yêu cầu đã được dùng.','REQUEST_CONFLICT',409);return send(old);}
  if(v.busy)D.fail('Trợ lý đang xử lý câu trước.','AI_BUSY',409);budget(req);v.busy=true;
  try{
   const publicRequest=require('./ai-public-request').resolve(question);let raw=await load(profile(question,publicRequest));
   let s=await catalog(req,false,question,undefined,raw);const last=c.messages.filter(m=>m.role==='assistant'&&!m.result.denied).at(-1);
   const prior=c.scope===selected(req)?{...(c.roomSearch||{}),...(last?.result.context||{}),...(c.roomSearch?{roomSearch:c.roomSearch}:{})}:{};
   if(publicRequest?.publicInfo?.topics.includes('breakfast')&&(require('./ai-entities').properties(raw,question).matches.length||selected(req)||prior.publicPropertyId)){raw=await load('details');s=await catalog(req,false,question,undefined,raw);}
   const history=require('./ai-service-voice').history(s,u,c.messages,Policy.canView,Provider.redact),local=require('./ai-visibility').annotate(Conversation.localPlan(question,prior,action,u,s),question);
   if((Understanding.enabled(env)||!Provider.health(env,options.aiFetch).some(p=>p.configured))&&local.intent==='unsupported'&&[null,'unclear'].includes(Scope.reason(u,question,{previous:prior,plan:local,catalog:s.roomTypes})))Object.assign(local,Understanding.clarification());
   const semantic=Understanding.enabled(env)&&!action;const modelStarted=performance.now();
   let rejected=Scope.reason(u,question,{previous:prior,action,plan:local,catalog:s.roomTypes}),ai={fallback:true,provider:'rules',reason:'local_plan',narrate:true};
   if(semantic&&rejected&&!['secret','unrelated'].includes(rejected)&&(rejected!=='unclear'||Understanding.related(question,prior)))rejected=null;
   if(!rejected&&!semantic)try{Policy.preflight(u,local,question);}catch(error){if(error.status===403)rejected='permission';else throw error;}
   if(!rejected&&!(env.AI_SMART_ROUTING==='true'&&env.AI_VERIFIED_ROUTING!=='false'&&local.explicitLookup)&&(semantic||local.intent==='unsupported'))ai=await Provider.classify(question,prior,{env,fetch:options.aiFetch,timeout:options.aiTimeout||12000,onTiming:options.aiTiming,onPlan:options.aiPlan,history,actor:require('./ai-dialogue').actor(u),requiredAnswer:require('./ai-answer-contract').required(local,question),semantic});
   const plan=semantic?Understanding.choose(local,ai,{question}):local.intent==='unsupported'&&ai.plan?ai.plan:local;
   Object.assign(plan,require('./ai-visibility').annotate(plan,question));
   if(!(semantic&&plan.understanding?.confidence==='low'))rejected||=Scope.reason(u,question,{previous:prior,action,plan,catalog:s.roomTypes});if(plan.intent==='unsupported')rejected||='unsupported';
   if(!rejected)try{Policy.preflight(u,plan,question);}catch(error){if(error.status===403)rejected='permission';else throw error;}
   let result;
   if(rejected)result={intent:'unsupported',answer:Scope.denial(u,rejected),denied:true,restricted:true,columns:[],rows:[],sources:['Phạm vi khách chưa đăng nhập'],context:{intent:'unsupported'}};
   else{
    const waitedForModel=!!ai.plan||performance.now()-modelStarted>100;
    s=await catalog(req,plan.inventory?.scope==='all_assigned',question,plan,waitedForModel?undefined:raw);let context=semantic?Understanding.context(plan,prior):prior;
    if(action?.type==='select_room'){
     const source=c.messages.find(m=>m._id===action.messageId&&m.role==='assistant');
     if(!source?.result.cards?.some(t=>t.roomTypeId===action.roomTypeId)||!s.roomTypes.some(t=>t._id===action.roomTypeId&&t.active))D.fail('Phương án không còn phù hợp. Bạn nhờ mình tìm lại phòng nhé.','NOT_FOUND',404);
     context=source.result.context||{};
    }
    result=Conversation.run(s,u,question,plan,context,{roomTypeId:action?.roomTypeId});
    require('./ai-answer-contract').verify(plan,result);
    if(plan.understanding)result.context={...result.context,understanding:plan.understanding};
    const facts=Narration.facts(result);if(facts&&!(env.AI_SMART_ROUTING==='true'&&(result.cards||result.detail||result.columns?.length||Object.keys(facts).length===1&&facts.RESULT))&&result.context?.understanding?.confidence!=='low'&&!result.context?.capability&&!result.context?.inventory&&!result.context?.explanation&&env.AI_NATURAL_RESPONSE!=='false'){
     const prose=await Provider.compose(facts,result.intent,{env,fetch:options.aiFetch,timeout:options.aiTimeout,onTiming:options.aiTiming,question,role:'guest',history,actor:require('./ai-dialogue').actor(u),context:result.context||prior});
     if(!prose.fallback){result.answer=prose.answer;result.narrated=true;result.engine='ai';}else result.engine='rules';
    }
   }
   result.engine||=ai.fallback?'rules':'ai';result.provider=ai.provider;result.model=ai.model||null;result.fallbackReason=ai.reason||null;result.failoverFrom=ai.failoverFrom||null;
   if(['recommendation','availability','quote','room_detail'].includes(result.intent))c.roomSearch={...result.context};
   c.scope=selected(req);const at=new Date().toISOString(),m={_id:D.id(),role:'assistant',at,requestKey,fingerprint,result:{...result,at,exportable:false,exportPrompt:null,exportsReady:false}};
   const messages=[...c.messages,{_id:D.id(),role:'user',at,content:Provider.redact(question)},m].slice(-24);
   if(Buffer.byteLength(JSON.stringify(messages))>128*1024)D.fail('Hội thoại đã đầy. Bạn tạo cuộc trò chuyện mới nhé.','AI_HISTORY_LIMIT',409);
   c.messages=messages;c.updatedAt=at;if(c.title==='Cuộc trò chuyện mới')c.title=Provider.redact(question).slice(0,60);return send(m);
  }finally{v.busy=false;}
 }));
}
module.exports={register};
