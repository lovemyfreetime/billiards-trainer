const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function extract(name){const a=html.indexOf('    function '+name+'('),begin=html.indexOf('{',a);assert(a>=0,name);let depth=0;for(let i=begin;i<html.length;i++){if(html[i]==='{')depth++;if(html[i]==='}'&&--depth===0)return html.slice(a,i+1);}throw Error(name);}
const budget=require('../trainer-shot-budget.js');
const c={Math,Map,Set,shotBudgetFeelCache:null,window:{BilliardsShotBudget:budget}};vm.createContext(c);
vm.runInContext(html.slice(html.indexOf('    const APK ='),html.indexOf('    const ORIGINAL_TABLE_ASSET =')),c);
for(const name of ['defaultState','simulate'])vm.runInContext(extract(name),c);
function solve(frames=false){
 for(let attempt=0;attempt<100;attempt++)try{return c.simulate(frames);}catch(e){const missing=/^(\w+) is not defined$/.exec(e.message);if(!missing)throw e;vm.runInContext(extract(missing[1]),c);}
 throw Error('Physics dependencies did not resolve');
}
function setup(speed,angle,heading=0,follow=0,side=0){
 c.S=c.defaultState();Object.assign(c.S,{tableL:2.54,tableW:1.27,speed,follow,sideSpin:side});
 const origin={x:.55,y:.4},distance=.7,aim=heading+angle*Math.PI/180;
 c.S.balls=[{id:0,n:'CB',...origin,active:true},{id:1,n:'1',x:origin.x+distance*Math.cos(heading),y:origin.y+distance*Math.sin(heading),active:true}];
 c.S.freeAim={x:origin.x+distance*Math.cos(aim),y:origin.y+distance*Math.sin(aim)};
}

for(const [speed,angle,follow,side] of [[1,0,0,0],[2,.15,0,0],[3,1,-.7,.4],[4,-1,.8,-.5]]){
 setup(speed,angle,0,follow,side);const plain=solve();c.S.showShotBudget=true;const tracked=solve();
 assert.deepEqual(tracked.finalBalls,plain.finalBalls,'Tracking never changes physics');
 assert.deepEqual(tracked.paths,plain.paths,'Existing path geometry and styling inputs stay identical');
 assert.deepEqual(tracked.firstBallContact,plain.firstBallContact);
 assert.equal(tracked.budgetPaths[0][0].percent,100);
 assert(tracked.initialEnergy>=.5*speed*speed);
 for(const points of Object.values(tracked.budgetPaths))for(const p of points)assert(Number.isFinite(p.percent)&&p.percent>=0);
 assert(tracked.budgetPaths[0].some(p=>p.kind==='before'));assert(tracked.budgetPaths[1].some(p=>p.kind==='after'));
 // The first transfer uses the same denominator for both balls.
 const ca=tracked.budgetPaths[0].find(p=>p.kind==='after'),oa=tracked.budgetPaths[1].find(p=>p.kind==='after');
 const cb=tracked.budgetPaths[0].find(p=>p.kind==='before');
 assert(ca.percent+oa.percent<=cb.percent+1e-7,'Ball contact cannot create total mechanical energy');
}
vm.runInContext(extract('trainerDemoLayout'),c);c.S=c.defaultState();Object.assign(c.S,c.trainerDemoLayout(c.S.tableL,c.S.tableW,c.S.ballR));c.S.showShotBudget=true;
const pocketed=solve();assert(pocketed.pocketEvents.length);
for(const event of pocketed.pocketEvents){const points=pocketed.budgetPaths[event.id];assert(points);assert.equal(points.at(-1).kind,'pocket');assert(points.at(-1).percent>0,'Energy carried into a pocket is not fabricated as zero');}
// Layout labels beside the original sampled lines: rotated, upright, and clear of one another.
const map=p=>({x:50+p.x*400,y:50+p.y*400});
const occupied=[];const labels=budget.labels(pocketed,map,{width:1200,height:700,occupied});assert(labels.length>2);
for(const label of labels){assert(Math.abs(label.angle)<=Math.PI/2);assert(Math.abs(Math.hypot(label.x-label.linePoint.x,label.y-label.linePoint.y)-label.offset)<1e-9);}
for(let i=0;i<occupied.length;i++)for(let j=i+1;j<occupied.length;j++){const a=occupied[i],b=occupied[j];assert(a.right<=b.left||b.right<=a.left||a.bottom<=b.top||b.bottom<=a.top);}
const reverse={paths:{0:[{x:2,y:.4,t:0},{x:.2,y:.5,t:1}]},budgetPaths:{0:[{x:2,y:.4,t:0,kind:'start',percent:100},{x:.2,y:.5,t:1,kind:'end',percent:0}]}};
assert(budget.labels(reverse,map,{width:1200,height:700}).every(p=>Math.abs(p.angle)<=Math.PI/2));
const ball={vx:2,vy:0,vz:0,wx:0,wy:0,wz:100,z:.03};assert(budget.energy(ball,.03)>2,'Stored spin is included');
assert(html.indexOf('id="shotBudget"')<html.indexOf('id="jumpMasseFeatures"'));assert(html.indexOf('id="jumpMasseFeatures"')<html.indexOf('id="tipArea"'));
assert(html.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));assert(!html.includes('3D JUMP / MASSÉ FEATURES'));
console.log('Shot budget: motion + spin, shared energy baseline, unchanged simulation/paths, collision records, pocket residual, upright offset labels, collision avoidance and equal button placement pass.');

