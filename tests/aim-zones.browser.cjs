const assert = require('node:assert/strict');
const cp = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

const fixtures = {
    side: [{x:1.12,y:.91}, {x:1.12,y:.48}, 0, 2.2],
    jaw: [{x:1.12,y:.91}, {x:1.12,y:.48}, .0135, 2.2],
    corner: [{x:1.2,y:.8}, {x:.6,y:.4}, 0, 2.2, -.5],
    nearSide: [{x:1.12,y:.7}, {x:1.12,y:.16}, 0, 2.68, .76, .65],
    draw: [{x:1.1,y:.25}, {x:.48,y:.42}, -.07781200271668354, 3.8, -.55],
    safety: [{x:.55,y:.4}, {x:1.15,y:.4}, .015, 1.2],
    cushionSafety: [{x:.55,y:.55}, {x:1.05,y:.55}, .065, 3.6, -.2]
};
fixtures.collision = [...fixtures.draw, 0, [{id:2,n:'2',x:.3236041582080856,y:.7303992344746408,active:true}]];

async function load(page, fixture, safety = false) {
    await page.evaluate(({fixture,safety}) => {
        const [cue,object,delta,speed,follow=0,sideSpin=0,extras=[]] = fixture;
        const snap = billiardsTourBridge.capture(), s = snap.state;
        const angle = object ? Math.atan2(object.y-cue.y,object.x-cue.x)+delta : delta;
        const balls = [{id:0,n:'CB',...cue,active:true}];
        if(object)balls.push({id:1,n:'1',...object,active:true});
        Object.assign(s,{tableL:2.24,tableW:1.12,speed,follow,sideSpin,cueElevationDeg:3,airbornePhysics:false,
            showPaths:true,showImpact:true,shot2Enabled:false,activeShot:1,aimZones:{rail:true,rest:true,path:true,safety},
            balls:[...balls,...extras],
            freeAim:{x:cue.x+Math.cos(angle),y:cue.y+Math.sin(angle)}});
        billiardsTourBridge.restore(snap);
    },{fixture,safety});
    await page.waitForFunction(() => BilliardsAimZones.diagnostics()?.pending === false);
    const data = await page.evaluate(() => {
        const v=BilliardsAimZones.view(), r=v.zones;
        const summarize=p=>p&&{contact:p.firstBallContact?.objId,signed:p.firstBallContact?.signedOffset,pots:p.pocketEvents,rails:p.railEvents,
            rests:p.restIds,collisions:p.collisionEvents,jaws:p.jawEvents,paths:Object.keys(p.paths)};
        const length=points=>points.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y):sum,0);
        return {current:summarize(v.current),left:summarize(r?.left?.shot),right:summarize(r?.right?.shot),
            ids:v.ids,entries:[r?.left?.offset,r?.right?.offset],branches:r?.bands.length,
            referenceAngles:[r?.left?.angle,r?.right?.angle],
            landingEdges:r?.restEdges?.map(({angle,shot})=>({angle,shot:summarize(shot)})),
            tailLengths:r?.tails.map(({lines})=>lines.reduce((sum,points)=>sum+length(points),0)),
            solidLength:r?.rests[0].reduce((sum,rest)=>sum+(rest.gap?0:length(rest.points)),0),
            mouth:v.mouth?.name,pocketStops:r?.pocketSamples,cushions:r?.cushionLines,incomplete:v.references?.incomplete,
            diagnostics:BilliardsAimZones.diagnostics()};
    });
    console.log('reference work',data.diagnostics);
    assert(safety || data.left || data.right,'reference shots were found');
    return data;
}

function assertPocketSides(shot, position) {
    assert(shot.left&&shot.right,'both actual pocket halves are represented');
    assert(shot.entries[0]<0&&shot.entries[1]>0,'blue crosses left and orange crosses right');
    assert(position(shot.left.pots.find(e=>e.id===1))<0,'blue captures on the left');
    assert(position(shot.right.pots.find(e=>e.id===1))>0,'orange captures on the right');
}

async function screenshot(page, name) {
    const dir=process.env.AIM_ZONES_SCREENSHOTS;
    if(dir) await page.locator('#stageWrap').screenshot({path:path.join(dir,name+'.png')});
}

