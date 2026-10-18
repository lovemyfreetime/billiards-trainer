(function(root){
'use strict';
// Shared by every table experience. Keep UI/calibration preferences in each
// page's own state; exchange only the table geometry, balls and current shot.
const KEY='billiardsSharedTableV1';
function create(storage,files){
 const copy=value=>JSON.parse(JSON.stringify(value));
 function pack(state){
  const layout=files.parse(JSON.stringify({layout:{name:state.lastLayoutName||'Shared table',tableL:state.tableL,tableW:state.tableW,ballR:state.ballR,balls:state.balls.filter(b=>b.active!==false),freeAim:state.freeAim,setupMode:state.setupMode}})).layout;
  const shot={speed:Number(state.speed),follow:Number(state.follow),sideSpin:Number(state.sideSpin),pocketedLog:Array.isArray(state.pocketedLog)?state.pocketedLog.filter(id=>Number.isInteger(id)&&id>=0&&id<=15):[]};
  if(!Number.isFinite(shot.speed)||!Number.isFinite(shot.follow)||!Number.isFinite(shot.sideSpin))throw Error('Invalid shared shot settings');
  shot.speed=Math.max(.25,Math.min(6,shot.speed));shot.follow=Math.max(-1,Math.min(1,shot.follow));shot.sideSpin=Math.max(-1,Math.min(1,shot.sideSpin));
  return {layout,shot};
 }
 function publish(state,source){try{const payload={version:1,source:String(source||'table').slice(0,30),...pack(state)};storage.setItem(KEY,JSON.stringify(payload));return true;}catch(_){return false;}}
 function read(){try{const raw=JSON.parse(storage.getItem(KEY)||'null');if(raw?.version!==1)return null;const checked=pack({...raw.layout,...raw.shot,lastLayoutName:raw.layout?.name});return {...checked,version:1,source:String(raw.source||'table')};}catch(_){return null;}}
 function apply(state,payload=read()){
  if(!payload)return state;
  const d=payload.layout;return {...state,tableL:d.tableL,tableW:d.tableW,ballR:d.ballR,balls:copy(d.balls),freeAim:copy(d.freeAim||{x:d.tableL*.75,y:d.tableW*.5}),setupMode:d.setupMode,allowMissingCueBall:!d.balls.some(b=>b.id===0),lastLayoutName:d.name,...copy(payload.shot),preview:null};
 }
 return {publish,read,apply,key:KEY};
}
const api={create,key:KEY};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BilliardsTableExchange=api;
})(typeof window!=='undefined'?window:globalThis);
