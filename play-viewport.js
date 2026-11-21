/* Keep the complete Play canvas visible, including mobile browser fullscreen. */
(function(){
 'use strict';
 function fit(){
  const v=window.visualViewport,width=Math.round(v?.width||innerWidth),height=Math.round(v?.height||innerHeight);
  const phone=/Android.*Mobile|iPhone|iPod/i.test(navigator.userAgent)||(matchMedia('(pointer:coarse)').matches&&Math.min(screen.width,screen.height)<600);
  // Some mobile browsers reset the meta viewport when entering fullscreen.
  // Preserve the same desktop proportions until their viewport scaling returns.
  const scale=phone&&(width<1000||height<600)?Math.min(1,width/1366,height/768):1;
  const style=document.documentElement.style;
  document.documentElement.classList.toggle('play-screen-fit',scale<1);
  style.setProperty('--play-screen-scale',String(scale));
  style.setProperty('--play-layout-width',Math.round(width/scale)+'px');
  style.setProperty('--play-height',Math.round(height/scale)+'px');
 }
 fit();addEventListener('resize',fit);addEventListener('orientationchange',fit);document.addEventListener('fullscreenchange',fit);window.visualViewport?.addEventListener('resize',fit);
 // app-updates.js handles browser updates; BilliardsBundledWindows and Android keep native assets.
})();
