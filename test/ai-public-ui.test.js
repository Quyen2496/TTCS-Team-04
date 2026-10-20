'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function widget(width,height){
 const elements=new Map(),appended=[],data=new Map();
 function element(name){return {name,hidden:false,style:{},listeners:{},children:[],classList:{add(){},remove(){}},focus(){},setAttribute(k,v){this[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},append(child){this.children.push(child);},querySelector(selector){if(!elements.has(selector))elements.set(selector,element(selector));return elements.get(selector);}};}
 const context={innerWidth:width,innerHeight:height,location:{origin:'https://homestay.example'},sessionStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},document:{getElementById:()=>null,createElement:element,body:{append(el){appended.push(el);}},addEventListener(){}},addEventListener(){}};
 context.window=context;context.parent=context;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/js/ai-widget.js'),'utf8'),context);
 return {root:appended[0],elements,data};
}
test('Anonymous homepage widget opens assistant in same-origin frame without requiring a token',()=>{
 const w=widget(1280,900);assert.equal(w.root.id,'hs-ai-widget');const bubble=w.elements.get('.hs-ai-bubble');assert.equal(bubble['aria-expanded'],'false');bubble.listeners.click();assert.equal(bubble['aria-expanded'],'true');
 const frame=w.elements.get('.hs-ai-frame-wrap').children[0];assert.equal(frame.src,'/assistant.html?compact=1');assert.equal(w.elements.get('.hs-ai-panel').hidden,false);assert(w.data.has('hs_ai_widget_visitor'));
});
test('Public chat panel fits narrow mobile viewport and can be minimized',()=>{
 const w=widget(360,640),bubble=w.elements.get('.hs-ai-bubble'),panel=w.elements.get('.hs-ai-panel');bubble.listeners.click();assert(parseFloat(panel.style.width)<=340);assert(parseFloat(panel.style.left)>=10);assert(parseFloat(panel.style.height)<=554);
 w.elements.get('.hs-ai-minimize').onclick();assert.equal(panel.hidden,true);assert.equal(bubble['aria-expanded'],'false');
});
