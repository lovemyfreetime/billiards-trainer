// Exercise real browser fullscreen, modal controls, navigation, and compact layout.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const root=path.resolve(__dirname,'..');const server=require('node:http').createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(file===root)file=path.join(root,'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'})[path.extname(file)]||'application/octet-stream');const s=fs.createReadStream(file);s.on('error',()=>res.writeHead(404).end());s.pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));server.unref();
 const browser=await chromium.launch({headless:true,...(process.env.DISPLAY_CHROMIUM_PATH?{executablePath:process.env.DISPLAY_CHROMIUM_PATH}:{}),args:JSON.parse(process.env.DISPLAY_CHROMIUM_ARGS||'[]')});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),base='http://127.0.0.1:'+server.address().port,errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/play.html');await page.locator('#playDialog[open]').waitFor();
 const link=page.locator('#playDialog .play-catalog-nav').getByRole('link',{name:'Tournament Play',exact:true});await link.waitFor();assert.equal(await link.getAttribute('href'),'./tournament.html');assert.equal(await page.locator('.play-header .play-tournament-link').count(),0);
 assert(await page.locator('#playDialog .play-catalog-nav').getByRole('button',{name:/Local table/i}).count());
 assert.equal(await page.locator('.play-title-color').evaluate(e=>getComputedStyle(e).color),'rgb(96, 211, 148)');
 await page.getByRole('button',{name:'Screen options',exact:true}).click();await page.getByRole('button',{name:'Enter fullscreen',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);
 assert(await page.locator('#playDialog').evaluate(e=>e.open),'Games remains above fullscreen root');
 await page.getByRole('button',{name:'Screen options',exact:true}).click();await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
 await page.locator('#playCatalogStart').click();assert.equal(await page.evaluate(()=>!!document.fullscreenElement),false,'Explicit exit is respected');
 await page.goto(base+'/play.html');await page.locator('#playCatalogStart').click();await page.waitForFunction(()=>!!document.fullscreenElement);assert(await page.locator('#playDialog').evaluate(e=>e.open));await page.evaluate(()=>document.exitFullscreen());
 await page.goto(base+'/?train=1');await page.locator('.trainer-title-color').waitFor();assert.equal(await page.locator('.trainer-title-color').evaluate(e=>getComputedStyle(e).color),'rgb(119, 200, 255)');
 await page.locator('#btg-fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.locator('#btg-fullscreen').click();await page.waitForFunction(()=>!document.fullscreenElement);
 await page.goto(base+'/?zen=1');await page.locator('body.zen-mode').waitFor();await page.getByRole('button',{name:'Screen options',exact:true}).click();await page.getByRole('button',{name:'Enter fullscreen',exact:true}).click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.getByRole('button',{name:'Screen options',exact:true}).click();await page.getByRole('button',{name:'Exit fullscreen',exact:true}).click();await page.waitForFunction(()=>!document.fullscreenElement);
 const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await mobile.goto(base+'/play.html');await mobile.locator('#playDialog .play-catalog-nav .play-tournament-link').scrollIntoViewIfNeeded();const fits=await mobile.locator('#playDialog .play-catalog-nav').evaluate(e=>e.scrollWidth<=e.clientWidth+1);assert(fits,'Bottom navigation fits a phone');
 await mobile.screenshot({path:'/tmp/tournament-play-phone.png',fullPage:true});await page.goto(base+'/play.html');await page.screenshot({path:'/tmp/tournament-play-desktop.png',fullPage:true});
 // A browser without Fullscreen API gives an install hint instead of claiming success.
 await page.evaluate(()=>{document.documentElement.requestFullscreen=undefined;document.documentElement.webkitRequestFullscreen=undefined;});await page.getByRole('button',{name:'Screen options',exact:true}).click();await page.getByRole('button',{name:'Enter fullscreen',exact:true}).click();await page.getByText(/For a view without browser bars/).waitFor();assert.equal(await page.evaluate(()=>window.BilliardsDisplay.active()),false);
 assert.deepEqual(errors,[]);console.log('Display colors, bottom Tournament Play links, real fullscreen/exit, no forced re-entry, Trainer/Zen controls, mobile fit, and unsupported-browser fallback passed.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
