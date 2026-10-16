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
    if(new URLSearchParams(location.search).get("zen")==="1") return;
    const b=document.createElement("a");b.id="btZenLauncher";b.href="?zen=1";
    b.setAttribute("aria-label","Open Zen pool table");b.title="Open Zen mode";b.innerHTML='<svg style="width:42px;height:42px" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="zenLotusMetal" x1="0" y1="0" x2=".7" y2="1"><stop stop-color="#D4BB92"/><stop offset="1" stop-color="#8F7755"/></linearGradient></defs><g fill="url(#zenLotusMetal)" stroke="#C5A880" stroke-width=".6" stroke-linejoin="round"><path d="M31 51C16 50 6 41 5 29c13 1 23 8 26 22Z"/><path d="M33 51c15-1 25-10 26-22-13 1-23 8-26 22Z"/><path d="M31 49C18 44 12 32 17 18c11 5 16 17 14 31Z"/><path d="M33 49c13-5 19-17 14-31-11 5-16 17-14 31Z"/><path d="M32 48C22 38 22 23 32 10c10 13 10 28 0 38Z"/></g><path d="M12 49q20 15 40 0" fill="none" stroke="#A68D68" stroke-width="1"/></svg>';
    b.style.cssText="position:fixed;left:14px;bottom:12px;z-index:55;display:grid;place-items:center;width:54px;height:54px;background:linear-gradient(145deg,#29333a,#11181d);border:1.5px solid #e5e9de;border-radius:50%;box-shadow:0 3px 14px #0005;text-decoration:none;";
    document.body.appendChild(b);
  }

  function init(){
    const cfg = window.BilliardsBetaConfig || {};
    setupCommunity(cfg);
    setupFeedback(cfg);
    setupZenLauncher();
    const zenScript=document.createElement('script');zenScript.src='./zen-mode.js?v=history-radial-v21';document.body.appendChild(zenScript);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
