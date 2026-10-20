'use strict';
const crypto=require('node:crypto');
const Schema=require('./ai-output-schema');
const states=new WeakMap();
const defaultFetch=(...args)=>fetch(...args);
function memory(fetcher){if(!states.has(fetcher))states.set(fetcher,new Map());return states.get(fetcher);}
function providers(env={},config){
 const primary=env.AI_PROVIDER||'disabled';
 if(primary==='disabled')return [];
 const automatic=primary==='groq'?'gemini':primary==='gemini'?'groq':'';
 const extra=env.AI_FALLBACK_PROVIDERS===undefined?automatic:env.AI_FALLBACK_PROVIDERS;
 return [...new Set([primary,...String(extra).split(',').map(x=>x.trim())])].filter(x=>['groq','gemini','ollama'].includes(x)).map(provider=>config({...env,AI_PROVIDER:provider}));
}
const identity=c=>crypto.createHash('sha256').update([c.provider,c.model,c.key,c.url].join('|')).digest('hex');
function duration(value){
 if(!value)return 0;if(/^\d+(?:\.\d+)?$/.test(value))return Number(value)*1000;
 const matches=[...String(value).matchAll(/([\d.]+)(ms|s|m|h|d)/g)];
 if(matches.length)return matches.reduce((n,m)=>n+Number(m[1])*({ms:1,s:1000,m:60000,h:3600000,d:86400000}[m[2]]),0);
 return Math.max(0,Date.parse(value)-Date.now())||0;
}
const header=(r,name)=>r.headers?.get?.(name)||null;
function retryTime(r,body){
 let wait=duration(header(r,'retry-after'));
 for(const detail of body?.error?.details||[])wait=Math.max(wait,duration(detail.retryDelay));
 if(header(r,'x-ratelimit-remaining-requests')==='0')wait=Math.max(wait,duration(header(r,'x-ratelimit-reset-requests')));
 if(header(r,'x-ratelimit-remaining-tokens')==='0')wait=Math.max(wait,duration(header(r,'x-ratelimit-reset-tokens')));
 return Math.min(86400000,Math.max(1000,wait||60000));
}
function health(env,config,fetcher=defaultFetch){
 const mem=memory(fetcher),now=Date.now();
 return providers(env,config).map(c=>{const last=mem.get(identity(c));return {provider:c.provider,model:c.model||null,configured:!!c.ready,cooling:!!last&&last.until>now,retryAt:last?.until>now?new Date(last.until).toISOString():null,reason:last?.until>now?last.reason:null};});
}
async function complete(instructions,payload,options,config){
 const env=options.env||process.env,chain=providers(env,config),fetcher=options.fetch||defaultFetch,mem=memory(fetcher),attempts=[];
 const overallDeadline=Date.now()+(options.timeout||12000);
 if(!chain.some(c=>c.ready))return {fallback:true,provider:chain[0]?.provider||'disabled',reason:'not_configured'};
 providersLoop: for(const c of chain){
  if(!c.ready){attempts.push({provider:c.provider,reason:'not_configured'});continue;}
  const id=identity(c),last=mem.get(id);
  if(last?.until>Date.now()){attempts.push({provider:c.provider,reason:last.reason,status:last.status,cooling:true});continue;}
  const remaining=overallDeadline-Date.now();
  if(remaining<=0){attempts.push({provider:c.provider,reason:'timeout'});break;}
  const later=chain.slice(chain.indexOf(c)+1).filter(next=>next.ready&&!(mem.get(identity(next))?.until>Date.now())).length;
  // Reserve time for a usable fallback instead of spending a full timeout on
  // every provider. Schema repair shares this provider's existing deadline.
  const deadline=Date.now()+Math.max(1,Math.floor(remaining/(later+1)));
  for(let repair=0;repair<2;repair++){
  const attemptStarted=performance.now();let attemptRecorded=false;
  let reason='unavailable',status,stage='request',finishDiagnostic=null,missingRequired=[];
  try{
   const gptOss=c.provider==='groq'&&/^openai\/gpt-oss-(20b|120b)$/.test(c.model);
   const strictOutput=gptOss&&!!options.responseSchema;
   const repairGuide=repair?'\nThe previous generation failed JSON Schema validation. Generate one fresh JSON object that follows the same schema. Use only allowed property names and enum values; include all required fields. Do not invent an intent, authorization, counts or execution results. '+(options.schemaRepairHint||''):'';
   let body,url=c.url,headers={'Content-Type':'application/json'};
   if(c.provider==='gemini'){
    headers['x-goog-api-key']=c.key;
    body={systemInstruction:{parts:[{text:instructions+repairGuide}]},contents:[{role:'user',parts:[{text:JSON.stringify(payload)}]}],generationConfig:{temperature:options.temperature??0.2,maxOutputTokens:2048,responseMimeType:'application/json'}};
    if(options.responseSchema)body.generationConfig.responseJsonSchema=options.responseSchema;
   }else{
    if(c.key)headers.Authorization='Bearer '+c.key;
    const format=strictOutput?{type:'json_schema',json_schema:{name:'homestay_output',strict:true,schema:Schema.strict(options.responseSchema)}}:{type:'json_object'};
    const guidance=options.responseSchema?(strictOutput?'\nUse null only for unused optional fields. The understanding object and its confidence/relation are mandatory when required by the schema.':'\nReturn JSON matching this schema: '+JSON.stringify(options.responseSchema)):'';
    body={model:c.model,temperature:options.temperature??0,...(c.provider==='groq'?{max_completion_tokens:gptOss?2048:512}:{max_tokens:512}),...(gptOss?{reasoning_effort:'low',include_reasoning:false}:{}),response_format:format,messages:[{role:'system',content:instructions+guidance+repairGuide},{role:'user',content:JSON.stringify(payload)}]};
   }
   const response=await fetcher(url,{method:'POST',redirect:'error',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(Math.max(1,deadline-Date.now()))});
   status=response.status;
   stage='response_body';const raw=await response.text();require('./ai-telemetry').record('provider_'+c.provider,performance.now()-attemptStarted,{repair,status});attemptRecorded=true;if(raw.length>65536)throw Error('INVALID_AI_OUTPUT');
   let data;try{data=JSON.parse(raw);}catch{if(response.ok)throw Error('INVALID_AI_OUTPUT');data={};}
   if(!response.ok){
    const code=data?.error?.code;
    const generationFailure=c.provider==='groq'&&[400,422].includes(status)&&code==='json_validate_failed';
    reason=generationFailure?'invalid_response':status===401?'authentication':status===403?'permission':status===429?'rate_limit':status===404||['model_decommissioned','model_not_found'].includes(code)?'model_unavailable':status===400?'invalid_request':status===422?'invalid_response':'unavailable';
    const quotaEmpty=header(response,'x-ratelimit-remaining-requests')==='0'||header(response,'x-ratelimit-remaining-tokens')==='0';
    const retry=generationFailure&&!!options.responseSchema&&repair===0&&!quotaEmpty&&deadline-Date.now()>=1000;
    const diagnostic={provider:c.provider,model:c.model,status,stage:generationFailure?'provider_schema_generation':'provider_http',finishReason:null,missingRequired:[],...(generationFailure?{errorCode:'json_validate_failed'}:{})};
    if(typeof options.onDiagnostic==='function')try{options.onDiagnostic(diagnostic);}catch{}
    attempts.push({provider:c.provider,reason,status,...(generationFailure?{errorCode:'json_validate_failed',repairPlanned:retry}:{})});
    // Never consume failed_generation or relax the schema. The one repair
    // call keeps actor, history, user input and schema unchanged.
    if(retry)continue;
    const wait=status===429||quotaEmpty?retryTime(response,data):!generationFailure&&[401,403,404,400].includes(status)?300000:15000;
    mem.set(id,{until:Date.now()+wait,reason:quotaEmpty?'rate_limit':reason,status});continue providersLoop;
   }
   if(c.provider==='gemini'&&data.promptFeedback?.blockReason)return {fallback:true,provider:c.provider,reason:'safety',attempts};
   const choice=c.provider==='gemini'?data.candidates?.[0]:data.choices?.[0];
   const finish=c.provider==='gemini'?choice?.finishReason:choice?.finish_reason;
   finishDiagnostic=typeof finish==='string'&&/^[A-Za-z_]{1,40}$/.test(finish)?finish:null;
   if(['length','MAX_TOKENS'].includes(finish)){reason='token_limit';throw Error('INVALID_AI_OUTPUT');}
   if(c.provider==='gemini'&&['SAFETY','RECITATION','BLOCKLIST','PROHIBITED_CONTENT','SPII'].includes(finish))return {fallback:true,provider:c.provider,reason:'safety',attempts};
   stage='candidate_text';const content=c.provider==='gemini'?choice?.content?.parts?.filter(p=>!p.thought&&typeof p.text==='string').map(p=>p.text).join(''):choice?.message?.content;
   if(typeof content!=='string'||content.length>8192)throw Error('INVALID_AI_OUTPUT');
   stage='json_parse';let value=JSON.parse(content);
   if(!value||typeof value!=='object'||Array.isArray(value))throw Error('INVALID_AI_OUTPUT');
   if(strictOutput)value=Schema.canonical(value,options.responseSchema);
   if(options.responseSchema)missingRequired=Schema.missing(value,options.responseSchema);
   stage='schema_validation';if(options.validate)options.validate(value);
   mem.delete(id);
   if(header(response,'x-ratelimit-remaining-requests')==='0'||header(response,'x-ratelimit-remaining-tokens')==='0')mem.set(id,{until:Date.now()+retryTime(response,data),reason:'rate_limit',status:429});
   const other=attempts.find(a=>a.provider!==c.provider&&a.reason!=='not_configured');
   return {value,fallback:false,provider:c.provider,model:c.model,attempts,...(repair?{schemaRepaired:true,repairAttempts:repair}:{}),...(other?{failoverFrom:other.provider}:{})};
  }catch(error){
   if(!attemptRecorded)require('./ai-telemetry').record('provider_'+c.provider,performance.now()-attemptStarted,{repair,status:status||null,failed:true});
   if(typeof options.onDiagnostic==='function')try{options.onDiagnostic({provider:c.provider,model:c.model,status:status||null,stage,finishReason:finishDiagnostic,missingRequired});}catch{}
   const code=error.cause?.code||error.code;
   if(reason!=='token_limit')reason=['TimeoutError','AbortError'].includes(error.name)?'timeout':['ENOTFOUND','EAI_AGAIN'].includes(code)?'dns':/^(?:CERT_|ERR_TLS_|UNABLE_TO_|DEPTH_ZERO_|SELF_SIGNED_)/.test(code||'')?'tls':['ECONNREFUSED','ECONNRESET','ETIMEDOUT','ENETUNREACH','EHOSTUNREACH'].includes(code)||error instanceof TypeError?'network':'invalid_response';
   mem.set(id,{until:Date.now()+15000,reason,status});attempts.push({provider:c.provider,reason,...(status?{status}:{})});
   continue providersLoop;
  }
  }
 }
 const last=attempts.findLast(x=>x.reason!=='not_configured')||attempts.at(-1)||{};
 return {fallback:true,provider:last.provider||chain[0]?.provider||'disabled',reason:last.reason||'unavailable',...(last.status?{status:last.status}:{}),attempts};
}
module.exports={complete,providers,health,duration};
