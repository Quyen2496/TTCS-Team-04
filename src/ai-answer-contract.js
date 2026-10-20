'use strict';
// A model's confidence is not proof that its chosen tool answers the question.
// These contracts constrain explicit requests; ambiguous follow-ups remain the
// semantic planner's job. They never grant access or supply database values.
const I=require('./ai-inventory'),E=require('./ai-explanation'),D=require('./domain');
const norm=q=>String(q||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
function required(local,question){
 if(typeof question!=='string'||!question.trim())return null;
 const q=norm(question);
 if(local.publicInfo)return {type:'public_info',...local.publicInfo};
 if(local.explicitLookup){
  if(local.intent==='report')return {type:'report',metric:local.metric,...local.reportPeriod};
  return {type:'lookup',intent:local.intent,topic:local.topic,...(local.serviceInfo?{serviceInfo:local.serviceInfo}:{}),...(local.dialogue?{dialogue:local.dialogue}:{})};
 }
 if((local.catalogFollowup||local.searchRefinement)&&local.intent==='recommendation')return {type:'consultation'};
 if(local.capability?.mode==='general'&&require('./ai-capability').generalInquiry(question))return {type:'capabilities'};
 // Negation, a quoted example, or a question about assistant ability is not an
 // instruction to execute the example. Do not freeze weak keyword matches.
 if(/khong (?:can|muon|phai|yeu cau)|vi du|chang han|neu toi hoi|co the.*(?:dem|thong ke)|(?:dem|thong ke).*duoc khong/.test(q))return null;
 // An explicit metric and period cannot be replaced by a date clarification,
 // a stale catalog count, or a different dataset. Data/permissions stay local.
 if(local.intent==='report'&&/doanh thu|doanh so|thuc thu|thu nhap|cong suat|ty le lap day/.test(q)&&/\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}|\bthang\b|\bnam\s+\d{4}|hom nay|hom qua|ngay mai/.test(q)){
  const metric=require('./ai-policy').metric(question,local),period=require('./ai-data').period(question);
  return {type:'report',metric,...period};
 }
 if(local.inventory)return {type:'count',...I.valid(local.inventory)};
 if(local.explanation)return {type:'explanation',topic:E.valid(local.explanation).topic};
 if(local.capability?.operation==='booking_email_send'&&/gui/.test(q)&&/booking|dat phong/.test(q))return {type:'action_response',operation:'booking_email_send'};
 return null;
}
function compatible(plan,c){
 if(!c)return true;
 if(!plan||plan.understanding?.confidence==='low'||plan.understanding?.clarify)return false;
 if(c.type==='public_info')return plan.intent==='policy'&&!!plan.publicInfo&&plan.publicInfo.kind===c.kind&&JSON.stringify(plan.publicInfo.topics)===JSON.stringify(c.topics);
 if(c.type==='report')return plan.intent==='report'&&plan.metric===c.metric;
 if(c.type==='lookup')return plan.intent===c.intent&&(!c.topic||plan.topic===c.topic)&&(!c.serviceInfo||plan.serviceInfo===c.serviceInfo)&&(!c.dialogue||JSON.stringify(plan.dialogue)===JSON.stringify(c.dialogue));
 if(c.type==='consultation')return plan.intent==='recommendation';
 if(c.type==='capabilities')return plan.intent==='policy'&&plan.capability?.mode==='general'&&!plan.capability.operation;
 if(c.type==='count')return plan.intent==='policy'&&!!plan.inventory&&['kind','scope','breakdown'].every(k=>I.valid(plan.inventory)[k]===c[k]);
 if(c.type==='explanation')return plan.intent==='policy'&&plan.explanation?.topic===c.topic;
 return plan.intent==='policy'&&plan.capability?.operation===c.operation;
}
function enforce(local,candidate,c){
 if(!c)return candidate;
 const matched=compatible(candidate,c),plan=matched?candidate:{...local,...(c.type==='report'?{metric:c.metric}:{})};
 // Do not carry the rejected model's low confidence into an explicit request.
 return {...plan,...(local.explicitLookup?{explicitLookup:true,...(local.reportPeriod?{reportPeriod:local.reportPeriod}:{})}:{}),...(c.type==='consultation'?{catalogFollowup:true,slots:{...(plan.slots||{}),...(local.slots||{})}}:{}),answerContract:{...c,corrected:!matched}};
}
function verify(plan,result){
 const c=plan.answerContract;if(!c)return;
 let valid=compatible({...plan,understanding:undefined},c);
 if(c.type==='public_info')valid=valid&&result.publicCatalog===true&&result.context?.publicInfo?.kind===c.kind&&JSON.stringify(result.context.publicInfo.topics)===JSON.stringify(c.topics);
 else if(c.type==='report')valid=valid&&result.intent==='report'&&result.metric===c.metric&&(!c.from||result.context?.from===c.from)&&(!c.to||result.context?.to===c.to);
 else if(c.type==='lookup')valid=valid&&result.intent===c.intent;
 else if(c.type==='count')valid=valid&&result.answerValue?.type==='count'&&Number.isSafeInteger(result.answerValue.value)&&result.answerValue.value>=0&&result.answerValue.entity===c.kind&&result.answerValue.scope===c.scope&&result.context?.inventory?.kind===c.kind&&result.context.inventory.scope===c.scope;
 else if(c.type==='explanation')valid=valid&&result.context?.explanation?.topic===c.topic;
 else if(c.type==='capabilities')valid=valid&&result.context?.capability?.mode==='general';
 else if(c.type==='consultation')valid=valid&&result.intent==='recommendation';
 else valid=valid&&result.context?.capability?.operation===c.operation;
 if(!valid)D.fail('Chưa lấy được kết quả đúng với yêu cầu. Bạn thử lại hoặc chọn rõ chức năng cần tra cứu.','AI_ANSWER_MISMATCH',503);
 result.context={...result.context,answerContract:c};
}
module.exports={required,compatible,enforce,verify};
