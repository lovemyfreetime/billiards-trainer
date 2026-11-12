/* Authored, offline Companion practice tools. No remote directory or model calls. */
(function(root){
'use strict';
const L=typeof module!=='undefined'&&module.exports?require('./trainer-layout-files.js'):root.BilliardsLayoutFiles;
const VERSION='2026.11.12', clone=x=>JSON.parse(JSON.stringify(x));
const drills=[
 ['stop','Cue control','Stop on contact','drill-stop-shot','Leave the cue ball near the contact point.','Predict the cue-ball finish. Try a comfortable straight shot. Change distance only after a repeatable result.','Move the cue ball one diamond farther away.'],
 ['aim','Aiming','Compare the cut','cut-shot','Pocket the object ball with your chosen aiming reference.','Mark the intended pocket entry. Predict before using the ghost ball. Try the same angle from both sides.','Mirror the cut and predict without a guide.'],
 ['speed','Speed','Three speed windows','drill-speed-ladder','Finish in your agreed landing window.','Choose a generous landing window. Keep aim and spin fixed while changing only speed.','Change the starting distance and keep the same window.'],
 ['spin','Spin','Read a rail response','rail-spin','Predict which side of the center-spin route the cue ball takes.','Compare center, a little left and a little right at similar speed. Record the difference you actually see.','Use another rail and predict before shooting.'],
 ['bank','Banks','One-rail comparison','bank-shot','Reach the agreed pocket or rail window.','Use the mirror line as a starting prediction. Compare speed changes one at a time on your table.','Change the object-ball distance from the rail.'],
 ['kick','Kicks','Find the first contact','drill-mirror-kick','Contact the intended side of the object ball.','Predict the rail contact point. Begin with center spin, then test small changes.','Move the cue ball and predict a fresh route.'],
 ['position','Position','Give the next shot room','position-two-balls','Pocket the ball and leave a usable next shot.','Define an area rather than one point. Compare two routes using Shot 2.','Move the next ball and choose a new landing area.'],
 ['safety','Safeties','Leave two useful balls','defense-starter','Meet your agreed cue-ball and object-ball goals.','Predict where both balls finish. Decide what makes the reply awkward before trying the shot.','Swap roles and explain the reply you would choose.'],
 ['runout','Runouts','Plan three balls','three-ball','Complete your chosen route while keeping usable next shots.','Call the route first. Undo one decision in Trainer, then compare the changed route.','Change the starting cue-ball position.'],
 ['stun','Cue control','Tangent comparison','drill-stun-tangent','Match the predicted cue-ball path.','Compare stun with a little follow and draw. Keep the cut similar and watch the cue ball.','Try a different cut before showing the guide.'],
 ['recovery','Composure','Recover from an awkward leave','drill-two-rail-recovery','Use your reset and choose deliberately.','Step back, survey, then pick a realistic route or safety. Grade the decision separately from the outcome.','Add an agreed distraction, then repeat without it.'],
 ['pattern','Patterns','Build an L pattern','drill-l-pattern','Keep the cue ball on the useful side of the next ball.','Predict each landing area. Compare a narrow route with a forgiving one.','Change ball spacing and explain your route.']
].map(([id,category,title,layout,criterion,instruction,transfer])=>({id,category,title,layout,criterion,instruction,transfer}));
const routines=[
 {id:'foundation',title:'A reliable foundation',drills:['stop','aim','speed','position']},
 {id:'routes',title:'Routes and recovery',drills:['spin','bank','kick','safety']},
 {id:'match',title:'Bring it into a rack',drills:['stun','pattern','recovery','runout']}
];
const knowledge=drills.map(d=>({id:d.id,title:d.category+' · '+d.title,text:d.instruction+' '+d.transfer}));
const prompts=[
 {id:'confidence',title:'Check confidence',text:'Before hearing another opinion, each predict the result and give a confidence level. Compare the prediction with several attempts; revise the idea when evidence disagrees.'},
 {id:'deference',title:'Make room for both views',text:'The quieter person predicts first. The more experienced person asks a question before explaining. Test both ideas using the same shot.'},
 {id:'advice',title:'Ask before helping',text:'Ask whether the player wants a demonstration, a question, or space to try. Agree a time for feedback and stop coaching when that time ends.'},
 {id:'influence',title:'Notice pressure and reset',text:'Name the observable trigger: rushing, distraction, or a confident opponent. Agree a mild scenario. Anyone can stop it. Step back, breathe, survey, then choose; debrief both perspectives.'},
 {id:'motivation',title:'Make this worth returning to',text:'Each choose one enjoyable aim. Reduce the challenge, swap the activity, or just play when the session stops helping. Enjoyment and shot results are separate observations.'}
];
function work(s){return s.work||{drill:'',round:'',targets:s.baseline.map(()=>({criterion:'',level:'supported',mode:'try'})),social:false,guidance:'try',pressure:{enabled:false,type:'clock',seconds:30,deficit:2,consents:s.baseline.map(()=>false)},recalls:[],turns:[],reflection:'',feedback:s.baseline.map(()=>({ease:0,learning:'',return:'',enjoyment:0})),plan:{at:'',venue:'',note:'',reminder:false}};}
function ensure(s){if(!s.work)s.work=work(s);return s.work;}
const str=(v,n=2000)=>typeof v==='string'&&v.length<=n;
const integer=(v,a,b)=>Number.isInteger(v)&&v>=a&&v<=b;
const validDate=s=>str(s,40)&&Number.isFinite(Date.parse(s));
const list=(v,n,p)=>Array.isArray(v)&&v.length<=n&&v.every(p);
const levels=['supported','guided','independent'],modes=['see','hear','try','explain'];
function check(ok,message){if(!ok)throw Error(message);}
function validateCard(p){check(p&&str(p.id,100)&&p.id&&str(p.name,60)&&p.name.trim()&&['availability','venues','interests','goals','circle'].every(k=>str(p[k],300))&&['ask','after-turn','after-rack','none'].includes(p.feedback)&&validDate(p.sharedAt),'Invalid invitation card.');return p;}
function validate(state){
 if(state.preferences!==undefined)check(list(state.preferences,3000,p=>p&&state.people.some(x=>x.id===p.personId)&&['ask','after-turn','after-rack','none'].includes(p.feedback)&&modes.includes(p.mode)&&str(p.goal)&&str(p.context,300)),'Invalid companion preferences.');
 if(state.directory!==undefined){const d=state.directory;check(d&&list(d.contacts,500,p=>{validateCard(p);return ['pending','accepted','declined','disconnected'].includes(p.status);})&&new Set(d.contacts.map(p=>p.id)).size===d.contacts.length&&list(d.blocked,1000,p=>str(p,100))&&list(d.reports,500,p=>p&&str(p.id,100)&&str(p.personId,100)&&str(p.text)&&validDate(p.at)),'Invalid companion circle.');if(d.self)validateCard(d.self);}
 if(state.journey!==undefined&&state.journey!==null){const j=state.journey,r=routines.find(r=>r.id===j.routine);check(r&&integer(j.index,0,r.drills.length)&&list(j.history,1000,h=>h&&drills.some(d=>d.id===h.drill)&&str(h.sessionId,100)&&validDate(h.at)&&str(h.summary,2000)),'Invalid practice routine.');}
 const mediaIds=new Set();
 for(const s of state.sessions){
  if(s.media!==undefined)check(list(s.media,100,m=>{const ok=m&&str(m.id,100)&&!mediaIds.has(m.id)&&str(m.name,100)&&str(m.caption,2000)&&integer(m.seat,0,s.baseline.length-1)&&['image/png','image/jpeg','image/webp','video/mp4','video/webm','audio/mpeg','audio/mp4','audio/ogg','audio/webm'].includes(m.type)&&integer(m.bytes,1,15000000)&&validDate(m.at);if(ok)mediaIds.add(m.id);return ok;}),'Invalid discovery attachment.');
  if(s.trainerLayout!==undefined)L.parse(JSON.stringify(s.trainerLayout));
  if(!s.work)continue;const w=s.work,n=s.baseline.length,p=w.pressure;
  check((w.drill===''||drills.some(d=>d.id===w.drill))&&str(w.round,100)&&typeof w.social==='boolean'&&modes.includes(w.guidance),'Invalid practice tools.');
  check(list(w.targets,n,t=>t&&str(t.criterion,500)&&levels.includes(t.level)&&modes.includes(t.mode))&&w.targets.length===n,'Invalid individual targets.');
  check(p&&typeof p.enabled==='boolean'&&['clock','deficit','opponent'].includes(p.type)&&integer(p.seconds,10,120)&&integer(p.deficit,1,20)&&list(p.consents,n,v=>typeof v==='boolean')&&p.consents.length===n&&(!p.enabled||p.consents.every(Boolean)),'Everyone must agree before pressure starts.');
  check(list(w.recalls,500,r=>r&&str(r.id,100)&&str(r.sourceId,100)&&integer(r.seat,0,n-1)&&str(r.answer)&&str(r.guide)&&str(r.transfer)&&validDate(r.at))&&list(w.turns,500,t=>t&&str(t.id,100)&&integer(t.seat,0,n-1)&&['observation','idea','discovery'].includes(t.kind)&&str(t.text)&&validDate(t.at))&&new Set(w.turns.map(t=>t.id)).size===w.turns.length&&str(w.reflection),'Invalid practice notes.');
  check(list(w.feedback,n,f=>f&&integer(f.ease,0,5)&&integer(f.enjoyment,0,5)&&str(f.learning)&&['','yes','maybe','change'].includes(f.return))&&w.feedback.length===n,'Invalid field feedback.');
  check(w.plan&&(!w.plan.at||validDate(w.plan.at))&&str(w.plan.venue,300)&&str(w.plan.note)&&typeof w.plan.reminder==='boolean','Invalid meeting plan.');
 }
 return state;
}
function extend(s){if(!s.work)return;s.work.targets.push({criterion:'',level:'supported',mode:'try'});s.work.pressure.enabled=false;s.work.pressure.consents=s.baseline.map(()=>false);s.work.feedback.push({ease:0,enjoyment:0,learning:'',return:''});}
function choose(s,id,round){const d=drills.find(d=>d.id===id);check(d,'Choose a drill.');check(s.agreed,'Agree how to practice before choosing a drill.');const w=ensure(s);if(w.drill!==id||!w.round){w.round=round;w.targets=w.targets.map(t=>({...t,criterion:''}));}w.drill=id;w.pressure.enabled=false;w.social=false;s.stage=3;s.practiceStep=2;return d;}
function activity(s){const d=drills.find(d=>d.id===work(s).drill);return d?{id:d.id,title:d.title,question:d.criterion,tools:'Saved layout · Aiming guides · Undo',criterion:d.criterion,steps:[['Predict first',d.criterion],['Compare in Trainer',d.instruction],['Try it at your table',d.instruction],['Transfer it',d.transfer]]}:null;}
function practiceAttempts(s){return s.work?.round?s.attempts.filter(a=>a.round===s.work.round):s.attempts;}
function invitation(card){validateCard(card);return {format:'billiards-companion-invitation',version:1,card:clone(card)};}
function receiveInvitation(directory,input){check(input?.format==='billiards-companion-invitation'&&input.version===1,'Choose a Companion invitation file.');const c=clone(validateCard(input.card));check(!directory.blocked.includes(c.id),'This invitation is blocked on this device.');check(c.id!==directory.self?.id,'This is your own invitation card.');return {...c,status:'pending'};}
const tokens=s=>s.toLocaleLowerCase().split(/[,;\n]/).map(s=>s.trim()).filter(Boolean);
function match(self,contact){if(!self||contact.status!=='accepted')return [];const reasons=[];for(const [k,label]of [['availability','Time'],['venues','Venue'],['interests','Interest']]){const b=tokens(contact[k]),shared=tokens(self[k]).filter(x=>b.includes(x));if(shared.length)reasons.push(label+': '+shared.join(', '));}if(self.feedback===contact.feedback)reasons.push('Same feedback preference');return reasons;}
function interpret(text){const t=text.trim().replace(/[.!?]+$/,'');const m=t.match(/^companion\s*[, :]\s*(.+)$/i)||t.match(/^companion\s+(.+)$/i);if(!m)return {type:'note',text:t};const command=m[1].toLowerCase();const verbs={'made':'made','worked':'made','miss':'miss','try again':'miss','undo':'undo','pause':'pause','continue':'continue','start':'start','pressure off':'pressure-off'};if(verbs[command])return {type:'command',action:verbs[command]};const note=m[1].match(/^(note|discovery)\s+(.+)$/i);if(note)return {type:note[1].toLowerCase(),text:note[2]};return {type:'unknown',text:t};}
function calendar(plan,id,title){check(plan.at&&validDate(plan.at),'Choose a meeting date and time.');const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/[,;]/g,'\\$&');const stamp=d=>new Date(d).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Billiards Trainer//Practice//EN','BEGIN:VEVENT','UID:'+escape(id)+'@billiards-trainer','DTSTAMP:'+stamp(Date.now()),'DTSTART:'+stamp(plan.at),'DTEND:'+stamp(Date.parse(plan.at)+45*60000),'SUMMARY:'+escape(title),'LOCATION:'+escape(plan.venue),'DESCRIPTION:'+escape(plan.note)];if(plan.reminder)lines.push('BEGIN:VALARM','TRIGGER:-PT30M','ACTION:DISPLAY','DESCRIPTION:Practice reminder','END:VALARM');lines.push('END:VEVENT','END:VCALENDAR');return lines.map(line=>{let out='',count=0;for(const c of line){const n=new TextEncoder().encode(c).length;if(count+n>73){out+='\r\n ';count=1;}out+=c;count+=n;}return out;}).join('\r\n')+'\r\n';}
const api={VERSION,drills,routines,knowledge,prompts,work,ensure,validate,extend,choose,activity,practiceAttempts,invitation,receiveInvitation,match,interpret,calendar};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompanionFeatures=api;
})(typeof window!=='undefined'?window:globalThis);
