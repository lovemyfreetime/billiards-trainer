(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsTournament=api;})(typeof window==='object'?window:globalThis,function(){
'use strict';
const VERSION=1,MAX_ENTRIES=256,MAX_TABLES=64,clone=x=>JSON.parse(JSON.stringify(x));
function integer(x,min,max,label){const n=Number(x);if(!Number.isInteger(n)||n<min||n>max)throw Error(`${label} must be ${min}–${max}.`);return n;}
function seedOrder(n){let a=[1,2];while(a.length<n){const size=a.length*2;a=a.flatMap(v=>[v,size+1-v]);}return a;}
function randomize(a,random=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function create(config,random=Math.random){
 const names=config.entries||[];integer(names.length,2,MAX_ENTRIES,'Entries');
 const doubles=config.entryType==='doubles',entries=names.map((e,i)=>{const members=(typeof e==='string'?[e]:e.members||[]).map(n=>String(n).trim());if(members.length!==(doubles?2:1)||members.some(n=>!n||n.length>80))throw Error(doubles?'Each pair needs two names (up to 80 characters each).':'Each entry needs a name (up to 80 characters).');return {id:`p${i+1}`,members,name:members.join(' / '),seed:i+1};});
 if(doubles){const members=entries.flatMap(e=>e.members.map(n=>n.toLowerCase()));if(new Set(members).size!==members.length)throw Error('Each person can appear in only one pair. Add initials to distinguish people with the same name.');}
 if(new Set(entries.map(e=>e.name.toLowerCase())).size!==entries.length)throw Error('Entry names must be distinct. Add an initial when names match.');
 if(!['single','double','groups','chip'].includes(config.format))throw Error('Choose a tournament format.');
 const tables=integer(config.tables,1,MAX_TABLES,'Tables'),race=integer(config.race,1,99,'Race'),lowerRace=integer(config.lowerRace||race,1,99,'One-loss race');
 const s={version:VERSION,id:config.id||`tn-${Date.now()}-${Math.floor(random()*1e9)}`,name:String(config.name||'Tournament Night').trim().slice(0,100),entryType:doubles?'doubles':'singles',format:config.format,draw:config.draw==='seeded'?'seeded':'random',tables,race,lowerRace,finalRace:integer(config.finalRace||race,1,99,'Final race'),resetFinal:config.resetFinal!==false,entries,matches:[],phase:'running',champion:null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),revision:0,activity:[]};
 s.order=s.draw==='seeded'?entries.map(e=>e.id):randomize(entries.map(e=>e.id),random);
 if(s.format==='chip'){
  s.startChips=integer(config.chips||3,1,10,'Chips');s.chips=Object.fromEntries(entries.map(e=>[e.id,s.startChips]));s.queue=[...s.order];fillChip(s);
 }else if(s.format==='groups'){
  s.groupSize=integer(config.groupSize||4,3,8,'Group size');const count=Math.ceil(entries.length/s.groupSize);if(entries.length<count*2)throw Error('Groups need at least two entries each.');
  s.qualifiers=integer(config.qualifiers||2,1,Math.min(4,Math.floor(entries.length/count)),'Qualifiers per group');s.groups=Array.from({length:count},()=>[]);
  s.order.forEach((id,i)=>s.groups[i%count].push(id));s.groups.forEach((group,g)=>{for(let i=0;i<group.length;i++)for(let j=i+1;j<group.length;j++)add(s,`G${g+1}-${i+1}-${j+1}`,`Group ${g+1}`,1,{entry:group[i]},{entry:group[j]},race,{group:g});});
 }else buildElimination(s,s.order,s.format==='double');
 settle(s);s.activity.push({at:s.createdAt,text:`Created ${s.name}: ${entries.length} ${doubles?'pairs':'players'}, ${tables} tables, ${s.format}.`});return s;
}
function add(s,id,section,round,a,b,race,extra={}){const m={id,section,round,a,b,race,status:'waiting',players:[null,null],scores:null,winner:null,loser:null,table:null,...extra};s.matches.push(m);return {match:id,outcome:'winner'};}
function buildElimination(s,ids,double,prefix=''){
 let size=2;while(size<ids.length)size*=2;const slots=seedOrder(size).map(seed=>ids[seed-1]?{entry:ids[seed-1]}:null);let previous=slots,upper=[];
 for(let r=1;previous.length>1;r++) {const next=[];const round=[];for(let i=0;i<previous.length;i+=2){const id=`${prefix}W${r}-${i/2+1}`;next.push(add(s,id,prefix?'Playoffs':'Winners',r,previous[i],previous[i+1],previous.length===2&&!double?s.finalRace:s.race));round.push(id);}upper.push(round);previous=next;}
 s.finalMatch=previous[0].match;if(!double)return;
 let lower=upper[0].map(id=>({match:id,outcome:'loser'}));
 for(let r=1;r<upper.length;r++){
  let minor=[];for(let i=0;i<lower.length;i+=2)minor.push(add(s,`L${2*r-1}-${i/2+1}`,'One-loss',2*r-1,lower[i],lower[i+1],s.lowerRace));
  lower=minor.map((source,i)=>add(s,`L${2*r}-${i+1}`,'One-loss',2*r,source,{match:upper[r][upper[r].length-1-i],outcome:'loser'},s.lowerRace));
 }
 const gf=add(s,'F1','Final',1,previous[0],lower[0],s.finalRace);s.finalMatch='F1';
 if(s.resetFinal){add(s,'F2','Final reset',2,{match:'F1',outcome:'winner'},{match:'F1',outcome:'loser'},s.finalRace,{conditional:true});s.finalMatch='F2';}
}
function source(s,ref){if(!ref)return {done:true,id:null};if(ref.entry)return {done:true,id:ref.entry};const m=s.matches.find(m=>m.id===ref.match);return {done:!!m&&['done','bye','skipped'].includes(m.status),id:m?m[ref.outcome]:null};}
function standings(s,g){const ids=s.groups[g],rows=ids.map(id=>({id,wins:0,played:0,for:0,against:0,drawOrder:s.order.indexOf(id)}));for(const m of s.matches.filter(m=>m.group===g&&m.status==='done')){for(let i=0;i<2;i++){const row=rows.find(r=>r.id===m.players[i]);row.played++;row.wins+=m.winner===row.id?1:0;row.for+=m.scores[i];row.against+=m.scores[1-i];}}return rows.sort((a,b)=>b.wins-a.wins||(b.for-b.against)-(a.for-a.against)||b.for-a.for||a.drawOrder-b.drawOrder);}
function settle(s){
 if(s.format==='chip'){if(Object.values(s.chips).filter(n=>n>0).length===1){s.champion=s.entries.find(e=>s.chips[e.id]>0).id;s.phase='complete';}return;}
 for(const m of s.matches){if(['done','playing'].includes(m.status))continue;
  if(m.conditional){const f=s.matches.find(x=>x.id==='F1');if(f.status!=='done')continue;if(f.winner===f.players[0]){m.status='skipped';m.winner=f.winner;m.loser=f.loser;continue;}}
  const a=source(s,m.a),b=source(s,m.b);m.players=[a.id,b.id];if(!a.done||!b.done){m.status='waiting';continue;}
  if(!a.id||!b.id){m.status='bye';m.winner=a.id||b.id;m.loser=null;}else m.status='ready';
 }
 // A group stage only advances after explicit director approval of the standings.
 if(s.format==='groups'&&!s.playoffs){s.phase=s.matches.every(m=>m.status==='done')?'group-review':'running';return;}
 const f=s.matches.find(m=>m.id===s.finalMatch);if(f&&['done','bye','skipped'].includes(f.status)){s.phase='complete';s.champion=f.winner;}
}
function fillChip(s,preferredWinner=null,preferredTable=null){
 if(preferredWinner)s.queue.unshift(preferredWinner);
 let active=s.matches.filter(m=>['ready','playing'].includes(m.status)).length;
 while(active<s.tables&&s.queue.length>=2){const a=s.queue.shift(),b=s.queue.shift(),id=`C${s.matches.length+1}`;add(s,id,'Chip',s.matches.length+1,{entry:a},{entry:b},s.race,{status:'ready',players:[a,b],preferredTable:preferredWinner===a?preferredTable:null});active++;}
}
function reduce(state,event){
 const s=clone(state);let message='';const m=event.id?s.matches.find(x=>x.id===event.id):null;
 if(event.type==='assign'){
  if(!m||m.status!=='ready')throw Error('This match is not ready.');const table=integer(event.table,1,s.tables,'Table');if(s.matches.some(x=>x.status==='playing'&&(x.table===table||x.players.some(p=>m.players.includes(p)))))throw Error('That table or player is already in a match.');m.status='playing';m.table=table;m.startedAt=new Date().toISOString();message=`Called ${label(s,m.players[0])} v ${label(s,m.players[1])} to table ${table}.`;
 }else if(event.type==='unassign'){
  if(!m||m.status!=='playing')throw Error('Choose a match currently on a table.');m.status='ready';message=`Released table ${m.table} for ${m.id}.`;m.table=null;delete m.startedAt;
 }else if(event.type==='result'){
  if(!m||!['ready','playing'].includes(m.status))throw Error('This match cannot accept a result.');if(m.status==='ready'&&s.matches.some(x=>x.status==='playing'&&x.players.some(p=>m.players.includes(p))))throw Error('An entry is currently playing another match. Release or finish that match first.');const scores=event.scores?.map(v=>integer(v,0,m.race,'Score'));if(!scores||scores.length!==2||scores[0]===scores[1]||Math.max(...scores)!==m.race)throw Error(`One player must reach ${m.race}; the other must score less.`);
  m.scores=scores;m.winner=m.players[scores[0]>scores[1]?0:1];m.loser=m.players[scores[0]>scores[1]?1:0];m.status='done';m.finishedAt=new Date().toISOString();message=`${m.id}: ${label(s,m.winner)} won ${Math.max(...scores)}–${Math.min(...scores)}${m.table?' on table '+m.table:''}.`;
  if(s.format==='chip'){s.chips[m.loser]--;if(s.chips[m.loser]>0)s.queue.push(m.loser);if(Object.values(s.chips).filter(n=>n>0).length>1)fillChip(s,m.winner,m.table);}
  settle(s);
 }else if(event.type==='advance-groups'){
  if(s.phase!=='group-review')throw Error('Finish every group match first.');const qualifiers=s.groups.map((_,g)=>standings(s,g).slice(0,s.qualifiers).map(r=>r.id));const ids=[];for(let place=0;place<s.qualifiers;place++)for(let g=0;g<qualifiers.length;g++)ids.push(qualifiers[g][place]);s.playoffs=true;buildElimination(s,ids,false,'P');s.phase='running';settle(s);message='Approved group standings and created the playoff draw.';
 }else throw Error('Unknown tournament action.');
 s.revision++;s.updatedAt=new Date().toISOString();s.activity.push({at:s.updatedAt,text:message});return s;
}
function label(s,id){return s.entries.find(e=>e.id===id)?.name||'Awaiting opponent';}
function ready(s){return s.matches.filter(m=>m.status==='ready').sort((a,b)=>a.round-b.round||s.matches.indexOf(a)-s.matches.indexOf(b));}
function validate(s){
 if(!s||s.version!==VERSION||!Array.isArray(s.entries)||!Array.isArray(s.matches)||!Array.isArray(s.activity))throw Error('This is not a Tournament Night backup.');
 integer(s.entries.length,2,MAX_ENTRIES,'Entries');integer(s.tables,1,MAX_TABLES,'Tables');if(!['single','double','groups','chip'].includes(s.format))throw Error('Invalid format.');
 const ids=new Set(s.entries.map(e=>e.id));if(ids.size!==s.entries.length||s.entries.some(e=>typeof e.id!=='string'||typeof e.name!=='string'||!Array.isArray(e.members)))throw Error('Invalid entries.');
 if(s.matches.length>10000)throw Error('Backup has too many matches.');const mids=new Set(s.matches.map(m=>m.id));if(mids.size!==s.matches.length)throw Error('Duplicate match identifiers.');
 if(!Array.isArray(s.order)||s.order.length!==s.entries.length||new Set(s.order).size!==s.entries.length||s.order.some(id=>!ids.has(id)))throw Error('Invalid draw order.');
 const playing=new Set(),players=new Set();for(const m of s.matches){integer(m.race,1,99,'Race');if(!['waiting','ready','playing','done','bye','skipped'].includes(m.status)||!Array.isArray(m.players)||m.players.length!==2||m.players.some(p=>p!==null&&!ids.has(p)))throw Error('Invalid match.');if(['ready','playing','done'].includes(m.status)&&(!m.players[0]||!m.players[1]||m.players[0]===m.players[1]))throw Error('A playable match needs two distinct entries.');for(const ref of [m.a,m.b])if(ref&&!(ref.entry?ids.has(ref.entry):mids.has(ref.match)&&['winner','loser'].includes(ref.outcome)))throw Error('Invalid bracket connection.');if(m.status==='playing'){integer(m.table,1,s.tables,'Table');if(playing.has(m.table)||m.players.some(p=>players.has(p)))throw Error('Conflicting table assignments in backup.');playing.add(m.table);m.players.forEach(p=>players.add(p));}if(m.status==='done'&&(!ids.has(m.winner)||!ids.has(m.loser)||m.winner===m.loser||!Array.isArray(m.scores)||m.scores.length!==2||m.scores.some(n=>!Number.isInteger(n)||n<0||n>m.race)||Math.max(...m.scores)!==m.race||m.scores[0]===m.scores[1]||m.winner!==m.players[m.scores[0]>m.scores[1]?0:1]||m.loser!==m.players[m.scores[0]>m.scores[1]?1:0]))throw Error('Invalid completed result.');}
 if(s.format==='groups'&&(!Array.isArray(s.groups)||s.groups.flat().length!==s.entries.length||new Set(s.groups.flat()).size!==s.entries.length||s.groups.flat().some(id=>!ids.has(id))))throw Error('Invalid groups.');
 if(s.format==='chip'&&(!s.chips||!Array.isArray(s.queue)||s.entries.some(e=>!Number.isInteger(s.chips[e.id])||s.chips[e.id]<0)||s.queue.some(id=>!ids.has(id))||new Set(s.queue).size!==s.queue.length))throw Error('Invalid chip queue.');
 if(typeof s.id!=='string'||typeof s.name!=='string'||typeof s.updatedAt!=='string'||!['running','group-review','complete'].includes(s.phase)||s.champion&&!ids.has(s.champion))throw Error('Invalid event details.');return clone(s);
}
return {VERSION,MAX_ENTRIES,MAX_TABLES,create,reduce,ready,label,standings,validate,seedOrder};
});
