const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
const start=html.indexOf('    function bindHoldAdjust('),end=html.indexOf('    window.billiardsBindHoldAdjust',start);
let now=0,id=0,value=0,enabled=true;const timers=new Map(),listeners={},global={};
const context={window:{addEventListener:(t,f)=>global[t]=f},document:{hidden:false,addEventListener:(t,f)=>global[t]=f},setTimeout:(fn,delay)=>{timers.set(++id,{fn,at:now+delay});return id;},clearTimeout:id=>timers.delete(id)};
vm.createContext(context);vm.runInContext(html.slice(start,end),context);
const captures=new Set(),button={disabled:false,style:{},addEventListener:(t,f)=>listeners[t]=f,setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture(id){captures.delete(id);listeners.lostpointercapture({pointerId:id});},getBoundingClientRect:()=>({left:0,right:50,top:0,bottom:40})};
context.bindHoldAdjust(button,()=>value++,()=>enabled);
const send=(type,extra={})=>listeners[type]({type,pointerId:1,button:0,isPrimary:true,clientX:25,clientY:20,detail:1,preventDefault(){},...extra});
function advance(ms){const until=now+ms;while(true){const pending=[...timers.entries()].filter(([,t])=>t.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!pending)break;now=pending[1].at;timers.delete(pending[0]);pending[1].fn();}now=until;}
for(const pointerType of ['mouse','touch','pen']){
 const before=value;send('pointerdown',{pointerType});assert.equal(value,before+1);advance(359);assert.equal(value,before+1);
 advance(1);assert.equal(value,before+2);advance(300);assert.equal(value,before+5);
 send('pointerup');send('click');advance(1000);assert.equal(value,before+5,'Release and synthetic click add no extra step');assert.equal(captures.size,0);assert.equal(timers.size,0);
}
for(const stop of ['pointerleave','pointercancel','lostpointercapture','blur','hidden','offButton','disabled','blocked']){
 send('pointerdown');advance(460);const before=value;
 if(stop==='blur')global.blur();else if(stop==='hidden'){context.document.hidden=true;global.visibilitychange();context.document.hidden=false;}else if(stop==='offButton')send('pointermove',{clientX:51});else if(stop==='disabled')button.disabled=true;else if(stop==='blocked')enabled=false;else send(stop);
 advance(1000);assert.equal(value,before,stop+' must stop repeating');assert.equal(timers.size,0);button.disabled=false;enabled=true;send('pointerup');
}
const before=value;send('pointerdown',{button:2});advance(500);assert.equal(value,before);send('click',{detail:0});assert.equal(value,before+1,'Keyboard activation remains one step');
button.disabled=true;send('pointerdown');send('click',{detail:0});assert.equal(value,before+1);button.disabled=false;
send('pointerdown');send('pointerup',{pointerId:9});assert(captures.size);send('pointerup');assert.equal(captures.size,0);
assert.equal(button.style.touchAction,'none');
const phone=fs.readFileSync('phone-play.js','utf8');
assert(phone.includes('billiardsBindHoldAdjust(output'));assert(phone.includes('billiardsBindHoldAdjust(plus'));
assert(html.includes('billiardsBindHoldAdjust(button, () => {'));
assert(html.includes('billiardsBindHoldAdjust($(id), adjustFn)'));
console.log('Slider holds: mouse/touch/pen taps and repeats, no release double-step, off-button/cancel/blur/hidden stops, disabled/animation guards, keyboard activation and all control bindings passed.');
