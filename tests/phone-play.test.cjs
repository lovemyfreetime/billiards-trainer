const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
class Classes {
 constructor(){this.values=new Set()}
 add(v){this.values.add(v)} remove(v){this.values.delete(v)} contains(v){return this.values.has(v)}
 toggle(v,on){on??=!this.contains(v);if(on)this.add(v);else this.remove(v);return on}
}
class Element {
 constructor(id=''){this.id=id;this.children=[];this.attrs={};this.dataset={};this.classList=new Classes();this.listeners={};this.style={setProperty(){}}}
 append(...items){for(const el of items){el.parentNode?.remove(el);el.parentNode=this;this.children.push(el)}}
 prepend(el){el.parentNode?.remove(el);el.parentNode=this;this.children.unshift(el)}
 remove(el){this.children=this.children.filter(x=>x!==el)}
 before(el){const p=this.parentNode;p.children.splice(p.children.indexOf(this),0,el);el.parentNode=p}
 after(el){const p=this.parentNode;el.parentNode?.remove(el);p.children.splice(p.children.indexOf(this)+1,0,el);el.parentNode=p}
 setAttribute(k,v){this.attrs[k]=v} getAttribute(k){return this.attrs[k]}
 addEventListener(type,fn){(this.listeners[type]??=[]).push(fn)}
 async emit(type,event={}){for(const fn of this.listeners[type]||[])await fn(event)}
 click(){return this.emit('click')} focus(){this.focused=true}
 contains(el){return el===this||this.children.some(c=>c.contains(el))}
 querySelector(q){if(q==='.btg-pool-title')return this.children.find(x=>x.id==='title');if(q.includes('data-trainer-action'))return this.children.find(x=>x.dataset.trainerAction==='toggleCueVisuals2Btn');return null}
}
function fixture(mobile=true){
 const ids={};const body=new Element('body'),root=new Element('html');
 const panel=ids.panel=new Element('panel'),title=ids.title=new Element('title'),launchers=ids['btg-pool-launchers']=new Element('btg-pool-launchers');title.append(launchers);panel.append(title);body.append(panel);
 for(const id of ['animate','undoShot','resetLayoutQuick','toggleShot2','toggleCueVisuals1Btn','toggleCueVisuals2Btn']){ids[id]=new Element(id);ids[id].calls=0;ids[id].click=()=>ids[id].calls++;panel.append(ids[id])}
 const media={matches:mobile,addEventListener(t,f){this.change=f}};
 const doc={body,documentElement:root,querySelector:()=>null,createComment:()=>new Element(),createElement:()=>new Element(),getElementById(id){return ids[id]||find(body,id)},addEventListener:body.addEventListener.bind(body)};
 const window={innerHeight:430,visualViewport:{height:430,addEventListener(){}},addEventListener(){},dispatchEvent(){}};
 function find(el,id){if(el.id===id)return el;for(const c of el.children){const r=find(c,id);if(r)return r}}
 const observers=[];
 const ctx={document:doc,window,matchMedia:()=>media,navigator:{userAgent:'iPhone'},screen:{orientation:{lock:async()=>{}}},Event:class{},MutationObserver:class{constructor(fn){this.fn=fn}observe(el){observers.push({el,fn:this.fn})}}};
 vm.runInNewContext(fs.readFileSync('phone-play.js','utf8'),ctx);
 return {ids,body,root,doc,media,get:id=>doc.getElementById(id),observers};
}
(async()=>{
 const f=fixture();assert(f.body.classList.contains('phone-layout'));assert.equal(f.ids.title.parentNode.id,'panel');assert.equal(f.ids.panel.inert,true);
 await f.get('phoneControls').click();assert(f.body.classList.contains('phone-controls-open'));assert.equal(f.ids.panel.inert,false);
 await f.get('phoneDismiss').click();assert(!f.body.classList.contains('phone-controls-open'));
 f.ids.panel.scrollHeight=2000; f.ids.panel.clientHeight=300; f.ids.panel.scrollTop=0;
 const rail=f.get('phonePanelScroll');rail.clientHeight=300;rail.getBoundingClientRect=()=>({top:50});rail.setPointerCapture=()=>{};
 const pointer=(y)=>({clientY:y,pointerId:1,preventDefault(){},stopPropagation(){}});
 await rail.emit('pointerdown',pointer(60));await rail.emit('pointermove',pointer(160));await rail.emit('pointerup');
 assert(f.ids.panel.scrollTop>500,'Dragging the separate rail scrolls the panel');
 const before=f.ids.panel.scrollTop;await rail.emit('wheel',{deltaY:100,preventDefault(){}});assert.equal(f.ids.panel.scrollTop,before+100);
 await rail.emit('keydown',{key:'Home',preventDefault(){},stopPropagation(){}});assert.equal(f.ids.panel.scrollTop,0);
 const actions=f.get('phoneActions').children.filter(x=>x.dataset.trainerAction);const action=id=>actions.find(x=>x.dataset.trainerAction===id);assert.equal(actions.length,7);
 assert.equal(actions[0].textContent,'Shoot');assert.equal(actions[0].getAttribute('aria-label'),'Execute Shot');
 assert.equal(action('toggleCueVisuals2Btn').hidden,true,'CB2 action stays hidden while Shot 2 is off');
 f.ids.toggleShot2.textContent='− SHOT 2';for(const o of f.observers.filter(o=>o.el===f.ids.toggleShot2))o.fn();
 assert.equal(action('toggleCueVisuals2Btn').hidden,false);assert(f.body.classList.contains('phone-two-shots'));
 f.ids.toggleShot2.textContent='+ SHOT 2';for(const o of f.observers.filter(o=>o.el===f.ids.toggleShot2))o.fn();
 assert.equal(action('toggleCueVisuals2Btn').hidden,true);assert(!f.body.classList.contains('phone-two-shots'));
 await action('toggleShot2').click();await action('toggleCueVisuals1Btn').click();await action('toggleCueVisuals2Btn').click();assert.equal(f.ids.toggleShot2.calls,1);assert.equal(f.ids.toggleCueVisuals1Btn.calls,1);assert.equal(f.ids.toggleCueVisuals2Btn.calls,1);await actions[0].click();assert.equal(f.ids.animate.calls,1);
 f.ids.animate.disabled=true;await actions[0].click();assert.equal(f.ids.animate.calls,1);
 await f.get('btg-fullscreen').click();assert(f.get('phoneNotice').classList.contains('visible'));assert.equal(f.get('btg-fullscreen').getAttribute('aria-pressed'),'true');
 assert(f.get('phoneNotice').children[0].textContent.includes('Add to Home Screen'));
 await f.get('btg-fullscreen').click();assert.equal(f.get('btg-fullscreen').getAttribute('aria-pressed'),'false');
 f.root.requestFullscreen=async()=>{f.doc.fullscreenElement=f.root};f.doc.exitFullscreen=async()=>{f.doc.fullscreenElement=null};
 await f.get('btg-fullscreen').click();assert.equal(f.doc.fullscreenElement,f.root);
 await f.get('btg-fullscreen').click();assert.equal(f.doc.fullscreenElement,null);
 f.root.requestFullscreen=async()=>{throw Error('unsupported')};await f.get('btg-fullscreen').click();assert(f.get('phoneNotice').classList.contains('visible'));
 await f.body.emit('keydown',{key:'Escape'});assert.equal(f.get('btg-fullscreen').getAttribute('aria-pressed'),'false');
 f.media.matches=false;f.media.change();assert.equal(f.ids.title.parentNode,f.ids.panel);assert.equal(f.ids.panel.inert,false);
 f.media.matches=true;f.media.change();assert.equal(f.ids.title.parentNode.id,'panel');
 const auto=fixture();let entries=0;
 auto.root.requestFullscreen=async()=>{entries++;auto.doc.fullscreenElement=auto.root};
 await auto.body.emit('pointerup',{target:{closest:q=>q.includes('#stage')}});
 assert.equal(entries,1,'First gameplay interaction enters native fullscreen');
 await auto.body.emit('pointerup',{target:{closest:()=>true}});assert.equal(entries,1,'No repeated fullscreen requests');
 const edited=fixture();edited.root.requestFullscreen=async()=>{throw Error('must not enter while editing')};
 await edited.body.emit('pointerup',{target:{closest:()=>null}});assert.equal(edited.doc.fullscreenElement,undefined);
 let blocked=false;await edited.body.emit('contextmenu',{target:{closest:()=>true},preventDefault(){blocked=true}});assert(blocked);
 blocked=false;await edited.body.emit('contextmenu',{target:{closest:()=>null},preventDefault(){blocked=true}});assert(!blocked);
 const d=fixture(false);assert(!d.body.classList.contains('phone-layout'));assert.equal(d.ids.title.parentNode,d.ids.panel);
 console.log('Phone controls, accessible hidden panel, action routing, native fullscreen, rejection fallback, Escape, and desktop restoration passed.');
})().catch(e=>{console.error(e);process.exit(1)});

