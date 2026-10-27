(() => {
  'use strict';
  const fullscreen=document.getElementById('welcomeFullscreen');
  const close=document.getElementById('welcomeClose');
  const dialogs=[...document.querySelectorAll('.experience-description')];
  let speaking=null, narration=null;
  function stop(){
    const previous=narration;narration=null;
    if(previous){previous.pause();previous.removeAttribute('src');previous.load();}
    if(speaking){speaking.setAttribute('aria-pressed','false');speaking.setAttribute('aria-label','Read description aloud');}
    speaking=null;
  }
  function speechError(dialog,audio){
    if(narration!==audio)return;
    stop();dialog.querySelector('[role=status]').textContent='The Chase recording could not play. Tap the speaker to try again.';
  }
  dialogs.forEach(dialog=>{
    const button=dialog.querySelector('.description-speaker');
    button.onclick=()=>{
      const wasSpeaking=speaking===button;stop();if(wasSpeaking)return;
      dialog.querySelector('[role=status]').textContent='';
      const audio=new Audio('./guide/audio/experience-'+dialog.id.replace('about-','')+'.mp3');
      narration=audio;speaking=button;
      button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Stop reading description');
      audio.playbackRate=1;
      audio.onended=()=>{if(narration===audio)stop();};
      audio.onerror=()=>speechError(dialog,audio);
      audio.play().catch(()=>speechError(dialog,audio));
    };
    dialog.addEventListener('close',stop);
  });
  window.addEventListener('pagehide',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  function sync(){const active=window.BilliardsDisplay?.active();fullscreen.setAttribute('aria-label',active?'Exit fullscreen':'Enter fullscreen');fullscreen.title=active?'Exit fullscreen':'Enter fullscreen';fullscreen.setAttribute('aria-pressed',String(!!active));}
  document.addEventListener('billiards:display-change',sync);
  fullscreen.onclick=()=>window.BilliardsDisplay?.toggle();
  close.hidden=!(window.BilliardsWindowsHostAvailable&&window.chrome?.webview||window.BilliardsAndroid?.closeApp);
  close.onclick=()=>{
    stop();
    if(window.BilliardsWindowsHostAvailable&&window.chrome?.webview){window.chrome.webview.postMessage({type:'close-app'});return;}
    if(window.BilliardsAndroid?.closeApp){window.BilliardsAndroid.closeApp();return;}

  };
  sync();
  // Installed wrappers start fullscreen; browsers require an initial user gesture.
  // Try now, then retry on the first tap, including a mode-navigation tap.
  window.BilliardsDisplay?.enter(true);
  document.addEventListener('pointerdown',e=>{
    if(e.target.closest('#welcomeFullscreen,#welcomeClose'))return;
    if(!window.BilliardsDisplay?.active())window.BilliardsDisplay?.enter(true);
  },{once:true,capture:true});
})();
