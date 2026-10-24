/* Complete offline releases update in the background; reloading is always a user action. */
(() => {
 'use strict';
 const script=document.currentScript,base=new URL('./',script.src);
 const native=Number(window.BilliardsContentUpdateProtocol)>=1&&!!(window.BilliardsBundledAndroid&&window.BilliardsAndroid?.checkContentUpdates||window.BilliardsBundledWindows&&window.chrome?.webview);
 const supported=native||'serviceWorker' in navigator&&!(window.BilliardsBundledWindows||window.BilliardsBundledAndroid);
 const nativeMessage=(type,extra={})=>{if(window.BilliardsBundledAndroid){if(type==='status')receiveNative(JSON.parse(BilliardsAndroid.contentUpdateStatus()));else if(type==='check')BilliardsAndroid.checkContentUpdates(!!extra.force);else BilliardsAndroid.applyContentUpdate();}else window.chrome.webview.postMessage({type:'content-update-'+type,...extra});};
 let registration,starting,checking=false,lastCheck=0,manual=false,ready=false,dismissed=false,reloading=false,previous=supported&&!native?navigator.serviceWorker.controller:null;
 let bar,status,reload,close;
 function render(message,canReload=false){
  if(!document.body||dismissed||document.body.classList.contains('welcome-screen')||new URLSearchParams(location.search).get('zen')==='1'||document.body.classList.contains('zen-mode'))return;
  if(!bar){
   const style=document.createElement('style');style.textContent='#appUpdateNotice{position:fixed;z-index:25000;top:max(12px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);box-sizing:border-box;width:max-content;max-width:calc(100vw - 24px);display:flex;align-items:center;gap:10px;padding:9px 12px;border:1px solid #6595ad;border-radius:9px;background:#172b36;color:#edf6fa;box-shadow:0 3px 15px #0006;font:12px/1.4 system-ui,sans-serif}#appUpdateNotice[hidden]{display:none!important}#appUpdateNotice button{flex:none;min-height:32px;margin:0;padding:4px 8px;border:1px solid #6595ad;border-radius:5px;background:#2b5064;color:#fff;font:600 12px system-ui;cursor:pointer}#appUpdateNotice button[hidden]{display:none}#appUpdateNotice .appUpdateClose{border:0;background:transparent;font-size:18px;padding:0 4px}';document.head.append(style);
   bar=document.createElement('div');bar.id='appUpdateNotice';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');status=document.createElement('span');reload=document.createElement('button');reload.type='button';reload.textContent=native?'Restart app':'Reload app';reload.onclick=()=>{
    if(reloading)return;if(native&&checking){render('Finishing the update check. You can keep using the app.',ready);return;}if(window.billiardsTourBridge?.snapshot?.().busy){render('Finish the current shot before restarting.',true);return;}reloading=true;window.dispatchEvent(new Event('billiards:before-reload'));if(native)nativeMessage('apply');else location.reload();
   };
   close=document.createElement('button');close.type='button';close.className='appUpdateClose';close.textContent='×';close.setAttribute('aria-label','Dismiss update notice');close.onclick=()=>{dismissed=true;bar.hidden=true;};bar.append(status,reload,close);document.body.append(bar);
  }
  status.textContent=message;reload.hidden=!canReload;bar.hidden=false;
 }
 function available(){ready=true;render(native?'Update ready. Restart when you’re ready.':'Update ready. Reload when you’re ready.',true);}
 function receiveNative(detail){
  if(!detail||typeof detail.state!=='string')return;
  checking=['checking','downloading'].includes(detail.state);
  if(detail.state==='ready'){reloading=false;available();return;}
  if(detail.state==='native-required'){render('This update needs a newer installed app. Download the latest installer.');return;}
  if(!manual)return;
  if(detail.state==='checking')render('Checking for updates…');
  else if(detail.state==='downloading')render('Downloading update… '+detail.done+' / '+detail.total+' files. You can keep using the app.');
  else if(detail.state==='current')render('You’re up to date. Your offline app is ready.');
  else if(detail.state==='failed'){reloading=false;render('Update did not finish. Your working offline version is unchanged. Try again when connected.');}
 }

 function offerWhenActive(worker){
  if(worker.state==='activated'){available();return;}
  const activated=()=>{if(worker.state==='activated'){worker.removeEventListener('statechange',activated);available();}};worker.addEventListener('statechange',activated);
 }
 function watch(worker){
  if(!worker||worker.__billiardsWatched)return;worker.__billiardsWatched=true;
  worker.addEventListener('statechange',()=>{
   if(worker.state==='redundant'&&manual&&!ready)render('Update did not finish. Keep using the app and try again later.');
  });
 }
 async function start(){
  if(!supported)return null;
  if(!starting)starting=navigator.serviceWorker.register(new URL('service-worker.js',base),{scope:base.pathname,updateViaCache:'none'}).then(reg=>{
   registration=reg;reg.addEventListener('updatefound',()=>{watch(reg.installing);if(manual)render('Downloading update… You can keep using the app.');});watch(reg.installing);watch(reg.waiting);return reg;
  }).catch(error=>{starting=null;throw error;});
  return starting;
 }
 async function check(show=false){
  if(!supported)return;
  if(show&&!navigator.onLine){dismissed=false;render(ready?(native?'Update ready. Restart when you’re ready.':'Update ready. Reload when you’re ready.'):'You’re offline. Your saved app is still available.',ready);return;}
  if(native){if(!show&&Date.now()-lastCheck<60000)return;lastCheck=Date.now();manual=show;if(show){dismissed=false;render(ready?'Update ready. Restart when you’re ready.':'Checking for updates…',ready);}if(navigator.onLine)nativeMessage('check',{force:show});return;}
  if(checking){if(show){manual=true;dismissed=false;render('Checking for updates…');}return;}
  if(!show&&Date.now()-lastCheck<60000)return;
  checking=true;lastCheck=Date.now();manual=show;
  if(show){dismissed=false;render(ready?'Update ready. Reload when you’re ready.':'Checking for updates…',ready);}
  try{
   const reg=await start();await reg.update();
   if(reg.waiting){watch(reg.waiting);if(manual)render('Finishing update… You can keep using the app.');}
   else if(reg.installing){watch(reg.installing);if(manual)render('Downloading update… You can keep using the app.');}
   else if(reg.active?.state==='activating'){if(manual)render('Finishing update… You can keep using the app.');}
   else if(manual)render(ready?'Update ready. Reload when you’re ready.':'Latest saved version is ready to reload.',true);
  }catch(error){if(manual)render(ready?'Update ready. Reload when you’re ready.':navigator.onLine?'Couldn’t check for updates. Keep using the app and try again later.':'You’re offline. Your saved app is still available.',ready);}
  finally{checking=false;}
 }
 window.BilliardsAppUpdates={supported,native,check:()=>check(true)};
 if(!supported)return;
 if(!native)navigator.serviceWorker.addEventListener('controllerchange',()=>{const current=navigator.serviceWorker.controller;if(previous&&current&&current!==previous)offerWhenActive(current);previous=current;});
 if(!native)navigator.serviceWorker.addEventListener('message',event=>{
  if(event.data?.type==='BILLIARDS_UPDATE_PROGRESS'&&manual&&!ready)render('Downloading update… '+event.data.done+' / '+event.data.total+' files. You can keep using the app.');
  if(event.data?.type==='BILLIARDS_UPDATE_FAILED'&&manual&&!ready)render('Update did not finish. Keep using the app and try again later.');
 });
 if(native)window.addEventListener('billiards:content-update',event=>receiveNative(event.detail));
 function bind(){if(native)nativeMessage('status');document.querySelectorAll('[data-app-update]').forEach(button=>{button.hidden=false;button.onclick=()=>check(true);});check(false);}
 if(document.readyState==='complete')bind();else window.addEventListener('load',bind,{once:true});
 window.addEventListener('online',()=>check(false));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)check(false);});
 window.addEventListener('pageshow',event=>{if(event.persisted)check(false);});
 setInterval(()=>{if(!document.hidden)check(false);},5*60*1000);
})();
