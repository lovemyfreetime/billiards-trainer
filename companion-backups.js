/* Local recovery copies for Companion Play. No network or file-system permissions. */
(function(root){
'use strict';
const DB='billiards-companion-backups',PREF='billiards.playTogether.autoBackup',LIMIT=5;
const copy=x=>JSON.parse(JSON.stringify(x));
function validate(payload,core){
 if(payload?.format!=='billiards-play-together'||payload.version!==1||!Array.isArray(payload.audio))throw Error('Choose a Companion Play backup.');
 const state=core.validate(copy(payload.state)),expected=new Map(state.sessions.flatMap(s=>s.voice.map(v=>[v.id,s.id])));
 if(expected.size!==state.sessions.reduce((n,s)=>n+s.voice.length,0))throw Error('Duplicate audio references in backup.');
 if(payload.audio.length!==expected.size)throw Error('Backup audio is incomplete.');
 const seen=new Set(),audio=[];let bytesTotal=0;
 for(const item of payload.audio){
  if(!item||seen.has(item.id)||expected.get(item.id)!==item.sessionId||typeof item.data!=='string'||!/^data:audio\/(webm|ogg|mp4)(;codecs=[^;,]+)?;base64,[A-Za-z0-9+/]*={0,2}$/.test(item.data))throw Error('Invalid audio in backup.');
  const [head,body]=item.data.split(',');if(body.length>20000000)throw Error('An audio note is too large.');
  const bytes=Uint8Array.from(atob(body),c=>c.charCodeAt(0));bytesTotal+=bytes.length;
  if(!bytes.length||bytes.length>15000000||bytesTotal>75000000)throw Error('Backup audio is too large or empty.');
  seen.add(item.id);audio.push({id:item.id,sessionId:item.sessionId,blob:new Blob([bytes],{type:head.slice(5,head.indexOf(';'))})});
 }
 const media=[],mediaExpected=new Map(state.sessions.flatMap(s=>(s.media||[]).map(m=>[m.id,{...m,sessionId:s.id}])));
 if(!Array.isArray(payload.media||[])||(payload.media||[]).length!==mediaExpected.size)throw Error('Backup attachments are incomplete.');
 for(const item of payload.media||[]){
  const meta=mediaExpected.get(item?.id);
  if(!meta||seen.has(item.id)||meta.sessionId!==item.sessionId||typeof item.data!=='string'||!/^data:(image\/(png|jpeg|webp)|video\/(mp4|webm)|audio\/(mpeg|mp4|ogg|webm));base64,[A-Za-z0-9+/]*={0,2}$/.test(item.data))throw Error('Invalid attachment in backup.');
  const [head,body]=item.data.split(',');if(body.length>20000000)throw Error('An attachment is too large.');
  const type=head.slice(5,head.indexOf(';')),bytes=Uint8Array.from(atob(body),c=>c.charCodeAt(0));bytesTotal+=bytes.length;
  if(type!==meta.type||bytes.length!==meta.bytes||bytesTotal>75000000)throw Error('Attachment bytes do not match the backup.');
  seen.add(item.id);media.push({id:item.id,sessionId:item.sessionId,blob:new Blob([bytes],{type})});
 }
 return {state,audio,media};
}
async function build(state,core,readAudio,encode){
 const snapshot=core.validate(copy(state)),audio=[],media=[];
 for(const s of snapshot.sessions)for(const meta of s.voice){
  const record=await readAudio(meta.id);if(!record?.blob||!record.blob.size)throw Error('An audio note is missing; the last complete backup is preserved.');
  audio.push({id:meta.id,sessionId:s.id,data:await encode(record.blob)});
 }
 for(const s of snapshot.sessions)for(const meta of s.media||[]){const record=await readAudio(meta.id);if(!record?.blob||record.blob.size!==meta.bytes)throw Error('An attachment is missing; the last complete backup is preserved.');media.push({id:meta.id,sessionId:s.id,data:await encode(record.blob)});}
 const payload={format:'billiards-play-together',version:1,exportedAt:new Date().toISOString(),state:snapshot,audio,media};
 if(JSON.stringify(payload).length>100000000)throw Error('This backup exceeds 100 MB. Export older sessions separately.');
 validate(payload,core);return payload;
}
function retention(catalog,item){return [...catalog.filter(x=>x.id!==item.id),item].sort((a,b)=>b.savedAt-a.savedAt||b.revision-a.revision||a.id.localeCompare(b.id)).slice(0,LIMIT);}
function plan(catalog,item,force=false){
 const latest=catalog.slice().sort((a,b)=>b.revision-a.revision||b.savedAt-a.savedAt)[0];
 if(latest&&(latest.revision>item.revision||(!force&&latest.signature===item.signature)))return {save:false,latest};
 return {save:true,kept:retention(catalog,item)};
}
function repository(factory=root.indexedDB){
 function open(){return new Promise((resolve,reject)=>{if(!factory){reject(Error('Auto backup storage is unavailable on this device.'));return;}const r=factory.open(DB,1);r.onupgradeneeded=()=>{r.result.createObjectStore('copies',{keyPath:'id'});r.result.createObjectStore('catalog',{keyPath:'id'});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Close the other Companion window and try again.'));});}
 async function read(store,id){const db=await open();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),r=id===undefined?tx.objectStore(store).getAll():tx.objectStore(store).get(id);tx.oncomplete=()=>resolve(r.result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Backup storage could not be read.'));});}finally{db.close();}}
 async function save(payload,{force=false,now=Date.now()}={}){
  const digest=await root.crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(payload.state)));
  const signature=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
  const id=force?'keep-'+root.crypto.randomUUID():'auto-'+Math.floor(now/300000);
  const item={id,savedAt:now,revision:payload.state.revision,signature,sessions:payload.state.sessions.length,audio:payload.audio.length,media:(payload.media||[]).length};
  const db=await open();try{return await new Promise((resolve,reject)=>{
   const tx=db.transaction(['copies','catalog'],'readwrite'),catalog=tx.objectStore('catalog'),copies=tx.objectStore('copies'),request=catalog.getAll();let result;
   request.onsuccess=()=>{
    const rows=request.result,decision=plan(rows,item,force);
    if(!decision.save){result=decision.latest;return;}
    const ids=new Set(decision.kept.map(x=>x.id));
    copies.put({id,payload});catalog.put(item);for(const old of rows)if(!ids.has(old.id)){copies.delete(old.id);catalog.delete(old.id);}result=item;
   };
   tx.oncomplete=()=>resolve(result);tx.onabort=tx.onerror=()=>reject(tx.error||Error('Auto backup could not be saved. The previous copies are unchanged.'));
  });}finally{db.close();}
 }
 return {save,list:async()=> (await read('catalog')).sort((a,b)=>b.savedAt-a.savedAt||b.revision-a.revision),get:async id=>(await read('copies',id))?.payload};
}
const api={DB,PREF,LIMIT,validate,build,retention,plan,repository};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompanionBackups=api;
})(typeof window!=='undefined'?window:globalThis);
