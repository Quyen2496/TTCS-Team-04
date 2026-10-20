'use strict';
// Interpretation is distinct from authorization and execution. A confident
// model plan still has no authority to grant access or invent data/results.
const confidences=['high','low'],relations=['new_topic','followup','correction'],clarifications=['goal','subject','scope','dates'];
const enabled=env=>env.AI_SEMANTIC_ROUTING==='true';
function valid(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!['confidence','relation','clarify'].includes(k))||!confidences.includes(v.confidence)||!relations.includes(v.relation)||v.clarify!==undefined&&!clarifications.includes(v.clarify))throw Error('INVALID_AI_OUTPUT');
 return {...v};
}
function clarification(kind='goal'){
 return {intent:'policy',topic:'general',understanding:{confidence:'low',relation:'followup',clarify:clarifications.includes(kind)?kind:'goal'}};
}
function choose(local,ai,options={}){
 const C=require('./ai-answer-contract'),contract=C.required(local,options.question);
 if(local.understanding?.confidence==='low'&&ai?.plan?.intent==='unsupported')return local;
 if(ai?.plan?.understanding){const u=valid(ai.plan.understanding),candidate=u.confidence==='low'||u.clarify?clarification(u.clarify):ai.plan;return C.enforce(local,candidate,contract);}
 // Without semantic evidence, never turn an inferred reference into a claim
 // that a particular operation or object is what the user actually meant.
 if(local.intent==='unsupported'||local.needsUnderstanding)return C.enforce(local,clarification(),contract);
 return C.enforce(local,local,contract);
}
function context(plan,previous){
 if(plan.explicitLookup||plan.answerContract?.type==='lookup'||plan.answerContract?.type==='report')return previous;
 if(plan.catalogFollowup||plan.searchRefinement)return {...previous,...(previous.roomSearch?{roomSearch:previous.roomSearch}:{})};
 const u=plan.understanding;if(!u||u.relation==='followup')return previous;
 return previous.roomSearch?{roomSearch:previous.roomSearch}:{};
}
function related(q,previous={}){
 const n=require('./ai-provider').normalize(q);
 return /homestay|phong|booking|luu tru|tai khoan|vai tro|quyen|doanh thu|khach|tro ly|\bai\b|chuc nang|bao cao|gia|co so/.test(n)||n.length<=300&&!!(previous.dialogue||previous.capability||previous.inventory||previous.intent&&previous.intent!=='unsupported');
}
function result(u,plan){
 if(plan.understanding?.confidence!=='low')return null;
 const prompts={goal:'Bạn muốn mình tra số liệu, giải thích cách làm hay kiểm tra khả năng của trợ lý?',subject:'Bạn đang muốn hỏi chức năng hoặc đối tượng nào trong homestay?',scope:'Bạn muốn xem một homestay cụ thể hay toàn bộ cơ sở được cấp quyền?',dates:'Bạn muốn xem trong khoảng ngày nào?'};
 const kind=plan.understanding.clarify||'goal',answer='Mình chưa xác định chắc ý bạn nên cần hỏi rõ một chút. '+prompts[kind];
 return {intent:'policy',answer,columns:[],rows:[],totalRows:0,sources:['Làm rõ yêu cầu trước khi tra cứu'],propertyIds:[],permission:null,audienceRole:u.role,suppressExport:true,context:{intent:'policy',topic:'general',understanding:{confidence:'low',relation:'followup',clarify:kind}},narrationFacts:{RESULT:{label:'Câu hỏi làm rõ khi chưa đủ căn cứ hiểu yêu cầu',value:answer}}};
}
module.exports={confidences,relations,clarifications,enabled,valid,choose,context,related,clarification,result};
