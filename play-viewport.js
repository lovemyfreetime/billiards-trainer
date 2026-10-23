/* Scorekeeper-only viewport; no Trainer scaling, orientation lock or fullscreen. */
(function(){
 'use strict';
 function fit(){const v=window.visualViewport;if(v&&Math.abs(v.scale-1)>.02)return;document.documentElement.style.setProperty('--play-height',Math.round(v?.height||innerHeight)+'px');}
 fit();addEventListener('resize',fit);window.visualViewport?.addEventListener('resize',fit);
 // app-updates.js handles browser updates; BilliardsBundledWindows and Android keep native assets.
})();
