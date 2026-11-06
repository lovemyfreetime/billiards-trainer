const assert = require('node:assert/strict');
const cp = require('node:child_process');
const { chromium } = require('playwright');

(async () => {
 const server = cp.spawn(process.execPath, ['tests/range-server.cjs', '8797']);
 await new Promise(resolve => server.stdout.once('data', resolve));
 let browser;
 try {
  browser = await chromium.launch({
   headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE_PATH,
   args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
  });
  for (const touch of [false, true]) {
   const context = await browser.newContext({ viewport: { width: 1365, height: 900 }, hasTouch: touch, serviceWorkers: 'block' });
   await context.addInitScript(() => {
    window.BilliardsWindowsHostAvailable = true;
    window.BilliardsWindowsFullscreen = true;
    window.chrome = { webview: { postMessage() {} } };
   });
   const page = await context.newPage();
   const errors = [];
   page.on('pageerror', error => errors.push(error.message));
   await page.goto('http://127.0.0.1:8797/?train=1');
   await page.waitForFunction(() => window.billiardsTourBridge && document.querySelector('#trainerAnnotateLock'));
   await page.evaluate(() => billiardsTourBridge.apply({
    id: 'annotation-test', title: 'Annotation lesson', balls: [[0, .25, .5], [1, .65, .5]],
    target: 1, pocket: [1, 1], speed: .3, followPercent: 0, sidePercent: 0
   }, { tableL: 2.54, tableW: 1.27 }));
   await page.evaluate(()=>{const original=BilliardsShotBudget.drawContacts;BilliardsShotBudget.drawContacts=(ctx,cards)=>{window.liveContactLabels=cards;original(ctx,cards);};});
   const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
   const state = () => page.evaluate(() => billiardsTourBridge.capture().state);
   const annotationCount = async () => (await state()).annotations?.items.length || 0;
   const ink = () => page.locator('#trainerAnnotationCanvas').evaluate(canvas => {
    const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i]) count++;
    return count;
   });
   await page.getByRole('button', { name: /TABLE \/ BALLS/ }).click();
   const bounds = await page.locator('#trainerSnapshotGroup button').evaluateAll(buttons =>
    buttons.map(button => { const r = button.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
   const folder = await page.locator('#trainerSnapshotFolder').boundingBox();
   assert.equal(bounds.length,4,'Snapshot capture group contains three modes');
   assert(bounds.every(r => Math.abs(r.y - bounds[0].y) < 1),'All snapshot buttons share a row');
   const textButton=await page.locator('[data-annotate-tool=text]').boundingBox();
   assert(Math.abs(textButton.y-folder.y)<1,'Folder and text controls share row four');
   const clear = await page.locator('#trainerAnnotateClear').boundingBox();
   const eraser = await page.locator('[data-annotate-tool=erase]').boundingBox();
   assert(Math.abs(clear.y - eraser.y) < 1, 'Clear is in row two');
   assert(Math.abs(eraser.x+eraser.width-folder.x-folder.width)<2,'Folder remains below Eraser');
   const points = await page.evaluate(() => {
    const f = billiardsTourBridge.annotationFrame(), rect = document.querySelector('#stageWrap').getBoundingClientRect();
    return [.3, .55].map(x => { const p = f.map({ x, y: .3 }); return { x: rect.left + p.x, y: rect.top + p.y }; });
   });
   const cdp = touch ? await context.newCDPSession(page) : null;
   const drag = async (a, b) => {
    if (touch) {
     await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [a] });
     await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [b] });
     await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    } else {
     await page.mouse.move(a.x, a.y); await page.mouse.down();
     await page.mouse.move(b.x, b.y, { steps: 5 }); await page.mouse.up();
    }
   };
   for(const tool of ['line','arrow','circle','draw']){
    await page.locator('[data-annotate-tool='+tool+']').click();
    await drag(points[0], points[1]);
   }
   assert.equal(await annotationCount(), 4);
   const tablePoint = (x,y) => page.evaluate(({x,y}) => {
    const r=document.querySelector('#stageWrap').getBoundingClientRect();
    const s=billiardsTourBridge.snapshot();
    const p=Billiards3D.active?Billiards3D.project({x:x*s.tableL,y:y*s.tableW}):billiardsTourBridge.annotationFrame().map({x,y});
    return Billiards3D.active?{x:p.x,y:p.y}:{x:r.left+p.x,y:r.top+p.y};
   },{x,y});
   const tap = async p => touch?page.touchscreen.tap(p.x,p.y):page.mouse.click(p.x,p.y);
   const label = async () => (await state()).annotations.items.find(item=>item.tool==='text');
   await page.locator('[data-annotate-tool=text]').click();
   await page.locator('#trainerAnnotationText').fill('Cue ball → next shot\nSoft follow');
   const textStart=await tablePoint(.4,.65),textEnd=await tablePoint(.52,.75);
   await tap(textStart);
   assert.equal((await label()).text,'Cue ball → next shot\nSoft follow');
   await tap(textStart);
   await page.locator('#trainerInlineText').fill('Cue ball → next shot\nGentle follow');
   assert.equal((await label()).text,'Cue ball → next shot\nGentle follow','Tapping label allows inline edits');
   await page.locator('#trainerInlineText').blur();
   await tap(await tablePoint(.8,.8));
   assert.equal(await annotationCount(),5,'Blank cloth deselects instead of duplicating a label');
   assert(!await page.locator('#trainerTextHandlerotate').isVisible());
   await tap(textStart);await page.locator('#trainerInlineText').blur();
   const handleDrag=async(kind,factor,angle)=>{
    const handle=await page.locator('#trainerTextHandle'+kind).boundingBox();
    assert(handle,'Selected text exposes '+kind+' handle');
    const center=await tablePoint((await label()).points[0].x,(await label()).points[0].y);
    const start={x:handle.x+handle.width/2,y:handle.y+handle.height/2};
    const dx=start.x-center.x,dy=start.y-center.y;
    await drag(start,{x:center.x+factor*(dx*Math.cos(angle)-dy*Math.sin(angle)),y:center.y+factor*(dx*Math.sin(angle)+dy*Math.cos(angle))});
   };
   await handleDrag('resize',1.5,0);
   assert((await label()).scale>1.4,'Corner handle enlarges text');
   await handleDrag('resize',.6,0);
   assert((await label()).scale<1,'Corner handle shrinks text');
   await page.locator('#trainerAnnotateUndo').click();await tap(textStart);await page.locator('#trainerInlineText').blur();
   await page.locator('#trainerAnnotateUndo').click();
   assert.equal((await label()).scale,1,'Undo restores text size');
   await tap(textStart);await page.locator('#trainerInlineText').blur();
   await handleDrag('rotate',1,Math.PI/2);
   assert(Math.abs((await label()).rotation-90)<2,'Corner handle rotates text');
   await page.locator('#trainerAnnotateUndo').click();
   assert.equal((await label()).rotation,0,'Undo restores corner rotation');

   await drag(textStart,textEnd);
   assert(Math.abs((await label()).points[0].x-.52)<.01,'Text drags on cloth');
   await page.locator('#trainerAnnotateUndo').click();
   assert(Math.abs((await label()).points[0].x-.4)<.01,'Undo restores text position');
   await tap(textStart);
   for(const degrees of [90,270,360]){
    await page.locator('#trainerTextRotation').focus();
    await page.locator('#trainerTextRotation').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));},String(degrees));
    await page.locator('#trainerTextRotation').blur();
    assert.equal((await label()).rotation,degrees);
   }
   await page.locator('#trainerAnnotateUndo').click();
   assert.equal((await label()).rotation,270,'Undo restores text rotation');
   await page.locator('[data-annotate-tool=erase]').click();
   await tap(textStart);
   assert.equal(await label(),undefined,'Text can be erased');
   await page.locator('#trainerAnnotateUndo').click();
   assert.equal((await label()).rotation,270,'Undo restores erased text');
   assert.equal(await annotationCount(),5);
   await page.locator('#trainerAnnotateLock').click();
   assert(await page.locator('[data-annotate-tool=line]').isDisabled());
   await page.locator('#table3DToggle').click();
   await page.waitForFunction(() => Billiards3D.active);
   await settle();
   assert(await ink() > 100, 'Annotations appear in 3D without touching cloth');
   await page.locator('#phoneControls').click();
   await page.locator('#trainerAnnotateLock').click();
   await page.locator('[data-annotate-tool=text]').click();
   await page.locator('#phoneControls').click();
   const threeStart=await tablePoint(.4,.65),threeEnd=await tablePoint(.5,.7);
   await drag(threeStart,threeEnd);
   assert(Math.abs((await label()).points[0].x-.5)<.015,'Text drags in 3D');
   assert.equal((await label()).rotation,270);
   await handleDrag('resize',1.3,0);
   assert((await label()).scale>1.1,'Resize handle works in 3D');
   await handleDrag('rotate',1,Math.PI/6);
   assert(Math.abs((await label()).rotation-270)>5,'Rotation handle works in 3D');
   await page.locator('#phoneControls').click();await page.locator('#trainerAnnotateUndo').click();await page.locator('#phoneControls').click();
   await page.locator('#phoneControls').click();
   await page.locator('#trainerAnnotateLock').click();
   await page.locator('#phoneControls').click();

   await page.screenshot({ path: '/tmp/trainer-annotations-3d-' + (touch ? 'touch' : 'mouse') + '.png' });
   await page.locator('#phoneControls').click();
   await page.locator('#trainerSnapshotStroke').click();
   const threeDownload=page.waitForEvent('download');await page.locator('#trainerAnnotateSnapshot').click();
   await (await threeDownload).saveAs('/tmp/trainer-stroke-3d-'+(touch?'touch':'mouse')+'.png');
   await page.locator('#phoneControls').click();

   await page.locator('#table3DLock [data-adjust=edit]').click();
   const aimBefore = (await state()).freeAim;
   const aim = await page.evaluate(() => {
    const s = billiardsTourBridge.snapshot();
    return Billiards3D.project({ x: s.tableL * .4, y: s.tableW * .65 });
   });
   if (touch) await page.touchscreen.tap(aim.x, aim.y); else await page.mouse.click(aim.x, aim.y);
   await settle();
   assert.equal(await annotationCount(), 5, 'Locked cloth touch does not add a mark');
   assert.notDeepEqual((await state()).freeAim, aimBefore, 'Locked annotations let the student aim');
   assert(await ink() > 100, 'Annotations survive a 3D aiming redraw');
   await page.locator('#table3DLock [data-adjust=view]').click();
   const canvas = await page.locator('#table3DCanvas').boundingBox();
   await drag({ x: canvas.x + canvas.width * .5, y: canvas.y + canvas.height * .5 },
    { x: canvas.x + canvas.width * .5 + 45, y: canvas.y + canvas.height * .5 + 15 });
   await settle();
   assert(await ink() > 100, 'Annotations survive camera redraw');
   await page.locator('#table3DToggle').click();
   await settle();
   assert(await ink() > 100, 'Annotations survive returning to 2D');
   const portable = await page.evaluate(() => BilliardsLayoutFiles.parse(JSON.stringify(billiardsTourBridge.exportFile())));
   assert.equal(portable.layout.annotations.items.length,5,'Portable lesson includes all annotations');
   assert.equal(portable.layout.annotations.locked,true);
   assert.equal(portable.layout.annotations.items.find(item=>item.tool==='text').rotation,270,'Export preserves typed text rotation');
   assert(portable.layout.annotations.items.find(item=>item.tool==='text').scale>1.1,'Export preserves text size');
   await page.locator('#layoutNameInput').fill('Locked lesson');
   await page.locator('#saveLayoutBtn').click();
   await page.locator('#trainerAnnotateLock').click();
   await page.locator('#trainerAnnotateClear').click();
   assert.equal(await annotationCount(), 0);
   await page.locator('#loadLayoutBtn').click();
   await settle();
   assert.equal(await annotationCount(), 5, 'Recall restores the saved annotations');
   assert.equal((await state()).annotations.locked, true);
   await page.locator('#animate').click();
   await page.waitForFunction(() => !billiardsTourBridge.snapshot().busy, null, { timeout: 60000 });
   assert.equal(await annotationCount(), 5);
   await page.locator('#undoShot').click();
   assert.equal(await annotationCount(), 5, 'Shot undo preserves the lesson overlay');
   await page.reload();
   await page.waitForFunction(() => window.billiardsTourBridge?.capture().state.annotations?.items.length === 5);
   assert.equal((await state()).annotations.locked, true, 'Reload restores the lock');
   assert((await label()).scale>1.1,'Reload retains label size');
   assert.equal((await label()).text,'Cue ball → next shot\nGentle follow');
   await page.getByRole('button', { name: /TABLE \/ BALLS/ }).click();
   await page.locator('#trainerSnapshotCurrent').click();
   const colors = await page.locator('#trainerSnapshotGroup button').evaluateAll(buttons => buttons.map(b => getComputedStyle(b).backgroundColor));
   assert.equal(colors[0], colors[2]); assert.notEqual(colors[0], colors[1]);
   await page.locator('#trainerSnapshotFull').click();
   const full = await page.locator('#trainerSnapshotGroup button').evaluateAll(buttons => buttons.map(b => getComputedStyle(b).backgroundColor));
   assert.equal(full[0], full[1]); assert.notEqual(full[0], colors[0]);
   const download = page.waitForEvent('download');
   await page.locator('#trainerAnnotateSnapshot').click();
   assert((await download).suggestedFilename().endsWith('.png'));
   await page.locator('#trainerSnapshotStroke').click();
   const strokeColors=await page.locator('#trainerSnapshotGroup button').evaluateAll(buttons=>buttons.map(b=>getComputedStyle(b).backgroundColor));
   assert.equal(strokeColors[0],strokeColors[3]);assert.notEqual(strokeColors[0],full[0]);assert.notEqual(strokeColors[0],colors[0]);
   const shot=await page.evaluate(()=>{
    const saved=billiardsTourBridge.capture();saved.state.speed=2.25;saved.state.follow=-.35;saved.state.sideSpin=.4;
    billiardsTourBridge.restore(saved);
    const shot=billiardsTourBridge.strokeSnapshot();return {...shot,tip:undefined};
   });
   assert.equal(shot.speed,2.25);assert.equal(shot.followPercent,-35);assert.equal(shot.sidePercent,40);
   await page.evaluate(()=>{
    window.snapshotText=[];window.snapshotPathAngles=[];window.snapshotCalls=[];window.snapshotBoxes=[];window.snapshotStripes=[];const fillOriginal=CanvasRenderingContext2D.prototype.fillRect;
    CanvasRenderingContext2D.prototype.fillRect=function(...args){window.snapshotStripes.push({args,color:this.fillStyle});return fillOriginal.apply(this,args);};
    const rectOriginal=CanvasRenderingContext2D.prototype.roundRect;
    CanvasRenderingContext2D.prototype.roundRect=function(...args){window.snapshotBoxes.push(args);return rectOriginal.apply(this,args);};
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.snapshotText.push(text);if(this.globalAlpha===.48&&/^\d+\.\d°$/.test(text))window.snapshotPathAngles.push(text);window.snapshotCalls.push([text,...args]);return original.call(this,text,...args);};
   });
   const strokeDownload=page.waitForEvent('download');
   await page.locator('#trainerAnnotateSnapshot').click();
   const imagePath='/tmp/trainer-stroke-'+(touch?'touch':'mouse')+'.png';
   await (await strokeDownload).saveAs(imagePath);
   const buffer=require('node:fs').readFileSync(imagePath),imageW=buffer.readUInt32BE(16),imageH=buffer.readUInt32BE(20);
   assert(imageW>imageH,'Table and stroke export has side panel');
   const painted=await page.evaluate(()=>window.snapshotText);
   const heading=painted.lastIndexOf('Shot Info');assert(heading>=0,'Snapshot uses Shot Info heading');
   const rows=painted.slice(heading+1,heading+25);
   assert.deepEqual(rows.filter((_,i)=>i%2===0),['Speed','Power','Follow','Draw','Left','Right','Overlap','Cut angle','Exit angle','Cue elevation','Cue at object (C)','Object at pocket (P)']);
   assert.equal(rows[1],'2.25 m/s');assert.equal(rows[5],'0%');assert.equal(rows[7],'35%');assert.equal(rows[9],'0%');assert.equal(rows[11],'40%');
   assert(!painted.some(text=>/^Aim/.test(text)),'Old aim row and footer are removed');
   assert(!painted.includes('≈30°'),'Fixed approximate 30 degree text is removed');
   const boxes=await page.evaluate(()=>window.snapshotBoxes.filter(args=>args[2]===104&&args[3]===26));
   assert.equal(boxes.length,12);assert(boxes.every(box=>box[0]===boxes[0][0]),'Value boxes align in one column');
   assert(boxes.every((box,i)=>i===0||Math.abs(box[1]-boxes[i-1][1]-31)<.01),'Rows are evenly spaced');
   const calls=await page.evaluate(()=>window.snapshotCalls);
   const lastHeading=calls.map(call=>call[0]).lastIndexOf('Shot Info');
   const values=calls.slice(lastHeading+1,lastHeading+25).filter((_,i)=>i%2===1);
   assert(values.every(call=>call[1]===values[0][1]),'Numeric values align in their boxes');
   const labels=calls.slice(lastHeading+1,lastHeading+25).filter((_,i)=>i%2===0);
   const panelLeft=boxes[0][0]-218;
   assert(labels.every(call=>Math.abs(call[1]-(panelLeft+boxes[0][0])/2)<.01),'Every label is centered between panel edge and value box');
   const stripes=await page.evaluate(()=>window.snapshotStripes.filter(item=>item.args[2]===324&&item.args[3]===30));
   assert.equal(stripes.length,12);assert(stripes.every((item,i)=>item.color===stripes[i%2].color),'Row colors alternate consistently');
   assert.notEqual(stripes[0].color,stripes[1].color,'Alternating rows have visibly distinct shading');
   const second=await page.evaluate(()=>{const saved=billiardsTourBridge.capture();saved.state.shot2Enabled=true;saved.state.activeShot=2;saved.state.shot2.speed=1.75;saved.state.shot2.follow=.2;saved.state.shot2.sideSpin=-.3;billiardsTourBridge.restore(saved);const shot=billiardsTourBridge.strokeSnapshot();return {which:shot.which,speed:shot.speed,follow:shot.followPercent,side:shot.sidePercent,tipWidth:shot.tip.width};});
   assert.deepEqual({...second,tipWidth:undefined},{which:2,speed:1.75,follow:20,side:-30,tipWidth:undefined});assert(second.tipWidth>=300);
   const fixtures=await page.evaluate(()=>{
    const original=BilliardsShotBudget.drawContacts;BilliardsShotBudget.drawContacts=(ctx,cards)=>{window.liveContactLabels=cards;original(ctx,cards);};
    const profile={tableL:2.54,tableW:1.27};
    const run=(id,balls,target,pocket)=>{
     billiardsTourBridge.apply({id,title:id,balls,target,pocket,speed:1.5,followPercent:0,sidePercent:0},profile);
     const result=billiardsTourBridge.strokeSnapshot(),saved=billiardsTourBridge.capture().state,contact=saved.preview?.firstBallContact;
     const read=id=>document.getElementById(id).textContent;
     return {cut:result.cutDegrees,overlap:result.overlapPercent,cue:result.cueImpactDiamonds,pocket:result.pocketArrivalDiamonds,exit:result.exitDegrees,overlapUI:read('overlap'),angleUI:read('cutAngle'),cueUI:read('impactPowerText'),pocketUI:read('pocketArrivalText'),};
    };
    const straight=run('straight',[[0,.25,.25],[1,.65,.65]],1,[1,1]);
    const cut=run('cut',[[0,.25,.5],[1,.65,.5]],1,[1,1]);
    const empty=billiardsTourBridge.capture();empty.state.balls=empty.state.balls.filter(ball=>ball.id===0);billiardsTourBridge.restore(empty);
    const absent=billiardsTourBridge.strokeSnapshot();
    run('cut',[[0,.25,.5],[1,.65,.5]],1,[1,1]);
    return {straight,cut,absent:{cut:absent.cutDegrees,overlap:absent.overlapPercent,cue:absent.cueImpactDiamonds,pocket:absent.pocketArrivalDiamonds}};
   });
   assert(fixtures.straight.cut<1,'Straight pocket shot is approximately zero-degree cut');
   assert(fixtures.straight.overlap>99,'Straight contact has full overlap');
   assert(Number.isFinite(fixtures.straight.cue)&&Number.isFinite(fixtures.straight.pocket),'C/P report finite diamond equivalents');
   assert(fixtures.straight.cue>0&&fixtures.straight.pocket>=0,'Arrival readings have positive diamond equivalents');
   assert(fixtures.cut.cut>15&&fixtures.cut.cut<60,'Angled shot reports degrees');
   assert(Math.abs(fixtures.cut.cut-parseFloat(fixtures.cut.angleUI))<.15,'Cut angle matches known aligned pocket contact angle in degrees');
   assert(Math.abs(fixtures.cut.overlap-parseFloat(fixtures.cut.overlapUI))<.02,'Overlap matches existing contact readout');
   assert.deepEqual(fixtures.absent,{cut:null,overlap:null,cue:null,pocket:null},'Missing contact values remain unavailable');
   const infoDownload=page.waitForEvent('download');await page.locator('#trainerAnnotateSnapshot').click();
   await (await infoDownload).saveAs('/tmp/trainer-shot-info-contact-'+(touch?'touch':'mouse')+'.png');
   const populated=await page.evaluate(()=>{const at=window.snapshotText.lastIndexOf('Shot Info');return window.snapshotText.slice(at+1,at+25);});
   assert.equal(populated[13],fixtures.cut.overlap.toFixed(1)+'%');
   assert.equal(populated[15],fixtures.cut.cut.toFixed(1)+'°');
   assert.equal(populated[17],fixtures.cut.exit.toFixed(1)+'°');
   const pathAngles=await page.evaluate(()=>window.snapshotPathAngles);
   assert(pathAngles.includes(fixtures.cut.exit.toFixed(1)+'°'),'Dimmed path number matches live exit readout');
   assert.equal(populated[21],fixtures.cut.cue.toFixed(1)+' ♦');
   assert.equal(populated[23],fixtures.cut.pocket.toFixed(1)+' ♦');
   const live=await page.evaluate(()=>window.liveContactLabels);
   const group=live.find(card=>card.rows.length===3&&card.type==='overlap');
   assert(group,'Grouped geometry label appears on the table');
   assert.deepEqual(group.rows.map(row=>row.text),['Overlap '+fixtures.cut.overlap.toFixed(1)+'%','Cut angle '+fixtures.cut.cut.toFixed(1)+'°','Exit angle '+fixtures.cut.exit.toFixed(1)+'°']);
   assert(group.opacity>=.55&&group.opacity<=.68,'Geometry text is gently dimmed');
   await page.locator('#table3DToggle').click();await settle();
   const threeInfo=await page.evaluate(()=>{const data=billiardsTourBridge.strokeSnapshot();return {exit:data.exitDegrees,cut:data.cutDegrees,labels:window.liveContactLabels};});
   assert.equal(threeInfo.exit,fixtures.cut.exit);assert.equal(threeInfo.cut,fixtures.cut.cut);
   assert(threeInfo.labels.some(card=>card.rows.some(row=>row.text.startsWith('Exit angle '))),'3D cloth retains angle label');
   await page.screenshot({path:'/tmp/live-angle-labels-3d-'+(touch?'touch':'mouse')+'.png'});
   await page.locator('#table3DToggle').click();await settle();
   const variants=await page.evaluate(()=>{
    const saved=billiardsTourBridge.capture();
    const read=follow=>{const data=structuredClone(saved);data.state.follow=follow;data.state.sideSpin=0;billiardsTourBridge.restore(data);return billiardsTourBridge.strokeSnapshot().exitDegrees;};
    const draw=read(-.8),follow=read(.8);
    const rail=billiardsTourBridge.capture();rail.state.balls=rail.state.balls.filter(ball=>ball.id===0);rail.state.freeAim={x:rail.state.tableL,y:rail.state.tableW*.7};rail.state.speed=2;billiardsTourBridge.restore(rail);
    const info=billiardsTourBridge.strokeSnapshot(),labels=window.liveContactLabels;
    billiardsTourBridge.restore(saved);
    return {draw,follow,rail:info.exitDegrees,labels};
   });
   assert(Number.isFinite(variants.draw)&&Number.isFinite(variants.follow));
   assert(Math.abs(variants.draw-variants.follow)>1,'Exit angle changes live with follow/draw');
   assert(Number.isFinite(variants.rail),'Rail-only shot reports rebound exit angle');
   assert(!variants.labels.some(card=>card.rows.some(row=>row.text.startsWith('Rail exit '))),'Rebound omits the rail exit label on the cloth');



   await page.screenshot({ path: '/tmp/trainer-annotations-' + (touch ? 'touch' : 'mouse') + '.png' });
   assert.deepEqual(errors, []);
   console.log((touch ? 'Touch' : 'Mouse') + ': corner resize/rotate, inline edit, undo, 2D/3D drag, lock/play, persistence, three snapshot modes, exported stroke values and active Shot 2, Shot Info rows, centered labels, alternating rows, live overlap/cut/exit labels, follow/draw response, rail rebound and diamond arrivals passed.');
   await context.close();
  }
 } finally {
  await browser?.close();
  server.kill();
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
