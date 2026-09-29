
function currentDevice(){
  const ua=navigator.userAgent||'';
  const isIPadOS=navigator.platform==='MacIntel' && navigator.maxTouchPoints>1;
  if(/iPad|iPhone|iPod/i.test(ua)||isIPadOS) return 'apple';
  if(/CrOS/i.test(ua)) return 'chromebook';
  if(/Android/i.test(ua)) return 'android';
  if(/Windows/i.test(ua)) return 'windows';
  return '';
}
async function copyText(text,btn){
  try{await navigator.clipboard.writeText(text);const old=btn.textContent;btn.textContent='Copied';setTimeout(()=>btn.textContent=old,1500)}catch(e){prompt('Copy this link:',text)}
}
async function shareLink(title,url){
  if(navigator.share){try{await navigator.share({title,url});return}catch(e){if(e.name==='AbortError')return}}
  try{await navigator.clipboard.writeText(url);alert('Link copied. Paste it into a text or email.')}catch(e){prompt('Copy this link:',url)}
}
function toggleQR(id){document.getElementById(id)?.classList.toggle('show')}
window.addEventListener('DOMContentLoaded',()=>{
  const d=currentDevice();
  if(d){const card=document.querySelector(`[data-device="${d}"]`);if(card)card.classList.add('recommended');const label=document.getElementById('detectedDevice');if(label)label.textContent=d==='apple'?'Apple iPhone/iPad':d==='chromebook'?'Chromebook':d==='android'?'Android':d==='windows'?'Windows':'this device';}
});
