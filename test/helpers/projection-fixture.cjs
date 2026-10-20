'use strict';
const assert=require('node:assert/strict');
// A deliberately small expression evaluator; real server compatibility is
// checked separately by ai-store-atlas-readonly.test.js, never by this fake.
function value(expr,doc,vars={}){
 if(typeof expr==='string'&&expr.startsWith('$')){const [head,...parts]=expr.slice(expr.startsWith('$$')?2:1).split('.');let v=expr.startsWith('$$')?vars[head]:doc[head];for(const p of parts)v=v?.[p];return v;}
 if(expr===null||typeof expr!=='object')return expr;
 if(Array.isArray(expr))return expr.map(v=>value(v,doc,vars));
 if('$literal'in expr)return expr.$literal;
 if('$ifNull'in expr){const [a,b]=value(expr.$ifNull,doc,vars);return a??b;}
 if('$eq'in expr){const [a,b]=value(expr.$eq,doc,vars);return a===b;}
 if('$ne'in expr){const [a,b]=value(expr.$ne,doc,vars);return a!==b;}
 if('$gt'in expr){const [a,b]=value(expr.$gt,doc,vars);return a>b;}
 if('$size'in expr)return value(expr.$size,doc,vars).length;
 if('$in'in expr){const [a,b]=value(expr.$in,doc,vars);return b.includes(a);}
 if('$not'in expr)return !value(expr.$not[0],doc,vars);
 if('$objectToArray'in expr)return Object.entries(value(expr.$objectToArray,doc,vars)).map(([k,v])=>({k,v}));
 if('$arrayToObject'in expr)return Object.fromEntries(value(expr.$arrayToObject,doc,vars).map(({k,v})=>[k,v]));
 if('$and'in expr)return expr.$and.every(v=>!!value(v,doc,vars));
 if('$or'in expr)return expr.$or.some(v=>!!value(v,doc,vars));
 if('$toLower'in expr)return String(value(expr.$toLower,doc,vars)||'').toLowerCase();
 if('$slice'in expr){const [a,n]=value(expr.$slice,doc,vars);return a.slice(0,n);}
 if('$filter'in expr){const f=expr.$filter;return value(f.input,doc,vars).filter(v=>value(f.cond,doc,{...vars,[f.as]:v}));}
 if('$map'in expr){const f=expr.$map;return value(f.input,doc,vars).map(v=>value(f.in,doc,{...vars,[f.as]:v}));}
 return Object.fromEntries(Object.entries(expr).map(([k,v])=>[k,value(v,doc,vars)]));
}
function project(doc,projection){
 const result={};for(const [key,expr]of Object.entries(projection)){
  assert(!expr?.$elemMatch||!key.includes('.'),'MongoDB forbids nested $elemMatch projection');
  if(key==='revision'){result.revision=doc.revision;continue;}
  if(!key.startsWith('data.'))continue;
  const parts=key.slice(5).split('.'),name=parts[0];result.data||={};
  if(parts.length===2){const previous=result.data[name]||[];result.data[name]=(doc.data[name]||[]).map((row,i)=>({...previous[i],[parts[1]]:row[parts[1]]}));continue;}
  const v=expr===1?doc.data[name]:value(expr,doc);if(v!==undefined)result.data[name]=structuredClone(v);
 }return result;
}
module.exports={project};
