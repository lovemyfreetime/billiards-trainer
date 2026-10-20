/* Portable device saves. No network requests and no executable backup content. */
(function(global){
'use strict';
const databases=[['billiards-saved-files','files','key'],['BilliardsTrainerPhotoArchiveV1','photos','id']];
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const done=tx=>new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onabort=tx.onerror=()=>reject(tx.error||Error('Storage interrupted'));});
const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
async function encode(value){
 if(value instanceof Blob)return {$blob:base64(new Uint8Array(await value.arrayBuffer())),mime:value.type};
 if(Array.isArray(value))return Promise.all(value.map(encode));
 if(value&&typeof value==='object'){const out=Object.create(null);for(const [k,v] of Object.entries(value))out[k]=await encode(v);return out;}
 return value;
}
function decode(value){
 if(value&&typeof value==='object'&&typeof value.$blob==='string')return new Blob([Uint8Array.from(atob(value.$blob),c=>c.charCodeAt(0))],{type:value.mime||''});
 if(Array.isArray(value))return value.map(decode);
 if(value&&typeof value==='object'){const out=Object.create(null);for(const [k,v] of Object.entries(value))Object.defineProperty(out,k,{value:decode(v),enumerable:true,writable:true,configurable:true});return out;}
 return value;
}
async function open(name,store,keyPath){
 const r=indexedDB.open(name,1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore(store,{keyPath});if(store==='photos')s.createIndex('createdAt','createdAt',{unique:false});};return request(r);
}
async function create(){
 const data={format:'billiards-device-backup',version:1,createdAt:new Date().toISOString(),storage:[],databases:[]};
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);data.storage.push([key,localStorage.getItem(key)]);}
 for(const [name,store,keyPath] of databases){const db=await open(name,store,keyPath);try{const tx=db.transaction(store,'readonly'),finished=done(tx),rows=await request(tx.objectStore(store).getAll());await finished;data.databases.push({name,rows:await encode(rows)});}finally{db.close();}}
 return JSON.stringify(data);
}
function parse(text){
 const b=JSON.parse(text);
 if(b?.format!=='billiards-device-backup'||b.version!==1||!Array.isArray(b.storage)||!Array.isArray(b.databases))throw Error('Choose a Billiards Trainer device backup.');
 if(b.storage.some(row=>!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||typeof row[1]!=='string'))throw Error('Invalid saved settings.');
 const names=new Set();
 for(const d of b.databases){const schema=databases.find(x=>x[0]===d.name);if(!schema||names.has(d.name)||!Array.isArray(d.rows))throw Error('Invalid saved database.');names.add(d.name);d.rows=decode(d.rows);if(d.rows.some(row=>!row||typeof row!=='object'||!Object.hasOwn(row,schema[2])||!['string','number'].includes(typeof row[schema[2]])))throw Error('Invalid saved record.');}
 return b;
}
async function restore(text){
 const b=parse(text),previous=b.storage.map(([key])=>[key,localStorage.getItem(key)]);
 try{for(const [key,value] of b.storage)localStorage.setItem(key,value);}catch(e){for(const [key,value] of previous)if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);throw e;}
 for(const entry of b.databases){const schema=databases.find(x=>x[0]===entry.name),db=await open(...schema);try{const tx=db.transaction(schema[1],'readwrite'),finished=done(tx);for(const row of entry.rows)tx.objectStore(schema[1]).put(row);await finished;}finally{db.close();}}
 return {settings:b.storage.length,records:b.databases.reduce((n,d)=>n+d.rows.length,0)};
}
global.BilliardsBackup={create,restore,parse};
})(window);
