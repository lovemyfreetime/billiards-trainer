(() => {
  'use strict';
  const fullscreen=document.getElementById('welcomeFullscreen');
  const close=document.getElementById('welcomeClose');
  const dialogs=[...document.querySelectorAll('.experience-description')];
  let speaking=null;
  function stop(){
    window.speechSynthesis?.cancel();
    window.BilliardsAndroid?.cancelDescriptionSpeech?.();
    if(speaking){speaking.setAttribute('aria-pressed','false');speaking.setAttribute('aria-label','Read description aloud');}
    speaking=null;
  }
  function speechError(dialog){stop();dialog.querySelector('[role=status]').textContent='Speech is unavailable. Check that an English voice is installed in your device’s speech settings.';}
  dialogs.forEach(dialog=>{
    const button=dialog.querySelector('.description-speaker');
    button.onclick=()=>{
      const wasSpeaking=speaking===button;stop();if(wasSpeaking)return;
      dialog.querySelector('[role=status]').textContent='';
      speaking=button;button.setAttribute('aria-pressed','true');button.setAttribute('aria-label','Stop reading description');
      const text=dialog.querySelector('p').textContent;
      if(window.BilliardsAndroid?.speakDescription){window.BilliardsAndroid.speakDescription(text);return;}
      if(!window.speechSynthesis||!window.SpeechSynthesisUtterance){speechError(dialog);return;}
      const speech=new SpeechSynthesisUtterance(text);speech.lang='en-US';
      const voice=speechSynthesis.getVoices().find(v=>v.lang==='en-US'&&v.localService);
      if(voice)speech.voice=voice;
      speech.onend=()=>{if(speaking===button)stop();};
      speech.onerror=e=>{if(speaking===button&&e.error!=='canceled'&&e.error!=='interrupted')speechError(dialog);};
      speechSynthesis.speak(speech);
    };
    dialog.addEventListener('close',stop);
  });
  window.addEventListener('billiards:description-speech',e=>{if(e.detail==='error'&&speaking)speechError(speaking.closest('dialog'));else if(e.detail==='end')stop();});
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
