(function(root){
'use strict';
function clean(value,depth=0){
 if(depth>12)throw Error('File is too deeply nested.');
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value))throw Error('Invalid numeric value.');return value;}
 if(Array.isArray(value)){if(value.length>1000)throw Error('File contains too many items.');return value.map(v=>clean(v,depth+1));}
 if(value&&typeof value==='object'){const out={};for(const [k,v]of Object.entries(value))if(!['__proto__','constructor','prototype'].includes(k))out[k]=clean(v,depth+1);return out;}
 throw Error('Invalid file content.');
}
function parse(text){
 if(text.length>2000000)throw Error('Layout file is too large.');
 const p=clean(JSON.parse(text));if(p.format&&p.format!=='billiards-trainer')throw Error('This is not a Billiards Trainer file.');
 if(p.version&&p.version!==1)throw Error('Unsupported layout file version.');
 const layout=p.layout||p,state=p.kind==='session'?p.state:null;
 if(!layout||!Array.isArray(layout.balls)||layout.balls.length>100)throw Error('No valid ball layout found.');
 const L=Number(layout.tableL),W=Number(layout.tableW),R=Number(layout.ballR);
 if(!(L>.2&&L<20&&W>.2&&W<20&&R>.005&&R<Math.min(L,W)/4))throw Error('Invalid table dimensions.');
 layout.tableL=L;layout.tableW=W;layout.ballR=R;
 if(layout.freeAim&&(!Number.isFinite(layout.freeAim.x)||!Number.isFinite(layout.freeAim.y)))throw Error('Invalid aim position.');
 layout.setupMode=['custom','8ball','9ball','10ball','3ball'].includes(layout.setupMode)?layout.setupMode:'custom';
 const seen=new Set();layout.balls=layout.balls.map(b=>{
  if(!b||!Number.isInteger(b.id)||seen.has(b.id)||!(b.marker?b.id>=1000:b.id>=0&&b.id<=15)||!Number.isFinite(b.x)||!Number.isFinite(b.y))throw Error('Invalid or duplicate ball.');
  seen.add(b.id);return {...b,x:Math.max(R,Math.min(L-R,b.x)),y:Math.max(R,Math.min(W-R,b.y)),active:true};
 });
 layout.name=String(p.name||layout.name||'Shared table').slice(0,60);layout.allowMissingCueBall=!seen.has(0);
 return {kind:p.kind==='session'?'session':'layout',layout,state,history:Array.isArray(p.history)?p.history:[]};
}
function settings(raw,defaults){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))return defaults;
 const out={...defaults};for(const key of Object.keys(defaults)){const v=raw[key],d=defaults[key];if(v===undefined)continue;if(Array.isArray(d)){if(Array.isArray(v))out[key]=v;}else if(d&&typeof d==='object'){out[key]=settings(v,d);}else if(d===null){out[key]=clean(v);}else if(typeof v===typeof d&&(typeof v!=='number'||Number.isFinite(v)))out[key]=v;}return out;
}
function create(layout,state=null,history=[]){return JSON.parse(JSON.stringify({format:'billiards-trainer',version:1,kind:state?'session':'layout',name:layout.name||'Shared table',savedAt:new Date().toISOString(),layout,...(state?{state,history:history.slice(-30)}: {})},(key,value)=>key==='preview'?null:value));}
const api={parse,create,settings};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BilliardsLayoutFiles=api;
})(typeof window!=='undefined'?window:globalThis);
