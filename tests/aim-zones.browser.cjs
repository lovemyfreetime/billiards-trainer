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
    cushionSafety: [{x:.55,y:.55}, {x:1.05,y:.55}, .065, 3.6, -.2],
    pocketJawSafety: [{x:1.902,y:.659}, {x:1.611,y:.236}, -.0188, 1.85],
    continuousSafety: [{x:1.7049229644773292,y:.7631445534905645}, {x:1.744244285487899,y:.9452285531614928},
        .20640073732324837, 2.67]
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
        const v=BilliardsAimZones.view(), r=v.references;
        const summarize=p=>p&&{contact:p.firstBallContact?.objId,signed:p.firstBallContact?.signedOffset,pots:p.pocketEvents,rails:p.railEvents,
            rests:p.restIds,collisions:p.collisionEvents,jaws:p.jawEvents,paths:Object.keys(p.paths)};
        const length=points=>points.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-points[i-1].x,p.y-points[i-1].y):sum,0);
        return {current:summarize(v.current),left:summarize(r?.left?.shot),right:summarize(r?.right?.shot),
            ids:v.ids,entries:[r?.left?.offset,r?.right?.offset],branches:r?.bands[0]?.length,
            referenceAngles:[r?.left?.angle,r?.right?.angle],
            landingEdges:r?.restEdges?.map(({angle,shot})=>({angle,shot:summarize(shot)})),
            tailLengths:r?.tails.map(lines=>lines.reduce((sum,line)=>sum+length(line),0)),
            solidLength:r?.rests[0].reduce((sum,rest)=>sum+(rest.gap?0:length(rest.points)),0),
            mouth:v.mouth?.name,pocketStops:r?.pocketStops?.stops,cushions:r?.cushionLines,
            diagnostics:BilliardsAimZones.diagnostics()};
    });
    console.log('reference work',data.diagnostics);
    assert(data.left || data.right,'reference shots were found');
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
        assert(shot.tailLengths.every(length=>Math.abs(length-shot.solidLength)<.0001),
            'Each reachable dotted wing adds one solid landing-range length');
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
        const [blueLanding,orangeLanding]=nearSide.landingEdges;
        assert(blueLanding.angle>nearSide.referenceAngles[0]+.004);
        assert(orangeLanding.angle<nearSide.referenceAngles[1]-.004);
        for(const {shot:edge} of nearSide.landingEdges){
            assert(edge.pots.some(e=>e.id===1&&e.pocket==='TM'));
            assert(edge.rests.includes(0));
        }
        assert.equal(await page.evaluate(()=>{
            const r=BilliardsAimZones.view().references;
            const rests=r.rests[0], landing=r.restEdges.map(({shot})=>shot.finalBalls.find(b=>b.id===0));
            return rests.at(-1).points[1]===landing[0]&&rests[0].points[0]===landing[1];
        }),true);
        await screenshot(page,'11-wide-pocket-landing-range');
        const nearSideSafety=await load(page,fixtures.nearSide,true);
        assert.equal(Math.sign(nearSideSafety.referenceAngles[1]-nearSideSafety.referenceAngles[0]),
            Math.sign(orangeLanding.angle-blueLanding.angle),'Defensive safety keeps pocket left and right orientation');

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
        assert.equal(shot.branches,0,'Discontinuous non-safety paths are left transparent');
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
            api.paint(ctx,map,{current,references,ids:[0]},{safety:true},[{x:0,y:0},{x:2.24,y:0},{x:2.24,y:1.12},{x:0,y:1.12}]);
            const p=map({x:1.7,y:.495});
            const alpha=ctx.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data[3];
            return {alpha,safetyBands:references.bands[0].length,rests:references.rests[0].length};
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
            return {spans:references.rests[0].length,
                crossing:references.rests[0].some(({points:[a,b]})=>a.y<.336&&b.y>.336)};
        });
        assert(shortJump.spans>0,'Stable landing segments remain visible near a same-route jump');
        assert.equal(shortJump.crossing,false,'A five-centimeter jump with unchanged events leaves an open gap');
        const halo=await page.evaluate(()=>{
            const api=BilliardsAimZones, cloth=[{x:0,y:0},{x:240,y:0},{x:240,y:160},{x:0,y:160}];
            const current={finalBalls:[]}, a={x:20,y:60}, b={x:120,y:60};
            const points=Array.from({length:81},(_,i)=>({x:20+1.25*i,y:60}));
            const make=points=>points.slice(1).map((point,i)=>({points:[points[i],point],offsets:[0,0]}));
            const alpha=rests=>{
                const canvas=document.createElement('canvas');
                canvas.width=240;canvas.height=160;
                const ctx=canvas.getContext('2d');
                api.paint(ctx,p=>p,{current,references:{rests},ids:[]},{safety:true},cloth);
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
        assert(shot.entries[0]<-.27&&shot.entries[1]>.27,'Safety uses a tripled signed aim window');
        for(const id of ['#aimZoneRail','#aimZoneRest','#aimZonePath'])await page.locator(id).uncheck();
        await page.locator('#table3DToggle').click();
        await page.waitForFunction(()=>{
            const c=document.getElementById('aimZone3DOverlay');
            if(!Billiards3D.active||c.style.display!=='block')return false;
            const rect=c.getBoundingClientRect(), density=c.width/rect.width, ctx=c.getContext('2d');
            const seen=BilliardsAimZones.view().references.cushionLines.filter(({stops})=>{
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

        await load(page,fixtures.pocketJawSafety,true);
        const sweep=await page.evaluate(()=>{
            const view=()=>BilliardsAimZones.view(), pending=()=>BilliardsAimZones.diagnostics().pending;
            const snap=billiardsTourBridge.capture(), s=snap.state, cue=s.balls[0];
            const angle=Math.atan2(s.freeAim.y-cue.y,s.freeAim.x-cue.x);
            const initial=window.aimBeforeSweep=view().references;
            const aim=at=>{
                s.freeAim={x:cue.x+Math.cos(at),y:cue.y+Math.sin(at)};
                billiardsTourBridge.restore(snap);
            };
            const samples=[];
            for(const edge of [initial.lo,initial.hi]){
                for(const fraction of [.2,.4,.6,.8,.95]){
                    aim(angle+fraction*(edge-angle));
                    const positions=p=>p.finalBalls.filter(ball=>ball.active).map(({id,x,y})=>[id,x,y]);
                    samples.push(!pending()&&view().references===initial&&
                        JSON.stringify(positions(view().current))===JSON.stringify(positions(billiardsTourBridge.predict())));
                }
            }
            aim(initial.hi+.003);
            const firstCrossing=pending()&&view().references===initial;
            aim(angle);
            const reversed=!pending()&&view().references===initial;
            aim(initial.hi+.003);
            const held=pending()&&view().references===initial;
            const connected=initial.rests.every(layer=>layer.length>0&&layer.every(rest=>!rest.gap&&
                Math.hypot(rest.points[1].x-rest.points[0].x,rest.points[1].y-rest.points[0].y)<=.086));
            return {samples,firstCrossing,reversed,held,connected};
        });
        assert(sweep.samples.every(Boolean),'Safety range stays anchored throughout the sampled range and the live stops stay exact');
        assert(sweep.firstCrossing&&sweep.reversed&&sweep.held,'An edge rebuild keeps the last range and a quick reversal restores it');
        assert(sweep.connected,'Both safety landing guides exclude disconnected positions');
        await page.waitForFunction(()=>!BilliardsAimZones.diagnostics()?.pending&&
            BilliardsAimZones.view()?.references&&BilliardsAimZones.view().references!==window.aimBeforeSweep);
        await screenshot(page,'14-safety-aim-sweep');

        await load(page,fixtures.continuousSafety,true);
        const continuous=await page.evaluate(()=>{
            const initial=BilliardsAimZones.view().references;
            const snap=billiardsTourBridge.capture(),s=snap.state,cue=s.balls[0];
            const from=1.4772012186014847,to=1.4881150136697232;
            let farthest=0;
            for(let i=0;i<=16;i++){
                const angle=from+(to-from)*i/16;
                s.freeAim={x:cue.x+Math.cos(angle),y:cue.y+Math.sin(angle)};
                billiardsTourBridge.restore(snap);
                const view=BilliardsAimZones.view(),p=view.current.finalBalls.find(b=>b.id===0);
                if(view.references!==initial||!view.current.restIds.includes(0))return Infinity;
                const nearest=Math.min(...initial.rests[0].map(({points:[a,b]})=>{
                    const dx=b.x-a.x,dy=b.y-a.y,length=dx*dx+dy*dy;
                    const t=length?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/length)):0;
                    return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
                }));
                farthest=Math.max(farthest,nearest);
            }
            return farthest;
        });
        assert(continuous<.005,'The continuous 20 cm safety branch renders through the former false gap');

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
