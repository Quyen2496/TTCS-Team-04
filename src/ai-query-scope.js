'use strict';
// Scope comes from server records, never from model-supplied identifiers.
const A=require('./access'),D=require('./domain'),normalize=require('./ai-provider').normalize;
function names(s,question){return require('./ai-entities').properties(s,question).matches;}
function routingQuestion(s,question){let q=normalize(question);for(const h of [...s.homestays].sort((a,b)=>b.name.length-a.name.length))if(normalize(h.name).length>=3)q=q.replace(new RegExp(normalize(h.name).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'),'homestay');return q;}
function selection(s,u,question,plan,selected,previous={}){
 const matched=names(s,question),q=normalize(question);
 const all=plan.inventory?.scope==='all_assigned'||require('./ai-entities').all(question);
 const ids=matched.map(h=>h._id);
 if(!plan.publicCatalog){
  const allowed=new Set(A.allowedProperties(s,u).map(h=>h._id));
  if(ids.some(id=>!allowed.has(id))&&u.role!=='guest')D.fail('Cơ sở được hỏi nằm ngoài phạm vi tài khoản.','FORBIDDEN',403);
  if(u.role==='guest'&&/tat ca booking|email khach|khach khac|nguoi khac/.test(q))D.fail('Chỉ được tra booking thuộc tài khoản của bạn.','FORBIDDEN',403);
 }
 if(ids.length===1)return ids[0];
 if(all||ids.length>1)return null;
 // Follow-ups keep a server-verified scope even if no property is repeated.
 if(previous.queryPropertyId&&['report','arrivals','departures','housekeeping','occupied','booking'].includes(plan.intent))return selected||previous.queryPropertyId;
 return selected;
}
function narrow(view,s,question){const ids=names(s,question).map(h=>h._id);if(ids.length<2)return view;const keep=new Set(ids);return {...view,homestays:view.homestays.filter(h=>keep.has(h._id)),rooms:view.rooms.filter(r=>keep.has(r.homestayId)),roomTypes:view.roomTypes.filter(t=>keep.has(t.homestayId)),bookings:view.bookings.filter(b=>keep.has(b.homestayId))};}
module.exports={names,routingQuestion,selection,narrow};
