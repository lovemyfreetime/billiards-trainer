const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),E=require('../play-engine');
const server=cp.spawn('python3',['-u','-m','http.server','8782','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{await new Promise((r,j)=>{server.stdout.once('data',r);server.once('exit',()=>j(Error('Server failed')));});const b=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{const p=await b.newPage({serviceWorkers:'block',viewport:{width:1440,height:960}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8782/?play=1');
async function setup(id,mode){if(!await p.locator('#playDialog[open]').count())await p.locator('#playNew').click();await p.locator('#playDialog').getByRole('button',{name:new RegExp('^'+E.games[id].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();await p.locator('#playCatalogStart').click();await p.locator('#playSetupMode').selectOption(mode);await p.locator('#playDialog button[type=submit]').click();}
async function status(){return p.evaluate(()=>billiardsPlayStatus());}
async function ready(){if((await status()).phase==='placement')await p.locator('#playActions .play-primary').first().click();}
for(const id of Object.keys(require('../play-catalog').games)){
 console.log('Checking '+id);for(const mode of ['real','screen']){
 await setup(id,mode);
 if(id==='battleship'){for(let i=0;i<2;i++){await p.getByRole('button',{name:'Place & lock your fleet privately',exact:true}).click();assert.equal(await p.locator('#playDialog .play-grid').count(),0);await p.getByRole('button',{name:'Reveal privately',exact:true}).click();await p.getByRole('button',{name:'Lock fleet & hide',exact:true}).click();}}
 if(['bingo','horse'].includes(id))await p.locator('#playModule .play-grid button').first().click();await ready();
 assert.equal((await status()).game,id);assert.equal((await status()).phase,'ready');
 if(mode==='real'){
 if(id==='speed'){await p.getByRole('button',{name:'Start timed run',exact:true}).click();await p.getByRole('button',{name:'Foul · +10 seconds',exact:true}).click();await p.getByRole('button',{name:'Finish run',exact:true}).click();}
 else await p.getByRole('button',{name:'Miss',exact:true}).click();
 assert.equal(await p.locator('#playUndo').isEnabled(),true);await p.locator('#playUndo').click();assert.equal((await status()).phase,'ready');
 }else {assert.equal(await p.getByRole('button',{name:'Execute Shot',exact:true}).isVisible(),true);await p.locator('#playExpand').click();assert(await p.locator('#playRoot').evaluate(el=>el.classList.contains('play-table-expanded')));await p.locator('#playExpand').click();}
 }
}
// Real private number never appears until explicit reveal.
await setup('kelly','real');await ready();await p.getByRole('button',{name:'Private view · Player 1',exact:true}).click();assert.equal(await p.getByText(/Your target:/).count(),0);await p.getByRole('button',{name:'Reveal privately',exact:true}).click();assert.equal(await p.getByText(/Your target:/).count(),1);await p.getByRole('button',{name:'Hide private view',exact:true}).click();assert.equal(await p.getByText(/Your target:/).count(),0);
// Solver reports a pocket identifier, including an actual challenge pot.
await setup('golf','screen');await ready();await p.evaluate(()=>{const s=billiardsPlayBridge.capture(),L=s.tableL,W=s.tableW;s.balls=[{id:0,n:'CB',x:L/2,y:W*.6,active:true},{id:1,n:'1',x:L/2,y:W*.2,active:true}];s.freeAim={x:L/2,y:0};s.speed=1.8;billiardsPlayBridge.restore(s);window.lastPlayShot=null;window.addEventListener('billiards:shot-complete',e=>window.lastPlayShot=e.detail,{once:true});});await p.getByRole('button',{name:'Execute Shot',exact:true}).click();await p.waitForFunction(()=>window.lastPlayShot,{timeout:20000});const shot=await p.evaluate(()=>lastPlayShot);assert(shot.pockets.some(h=>h.id===1&&h.pocket==='TM'));assert.equal((await status()).phase,'placement');await p.locator('#playUndo').click();assert.equal((await status()).shots,0);
await p.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});await p.setViewportSize({width:412,height:915});await p.screenshot({path:'/tmp/play-catalog-phone.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#playNew').click();assert.equal(await p.locator('.play-game-grid button').count(),20);await p.screenshot({path:'/tmp/play-catalog-games.png'});assert.deepEqual(errors,[]);console.log('Browser: all 16 new games in both modes, private fleets/numbers, Undo, expansion, actual solver pocket detection, and phone catalog passed.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
