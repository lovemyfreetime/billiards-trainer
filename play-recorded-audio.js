/* Offline Chase audio; missing clips never fall back to a device voice. */
(function(){'use strict';
const catalog=window.BilliardsAnnouncementCatalog||{},buffers=new Map();let context=null,active=null,serial=0,filePlayer=null;const fileMode=new URL(document.baseURI).protocol==='file:';
function ids(message){return Array.isArray(message)?message:[];}
function available(){return (fileMode||!!(window.AudioContext||window.webkitAudioContext))&&Object.keys(catalog).length>0;}
function unlock(){if(fileMode){filePlayer=filePlayer||new Audio();return Promise.resolve();}if(!available())return Promise.resolve();context=context||new (window.AudioContext||window.webkitAudioContext)();return context.resume();}
function cancel(){serial++;if(filePlayer){filePlayer.onended=filePlayer.onerror=null;filePlayer.pause();filePlayer.removeAttribute('src');filePlayer.load();}const a=active;active=null;if(!a)return;for(const source of a.sources){source.onended=null;try{source.stop();}catch{}}a.done();}
function report(){document.dispatchEvent(new CustomEvent('billiards-audio-error',{detail:'Chase audio could not play. Tap Audio off, then Audio on to retry.'}));}
async function load(id){const row=catalog[id];if(!row||row.recordingStatus!=='recorded')throw Error('Missing Chase clip: '+id);if(!buffers.has(id)){const promise=fetch(new URL(row.src,document.baseURI)).then(r=>{if(!r.ok)throw Error('Audio unavailable');return r.arrayBuffer();}).then(b=>context.decodeAudioData(b));buffers.set(id,promise);promise.catch(()=>buffers.delete(id));}return buffers.get(id);}
function duration(message){return ids(message).reduce((n,id)=>n+(catalog[id]?.duration||1),0)*1000+2000;}
function speakFile(list,a,token){let i=0;filePlayer=filePlayer||new Audio();const next=()=>{if(active!==a||token!==serial)return;const row=catalog[list[i]];if(!row||row.recordingStatus!=='recorded'){active=null;report();a.done();return;}filePlayer.src=new URL(row.src,document.baseURI).href;filePlayer.onended=()=>{if(active!==a||token!==serial)return;if(++i<list.length)next();else{active=null;a.done();}};const failed=()=>{if(active!==a||token!==serial)return;active=null;report();a.done();};filePlayer.onerror=failed;filePlayer.play().catch(failed);};next();}
async function speak(message,done=()=>{}){
 cancel();const list=ids(message);if(!list.length){done();return;}const token=serial,a={sources:[],done};active=a;if(fileMode){speakFile(list,a,token);return;}
 try{await unlock();if(!context||context.state!=='running')throw Error('Audio needs a tap');const decoded=await Promise.all(list.map(load));if(token!==serial||active!==a)return;let time=context.currentTime+0.04;
  decoded.forEach((buffer,i)=>{const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);a.sources.push(source);if(i===decoded.length-1)source.onended=()=>{if(active===a){active=null;a.done();}};source.start(time);time+=buffer.duration+0.045;});
 }catch{if(token!==serial||active!==a)return;active=null;report();a.done();}
}
window.BilliardsAudio={available,unlock,duration,cancel,speak,speaking:()=>!!active||!!window.BilliardsNarration?.speaking()};
window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();});document.addEventListener('billiards-native-pause',cancel);
})();
