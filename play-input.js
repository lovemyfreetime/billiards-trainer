/* One command boundary for touch, keyboard, native voice and approved remote seats. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsInput=api;})(globalThis,function(){
'use strict';
const commands=new Set(['engine','ready','made','miss','foul','scratch','undo','pause','resume','private','clock-start','clock-pause','clock-extend','drill-made','drill-miss']);
function parseVoice(value){
 const s=String(value||'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
 if(!s.startsWith('table '))return null;
 const words=s.slice(6),simple={'ready':'ready','made':'made','miss':'miss','foul':'foul','scratch':'scratch','undo':'undo','pause':'pause','resume':'resume','start clock':'clock-start','pause clock':'clock-pause','extension':'clock-extend','drill made':'drill-made','drill miss':'drill-miss'};
 if(simple[words])return {type:simple[words]};
 const ball=words.match(/^ball (\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen) made$/);
 if(!ball)return null;const n=Number(ball[1])||['','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen'].indexOf(ball[1]);
 return n>=1&&n<=15?{type:'made',balls:[n]}:null;
}
function create({context,execute,feedback=()=>{},now=()=>Date.now()}){
 const seen=new Map();let last=null;
 function dispatch(command,meta={}){
  const c=context(),source=meta.source||'touch',fail=message=>{feedback({ok:false,message,source});return {ok:false,message};};
  if(!command||!commands.has(command.type))return fail('Unknown command.');
  if(c.busy)return fail('Wait for the current action.');
  if(meta.revision!==undefined&&meta.revision!==c.revision)return fail('The table changed. Try again.');
  if(source==='remote'&&(!Number.isInteger(meta.seat)||meta.seat!==c.actor))return fail('It is not your turn.');
  if(c.modal&&['voice','clicker'].includes(source))return fail('Close the open view first.');
  if(c.paused&&!['resume','pause'].includes(command.type))return fail('Resume play first.');
  if(c.hidden&&source!=='touch')return fail('Return to the table screen first.');
  if(source!=='touch'&&command.type==='private')return fail('Open private views by touch.');
  const time=now(),id=meta.id&&source+':'+meta.id;
  for(const [key,t] of seen)if(time-t>120000)seen.delete(key);
  if(id&&seen.has(id))return fail('Command already received.');
  const signature=JSON.stringify(command);
  if(['voice','clicker'].includes(source)&&last?.signature===signature&&last.source===source&&time-last.time<1000)return fail('Repeated command ignored.');
  try{
   const value=execute(command,{...meta,source});
   if(value===false)return fail('That command is not available now.');
   if(id){seen.set(id,time);if(seen.size>512)seen.delete(seen.keys().next().value);}
   last={signature,source,time};feedback({ok:true,message:value?.message||'Recorded.',source,command:command.type});return {ok:true};
  }catch(e){return fail(e.message||'Command could not be recorded.');}
 }
 return {dispatch,voice(text,meta={}){const command=parseVoice(text);return command?dispatch(command,{...meta,source:'voice'}):{ok:false,message:'Say Table, followed by a command.'};}};
}
return {create,parseVoice,commands:[...commands]};
});
