(function(){
  "use strict";

  function embedUrl(value, source){
    if(!value) return "";
    try{
      const u = new URL(value, window.location.href);
      if(u.hostname === "tally.so"){
        let id = "";
        const m = u.pathname.match(/\/(?:r|embed)\/([^/?#]+)/i);
        if(m) id = m[1];
        if(id){
          const e = new URL("https://tally.so/embed/" + id);
          e.searchParams.set("alignLeft","1");
          e.searchParams.set("hideTitle","1");
          e.searchParams.set("dynamicHeight","1");
          if(source) e.searchParams.set("source",source);
          return e.toString();
        }
      }
      if(source) u.searchParams.set("source",source);
      return u.toString();
    }catch(_){
      return value;
    }
  }

  function setupCommunity(cfg){
    const card = document.getElementById("btCommunityCard");
    const frame = document.getElementById("btCommunityFrame");
    if(!card || !frame || !cfg.communityFormUrl) return;
    frame.src = embedUrl(cfg.communityFormUrl,"installer");
    card.hidden = false;
  }

  function ensureTallyEmbedScript(){
    if(window.Tally && typeof window.Tally.loadEmbeds === "function"){
      window.Tally.loadEmbeds();
      return;
    }
    if(document.querySelector('script[data-bt-tally-embed]')) return;
    const s = document.createElement("script");
    s.src = "https://tally.so/widgets/embed.js";
    s.async = true;
    s.dataset.btTallyEmbed = "1";
    s.onload = function(){
      if(window.Tally && typeof window.Tally.loadEmbeds === "function") window.Tally.loadEmbeds();
    };
    document.head.appendChild(s);
  }

  function setupFeedback(cfg){
    const btn = document.getElementById("btFeedbackButton");
    const modal = document.getElementById("btFeedbackModal");
    const close = document.getElementById("btFeedbackClose");
    const frame = document.getElementById("btFeedbackFrame");
    if(!btn || !modal || !close || !frame || !cfg.feedbackFormUrl) return;

    const feedbackUrl = embedUrl(cfg.feedbackFormUrl,"trainer");
    if(feedbackUrl.indexOf("https://tally.so/embed/") === 0){
      frame.dataset.tallySrc = feedbackUrl;
      frame.src = feedbackUrl;
      frame.setAttribute("scrolling","no");
      ensureTallyEmbedScript();
    }else{
      frame.src = feedbackUrl;
    }
    btn.hidden = false;

    function openModal(){
      modal.classList.add("open");
      modal.setAttribute("aria-hidden","false");
      close.focus({preventScroll:true});
    }
    function closeModal(){
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden","true");
      btn.focus({preventScroll:true});
    }

    btn.addEventListener("click",openModal);
    close.addEventListener("click",closeModal);
    modal.addEventListener("click",function(e){ if(e.target === modal) closeModal(); });
    document.addEventListener("keydown",function(e){ if(e.key === "Escape" && modal.classList.contains("open")) closeModal(); });
  }


  function setupZenLauncher(){
    if(document.getElementById("btZenLauncher")) return;
    const isPreview = location.hostname.includes("billiards-trainer-guide-dev");
    if(new URLSearchParams(location.search).get("zen")==="1") return;
    const b=document.createElement("a");b.id="btZenLauncher";b.href=isPreview?"?zen=1":"https://billiards-trainer-guide-dev.vercel.app/?zen=1";
    b.setAttribute("aria-label","Open Zen pool table");b.title="Open Zen mode";b.innerHTML='<svg style="width:42px;height:42px;color:#C5A880" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M24 37C13 30 15 18 24 9c9 9 11 21 0 28Z"/><path d="M24 37C12 38 6 29 7 18c10 1 17 8 17 19Zm0 0c12 1 18-8 17-19-10 1-17 8-17 19Z"/><path d="M10 39c9 4 19 4 28 0"/></svg>';
    b.style.cssText="position:fixed;left:14px;bottom:12px;z-index:55;display:grid;place-items:center;width:54px;height:54px;background:linear-gradient(145deg,#29333a,#11181d);border:1.5px solid #e5e9de;border-radius:50%;box-shadow:0 3px 14px #0005;text-decoration:none;";
    document.body.appendChild(b);
  }

  function init(){
    const cfg = window.BilliardsBetaConfig || {};
    setupCommunity(cfg);
    setupFeedback(cfg);
    setupZenLauncher();
    const zenScript=document.createElement('script');zenScript.src='./zen-mode.js?v=zen-midnight-v11';document.body.appendChild(zenScript);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
