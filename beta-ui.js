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
          e.searchParams.set("transparentBackground","1");
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

  function setupFeedback(cfg){
    const btn = document.getElementById("btFeedbackButton");
    const modal = document.getElementById("btFeedbackModal");
    const close = document.getElementById("btFeedbackClose");
    const frame = document.getElementById("btFeedbackFrame");
    if(!btn || !modal || !close || !frame || !cfg.feedbackFormUrl) return;

    frame.src = embedUrl(cfg.feedbackFormUrl,"trainer");
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

  function init(){
    const cfg = window.BilliardsBetaConfig || {};
    setupCommunity(cfg);
    setupFeedback(cfg);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
