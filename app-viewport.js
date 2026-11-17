/* On phones, fit the complete desktop layout instead of enlarging individual controls. */
(function(){
 'use strict';
 if(new URLSearchParams(location.search).get('zen')==='1')return;
 const meta=document.querySelector('meta[name="viewport"]');
 if(!meta)return;
 const original=meta.content;
 let fitted=false,scale=1,lastWidth=0,lastHeight=0,pending=false;
 window.BilliardsViewport={get active(){return fitted;},get scale(){return scale;}};
 function fit(){
  pending=false;
  const v=window.visualViewport;
  const width=Math.round(v?v.width*v.scale:innerWidth);
  const height=Math.round(v?v.height*v.scale:innerHeight);
  if(!width||!height)return;
  const mobile=/Android|iPhone|iPod/i.test(navigator.userAgent)||navigator.userAgentData?.mobile===true||matchMedia('(pointer:coarse)').matches;
  const phone=mobile&&Math.min(screen.width,screen.height)<600;
  if(!phone){if(fitted){fitted=false;scale=1;meta.content=original;}return;}
  // Opening a number/text keyboard must not shrink the whole app again.
  if(fitted&&width===lastWidth&&document.activeElement?.matches('input:not([type=range]):not([type=checkbox]),textarea,[contenteditable=true]'))return;
  if(Math.abs(width-lastWidth)<2&&Math.abs(height-lastHeight)<2)return;
  lastWidth=width;lastHeight=height;
  scale=Math.min(1,width/1366,height/768);
  fitted=scale<1;
  const layoutWidth=Math.round(width/scale),layoutHeight=Math.round(height/scale);
  meta.content=`width=${layoutWidth}, height=${layoutHeight}, initial-scale=${scale.toFixed(6)}, viewport-fit=cover`;
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(fit);}}
 fit();
 addEventListener('resize',schedule);
 addEventListener('orientationchange',schedule);
 addEventListener('pageshow',schedule);
 document.addEventListener('DOMContentLoaded',schedule,{once:true});
 window.visualViewport?.addEventListener('resize',schedule);
})();
