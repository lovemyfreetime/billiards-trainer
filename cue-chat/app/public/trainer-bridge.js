(function(){
'use strict';
const token=new URLSearchParams(location.search).get('cueChat');if(!token)return;
const key='cuechat-previous-table:'+token;let previous=null,loaded=false,restored=false;
const tell=(type,extra={})=>parent.postMessage({type:'cuechat:'+type,token,...extra},location.origin);
function bridge(){if(!window.billiardsTourBridge)throw Error('Trainer is still opening. Try again in a moment.');return window.billiardsTourBridge;}
function restore(){if(previous&&!restored){if(!bridge().restore(previous))throw Error('Your previous table could not be restored.');restored=true;localStorage.removeItem(key);}return true;}
function snapshot(){if(!loaded||restored)throw Error('Wait for the shared table to finish opening.');const file=bridge().exportFile();BilliardsLayoutFiles.parse(JSON.stringify(file));return file;}
window.CueChatTrainerBridge={restore,snapshot,coachDraw:(goal,file)=>bridge().coachDrawPlan(goal,file)};
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.token!==token)return;try{const d=e.data;if(d.type==='cuechat:load'&&!loaded){const parsed=BilliardsLayoutFiles.parse(JSON.stringify(d.file));previous=bridge().capture();localStorage.setItem(key,JSON.stringify(previous));const st=parsed.state||{};if(!bridge().loadLesson({file:d.file,controls:{speed:st.speed??1.5,follow:st.follow??0,sideSpin:st.sideSpin??0,showPaths:true,showImpact:true,showDiamonds:true,shot2Enabled:st.shot2Enabled??false,activeShot:1}}))throw Error('Finish the moving shot, then reopen this table.');loaded=true;tell('loaded');}if(d.type==='cuechat:export'){if(!loaded)throw Error('Wait for the shared table to finish opening.');const file=bridge().exportFile();BilliardsLayoutFiles.parse(JSON.stringify(file));restore();tell('return',{file});}if(d.type==='cuechat:cancel'){restore();tell('cancelled');}}catch(err){tell('error',{error:err.message});}});
window.addEventListener('pagehide',()=>{try{restore()}catch{}});
let tries=0;const timer=setInterval(()=>{if(window.billiardsTourBridge&&window.BilliardsLayoutFiles){clearInterval(timer);tell('ready');}else if(++tries>200){clearInterval(timer);tell('error',{error:'The Trainer could not open. Cancel, then try again.'});}},100);
})();
