/* Injected by offline wrapper tests before app scripts; never part of the shipped web app. */
(()=>{
 const media=[],ended=[],NativeAudio=window.Audio;
 window.Audio=new Proxy(NativeAudio,{construct(C,args){const a=new C(...args);media.push(a);a.addEventListener('ended',()=>{if(a.dataset.topic)ended.push(a.dataset.topic)});a.addEventListener('playing',()=>{if(a.dataset.getStartedTransition)a.playbackRate=16});return a}});
 const result=window.__lessonSequence={status:'idle',progress:'waiting',guide:0,quickStart:0};
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 function check(value,message){if(!value)throw Error(message)}
 async function until(predicate,message,timeout=20000){const end=performance.now()+timeout;while(performance.now()<end){if(predicate())return;await sleep(25)}throw Error(message)}
 async function playing(id){await until(()=>media.some(a=>a.dataset.topic===id&&!a.paused&&!a.ended&&a.currentTime>0),'Missing narration '+id);return media.find(a=>a.dataset.topic===id&&!a.paused)}
 window.runLessonSequence=async()=>{
  result.status='running';
  try{
   await until(()=>window.billiardsGetStartedTour,'Tour initialization');const guide=billiardsPoolGuide,catalog=billiardsPoolAudioMap;
   const expected=[],counts=[27,49,32,28,5],categories=Object.keys(catalog.curriculum);
   guide.openGuide();
   for(let categoryIndex=0;categoryIndex<categories.length;categoryIndex++){
    const category=categories[categoryIndex],ids=catalog.curriculum[category].flatMap(g=>g.topics);check(ids.length===counts[categoryIndex],'Incomplete '+category);
    if(categoryIndex)guide.openCategory(category);
    const options=[...document.querySelectorAll('#bt-guide-pool-root select option')].map(o=>o.value).filter(Boolean);
    check(JSON.stringify(options)===JSON.stringify(ids),'Display order differs in '+category);
    for(const id of [categoryIndex?'welcome-'+category:'welcome-guide',...ids]){
     result.progress=id;const audio=await playing(id),topic=catalog.topics.find(t=>t.id===id),src=Array.isArray(topic.audio)?topic.audio[0]:topic.audio;
     check(new URL(audio.currentSrc).pathname===new URL(src,location.href).pathname,'Wrong file for '+id);
     check(guide.getState().topicId===id,'Wrong selected topic for '+id);
     const position=ended.length;expected.push(id);audio.currentTime=audio.duration-.08;
     await until(()=>ended.length>position,'No native media end for '+id);result.guide++;
    }
    await until(()=>media.filter(a=>a.dataset.topic).every(a=>a.paused),'Guide did not stop at '+category);
   }
   check(JSON.stringify(ended)===JSON.stringify(expected),'Guide skipped or repeated a recording');
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
 };
})();
