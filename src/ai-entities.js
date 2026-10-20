'use strict';
const normalize=q=>require('./ai-provider').normalize(q).replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const generic=new Set(['homestay','stay','retreat','residence','garden','eco','the','hotel','khach','san','co','so']);
const tokens=s=>normalize(s).split(' ').filter(t=>!generic.has(t));
const all=q=>/tat ca(?: cac)? (?:homestay|co so)|toan (?:he thong|bo(?: cac)? (?:homestay|co so))|moi (?:homestay|co so)/.test(normalize(q));
function properties(s,question){
 const q=normalize(question),words=new Set(q.split(' '));
 const matches=s.homestays.filter(h=>{const name=normalize(h.name),parts=tokens(h.name);return name.length>=3&&(q.includes(name)||parts.length>=2&&parts.every(t=>words.has(t)));});
 // A shortened brand is only usable when at least two distinctive tokens
 // match. Location-only guesses and edit-distance guesses are not identities.
 if(!matches.length)for(const h of s.homestays){const parts=tokens(h.name);if(parts.length>=3&&parts.slice(0,2).every(t=>words.has(t)))matches.push(h);}
 const multiple=matches.length>1&&!all(q),explicitMultiple=multiple&&/\b(?:va|voi)\b/.test(q);
 return {matches,all:all(q),ambiguous:multiple&&!explicitMultiple,explicitMultiple};
}
function roomTypes(s,question,propertyId){
 const q=normalize(question),list=s.roomTypes.filter(t=>t.active&&(!propertyId||t.homestayId===propertyId));
 const matches=list.filter(t=>q.includes(normalize(t.name))).sort((a,b)=>normalize(b.name).length-normalize(a.name).length);
 if(!matches.length)return [];
 return matches.filter(t=>normalize(t.name).length===normalize(matches[0].name).length);
}
module.exports={normalize,properties,roomTypes,all};
