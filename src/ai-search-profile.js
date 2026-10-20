'use strict';
const landscapes=['mountain','coastal','garden','riverside','urban'];
const roomKinds=['double','twin','single','family','dorm','bungalow','studio'];
const norm=s=>String(s||'').normalize('NFD').replace(/\p{Diacritic}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
const landscapePatterns={mountain:/\b(?:tren nui|mien nui|vung nui|nha nui|vung cao|cao nguyen|suon nui|suon doi|nha doi|tren doi)\b/,coastal:/\b(?:gan bien|ven bien|sat bien|o bien|ra bien)\b/,garden:/\b(?:nha vuon|mien vuon|co vuon|san vuon)\b/,riverside:/\b(?:ven song|ben song|sat song|song nuoc)\b/,urban:/\b(?:trung tam|nha pho|thanh pho)\b/};
const roomPatterns={double:/\b(?:phong doi|double)\b/,twin:/\b(?:twin|hai giuong don|2 giuong don)\b/,single:/\b(?:phong don|single)\b/,family:/\b(?:phong gia dinh|family)\b/,dorm:/\b(?:giuong tang|dorm|tap the)\b/,bungalow:/\bbungalow\b/,studio:/\bstudio\b/};
function validSlots(slots){
 for(const [key,allowed]of [['landscapes',landscapes],['excludedLandscapes',landscapes],['roomKinds',roomKinds],['excludedRoomKinds',roomKinds]])if(slots[key]!==undefined&&(!Array.isArray(slots[key])||slots[key].length>allowed.length||slots[key].some(x=>!allowed.includes(x))))throw Error('INVALID_AI_OUTPUT');
 if(slots.destinationQuery!==undefined&&(typeof slots.destinationQuery!=='string'||!slots.destinationQuery.trim()||slots.destinationQuery.length>100))throw Error('INVALID_AI_OUTPUT');
}
function parse(question,previous={},slots={}){
 const q=norm(question),out={};validSlots(slots);
 for(const key of ['landscapes','excludedLandscapes','roomKinds','excludedRoomKinds','destinationQuery'])if(previous[key]!==undefined)out[key]=structuredClone(previous[key]);
 // Extract explicit constraints first; a model may supplement only if the
 // current text has not specified that dimension. Never drop prior filters.
 for(const [field,negative,patterns]of [['landscapes','excludedLandscapes',landscapePatterns],['roomKinds','excludedRoomKinds',roomPatterns]]){
  const positive=[],excluded=[],removed=[];
  for(const [key,re]of Object.entries(patterns)){
   let state;
   for(const found of q.matchAll(new RegExp(re.source,'g'))){
    // Negation applies to this mention's clause, not every subsequent room
    // kind. The last explicit correction of the same kind wins.
    const prefix=q.slice(0,found.index).split(/[,;.!?]|\b(?:nhung|ma|thay vao do)\b/).at(-1);
    if(/(?:khong can|bo yeu cau|bo dieu kien)(?:\s+\S+){0,3}\s*$/.test(prefix))state='remove';
    else if(/(?:khong(?: muon| o| chon| lay| thich| dung)?|dung(?: lay| chon| dung)?|tranh|loai bo)(?:\s+\S+){0,3}\s*$/.test(prefix)&&!/khong chi(?:\s+\S+){0,3}\s*$/.test(prefix))state='exclude';
    else state='include';
   }
   if(state==='remove')removed.push(key);else if(state==='exclude')excluded.push(key);else if(state==='include')positive.push(key);
  }
  if(positive.length){out[field]=positive;out[negative]=(out[negative]||[]).filter(x=>!positive.includes(x));}
  else if(!excluded.length&&!removed.length&&slots[field]?.length)out[field]=slots[field];
  if(excluded.length){out[negative]=[...new Set([...(out[negative]||[]),...excluded])];out[field]=(out[field]||[]).filter(x=>!excluded.includes(x));}
  if(removed.length){out[field]=(out[field]||[]).filter(x=>!removed.includes(x));out[negative]=(out[negative]||[]).filter(x=>!removed.includes(x));}
  if(!positive.length&&!excluded.length&&!removed.length&&slots[negative]?.length)out[negative]=[...new Set([...(out[negative]||[]),...slots[negative]])];
 }
 if(/khong gioi han (?:khu vuc|dia hinh)|bo (?:yeu cau|dieu kien) (?:khu vuc|dia hinh)/.test(q)){out.landscapes=[];out.excludedLandscapes=[];out.destinationQuery=null;}
 if(/loai phong nao cung duoc|khong gioi han loai phong|bo (?:yeu cau|dieu kien) loai phong/.test(q)){out.roomKinds=[];out.excludedRoomKinds=[];}
 if(slots.destinationQuery!==undefined)out.destinationQuery=slots.destinationQuery;
 const place=q.match(/\b(?:khu vuc|tai|o)\s+([a-z][a-z\s]{1,99}?)(?=\s+(?:cho|voi|ngan sach|co gia|gia duoi|gia toi da|can|muon)|[,.!?]|$)/);
 if(place&&!/^(?:tren|duoi|gan|ven|sat|phong|do\b|day\b|nay\b)/.test(place[1])&&!Object.values(landscapePatterns).some(re=>re.test(place[0])))out.destinationQuery=place[1].trim();
 if(out.landscapes?.length&&JSON.stringify(out.landscapes)!==JSON.stringify(previous.landscapes)&&Object.values(landscapePatterns).some(re=>re.test(q))){out.preferredPropertyIds=null;if(!place)out.destinationQuery=null;}
 return out;
}
function isRefinement(question){const q=norm(question);if(/la gi|khac nhau|khac gi|so sanh|dien tich|tien nghi cua|xem chi tiet|xem anh|doanh thu|booking|tai khoan|phan quyen|nghiep vu|don phong|ghi.*coc|(?:sua|xoa|tao|cap nhat).*phong|bao nhieu|so luong|thong ke|quyen|huong dan/.test(q))return false;return Object.values({...landscapePatterns,...roomPatterns}).some(re=>re.test(q))||/bo (?:yeu cau|dieu kien) (?:khu vuc|dia hinh|loai phong)|loai phong nao cung duoc/.test(q);}
function propertySettings(h){
 const style=norm(h.style),description=norm(h.description),tags=new Set(Array.isArray(h.landscapes)?h.landscapes.filter(x=>landscapes.includes(x)):[]);
 if(/\b(?:nui|mien nui|vung cao|cao nguyen|nha doi|thung lung)\b/.test(style)||/\b(?:nam|toa lac|luu tru|nha|khu nghi).*?(?:tren nui|suon nui|suon doi|mien nui|vung cao)\b/.test(description))tags.add('mountain');
 if(/ven bien|sat bien/.test(style)||/(?:nam|toa lac).*?(?:ven bien|sat bien)/.test(description))tags.add('coastal');
 if(/nha vuon|mien vuon|vuon nhiet doi/.test(style))tags.add('garden');if(/song nuoc|ven song/.test(style))tags.add('riverside');if(/nha pho|thanh pho/.test(style))tags.add('urban');
 return tags;
}
function kind(t){if(roomKinds.includes(t.roomKind))return t.roomKind;const name=norm(t.name);return Object.keys(roomPatterns).find(k=>roomPatterns[k].test(name))||null;}
function matches(h,t,c){
 const settings=propertySettings(h),k=kind(t);
 if(c.landscapes?.length&&!c.landscapes.some(x=>settings.has(x))||c.excludedLandscapes?.some(x=>settings.has(x)))return false;
 if(c.roomKinds?.length&&!c.roomKinds.includes(k)||c.excludedRoomKinds?.includes(k))return false;
 if(c.destinationQuery&&!norm([h.name,h.destination,h.address].join(' ')).includes(norm(c.destinationQuery)))return false;
 return true;
}
const labels={mountain:'vùng núi/đồi theo mô tả cơ sở',coastal:'ven biển theo mô tả cơ sở',garden:'nhà vườn',riverside:'ven sông',urban:'trong đô thị',double:'phòng đôi',twin:'phòng hai giường đơn (twin)',single:'phòng đơn',family:'phòng gia đình',dorm:'phòng tập thể',bungalow:'bungalow',studio:'studio'};
function notes(c){const out=[];if(c.landscapes?.length)out.push(c.landscapes.map(x=>labels[x]).join(' hoặc '));if(c.roomKinds?.length)out.push('chỉ '+c.roomKinds.map(x=>labels[x]).join(' hoặc '));if(c.excludedLandscapes?.length)out.push('không chọn '+c.excludedLandscapes.map(x=>labels[x]).join(', '));if(c.excludedRoomKinds?.length)out.push('không chọn '+c.excludedRoomKinds.map(x=>labels[x]).join(', '));if(c.destinationQuery)out.push('khu vực '+c.destinationQuery);return out;}
module.exports={landscapes,roomKinds,parse,validSlots,isRefinement,propertySettings,kind,matches,notes};
