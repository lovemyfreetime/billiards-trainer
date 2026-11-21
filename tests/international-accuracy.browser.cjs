const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

(async () => {
  const port = 8897;
  const server = spawn(process.execPath, ['tests/range-server.cjs', String(port)]);
  let browser;
  try {
    await new Promise(resolve => server.stdout.once('data', resolve));
    browser = await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH, args:['--no-sandbox']});
    const page = await browser.newPage({serviceWorkers:'block'});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const url = 'http://127.0.0.1:' + port + '/?train=1';
    const html = fs.readFileSync(process.env.AUDIT_HTML || 'index.html','utf8');
    const anchor = '    function drawInternationalTable(map) {';
    assert.equal(html.split(anchor).length, 2);
    // Exercise the production solver, construction plan and canvas painter directly.
    const launchAnchor='        let searchClosest = null;';
    assert.equal(html.split(launchAnchor).length,2);
    const instrumented=html.replace(launchAnchor,`        if(window.measuredLaunch)Object.assign(cb,window.measuredLaunch);\n`+launchAnchor);
    await page.route(url, route => route.fulfill({contentType:'text/html', body:instrumented.replace(anchor,
      '    window.auditEngine = { state:()=>S, run:(frames=false)=>simulate(frames,null,true), draw:drawInternationalTable, geometry:pocketModel, ctx };\n'+anchor)}));
    await page.goto(url);
    await page.waitForFunction(() => window.billiardsMenuReady && window.auditEngine);
    const result = await page.evaluate(() => {
      const api = window.auditEngine;
      const select = document.getElementById('fullRackSelect');
      select.value = 'snooker15';
      document.getElementById('startFullRack').click();
      const s = api.state(), diameter = 2*s.ballR, cy = .75;
      let cx = 1;
      Object.assign(s,{speed:6,sideSpin:0,follow:0,airbornePhysics:false,cueElevationDeg:0,clothNap:0});
      const ball = (id,x,y) => ({id,x,y,n:String(id),active:true});
      const shots = [];
      // Move the impact point through a full 1/600 s step. The impact parameter
      // is constant, so every initial phase has the same first-pass hit/miss.
      for (cx of [1,1.85]) {
        s.freeAim = {x:cx+1,y:cy};
        for (const offsetMm of [-.025,.025]) {
          for (let phase=0;phase<12;phase++) {
            s.balls = [ball(0,cx,cy),ball(1,cx+.23+.01*phase/12,cy+diameter+offsetMm/1000)];
            const q=api.run(), hit=q.firstBallContact;
            shots.push({cx,offsetMm,phase,elevation:q.cueImpact.elevation,firstPass:!!hit && hit.t<.10});
          }
        }
      }
      cx=1; s.freeAim={x:cx+1,y:cy};
      // Changing the storage order leaves all physical coordinates untouched.
      const split = [ball(0,cx,cy),ball(1,cx+.3,cy-diameter*.6),ball(2,cx+.3,cy+diameter*.6)];
      s.speed=1.5;
      const splitIds=[];
      const splitRuns = [split,[split[0],split[2],split[1]]].map(balls => {
        s.balls=balls;
        const q=api.run();
        splitIds.push(q.firstBallContact.objIds);
        return q.finalBalls.sort((a,b)=>a.id-b.id).map(({id,x,y})=>({id,x,y}));
      });
      const splitDeltaMm = Math.max(...splitRuns[0].map((b,i)=>1000*Math.hypot(b.x-splitRuns[1][i].x,b.y-splitRuns[1][i].y)));
      const G=api.geometry(), plan=BilliardsTableConstruction.plan({L:G.L,W:G.W,R:G.R,G});
      const ctx=api.ctx, collected=[], old={}, map=p=>({x:p.x*100+300,y:p.y*100+200});
      let path=[];
      for(const name of ['beginPath','moveTo','lineTo','fill']){
        old[name]=ctx[name];
        ctx[name]=function(...args){
          if(name==='beginPath')path=[];
          if(name==='lineTo'||name==='moveTo')path.push(args);
          if(name==='fill')collected.push(path.slice());
          return old[name].apply(this,args);
        };
      }
      try { api.draw(map); } finally { for(const name in old)ctx[name]=old[name]; }
      const matchedContours=plan.pockets.filter(p=>collected.some(candidate=>
        candidate.length===p.dropPath.length && p.dropPath.every(([x,,z],i)=>{
          const q=map({x:x+G.L/2,y:z+G.W/2});
          return Math.hypot(q.x-candidate[i][0],q.y-candidate[i][1])<1e-7;
        })
      )).length;
      const geometryAt = model => BilliardsCueClearance.geometry({L:G.L,W:G.W,R:G.R,G:model});
      const carom=geometryAt({...G,type:'carom',pocketless:true,nose:.037});
      const snooker=geometryAt(G);
      const clearance={caromRails:carom.plan.rails.length,caromPockets:carom.plan.pockets.length,
        snookerCushions:snooker.objects.filter(o=>o.material==='cushion').length};
      // Measured pure sidespin deceleration on snooker cloth is 22 rad/s².
      s.balls=[ball(0,1,.75)];s.freeAim={x:2,y:.75};
      const spinDown=[-44,44].map(wz=>{
        window.measuredLaunch={vx:0,vy:0,vz:0,wx:0,wy:0,wz};
        const q=api.run(true),middle=q.frames.find(f=>f[0].t>=1)[0];
        return {start:wz,atOne:middle.wz,middleTime:middle.t,stop:q.endTime};
      });
      // This 17 mm side-pocket entry used to fall at 600 Hz and reject at 4800 Hz.
      // Mirroring it probes both jaws. A central entry at the same speed drops.
      const entries=[-.017,0,.017].map(offset=>{
        s.balls=[ball(0,s.tableL/2+offset,.115)];
        s.freeAim={x:s.tableL/2+offset,y:-.5};
        window.measuredLaunch={vx:0,vy:-2,vz:0,wx:2/s.ballR,wy:0,wz:0};
        const q=api.run();
        return {offset,pot:q.pocketEvents.find(e=>e.t<.6)?.pocket||null,jaw:q.jawEvents[0]};
      });
      delete window.measuredLaunch;
      select.value='carom3'; document.getElementById('startFullRack').click();
      const L=s.tableL,W=s.tableW,R=s.ballR,x=.61,y=.53,dx=.7,dy=-1;
      function route(mirror){
        const startY=mirror?W-y:y, delta=mirror?-dy:dy;
        Object.assign(s,{balls:[ball(0,x,startY)],speed:4,follow:.8,sideSpin:0,
          cueElevationDeg:0,airbornePhysics:false,freeAim:{x:x+dx,y:startY+delta}});
        return api.run().railEvents.slice(0,3);
      }
      const routes=[route(false),route(true)];
      // billclub's carom film, launch at 20.40 s. Assume regulation dimensions
      // and natural roll. Spin is fitted on second-rail location, not its time.
      // Recorded second rail: 1.942 s. The old standard profile took 2.965 s.
      const vx=-1.0388317474, vy=.3636707740, start=ball(0,.6996368006,.5262673311);
      Object.assign(s,{balls:[start],speed:Math.hypot(vx,vy),freeAim:{x:start.x+vx,y:start.y+vy}});
      const recordedRoute=[['standard',1.4375],['fast',1.46875]].map(([cloth,spin])=>{
        s.muRoll=cloth==='fast'?BilliardsInternational.tables.carom.fastMuRoll:BilliardsInternational.tables.carom.muRoll;
        window.measuredLaunch={vx,vy,vz:0,wx:-vy/R,wy:vx/R,wz:spin*s.speed/R};
        const q=api.run();
        return {cloth,events:q.railEvents.slice(0,2)};
      });
      delete window.measuredLaunch;
      const firstContactErrorMm=Math.abs(routes[0][0].x-(x+dx*(R-y)/dy))*1000;
      return {recordedRoute,spinDown,entries,shots,splitDeltaMm,splitRuns,splitIds,matchedContours,clearance,routes,firstContactErrorMm};
    });
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify(result));
    if (!process.env.AUDIT_OBSERVE) {
      for(const {cloth,events} of result.recordedRoute){
        assert.deepEqual(events.map(e=>e.rail),['left rail','bottom rail']);
        assert(Math.abs(events[1].x-.775)<.012,cloth+' second-cushion position');
        assert(Math.abs(events[1].t-1.942)<(cloth==='fast'?.1:.2),cloth+' second-cushion timing');
      }
      for(const sample of result.spinDown){
        assert(Math.abs(sample.atOne-(sample.start-Math.sign(sample.start)*22*sample.middleTime))<1e-6);
        assert(Math.abs(sample.stop-2)<=.004);
      }
      assert.deepEqual(result.entries.map(e=>e.pot),[null,'TM',null]);
      for(const e of [result.entries[0],result.entries[2]]){
        assert(e.jaw.t>.05 && e.jaw.t<.053);
        assert(Math.abs(Math.hypot(e.jaw.nx,e.jaw.ny)-1)<1e-9);
      }
      for(const shot of result.shots)assert.equal(shot.firstPass,shot.offsetMm<0,JSON.stringify(shot));
      assert(result.splitDeltaMm<1e-6);
      for(const targets of result.splitIds)assert.deepEqual(targets,[1,2]);
      assert(Math.abs(result.splitRuns[0][0].y-.75)<1e-10);
      assert(result.firstContactErrorMm<1e-6);
      const [one,two]=result.routes, W=one[0].y+two[0].y;
      assert.equal(one.length,3);assert.equal(two.length,3);
      assert.deepEqual(one.map(c=>c.rail),['top rail','bottom rail','right rail']);
      assert.deepEqual(two.map(c=>c.rail),['bottom rail','top rail','right rail']);
      for(let i=0;i<3;i++){
        assert(Math.abs(one[i].x-two[i].x)<1e-8);
        assert(Math.abs(one[i].y+two[i].y-W)<1e-8);
        assert(Math.abs(one[i].t-two[i].t)<1e-8);
      }
      assert.equal(result.matchedContours,6);
      assert.deepEqual(result.clearance,{caromRails:4,caromPockets:0,snookerCushions:18});
      assert(result.shots.some(s=>s.elevation===0) && result.shots.some(s=>s.elevation>0));
    }
  } finally { await browser?.close(); server.kill(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
