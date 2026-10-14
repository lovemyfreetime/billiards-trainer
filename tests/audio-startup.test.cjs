const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
let now=0,nextId=0,timers=new Map(),plays=0,contexts=0;
const audio={currentTime:0,paused:true,pause(){this.paused=true},play(){plays++;this.paused=false;return Promise.resolve()}};
class AudioContext{
 constructor(){contexts++;this.state='running';this.sampleRate=24000;this.destination={}}
 createMediaElementSource(){return {connect(){},disconnect(){}}}
 createBuffer(){return {}}
 createBufferSource(){return {connect(){},start(){},stop(){}}}
 resume(){this.state='running';return Promise.resolve()}
 suspend(){this.state='suspended';return Promise.resolve()}
 close(){return Promise.resolve()}
}
const env={window:{AudioContext},Date:{now:()=>now},setTimeout(fn,delay){timers.set(++nextId,{fn,delay});return nextId},clearTimeout(id){timers.delete(id)}};
vm.createContext(env);vm.runInContext(fs.readFileSync('guide/audio-startup.js','utf8'),env);
async function settle(){await Promise.resolve();await Promise.resolve()}
function warm(){now+=1000;for(const [id,t] of [...timers])if(t.delay<=1000){timers.delete(id);t.fn()}}
(async()=>{
 const p=env.window.BilliardsAudioStartup.create(audio);
 const first=p.play();await settle();assert.equal(plays,0);assert.equal(audio.currentTime,0);assert.equal(p.starting,true);
 warm();await first;assert.equal(plays,1);assert.equal(contexts,1);
 p.pause();audio.currentTime=8;await p.play();assert.equal(audio.currentTime,8,'Resume preserves playback position');assert.equal(contexts,1,'Output reused between tracks');
 p.release();audio.currentTime=0;const cancelled=p.play();await settle();p.pause();warm();await cancelled;assert.equal(plays,2,'Cancelled startup never plays');
 const replay=p.play();await settle();warm();await replay;assert.equal(plays,3);p.destroy();
 env.window.AudioContext=undefined;const fallback=env.window.BilliardsAudioStartup.create(audio);await fallback.play();assert.equal(plays,4,'Unsupported Web Audio retains native playback');fallback.destroy();
 console.log('Output warmup holds narration at zero; resume, output reuse, cancellation and native fallback passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
