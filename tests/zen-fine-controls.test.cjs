const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('zen-mode.js','utf8');
const start=source.indexOf('function zenCanHover('),end=source.indexOf('const ZEN_FADE_DURATION=',start);
let now=0,timerId=0;const timers=new Map(),globalEvents={};
const context={Event,Math,window:{addEventListener:(t,f)=>globalEvents[t]=f},document:{hidden:false,addEventListener:(t,f)=>globalEvents[t]=f},setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,at:now+delay});return timerId},clearTimeout:id=>timers.delete(id)};
const advance=ms=>{const target=now+ms;while(true){const next=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();}now=target;};
vm.createContext(context);vm.runInContext(source.slice(start,end),context);
for(const [pointerType,buttons,expected]of [['mouse',0,true],['pen',0,true],['pen',1,false],['touch',1,false]])assert.equal(context.zenCanHover({pointerType,buttons}),expected);
const listeners={},captures=new Set(),changes=[];let value=0;
const input={disabled:false,dispatchEvent:e=>changes.push(e.type)};
const surface={style:{},getBoundingClientRect:()=>({left:0,top:0,width:200,height:40}),addEventListener:(type,fn)=>listeners[type]=fn,setPointerCapture:id=>captures.add(id),hasPointerCapture:id=>captures.has(id),releasePointerCapture:id=>{captures.delete(id);listeners.lostpointercapture({pointerId:id})}};
context.bindZenFineControl(surface,input,steps=>value+=steps,true);
const send=(type,fields={})=>{let prevented=false;listeners[type]({type,button:0,pointerId:7,clientX:20,clientY:20,preventDefault(){prevented=true},...fields});return prevented;};
assert(send('wheel',{deltaY:-100}));assert.equal(value,1);send('wheel',{deltaY:100});assert.equal(value,0);assert(!send('wheel',{deltaY:-100,ctrlKey:true}));
send('pointerdown');advance(449);assert.equal(value,0);send('pointerup');assert.equal(value,-1,'Quick tap is exactly one step');advance(1000);assert.equal(value,-1);
send('pointerdown',{clientX:180});advance(450);assert.equal(value,0,'Hold begins after the dwell');advance(360);assert.equal(value,3,'Hold repeats in the chosen direction');send('pointerup',{clientX:180});assert.equal(value,3,'Release adds no extra tap');advance(1000);assert.equal(value,3);assert(!captures.size);assert.equal(timers.size,0);
send('pointerdown');advance(450);const held=value;send('pointermove',{clientX:180});advance(500);assert.equal(value,held,'Leaving the original half stops without reversing');send('pointerup',{clientX:180});
send('pointerdown');advance(450);const off=value;send('pointermove',{clientX:-1});advance(500);assert.equal(value,off,'Leaving the arrows stops captured input');
send('pointerdown');send('pointermove',{clientX:56});assert.equal(value,off+3);advance(1000);assert.equal(value,off+3,'Swiping cancels hold intent');send('pointermove',{clientX:20});send('pointerup');assert.equal(value,off,'Swipe reversal has no extra release step');
send('pointerdown',{clientX:100});send('pointerup',{clientX:100});assert.equal(value,off,'Center divider is neutral');
for(const end of ['pointercancel','lostpointercapture','blur','visibilitychange']){
 send('pointerdown');advance(450);const before=value;
 if(end==='blur')globalEvents.blur();else if(end==='visibilitychange'){context.document.hidden=true;globalEvents.visibilitychange();context.document.hidden=false;}else send(end);
 advance(1000);assert.equal(value,before,end+' stops repetition');send('pointerup');
}
send('pointerdown');input.disabled=true;advance(1000);send('pointerup');const disabledValue=value;assert(!send('wheel',{deltaY:-100}));send('pointerdown');assert(!captures.size);assert.equal(value,disabledValue);
assert(send('click'));assert.equal(surface.style.touchAction,'none');assert(changes.length>0);
console.log('Zen arrows: directional taps, delayed repeating holds, immediate release/off-zone/cancel/blur stops, swipe cancellation of hold, neutral divider, disabled guard, and pen hover pass.');