assert(labels.some(p=>p.type==='loss'&&p.color==='#ff7777'&&p.loss>0));
assert(labels.some(p=>p.type==='feel'&&p.color==='#69e5ff'));
assert(labels.some(p=>p.type==='feel'&&p.endpoint&&p.id===0&&!p.text.includes('total')));
assert(labels.some(p=>p.type==='diamond-loss'&&p.diamondLoss>0));
for(const item of labels.filter(p=>p.type==='loss'))assert(Math.abs(item.loss-item.parts.reduce((sum,[before,after])=>sum+before-after,0))<1e-7);
const firstCue=pocketed.budgetPaths[0][0];
assert(Math.abs(firstCue.feel-pocketed.strokeFeel)<1e-9);
assert(Math.abs(pocketed.strokeFeel-c.rollingPowerReferenceDistance(c.S.speed)/(c.S.tableL/8))<1e-9,'Uses the actual existing lag calibration');
for(const sample of pocketed.budgetPaths[0])assert(Math.abs(sample.feel-pocketed.strokeFeel*sample.percent/100)<1e-9,'Diamond budget shares the percent denominator');
for(const item of labels.filter(p=>p.type==='loss'))assert(Math.abs(item.diamondLoss-pocketed.strokeFeel*item.loss/100)<1e-9);
const ledger=budget.create({id:0,x:0,y:0,vx:2,vy:0},.03,9.81,{diamonds:8});
ledger.record({id:0,x:1,y:0,vx:Math.sqrt(3),vy:0},'before',1);
ledger.record({id:0,x:1,y:0,vx:1,vy:0},'after',1);
ledger.record({id:0,x:2,y:0,vx:0,vy:0},'end',2);
assert.deepEqual(ledger.paths[0].map(p=>Math.round(p.feel)),[8,6,2,0]);
const ledgerLabels=budget.labels({paths:{0:[{x:0,y:0,t:0},{x:1,y:0,t:1},{x:2,y:0,t:2}]},budgetPaths:ledger.paths,strokeFeel:8},p=>({x:100+p.x*400,y:250}),{width:1100,height:500});
assert(ledgerLabels.some(p=>p.type==='feel'&&p.endpoint&&p.text==='0D'));
assert(ledgerLabels.some(p=>p.type==='diamond-loss'&&p.text==='−4D'));
for(const item of labels.filter(p=>p.type==='energy')){
 const paired=labels.find(p=>p.type==='feel'&&p.id===item.id&&p.linePoint.x===item.linePoint.x&&p.linePoint.y===item.linePoint.y);
 if(paired)assert.equal(paired.side,-item.side,'Diamond feel stays on the opposite side of the same path');
}
console.log('Contact-loss deltas, red labels, opposite cyan feel, additive diamond deductions and zero stopped endpoint pass.');

// Long multi-cushion shot: later legs must retain regular paired readings.
c.S=c.defaultState();Object.assign(c.S,{tableL:2.54,tableW:1.27,speed:6,follow:0,sideSpin:0,showShotBudget:true});
c.S.balls=[{id:0,n:'CB',x:.2,y:1.12,active:true}];c.S.freeAim={x:2.45,y:.85};
const longShot=solve();
const longLabels=budget.labels(longShot,p=>({x:40+p.x*530,y:40+p.y*530}),{width:1456,height:800});
const contacts=longShot.budgetPaths[0].filter(p=>p.kind==='after');
assert(contacts.length>=3,'Regression shot reaches at least three cushions');
for(let i=1;i<contacts.length;i++){
 const a=contacts[i-1],b=contacts[i],leg=longShot.paths[0].filter(p=>p.t>=a.t&&p.t<=b.t);
 const legLength=leg.slice(1).reduce((sum,p,j)=>sum+Math.hypot(p.x-leg[j].x,p.y-leg[j].y),0);
 if(legLength*530<300)continue;
 const onLeg=p=>{
  const x=(p.linePoint.x-40)/530,y=(p.linePoint.y-40)/530;
  // The simulated leg can curve as cushion spin wears off. Match the actual
  // polyline instead of treating the two cushion contacts as a straight line.
  return leg.slice(1).some((q,j)=>{
   const r=leg[j],dx=q.x-r.x,dy=q.y-r.y,d2=dx*dx+dy*dy;
   const f=d2?Math.max(0,Math.min(1,((x-r.x)*dx+(y-r.y)*dy)/d2)):0;
   const t=r.t+(q.t-r.t)*f;
   return t>a.t+.1*(b.t-a.t)&&t<b.t-.1*(b.t-a.t)&&Math.hypot(x-r.x-f*dx,y-r.y-f*dy)<1e-6;
  });
 };
 const energies=longLabels.filter(p=>p.type==='energy'&&onLeg(p));
 assert(energies.length>=2,'Each long leg after the second cushion has intermediate percentages');
 for(const p of energies)assert(longLabels.some(d=>d.type==='feel'&&d.linePoint.x===p.linePoint.x&&d.linePoint.y===p.linePoint.y)||p.text.includes('D'),'Every intermediate percent retains diamonds');
}
assert(longLabels.filter(p=>p.type==='energy').length>14,'Long shots are not truncated at fourteen readings');
console.log('Long multi-cushion shot: intermediate percentages and diamonds continue beyond the second cushion.');

