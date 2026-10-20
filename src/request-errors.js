'use strict';
const {randomUUID}=require('node:crypto');
function middleware(req,res,next){
 if(req.path.startsWith('/api/')){req.requestId=randomUUID();res.setHeader('X-Request-Id',req.requestId);}
 next();
}
function log(err,req,res){
 // Never log headers, bodies, query parameters, connection URIs or the first
 // stack line (which may contain credentials supplied to an external service).
 const entry={at:new Date().toISOString(),requestId:res.getHeader('X-Request-Id'),method:req.method,route:req.route?.path||'unmatched',status:err.status||500,name:err.name,code:err.code||'SERVER_ERROR',stack:String(err.stack||'').split('\n').slice(1).filter(line=>/^\s+at /.test(line)).slice(0,30)};
 if(err.code===31275)entry.message='Cannot use $elemMatch projection on a nested field.';
 console.error(JSON.stringify(entry));
}
module.exports={middleware,log};
