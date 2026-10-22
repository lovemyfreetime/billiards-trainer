'use strict';
// Independent protocol implementation for a local development session.
// Windows credentials persist only under current-user DPAPI protection.
const crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const ISSUER='https://auth.openai.com',RESOURCE='https://api.openai.com/v1';
const random=()=>crypto.randomBytes(32).toString('base64url');
async function remote(url,options={}){const r=await fetch(url,{...options,redirect:'error',signal:options.signal||AbortSignal.timeout(25000)});if(!r.ok)throw Error(r.status===429?'ChatGPT usage is currently limited. Check Manage usage.':'ChatGPT could not complete the connection. Try signing in again.');return r;}
function verifyIdentity(token,keys,{clientId,nonce,subject,now=Date.now()}){
 if(typeof token!=='string'||token.length>50000)throw Error('Invalid sign-in identity.');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid sign-in identity.');
 const header=JSON.parse(Buffer.from(parts[0],'base64url')),p=JSON.parse(Buffer.from(parts[1],'base64url'));
 const key=keys.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256')&&(!k.use||k.use==='sig'));
 const audience=typeof p.aud==='string'?[p.aud]:p.aud;
 if(header.alg!=='RS256'||header.crit||!key||!Array.isArray(audience)||!audience.includes(clientId)||p.iss!==ISSUER||typeof p.sub!=='string'||!p.sub||!Number.isFinite(p.exp)||p.exp*1000<now-5000||!Number.isFinite(p.iat)||p.iat*1000>now+5000||(p.nbf!==undefined&&(!Number.isFinite(p.nbf)||p.nbf*1000>now+5000))||p.nonce!==nonce||(p.azp!==undefined&&p.azp!==clientId)||(audience.length>1&&p.azp!==clientId)||(subject&&p.sub!==subject))throw Error('The ChatGPT identity could not be verified.');
 if(!crypto.verify('RSA-SHA256',Buffer.from(parts[0]+'.'+parts[1]),crypto.createPublicKey({key,format:'jwk'}),Buffer.from(parts[2],'base64url')))throw Error('The ChatGPT identity signature is invalid.');
 return {subject:p.sub,name:typeof p.name==='string'?p.name:'',email:typeof p.email==='string'?p.email:''};
}
function createAuth({origin,metadataDir=path.join(os.homedir(),'.config','billiards-companion-development'),fetchRemote=remote,credentialStore}={}){
 let metadata,active=null,pending=null,discovery,loaded=false,renewing=null,generation=0,rememberError='';
 const store=credentialStore||require('./credential-store.cjs').createCredentialStore(metadataDir);
 const file=path.join(metadataDir,'registration.json');
 function loadMetadata(){if(metadata)return metadata;fs.mkdirSync(metadataDir,{recursive:true,mode:0o700});try{metadata=JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('The local ChatGPT registration metadata could not be read.');metadata={hostId:'urn:uuid:'+crypto.randomUUID()};writeMetadata();}if(!/^urn:uuid:[a-f0-9-]{36}$/.test(metadata.hostId))throw Error('Invalid local host identifier.');return metadata;}
 function writeMetadata(){const tmp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(tmp,JSON.stringify(metadata),{mode:0o600});fs.renameSync(tmp,file);}
 async function configuration(){if(discovery)return discovery;const r=await fetchRemote(ISSUER+'/.well-known/openid-configuration');const c=await r.json();if(c.issuer!==ISSUER)throw Error('Unverified sign-in configuration.');for(const k of ['authorization_endpoint','token_endpoint','jwks_uri'])if(typeof c[k]!=='string'||new URL(c[k]).origin!==ISSUER)throw Error('Unverified sign-in endpoint.');discovery=c;return c;}
 function session(){const valid=active&&active.expiresAt>Date.now();return {connected:!!valid,sharing:!!valid&&active.sharing,identity:valid?active.identity:undefined,remembered:!!active?.remembered,rememberMessage:rememberError||(active?.remembered?'Sign-in saved with Windows protection. Reconnects automatically.':store.supported?'Sign in once to remember this account securely on Windows.':'Remembered sign-in is currently available on Windows. This session stays connected until the server closes.')};}
 function access(){if(!session().sharing)throw Object.assign(Error('Sign in with ChatGPT and allow plan usage before sending.'),{status:401});return active.token;}
 function bound(saved){const m=loadMetadata();return saved&&saved.clientId===m.clientId&&saved.subject===m.subject&&saved.hostId===m.hostId&&typeof saved.token==='string'&&Number.isFinite(saved.expiresAt)&&typeof saved.refreshToken==='string';}
 async function persistActive(){
  if(!active||!store.supported)return;try{active.remembered=store.write({...active,clientId:metadata.clientId,subject:metadata.subject,hostId:metadata.hostId});rememberError='';}catch{active.remembered=false;rememberError='Connected, but Windows could not save this sign-in. It will last only for this server session.';}
 }
 async function ensureAccess(){
  if(renewing)return renewing;const epoch=generation;
  renewing=(async()=>{
   if(!loaded){loaded=true;try{const saved=store.read();if(bound(saved))active={...saved,remembered:true};}catch{rememberError='Saved sign-in could not be unlocked. Continue with ChatGPT to reconnect.';}}
   if(active&&active.expiresAt>Date.now()+60000)return;
   if(!active?.refreshToken)return;
   await store.withLock(async()=>{
    if(epoch!==generation)return;const saved=store.read();if(bound(saved))active={...saved,remembered:true};
    if(active.expiresAt>Date.now()+60000)return;
    const c=await configuration(),r=await fetchRemote(c.token_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:metadata.clientId,refresh_token:active.refreshToken,resource:RESOURCE})}),t=await r.json();
    if(epoch!==generation)return;
    if(!r.ok||typeof t.access_token!=='string'||!t.access_token||typeof t.refresh_token!=='string'||!t.refresh_token||String(t.token_type).toLowerCase()!=='bearer'||!Number.isFinite(t.expires_in)||t.expires_in<=0)throw Error('ChatGPT needs authorization again.');
    active={...active,token:t.access_token,refreshToken:t.refresh_token,expiresAt:Date.now()+t.expires_in*1000,sharing:typeof t.scope==='string'?t.scope.split(/\s+/).includes('chatgpt.tokens.use.direct'):active.sharing};await persistActive();
   });
  })().catch(()=>{rememberError='Automatic reconnect could not finish. Try again, or Continue with ChatGPT to renew authorization.';}).finally(()=>{renewing=null;});return renewing;
 }
 async function signIn(){if(pending&&pending.expiresAt>Date.now())throw Error('A sign-in is already in progress. Finish it or wait a few minutes.');const m=loadMetadata(),c=await configuration();const clientId=m.clientId||'dynamic_agent_client';pending={state:random(),nonce:random(),verifier:random(),clientId,expiresAt:Date.now()+10*60000};const u=new URL(c.authorization_endpoint);u.search=new URLSearchParams({client_id:clientId,...(clientId==='dynamic_agent_client'?{agent_name_hint:'Billiards Trainer Companion Development'}:{}),ext_agent_host_id:m.hostId,response_type:'code',redirect_uri:origin+'/auth/callback',scope:'openid profile email offline_access resource.invoke chatgpt.tokens.use.direct',resource:RESOURCE,state:pending.state,nonce:pending.nonce,code_challenge_method:'S256',code_challenge:crypto.createHash('sha256').update(pending.verifier).digest('base64url')}).toString();return {url:u.href};}
 async function callback(url){
  const p=pending,state=url.searchParams.get('state')||'';
  if(!p||p.expiresAt<Date.now()||state.length!==p.state.length||!crypto.timingSafeEqual(Buffer.from(state),Buffer.from(p.state)))throw Error('This sign-in request has expired or does not match.');pending=null;
  if(url.searchParams.has('error'))throw Error('ChatGPT sign-in was not completed. You can try again.');
  const client=url.searchParams.get('client_id')||(p.clientId==='dynamic_agent_client'?'':p.clientId),code=url.searchParams.get('code');
  if(!client||client==='dynamic_agent_client'||client.length>200||!code||code.length>10000||(p.clientId!=='dynamic_agent_client'&&client!==p.clientId))throw Error('Incomplete ChatGPT registration.');
  metadata.clientId=client;writeMetadata();const c=await configuration();
  const r=await fetchRemote(c.token_endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:client,code,code_verifier:p.verifier,redirect_uri:origin+'/auth/callback',resource:RESOURCE})});const t=await r.json();
  const keyResponse=await fetchRemote(c.jwks_uri),jwks=await keyResponse.json();if(!Array.isArray(jwks.keys))throw Error('Identity keys are unavailable.');
  const identity=verifyIdentity(t.id_token,jwks.keys,{clientId:client,nonce:p.nonce,subject:metadata.subject});
  if(typeof t.scope!=='string'||typeof t.access_token!=='string'||!t.access_token||String(t.token_type).toLowerCase()!=='bearer'||!Number.isFinite(t.expires_in)||t.expires_in<=0)throw Error('Incomplete ChatGPT credentials.');
  metadata.subject=identity.subject;writeMetadata();active={token:t.access_token,expiresAt:Date.now()+t.expires_in*1000,sharing:t.scope.split(/\s+/).includes('chatgpt.tokens.use.direct'),identity:{name:identity.name,email:identity.email},refreshToken:typeof t.refresh_token==='string'?t.refresh_token:''};loaded=true;
  if(active.refreshToken)await store.withLock(persistActive);
  // ID tokens are not retained. A rotating refresh token enables protected reconnect.
  return session();
 }
 async function models(){await ensureAccess();const r=await fetchRemote(RESOURCE+'/models',{headers:{Authorization:'Bearer '+access()}}),p=await r.json();if(!Array.isArray(p.models))throw Error('ChatGPT returned an unexpected model catalog.');return p.models.filter(m=>m.visibility==='list'&&typeof m.slug==='string'&&typeof m.display_name==='string').map(m=>({slug:m.slug,displayName:m.display_name}));}
 return {session,signIn,callback,access,models,ensureAccess,async disconnect(){generation++;active=null;pending=null;loaded=true;rememberError='';await store.withLock(()=>store.clear());}};
}
module.exports={createAuth,verifyIdentity};
