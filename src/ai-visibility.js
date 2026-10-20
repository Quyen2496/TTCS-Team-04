'use strict';
const roomIntents=new Set(['recommendation','room_detail','availability','quote']);
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase();
function internalCatalog(q){return /noi bo|chua cong khai|da an|dang an|ngung (?:hoat dong|cong khai)|ke ca.*(?:tat|an|ngung)|inactive/.test(norm(q));}
function annotate(plan,question){
 const publicCatalog=!!plan.publicInfo||roomIntents.has(plan.intent)||!!plan.inventory&&!internalCatalog(question)||plan.intent==='policy'&&!plan.inventory&&!plan.dialogue&&!plan.capability&&!plan.knowledgeTopic&&['checkin','checkout','cancel','deposit','booking'].includes(plan.topic)||plan.explanation&&['pricing','booking_email'].includes(plan.explanation.topic);
 return {...plan,publicCatalog:!!publicCatalog};
}
module.exports={roomIntents,internalCatalog,annotate};
