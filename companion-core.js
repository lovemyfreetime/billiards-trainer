(function(root){
'use strict';
const capabilities=typeof module!=='undefined'&&module.exports?require('./companion-capabilities.js'):root.BilliardsCompanionCapabilities;
const clone=v=>JSON.parse(JSON.stringify(v));
const sources=['table_setup','physical_report','simulation_result','proposal'];
function checkedMarker(b){
 const number=(key,fallback,min,max)=>{const value=b[key]??fallback;if(!Number.isFinite(value)||value<min||value>max)throw Error('Invalid marker '+key);return value;};
 if(b.markerShape&&!['circle','square','triangle'].includes(b.markerShape))throw Error('Invalid marker shape.');
 if(b.markerType&&!['white','red','pink','yellow'].includes(b.markerType))throw Error('Invalid marker color.');
 const marker={marker:true,markerShape:b.markerShape||'circle',markerType:b.markerType||'white',markerDiameterIn:number('markerDiameterIn',6,2.25,36),markerWidthIn:number('markerWidthIn',12,2.25,60),markerHeightIn:number('markerHeightIn',12,2.25,60),markerAngle:number('markerAngle',0,-100000,100000),markerLocked:b.markerLocked===true,markerHidden:b.markerHidden===true};
 if(b.markerVertices!==undefined){if(!Array.isArray(b.markerVertices)||b.markerVertices.length!==3||b.markerVertices.some(v=>!Array.isArray(v)||v.length!==2||v.some(n=>!Number.isFinite(n)||Math.abs(n)>60)))throw Error('Invalid triangle vertices.');marker.markerVertices=clone(b.markerVertices);}
 return marker;
}
function checkedLayout(input){
 const raw=input?.layout||input;
 if(!raw||!Array.isArray(raw.balls)||raw.balls.length>40)throw Error('A valid table layout is required.');
 const {tableL:L,tableW:W,ballR:R}=raw;
 if(![L,W,R].every(Number.isFinite)||L<.6||L>4||W<.3||W>2||R<.015||R>.05||L<=W)throw Error('Table dimensions are outside the supported range.');
 const ids=new Set();
 const balls=raw.balls.filter(b=>b.active!==false).map(b=>{
  if(!Number.isInteger(b.id)||ids.has(b.id)||!(b.marker?b.id>=1000&&b.id<=9999:b.id>=0&&b.id<=15)||!Number.isFinite(b.x)||!Number.isFinite(b.y)||b.x<R||b.y<R||b.x>L-R||b.y>W-R)throw Error('A ball is invalid, duplicated, or outside the playing surface.');
  ids.add(b.id);const marker=b.marker?checkedMarker(b):{};return {id:b.id,n:b.id===0?'CB':String(b.id),x:b.x,y:b.y,active:true,...marker};
 });
 const aim=raw.freeAim;
 if(aim&&(!Number.isFinite(aim.x)||!Number.isFinite(aim.y)||Math.abs(aim.x)>L*4||Math.abs(aim.y)>W*4))throw Error('Invalid aim position.');
 return {name:String(raw.name||'Shared position').slice(0,60),tableL:L,tableW:W,ballR:R,setupMode:'custom',balls,allowMissingCueBall:!ids.has(0),freeAim:aim?{x:aim.x,y:aim.y}:{x:L*.75,y:W*.5}};
}
function annotations(items=[]){
 if(!Array.isArray(items)||items.length>24)throw Error('Too many table annotations.');
 const point=p=>{if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)throw Error('Invalid annotation point.');return {x:p.x,y:p.y};};
 return items.map(a=>{
  if(a.type==='arrow')return {type:'arrow',from:point(a.from),to:point(a.to)};
  if(a.type==='region'){if(!Number.isFinite(a.radius)||a.radius<.01||a.radius>.4)throw Error('Invalid target size.');return {type:'region',at:point(a.at),radius:a.radius};}
  if(a.type==='label')return {type:'label',at:point(a.at),text:String(a.text||'').slice(0,40)};
  throw Error('Unsupported annotation.');
 });
}
function snapshot(layout,source='table_setup',marks=[]){
 if(!sources.includes(source))throw Error('Choose what this position represents.');
 return {kind:'layout',id:globalThis.crypto?.randomUUID?.()||String(Date.now()+Math.random()),name:String(layout.name||'Shared position').slice(0,60),createdAt:new Date().toISOString(),source,layout:checkedLayout(layout),annotations:annotations(marks)};
}
function response(raw){
 let p;try{p=JSON.parse(String(raw).trim().replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));}catch{ return {text:String(raw).slice(0,24000),layouts:[],warning:'The reply did not include a structured table proposal.'}; }
 if(!p||typeof p.text!=='string'||!p.text.trim()||!Array.isArray(p.layouts)||p.layouts.length>3)throw Error('The Companion returned an incomplete reply. Please retry.');
 const layouts=[];let warning='';
 for(const proposed of p.layouts){try{const a=snapshot({...proposed.layout,name:proposed.title||proposed.layout?.name},'proposal',proposed.annotations),balls=a.layout.balls.filter(b=>!b.marker);for(let i=0;i<balls.length;i++)for(let j=0;j<i;j++)if(Math.hypot(balls[i].x-balls[j].x,balls[i].y-balls[j].y)<a.layout.ballR*2-.0001)throw Error('Overlapping proposed balls.');layouts.push(a);}catch{warning='A proposed diagram could not be validated and was not added to the table.';}}
 let actions=[];try{actions=capabilities.actions(p.actions||[]);}catch{warning='A Trainer control proposal was invalid and was not added.';}
 return {text:p.text.slice(0,24000),layouts,actions,warning};
}
function contextMessage(m){
 if(!m||!['user','assistant'].includes(m.role)||typeof m.text!=='string')throw Error('Invalid conversation message.');
 const attachments=(m.attachments||[]).map(a=>{
  if(a.kind==='layout')return snapshot(a.layout,a.source,a.annotations);
  if(a.kind==='image'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(a.data||'')&&a.data.length<=2200000)return {kind:'image',name:String(a.name||'Image').slice(0,100),data:a.data};
  if(a.kind==='text'&&typeof a.text==='string'&&a.text.length<=60000)return {kind:'text',name:String(a.name||'Note').slice(0,100),text:a.text};
  throw Error('Unsupported attachment.');
 });
 if(attachments.length>4)throw Error('Attach up to four items per message.');
 return {role:m.role,text:m.text.slice(0,24000),attachments};
}
const api={clone,checkedLayout,annotations,snapshot,response,contextMessage,sources};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BilliardsCompanionCore=api;
})(typeof window!=='undefined'?window:globalThis);
