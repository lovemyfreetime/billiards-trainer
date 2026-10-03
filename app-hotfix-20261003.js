(() => {
  'use strict';
  const HOTFIX = '2026-10-03-camera-apply-v2';

  function $(id){ return document.getElementById(id); }
  function stopLiveCamera(){
    const stream = window.__btLiveCameraStream;
    if(stream){
      try { stream.getTracks().forEach(t => t.stop()); } catch(e) {}
      window.__btLiveCameraStream = null;
    }
    const v = $('photoAnalyzerVideo');
    if(v && v.srcObject){
      try { v.pause(); } catch(e) {}
      v.srcObject = null;
    }
  }

  async function startLiveCamera(ev){
    if(ev){ ev.preventDefault(); ev.stopImmediatePropagation(); }
    try { openPhotoAnalyzer(); } catch(e) {}
    stopLiveCamera();
    const v=$('photoAnalyzerVideo'), c=$('photoAnalyzerCanvas'), cap=$('photoCaptureFrame');
    if(!v || !c || !cap) return;

    if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      try { pvStatus('Live camera is not available in this browser. Opening the device camera/photo picker instead…'); } catch(e) {}
      const input=$('cameraFileInput'); if(input) input.click();
      return;
    }
    try { pvStatus('Opening camera…'); } catch(e) {}
    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      } catch(firstErr){
        stream = await navigator.mediaDevices.getUserMedia({video:true,audio:false});
      }
      window.__btLiveCameraStream = stream;
      try { photoVision.cameraStream = stream; } catch(e) {}
      v.removeAttribute('src');
      v.srcObject=stream; v.playsInline=true; v.muted=true; v.autoplay=true;
      v.style.display='block'; c.style.display='none';
      cap.style.display='inline-block'; cap.textContent='TAKE PHOTO';
      await v.play().catch(()=>{});
      try { pvResetDetectionsAndCorners(); } catch(e) {}
      try { pvStatus('Camera is live. Aim at the pool table and press TAKE PHOTO.'); } catch(e) {}
    } catch(e){
      console.warn('Billiards Trainer camera error:',e);
      try { pvStatus('Camera permission was blocked or no camera was available. Opening the photo picker instead…'); } catch(x) {}
      const input=$('cameraFileInput'); if(input) input.click();
    }
  }

  function captureLiveCamera(ev){
    if(!window.__btLiveCameraStream) return;
    ev.preventDefault(); ev.stopImmediatePropagation();
    const v=$('photoAnalyzerVideo'), c=$('photoAnalyzerCanvas'), cap=$('photoCaptureFrame');
    if(!v || !v.videoWidth) return;
    try {
      const sc=Math.min(1,1800/Math.max(v.videoWidth,v.videoHeight));
      photoVision.rawCanvas.width=Math.max(1,Math.round(v.videoWidth*sc));
      photoVision.rawCanvas.height=Math.max(1,Math.round(v.videoHeight*sc));
      photoVision.rawCtx.setTransform(1,0,0,1,0,0);
      photoVision.rawCtx.clearRect(0,0,photoVision.rawCanvas.width,photoVision.rawCanvas.height);
      photoVision.rawCtx.drawImage(v,0,0,photoVision.rawCanvas.width,photoVision.rawCanvas.height);
      stopLiveCamera();
      try { photoVision.cameraStream=null; } catch(e) {}
      photoVision.rotation=0; photoVision.fineRotation=0;
      pvRebuildSourceFromRaw();
      v.style.display='none'; c.style.display='block'; cap.style.display='none'; cap.textContent='USE VIDEO FRAME';
      pvResetAfterImageChange('Photo captured. Use ROTATE 90° until the head/foot direction matches how you want the layout placed in Billiards Trainer. Then tap four inside playing-surface corners: top-left → top-right → bottom-right → bottom-left.');
    } catch(e){
      console.error('Camera capture failed:',e);
      try { pvStatus('Camera capture failed: '+(e.message||e)); } catch(x) {}
    }
  }

  function bestCueCandidate(){
    try {
      if(photoVision.detections.some(d=>String(d.id)==='0')) return null;
      let best=null,bestScore=-Infinity;
      for(const d of photoVision.detections){
        const a=d.appearance||{};
        const cueEntry=(d.aiOrder||[]).find(c=>pvAIClassToBallId(c.i)==='0');
        const cueAI=cueEntry?.v||0;
        const rawCue=String(d.rawTopId)==='0'?(d.rawTopScore||0):0;
        const adjCue=String(d.adjustedTopId)==='0'?(d.adjustedTopScore||0):0;
        const white=Number(a.white)||0,color=Number(a.color)||0,sat=Number(a.meanSat)||0,bright=Number(a.bright)||0;
        const visual=white*1.05+bright*.18-color*.70-sat*.28;
        const score=Math.max(cueAI,rawCue,adjCue)*.72+visual*.28;
        if(score>bestScore){bestScore=score;best=d;}
      }
      return (best && bestScore>.24) ? best : null;
    } catch(e){ return null; }
  }

  function hotfixApply(saveAfter,ev){
    if(ev){ ev.preventDefault(); ev.stopImmediatePropagation(); }
    try {
      if(!photoVision.detections || !photoVision.detections.length){ pvStatus('No reviewed balls are selected.'); return; }
      if(!photoVision.detections.some(d=>String(d.id)==='0')){
        const rescue=bestCueCandidate();
        if(rescue){
          rescue.id='0'; rescue.cueRescued=true; rescue.duplicateWarning=true;
          try { renderPhotoDetectionList(); renderPhotoAnalyzer(); } catch(e) {}
        }
      }
      const chosen=photoVision.detections.filter(d=>String(d.id)!=='ignore'), used=new Set(), balls=[];
      for(const d of chosen){
        const id=Number(d.id), nx=Number(d.nx), ny=Number(d.ny);
        if(!Number.isFinite(id)||id<0||id>15||used.has(id)||!Number.isFinite(nx)||!Number.isFinite(ny)) continue;
        used.add(id);
        balls.push({id,n:id===0?'CB':String(id),x:clamp(nx*S.tableL,S.ballR,S.tableL-S.ballR),y:clamp(ny*S.tableW,S.ballR,S.tableW-S.ballR),active:true});
      }
      if(!balls.length){ pvStatus('No reviewed balls have valid table positions.'); return; }

      if(!balls.some(b=>b.id===0)){
        const currentCue=(S.balls||[]).find(b=>b.id===0);
        const ok=window.confirm('The photo does not have a Cue Ball assigned.\n\nPress OK to apply the numbered balls and keep the current cue-ball position, or Cancel to return and identify the real Cue Ball.');
        if(!ok){ pvStatus('Assign the real Cue Ball in the review list, then press APPLY TO TABLE again.'); return; }
        balls.unshift(currentCue ? {...currentCue,id:0,n:'CB',active:true} : {id:0,n:'CB',x:S.tableL*.23,y:S.tableW*.5,active:true});
      }

      S.balls=balls;
      S.shot2Enabled=false; S.shot2Initialized=false; S.activeShot=1;
      S.showShot1=true; S.showShot2=true; S.showCueVisuals=true; S.pocketedLog=[];
      S.bankKick=JSON.parse(JSON.stringify(defaultState().bankKick));
      S.freeAim={x:S.tableL*.58,y:S.tableW*.5};
      normalizeBallSet();
      saveState();
      try { closePhotoAnalyzer(); } catch(e) { const m=$('photoAnalyzerModal'); if(m) m.classList.remove('open'); }
      [resetRunHistory,updateUI,updateShot2UIState,refreshPreview,syncProjector].forEach(fn=>{ try { fn(); } catch(e) { console.warn('Post-apply refresh warning:',e); } });

      if(saveAfter){
        const now=new Date();
        const input=$('photoLayoutName');
        const name=(input&&input.value.trim())||('Photo layout '+now.toLocaleDateString([], {month:'numeric',day:'numeric'})+' '+now.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));
        const layouts=readSavedLayouts(); layouts.unshift(captureBallLayout(name)); writeSavedLayouts(layouts.slice(0,20));
        try { updateSavedLayoutUI(true); } catch(e) {}
        toast('Photo layout applied + saved: '+name);
      } else toast('Photo layout applied to table');
    } catch(e){
      console.error('Apply photo layout failed:',e);
      try { pvStatus('Apply failed: '+(e.message||e)); } catch(x) {}
      alert('Could not apply this layout: '+(e.message||e));
    }
  }

  function install(){
    if(window.__btHotfixInstalled===HOTFIX) return;
    window.__btHotfixInstalled=HOTFIX;

    const topCamera=$('cameraCaptureBtn');
    if(topCamera) topCamera.addEventListener('click',startLiveCamera,true);
    const insideCamera=document.querySelector('.photoCameraLabel');
    if(insideCamera) insideCamera.addEventListener('click',startLiveCamera,true);
    const capture=$('photoCaptureFrame');
    if(capture) capture.addEventListener('click',captureLiveCamera,true);

    const apply=$('photoApplyTable');
    const applySave=$('photoApplySave');
    if(apply) apply.addEventListener('click',ev=>hotfixApply(false,ev),true);
    if(applySave) applySave.addEventListener('click',ev=>hotfixApply(true,ev),true);

    const close=$('photoAnalyzerClose');
    if(close) close.addEventListener('click',()=>stopLiveCamera(),true);
    window.addEventListener('pagehide',stopLiveCamera);
    console.info('Billiards Trainer hotfix active:',HOTFIX);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
