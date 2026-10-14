/* Get Started: real practice checkpoints around one narration per lesson. */
(function(global){
'use strict';
const STORE='billiards-get-started-tour-v1';
async function mount(guide){
 const bridge=global.billiardsTourBridge,panel=document.getElementById('panel'),launcher=document.getElementById('btg-pool-start');
 if(!bridge||!panel||!launcher)return null;
 const response=await fetch('./guide/get-started-tour.json?v=interactive-start-v19');if(!response.ok)throw Error('Get Started lessons unavailable');
 const catalog=await response.json(),steps=catalog.steps;
 const host=document.createElement('section');host.id='bt-get-started-tour';host.hidden=true;host.dataset.btgAllow='1';host.setAttribute('aria-label','Get Started practice walkthrough');
 host.innerHTML='<div class="bt-tour-heading"><strong>Get Started</strong><span id="bt-tour-progress"></span></div><select id="bt-tour-lessons" aria-label="Get Started practice lesson"></select><p id="bt-tour-prompt"></p><div class="bt-tour-row"><button id="bt-tour-play" type="button">Play Narration</button><button id="bt-tour-wheel" class="bt-tour-primary" type="button">Take the Wheel</button><button id="bt-tour-retry" type="button">Try Again</button></div><details id="bt-tour-read"><summary>Read narration</summary><p id="bt-tour-text"></p></details><div id="bt-tour-status" role="status" aria-live="polite"></div><div class="bt-tour-row"><button id="bt-tour-back" type="button">Back</button><button id="bt-tour-next" class="bt-tour-primary" type="button">Next Lesson</button><button id="bt-tour-exit" type="button">Exit &amp; Restore</button></div><div class="bt-tour-row"><button id="bt-tour-download" type="button">Save Practice File</button><button id="bt-tour-finish" type="button" hidden>Finish &amp; Keep Table</button></div>';
 panel.querySelector('.section').before(host);
 const floating=document.createElement('button');floating.id='bt-tour-return';floating.type='button';floating.textContent='Resume Tour';floating.hidden=true;floating.dataset.btgAllow='1';document.getElementById('stageWrap').append(floating);
 const $=id=>document.getElementById('bt-tour-'+id),setText=(el,value)=>{if(el.textContent!==value)el.textContent=value},select=$('lessons');steps.forEach((s,i)=>{const option=document.createElement('option');option.value=i;option.textContent=(i+1)+'. '+s.title;select.append(option)});
 const audio=new Audio();audio.preload='auto';audio.volume=.8;audio.dataset.getStartedTour='1';const output=global.BilliardsAudioStartup.create(audio);
 let active=false,index=0,original=null,checkpoint=null,profile=null,loading=false,wheel=false,actions=0,undos=0,notice='',fade=null,interval=null,saveTimer=null,lastExplorerTopic=null;
 const step=()=>steps[index],hasAudio=()=>step()?.recordingStatus==='recorded'&&!!step().audio;
 function save(){if(!active||loading)return;try{localStorage.setItem(STORE,JSON.stringify({version:1,active:true,index,original,checkpoint,current:bridge.capture(),actions,undos,wheel}));}catch(_){} }
 function pause(){clearInterval(fade);fade=null;output.pause();audio.volume=.8;render();}
 function dimPause(){if(audio.paused&&!output.starting)return;clearInterval(fade);const start=performance.now(),from=audio.volume;fade=setInterval(()=>{const t=Math.min(1,(performance.now()-start)/200);audio.volume=from*(1-t);if(t===1)pause();},20);}
 function clearHighlights(){document.querySelectorAll('.bt-tour-attention').forEach(el=>el.classList.remove('bt-tour-attention'));}
 function highlight(){clearHighlights();if(!active)return;for(const id of step().targets||[])document.getElementById(id)?.classList.add('bt-tour-attention');}
 function render(){
  if(!active)return;const snap=bridge.snapshot(),s=step();
  launcher.setAttribute('aria-pressed','true');setText($('progress'),(index+1)+' / '+steps.length);if(select.value!==String(index))select.value=index;
  setText($('prompt'),s.prompt);setText($('text'),s.text);
  $('play').disabled=!hasAudio();setText($('play'),!hasAudio()?'Audio unavailable':output.starting||!audio.paused?'Pause Narration':audio.currentTime>0&&!audio.ended?'Resume Narration':'Play Narration');
  setText($('wheel'),index===7?'Explore the Controls':'Take the Wheel');
  $('retry').disabled=snap.busy;$('back').disabled=index===0||snap.busy;$('next').disabled=index===steps.length-1||snap.busy;select.disabled=snap.busy;$('finish').hidden=index!==steps.length-1;
  setText($('status'),snap.busy?'Shot in progress…':notice||(index===6&&undos?'Previous setup restored. Adjust and shoot again.':index===4&&actions>=2?'Two strokes completed. Try another leave or continue.':actions?'Shot completed. Try a variation or continue.':wheel?'Your table is live. Try the challenge, then continue.':!hasAudio()?'Read the narration, then take the wheel.':'Listen, then try the challenge.'));
 }
 function setupAudio(){pause();audio.removeAttribute('src');audio.load();if(hasAudio()){audio.src=step().audio;audio.load();audio.currentTime=0;}}
 function play(){if(!active||!hasAudio())return;if(audio.ended)audio.currentTime=0;guide.setEnabled(false);guide.setExploring(false);wheel=false;notice='';output.play().catch(()=>{notice='Tap Play Narration to listen.';render()}).finally(render);render();}
 function phonePanel(open){if(document.body.classList.contains('phone-layout')&&document.body.classList.contains('phone-controls-open')!==open)document.getElementById('phoneControls')?.click();}
 function show(){if(!active)return;phonePanel(true);host.hidden=false;floating.hidden=false;host.scrollIntoView({block:'nearest',behavior:'smooth'});render();}
 function go(next){
  if(!active||bridge.snapshot().busy)return false;loading=true;pause();guide.setEnabled(false);guide.setExploring(false);index=Math.max(0,Math.min(steps.length-1,next));actions=0;undos=0;wheel=false;notice='';
  bridge.apply(step(),profile);checkpoint=bridge.capture();loading=false;setupAudio();$('read').open=!hasAudio();host.hidden=false;highlight();show();save();if(hasAudio())play();return true;
 }
 function start(){
  if(active){show();return;}
  if(bridge.snapshot().busy)return;
  guide.setEnabled(false);guide.setExploring(false);let saved=null;try{saved=JSON.parse(localStorage.getItem(STORE)||'null')}catch(_){}
  if(saved?.version===1&&saved.active&&saved.original&&saved.current&&saved.checkpoint&&Number.isInteger(saved.index)&&saved.index>=0&&saved.index<steps.length){
   original=saved.original;profile=original.state;checkpoint=saved.checkpoint;index=saved.index;actions=saved.actions||0;undos=saved.undos||0;wheel=true;active=true;bridge.restore(saved.current);setupAudio();$('read').open=!hasAudio();notice='Practice restored. Continue when you are ready.';highlight();show();
  }else{original=bridge.capture();profile=original.state;active=true;go(0);}
  if(!interval)interval=setInterval(()=>{if(!active)return;const g=guide.getState();if(index===7&&g.exploring&&g.topicId!==lastExplorerTopic){lastExplorerTopic=g.topicId;notice='Control explored. Turn Explorer off to shoot.';}render();},250);
  floating.hidden=false;
 }
 function retry(){if(!active||bridge.snapshot().busy)return;loading=true;pause();guide.setEnabled(false);guide.setExploring(false);bridge.restore(checkpoint);actions=0;undos=0;notice='Starting lesson setup restored.';wheel=true;loading=false;highlight();render();save();}
 function takeWheel(){if(!active)return;pause();wheel=true;notice='';$('read').open=false;phonePanel(false);if(index===7){lastExplorerTopic=guide.getState().topicId;guide.setExploring(true);}else guide.setExploring(false);highlight();render();save();}
 function finish(restore){if(!active)return;loading=true;pause();guide.setEnabled(false);guide.setExploring(false);if(restore)bridge.restore(original);active=false;loading=false;clearInterval(interval);interval=null;clearTimeout(saveTimer);host.hidden=true;floating.hidden=true;phonePanel(false);launcher.setAttribute('aria-pressed','false');clearHighlights();try{localStorage.removeItem(STORE)}catch(_){}original=null;checkpoint=null;}
 $('play').addEventListener('click',()=>!audio.paused||output.starting?pause():play());$('wheel').addEventListener('click',takeWheel);$('retry').addEventListener('click',retry);
 $('back').addEventListener('click',()=>go(index-1));$('next').addEventListener('click',()=>go(index+1));select.addEventListener('change',()=>go(Number(select.value)));
 $('exit').addEventListener('click',()=>finish(true));$('finish').addEventListener('click',()=>finish(false));
 floating.addEventListener('click',()=>{show();if(hasAudio()&&audio.paused)play();else $('read').open=true;});
 $('download').addEventListener('click',()=>{const file=global.BilliardsLayoutFiles.create({name:checkpoint.state.lastLayoutName,tableL:checkpoint.state.tableL,tableW:checkpoint.state.tableW,ballR:checkpoint.state.ballR,setupMode:checkpoint.state.setupMode,balls:checkpoint.state.balls,freeAim:checkpoint.state.freeAim},checkpoint.state,checkpoint.history);const url=URL.createObjectURL(new Blob([JSON.stringify(file,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Get-Started-'+String(index+1).padStart(2,'0')+'.billiards.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 host.addEventListener('keydown',event=>event.stopPropagation());
 document.addEventListener('pointerdown',event=>{if(!active||host.contains(event.target)||floating.contains(event.target))return;if(event.target.closest('#canvas,#tipCanvas,#tipCanvas2,#phoneTip1,#phoneTip2,#stageWrap input,#stageWrap button,#phoneActions button,#panel input,#panel button,#pocketTray')){dimPause();wheel=true;clearTimeout(saveTimer);saveTimer=setTimeout(save,500);}},true);
 document.addEventListener('input',event=>{if(active&&!host.contains(event.target)){dimPause();clearTimeout(saveTimer);saveTimer=setTimeout(save,500);}},true);
 document.addEventListener('click',event=>{if(!active)return;if(event.target.closest('#resetLayoutQuick,#resetLayout')){event.preventDefault();event.stopImmediatePropagation();retry();}else if(event.target.closest('#analyzePhotoBtn,#cameraCaptureBtn,#btg-pool-guide,#btg-pool-explore'))pause();},true);
 global.addEventListener('billiards:shot-complete',()=>{if(active&&!loading){pause();actions++;notice='';render();save();}});
 global.addEventListener('billiards:undo-complete',()=>{if(active&&!loading){pause();undos++;notice='';render();save();}});
 for(const name of ['playing','pause','ended'])audio.addEventListener(name,()=>{if(name==='ended'){wheel=true;notice='Your turn. Try the shot, then choose Next Lesson.';}render()});
 audio.addEventListener('error',()=>{notice='Audio unavailable. Read the narration and try the lesson.';render()});
 for(const name of ['pointerup','change'])document.addEventListener(name,event=>{if(active&&!host.contains(event.target)){clearTimeout(saveTimer);saveTimer=setTimeout(save,120);}},true);
 global.addEventListener('pagehide',save);
 return {start,show,retry,next:()=>go(index+1),pause,exit:()=>finish(true),keep:()=>finish(false),getState:()=>({active,index,stepId:step().id,actions,undos,wheel,hasAudio:hasAudio()}),steps};
}
global.BilliardsGetStartedTour={mount};
})(window);
