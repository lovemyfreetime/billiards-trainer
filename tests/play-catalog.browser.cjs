const {chromium}=require('playwright'),assert=require('node:assert/strict'),cp=require('node:child_process'),E=require('../play-engine');
const server=cp.spawn('python3',['-u','-m','http.server','8782','--bind','127.0.0.1'],{stdio:['ignore','pipe','pipe']});
(async()=>{await new Promise((r,j)=>{server.stdout.once('data',r);server.once('exit',()=>j(Error('Server failed')));});const b=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});try{const p=await b.newPage({serviceWorkers:'block',viewport:{width:1440,height:960}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:8782/?play=1');
async function setup(id,mode){if(!await p.locator('#playDialog[open]').count())await p.locator('#playNew').click();await p.locator('#playDialog').getByRole('button',{name:new RegExp('^'+E.games[id].name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))}).click();if(await p.locator('#playCatalogStart').isVisible())await p.locator('#playCatalogStart').click();await p.locator('#playDialog button[type=submit]').click();}
async function status(){return p.evaluate(()=>billiardsPlayStatus());}
async function ready(){if((await status()).phase==='placement')await p.locator('#playActions .play-primary').first().click();}
for(const id of Object.keys(require('../play-catalog').games)){
 console.log('Checking '+id);for(const mode of ['real']){
 await setup(id,mode);
 if(id==='battleship'){for(let i=0;i<2;i++){await p.getByRole('button',{name:'Place & lock your fleet privately',exact:true}).click();assert.equal(await p.locator('#playDialog .play-grid').count(),0);await p.getByRole('button',{name:'Reveal privately',exact:true}).click();await p.getByRole('button',{name:'Lock fleet & hide',exact:true}).click();}}
 if(['bingo','horse'].includes(id))await p.locator('#playModule .play-grid button').first().click();await ready();
 assert.equal((await status()).game,id);assert.equal((await status()).phase,'ready');
 if(mode==='real'){
 if(id==='speed'){await p.getByRole('button',{name:'Start timed run',exact:true}).click();await p.getByRole('button',{name:'Foul · +10 seconds',exact:true}).click();await p.getByRole('button',{name:'Finish run',exact:true}).click();}
 else await p.getByRole('button',{name:'Miss',exact:true}).click();
 assert.equal(await p.locator('#playUndo').isEnabled(),true);await p.locator('#playUndo').click();assert.equal((await status()).phase,'ready');
 }
 }
}
// Real private number never appears until explicit reveal.
await setup('kelly','real');await ready();await p.getByRole('button',{name:'Private view · Player 1',exact:true}).click();assert.equal(await p.getByText(/Your target:/).count(),0);await p.getByRole('button',{name:'Reveal privately',exact:true}).click();assert.equal(await p.getByText(/Your target:/).count(),1);await p.getByRole('button',{name:'Hide private view',exact:true}).click();assert.equal(await p.getByText(/Your target:/).count(),0);
assert.equal(await p.locator('#playRoot canvas').count(),0);
await p.evaluate(async()=>{if(document.fullscreenElement)await document.exitFullscreen();});await p.setViewportSize({width:412,height:915});await p.screenshot({path:'/tmp/play-catalog-phone.png'});assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await p.locator('#playNew').click();assert.equal(await p.locator('.play-game-grid button').count(),20);await p.screenshot({path:'/tmp/play-catalog-games.png'});assert.deepEqual(errors,[]);console.log('Browser: all 16 new games as real-table scorekeepers, private fleets/numbers, Undo, no simulated table, and phone catalog passed.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>server.kill());
