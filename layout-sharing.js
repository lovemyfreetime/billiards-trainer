/* Share portable layouts through the OS sheet, with email/copy/download fallbacks. */
(function(root){
'use strict';
function filename(file){return (String(file.name||file.layout?.name||'Shared table').replace(/[^a-z0-9 _-]/gi,'').trim()||'Table')+(file.kind==='session'?'.session':'')+'.billiards.json';}
function link(file){const url=new URL('https://lovemyfreetime.github.io/billiards-trainer/?train=1');url.hash='table='+encodeURIComponent(JSON.stringify(file));return url.href;}
function encodeBytes(bytes){
 let binary='';
 for(const byte of bytes)binary+=String.fromCharCode(byte);
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
async function compactLink(file){
 if(typeof CompressionStream==='undefined')return link(file);
 const bytes=new TextEncoder().encode(JSON.stringify(file));
 const stream=new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
 const compressed=new Uint8Array(await new Response(stream).arrayBuffer());
 const url=new URL('https://lovemyfreetime.github.io/billiards-trainer/?train=1');
 url.hash='tablez='+encodeBytes(compressed);
 return url.href.length<link(file).length?url.href:link(file);
}
async function readHash(hash){
 if(!hash.startsWith('#tablez='))return fromHash(hash);
 if(hash.length>6000000)throw Error('Shared layout is too large.');
 if(typeof DecompressionStream==='undefined')throw Error('Open this compressed layout in an updated browser or Trainer app.');
 const value=hash.slice(8);
 if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid compressed layout link.');
 const bytes=Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 const chunks=[];let total=0;
 while(true){
  const {done,value}=await reader.read();
  if(done)break;
  total+=value.byteLength;
  if(total>2000000){await reader.cancel();throw Error('Shared layout is too large.');}
  chunks.push(value);
 }
 return root.BilliardsLayoutFiles.parse(await new Blob(chunks).text());
}
function download(file){
 if(root.BilliardsAndroid?.saveTrainerExport){
  const path=root.BilliardsAndroid.saveTrainerExport(filename(file),JSON.stringify(file));
  if(!path)throw Error('Could not save the layout file.');
  return path;
 }
 const url=URL.createObjectURL(new Blob([JSON.stringify(file)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=filename(file);a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
function fallback(file,url){
 const dialog=document.createElement('dialog');dialog.className='layoutShareDialog';const title=document.createElement('h2');title.textContent='Share '+(file.name||file.layout?.name||'table');const message=document.createElement('p');message.textContent='Send this layout by email, copy its link, or download the file to attach in another app.';const input=document.createElement('textarea');input.readOnly=true;input.value=url;input.setAttribute('aria-label','Layout sharing link');const actions=document.createElement('div');actions.className='buttons';
 const copy=document.createElement('button');copy.textContent='Copy Link';copy.onclick=async()=>{try{await navigator.clipboard.writeText(url);message.textContent='Link copied. Paste it into your email or messaging app.';}catch(_){input.focus();input.select();message.textContent='Copy the selected link and paste it into your email or messaging app.';}};
 const email=document.createElement('a');email.textContent='Email';email.href='mailto:?subject='+encodeURIComponent(file.name||file.layout?.name||'Billiards table')+'&body='+encodeURIComponent('Open this Billiards Trainer layout:\n'+url);if(url.length>12000){email.hidden=true;message.textContent='Download this larger layout and attach the file to an email or message.';}
 const save=document.createElement('button');save.textContent='Download File';save.onclick=()=>{try{const path=download(file);if(path)message.textContent='Saved to '+path;}catch(e){message.textContent=e.message;}};const close=document.createElement('button');close.textContent='Close';close.onclick=()=>dialog.close();actions.append(copy,email,save,close);dialog.append(title,message,input,actions);dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();return 'fallback';
}
async function share(raw){
 const parsed=root.BilliardsLayoutFiles.parse(JSON.stringify(raw));const file=root.BilliardsLayoutFiles.create(parsed.layout,parsed.state,parsed.history),url=await compactLink(file),title=file.name;
 try{if(navigator.share){const attachment=new File([JSON.stringify(file)],filename(file),{type:'application/json'});if(navigator.canShare?.({files:[attachment]})){await navigator.share({title,files:[attachment]});return 'shared';}if(url.length<=12000){await navigator.share({title,url});return 'shared';}}}catch(e){if(e.name==='AbortError')return 'cancelled';}
 return fallback(file,url);
}
function fromHash(hash){if(!hash.startsWith('#table='))return null;const text=hash.slice(7);if(text.length>6000000)throw Error('Shared layout is too large.');return root.BilliardsLayoutFiles.parse(decodeURIComponent(text));}
const api={share,link,fromHash,compactLink,readHash,filename};if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsLayoutSharing=api;
})(typeof window==='object'?window:globalThis);
