let deferredInstallerPrompt=null;

function currentDevice(){
  const ua=navigator.userAgent||'';
  const isIPadOS=navigator.platform==='MacIntel' && navigator.maxTouchPoints>1;
  if(/iPad|iPhone|iPod/i.test(ua)||isIPadOS) return 'apple';
  if(/CrOS/i.test(ua)) return 'chromebook';
  if(/Android/i.test(ua)) return 'android';
  if(/Windows/i.test(ua)) return 'windows';
  return '';
}

async function copyText(text,btn){
  try{await navigator.clipboard.writeText(text);const old=btn.textContent;btn.textContent='Copied';setTimeout(()=>btn.textContent=old,1500)}catch(e){prompt('Copy this link:',text)}
}

async function shareLink(title,url){
  if(navigator.share){try{await navigator.share({title,url});return}catch(e){if(e.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(url);alert('Link copied. Paste it into a text or email.')}catch(e){prompt('Copy this link:',url)}
}

function toggleQR(id){document.getElementById(id)?.classList.toggle('show')}

function prepareTrainerWrapper(){
  if(!('serviceWorker' in navigator)) return;
  try{
    const marker='/install/';
    const i=location.pathname.indexOf(marker);
    const root=(i>=0?location.pathname.slice(0,i):'/billiards-trainer')+'/';
    navigator.serviceWorker.register(root+'service-worker.js',{scope:root}).catch(()=>{});
  }catch(e){}
}

function isStandaloneInstaller(){
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone===true;
}

window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  deferredInstallerPrompt=e;
  const btn=document.getElementById('installPresenterBtn');
  if(btn) btn.textContent='INSTALL FULLSCREEN INSTALLER APP';
  const hint=document.getElementById('presenterHint');
  if(hint) hint.textContent='Install once and launch this installer from its own icon with no browser tabs or address bar.';
});

window.addEventListener('appinstalled',()=>{
  deferredInstallerPrompt=null;
  const btn=document.getElementById('installPresenterBtn');
  if(btn){btn.textContent='FULLSCREEN INSTALLER INSTALLED';btn.disabled=true;}
  const hint=document.getElementById('presenterHint');
  if(hint) hint.textContent='Installed. Open Trainer Installer from your app launcher whenever you want a clean presentation.';
});

async function installPresenterApp(btn){
  if(isStandaloneInstaller()){
    if(btn) btn.textContent='ALREADY OPEN AS APP';
    return;
  }

  if(deferredInstallerPrompt){
    const p=deferredInstallerPrompt;
    deferredInstallerPrompt=null;
    try{
      await p.prompt();
      const choice=await p.userChoice;
      if(choice?.outcome==='accepted'){
        if(btn) btn.textContent='INSTALLING…';
      }else if(btn){
        btn.textContent='INSTALL FULLSCREEN INSTALLER APP';
      }
      return;
    }catch(e){}
  }

  const d=currentDevice();
  if(d==='apple'){
    alert('On iPad: open this page in Safari, tap Share, then Add to Home Screen. The Home Screen version opens without normal browser tabs or the address bar.');
    return;
  }

  try{
    await toggleInstallerFullscreen(document.getElementById('fullscreenPresenterBtn'));
    const hint=document.getElementById('presenterHint');
    if(hint) hint.textContent='Your browser did not offer the app-install prompt yet, so Fullscreen Presenter was opened instead. Reload once and the install option may become available.';
  }catch(e){}
}

async function toggleInstallerFullscreen(btn){
  try{
    if(document.fullscreenElement){
      await document.exitFullscreen();
      if(btn) btn.textContent='PRESENT FULLSCREEN NOW';
      return;
    }
    const el=document.documentElement;
    if(el.requestFullscreen){
      await el.requestFullscreen();
      if(btn) btn.textContent='EXIT FULLSCREEN';
      return;
    }
    if(el.webkitRequestFullscreen){
      el.webkitRequestFullscreen();
      if(btn) btn.textContent='EXIT FULLSCREEN';
      return;
    }
    alert('This browser does not support one-tap fullscreen. Add this installer to the Home Screen instead.');
  }catch(e){
    alert('Fullscreen was blocked by the browser. Add this installer to the Home Screen for a browser-free presentation.');
  }
}

document.addEventListener('fullscreenchange',()=>{
  const btn=document.getElementById('fullscreenPresenterBtn');
  if(btn) btn.textContent=document.fullscreenElement?'EXIT FULLSCREEN':'PRESENT FULLSCREEN NOW';
});

window.addEventListener('DOMContentLoaded',()=>{
  prepareTrainerWrapper();
  const d=currentDevice();
  if(d){
    const card=document.querySelector(`[data-device="${d}"]`);
    if(card)card.classList.add('recommended');
  }

  const installBtn=document.getElementById('installPresenterBtn');
  if(installBtn && isStandaloneInstaller()){
    installBtn.textContent='FULLSCREEN INSTALLER INSTALLED';
    installBtn.disabled=true;
    const hint=document.getElementById('presenterHint');
    if(hint) hint.textContent='You are already running the installer as a standalone app.';
  }else if(installBtn && d==='apple'){
    installBtn.textContent='ADD INSTALLER TO HOME SCREEN';
  }
});
