/* Isolated companion state. No writes to scoring, physics or Trainer settings. */
(function(root){
 'use strict';
 const KEY='billiards.playTogether.v1',VERSION='0.2.0';
 const activities=[
  {id:'position',title:'Give yourself more room',tag:'POSITION & CHOICE',question:'Which route leaves more usable next shots?',description:'Compare a precise route with one that leaves a bigger landing area.',tools:'Shot 2 · Aiming Zones · 2D / 3D',criterion:'Pocket the ball and leave a usable next shot.',steps:[['Predict first','Set up a familiar position shot. Each point to an acceptable landing area before discussing routes.'],['Compare two routes','Open Trainer if helpful. Use Shot 2 and the position ranges to compare the routes. Change one thing at a time.'],['Try it on your table','Take five attempts each. Use a target that suits each player. Count the whole result: made ball and usable next shot.'],['Use it in a rack','Play a short rack without advice during turns. Look for a chance to choose the bigger usable area.']]},
  {id:'advice',title:'Test an idea together',tag:'EXPLANATION & TRUST',question:'Which explanation survives a real test?',description:'Turn different opinions into a small experiment everyone can learn from.',tools:'Annotation · Undo · Speed & spin',criterion:'The ball does what you predicted before the attempt.',steps:[['Say what you expect','Choose one shot you see differently. Each describes the expected result before hearing the other explanations.'],['Make the difference visible','Demonstrate or use Trainer to mark the two predictions. Choose one change in speed, aim or spin.'],['Test both explanations','Alternate attempts. Say the expected result before each one. Mark whether it happened; revise the explanation when it does not.'],['Explain it back','Each explains or demonstrates the useful principle in their own way. Try one slightly different setup.']]},
  {id:'reset',title:'Find your game again',tag:'COMPOSURE & CHANCE',question:'What helps you make the next useful choice?',description:'Practice recovering from an awkward leave or an unfavorable roll.',tools:'Saved layouts · Safety zones · Shot clock (optional)',criterion:'Use the chosen reset, then make a deliberate shot choice.',steps:[['Notice what changes','Recall an awkward leave or bad roll. Describe the next action: rushing, forcing a shot, or abandoning the routine.'],['Choose one reset','Each picks a short reset: step back, breathe, survey the table, then choose. Set up an awkward continuation together.'],['Try the next decision','Alternate attempts at that continuation. Count using the reset and choosing deliberately; pocketing is a separate observation.'],['Return to ordinary play','Play a short rack. After a difficult outcome, use the reset without a reminder. Review the choice using what was knowable before the shot.']]}
 ];
 const features=[
  ['Start & relationship',[
   ['Friends, groups & partner sets','ready','2–24 players, one group, two groups or multiple partner sets; individual observations and discoveries.'],
   ['A short practice agreement','ready','Ask before coaching, describe what happened, and test suggestions together.'],
   ['Observe before choosing a goal','ready','Each person contributes a concrete starting observation.'],
   ['Individual gains in a shared session','ready','Each player can take something different from the activity.'],
   ['Partner preferences over time','later','Feedback timing, contribution preferences, playing context and changing goals.'],
   ['Invitation circles & discovery','later','Friends, teammates, clubs and eventually opt-in partner discovery with mutual invitations.'],
   ['Practical matching','later','Availability, chosen venues, interests and feedback preferences; explain why a match is suggested.'],
   ['Multiple-device session copies','ready','Send a session file, contribute on another device, then import notes and results with conflict checks. Live synchronization and private feedback are planned.'],
   ['Community controls','later','Decline, disconnect, block and report when discovery is introduced.']]],
  ['Practice & learning',[
   ['Three complete starter activities','ready','Position margin, testing advice, and recovery after an unfavorable outcome.'],
   ['Alternating attempts & undo','ready','Shared success criterion, five attempts per player in each practice group and a correctable attempt record.'],
   ['Relaxed, focused or match preparation','ready','Choose the session intent without a long questionnaire.'],
   ['Individual difficulty & targets','next','Different targets in the same activity; progress from demonstrations to independent execution.'],
   ['Trainer setup and return','next','Transfer layouts and relevant overlays, then return directly to the same activity. The current button opens Trainer only.'],
   ['Learning through teaching','ready','Predictions, demonstrations, explaining back and testing a variation.'],
   ['Recall & transfer checks','later','Revisit discoveries in a different setup before showing the guides.'],
   ['Structured routines & drill library','later','Multi-session plans, cue control, aiming, speed, spin, banks, kicks, position, safeties and runouts.'],
   ['Different ways to understand','later','Adapt through seeing, hearing, trying and explaining, without fixed learner labels or IQ scoring.']]],
  ['Psychology & enjoyment',[
   ['Observation before explanation','ready','Record what happened before deciding why; any companion can revise an idea.'],
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
  const pairIds=new Set();for(const p of x.pairs){if(!p||!text(p.id,100)||pairIds.has(p.id)||!Array.isArray(p.people)||p.people.length<2||p.people.length>24||new Set(p.people).size!==p.people.length||p.people.some(id=>!ids.has(id)))throw Error('Invalid pair record.');pairIds.add(p.id);}
  const sessionIds=new Set();for(const s of x.sessions){
   if(!s||!text(s.id,100)||sessionIds.has(s.id)||!pairIds.has(s.pairId)||!['active','completed'].includes(s.status)||!Number.isInteger(s.stage)||s.stage<0||s.stage>4||!Number.isInteger(s.practiceStep)||s.practiceStep<0||s.practiceStep>3||!['relaxed','focused','match'].includes(s.mood)||![15,25,45].includes(s.minutes)||!text(s.createdAt,50)||!text(s.updatedAt,50)||!text(s.next,2000)||typeof s.agreed!=='boolean'||!activities.some(a=>a.id===s.activity))throw Error('Invalid session record.');
   sessionIds.add(s.id);const size=x.pairs.find(p=>p.id===s.pairId).people.length;const validSeat=i=>Number.isInteger(i)&&i>=0&&i<size;
   if(s.units!==undefined&&(!Array.isArray(s.units)||!s.units.length||s.units.some(u=>!Array.isArray(u)||!u.length||u.some(i=>!validSeat(i)))||s.units.flat().length!==size||new Set(s.units.flat()).size!==size))throw Error('Invalid practice groups.');
   for(const k of ['baseline','gains','takeaways'])if(!Array.isArray(s[k])||s[k].length!==size||s[k].some(v=>!text(v)))throw Error('Invalid session notes.');
   if(!Array.isArray(s.enjoyment)||s.enjoyment.length!==size||s.enjoyment.some(v=>!['','yes','mixed','change'].includes(v)))throw Error('Invalid reflection.');
   if(!Array.isArray(s.attempts)||s.attempts.length>10000||s.attempts.some(a=>!a||!validSeat(a.seat)||typeof a.worked!=='boolean'||!text(a.at,50)))throw Error('Invalid attempt record.');
   if(!Array.isArray(s.voice)||s.voice.length>500||s.voice.some(v=>!v||!text(v.id,100)||!validSeat(v.seat)||!text(v.createdAt,50)||!Number.isFinite(v.seconds)||v.seconds<0||v.seconds>125))throw Error('Invalid audio record.');
  }
  if(x.activeId!==null&&!x.sessions.some(s=>s.id===x.activeId&&s.status==='active'))throw Error('Invalid active session.');
  return x;
 }
 function load(storage){const raw=storage.getItem(KEY);return raw?validate(JSON.parse(raw)):fresh();}
 function save(storage,state){validate(state);const raw=storage.getItem(KEY),old=raw?JSON.parse(raw):null;if(old&&old.revision!==state.revision)throw Error('This session changed in another window. Reload before continuing.');const next={...state,revision:state.revision+1};if(raw)storage.setItem(KEY+'.previous',raw);storage.setItem(KEY,JSON.stringify(next));state.revision=next.revision;return state;}
 function start(state,names,{mood='focused',minutes=25,format='together',assignments=[]}={}){
  if(state.activeId)throw Error('Finish or resume the current session first.');
  names=names.map(n=>String(n).trim());if(names.length<2||names.length>24||names.some(n=>!n||n.length>60)||new Set(names.map(n=>n.toLocaleLowerCase())).size!==names.length)throw Error('Use 2–24 different names or nicknames.');
  if(!['relaxed','focused','match'].includes(mood)||![15,25,45].includes(minutes))throw Error('Choose a valid session setting.');
  if(!['together','partners','groups'].includes(format))throw Error('Choose a practice format.');
  let units=[names.map((_,i)=>i)];
  if(format==='partners'){if(names.length%2)throw Error('Partner sets need an even number of players.');units=names.reduce((a,_,i)=>{if(i%2===0)a.push([i,i+1]);return a;},[]);}
  if(format==='groups'){if(assignments.length!==names.length||assignments.some(i=>![0,1].includes(i))||new Set(assignments).size!==2)throw Error('Put at least one player in each group.');units=[0,1].map(g=>names.map((_,i)=>i).filter(i=>assignments[i]===g));}
  const people=names.map(name=>{let p=state.people.find(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase());if(!p){p={id:uid(),name};state.people.push(p);}return p;});
  let pair=state.pairs.find(p=>p.people.length===people.length&&people.every((person,i)=>p.people[i]===person.id));if(!pair){pair={id:uid(),people:people.map(p=>p.id)};state.pairs.push(pair);}
  const now=new Date().toISOString(),s={id:uid(),pairId:pair.id,status:'active',stage:0,practiceStep:0,mood,minutes,agreed:false,units,baseline:names.map(()=>''),gains:names.map(()=>''),takeaways:names.map(()=>''),enjoyment:names.map(()=>''),activity:'position',attempts:[],voice:[],next:'',createdAt:now,updatedAt:now};state.sessions.unshift(s);state.activeId=s.id;return s;
 }
 const names=(state,s)=>state.pairs.find(p=>p.id===s.pairId).people.map(id=>state.people.find(p=>p.id===id).name);
 const units=s=>s.units||[s.baseline.map((_,i)=>i)];
 const counts=s=>s.baseline.map((_,i)=>i).map(seat=>({total:s.attempts.filter(a=>a.seat===seat).length,worked:s.attempts.filter(a=>a.seat===seat&&a.worked).length}));
 const seat=(s,unit=0)=>{const group=units(s)[unit];if(!group)throw Error('Choose a practice group.');return group[Math.floor(s.attempts.filter(a=>group.includes(a.seat)).length/5)%group.length];};
 function attempt(s,worked,unit=0){if(s.status!=='active'||s.stage!==3||s.practiceStep!==2)throw Error('Attempts belong to the practice step.');if(typeof worked!=='boolean')throw Error('Choose a result.');s.attempts.push({id:uid(),seat:seat(s,unit),worked,at:new Date().toISOString()});}
 function finish(state,s){if(!s.agreed)throw Error('Agree how to practice together first.');s.status='completed';s.updatedAt=new Date().toISOString();s.stage=4;if(state.activeId===s.id)state.activeId=null;}

 const copy=x=>JSON.parse(JSON.stringify(x));
 function portableSession(s){const result=copy(s);delete result.shareBase;delete result.voice;return {...result,voice:[]};}
 function packet(state,id){validate(state);const session=state.sessions.find(s=>s.id===id);if(!session)throw Error('Choose a session.');const group=state.pairs.find(p=>p.id===session.pairId),current=portableSession(session);if(!session.shareBase)session.shareBase=copy(current);return {format:'billiards-companion-session',version:1,group:copy(group),people:copy(state.people.filter(p=>group.people.includes(p.id))),base:copy(session.shareBase||current),session:current};}
 function receive(state,input){
  if(!input||input.format!=='billiards-companion-session'||input.version!==1)throw Error('Choose a companion session copy.');
  const incoming=copy(input),remote=incoming.session,base=incoming.base;
  for(const value of [remote,base]){validate({schema:1,revision:0,people:incoming.people,pairs:[incoming.group],sessions:[value],activeId:null});if(value.voice.length)throw Error('Session copies carry written notes and results only.');}
  if(remote.id!==base.id||remote.pairId!==base.pairId)throw Error('Session copies do not match.');
  if(JSON.stringify(units(remote))!==JSON.stringify(units(base))||remote.activity!==base.activity)throw Error('Keep the same activity and groups in a shared session copy.');
  const draft=copy(state),local=draft.sessions.find(s=>s.id===remote.id);
  if(!local){
   for(const p of incoming.people){const existing=draft.people.find(x=>x.id===p.id);if(existing&&existing.name!==p.name)throw Error('A player record conflicts with this copy.');if(!existing)draft.people.push(p);}
   const group=draft.pairs.find(g=>g.id===incoming.group.id);if(group&&JSON.stringify(group.people)!==JSON.stringify(incoming.group.people))throw Error('The participant list conflicts with this copy.');if(!group)draft.pairs.push(incoming.group);
   remote.shareBase=portableSession(remote);draft.sessions.unshift(remote);if(remote.status==='active'&&!draft.activeId)draft.activeId=remote.id;
  }else{
   const group=draft.pairs.find(g=>g.id===local.pairId);
   if(JSON.stringify(group.people)!==JSON.stringify(incoming.group.people)||local.activity!==remote.activity||JSON.stringify(units(local))!==JSON.stringify(units(remote)))throw Error('The activity or groups changed. Start with a fresh session copy.');
   const merge=(old,ours,theirs,label)=>{if(theirs===old||theirs===ours)return ours;if(ours===old)return theirs;throw Error('Both devices changed '+label+'. Keep both copies and agree the wording before importing again.');};
   for(const key of ['baseline','gains','takeaways','enjoyment'])local[key]=local[key].map((v,i)=>merge(base[key][i],v,remote[key][i],incoming.people.find(p=>p.id===group.people[i]).name+'’s '+key));
   local.next=merge(base.next,local.next,remote.next,'the next-session note');
   const key=a=>a.id||JSON.stringify(a),old=new Map(base.attempts.map(a=>[key(a),a])),ours=new Map(local.attempts.map(a=>[key(a),a])),theirs=new Map(remote.attempts.map(a=>[key(a),a]));
   for(const [id,a] of old){if(!theirs.has(id))ours.delete(id);else if(ours.has(id)&&JSON.stringify(a)!==JSON.stringify(theirs.get(id)))throw Error('An existing result was changed in the session copy.');}
   for(const [id,a] of theirs)if(!old.has(id)){if(ours.has(id)&&JSON.stringify(ours.get(id))!==JSON.stringify(a))throw Error('An attempt conflicts with this copy.');ours.set(id,a);}
   local.attempts=[...ours.values()];local.updatedAt=new Date().toISOString();local.shareBase=portableSession(remote);
   // The receiving device keeps its workflow, completion state and local audio.
  }
  validate(draft);return draft;
 }
 const api={KEY,VERSION,activities,features,fresh,validate,load,save,start,names,counts,units,seat,attempt,finish,uid,packet,receive};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompanionCore=api;
})(typeof window!=='undefined'?window:globalThis);
