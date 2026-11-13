/* Isolated companion state. No writes to scoring, physics or Trainer settings. */
(function(root){
 'use strict';
 const KEY='billiards.playTogether.v1',VERSION='0.4.4';
 const F=typeof module!=='undefined'&&module.exports?require('./companion-features.js'):root.CompanionFeatures;
 const activities=[
  {id:'position',title:'Give yourself more room',tag:'POSITION & CHOICE',question:'Which route leaves more usable next shots?',description:'Compare a precise route with one that leaves a bigger landing area.',tools:'Shot 2 · Aiming Zones · 2D / 3D',criterion:'Pocket the ball and leave a usable next shot.',steps:[['Predict first','Set up a familiar position shot. Each point to an acceptable landing area before discussing routes.'],['Compare two routes','Open Trainer if helpful. Use Shot 2 and the position ranges to compare the routes. Change one thing at a time.'],['Try it on your table','Take five attempts each. Use a target that suits each player. Count the whole result: made ball and usable next shot.'],['Use it in a rack','Play a short rack without advice during turns. Look for a chance to choose the bigger usable area.']]},
  {id:'advice',title:'Test an idea together',tag:'EXPLANATION & TRUST',question:'Which explanation survives a real test?',description:'Turn different opinions into a small experiment everyone can learn from.',tools:'Annotation · Undo · Speed & spin',criterion:'The ball does what you predicted before the attempt.',steps:[['Say what you expect','Choose one shot you see differently. Each describes the expected result before hearing the other explanations.'],['Make the difference visible','Demonstrate or use Trainer to mark the two predictions. Choose one change in speed, aim or spin.'],['Test both explanations','Alternate attempts. Say the expected result before each one. Mark whether it happened; revise the explanation when it does not.'],['Explain it back','Each explains or demonstrates the useful principle in their own way. Try one slightly different setup.']]},
  {id:'reset',title:'Find your game again',tag:'COMPOSURE & CHANCE',question:'What helps you make the next useful choice?',description:'Practice recovering from an awkward leave or an unfavorable roll.',tools:'Saved layouts · Safety zones · Shot clock (optional)',criterion:'Use the chosen reset, then make a deliberate shot choice.',steps:[['Notice what changes','Recall an awkward leave or bad roll. Describe the next action: rushing, forcing a shot, or abandoning the routine.'],['Choose one reset','Each picks a short reset: step back, breathe, survey the table, then choose. Set up an awkward continuation together.'],['Try the next decision','Alternate attempts at that continuation. Count using the reset and choosing deliberately; pocketing is a separate observation.'],['Return to ordinary play','Play a short rack. After a difficult outcome, use the reset without a reminder. Review the choice using what was knowable before the shot.']]}
 ];
 const features=[
  [
    "Make it your time",
    [
      [
        "Your kind of session",
        "ready",
        "Bring a friend, a coach or the whole team—or enjoy some practice on your own. Make room for up to 24 people.",
        "new"
      ],
      [
        "Start on the same page",
        "ready",
        "Agree how to help each other, when advice is welcome and what makes practice feel good.",
        "session/meet"
      ],
      [
        "Find your starting point",
        "ready",
        "Notice what already feels good and what you want to explore. One honest observation is a great start.",
        "session/notice"
      ],
      [
        "Something useful for everyone",
        "ready",
        "Choose a shared activity while keeping your own reason to practice. Different goals are welcome.",
        "session/choose"
      ],
      [
        "Remember what works for you",
        "ready",
        "Keep your goals and preferred way to receive advice, ready for the next time you play.",
        "companions/preferences"
      ],
      [
        "Invite your people",
        "ready",
        "Share a private invitation with friends, teammates or your club, then exchange a reply.",
        "companions/invitations"
      ],
      [
        "Find a good practice fit",
        "ready",
        "See the times, places and interests you share with people whose invitations you have accepted.",
        "companions/matches"
      ],
      [
        "Bring your own device",
        "ready",
        "Share a session file, add your notes and results, then bring everyone’s contributions together.",
        "devices"
      ],
      [
        "Choose your company",
        "ready",
        "Manage invitations, disconnect or block a contact, and keep a private note for your organizer if needed.",
        "companions/matches"
      ]
    ],
    "A good session starts with people who feel comfortable learning together."
  ],
  [
    "Build your game",
    [
      [
        "Try a fresh idea",
        "ready",
        "Explore better position, test a piece of advice or find your game again after an awkward roll.",
        "session/choose"
      ],
      [
        "Take turns and see what changes",
        "ready",
        "Try five attempts each, notice the result and undo a score whenever you need to correct it.",
        "session/attempts"
      ],
      [
        "Set the mood",
        "ready",
        "Keep it relaxed, focus on one skill or get ready for a match. Choose the pace that suits today.",
        "new"
      ],
      [
        "Make the challenge yours",
        "ready",
        "Give each player a useful target and just enough help to make progress together.",
        "workshop/targets"
      ],
      [
        "See it in Trainer",
        "ready",
        "Explore your setup in Trainer, compare paths and bring the layout back to your session.",
        "workshop/trainer"
      ],
      [
        "Learn by sharing what you know",
        "ready",
        "Show an idea, explain it in your own words and try a variation. Teaching can sharpen your game too.",
        "session/teaching"
      ],
      [
        "See what stayed with you",
        "ready",
        "Recall a discovery before looking it up, then try it in a different setup.",
        "workshop/recall"
      ],
      [
        "Find a drill or build a routine",
        "ready",
        "Explore cue control, aim, speed, spin, banks, kicks, position and more. Pick up your routine next time.",
        "library"
      ],
      [
        "Explore it your way",
        "ready",
        "Watch, listen, try it or talk it through. Find the approach that helps the idea click.",
        "guide/knowledge"
      ]
    ],
    "Small experiments can lead to a better feel for the whole table."
  ],
  [
    "Find your rhythm",
    [
      [
        "Stay curious together",
        "ready",
        "Share what you noticed before deciding why it happened. Leave room for a new explanation.",
        "session/notice"
      ],
      [
        "Keep the good feeling",
        "ready",
        "Notice what made the session worth doing, as well as what improved. Let that shape your next visit.",
        "session/keep"
      ],
      [
        "Make advice feel welcome",
        "ready",
        "Agree when to help and when to let each other play. A little space can build confidence.",
        "session/meet"
      ],
      [
        "Get comfortable with pressure",
        "ready",
        "Try an agreed shot clock, a score deficit or a confident opponent. You can switch pressure off at any time.",
        "workshop/pressure"
      ],
      [
        "Find your calm again",
        "ready",
        "Explore what helps when distraction, rushing or an opponent’s confidence pulls you away from your game.",
        "workshop/pressure"
      ],
      [
        "Make room for the unexpected",
        "ready",
        "Look beyond one lucky or unlucky roll. Compare your choices and find more ways a shot can work out.",
        "session/choose"
      ],
      [
        "Keep an open mind",
        "ready",
        "Make a prediction, compare ideas and give everyone a voice. You may both discover something new.",
        "workshop/social"
      ],
      [
        "Just enjoy a game",
        "ready",
        "Set the structure aside for a while. Keep your discoveries and enjoy being at the table together.",
        "workshop/social"
      ]
    ],
    "Enjoy the process, handle the pressure and give yourself room to grow."
  ],
  [
    "Talk it through",
    [
      [
        "Keep a voice note",
        "ready",
        "Capture what happened or what helped, in your own words. Replay it whenever you revisit the session.",
        "session/voice"
      ],
      [
        "Listen along",
        "ready",
        "Use Listen throughout Companion Play for spoken guidance, with pause, resume and stop beside it.",
        "home"
      ],
      [
        "Speak instead of typing",
        "ready",
        "Use your keyboard’s microphone in a note field, if your device offers it.",
        "guide/conversation"
      ],
      [
        "Bring in a spoken explanation",
        "device",
        "Load an audio file or share a browser tab’s audio, where supported, then review the words you want to keep.",
        "guide/audio"
      ],
      [
        "Turn words into useful notes",
        "device",
        "On supported devices, transcribe speech locally and check it before saving an observation or discovery.",
        "guide/conversation"
      ],
      [
        "Find an idea to try",
        "ready",
        "Explore short billiards explanations, listen to an idea and test it together at the table.",
        "guide/knowledge"
      ],
      [
        "Give every voice a place",
        "ready",
        "Choose whose contribution you are keeping. Correct the words and revisit each person’s ideas later.",
        "guide/conversation"
      ],
      [
        "Use your voice at the table",
        "device",
        "On supported devices, call a result, undo it or pause practice with a spoken Companion command.",
        "guide/commands"
      ]
    ],
    "Keep your attention on the table, with a little help from your voice."
  ],
  [
    "Keep growing together",
    [
      [
        "Pick up where you left off",
        "ready",
        "Return to your own practice or a session with friends. Your notes, results and recordings stay together.",
        "sessions"
      ],
      [
        "Revisit your discoveries",
        "ready",
        "Find the little ideas that made a difference, along with the people and moments that helped.",
        "discoveries"
      ],
      [
        "Keep a backup",
        "ready",
        "Restore a recent automatic copy, or export your sessions and recordings for safekeeping elsewhere.",
        "settings/backup"
      ],
      [
        "Keep your app up to date",
        "ready",
        "Check for an update and restart when it is ready. Your saved sessions stay with you.",
        "settings/updates"
      ],
      [
        "Your place to practice together",
        "ready",
        "Return to Together for a fresh start or continue the session already in progress.",
        "home"
      ],
      [
        "Practice on the device you have",
        "ready",
        "Use touch or a mouse to make Companion Play part of your time at the table.",
        "devices"
      ],
      [
        "Keep the shot, not just the memory",
        "ready",
        "Attach a Trainer setup, snapshot or short teaching clip so a useful discovery is easy to revisit.",
        "workshop/media"
      ],
      [
        "Make time to meet again",
        "ready",
        "Choose your next time and place, then add an invitation and optional reminder to your calendar.",
        "plans"
      ],
      [
        "Notice what is helping",
        "ready",
        "Look back on what felt easy, what you enjoyed and what stayed useful. Shape the next session around it.",
        "workshop/reflection"
      ],
      [
        "Public discovery & live synchronization",
        "service",
        "Requires a connected service.",
        ""
      ],
      [
        "Centralized moderation",
        "service",
        "Requires a connected service.",
        ""
      ]
    ],
    "Bring your discoveries, plans and favorite moments into the next session."
  ]
];
 function toolRoute(path){
  if(!features.some(g=>g[1].some(row=>['ready','device'].includes(row[1])&&row[3]===path)))return null;
  const [view,section='']=path.split('/');
  const stages={meet:[0],notice:[1],choose:[2],attempts:[3,2],teaching:[3,3],keep:[4]};
  return {view,section,requiresSession:['session','workshop','guide','plans'].includes(view),stage:view==='session'?stages[section]?.[0]:undefined,practiceStep:view==='session'?stages[section]?.[1]:undefined};
 }

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
 const api={KEY,VERSION,duration,duration,activities,features,toolRoute,fresh,validate,load,save,start,resume,addParticipant,names,roles,counts,units,seat,attempt,finish,uid,packet,receive};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompanionCore=api;
})(typeof window!=='undefined'?window:globalThis);