(async()=>{
    const server=cp.spawn(process.execPath,['tests/range-server.cjs','8897']);
    await new Promise((resolve,reject)=>{server.stdout.once('data',resolve);server.once('error',reject);});
    let browser;
    try {
        browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
            args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
        const page=await browser.newPage({viewport:{width:1366,height:900},serviceWorkers:'block'}), errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        page.on('console',m=>{if(m.type()==='error'&&m.text().includes('Aim-to-position preview'))errors.push(m.text());});
        await page.goto('http://127.0.0.1:8897/?train=1');
        await page.waitForFunction(()=>window.billiardsTourBridge&&window.BilliardsAimZones?.view);
        const controls=['#aimZoneRail','#aimZoneRest','#aimZonePath','#aimZoneSafety'];
        for(const id of controls)assert.equal(await page.locator(id).isChecked(),false);
        assert.equal(await page.locator('#showPocketEntry').count(),0);
        assert.equal(await page.evaluate(()=>BilliardsAimZones.diagnostics()),null);
        await page.locator('.section').filter({hasText:'FEATURES & OPTIONS'}).locator('.sectionToggle').click();
        await page.locator('#aimZoneRest').check();
        assert.equal(await page.locator('#aimZonePath').isChecked(),false);

        let shot=await load(page,fixtures.side);
        assertPocketSides(shot,p=>p.x-1.12);
        assert.equal(shot.mouth,'TM');
        assert(shot.pocketStops?.length>2,'A targeted pocket receives simulated color stops');
        assert(shot.solidLength>.15);
        assert.equal(shot.tailLengths.length,2);
        assert(shot.tailLengths.every(length=>length>0&&length<=shot.solidLength+.0001),
            'Both reachable dotted wings are bounded by the solid range length');
        const fullWings=await page.evaluate(async()=>{
            const api=BilliardsAimZones,radius=.028575,cue={x:1,y:.8},object={x:1,y:.45};
            const simulate=angle=>{
                const stop={id:0,x:1+angle*3,y:.4,active:true};
                const captured=Math.abs(angle)<=.04;
                const entry={id:1,x:1+angle,y:-.1,pocket:'TM',t:.5};
                return {firstBallContact:{objId:1,signedOffset:angle},railEvents:[],
                    pocketEvents:captured?[entry]:[],finalBalls:[stop],restIds:[0],
                    paths:{0:[{...cue,t:0},{...stop,t:1}],1:[{x:1+angle,y:.3,t:0},entry]}};
            };
            const current=simulate(0);
            const refs=await api.search({angle:0,cue,object,radius,current,pocket:'TM',extend:true,squirt:0,
                id:1,mouth:{name:'TM',center:{x:1,y:0},outside:{x:0,y:-1}}},simulate);
            const {rests,tails}=api.resolve(refs,current,0);
            const length=points=>points.slice(1).reduce((sum,p,i)=>sum+Math.abs(p.x-points[i].x),0);
            return {solid:rests[0].filter(s=>!s.gap).reduce((sum,s)=>sum+length(s.points),0),
                wings:tails.map(t=>t.lines.reduce((sum,line)=>sum+length(line),0)),
                valid:refs.tails.every(wing=>wing.every(link=>!link.b.captured))};
        });
        assert(fullWings.solid>.2&&fullWings.valid&&fullWings.wings.every(w=>Math.abs(w-fullWings.solid)<1e-6),
            'Each reachable wing is made of actual misses and adds one solid range length');
        console.log('side-pocket landing range',shot.solidLength,shot.tailLengths,shot.incomplete);
        for(const p of [shot.current,shot.left,shot.right])
            assert(p.pots.some(e=>e.id===1&&e.pocket==='TM'));
        await screenshot(page,'01-side-pocket-2d');
        await page.evaluate(()=>{window.firstZoneRefs=BilliardsAimZones.view().references;});
        await page.evaluate(()=>{
            const s=billiardsTourBridge.capture();
            const cue=s.state.balls[0],a=s.state.freeAim,angle=Math.atan2(a.y-cue.y,a.x-cue.x)+.001;
            s.state.freeAim={x:cue.x+Math.cos(angle),y:cue.y+Math.sin(angle)};
            billiardsTourBridge.restore(s);
        });
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view().references===firstZoneRefs),true);
        await page.evaluate(()=>{
            const s=billiardsTourBridge.capture();
            s.state.speed+=.1;
            billiardsTourBridge.restore(s);
        });
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view().references),null);
        await page.waitForFunction(()=>BilliardsAimZones.view().references!==null);
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view().references===firstZoneRefs),false);

        const nearSide=await load(page,fixtures.nearSide);
        assert.equal(nearSide.landingEdges.length,2);
        for(const {shot:edge} of nearSide.landingEdges){
            assert(edge.pots.some(e=>e.id===1&&e.pocket==='TM'));
            assert(edge.rests.includes(0));
        }
        await screenshot(page,'11-wide-pocket-landing-range');

        shot=await load(page,fixtures.jaw);
        assert(shot.current.jaws.some(e=>e.id===1));
        assert(!shot.current.pots.some(e=>e.id===1));
        for(const p of [shot.left,shot.right].filter(Boolean))
            assert(p.pots.some(e=>e.id===1&&e.pocket==='TM'));
        await screenshot(page,'02-side-jaw-rebound-2d');

        shot=await load(page,fixtures.corner);
        assert(shot.current.pots.some(e=>e.id===1&&e.pocket==='TL'));
        assert(shot.current.rests.includes(0));
        assertPocketSides(shot,p=>p.x-p.y);
        await screenshot(page,'03-corner-pocket-2d');

        shot=await load(page,fixtures.draw);
        assertPocketSides(shot,p=>p.x-p.y);
        assert.deepEqual(shot.current.rails.filter(e=>e.id===0).map(e=>e.rail),
            ['left rail','bottom rail','top rail','right rail']);
        assert(shot.current.rails.filter(e=>e.id===0).every(e=>e.x>=.028574&&e.y>=.028574));
        await screenshot(page,'04-four-rail-draw-2d');

        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>Billiards3D.active);
        await page.waitForFunction(()=>document.getElementById('aimZone3DOverlay').style.display==='block');
        const overlay=await page.evaluate(()=>{
            const c=document.getElementById('aimZone3DOverlay');
            return c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);
        });
        assert(overlay);
        await screenshot(page,'05-four-rail-draw-3d');
        await page.evaluate(()=>{
            window.orbitZoneRefs=BilliardsAimZones.view().references;
            const camera=Billiards3D.camera();
            Billiards3D.restoreCamera({...camera,azimuth:camera.azimuth+1.5});
        });
        await page.waitForTimeout(100);
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view().references===orbitZoneRefs),true);
        const captured=await page.evaluate(()=>{
            const clip=BilliardsClipView.create('current',640,360);
            clip.paint();
            return clip.canvas.getContext('2d').getImageData(0,0,640,360).data.length;
        });
        assert.equal(captured,640*360*4);
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>!Billiards3D.active&&document.getElementById('aimZone3DOverlay').style.display==='none');

        shot=await load(page,fixtures.collision);
        assert(shot.current.collisions.some(e=>e.ids.includes(2)));
        assert(shot.current.pots.some(e=>e.id===1&&e.pocket==='TL'));
        const signature=p=>p.collisions.map(e=>e.ids.join(':')).join('|');
        assert([shot.left,shot.right].filter(Boolean).some(p=>signature(p)!==signature(shot.current)));
        const pairs=await page.evaluate(()=>{
            const v=BilliardsAimZones.view();
            return v.references.core.filter(Boolean).map(s=>s.balls.get(0).route);
        });
        assert(new Set(pairs).size>1,'Normal sweep records changes in the cue-ball route');
        const discontinuity=await page.evaluate(async()=>{
            const api=BilliardsAimZones, radius=.028575;
            const simulate=angle=>{
                const end={id:0,x:1.7,y:.3+angle+(angle>.04?.33:0),active:true};
                const events=[{t:.3,ids:[0,1]}];
                if(angle>.04)events.push({t:.7,ids:[0,2]});
                return {
                    firstBallContact:{objId:1,signedOffset:-2*radius*angle},
                    paths:{0:[{x:.3,y:.5,t:0},{...end,t:1}]},
                    collisionEvents:events,railEvents:[],pocketEvents:[],
                    finalBalls:[end],restIds:angle>.02&&angle<.04?[]:[0]
                };
            };
            const current=simulate(0);
            const references=await api.search({angle:0,cue:{x:.3,y:.5},object:{x:1,y:.5},
                radius,safety:true,id:1,contact:0,window:.1,current},simulate);
            const canvas=document.createElement('canvas');
            canvas.width=500;canvas.height=300;
            const ctx=canvas.getContext('2d'), map=p=>({x:15+200*p.x,y:15+200*p.y});
            api.paint(ctx,map,{current,zones:api.resolve(references,current,0),ids:[0]},{safety:true},[{x:0,y:0},{x:2.24,y:0},{x:2.24,y:1.12},{x:0,y:1.12}]);
            const p=map({x:1.7,y:.495});
            const alpha=ctx.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data[3];
            const zones=api.resolve(references,current,0);
            return {alpha,safetyBands:zones.bands.length,rests:zones.rests[0].length};
        });
        assert(discontinuity.rests>0,'Reachable safety positions still draw');
        assert.equal(discontinuity.alpha,0,'A change in route leaves the gap between the safety rests unpainted');
        assert.equal(discontinuity.safetyBands,0,'A change in collision route cannot generate a safety ribbon');
        const shortJump=await page.evaluate(async()=>{
            const api=BilliardsAimZones, radius=.028575;
            const simulate=angle=>{
                const rest={id:0,x:1.7,y:.3+angle+(angle>.011?.05:0),active:true};
                return {firstBallContact:{objId:1,signedOffset:2*radius*angle},
                    paths:{0:[rest]},collisionEvents:[{t:.3,ids:[0,1]}],railEvents:[],pocketEvents:[],
                    finalBalls:[rest],restIds:[0]};
            };
            const current=simulate(0);
            const references=await api.search({angle:0,cue:{x:.3,y:.5},object:{x:1,y:.5},
                radius,safety:true,id:1,contact:0,window:.1,current},simulate);
            const {rests}=api.resolve(references,current,0);
            return {spans:rests[0].length,
                crossing:rests[0].some(({points:[a,b]})=>a.y<.336&&b.y>.336)};
        });
        assert(shortJump.spans>0,'Stable landing segments remain visible near a same-route jump');
        assert.equal(shortJump.crossing,false,'A five-centimeter jump with unchanged events leaves an open gap');
        const halo=await page.evaluate(()=>{
            const api=BilliardsAimZones, cloth=[{x:0,y:0},{x:240,y:0},{x:240,y:160},{x:0,y:160}];
            const current={finalBalls:[]}, a={x:20,y:60}, b={x:120,y:60};
            const points=Array.from({length:81},(_,i)=>({x:20+1.25*i,y:60}));
            const make=points=>points.slice(1).map((point,i)=>({points:[points[i],point],tones:[.5,.5]}));
            const alpha=rests=>{
                const canvas=document.createElement('canvas');
                canvas.width=240;canvas.height=160;
                const ctx=canvas.getContext('2d');
                api.paint(ctx,p=>p,{current,zones:{rests,tails:[]},ids:[]},{safety:true},cloth);
                return ctx.getImageData(70,62,1,1).data[3];
            };
            return {sparse:alpha([make([a,b])]),dense:alpha([make(points),make(points)])};
        });
        assert(halo.sparse>0,'The landing guide has a visible halo');
        assert.equal(halo.dense,halo.sparse,'Halo brightness stays constant across dense and overlapping samples');
        await screenshot(page,'06-secondary-collision-2d');

        shot=await load(page,fixtures.safety,true);
        assert.deepEqual(shot.ids,[0,1]);
        assert(shot.left.signed<shot.current.signed&&shot.current.signed<shot.right.signed,
            'blue sends the object ball left of green and orange sends it right');
        for(const p of [shot.left,shot.right,shot.current]){
            assert.equal(p.contact,1);
            assert.equal(p.pots.length,0);
            assert(p.rests.includes(0)&&p.rests.includes(1));
        }
        await page.locator('#aimZoneRail').uncheck();
        await page.locator('#aimZoneRest').uncheck();
        await page.locator('#aimZonePath').uncheck();
        await page.locator('#aimZoneSafety').uncheck();
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view()),null);
        await page.locator('#aimZoneSafety').check();
        await page.waitForFunction(()=>BilliardsAimZones.diagnostics()?.pending===false);
        assert.deepEqual(await page.evaluate(()=>BilliardsAimZones.view().ids),[0,1]);
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>{
            const c=document.getElementById('aimZone3DOverlay');
            return Billiards3D.active&&c.style.display==='block'&&
                c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>0);
        });
        await screenshot(page,'12-safety-only-3d');
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>!Billiards3D.active);
        await screenshot(page,'07-defensive-safety-2d');
        const before=await page.evaluate(()=>billiardsTourBridge.predict());
        await page.locator('#animate').click();
        await page.waitForFunction(()=>billiardsTourBridge.snapshot().busy);
        await page.waitForFunction(()=>!billiardsTourBridge.snapshot().busy,{},{timeout:20000});
        const undo=page.locator('#undoShot');
        await undo.evaluate(button=>button.click());
        assert.deepEqual(await page.evaluate(()=>billiardsTourBridge.predict()),before);
        await page.locator('#redoShot').evaluate(button=>button.click());
        assert.notDeepEqual(await page.evaluate(()=>billiardsTourBridge.predict()),before);
        await undo.evaluate(button=>button.click());
        await page.evaluate(()=>{
            const s=billiardsTourBridge.capture();
            Object.assign(s.state,{shot2Enabled:true,activeShot:2,shot2CueBallOnly:true});
            billiardsTourBridge.restore(s);
        });
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view()),null);
        assert.equal(await page.locator('#shot2CueBallOnly').isChecked(),true);

        shot=await load(page,fixtures.cushionSafety,true);
        assert.deepEqual([...new Set(shot.cushions.map(guide=>guide.id))].sort(),[0,1]);
        for(const {stops} of shot.cushions) {
            const first=stops[0].point,last=stops.at(-1).point;
            assert(stops.every(({point})=>point.guideHeight>.035));
            assert(stops.every(({point})=>first.x===last.x?point.x===first.x:point.y===first.y));
            assert(first.x<0||first.x>2.24||first.y<0||first.y>1.12,'Guides sit on the bumper');
        }
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view().references.request.window),.10*3);
        for(const id of ['#aimZoneRail','#aimZoneRest','#aimZonePath'])await page.locator(id).uncheck();
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>{
            const c=document.getElementById('aimZone3DOverlay');
            if(!Billiards3D.active||c.style.display!=='block')return false;
            const rect=c.getBoundingClientRect(), density=c.width/rect.width, ctx=c.getContext('2d');
            const seen=BilliardsAimZones.view().zones.cushionLines.filter(({stops})=>{
                const {point}=stops[Math.floor(stops.length/2)];
                const p=Billiards3D.project(point,point.guideHeight);
                const x=Math.round((p.x-rect.left)*density),y=Math.round((p.y-rect.top)*density);
                return p.visible&&ctx.getImageData(x-1,y-1,3,3).data.some((v,i)=>i%4===3&&v>90);
            });
            return seen.some(line=>line.id===0)&&seen.some(line=>line.id===1);
        });
        await screenshot(page,'13-3d-safety-cushion-guides');
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>!Billiards3D.active);

        const audited=[
            {name:'square end cushion',balls:[{x:1.47,y:.57},{x:2.01,y:.57}],angle:0,speed:2.55},
            {name:'both balls pocket',balls:[{x:1.12,y:.77},{x:1.12,y:.20}],angle:-Math.PI/2,speed:2.55},
            {name:'high-spin corner',balls:[{x:.59,y:.84},{x:.24,y:.34}],angle:-2.178,speed:4.35,follow:.52,spin:.73},
            {name:'secondary collision',balls:[{x:.56,y:.70},{x:1.08,y:.55},{x:1.35,y:.44}],angle:-.298,speed:2.6}
        ];
        async function auditLayout(f){
            await page.evaluate(f=>{
                const snap=billiardsTourBridge.capture(),s=snap.state;
                const cue=f.balls[0];
                Object.assign(s,{balls:f.balls.map((b,id)=>({id,n:id?String(id):'CB',...b,active:true})),speed:f.speed,
                    sideSpin:f.spin??0,follow:f.follow??0,aimZones:{safety:true},showPaths:false,
                    freeAim:{x:cue.x+Math.cos(f.angle),y:cue.y+Math.sin(f.angle)}});
                billiardsTourBridge.restore(snap);
            },f);
            await page.waitForFunction(()=>BilliardsAimZones.diagnostics()?.pending===false);
        }
        for(const f of audited){
            await auditLayout(f);
            const report=await page.evaluate(()=>{
                const {zones,ids,current}=BilliardsAimZones.view();
                const predict=billiardsTourBridge.predict();
                return {stops:current.restIds,match:JSON.stringify(predict.finalBalls)===JSON.stringify(current.finalBalls),
                    layers:ids.map((id,i)=>{
                        const run=zones.runs[i], segs=zones.rests[i], live=zones.live.balls.get(id);
                        return {id,links:segs.length,live:!!live.rest,anchor:run.includes(zones.live),
                            exactGreen:segs.some(s=>s.points.some((p,j)=>p===live.rest&&s.tones[j]===.5)),
                            contiguous:segs.every((seg,j)=>!j||seg.samples[0]===segs[j-1].samples[1]),
                            correctStops:segs.every(s=>s.samples.every((sample,j)=>
                                s.points[j]===sample.shot.finalBalls.find(b=>b.id===id)&&sample.shot.restIds.includes(id))),
                            stripsLinked:zones.cushionLines.filter(g=>g.id===id).every(g=>g.stops.every(stop=>run.includes(stop.sample)))};
                    })};
            });
            assert(report.match,f.name);
            for(const layer of report.layers){
                if(layer.live){
                    assert(layer.links>0&&layer.anchor&&layer.exactGreen,f.name+' has a branch through the exact green stop');
                    assert(layer.contiguous&&layer.correctStops&&layer.stripsLinked,f.name+' keeps one ordered range per ball');
                }else assert.equal(layer.links,0,f.name+' has no resting branch for a ball off the table');
            }
            if(f.name==='both balls pocket')assert.equal(report.stops.length,0);
            if(f.name==='square end cushion')assert.equal(report.stops.length,2);
        }

        await auditLayout(audited[0]);
        const checked=await page.evaluate(()=>{
            const {zones}=BilliardsAimZones.view(),snap=billiardsTourBridge.capture(),cue=snap.state.balls[0];
            let total=0,farthest=0;
            for(const [id,layer] of zones.rests.entries()){
                for(const {samples:[a,b],points:[p,q]} of layer.filter((_,i)=>i%3===0)){
                    const at=(a.angle+b.angle)/2;
                    snap.state.freeAim={x:cue.x+Math.cos(at),y:cue.y+Math.sin(at)};
                    billiardsTourBridge.restore(snap);
                    const live=BilliardsAimZones.view().current;
                    const end=billiardsTourBridge.predict().finalBalls.find(ball=>ball.id===id);
                    if(!end?.active||!live.restIds.includes(id))return {total,farthest:Infinity};
                    const x=q.x-p.x,y=q.y-p.y,length=x*x+y*y;
                    const t=length?Math.max(0,Math.min(1,((end.x-p.x)*x+(end.y-p.y)*y)/length)):0;
                    farthest=Math.max(farthest,Math.hypot(end.x-p.x-t*x,end.y-p.y-t*y));
                    total++;
                }
            }
            snap.state.freeAim={x:cue.x+1,y:cue.y};
            billiardsTourBridge.restore(snap);
            return {total,farthest};
        });
        assert(checked.total>16&&checked.farthest<.008,'Independent shots track the two complete local branches');
        console.log('independent branch probes',checked);
        await auditLayout(audited[0]);
        const swept=await page.evaluate(()=>{
            const api=BilliardsAimZones,initial=api.view().references, snap=billiardsTourBridge.capture(), cue=snap.state.balls[0];
            const aim=angle=>{
                snap.state.freeAim={x:cue.x+Math.cos(angle),y:cue.y+Math.sin(angle)};
                billiardsTourBridge.restore(snap);
            };
            const expected=initial.runs[0].filter((_,i)=>i%4===0).slice(1,-1);
            const samples=expected.map(sample=>{
                aim(sample.angle);
                const v=api.view();
                return v.zones?.rests[0].some(seg=>seg.samples.includes(v.zones.live)&&
                    seg.tones[seg.samples.indexOf(v.zones.live)]===.5);
            });
            aim(0);
            return samples;
        });
        assert(swept.length>2&&swept.every(Boolean),'The exact current stop remains green through the sampled aim sweep');
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>Billiards3D.active&&document.getElementById('aimZone3DOverlay').style.display==='block');
        const predicted=await page.evaluate(()=>{
            const {current}=BilliardsAimZones.view();
            return current.finalBalls.map(({id,x,y})=>({id,x,y}));
        });
        await page.locator('#table3DShotActions button:first-child:visible, [data-trainer-action=animate]:visible').first().click();
        await page.waitForFunction(()=>billiardsTourBridge.snapshot().busy);
        await page.waitForFunction(()=>!billiardsTourBridge.snapshot().busy,undefined,{timeout:25000});
        const stopped=await page.evaluate(()=>billiardsTourBridge.capture().state.balls.map(({id,x,y})=>({id,x,y})));
        assert.deepEqual(stopped,predicted,'3D Shoot lands at both exact resting markers');
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>!Billiards3D.active);

        // Exercise a worker that runs out of its budget before one alternate.
        await page.evaluate(()=>{
            const api=BilliardsAimZones, search=api.search;
            api.search=(request,simulate,cancel)=>{
                api.search=search;
                return search(request,simulate,()=>true);
            };
        });
        await auditLayout({...audited[0],speed:2.58});
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view().references.incomplete),true);
        assert(await page.evaluate(()=>BilliardsAimZones.view().zones.rests.every(layer=>!layer.length)));
        await page.evaluate(()=>{
            const snap=billiardsTourBridge.capture(),cue=snap.state.balls[0];
            snap.state.freeAim={x:cue.x+Math.cos(.00005),y:cue.y+Math.sin(.00005)};
            billiardsTourBridge.restore(snap);
        });
        await page.waitForFunction(()=>!BilliardsAimZones.diagnostics()?.pending&&
            BilliardsAimZones.view()?.zones?.rests.every(layer=>layer.length>0));

        for(const [name,angle,position] of [
            ['top rail',-Math.PI/2,p=>p.x],['bottom rail',Math.PI/2,p=>-p.x],
            ['left rail',Math.PI,p=>-p.y],['right rail',0,p=>p.y]
        ]){
            shot=await load(page,[{x:1.45,y:.56},null,angle,1.8]);
            const [left,center,right]=[shot.left,shot.current,shot.right].map(p=>p.rails[0]);
            assert([left,center,right].every(p=>p.rail===name));
            assert(position(left)<position(center)&&position(center)<position(right),
                'the target-facing order is blue, green, orange at the '+name);
        }
        await screenshot(page,'10-direct-rail-2d');

        const phone=await browser.newPage({viewport:{width:915,height:412},isMobile:true,hasTouch:true,deviceScaleFactor:2,serviceWorkers:'block'});
        phone.on('pageerror',e=>errors.push(e.message));
        await phone.bringToFront();
        await phone.goto('http://127.0.0.1:8897/?train=1');
        await phone.waitForFunction(()=>window.billiardsTourBridge&&window.BilliardsAimZones?.view);
        shot=await load(phone,fixtures.safety,true);
        assert.deepEqual(shot.ids,[0,1]);
        if(await phone.locator('#appViewHint').isVisible())await phone.locator('#appViewHint [data-display-dismiss]').click();
        await screenshot(phone,'08-defensive-safety-phone-emulated');
        await phone.reload();
        await phone.waitForFunction(()=>BilliardsAimZones.diagnostics()?.pending===false);
        for(const id of controls)assert.equal(await phone.locator(id).isChecked(),true);
        if(!await phone.locator('#table3DToggle').isVisible())await phone.locator('#phoneControls').click();
        await phone.locator('#table3DToggle').click();
        await phone.waitForFunction(()=>Billiards3D.active&&document.getElementById('aimZone3DOverlay').style.display==='block');
        await screenshot(phone,'09-defensive-safety-3d-phone-emulated');

        await page.evaluate(()=>{
            const s=billiardsTourBridge.capture();
            s.state.aimZones={};
            billiardsTourBridge.restore(s);
        });
        assert.equal(await page.evaluate(()=>BilliardsAimZones.diagnostics()),null);
        assert.equal(await page.evaluate(()=>BilliardsAimZones.view()),null);
        assert.deepEqual(errors,[]);
        console.log('Aim zones: pot and rebound, stable aim references, speed invalidation, four rails, 2D/3D orbit and capture, secondary collisions, no-pot safety, mobile emulation, persistence and opt-out passed.');
    } finally {
        if(browser)await browser.close();
        server.kill();
    }
})().catch(error=>{console.error(error);process.exitCode=1;});
