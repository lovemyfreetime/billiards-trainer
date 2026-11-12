/* Isolated companion state. No writes to scoring, physics or Trainer settings. */
(function(root){
 'use strict';
 const KEY='billiards.playTogether.v1',VERSION='0.4.1';
 const F=typeof module!=='undefined'&&module.exports?require('./companion-features.js'):root.CompanionFeatures;
 const activities=[
  {id:'position',title:'Give yourself more room',tag:'POSITION & CHOICE',question:'Which route leaves more usable next shots?',description:'Compare a precise route with one that leaves a bigger landing area.',tools:'Shot 2 · Aiming Zones · 2D / 3D',criterion:'Pocket the ball and leave a usable next shot.',steps:[['Predict first','Set up a familiar position shot. Each point to an acceptable landing area before discussing routes.'],['Compare two routes','Open Trainer if helpful. Use Shot 2 and the position ranges to compare the routes. Change one thing at a time.'],['Try it on your table','Take five attempts each. Use a target that suits each player. Count the whole result: made ball and usable next shot.'],['Use it in a rack','Play a short rack without advice during turns. Look for a chance to choose the bigger usable area.']]},
  {id:'advice',title:'Test an idea together',tag:'EXPLANATION & TRUST',question:'Which explanation survives a real test?',description:'Turn different opinions into a small experiment everyone can learn from.',tools:'Annotation · Undo · Speed & spin',criterion:'The ball does what you predicted before the attempt.',steps:[['Say what you expect','Choose one shot you see differently. Each describes the expected result before hearing the other explanations.'],['Make the difference visible','Demonstrate or use Trainer to mark the two predictions. Choose one change in speed, aim or spin.'],['Test both explanations','Alternate attempts. Say the expected result before each one. Mark whether it happened; revise the explanation when it does not.'],['Explain it back','Each explains or demonstrates the useful principle in their own way. Try one slightly different setup.']]},
  {id:'reset',title:'Find your game again',tag:'COMPOSURE & CHANCE',question:'What helps you make the next useful choice?',description:'Practice recovering from an awkward leave or an unfavorable roll.',tools:'Saved layouts · Safety zones · Shot clock (optional)',criterion:'Use the chosen reset, then make a deliberate shot choice.',steps:[['Notice what changes','Recall an awkward leave or bad roll. Describe the next action: rushing, forcing a shot, or abandoning the routine.'],['Choose one reset','Each picks a short reset: step back, breathe, survey the table, then choose. Set up an awkward continuation together.'],['Try the next decision','Alternate attempts at that continuation. Count using the reset and choosing deliberately; pocketing is a separate observation.'],['Return to ordinary play','Play a short rack. After a difficult outcome, use the reset without a reminder. Review the choice using what was knowable before the shot.']]}
 ];
 const features=[
  ['Start & relationship',[
   ['Solo, companions, coaches & groups','ready','1–24 people, solo practice, coaching, one group, two groups or partner sets. Add people to an existing session while keeping earlier contributions.'],
   ['A short practice agreement','ready','Ask before coaching, describe what happened, and test suggestions together.'],
   ['Observe before choosing a goal','ready','Each person contributes a concrete starting observation.'],
   ['Individual gains in a shared session','ready','Each player can take something different from the activity.'],
   ['Partner preferences over time','ready','Remember feedback timing, preferred approach, goals and playing context for each person.'],
   ['Invitation circles & discovery','ready','Exchange private invitation cards for friends, teams and clubs. Review, accept and return an acceptance file. Public discovery requires a connected service.'],
   ['Practical matching','ready','Explain shared times, venues, interests and feedback preferences among accepted private invitations.'],
   ['Multiple-device session copies','ready','Send a session file, contribute on another device, then import notes and results with conflict checks. Copies carry core written notes and results. Private tools and media travel only in a full backup; live synchronization needs a connected service.'],
   ['Community controls','ready','Decline, disconnect and block invitations locally; save and export private reports for an organizer. Central moderation requires a connected service.']]],
  ['Practice & learning',[
   ['Three complete starter activities','ready','Position margin, testing advice, and recovery after an unfavorable outcome.'],
   ['Alternating attempts & undo','ready','Shared success criterion, five attempts per player in each practice group and a correctable attempt record.'],
   ['Relaxed, focused or match preparation','ready','Choose the session intent without a long questionnaire.'],
   ['Individual difficulty & targets','ready','Choose each person’s criterion, support level and learning approach. Results retain the target used for that attempt.'],
   ['Trainer setup and return','ready','Open the selected drill or attached layout, explicitly load it in Trainer, then keep the changed layout and return to the same session. Restore the prior Trainer table afterward.'],
   ['Learning through teaching','ready','Predictions, demonstrations, explaining back and testing a variation.'],
   ['Recall & transfer checks','ready','Save your recall and a different setup before revealing a previous discovery.'],
   ['Structured routines & drill library','ready','Twelve authored drills across cue control, aim, speed, spin, banks, kicks, position, safety, patterns and runouts; three saved routines across sessions.'],
   ['Different ways to understand','ready','Choose seeing, hearing, trying or explaining for each person and for guide excerpts.']]],
  ['Psychology & enjoyment',[
   ['Observation before explanation','ready','Record what happened before deciding why; any companion can revise an idea.'],
   ['Pleasure & willingness to return','ready','Each reports whether the session was worth doing; keep this separate from results.'],
   ['Competition and coaching boundaries','ready','Agree when advice is welcome; return to independent play at the end of an activity.'],
   ['Pressure practice','ready','Everyone agrees to a clock, score deficit or confident-opponent scenario. Pressure off is always available; backgrounding turns pressure off.'],
   ['Recognize influence & recover','ready','Authored reset prompts, agreed pressure scenarios and saved reflections about distraction, rushing and opponent demeanor.'],
   ['Luck & decision quality','ready','Explore broader acceptable outcomes and a useful response to bad rolls; do not grade a decision from one outcome.'],
   ['Bias-aware suggestions','ready','Concrete prompts for prediction, overconfidence, deference, advice boundaries and uneven motivation.'],
   ['Social play & sustainable motivation','ready','Just-play mode removes structured results and pressure while preserving session discoveries.']]],
  ['Voice & assistance',[
   ['Local voice notes','ready','Record and replay short audio notes where microphone access is supported. Reviewed local transcription is available in Guide & voice on compatible devices.'],
   ['Spoken prompts','ready','Optional device text-to-speech; availability depends on the installed browser or shell.'],
   ['Keyboard microphone input','ready','Use the device keyboard microphone in any note field when the keyboard provides it.'],
   ['External TTS capture connection','device','Import spoken audio or capture a chosen tab’s shared audio where supported. Play or locally transcribe it for review.'],
   ['Local transcription & interpretation','device','Capability-checked on-device English speech and optional local language-pack installation; review notes and interpret a bounded set of session commands. Requires compatible browser or Android support.'],
   ['Local billiards knowledge & companion guide','ready','Versioned authored excerpts, read-aloud, learning modes and bounded session actions; works without a remote model.'],
   ['Conversation turn-taking','ready','Select the speaker, review and correct each contribution, keep discoveries and edit a turn without duplicate saves.'],
   ['Hands-free session controls','device','Opt in to local voice commands for starting the selected session, continuing, results, undo, pause and pressure off. Availability depends on local speech support.']]],
  ['Continuity & app foundation',[
   ['Save & resume','ready','Keep multiple sessions, switch between companions or solo practice, and continue completed sessions. Names, notes, results and audio stay with each session.'],
   ['Shared discovery history','ready','Review each takeaway and the next-session choice.'],
   ['Companion backup & restore','ready','Automatic local recovery copies, plus full export and restore of sessions, audio, attachments, preferences and plans.'],
   ['Existing app updates','ready','Use the Trainer update system; activate a completed update by restarting.'],
   ['Separate companion workspace','ready','Own page, files and data; a single entry from Play.'],
   ['Windows, Android and browser layout','ready','Responsive touch-first interface; physical-device acceptance still required.'],
   ['Layouts, snapshots and teaching clips','ready','Attach validated Trainer layouts, images, audio and short video to a session’s discoveries; full backups include attachment bytes.'],
   ['Optional reminders & meeting plans','ready','Save an agreed time and venue; export a calendar invitation with an optional 30-minute reminder.'],
   ['Public discovery & live synchronization','service','Needs a connected directory and synchronization service; private invitation files are available now.'],
   ['Centralized moderation','service','Needs a connected reporting service and organizer workflow; local blocking and report export are available now.'],
   ['Field-trial feedback','ready','Per-person ease, enjoyment, retained learning and willingness to return; local history summary and export.']]]
 ];
 const uid=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
 const fresh=()=>({schema:1,revision:0,people:[],pairs:[],sessions:[],activeId:null});
 const text=(x,n=2000)=>typeof x==='string'&&x.length<=n;
 function validate(x){
  if(!x||x.schema!==1||!Number.isSafeInteger(x.revision)||x.revision<0||!Array.isArray(x.people)||!Array.isArray(x.pairs)||!Array.isArray(x.sessions)||x.sessions.length>3000)throw Error('This is not a compatible Play Together backup.');
  const ids=new Set();for(const p of x.people){if(!p||!text(p.id,100)||!text(p.name,60)||!p.name.trim()||ids.has(p.id))throw Error('Invalid companion record.');ids.add(p.id);}
  const pairIds=new Set();for(const p of x.pairs){if(!p||!text(p.id,100)||pairIds.has(p.id)||!Array.isArray(p.people)||p.people.length<1||p.people.length>24||new Set(p.people).size!==p.people.length||p.people.some(id=>!ids.has(id)))throw Error('Invalid pair record.');pairIds.add(p.id);}
  const sessionIds=new Set();for(const s of x.sessions){
   if(!s||!text(s.id,100)||sessionIds.has(s.id)||!pairIds.has(s.pairId)||!['active','completed'].includes(s.status)||!Number.isInteger(s.stage)||s.stage<0||s.stage>4||!Number.isInteger(s.practiceStep)||s.practiceStep<0||s.practiceStep>3||!['relaxed','focused','match'].includes(s.mood)||![0,15,25,30,45,60].includes(s.minutes)||!text(s.createdAt,50)||!text(s.updatedAt,50)||!text(s.next,2000)||typeof s.agreed!=='boolean'||!activities.some(a=>a.id===s.activity))throw Error('Invalid session record.');
   sessionIds.add(s.id);const size=x.pairs.find(p=>p.id===s.pairId).people.length;const validSeat=i=>Number.isInteger(i)&&i>=0&&i<size;
   if(s.roles!==undefined&&(!Array.isArray(s.roles)||s.roles.length!==size||s.roles.some(r=>!['player','coach'].includes(r))))throw Error('Invalid session roles.');
   if(s.units!==undefined&&(!Array.isArray(s.units)||!s.units.length||s.units.some(u=>!Array.isArray(u)||!u.length||u.some(i=>!validSeat(i)))||s.units.flat().length!==size||new Set(s.units.flat()).size!==size))throw Error('Invalid practice groups.');
   if(units(s).some(u=>!u.length))throw Error('Each practice group needs a player.');
   for(const k of ['baseline','gains','takeaways'])if(!Array.isArray(s[k])||s[k].length!==size||s[k].some(v=>!text(v)))throw Error('Invalid session notes.');
   if(!Array.isArray(s.enjoyment)||s.enjoyment.length!==size||s.enjoyment.some(v=>!['','yes','mixed','change'].includes(v)))throw Error('Invalid reflection.');
   if(!Array.isArray(s.attempts)||s.attempts.length>10000||s.attempts.some(a=>!a||!validSeat(a.seat)||typeof a.worked!=='boolean'||!text(a.at,50)))throw Error('Invalid attempt record.');
   if(!Array.isArray(s.voice)||s.voice.length>500||s.voice.some(v=>!v||!text(v.id,100)||!validSeat(v.seat)||!text(v.createdAt,50)||!Number.isFinite(v.seconds)||v.seconds<0||v.seconds>125))throw Error('Invalid audio record.');
  }
  if(x.activeId!==null&&!x.sessions.some(s=>s.id===x.activeId&&s.status==='active'))throw Error('Invalid active session.');
  F.validate(x);return x;
 }
 function load(storage){const raw=storage.getItem(KEY);return raw?validate(JSON.parse(raw)):fresh();}
 function save(storage,state){validate(state);const raw=storage.getItem(KEY),old=raw?JSON.parse(raw):null;if(old&&old.revision!==state.revision)throw Error('This session changed in another window. Reload before continuing.');const next={...state,revision:state.revision+1};if(raw)storage.setItem(KEY+'.previous',raw);storage.setItem(KEY,JSON.stringify(next));state.revision=next.revision;return state;}
 function start(state,names,{mood='focused',minutes=60,format='together',assignments=[],roles=names.map(()=>'player')}={}){
  names=names.map(n=>String(n).trim());if(names.length<1||names.length>24||names.some(n=>!n||n.length>60)||new Set(names.map(n=>n.toLocaleLowerCase())).size!==names.length)throw Error('Use 1–24 different names or nicknames.');
  if(!Array.isArray(roles)||roles.length!==names.length||roles.some(r=>!['player','coach'].includes(r)))throw Error('Choose a role for each person.');
  if(!['relaxed','focused','match'].includes(mood)||![0,15,25,30,45,60].includes(minutes))throw Error('Choose a valid session setting.');
  if(!['together','partners','groups'].includes(format))throw Error('Choose a practice format.');
  let units=[names.map((_,i)=>i)];
  if(format==='partners'){if(names.length%2)throw Error('Partner sets need an even number of players.');units=names.reduce((a,_,i)=>{if(i%2===0)a.push([i,i+1]);return a;},[]);}
  if(format==='groups'){if(assignments.length!==names.length||assignments.some(i=>![0,1].includes(i))||new Set(assignments).size!==2)throw Error('Put at least one player in each group.');units=[0,1].map(g=>names.map((_,i)=>i).filter(i=>assignments[i]===g));}
  if(units.some(u=>u.every(i=>roles[i]==='coach')))throw Error('Each practice group needs a player.');
  const people=names.map(name=>{let p=state.people.find(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase());if(!p){p={id:uid(),name};state.people.push(p);}return p;});
  let pair=state.pairs.find(p=>p.people.length===people.length&&people.every((person,i)=>p.people[i]===person.id));if(!pair){pair={id:uid(),people:people.map(p=>p.id)};state.pairs.push(pair);}
  const now=new Date().toISOString(),s={id:uid(),pairId:pair.id,status:'active',stage:0,practiceStep:0,mood,minutes,agreed:false,units,roles:roles.slice(),baseline:names.map(()=>''),gains:names.map(()=>''),takeaways:names.map(()=>''),enjoyment:names.map(()=>''),activity:'position',attempts:[],voice:[],next:'',createdAt:now,updatedAt:now};if(state.preferences?.length){const w=F.ensure(s);people.forEach((p,i)=>{const pref=state.preferences.find(v=>v.personId===p.id);if(pref){w.targets[i].mode=pref.mode;s.gains[i]=pref.goal;}});}state.sessions.unshift(s);state.activeId=s.id;return s;
 }
 function resume(state,id){const s=state.sessions.find(s=>s.id===id);if(!s)throw Error('Session not found.');s.status='active';state.activeId=id;return s;}
 function addParticipant(state,id,name,{role='player',unit=0}={}){
  const s=state.sessions.find(s=>s.id===id);if(!s||s.status!=='active')throw Error('Continue the session before adding someone.');
  name=String(name).trim();const current=names(state,s),groups=(s.units||[current.map((_,i)=>i)]).map(u=>u.slice());
  if(!name||name.length>60||current.some(n=>n.toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('Use a different name or nickname.');
  if(current.length>=24)throw Error('A session can have up to 24 people.');
  if(!['player','coach'].includes(role)||!Number.isInteger(unit)||!groups[unit])throw Error('Choose a role and practice group.');
  let p=state.people.find(p=>p.name.toLocaleLowerCase()===name.toLocaleLowerCase());if(!p){p={id:uid(),name};state.people.push(p);}
  // The roster may be shared by older sessions; always create a new record.
  const previous=state.pairs.find(p=>p.id===s.pairId),pair={id:uid(),people:[...previous.people,p.id]};state.pairs.push(pair);s.pairId=pair.id;
  s.roles=[...roles(s),role];groups[unit].push(current.length);s.units=groups;
  for(const key of ['baseline','gains','takeaways','enjoyment'])s[key].push('');
  F.extend(s);delete s.shareBase;s.updatedAt=new Date().toISOString();return s;
 }
 const names=(state,s)=>state.pairs.find(p=>p.id===s.pairId).people.map(id=>state.people.find(p=>p.id===id).name);
 const roles=s=>s.roles||s.baseline.map(()=>'player');
 const units=s=>(s.units||[s.baseline.map((_,i)=>i)]).map(u=>u.filter(i=>roles(s)[i]!=='coach'));
 const counts=s=>s.baseline.map((_,i)=>i).map(seat=>({total:F.practiceAttempts(s).filter(a=>a.seat===seat).length,worked:F.practiceAttempts(s).filter(a=>a.seat===seat&&a.worked).length}));
 const seat=(s,unit=0)=>{const group=units(s)[unit];if(!group)throw Error('Choose a practice group.');return group[Math.floor(F.practiceAttempts(s).filter(a=>group.includes(a.seat)).length/5)%group.length];};
 function attempt(s,worked,unit=0){if(s.work?.social)throw Error('Return to structured practice to record results.');if(s.status!=='active'||s.stage!==3||s.practiceStep!==2)throw Error('Attempts belong to the practice step.');if(typeof worked!=='boolean')throw Error('Choose a result.');const person=seat(s,unit);s.attempts.push({id:uid(),seat:person,worked,at:new Date().toISOString(),...(s.work?{round:s.work.round,drill:s.work.drill,target:{...s.work.targets[person]}}:{})});}
 function finish(state,s){if(s.work)s.work.pressure.enabled=false;if(!s.agreed)throw Error('Agree how to practice together first.');s.status='completed';s.updatedAt=new Date().toISOString();s.stage=4;if(state.activeId===s.id)state.activeId=null;}

 const copy=x=>JSON.parse(JSON.stringify(x));
 function portableSession(s){const result=copy(s);delete result.shareBase;delete result.voice;delete result.media;delete result.work;delete result.trainerLayout;if(s.work){result.work=F.work(result);Object.assign(result.work,{drill:s.work.drill,round:s.work.round,targets:copy(s.work.targets)});}return {...result,voice:[]};}
 function packet(state,id){validate(state);const session=state.sessions.find(s=>s.id===id);if(!session)throw Error('Choose a session.');const group=state.pairs.find(p=>p.id===session.pairId),current=portableSession(session);if(!session.shareBase)session.shareBase=copy(current);return {format:'billiards-companion-session',version:1,group:copy(group),people:copy(state.people.filter(p=>group.people.includes(p.id))),base:copy(session.shareBase||current),session:current};}
 function receive(state,input){
  if(!input||input.format!=='billiards-companion-session'||input.version!==1)throw Error('Choose a companion session copy.');
  const incoming=copy(input),remote=incoming.session,base=incoming.base;
  for(const value of [remote,base]){validate({schema:1,revision:0,people:incoming.people,pairs:[incoming.group],sessions:[value],activeId:null});if(value.voice.length)throw Error('Session copies carry written notes and results only.');}
  if(remote.id!==base.id||remote.pairId!==base.pairId)throw Error('Session copies do not match.');
  if(JSON.stringify(units(remote))!==JSON.stringify(units(base))||JSON.stringify(roles(remote))!==JSON.stringify(roles(base))||remote.activity!==base.activity||remote.work?.round!==base.work?.round)throw Error('Keep the same activity and groups in a shared session copy.');
  const draft=copy(state),local=draft.sessions.find(s=>s.id===remote.id);
  if(!local){
   for(const p of incoming.people){const existing=draft.people.find(x=>x.id===p.id);if(existing&&existing.name!==p.name)throw Error('A player record conflicts with this copy.');if(!existing)draft.people.push(p);}
   const group=draft.pairs.find(g=>g.id===incoming.group.id);if(group&&JSON.stringify(group.people)!==JSON.stringify(incoming.group.people))throw Error('The participant list conflicts with this copy.');if(!group)draft.pairs.push(incoming.group);
   remote.shareBase=portableSession(remote);draft.sessions.unshift(remote);if(remote.status==='active'&&!draft.activeId)draft.activeId=remote.id;
  }else{
   const group=draft.pairs.find(g=>g.id===local.pairId);
   if(JSON.stringify(group.people)!==JSON.stringify(incoming.group.people)||local.activity!==remote.activity||local.work?.round!==remote.work?.round||JSON.stringify(units(local))!==JSON.stringify(units(remote))||JSON.stringify(roles(local))!==JSON.stringify(roles(remote)))throw Error('The activity or groups changed. Keep both copies and use a full backup to transfer a changed roster.');
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
 function duration(minutes){return minutes===0?'Lots of free time':minutes===60?'about 1 hour':'about '+minutes+' min';}
 function duration(minutes){return minutes===0?'Lots of free time':minutes===60?'about 1 hour':'about '+minutes+' min';}
 const api={KEY,VERSION,duration,duration,activities,features,fresh,validate,load,save,start,resume,addParticipant,names,roles,counts,units,seat,attempt,finish,uid,packet,receive};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompanionCore=api;
})(typeof window!=='undefined'?window:globalThis);