// Moving the aim roller vertically on a phone must retain the desktop sensitivity.
const source=fs.readFileSync('index.html','utf8');
const start=source.indexOf('        function bindAimRoller(');
const stop=source.indexOf("        bindAimRoller('aimRoller', 1)",start);
for(const vertical of [true,false]) {
 const roller=new Element();const ticks=new Element();roller.querySelector=()=>ticks;roller.querySelectorAll=()=>[];roller.setPointerCapture=()=>{};
 let rotation=0;
 const context={$:()=>roller,S:{shot2Enabled:true},document:{body:{classList:{contains:name=>name==='phone-layout'&&vertical}}},setActiveShot(){},rotateAimMicro:r=>rotation+=r,setTimeout(){}};
 vm.runInNewContext(source.slice(start,stop)+';bindAimRoller("aimRoller",1)',context);
 const event=(x,y)=>({clientX:x,clientY:y,pointerId:1,preventDefault(){}});
 roller.emit('pointerdown',event(10,10));roller.emit('pointermove',event(vertical?10:22,vertical?22:10));
 assert(Math.abs(rotation-.15*Math.PI/180)<1e-12);
 assert(ticks.style.transform.startsWith(vertical?'translateY':'translateX'));
}
console.log('Separate rail scrolling and phone/desktop aim gesture sensitivity passed.');

