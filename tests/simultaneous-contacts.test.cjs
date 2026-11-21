const assert=require('node:assert/strict');
const {resolveStep}=require('../trainer-ball-contacts');
const R=.02625, dt=1/600, e=.96;
const ball=(id,x,y,vx=0,vy=0)=>({id,x,y,vx,vy,z:R,vz:0,wx:0,wy:0,wz:0,
    driftVz:0,driftGravity:0,freeDrift:true,active:true,travel:0});
const near=(a,b,tol=1e-9)=>assert(Math.abs(a-b)<tol,`${a} differs from ${b}`);
function run(balls,mu=0){
    balls.forEach(b=>{b.x+=dt*b.vx;b.y+=dt*b.vy;b.travel=dt*Math.hypot(b.vx,b.vy);});
    const energy=()=>balls.reduce((s,b)=>s+.5*(b.vx**2+b.vy**2)+.2*R**2*(b.wx**2+b.wy**2+b.wz**2),0);
    const totals=()=>['vx','vy'].map(k=>balls.reduce((s,b)=>s+b[k],0));
    const initial=energy(), momentum=totals(),events=[];
    resolveStep(balls,dt,{radius:R,restitution:e,gravity:9.81,friction:()=>mu,airborne:false,
        land(){throw Error('unexpected landing');},before(){},after(cs,t){
            events.push({t,pairs:cs.filter(c=>c.normal>1e-10).map(c=>[c.a.id,c.b.id].sort((a,b)=>a-b))});
        }});
    totals().forEach((v,i)=>near(v,momentum[i]));
    assert(energy()<=initial+1e-10);
    return {events,balls:balls.sort((a,b)=>a.id-b.id)};
}
const orders=[[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]];
function split(offset,order,spin=0){
    const b=[ball(0,-.001,offset,1.5),ball(1,1.6*R,-1.2*R),ball(2,1.6*R,1.2*R)];
    b[0].wz=spin;
    return run(order.map(i=>b[i]),spin?.05:0);
}
for(const order of orders){
    const q=split(0,order);
    assert.equal(q.events.length,1);
    near(q.events[0].t,.001/1.5);
    assert.equal(q.events[0].pairs.length,2);
    const [cue,a,b]=q.balls;
    near(cue.vx,-.15052631578947384);near(cue.vy,0);
    near(a.vx,.8252631578947369);near(b.vx,a.vx);
    near(a.vy,-.6189473684210527);near(b.vy,-a.vy);
    const spun=split(0,order,45),base=split(0,orders[0],45);
    for(let i=0;i<3;i++)for(const k of ['x','y','vx','vy','wz'])near(spun.balls[i][k],base.balls[i][k]);
    for(const sign of [-1,1]){
        const {events}=split(sign*1e-5,order);
        assert(events.length>=2);
        assert(events[0].t<events[1].t);
        assert.deepEqual(events[0].pairs,[[0,sign<0?1:2]]);
    }
}
// Distinct head-on collisions in one tick have independent closed-form times.
const speed=2, gap=.0004;
const relay=run([ball(2,4*R+2*gap,0),ball(0,0,0,speed),ball(1,2*R+gap,0)]);
near(relay.events[0].t,gap/speed);near(relay.events[1].t,gap/speed+gap/(speed*(1+e)/2));
assert.deepEqual(relay.events.map(q=>q.pairs),[[[0,1]],[[1,2]]]);
// A touching row must transmit the initial impulse through stationary neighbours.
const chain=order=>run(order.map(i=>ball(i,i*2*R+(i?0:-.001),0,i?0:2)));
const forward=chain([0,1,2,3,4]),reverse=chain([4,3,2,1,0]);
assert.equal(forward.events[0].pairs.length,4);
for(let i=0;i<5;i++){near(forward.balls[i].vx,reverse.balls[i].vx);if(i)assert(forward.balls[i].vx>0);}
console.log('Passed analytic split velocities, six permutations, friction and spin, ±0.01 mm offsets, two substep event times, frozen row, energy and momentum.');
