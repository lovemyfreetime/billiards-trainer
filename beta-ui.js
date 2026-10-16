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
    b.setAttribute("aria-label","Open Zen pool table");b.title="Open Zen mode";b.innerHTML="<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 64 64\" width=\"44\" height=\"44\" aria-hidden=\"true\"><defs><filter id=\"stonegrain\"><feTurbulence type=\"fractalNoise\" baseFrequency=\".42\" numOctaves=\"3\" seed=\"8\" result=\"noise\"/><feComposite in=\"noise\" in2=\"SourceGraphic\" operator=\"in\" result=\"texture\"/><feBlend in=\"SourceGraphic\" in2=\"texture\" mode=\"multiply\"/></filter><linearGradient id=\"stonefill\" x1=\"0\" y1=\"0\" x2=\".2\" y2=\"1\"><stop stop-color=\"#9b9b91\"/><stop offset=\".5\" stop-color=\"#5b6058\"/><stop offset=\"1\" stop-color=\"#343c35\"/></linearGradient></defs><ellipse cx=\"32\" cy=\"56\" rx=\"25\" ry=\"5\" fill=\"#746d62\" opacity=\".16\"/><g fill=\"url(#stonefill)\" stroke=\"#545c50\" stroke-width=\".6\" filter=\"url(#stonegrain)\"><ellipse cx=\"32\" cy=\"47\" rx=\"24\" ry=\"11\"/><ellipse cx=\"32\" cy=\"34\" rx=\"19\" ry=\"9\"/><ellipse cx=\"33\" cy=\"21\" rx=\"13\" ry=\"7\"/></g></svg>";
    b.style.cssText="position:fixed;left:14px;bottom:12px;z-index:55;display:grid;place-items:center;width:54px;height:54px;background:linear-gradient(140deg,#ded5c5d9,#a99c8cdb);border:1px solid #b2a797;border-radius:50%;box-shadow:0 3px 14px #0005;text-decoration:none;";
    document.body.appendChild(b);
  }

  function init(){
    const cfg = window.BilliardsBetaConfig || {};
    setupCommunity(cfg);
    setupFeedback(cfg);
    setupZenLauncher();
    const zenScript=document.createElement('script');zenScript.src='./zen-mode.js?v=zen-garden-v5';document.body.appendChild(zenScript);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