// Phone layout selectors must target the real table container in the app.
const css=fs.readFileSync('phone-play.css','utf8');
const stageRules=[...css.matchAll(/body\.phone-layout:not\(\.projector\) #([\w-]+)\s*\{([^}]+)\}/g)]
 .filter(m=>/position:absolute|--phone-guide-height/.test(m[2]));
assert(stageRules.length>=3,'Landscape, guide and portrait table positioning rules exist');
for(const rule of stageRules) {
 assert.equal(rule[1],'stageWrap','Table positioning uses the actual container ID');
 assert(source.includes('id="'+rule[1]+'"'),'Positioned container exists in app markup');
}
assert(!css.includes('#stageWrapWrap'),'No doubled table-container selector');
console.log('Phone table positioning targets the real stage in base, guide and portrait layouts.');

// The global canvas rule uses inset:0. Fixed cue disks must clear all four edges
// before choosing bottom + left/right, or the browser pins them to the top.
const fixedDiskRule=css.match(/body\.phone-layout \.phoneTipControl:not\(\[hidden\]\)\s*\{([^}]+)\}/)[1];
assert(/inset:\s*auto\s*;/.test(fixedDiskRule),'Fixed controls override the global canvas inset');
assert(/bottom:\s*calc\(4px/.test(fixedDiskRule),'Fixed controls anchor below the sliders');
console.log('Fixed cue disks clear inherited top/left/right constraints before bottom anchoring.');
