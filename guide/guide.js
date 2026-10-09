/* Billiards Trainer Guide foundation — intentionally opt-in and independent.
   Mount with BilliardsGuide.mount(element, {topics, resolveTarget}).
   No click interception until an explicitly mapped target is registered. */
(function(global){
'use strict';
const STORE='billiards-guide-v1';
const CATEGORIES=[['explore','Explore'],['start','Get Started'],['fundamentals','Fundamentals'],['physics','Physics & Tools'],['drills','Drills'],['exercises','Exercises']];
const LEVELS=['Beginner','Intermediate','Advanced'];
function safeLoad(){try{return JSON.parse(localStorage.getItem(STORE))||{}}catch(_){return {}}}
function mount(host,options={}){
 if(!host || host.dataset.guideMounted) throw Error('Guide needs an unused host element');
 host.dataset.guideMounted='1';host.id=host.id||'bt-guide-root';
 const saved=safeLoad();
 let state=Object.assign({enabled:false,level:0,category:'explore',topicId:null,expanded:null,position:0},saved);
 let audio=new Audio();audio.preload='none';
 const topics=Array.isArray(options.topics)?options.topics:[];
 const root=document.createElement('div');host.append(root);
 let active=null;
 function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch(_){}}
 function stop(){audio.pause();audio.currentTime=0;state.position=0;save()}
 function selected(){return topics.find(t=>t.id===state.topicId)||null}
 function choose(id){audio.pause();audio.removeAttribute('src');audio.load();state.topicId=id;state.position=0;save();render()}
 function play(){const t=selected();if(!t||!t.audio)return;
   if(!audio.getAttribute('src')||audio.dataset.topic!==t.id){audio.src=t.audio;audio.dataset.topic=t.id;audio.load();audio.addEventListener('loadedmetadata',function once(){audio.removeEventListener('loadedmetadata',once);if(state.position>0)audio.currentTime=Math.min(state.position,audio.duration||state.position)})}
   audio.play().catch(()=>{});}
 function setEnabled(value){state.enabled=value;audio.pause();state.position=audio.currentTime||state.position;document.body.classList.toggle('btg-inspection',value);if(!value)clearHighlight();save();render()}
 function clearHighlight(){if(active){active.classList.remove('btg-highlight');active=null}}
 function inspectTarget(e){if(!state.enabled||state.category!=='explore'||host.contains(e.target))return;
   const el=e.target.closest('[data-guide-topic]');if(el===active)return;clearHighlight();if(el&&topics.some(t=>t.id===el.dataset.guideTopic)){active=el;active.classList.add('btg-highlight')}}
 function intercept(e){if(!state.enabled||state.category!=='explore'||host.contains(e.target))return;
   const el=e.target.closest('[data-guide-topic]');if(!el)return;
   e.preventDefault();e.stopImmediatePropagation();if(e.type==='click'){choose(el.dataset.guideTopic);play()}}
 // Capture trainer input before existing application handlers can mutate state.
 // Guide controls remain interactive; mapped trainer controls trigger narration only.
 const blockedEvents=['pointerdown','pointerup','click','dblclick','contextmenu','wheel',
   'touchstart','touchmove','touchend','mousedown','mouseup','dragstart','drag','dragend',
   'dragover','drop','input','change','keydown','keyup','keypress'];
 function shield(e){
   if(!state.enabled||host.contains(e.target))return;
   // Do not block browser-level keyboard shortcuts when focus is outside the page.
   // Prevent default browser scrolling and existing trainer shortcuts in inspection mode.
   const target=e.target instanceof Element?e.target:null;
   const mapped=target?.closest('[data-guide-topic]');
   if(e.type==='click'&&mapped&&topics.some(t=>t.id===mapped.dataset.guideTopic)){
     choose(mapped.dataset.guideTopic);play();
   }
   if(e.cancelable)e.preventDefault();
   e.stopImmediatePropagation();
 }
 blockedEvents.forEach(name=>document.addEventListener(name,shield,{capture:true,passive:false}));
 function render(){
  const t=selected(),available=topics.filter(x=>(x.category||'explore')===state.category&&(x.level||0)<=state.level);
  root.innerHTML='';
  const toolbar=document.createElement('div');toolbar.className='btg-row';
  function btn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);toolbar.append(b);return b}
  btn(state.enabled?'Guide ON':'Guide OFF',()=>setEnabled(!state.enabled));
  if(state.enabled){
   btn('■',()=>{stop();render()}).title='Stop';
   btn(audio.paused?'▶':'Ⅱ',()=>{if(audio.paused)play();else audio.pause();render()}).title='Play / Pause';
   btn('◀',()=>{audio.currentTime=Math.max(0,(audio.currentTime||0)-10)}).title='Back 10 seconds';
   btn('▶▶',()=>{audio.currentTime=Math.min(audio.duration||Infinity,(audio.currentTime||0)+10)}).title='Forward 10 seconds';
   const level=document.createElement('label');level.className='btg-level';level.textContent=LEVELS[state.level];
   const range=document.createElement('input');range.type='range';range.min='0';range.max='2';range.step='1';range.value=state.level;
   range.setAttribute('aria-label','Guide skill level');range.addEventListener('input',()=>{state.level=Number(range.value);save();render()});level.append(range);toolbar.append(level);
   btn('Read',()=>{state.expanded=state.expanded==='read'?null:'read';save();render()});
   btn('More',()=>{state.expanded=state.expanded==='more'?null:'more';save();render()});
   btn('Reset',()=>{if(!confirm('Reset Guide session? The table will not change.'))return;stop();state={enabled:true,level:0,category:'explore',topicId:null,expanded:null,position:0};save();render()});
  }
  root.append(toolbar);if(!state.enabled)return;
  const cats=document.createElement('div');cats.className='btg-row btg-categories';
  for(const [id,label] of CATEGORIES){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(state.category===id));b.onclick=()=>{state.category=id;save();render()};cats.append(b)}root.append(cats);
  const topic=document.createElement('div');topic.className='btg-topic';
  const title=document.createElement('strong');title.textContent=t?.title||'Select a lesson or inspect a feature';topic.append(title);
  const summary=document.createElement('p');summary.textContent=t?.summary||'Point to a mapped control, then click or tap to hear its explanation.';topic.append(summary);
  const select=document.createElement('select');select.setAttribute('aria-label','Select Guide lesson');
  const blank=document.createElement('option');blank.value='';blank.textContent='Choose a topic';select.append(blank);
  for(const entry of available){const o=document.createElement('option');o.value=entry.id;o.textContent=entry.title;select.append(o)}
  select.value=available.some(x=>x.id===state.topicId)?state.topicId:'';
  select.onchange=()=>choose(select.value||null);topic.append(select);
  if(state.expanded){const detail=document.createElement('div');detail.className='btg-expanded';detail.textContent=state.expanded==='read'?(t?.text||'No narration text assigned.'):(t?.resources?.length?t.resources.map(x=>x.title+' — '+x.url).join('\n'):'Resources will be added here.');topic.append(detail)}
  root.append(topic);
 }
 audio.addEventListener('timeupdate',()=>{state.position=audio.currentTime;save()});
 audio.addEventListener('ended',()=>render());
 document.addEventListener('pointerover',inspectTarget,true);
 // Shield is enabled only when Guide is ON; validate against real trainer interactions before integration.
 render();
 return {destroy(){audio.pause();clearHighlight();document.body.classList.remove('btg-inspection');document.removeEventListener('pointerover',inspectTarget,true);blockedEvents.forEach(name=>document.removeEventListener(name,shield,true));host.replaceChildren();delete host.dataset.guideMounted},getState(){return {...state}}};
}
global.BilliardsGuide={mount,CATEGORIES,LEVELS};
})(window);
