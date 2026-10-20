'use strict';
// Provider wire formats differ. Keep one canonical schema and validator in the
// application; Groq strict mode represents optional fields with explicit null.
function strict(schema){
 const out={};
 for(const key of ['type','enum','description'])if(schema[key]!==undefined)out[key]=structuredClone(schema[key]);
 if(schema.anyOf)out.anyOf=schema.anyOf.map(strict);
 if(schema.items)out.items=strict(schema.items);
 if(schema.type==='object'){
  const required=new Set(schema.required||[]);out.properties={};
  for(const [key,child]of Object.entries(schema.properties||{})){
   const converted=strict(child);out.properties[key]=required.has(key)?converted:{anyOf:[converted,{type:'null'}]};
  }
  out.required=Object.keys(out.properties);out.additionalProperties=false;
 }
 // Business bounds and dates are checked by the unchanged application
 // validators, independently of a provider's supported JSON Schema subset.
 return out;
}
function canonical(value,schema){
 if(Array.isArray(value))return value.map(item=>schema.items?canonical(item,schema.items):item);
 if(!value||typeof value!=='object'||!schema.properties)return value;
 const out={},required=new Set(schema.required||[]);
 for(const [key,item]of Object.entries(value)){
  const child=schema.properties[key];
  if(child&&item===null&&!required.has(key))continue;
  // Preserve unknown fields and required nulls so validation still rejects
  // them. Never synthesize confidence, intent, authorization or data values.
  Object.defineProperty(out,key,{value:child?canonical(item,child):item,enumerable:true,writable:true,configurable:true});
 }
 return out;
}
function missing(value,schema,prefix=''){
 if(!value||typeof value!=='object'||Array.isArray(value)||!schema.properties)return [];
 const paths=[];
 for(const key of schema.required||[])if(!Object.hasOwn(value,key)||value[key]===null)paths.push(prefix+key);
 for(const [key,child]of Object.entries(schema.properties))if(value[key]&&typeof value[key]==='object'&&!Array.isArray(value[key]))paths.push(...missing(value[key],child,prefix+key+'.'));
 return paths.slice(0,30);
}
module.exports={strict,canonical,missing};
