/* Scorekeeper-only viewport; no Trainer scaling, orientation lock or fullscreen. */
(function(){
 'use strict';
 function fit(){const v=window.visualViewport;if(v&&Math.abs(v.scale-1)>.02)return;document.documentElement.style.setProperty('--play-height',Math.round(v?.height||innerHeight)+'px');}
 fit();addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
 if(!(window.BilliardsBundledWindows||window.BilliardsBundledAndroid)&&'serviceWorker' in navigator)navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
})();
