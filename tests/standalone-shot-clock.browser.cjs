'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright'),{createHost}=require('../local-host/server.cjs'),E=require('../play-engine'),M=require('../play-shot-clock');
(async()=>{
 const service=createHost({port:0,bind:'127.0.0.1',addressProvider:()=>['127.0.0.1']}),{port}=await service.listen(),base='http://127.0.0.1:'+port;let browser;
 try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH});
  const context=await browser.newContext({viewport:{width:1366,height:768},serviceWorkers:'block'});
  const savedGame={version:2,state:E.create({game:'saboteur',mode:'real',names:['Alex','Blair','Casey','Drew'],seed:42}),history:[]};
  await context.addInitScript(data=>{
   window.BilliardsWindowsHostAvailable=true;window.BilliardsWindowsFullscreen=true;window.chrome={webview:{postMessage(){}}};
   if(!localStorage.getItem('standalone-clock-test')){localStorage.setItem('billiardsPlaySession-v1',JSON.stringify(data.game));localStorage.setItem('billiardsPlayShotClock-v1',JSON.stringify(data.clock));localStorage.setItem('standalone-clock-test','1');}
  },{game:savedGame,clock:{settings:M.profile({players:'table'}),session:M.initial(3)}});
  const page=await context.newPage(),errors=[];page.setDefaultTimeout(15000);page.on('pageerror',error=>errors.push(error.message));
  const savedClock=()=>page.evaluate(()=>localStorage.getItem('billiardsPlayShotClock-v1'));
  await page.goto(base+'/play.html');const gameBefore=await page.evaluate(()=>localStorage.getItem('billiardsPlaySession-v1'));
  await page.locator('.play-home-footer').getByRole('button',{name:'Tools',exact:true}).click();await page.locator('.play-tools-clock').getByRole('button',{name:'Shot Clock',exact:true}).click();
  assert.equal(await page.locator('.sc-player').count(),2);assert.equal(await page.locator('.sc-seat-list').count(),0,'No imported four-player selector');
  assert.deepEqual(await page.locator('.sc-player-header button').allTextContents(),['Player 1','Player 2']);
  assert.equal(await page.evaluate(()=>localStorage.getItem('billiardsPlaySession-v1')),gameBefore,'Clock opening does not save or alter the active game');
  await page.getByRole('button',{name:'Switch Player',exact:true}).click();assert.equal(JSON.parse(await savedClock()).session.turn,1);
  await page.getByRole('button',{name:'Switch Player',exact:true}).click();assert.equal(JSON.parse(await savedClock()).session.turn,0,'Switch cycles through two players only');
  await page.locator('.sc-footer > .sc-start').click();await page.locator('.sc-footer > .sc-pause').click();const paused=await savedClock();assert.equal(JSON.parse(paused).session.shot.status,'paused');
  assert.equal(await page.evaluate(()=>localStorage.getItem('billiardsPlaySession-v1')),gameBefore,'Clock actions leave game data untouched');
  await page.locator('.sc-navigation .sc-back').click();await page.locator('.play-home-footer').getByRole('button',{name:'All 20 games',exact:true}).click();await page.locator('.play-game-tile[data-game=killer]').click();await page.locator('#playSetupNames').fill('One, Two, Three, Four');await page.locator('#playSetupNames').press('Enter');
  assert.equal(await savedClock(),paused,'Starting another game does not reset the clock');
  await page.evaluate(()=>{billiardsPlayInput.dispatch({type:'ready'});billiardsPlayInput.dispatch({type:'miss'});billiardsPlayInput.dispatch({type:'pause'});billiardsPlayInput.dispatch({type:'undo'});});
  assert.equal(await savedClock(),paused,'Game turns, pause and Undo do not change the clock');
  await page.goto(base+'/shot-clock.html');assert.equal(await page.locator('.sc-player').count(),2);assert.deepEqual(await page.locator('.sc-player-header button').allTextContents(),['Player 1','Player 2']);
  const retained=JSON.parse(await savedClock()),beforeNavigation=JSON.parse(paused);assert.deepEqual(retained.session.shot,beforeNavigation.session.shot,'Standalone page retains its paused shot');assert.equal(retained.session.turn,beforeNavigation.session.turn);assert.deepEqual(retained.settings,beforeNavigation.settings);assert(retained.session.match.elapsed>=beforeNavigation.session.match.elapsed,'Independent match stopwatch can advance until page exit');
  fs.mkdirSync('test-results/ball-controls',{recursive:true});await page.screenshot({path:'test-results/ball-controls/standalone-two-player-clock.png'});
  assert.deepEqual(errors,[]);await context.close();console.log('Standalone clock: two players, old player-3 recovery, no game inheritance/mutation/reset/synchronization, persistent timer passed');
 }finally{await browser?.close();service.server.closeAllConnections();await new Promise(resolve=>service.server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
