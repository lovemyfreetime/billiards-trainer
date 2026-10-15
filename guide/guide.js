/* Billiards Trainer Guide foundation — intentionally opt-in and independent.
   Mount with BilliardsGuide.mount(element, {topics, resolveTarget}).
   No click interception until an explicitly mapped target is registered. */
(function(global){
'use strict';
const CATEGORIES=[['explore','Explore'],['start','Get Started'],['fundamentals','Fundamentals'],['physics','Physics & Tools'],['drills','Drills'],['exercises','Exercises'],['more','Resources']];
const LEVELS=['Beginner','Intermediate','Advanced'];
function safeLoad(key){try{return JSON.parse(localStorage.getItem(key))||{}}catch(_){return {}}}
function mount(host,options={}){
 if(!host || host.dataset.guideMounted) throw Error('Guide needs an unused host element');
 host.dataset.guideMounted='1';host.id=host.id||'bt-guide-root';
 host.classList.add('btg-root');
 const STORE=options.storageKey||'billiards-guide-v1';
 const saved=safeLoad(STORE);
 let state=Object.assign({enabled:false,level:0,category:'fundamentals',topicId:null,expanded:null,position:0,detailsOpen:false,autoplay:false,exploring:false},saved);
 state.exploring=false;
 if(state.category==='explore')state.category='fundamentals';
 if(state.category==='reference'){state.category='fundamentals';state.topicId=null;}
 if(options.initialCategory)state.category=options.initialCategory;
 // Opening Get Started is a user gesture: do not restore an idle open player.
 state.autoplay=state.category==='start';
 if(state.category==='start')state.enabled=false;
 let audio=new Audio();audio.preload='auto';audio.loop=false;audio.volume=.8;
 const playback=global.BilliardsAudioStartup.create(audio);
 // A topic may reference one MP3 or an ordered sequence of existing MP3s.
 let sequenceIndex=0;
 let narrationPlaying=false;
 function syncNarrationAttention(){host.classList.toggle('btg-narrating',!!state.enabled&&narrationPlaying&&!audio.paused&&!audio.ended);}
 let pendingResource=null;
 function audioFiles(t){return t?(Array.isArray(t.audio)?t.audio.filter(Boolean):(t.audio?[t.audio]:[])):[]}
 function loadSequenceTrack(t,index){const files=audioFiles(t);if(!files.length||index>=files.length)return false;
   sequenceIndex=index;audio.src=files[index];audio.dataset.topic=t.id;audio.load();audio.currentTime=0;return true;}
 const topics=Array.isArray(options.topics)?options.topics:[];
 const root=document.createElement('div');host.append(root);
 let active=null,selectBrowsing=false;
 function isActive(){return options.isActive?options.isActive():!!host.closest('#photoAnalyzerModal')?.classList.contains('open')}
 function mappedTopic(e){const el=e.target instanceof Element?e.target.closest('[data-guide-topic]'):null;return options.resolveTopic?.(e,el)||el?.dataset.guideTopic}
 function save(){try{localStorage.setItem(STORE,JSON.stringify(state))}catch(_){}}
 function stop(){options.onPlaybackStop?.();pendingResource=null;playback.pause();const t=selected();if(audioFiles(t).length)loadSequenceTrack(t,0);else audio.currentTime=0;sequenceIndex=0;state.position=0;save()}
 function selected(){return topics.find(t=>t.id===state.topicId)||null}
 function choose(id){playback.pause();if(options.onTopicChange?.(topics.find(t=>t.id===id)||null)===false){render();return false;}pendingResource=null;audio.removeAttribute('src');audio.load();sequenceIndex=0;state.topicId=id;state.position=0;save();render();return true}
 function play(){options.onPlaybackStart?.();let t=selected();if(!t&&state.enabled){t=availableLessons()[0];if(t)choose(t.id)}if(!t)return;
   if(!audioFiles(t).length)return;
   if(!audio.getAttribute('src')||audio.dataset.topic!==t.id)loadSequenceTrack(t,0);
   playback.play().catch(()=>{}).finally(render);render();}
 function syncInspection(){document.body.classList.toggle('btg-inspection',!!document.querySelector('.btg-exploring'))}
 function setEnabled(value){pendingResource=null;playback.release();state.enabled=!!value;if(value){state.exploring=false;if(!availableLessons().some(t=>t.id===state.topicId))state.topicId=null;}clearHighlight();save();render()}
 function setExploring(value){pendingResource=null;playback.release();state.exploring=!!value;if(value)state.enabled=false;clearHighlight();save();render()}
 function openCategory(category){
  selectBrowsing=false;
  if(state.category!==category)state.topicId=null;state.category=category;state.detailsOpen=false;state.expanded=null;
  state.autoplay=category==='start';
  if(category==='start'){state.topicId=null;state.position=0;sequenceIndex=0;}
  setEnabled(true);
  if(category==='start'){const first=availableLessons()[0];if(first){choose(first.id);play();}}
  else{const welcome=topics.find(t=>t.category===category&&t.categoryWelcome&&!t.guideWelcome);if(welcome){choose(welcome.id);play();}}
 }
 function openGuide(){
  selectBrowsing=false;
  state.category='fundamentals';state.topicId=null;state.position=0;sequenceIndex=0;
  state.detailsOpen=false;state.expanded=null;state.autoplay=false;setEnabled(true);
  const welcome=topics.find(t=>t.guideWelcome);
  if(welcome){choose(welcome.id);play();}else openCategory('fundamentals');
 }
 function availableLessons(){return topics.filter(x=>!x.categoryWelcome&&!x.explorerOnly&&(x.category||'explore')===state.category&&(state.category==='start'||(x.level||0)<=state.level))}
 function openResource(t){
  if(state.category!=='more'||!t?.resourceUrl)return;
  try{const url=new URL(t.resourceUrl);if(!['https:','http:'].includes(url.protocol))return;
   // After narration, browsers may block a new tab without a fresh gesture.
   const opened=global.open(url.href,'_blank');
   if(opened)opened.opener=null;else global.location.assign(url.href);
  }catch(_){}
 }
 function advanceLesson(){
  if(!state.autoplay||!state.enabled||state.exploring){render();return;}
  const available=availableLessons(),index=available.findIndex(t=>t.id===state.topicId);
  if(index<0&&selected()?.categoryWelcome&&available.length){choose(available[0].id);play();}
  else if(index>=0&&index+1<available.length){choose(available[index+1].id);play();}else{playback.pause();state.position=0;save();render();}
 }
 function skipRecording(direction){
  const current=selected(),playing=!audio.paused;pendingResource=null;playback.pause();
  const target=sequenceIndex+direction;
  if(current&&target>=0&&target<audioFiles(current).length){loadSequenceTrack(current,target);state.position=0;save();if(playing)playback.play().catch(()=>{});render();return;}
  const available=availableLessons(),index=available.findIndex(t=>t.id===state.topicId),next=index<0?(direction>0?0:available.length-1):index+direction;
  if(next>=0&&next<available.length){choose(available[next].id);if(playing)play();}else if(current&&direction<0){audio.currentTime=0;state.position=0;save();render();}
 }
 function clearHighlight(){if(active){active.classList.remove('btg-highlight');active=null}}
 function inspectTarget(e){if(!state.exploring||!isActive()||host.contains(e.target))return;
   const el=e.target.closest('[data-guide-topic]');if(el===active)return;clearHighlight();if(el&&topics.some(t=>t.id===mappedTopic(e))){active=el;active.classList.add('btg-highlight')}}
 // Capture trainer input before existing application handlers can mutate state.
 // Guide controls remain interactive; mapped trainer controls trigger narration only.
 const blockedEvents=['pointerdown','pointermove','pointerup','click','dblclick','contextmenu','wheel',
   'touchstart','touchmove','touchend','mousedown','mousemove','mouseup','dragstart','drag','dragend',
   'dragover','drop','input','change','keydown','keyup','keypress'];
 let disabledActivation=null;
 function shield(e){
   if(!state.exploring||!isActive()||host.contains(e.target)||e.target.closest?.('[data-btg-allow]'))return;
   // Do not block browser-level keyboard shortcuts when focus is outside the page.
   // Prevent default browser scrolling and existing trainer shortcuts in inspection mode.
   const target=e.target instanceof Element?e.target:null;
   const topicId=mappedTopic(e);
   const disabledControl=target?.closest('button:disabled,input:disabled,select:disabled,textarea:disabled');
   // Native disabled controls suppress click, but still expose pointer events.
   // Narrate on pointerup without enabling or invoking the trainer control.
   const disabledRelease=e.type==='pointerup'&&e.button===0&&disabledControl;
   const duplicateClick=e.type==='click'&&disabledActivation&&disabledActivation.control===disabledControl&&Date.now()-disabledActivation.time<500;
   if((disabledRelease||(e.type==='click'&&!duplicateClick))&&topics.some(t=>t.id===topicId)){
     if(disabledRelease)disabledActivation={control:disabledControl,time:Date.now()};
     choose(topicId);play();
   }
   // Disclosure controls only change which controls are visible, so inspection
   // may narrate them while allowing their normal open/close behavior.
   if(options.allowNavigation?.(e))return;
   if(e.cancelable)e.preventDefault();
   e.stopImmediatePropagation();
 }
 blockedEvents.forEach(name=>document.addEventListener(name,shield,{capture:true,passive:false}));
 function patchNode(old,node){
  const key=n=>n.nodeType===1?(n.dataset.layoutUrl||n.dataset.action||n.tagName):n.nodeType;
  if(old.nodeType!==node.nodeType||key(old)!==key(node)){old.replaceWith(node);return;}
  if(node.nodeType!==1){if(old.textContent!==node.textContent)old.textContent=node.textContent;return;}
  for(const a of [...old.attributes])if(!node.hasAttribute(a.name))old.removeAttribute(a.name);
  for(const a of [...node.attributes])if(old.getAttribute(a.name)!==a.value)old.setAttribute(a.name,a.value);
  // The practice adapter owns this live slot; preserve its timer/button nodes.
  if(node.dataset.guideSlot==='practice')return;
  if(node.tagName==='SELECT'){
   if(old.innerHTML!==node.innerHTML)old.replaceChildren(...node.childNodes);
   if(!selectBrowsing)old.value=node.value;
   return;
  }
  if(node.tagName==='INPUT')old.value=node.value;
  const scroll=old.scrollTop;
  const incoming=[...node.childNodes];
  for(let i=0;i<incoming.length;i++){if(old.childNodes[i])patchNode(old.childNodes[i],incoming[i]);else old.append(incoming[i]);}
  while(old.childNodes.length>incoming.length)old.lastChild.remove();
  old.scrollTop=scroll;
 }
 function practice(){playback.pause();state.detailsOpen=false;state.expanded=null;options.onTryShot?.();save();render()}
 function setupActions(container,t){
  if(!t?.setups?.length||!options.loadLayout)return;
  const group=document.createElement('div');group.className='btg-setup-actions';
  for(const setup of t.setups){
   const item=document.createElement('div');const button=document.createElement('button');button.type='button';button.dataset.layoutUrl=setup.url;
   button.textContent=t.setups.length===1?'Load / reset starting layout':'Load / reset: '+setup.title;
   button.onclick=async()=>{button.disabled=true;try{await (state.category==='start'&&options.loadPracticeSetup?options.loadPracticeSetup:options.loadLayout)(setup.url);}catch(error){global.alert(error.message);}finally{button.disabled=false;}};
   const download=document.createElement('a');download.href=setup.url;download.download=setup.url.split('/').pop();download.textContent='Download setup file';
   item.append(button,download);group.append(item);
  }
  const note=document.createElement('p');note.className='btg-setup-note';note.textContent=t.setups.map(x=>x.note).filter((x,i,a)=>a.indexOf(x)===i).join(' ');group.append(note);container.append(group);
 }
 function render(){
  const t=selected(),available=availableLessons();
  syncNarrationAttention();
  host.hidden=!state.enabled;host.classList.toggle('btg-exploring',!!state.exploring);syncInspection();
  options.onStateChange?.({...state});
  const view=document.createElement('div');
  host.classList.toggle('btg-enabled',!!state.enabled);
  const toolbar=document.createElement('div');toolbar.className='btg-row btg-toolbar';
  function btn(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);b.dataset.action=label==='▶'||label==='Ⅱ'?'play-pause':label;toolbar.append(b);return b}
  if(state.enabled){
   btn('⏮',()=>skipRecording(-1)).title='Previous audio file / lesson';
   btn('■',()=>{stop();render()}).title='Stop';
   const playButton=btn(audio.paused&&!playback.starting?'▶':'Ⅱ',()=>{if(audio.paused&&!playback.starting)play();else playback.pause();render()});
   playButton.disabled=!t||!audioFiles(t).length||t.recordingStatus==='pending';
   playButton.title=playButton.disabled?'Audio recording pending — use Read and More':'Play / Pause';
   btn('◀◀',()=>{audio.currentTime=Math.max(0,(audio.currentTime||0)-10)}).title='Back 10 seconds';
   btn('▶▶',()=>{audio.currentTime=Math.min(audio.duration||Infinity,(audio.currentTime||0)+10)}).title='Forward 10 seconds';
   btn('⏭',()=>skipRecording(1)).title='Next audio file / lesson';
   const autoplay=btn('A',()=>{state.autoplay=!state.autoplay;save();render()});
   autoplay.title='Autoplay next lesson';autoplay.className='btg-autoplay';
   autoplay.setAttribute('aria-label','Autoplay next lesson');autoplay.setAttribute('aria-pressed',String(!!state.autoplay));
   if(state.category==='start'&&options.onTryShot)btn('Try the Shot',practice).title='Pause narration and practice this shot';
   if(state.category!=='start'&&t?.setups?.length&&options.loadLayout)btn('Balls',()=>{options.loadLayout(selected().setups[0].url).catch(error=>global.alert(error.message));}).title='Load / reset starting ball layout';
   if(state.category!=='start'){const level=document.createElement('label');level.className='btg-level';level.textContent=LEVELS[state.level];
   const range=document.createElement('input');range.type='range';range.min='0';range.max='2';range.step='1';range.value=state.level;
   range.setAttribute('aria-label','Guide skill level');range.addEventListener('input',()=>{state.level=Number(range.value);save();render()});level.append(range);toolbar.append(level);}
   btn('Read',()=>{state.expanded=state.expanded==='read'?null:'read';state.detailsOpen=!!state.expanded;save();render()});
   if(t?.learning)btn('Practice',()=>{playback.pause();state.expanded=state.expanded==='practice'?null:'practice';state.detailsOpen=!!state.expanded;save();render()}).title='Purpose, instructions, success target, and real-table setup';
   const moreButton=btn('More',()=>{state.expanded=state.expanded==='more'?null:'more';state.detailsOpen=!!state.expanded;save();render()});moreButton.disabled=state.category==='more'&&!t?.resources?.length;
   if(state.category!=='start')btn('Reset',()=>{if(!confirm('Reset Guide session? The table will not change.'))return;stop();state={enabled:true,exploring:false,autoplay:state.category==='start',level:0,category:options.startOnly||state.category==='start'?'start':'fundamentals',topicId:null,expanded:null,detailsOpen:false,position:0};save();render();if(state.category==='start')openCategory('start')});
  }
  view.append(toolbar);if(!state.enabled){root.classList.remove('btg-details-open');patchNode(root,view);return;}
  const cats=document.createElement('div');cats.className='btg-row btg-categories';
  for(const [id,label] of CATEGORIES.filter(([id])=>id!=='explore'&&id!=='start')){const b=document.createElement('button');b.textContent=label;b.setAttribute('aria-pressed',String(state.category===id));b.onclick=()=>{stop();openCategory(id)};cats.append(b)}if(state.category!=='start')view.append(cats);
  const topic=document.createElement('div');topic.className='btg-topic';
  const title=document.createElement('strong');title.textContent=t?.title||(state.category==='start'?'Get Started':'Select a lesson');topic.append(title);
  const summary=document.createElement('p');summary.textContent=t?.summary||(state.category==='start'?'Choose an introductory lesson to start its audio.':'Choose a technique, practice lesson, or drill to start its audio.');topic.append(summary);
  const select=document.createElement('select');select.setAttribute('aria-label','Select Guide lesson');
  const blank=document.createElement('option');blank.value='';blank.textContent='Choose a topic';select.append(blank);
  const lessonGroups=new Map();
  for(const entry of available){const o=document.createElement('option');o.value=entry.id;o.textContent=entry.title;
   let parent=select;if(entry.group){if(!lessonGroups.has(entry.group)){const group=document.createElement('optgroup');group.label=entry.group;lessonGroups.set(entry.group,group);select.append(group)}parent=lessonGroups.get(entry.group)}parent.append(o)}
  select.className='btg-lesson-select';
  const measure=document.createElement('canvas').getContext('2d');if(measure){measure.font=options.poolMode?'11px system-ui':'12px system-ui';select.style.width=Math.ceil(Math.max(...Array.from(select.options,o=>measure.measureText(o.textContent).width))+44)+'px';}
  select.value=available.some(x=>x.id===state.topicId)?state.topicId:'';
  select.onfocus=()=>{selectBrowsing=true};select.onpointerdown=()=>{selectBrowsing=true};
  select.onblur=()=>{selectBrowsing=false;select.value=availableLessons().some(x=>x.id===state.topicId)?state.topicId:''};
  select.onkeydown=e=>{if(e.key==='Escape'){selectBrowsing=false;select.value=state.topicId||''}else selectBrowsing=true};
  select.onchange=()=>{selectBrowsing=false;const id=select.value;const accepted=choose(id||null);if(accepted!==false&&id){const t=selected();if(state.category==='more'&&t?.resourceUrl)pendingResource=t.id;play();}};
  const drawer=options.poolMode?document.createElement('div'):topic;
  if(options.poolMode){drawer.className='btg-pool-drawer';view.append(drawer)}
  const playingTitle=document.createElement('strong');playingTitle.className='btg-current-lesson';playingTitle.textContent=t?.title||'Choose a topic';playingTitle.setAttribute('aria-live','polite');drawer.append(playingTitle);
  if(options.poolMode&&state.category==='start'){const row=document.createElement('div');row.className='btg-lesson-row';const slot=document.createElement('div');slot.className='btg-practice-slot';slot.dataset.guideSlot='practice';row.append(select,slot);drawer.append(row)}else drawer.append(select);
  if(state.expanded&&state.detailsOpen){const detail=document.createElement('div');detail.className='btg-expanded';
   if(state.category!=='start'||state.expanded==='practice')setupActions(detail,t);
   if(state.expanded==='practice')global.BilliardsLearning?.render(detail,t);
   if(state.category==='start'&&state.expanded==='more'){
    const library=document.createElement('div');library.className='btg-practice-library';
    for(const setup of options.getPracticeSetups?.()||[]){
     const item=document.createElement('div'),title=document.createElement('strong');title.textContent=setup.title;
     const load=document.createElement('button');load.type='button';load.dataset.layoutUrl=setup.url;load.textContent='Load layout';load.onclick=()=>{options.loadPracticeSetup(setup.url).catch(error=>global.alert(error.message));};
     const download=document.createElement('a');download.href=setup.url;download.download=setup.url.split('/').pop();download.textContent='Download layout';
     const recording=document.createElement('a');recording.href=setup.audio;recording.download=setup.audio.split('/').pop();recording.textContent='Download MP3';
     item.append(title,load,download,recording);library.append(item);
    }detail.append(library);
   }
   if(t?.recordingStatus==='pending'){const status=document.createElement('p');status.className='btg-recording-status';status.textContent='Audio recording pending. Instructions and links are ready.';detail.append(status)}
   if(state.expanded==='read'){const text=document.createElement('p');text.textContent=t?.text||'No narration text assigned.';detail.append(text)}
   if(state.expanded!=='read'&&state.expanded!=='practice'){
    for(const [label,value] of Object.entries(state.category==='more'||state.category==='start'?{}:t?.practice||{})){const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value));detail.append(p)}
   }
   {
    const resources=[...(t?.resources||[]),...(state.category==='start'?[]:options.resources||[])];
    const seen=new Set();const list=document.createElement('ul');list.className='btg-resource-links';
    for(const resource of resources){let url;try{url=new URL(resource.url);if(!['https:','http:'].includes(url.protocol)||seen.has(url.href))continue;}catch(_){continue}seen.add(url.href);
     const item=document.createElement('li'),link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent=resource.title||url.hostname;item.append(link);list.append(item)}
    if(list.children.length){if(state.category==='more')detail.append(list);else{const title=document.createElement('strong');title.textContent='Pool & Billiards Tutorials';detail.append(title,list);const note=document.createElement('p');note.className='btg-resource-note';note.textContent='YouTube links open in a new tab and require internet.';detail.append(note)}}
    else if(state.expanded!=='read'&&state.category!=='more'&&state.category!=='start'&&!t?.practice&&!t?.setups?.length){detail.textContent='Resources will be added here.'}
   }
   drawer.append(detail)}
  if(!options.poolMode)view.append(topic);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='btg-expansion-tab';
  toggle.textContent=(options.poolMode||host.classList.contains('btg-header-mode'))?(state.detailsOpen?'×':'+'):(state.detailsOpen?'⌃':'⌄');
  toggle.title=state.detailsOpen?'Close reading area':'Open reading area';
  toggle.setAttribute('aria-label',state.detailsOpen?'Close Guide details':'Open Guide details');
  toggle.setAttribute('aria-expanded',String(!!state.detailsOpen));
  toggle.addEventListener('click',()=>{state.detailsOpen=!state.detailsOpen;if(state.detailsOpen&&!state.expanded)state.expanded='read';if(!state.detailsOpen)state.expanded=null;save();render()});
  if(options.poolMode)toolbar.append(toggle);else view.append(toggle);
  if(host.classList.contains('btg-header-mode')){view.insertBefore(select,topic);topic.hidden=!state.detailsOpen;}
  view.className=root.className;patchNode(root,view);
  root.classList.toggle('btg-details-open',!!state.detailsOpen);
  options.onRendered?.();

 }
 audio.addEventListener('timeupdate',()=>{state.position=audio.currentTime;options.onPlaybackProgress?.(selected(),audio.currentTime,!audio.paused);save()});
 audio.addEventListener('playing',()=>{narrationPlaying=true;render()});
 audio.addEventListener('pause',()=>{narrationPlaying=false;options.onPlaybackProgress?.(selected(),audio.currentTime,false);render()});
 for(const event of ['waiting','ended','emptied','error','loadstart'])audio.addEventListener(event,()=>{narrationPlaying=false;syncNarrationAttention()});
 audio.addEventListener('ended',()=>{const t=selected();
  if(!audio.ended||!t||audio.dataset.topic!==t.id)return;
  if(sequenceIndex+1<audioFiles(t).length){loadSequenceTrack(t,sequenceIndex+1);playback.play().catch(()=>{});}
  else{state.position=0;save();const resource=pendingResource===t.id?t:null;pendingResource=null;if(options.onLessonEnd?.(t,{...state})!==true)advanceLesson();if(resource)openResource(resource);}
 });
 document.addEventListener('pointerover',inspectTarget,true);
 // Explorer alone enables the inspection shield; validate against real trainer interactions before integration.
 render();
 return {setEnabled,setExploring,openCategory,openGuide,tryShot:practice,nextLesson(){const list=availableLessons(),i=list.findIndex(t=>t.id===state.topicId);if(i<0||i+1>=list.length)return false;if(choose(list[i+1].id)===false)return false;play();return true},pause(){playback.pause();render()},selectTopic(id){choose(id);},destroy(){narrationPlaying=false;host.classList.remove('btg-narrating');pendingResource=null;playback.destroy();clearHighlight();document.body.classList.remove('btg-inspection');document.removeEventListener('pointerover',inspectTarget,true);blockedEvents.forEach(name=>document.removeEventListener(name,shield,true));host.replaceChildren();delete host.dataset.guideMounted},getState(){return {...state}}};
}
global.BilliardsGuide={mount,CATEGORIES,LEVELS};
})(window);
