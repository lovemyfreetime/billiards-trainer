const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('experience-menu.js','utf8');
function build(current,path){
 const node=()=>({addEventListener(){},children:[],style:{},dataset:{},classList:{add(){}},setAttribute(k,v){this[k]=v},append(...items){this.children.push(...items)},appendChild(item){this.children.push(item)}});
 const ctx={URL,location:{href:'https://example.org/billiards-trainer/'+path},window:{},document:{createElement:node,addEventListener(){}}};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx.window.BilliardsExperienceMenu({current}).children[1].children;
}
for(const [mode,path,expected] of [['train','?train=1',['zen','play']],['play','play.html',['zen','train']],['zen','?zen=1',['train','play']]]){
 const links=build(mode,path);assert.deepEqual(links.map(a=>a.dataset.experience),expected);
 for(const a of links){const u=new URL(a.href);assert(u.pathname.startsWith('/billiards-trainer/'));if(a.dataset.experience==='train'){assert.equal(u.search,'?train=1');assert.equal(u.pathname,'/billiards-trainer/');}if(a.dataset.experience==='zen'){assert.equal(u.search,'?zen=1');assert.equal(u.pathname,'/billiards-trainer/');}if(a.dataset.experience==='play'){assert.equal(u.search,'');assert.equal(u.pathname,'/billiards-trainer/play.html');}}
}
const welcome=fs.readFileSync('welcome.html','utf8');assert.deepEqual([...welcome.matchAll(/<a href="([^"]+)" aria-label="Open ([^"]+)"/g)].map(m=>[m[2],m[1]]),[['Zen','./?zen=1'],['Trainer','./?train=1'],['Play','./play.html']]);
const index=fs.readFileSync('index.html','utf8'),entry=index.match(/<script>(if\(!location.search[^<]+)<\/script>/)[1];
for(const [search,hash,redirect] of [['','',true],['?train=1','',false],['?zen=1','',false],['?play=1','',false],['?projector=1','',false],['','#saved',false]]){let url=null;const location={href:'https://example.org/billiards-trainer/'+search+hash,search,hash,replace:u=>url=u};vm.runInNewContext(entry,{URL,location});assert.equal(!!url,redirect);if(redirect)assert.equal(url,'https://example.org/billiards-trainer/welcome.html');}
const sw=fs.readFileSync('service-worker.js','utf8'),ctx={URL,self:{addEventListener(){}}};vm.createContext(ctx);vm.runInContext(sw,ctx);for(const [path,shell] of [['welcome.html','welcome.html'],['play.html?play=1','play.html'],['?train=1','index.html'],['?zen=1','index.html'],['','index.html']])assert.equal(ctx.navigationShell('https://example.org/billiards-trainer/'+path),'./'+shell);
for(const asset of [...sw.split("self.addEventListener")[0].matchAll(/'\.\/([^']+)'/g)].map(m=>m[1].split('?')[0]))assert(fs.existsSync(asset),asset);
console.log('Entry order, all mode-switch orders, GitHub Pages subpath links, direct-mode routing, and separate offline page shells pass.');

for(const label of ['Zen','Trainer','Play']){assert(welcome.includes('aria-label="About '+label+'"'));const key=label.toLowerCase(),installer=fs.readFileSync('install/index.html','utf8');const paragraph=installer.match(new RegExp('<article class="card experience-card experience-'+key+'">[\\s\\S]*?<p>([\\s\\S]*?)</p>'))[1];assert(welcome.includes('<p>'+paragraph+'</p>'),'About '+label+' matches installer wording');}
const early=index.indexOf("classList.add('zen-starting')");assert(early>0&&early<index.indexOf('<body>'));assert(index.includes('html.zen-starting body{visibility:hidden!important}'));assert(fs.readFileSync('zen-mode.js','utf8').includes("requestAnimationFrame(()=>requestAnimationFrame(()=>document.documentElement.classList.remove('zen-starting')))"));
console.log('About controls match installer copy; Zen is hidden before body parsing and revealed after layout frames.');
