const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
(async()=>{
const audios=[],listeners={},buttons=[],dialogs=[];
function element(){return {attrs:{},textContent:'',setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,v){this[k]=v;}};}
for(const key of ['zen','trainer','play']){const button=element(),status=element(),dialog=element();dialog.id='about-'+key;dialog.querySelector=s=>s==='.description-speaker'?button:status;dialogs.push(dialog);buttons.push(button);}
class Audio{constructor(src){this.src=src;this.playbackRate=1;audios.push(this);}play(){return new Promise((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}pause(){this.paused=true;}removeAttribute(k){delete this[k];}load(){}}
const fullscreen=element(),close=element(),document={hidden:false,getElementById:id=>id==='welcomeFullscreen'?fullscreen:close,querySelectorAll:()=>dialogs,addEventListener:(k,v)=>listeners[k]=v};
const window={addEventListener:(k,v)=>listeners[k]=v,BilliardsDisplay:{active:()=>true,enter(){}}};
Object.defineProperty(window,'speechSynthesis',{get(){throw Error('Device voice must never be used');}});
vm.runInNewContext(fs.readFileSync('welcome-controls.js','utf8'),{document,window,Audio});
for(let i=0;i<3;i++){buttons[i].onclick();assert.equal(audios.at(-1).src,'./guide/audio/experience-'+['zen','trainer','play'][i]+'.mp3');assert.equal(audios.at(-1).playbackRate,1.3);assert.equal(buttons[i].attrs['aria-pressed'],'true');if(i)assert(audios[i-1].paused);}
// A rejected, stopped request must not clear a newly started recording.
audios[0].reject(Error('canceled'));await Promise.resolve();assert.equal(buttons[2].attrs['aria-pressed'],'true');
buttons[2].onclick();assert(audios[2].paused);assert.equal(buttons[2].attrs['aria-pressed'],'false');
buttons[0].onclick();audios.at(-1).onended();assert.equal(buttons[0].attrs['aria-pressed'],'false');
buttons[1].onclick();audios.at(-1).onerror();assert.match(dialogs[1].querySelector('[role=status]').textContent,/Chase recording/);assert.equal(buttons[1].attrs['aria-pressed'],'false');
for(const event of ['close','pagehide','visibilitychange']){buttons[0].onclick();const audio=audios.at(-1);if(event==='close')dialogs[0].close();else {document.hidden=true;listeners[event]();}assert(audio.paused,event);assert.equal(buttons[0].attrs['aria-pressed'],'false');}
const scripts=JSON.parse(fs.readFileSync('docs/audio-quality/experience-scripts.json','utf8')),html=fs.readFileSync('welcome.html','utf8');assert.equal(scripts.records.length,3);for(const r of scripts.records){assert(html.includes('<p>'+r.text+'</p>'));assert.equal(require('node:crypto').createHash('sha256').update(fs.readFileSync(r.path)).digest('hex'),r.sha256);assert.equal(require('node:crypto').createHash('sha256').update(r.text).digest('hex'),r.script_sha256);assert.equal(scripts.voice,'chase');assert.equal(scripts.post_processing,'none');}
console.log('Three recorded narration routes, matching 1.3x playback pace, stop/end/error/close/navigation behavior, stale rejection isolation, and exact description scripts pass.');
})().catch(e=>{console.error(e);process.exitCode=1;});
