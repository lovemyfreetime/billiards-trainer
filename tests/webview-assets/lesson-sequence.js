/* Injected by offline wrapper tests before app scripts; never part of the shipped web app. */
(()=>{
 const media=[],ended=[],NativeAudio=window.Audio;
 window.Audio=new Proxy(NativeAudio,{construct(C,args){const a=new C(...args);media.push(a);a.addEventListener('ended',()=>{if(a.dataset.topic)ended.push(a.dataset.topic)});a.addEventListener('playing',()=>{if(a.dataset.getStartedTransition)a.playbackRate=16});return a}});
 const result=window.__lessonSequence={status:'idle',progress:'waiting',phase:'idle',guide:0,quickStart:0,categories:{},elapsedMs:0,totalElapsedMs:0};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 function check(value,message){if(!value)throw Error(message)}
 async function until(predicate,message,timeout=20000){const end=performance.now()+timeout;while(performance.now()<end){if(predicate())return;await sleep(25)}throw Error(message)}
 async function playing(id){await until(()=>media.some(a=>a.dataset.topic===id&&!a.paused&&!a.ended&&a.currentTime>0),'Missing narration '+id);return media.find(a=>a.dataset.topic===id&&!a.paused)}
 window.runLessonSequence=async({category=null,quickStartOnly=false}={})=>{
  if(result.status==='running')throw Error('A lesson sequence check is already running');
  result.status='running';result.phase=category?'guide/'+category:quickStartOnly?'quick-start':'all';
  delete result.error;ended.length=0;result.elapsedMs=0;const started=performance.now();
  try{
   await until(()=>window.billiardsGetStartedTour,'Tour initialization');const guide=billiardsPoolGuide,catalog=billiardsPoolAudioMap;
   check(document.querySelector('.btg-lesson-prompt'),'Shared practice prompt is absent');
   check(billiardsGetStartedTour.transition.seconds===5,'Wrong transition duration');
   check(!billiardsGetStartedTour.transition.audio,'Spoken transition must stay disabled');
   const expected=[],counts=[27,49,32,28,9],categories=Object.keys(catalog.curriculum);
   check(!category||categories.includes(category),'Unknown Guide category '+category);
   check(!(category&&quickStartOnly),'Choose a Guide category or Quick Start');
   if(!quickStartOnly&&(!category||category===categories[0])){result.guide=0;result.categories={};}
   const selectedCategories=quickStartOnly?[]:category?[category]:categories;
   for(const selectedCategory of selectedCategories){
    const categoryIndex=categories.indexOf(selectedCategory),ids=catalog.curriculum[selectedCategory].flatMap(g=>g.topics);
    result.phase='guide/'+selectedCategory;check(ids.length===counts[categoryIndex],'Incomplete '+selectedCategory);
    if(categoryIndex)guide.openCategory(selectedCategory);else guide.openGuide();
    const resources=selectedCategory==='more';
    if(!resources)check(document.querySelector('#bt-guide-pool-root [data-action="A"]').textContent==='Auto On','Old Auto toolbar');
    else document.querySelector('#bt-guide-pool-root [data-action="Replay introduction"]').click();
    const options=resources?[...document.querySelectorAll('.btg-resource-card')].map(o=>o.dataset.resourceId):[...document.querySelectorAll('#bt-guide-pool-root select option')].map(o=>o.value).filter(Boolean);
    check(JSON.stringify(options)===JSON.stringify(ids),'Display order differs in '+selectedCategory);
    for(const id of [categoryIndex?'welcome-'+selectedCategory:'welcome-guide',...ids]){
     if(resources&&id!=='welcome-more')document.querySelector('[data-action="resource-listen-'+id+'"]').click();
     result.progress=id;const audio=await playing(id),topic=catalog.topics.find(t=>t.id===id),src=Array.isArray(topic.audio)?topic.audio[0]:topic.audio;
     check(new URL(audio.currentSrc).pathname===new URL(src,location.href).pathname,'Wrong file for '+id);
     check(guide.getState().topicId===id,'Wrong selected topic for '+id);
     if(!resources){check(topic.scene,'Missing practice layout for '+id);
     const live=billiardsTourBridge.capture().state,layout=topic.scene.file.layout;
     check(live.lastLayoutName===layout.name,'Wrong practice layout for '+id);
     check(live.balls.length===layout.balls.length,'Wrong practice ball count for '+id);
     for(const ball of layout.balls){const b=live.balls.find(b=>b.id===ball.id);check(b&&Math.abs(b.x/live.tableL-ball.x/layout.tableL)<1e-7&&Math.abs(b.y/live.tableW-ball.y/layout.tableW)<1e-7,'Wrong practice ball for '+id);}
     }
     const position=ended.length;expected.push(id);audio.currentTime=audio.duration-.08;
     await until(()=>ended.length>position,'No native media end for '+id);result.guide++;
     if(resources){check(guide.getState().topicId===id,'Resource preview advanced automatically');check(billiardsLessonPractice.getState().phase==='idle','Resource preview triggered practice countdown');}
     if(billiardsLessonPractice.getState().phase==='countdown'){check(!document.querySelector('.btg-lesson-prompt').hidden,'Missing visual practice prompt');guide.nextLesson();}
    }
    await until(()=>media.filter(a=>a.dataset.topic).every(a=>a.paused),'Guide did not stop at '+selectedCategory);
    result.categories[selectedCategory]=ids.length+1;
   }
   check(JSON.stringify(ended)===JSON.stringify(expected),'Guide skipped or repeated a recording');
   if(category){result.status='passed';result.progress=category+' complete';return;}
   result.phase='quick-start';result.quickStart=0;
   ended.length=0;billiardsGetStartedTour.start();const steps=billiardsGetStartedTour.steps;
   for(let i=0;i<steps.length;i++){
    const step=steps[i];result.progress=step.topicId;const audio=await playing(step.topicId);
    check(billiardsGetStartedTour.getState().index===i,'Wrong practice index');
    check(billiardsTourBridge.capture().state.lastLayoutName==='Get Started — '+step.title,'Wrong practice layout');
    check(new URL(audio.currentSrc).pathname===new URL(step.audio,location.href).pathname,'Wrong Quick Start file');
    audio.playbackRate=16;result.quickStart++;
   }
   await until(()=>!guide.getState().enabled,'Final completion did not close Quick Start',30000);
   check(JSON.stringify(ended)===JSON.stringify(steps.map(s=>s.topicId)),'Quick Start skipped or repeated a recording');
   result.status='passed';result.progress='complete';
  }catch(error){result.status='failed';result.error=String(error.stack||error)}
  finally{result.elapsedMs=Math.round(performance.now()-started);result.totalElapsedMs+=result.elapsedMs;}
 };
})();
