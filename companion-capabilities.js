(function(root){
'use strict';
// One reviewed capability contract is used by the browser, server and every player.
const version='trainer-companion-2026-10-22.2';
const controls={
 speed:{key:'speed',min:.25,max:6,unit:'m/s',label:'Shot 1 speed'},
 follow:{key:'follow',min:-1,max:1,unit:'fraction (-1 draw, +1 follow); multiply by 100 for UI percent',label:'Shot 1 follow / draw'},
 sideSpin:{key:'sideSpin',min:-1,max:1,unit:'fraction (-1 left, +1 right); multiply by 100 for UI percent',label:'Shot 1 left / right spin'},
 cueElevation:{key:'cueElevationDeg',min:0,max:70,unit:'degrees; fixed at 3 unless airbornePhysics enabled (then 0..70)',label:'Shot 1 cue elevation'},
 ...Object.fromEntries(['airbornePhysics','showImpact','showTipBadge','showPaths','showGrid','showDiamonds','showTable','showPracticeCounter','showScoreBoard','showBankKickNumbers','showAngleLockControl'].map(id=>[id,{key:id,type:'boolean',label:id.replace(/([A-Z])/g,' $1')}]))
};
function settings(raw={},state={}){
 if(!raw||Array.isArray(raw)||typeof raw!=='object')throw Error('Invalid Trainer settings.');const clean={};
 for(const [id,value]of Object.entries(raw)){const d=controls[id];if(!d)throw Error('Unsupported Trainer control: '+id);if(d.type==='boolean'){if(typeof value!=='boolean')throw Error('Use true or false for '+id);}else if(!Number.isFinite(value)||value<d.min||value>d.max)throw Error('Invalid value for '+id);clean[id]=value;}
 if(clean.cueElevation!==undefined&&clean.cueElevation!==3&&!(clean.airbornePhysics??state.airbornePhysics))throw Error('Normal mode fixes cue elevation at 3 degrees. Enable airborne physics to change elevation.');
 return clean;
}
function shot(raw){if(!raw||!raw.aim||!Number.isFinite(raw.aim.x)||!Number.isFinite(raw.aim.y))throw Error('A shot needs a finite aim point in meters.');const clean=settings({speed:raw.speed,follow:raw.follow,sideSpin:raw.sideSpin,cueElevation:raw.cueElevation,airbornePhysics:raw.airbornePhysics});return {...clean,aim:{x:raw.aim.x,y:raw.aim.y}};}
function actions(items=[]){if(!Array.isArray(items)||items.length>8)throw Error('Too many Trainer proposals.');return items.map(a=>{
 const base={type:a.type,title:String(a.title||'Trainer proposal').slice(0,100)};
 if(a.type==='settings')return {...base,settings:settings(a.settings,{airbornePhysics:true})};
 if(a.type==='shot')return {...base,shot:shot(a.shot)};
 if(a.type==='lesson'&&typeof a.topic==='string'&&/^[a-z0-9-]{1,100}$/.test(a.topic))return {...base,topic:a.topic};
 throw Error('Unsupported Trainer proposal.');
 });}
const api={version,controls,settings,shot,actions};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.BilliardsCompanionCapabilities=api;
})(typeof window!=='undefined'?window:globalThis);