// Contact summaries use exact pre/post collision states, including spin.
for(const angle of [0,2.5]){
 setup(2.4,angle);c.S.showShotBudget=true;const shot=solve(),event=shot.budgetContacts[0];
 assert(event,'Ball collision has an exchange record');
 assert(Math.abs(event.incoming-event.after.reduce((sum,p)=>sum+p.percent,0)-event.loss)<1e-9);
 const given=event.before[0].percent-event.after[0].percent,received=event.after[1].percent-event.before[1].percent;
 assert(Math.abs(given-received-event.loss)<1e-9,'Cue-ball reduction equals transfer plus collision loss');
 assert(event.overlap>0&&event.overlap<=100);
 if(angle===0)assert(event.overlap>99.9,'Head-on overlap is full');else assert(event.overlap<60,'Thin cut uses measured overlap');
 const boxes=[],cards=budget.contactLabels(shot,map,{width:1200,height:700,occupied:boxes});
 assert(cards.length);assert.equal(cards[0].rows.length,1);
 for(const r of cards[0].rows.slice(1))assert(r.text.includes('%')&&r.text.includes('D'),'Every exchange amount includes both units');
 assert(cards[0].rows[0].text.startsWith('B1 · '));
 assert(Math.abs(budget.exchange(event).received-received)<1e-9);
 assert(boxes.every(b=>b.left>=0&&b.right<=1200&&b.top>=0&&b.bottom<=700));
}
// A moving target's incoming energy must also be counted; array order is immaterial.
const exchange=budget.create({id:0,n:'CB',x:0,y:0,vx:2,vy:0},.03,9.81,{diamonds:8});
const ca={id:0,n:'CB',x:0,y:0,vx:2,vy:0},ob={id:2,n:'2',x:.06,y:0,vx:-1,vy:0};
const finish=exchange.contact(ob,ca,1);ob.vx=1.8;ca.vx=-.8;finish(ob,ca);
assert.equal(exchange.contacts[0].incoming,125);
const card=budget.contactLabels({budgetContacts:exchange.contacts,strokeFeel:8},map,{width:1200,height:700})[0];
assert(card.rows[0].text.startsWith('B2 · '));assert.equal(budget.exchange(exchange.contacts[0]).donor,1);
console.log('Contact exchange: full/thin overlap, conserved split, cue reduction, moving target, both units and bounded callouts pass.');

assert.equal(budget.format(.024),'<0.1');assert.equal(budget.format(0),'0');
const items=budget.journey(longShot);assert(items.some(p=>p.kind==='cushion'));assert(items.some(p=>p.kind==='travel'));
const ledgerLoss=items.filter(p=>['travel','cushion'].includes(p.kind)).reduce((sum,p)=>sum+p.loss,0);
assert(Math.abs(ledgerLoss-(100-longShot.budgetPaths[0].at(-1).percent))<1e-7,'Entire multi-rail journey accounts for all energy deductions');
const space={occupied:[{left:170,right:230,top:170,bottom:230}],segments:[[{x:0,y:200},{x:500,y:200}],[{x:200,y:0},{x:200,y:500}]],width:500,height:500};
const badge=budget.placeBadge([{text:'48% overlap'}],{x:200,y:200},space);assert(badge);
assert(space.segments.every(([a,b])=>!budget.segmentIntersects(badge.box,a,b)),'Overlap badge clears crossing lines');
assert(badge.box.right<170||badge.box.left>230||badge.box.bottom<170||badge.box.top>230,'Overlap clears ghost and object bounds');
console.log('Compact transfer badges, tiny nonzero values, complete journey and line/ball collision avoidance pass.');
