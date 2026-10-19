/* Billiards Play local host. No cloud, accounts, CDN or external requests. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const QR=require('qrcode'),E=require('../play-engine.js'),C=require('../play-catalog.js');
const ROOT=path.resolve(__dirname,'..'),secret=()=>crypto.randomBytes(24).toString('base64url');
const loopback=ip=>['127.0.0.1','::1','::ffff:127.0.0.1'].includes(ip);
function privateIP(ip){ip=ip.replace(/^::ffff:/,'');return loopback(ip)||/^10\./.test(ip)||/^192\.168\./.test(ip)||/^172\.(1[6-9]|2\d|3[01])\./.test(ip)||/^169\.254\./.test(ip);}
function addresses(){try{return [...new Set(Object.values(os.networkInterfaces()).flat().filter(i=>i&&i.family==='IPv4'&&!i.internal&&privateIP(i.address)).map(i=>i.address))];}catch{return [];}}
function actor(s){return s.phase==='vote'?s.voteSeat:s.active;}
function actions(s,seat){if(s.localPaused)return [];if(seat!==actor(s)||s.phase==='result')return [];if(s.game==='poker'&&s.phase==='choose')return ['choose'];if(s.phase==='vote')return ['vote'];if(s.phase==='fleet')return ['fleet-shuffle','fleet-lock'];if(s.game==='blackjack'&&s.phase==='ready')return ['stand'];return [];}
function view(s,seat){
 if(!s)return null;
 const current=actor(s);
 const eligible=s.players.map((p,i)=>({p,i})).filter(({p})=>!(s.game==='killer'&&p.lives<=0)&&!(s.game==='horse'&&p.letters>=5)),next=eligible.find(({i})=>i>current)?.i??eligible[0]?.i??current;
 const players=s.players.map((p,i)=>({id:i,name:p.name,stat:C.games[s.game]?C.stat(s,i):s.game==='killer'?`${p.lives} lives`:s.game==='poker'?`${p.hand.length} cards`:s.game==='ghost'?`${s.points?.[0]||0} – ${s.points?.[1]||0}`:`Balls ${i*5+1}–${i*5+5}`}));
 const p=s.players[seat],personal={};
 if(p){
  if(['poker','blackjack'].includes(s.game))personal.hand=(p.hand||[]).map(E.cardLabel);
  if(s.game==='poker'&&s.active===seat&&s.phase==='choose')personal.choices=s.pending.map(E.cardLabel);
  if(['kelly','bounty'].includes(s.game))personal.target=p.target;
  if(s.game==='saboteur')personal.role=seat===s.saboteur?'Saboteur':'Crew';
  if(s.game==='battleship'){personal.fleet=[...p.fleet];personal.attacks=(p.attacks||[]).map(cell=>({cell,hit:s.players[1-seat].fleet.includes(cell)}));}
  if(s.game==='blackjack')personal.total=C.total(p.hand);
 }
 return {game:s.game,paused:!!s.localPaused,name:E.games[s.game].name,rules:E.games[s.game].rules,phase:s.phase,round:s.round,rack:s.rack,shots:s.shots,active:current,next,players,last:s.last,result:s.result?{text:s.result.text}:null,you:seat,private:personal,actions:p?actions(s,seat):[]};
}
function createHost({port=8788,bind='0.0.0.0',hostToken=secret(),addressProvider=addresses}={}){
 let invite=secret(),revision=0,state=null,match=0,lastHost=Date.now();const members=new Map(),queue=[],rates=new Map(),snapshots=new Set();let actualPort=port;
 const hosts=new Set(['127.0.0.1','localhost',...addressProvider()]);
 function fail(status,message){throw Object.assign(new Error(message),{status});}
 function send(res,status,obj){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(obj));}
 function bearer(req){return (req.headers.authorization||'').replace(/^Bearer /,'');}
 function admin(req){if(!loopback(req.socket.remoteAddress)||bearer(req)!==hostToken)fail(403,'Host access required.');lastHost=Date.now();}
 function member(req){const token=bearer(req);for(const m of members.values())if(m.token===token&&!m.revoked){m.seen=Date.now();return m;}fail(401,'Rejoin this table.');}
 async function body(req){if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Use JSON.');let raw='';for await(const b of req){raw+=b;if(Buffer.byteLength(raw)>128*1024)fail(413,'Request too large.');}try{return JSON.parse(raw);}catch{fail(400,'Invalid request.');}}
 function limited(req){const ip=req.socket.remoteAddress,now=Date.now(),r=rates.get(ip)||{time:now,n:0};if(now-r.time>60000){r.time=now;r.n=0;}if(++r.n>12)fail(429,'Please wait before joining again.');rates.set(ip,r);}
 const files=new Map([
 ['/join','local-host/player.html'],['/','local-host/player.html'],['/player.js','local-host/player.js'],['/player.css','local-host/player.css'],
 ...['play.html','play-mode.js','play-mode.css','play-engine.js','play-catalog.js','play-presentation.js','play-viewport.js','experience-menu.js','experience-menu.css','local-session.js','local-session.css','icons/icon-192.png','icons/play-experience-v1.webp','icons/trainer-original-execute-v2.svg'].map(f=>['/'+f,f])]);
 const server=http.createServer(async(req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; form-action 'self'");
  try{
   if(!privateIP(req.socket.remoteAddress))fail(403,'Local network only.');
   const url=new URL(req.url,'http://127.0.0.1'),authority=req.headers.host||'';
   if(!hosts.has(authority.split(':')[0])||authority.split(':')[1]!==String(actualPort))fail(403,'Unknown host address.');
   if(req.headers.origin&&req.headers.origin!=='http://'+authority)fail(403,'Open this table directly.');
   const route=url.pathname;
   if(route==='/api/join'&&req.method==='POST'){
    limited(req);const b=await body(req);if(b.invite!==invite)fail(403,'This invitation has expired. Ask the host for a new QR code.');
    if(members.size>=32)fail(409,'This table has reached its joining limit.');
    const name=String(b.name||'').trim().slice(0,28);if(!name)fail(400,'Enter your name.');
    const m={id:secret(),token:secret(),name,seat:null,seen:Date.now(),revoked:false};members.set(m.id,m);send(res,201,{token:m.token});return;
   }
   if(route==='/api/player'&&req.method==='GET'){
    const m=member(req);send(res,200,{name:m.name,approved:m.seat!==null,revision,match,hostOnline:Date.now()-lastHost<12000,view:m.seat===null?null:view(state,m.seat)});return;
   }
   if(route==='/api/action'&&req.method==='POST'){
    const m=member(req),b=await body(req);if(!state||m.seat===null||!actions(state,m.seat).includes(b.type))fail(403,'That action is not available for your seat.');
    if(b.revision!==revision||queue.some(e=>e.revision===revision))fail(409,'The table changed. Please wait for an update.');
    const event={type:b.type};if(b.type==='choose'){if(![0,1].includes(b.index))fail(400,'Choose a card.');event.index=b.index;}
    if(b.type==='vote'){if(!Number.isInteger(b.index)||b.index< -1||b.index>=state.players.length)fail(400,'Choose a player.');event.index=b.index;}
    queue.push({id:secret(),memberId:m.id,seat:m.seat,revision,match,event});send(res,202,{accepted:true});return;
   }
   if(route.startsWith('/api/host')){
    admin(req);
    if(route==='/api/host'&&req.method==='GET'){
     send(res,200,{revision,match,invite,urls:addressProvider().map(ip=>`http://${ip}:${actualPort}/join#invite=${invite}`),members:[...members.values()].filter(m=>!m.revoked).map(({id,name,seat,seen})=>({id,name,seat,online:Date.now()-seen<10000})),players:state?.players.map((p,i)=>({id:i,name:p.name}))||[],events:[...queue]});return;
    }
    if(route==='/api/host/qr'&&req.method==='POST'){
     const b=await body(req),u=new URL(b.url);if(!hosts.has(u.hostname)||u.port!==String(actualPort)||u.pathname!=='/join'||u.hash!=='#invite='+invite)fail(400,'Choose a local address.');send(res,200,{image:await QR.toDataURL(u.href,{width:320,margin:2,errorCorrectionLevel:'M'})});return;
    }
    if(route==='/api/host/state'&&req.method==='POST'){
     const b=await body(req);if(b.id&&snapshots.has(b.id)){send(res,200,{revision,match});return;}const s=b.state;if(!s||!E.games[s.game]||!Array.isArray(s.players)||s.players.length<E.games[s.game].min||s.players.length>E.games[s.game].max||!s.players.every(p=>typeof p.name==='string'&&p.name.length<=28)||!Number.isInteger(s.active)||!s.players[s.active])fail(400,'Invalid game snapshot.');
     if(b.newGame){match++;for(const m of members.values())m.seat=null;queue.length=0;}
     state=s;revision++;if(typeof b.id==='string'){snapshots.add(b.id);if(snapshots.size>256)snapshots.delete(snapshots.values().next().value);}for(let i=queue.length-1;i>=0;i--)if((b.ack||[]).includes(queue[i].id)||queue[i].revision<revision)queue.splice(i,1);send(res,200,{revision,match});return;
    }
    if(route==='/api/host/seat'&&req.method==='POST'){
     const b=await body(req),m=members.get(b.id);if(!m||m.revoked)fail(404,'Player not found.');if(b.seat!==null&&(!state?.players[b.seat]||!Number.isInteger(b.seat)))fail(400,'Choose a seat.');
     if(b.seat!==null&&[...members.values()].some(other=>other!==m&&!other.revoked&&other.seat===b.seat))fail(409,'That seat is already assigned.');m.seat=b.seat;for(let i=queue.length-1;i>=0;i--)if(queue[i].memberId===m.id)queue.splice(i,1);send(res,200,{ok:true});return;
    }
    if(route==='/api/host/remove'&&req.method==='POST'){
     const b=await body(req),m=members.get(b.id);if(m)m.revoked=true;for(let i=queue.length-1;i>=0;i--)if(queue[i].memberId===b.id)queue.splice(i,1);send(res,200,{ok:true});return;
    }
    if(route==='/api/host/end'&&req.method==='POST'){
     await body(req);members.clear();queue.length=0;invite=secret();state=null;match++;revision++;send(res,200,{ok:true});return;
    }
    if(route==='/api/host/ack'&&req.method==='POST'){
     const b=await body(req);for(let i=queue.length-1;i>=0;i--)if((b.ids||[]).includes(queue[i].id))queue.splice(i,1);send(res,200,{ok:true});return;
    }
    fail(404,'Not found.');
   }
   if(req.method!=='GET')fail(405,'Method not allowed.');
   const file=files.get(route);if(!file)fail(404,'Not found.');
   if(!['/join','/','/player.js','/player.css','/icons/icon-192.png'].includes(route)&&!loopback(req.socket.remoteAddress))fail(403,'Open the player invitation on this device.');
   const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime});fs.createReadStream(path.join(ROOT,file)).pipe(res);
  }catch(err){if(!res.headersSent)send(res,err.status||500,{error:err.status?err.message:'The local table could not complete that request.'});else res.end();}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;
 return {server,hostToken,listen:()=>new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,bind,()=>{actualPort=server.address().port;resolve({port:actualPort,hostUrl:`http://127.0.0.1:${actualPort}/play.html#host=${hostToken}`});});})};
}
module.exports={createHost,view,actions};
if(require.main===module){const h=createHost({port:Number(process.env.BILLIARDS_LOCAL_PORT||8788)});h.listen().then(info=>{console.log(JSON.stringify(info));if(!process.argv.includes('--machine'))console.log('Open hostUrl on this computer. Keep it private. Players join the QR shown under Local table. Press Ctrl+C to stop.');}).catch(err=>{console.error(err.code==='EADDRINUSE'?'Port 8788 is already in use. Close the other local host first.':err.message);process.exitCode=1;});}
