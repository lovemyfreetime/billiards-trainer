/* Isolated companion state. No writes to scoring, physics or Trainer settings. */
(function(root){
 'use strict';
 const KEY='billiards.playTogether.v1',VERSION='0.1.0';
 const activities=[
  {id:'position',title:'Give yourself more room',tag:'POSITION & CHOICE',question:'Which route leaves more usable next shots?',description:'Compare a precise route with one that leaves a bigger landing area.',tools:'Shot 2 · Aiming Zones · 2D / 3D',criterion:'Pocket the ball and leave a usable next shot.',steps:[['Predict first','Set up a familiar position shot. Each point to an acceptable landing area before discussing routes.'],['Compare two routes','Open Trainer if helpful. Use Shot 2 and the position ranges to compare the routes. Change one thing at a time.'],['Try it on your table','Take five attempts each. Use a target that suits each player. Count the whole result: made ball and usable next shot.'],['Use it in a rack','Play a short rack without advice during turns. Look for a chance to choose the bigger usable area.']]},
  {id:'advice',title:'Test an idea together',tag:'EXPLANATION & TRUST',question:'Which explanation survives a real test?',description:'Turn different opinions into a small experiment you can both learn from.',tools:'Annotation · Undo · Speed & spin',criterion:'The ball does what you predicted before the attempt.',steps:[['Say what you expect','Choose one shot you see differently. Each describes the expected result before hearing the other explanation.'],['Make the difference visible','Demonstrate or use Trainer to mark the two predictions. Choose one change in speed, aim or spin.'],['Test both explanations','Alternate attempts. Say the expected result before each one. Mark whether it happened; revise the explanation when it does not.'],['Explain it back','Each explains or demonstrates the useful principle in their own way. Try one slightly different setup.']]},
  {id:'reset',title:'Find your game again',tag:'COMPOSURE & CHANCE',question:'What helps you make the next useful choice?',description:'Practice recovering from an awkward leave or an unfavorable roll.',tools:'Saved layouts · Safety zones · Shot clock (optional)',criterion:'Use the chosen reset, then make a deliberate shot choice.',steps:[['Notice what changes','Recall an awkward leave or bad roll. Describe the next action: rushing, forcing a shot, or abandoning the routine.'],['Choose one reset','Each picks a short reset: step back, breathe, survey the table, then choose. Set up an awkward continuation together.'],['Try the next decision','Alternate attempts at that continuation. Count using the reset and choosing deliberately; pocketing is a separate observation.'],['Return to ordinary play','Play a short rack. After a difficult outcome, use the reset without a reminder. Review the choice using what was knowable before the shot.']]}
 ];
 const features=[
  ['Start & relationship',[
   ['Known companions on one device','ready','Names, session mood and time; no public profile needed.'],
   ['A short practice agreement','ready','Ask before coaching, describe what happened, and test suggestions together.'],
   ['Observe before choosing a goal','ready','Each person contributes a concrete starting observation.'],
   ['Individual gains in a shared session','ready','Each player can take something different from the activity.'],
   ['Partner preferences over time','later','Feedback timing, contribution preferences, playing context and changing goals.'],
   ['Invitation circles & discovery','later','Friends, teammates, clubs and eventually opt-in partner discovery with mutual invitations.'],
   ['Practical matching','later','Availability, chosen venues, interests and feedback preferences; explain why a match is suggested.'],
   ['Partner-owned devices','later','Independent predictions, genuinely private feedback and chosen sharing.'],
   ['Community controls','later','Decline, disconnect, block and report when discovery is introduced.']]],
  ['Practice & learning',[
   ['Three complete starter activities','ready','Position margin, testing advice, and recovery after an unfavorable outcome.'],
   ['Alternating attempts & undo','ready','Shared success criterion, five attempts per player and a correctable attempt record.'],
   ['Relaxed, focused or match preparation','ready','Choose the session intent without a long questionnaire.'],
   ['Individual difficulty & targets','next','Different targets in the same activity; progress from demonstrations to independent execution.'],
   ['Trainer setup and return','next','Transfer layouts and relevant overlays, then return directly to the same activity. The current button opens Trainer only.'],
   ['Learning through teaching','ready','Predictions, demonstrations, explaining back and testing a variation.'],
   ['Recall & transfer checks','later','Revisit discoveries in a different setup before showing the guides.'],
   ['Structured routines & drill library','later','Multi-session plans, cue control, aiming, speed, spin, banks, kicks, position, safeties and runouts.'],
   ['Different ways to understand','later','Adapt through seeing, hearing, trying and explaining, without fixed learner labels or IQ scoring.']]],
  ['Psychology & enjoyment',[
   ['Observation before explanation','ready','Record what happened before deciding why; either partner can revise an idea.'],
   ['Pleasure & willingness to return','ready','Each reports whether the session was worth doing; keep this separate from results.'],
   ['Competition and coaching boundaries','ready','Agree when advice is welcome; return to independent play at the end of an activity.'],
   ['Pressure practice','next','Agree a score deficit, shot clock or confident-opponent scenario, with an immediate pressure-off control.'],
   ['Recognize influence & recover','later','Practice composure around intimidating demeanor, distraction and rushing; debrief both perspectives.'],
   ['Luck & decision quality','ready','Explore broader acceptable outcomes and a useful response to bad rolls; do not grade a decision from one outcome.'],
   ['Bias-aware suggestions','later','Address overconfidence, deference, unsolicited correction and uneven motivation with small prompts.'],
   ['Social play & sustainable motivation','later','Let people just play, adjust guidance and choose a different companion without guilt or public rankings.']]],
  ['Voice & assistance',[
   ['Local voice notes','ready','Record and replay short audio notes where microphone access is supported. No transcription yet.'],
   ['Spoken prompts','ready','Optional device text-to-speech; availability depends on the installed browser or shell.'],
   ['Keyboard microphone input','ready','Use the device keyboard microphone in any note field when the keyboard provides it.'],
   ['External TTS capture connection','next','Bring spoken answers into the companion workflow, then review the interpreted result.'],
   ['Local transcription & interpretation','next','Turn speech into checked observations, a suggested activity or a saved takeaway.'],
   ['Local billiards knowledge & companion guide','next','Versioned authored knowledge, small relevant excerpts and constrained app actions.'],
   ['Conversation turn-taking','later','Distinguish each companion and assistant output, preserve corrections and avoid duplicate saves.'],
   ['Hands-free session controls','later','Start, pause, record results and keep a discovery with spoken commands.']]],
  ['Continuity & app foundation',[
   ['Save & resume','ready','Names, agreements, observations, attempts and takeaways persist locally.'],
   ['Shared discovery history','ready','Review each takeaway and the next-session choice.'],
   ['Companion backup & restore','ready','Export and restore sessions with their audio notes; existing games are untouched.'],
   ['Existing app updates','ready','Use the Trainer update system; activate a completed update by restarting.'],
   ['Separate companion workspace','ready','Own page, files and data; a single entry from Play.'],
   ['Windows, Android and browser layout','ready','Responsive touch-first interface; physical-device acceptance still required.'],
   ['Layouts, snapshots and teaching clips','later','Attach Trainer setups, annotated images and recorded explanations to discoveries.'],
   ['Optional reminders & meeting plans','later','Agreed next practice, with opt-in reminders and no missed-session penalties.'],
   ['Field-trial feedback','later','Check ease of use, partner experience and later learning across repeated sessions.']]]
 ];
 const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const fresh=()=>({schema:1,revision:0,people:[],pairs:[],sessions:[],activeId:null});
 const text=(x,n=2000)=>typeof x==='string'&&x.length<=n;
 function validate(x){
  if(!x||x.schema!==1||!Number.isSafeInteger(x.revision)||x.revision<0||!Array.isArray(x.people)||!Array.isArray(x.pairs)||!Array.isArray(x.sessions)||x.sessions.length>3000)throw Error('This is not a compatible Play Together backup.');
  const ids=new Set();for(const p of x.people){if(!p||!text(p.id,100)||!text(p.name,60)||!p.name.trim()||ids.has(p.id))throw Error('Invalid companion record.');ids.add(p.id);}
  const pairIds=new Set();for(const p of x.pairs){if(!p||!text(p.id,100)||pairIds.has(p.id)||!Array.isArray(p.people)||p.people.length!==2||p.people[0]===p.people[1]||p.people.some(id=>!ids.has(id)))throw Error('Invalid pair record.');pairIds.add(p.id);}
  const sessionIds=new Set();for(const s of x.sessions){
   if(!s||!text(s.id,100)||sessionIds.has(s.id)||!pairIds.has(s.pairId)||!['active','completed'].includes(s.status)||!Number.isInteger(s.stage)||s.stage<0||s.stage>4||!Number.isInteger(s.practiceStep)||s.practiceStep<0||s.practiceStep>3||!['relaxed','focused','match'].includes(s.mood)||![15,25,45].includes(s.minutes)||!text(s.createdAt,50)||!text(s.updatedAt,50)||!text(s.next,2000)||typeof s.agreed!=='boolean'||!activities.some(a=>a.id===s.activity))throw Error('Invalid session record.');
   sessionIds.add(s.id);
   for(const k of ['baseline','gains','takeaways'])if(!Array.isArray(s[k])||s[k].length!==2||s[k].some(v=>!text(v)))throw Error('Invalid session notes.');
   if(!Array.isArray(s.enjoyment)||s.enjoyment.length!==2||s.enjoyment.some(v=>!['','yes','mixed','change'].includes(v)))throw Error('Invalid reflection.');
   if(!Array.isArray(s.attempts)||s.attempts.length>10000||s.attempts.some(a=>!a||![0,1].includes(a.seat)||typeof a.worked!=='boolean'||!text(a.at,50)))throw Error('Invalid attempt record.');
   if(!Array.isArray(s.voice)||s.voice.length>500||s.voice.some(v=>!v||!text(v.id,100)||![0,1].includes(v.seat)||!text(v.createdAt,50)||!Number.isFinite(v.seconds)||v.seconds<0||v.seconds>125))throw Error('Invalid audio record.');
  }
  if(x.activeId!==null&&!x.sessions.some(s=>s.id===x.activeId&&s.status==='active'))throw Error('Invalid active session.');
  return x;
 }
 function load(storage){const raw=storage.getItem(KEY);return raw?validate(JSON.parse(raw)):fresh();}
 function save(storage,state){validate(state);const raw=storage.getItem(KEY),old=raw?JSON.parse(raw):null;if(old&&old.revision!==state.revision)throw Error('This session changed in another window. Reload before continuing.');const next={...state,revision:state.revision+1};if(raw)storage.setItem(KEY+'.previous',raw);storage.setItem(KEY,JSON.stringify(next));state.revision=next.revision;return state;}
 function start(state,names,{mood='focused',minutes=25}={}){
  if(state.activeId)throw Error('Finish or resume the current session first.');
  names=names.map(n=>String(n).trim());if(names.length!==2||names.some(n=>!n||n.length>60)||names[0].toLocaleLowerCase()===names[1].toLocaleLowerCase())throw Error('Use two different names or nicknames.');
  if(!['relaxed','focused','match'].includes(mood)||![15,25,45].includes(minutes))throw Error('Choose a valid session setting.');
  const people=names.map(name=>{let p=state.people.find(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase());if(!p){p={id:uid(),name};state.people.push(p);}return p;});
  let pair=state.pairs.find(p=>people.every(person=>p.people.includes(person.id)));if(!pair){pair={id:uid(),people:people.map(p=>p.id)};state.pairs.push(pair);}
  const now=new Date().toISOString(),s={id:uid(),pairId:pair.id,status:'active',stage:0,practiceStep:0,mood,minutes,agreed:false,baseline:['',''],gains:['',''],takeaways:['',''],enjoyment:['',''],activity:'position',attempts:[],voice:[],next:'',createdAt:now,updatedAt:now};state.sessions.unshift(s);state.activeId=s.id;return s;
 }
 const names=(state,s)=>state.pairs.find(p=>p.id===s.pairId).people.map(id=>state.people.find(p=>p.id===id).name);
 const counts=s=>[0,1].map(seat=>({total:s.attempts.filter(a=>a.seat===seat).length,worked:s.attempts.filter(a=>a.seat===seat&&a.worked).length}));
 const seat=s=>Math.floor(s.attempts.length/5)%2;
 function attempt(s,worked){if(s.status!=='active'||s.stage!==3||s.practiceStep!==2)throw Error('Attempts belong to the practice step.');if(typeof worked!=='boolean')throw Error('Choose a result.');s.attempts.push({seat:seat(s),worked,at:new Date().toISOString()});}
 function finish(state,s){if(!s.agreed)throw Error('Agree how to practice together first.');s.status='completed';s.updatedAt=new Date().toISOString();s.stage=4;if(state.activeId===s.id)state.activeId=null;}
 const api={KEY,VERSION,activities,features,fresh,validate,load,save,start,names,counts,seat,attempt,finish,uid};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompanionCore=api;
})(typeof window!=='undefined'?window:globalThis);
