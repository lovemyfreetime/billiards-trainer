(function(){
'use strict';
const $=id=>document.getElementById(id),el=(tag,text)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
let catalog,all=[],current=null,request=0;
const NS='http://www.w3.org/2000/svg';
function svgEl(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
function table(headers,rows){const t=el('table'),head=el('thead'),tr=el('tr');for(const h of headers)tr.append(el('th',h));head.append(tr);t.append(head);const body=el('tbody');for(const row of rows){const r=el('tr');for(const v of row)r.append(el('td',v));body.append(r);}t.append(body);return t;}
function link(text,url){const a=el('a',text);a.href=url;return a;}
function diagram(layout,setup){
 const svg=svgEl('svg',{viewBox:'0 0 860 490',role:'img','aria-label':'Starting ball centers and target zones. Head end left, foot end right.'});
 const X=x=>50+x/layout.tableL*760,Y=y=>50+y/layout.tableW*380;
 svg.append(svgEl('rect',{x:30,y:30,width:800,height:420,rx:12,fill:'#583e2a'}),svgEl('rect',{x:50,y:50,width:760,height:380,fill:'#12694e'}));
 for(let i=0;i<=8;i++){
  const x=50+i*95;svg.append(svgEl('line',{x1:x,y1:50,x2:x,y2:430,stroke:'#d1e8dc','stroke-opacity':'.16'}));
  svg.append(svgEl('text',{x,y:20,fill:'currentColor','text-anchor':'middle'},String(i)));
  if(i>0&&i<8)svg.append(svgEl('circle',{cx:x,cy:40,r:2.5,fill:'#eee'}),svgEl('circle',{cx:x,cy:440,r:2.5,fill:'#eee'}));
 }
 for(let i=0;i<=4;i++){const y=50+i*95;svg.append(svgEl('line',{x1:50,y1:y,x2:810,y2:y,stroke:'#d1e8dc','stroke-opacity':'.16'}),svgEl('text',{x:13,y:y+4,fill:'currentColor','text-anchor':'middle'},String(i)));}
 for(const [x,y]of [[50,50],[430,50],[810,50],[810,430],[430,430],[50,430]])svg.append(svgEl('circle',{cx:x,cy:y,r:12,fill:'#101010'}));
 if(setup.pocket)svg.append(svgEl('circle',{cx:X(setup.pocket[0]*layout.tableL),cy:Y(setup.pocket[1]*layout.tableW),r:18,fill:'none',stroke:'#ffdc72','stroke-width':3}));
 for(const b of layout.balls.filter(b=>b.marker)){
  const w=(b.markerWidthIn||b.markerDiameterIn||6)*.0254/layout.tableL*760,h=(b.markerHeightIn||b.markerDiameterIn||6)*.0254/layout.tableW*380;
  const g=svgEl('g',{transform:`translate(${X(b.x)} ${Y(b.y)}) rotate(${(b.markerAngle||0)*180/Math.PI})`});
  const attrs={fill:b.markerType==='yellow'?'#ffde63':b.markerType==='red'?'#ff8585':b.markerType==='pink'?'#ffafdc':'#fff','fill-opacity':'.16',stroke:b.markerType==='yellow'?'#ffde63':b.markerType==='red'?'#ff8585':'#fff','stroke-width':1.5};
  g.append(b.markerShape==='triangle'?svgEl('polygon',{points:`0,${-h/2} ${w/2},${h/2} ${-w/2},${h/2}`,...attrs}):b.markerShape==='square'?svgEl('rect',{x:-w/2,y:-h/2,width:w,height:h,...attrs}):svgEl('ellipse',{cx:0,cy:0,rx:w/2,ry:h/2,...attrs}));svg.append(g);
 }
 for(const b of layout.balls.filter(b=>!b.marker)){
  const r=layout.ballR/layout.tableL*760;svg.append(svgEl('circle',{cx:X(b.x),cy:Y(b.y),r,fill:b.id===0?'#fff':b.id===8?'#111':'#f1b53b',stroke:'#151515'}),svgEl('text',{x:X(b.x),y:Y(b.y)+4,fill:b.id===8?'#fff':'#111','text-anchor':'middle','font-size':11},b.id===0?'C':String(b.id)));
 }
 svg.append(svgEl('text',{x:50,y:475,fill:'currentColor'},'HEAD / KITCHEN'),svgEl('text',{x:810,y:475,fill:'currentColor','text-anchor':'end'},'FOOT / RACK'));
 return svg;
}
async function renderSetup(section,setup){
 const token=++request;section.replaceChildren(el('p','Loading setup…'));
 try{
  const url=new URL(setup.url,new URL('../',location.href));
  if(url.origin!==location.origin||!url.pathname.includes('/guide/layouts/'))throw Error('Invalid setup path');
  const r=await fetch(url);if(!r.ok)throw Error('Setup could not load');const file=await r.json();if(token!==request)return;
  // Undo practice must show the shot the student is to repeat, not the post-miss balls.
  const layout=file.kind==='session'&&file.history?.length>1?file.history[0]:file.layout;
  section.replaceChildren(el('h3',setup.title),diagram(layout,setup));
  if(setup.pocket)section.append(el('p',`First target: ${setup.target}-ball. Intended pocket: Length ${(setup.pocket[0]*8).toFixed(1)}, Width ${(setup.pocket[1]*4).toFixed(1)} (gold ring). This marks the starting objective, not an automatic pattern recommendation.`));
  section.append(el('p','Coordinates below are ball centers measured from cushion noses: Length 0–8 runs head to foot (left to right here); Width 0–4 runs top to bottom here. Each long rail has eight equal intervals and each short rail four. This is the same geometry as the narrated across/head-to-foot coordinates, with the columns explicitly labeled.'));
  const rows=layout.balls.filter(b=>!b.marker).map(b=>[b.id===0?'Cue ball':String(b.id),(b.x/layout.tableL*8).toFixed(3),(b.y/layout.tableW*4).toFixed(3),(b.x/.0254).toFixed(2),(b.y/.0254).toFixed(2)]);
  section.append(table(['Ball','Length diamonds','Width diamonds','Length inches','Width inches'],rows));
  const notes=el('p',`Source playing surface: ${(layout.tableL/.0254).toFixed(1)} × ${(layout.tableW/.0254).toFixed(1)} inches; ball diameter ${(layout.ballR*2/.0254).toFixed(2)} inches. On another table size use the diamond fractions, retain physical ball/target sizes, and recheck straight-in alignment and any ball-width offsets.`);notes.className='note';section.append(notes);
  const markers=layout.balls.filter(b=>b.marker);
  if(markers.length)section.append(table(['Target','Length diamonds','Width diamonds','Size inches'],markers.map((b,i)=>[(i+1)+': '+(b.markerType||'white')+' '+(b.markerShape||'circle'),(b.x/layout.tableL*8).toFixed(3),(b.y/layout.tableW*4).toFixed(3),`${b.markerWidthIn||b.markerDiameterIn||6} × ${b.markerHeightIn||b.markerDiameterIn||6}`])));
  section.append(el('p','Use flat cloth-safe references for zones; no raised object in the ball path. Unless the lesson specifies otherwise, score the cue-ball center inside the boundary.'));
  section.append(link('Download this setup file',url.href));
  if(setup.note)section.append(el('p',setup.note));
 }catch(error){if(token===request)section.replaceChildren(el('p',error.message));}
}
function lesson(id){
 request++;current=id;const card=catalog.topics[id];if(!card)return;
 const topic=all.find(t=>t.id===id),sheet=$('sheet');sheet.replaceChildren(el('h2',card.title));
 const label=el('p',card.group);label.className='status';sheet.append(label);
 const contract=el('section'),dl=el('dl');for(const [label,key]of [['Purpose','purpose'],['Instruction','instruction'],['Success','success'],['Transfer to your table','transfer'],['Next challenge','progression']])dl.append(el('dt',label),el('dd',card[key]));contract.append(dl);sheet.append(contract);
 if(card.physicalCheck)sheet.append(el('p','This lesson requires physical observation. A simulator does not assess stance, grip, bridge, or cue delivery.'));
 const setupSection=el('section');
 if(card.setups.length){
  const label=el('label','Starting layout'),select=el('select');select.className='setup-select';select.setAttribute('aria-label','Starting layout');for(const [i,s]of card.setups.entries()){const o=el('option',s.title);o.value=i;select.append(o);}select.onchange=()=>renderSetup(setupSection,card.setups[Number(select.value)]);label.append(select);sheet.append(label,setupSection);renderSetup(setupSection,card.setups[0]);
 }else sheet.append(el('p','This is an orientation or tool operation. Choose a skill lesson from a learning path for a prescribed physical setup.'));
 if(Object.keys(card.existingPractice||{}).length){const s=el('section');s.append(el('h3','Existing drill instructions'));for(const [k,v]of Object.entries(card.existingPractice)){s.append(el('strong',k+': '),el('p',v));}sheet.append(s);}
 const score=el('section');score.append(el('h3','Physical practice record'),el('p','Date: __________  Table: __________  Game/rules: __________  Target size: __________'),el('p','Record physical attempts here. Use N/A when a column does not apply. In a runout, continue from the actual leave; reset only at the end of the attempt.'));
 const scoreTable=table(['Attempt','Pot','Position','Legal/contact','Short / long / left / right; observation'],Array.from({length:5},(_,i)=>[i+1,'','','','']));scoreTable.className='score';score.append(scoreTable,el('p','One adjustment for the next set: __________________________________________________'),el('p','Suggested targets are practice goals, not a skill rating. Repeating an identical simulated shot does not measure physical consistency.'));sheet.append(score);
 if(topic?.text){const details=el('details');if(id.startsWith('drill-'))details.open=true;details.append(el('summary',id.startsWith('drill-')?'Existing drill sequence':topic.recordingStatus==='pending'?'Written lesson — audio pending':'Existing narration text'),el('p',topic.text));sheet.append(details);}
 if(topic?.resources?.length){const s=el('section');s.append(el('h3','Further instruction'));const ul=el('ul');for(const r of topic.resources){try{const u=new URL(r.url);if(!['http:','https:'].includes(u.protocol))continue;const li=el('li');li.append(link(r.title,u.href));ul.append(li);}catch(_){}}s.append(ul);sheet.append(s);}
 history.replaceState(null,'','?topic='+encodeURIComponent(id));
}
function fill(pathIndex,preferred){
 const ids=pathIndex==='all'?all.filter(t=>catalog.topics[t.id]?.visible&&!t.categoryWelcome&&['start','fundamentals','physics','drills','exercises'].includes(catalog.topics[t.id].category)).map(t=>t.id):catalog.paths[Number(pathIndex)].topics;
 $('lesson').replaceChildren();for(const id of ids){const card=catalog.topics[id];if(!card)continue;const o=el('option',card.title);o.value=id;$('lesson').append(o);}
 if(ids.includes(preferred))$('lesson').value=preferred;
 if($('lesson').value)lesson($('lesson').value);
}
async function init(){
 const responses=await Promise.all(['learning-catalog.json?v=topic-guide-v2','pool-audio-map.json?v=completion-tour-v25','recorded-audio.json?v=presets-recovery-v13'].map(url=>fetch(url).then(r=>{if(!r.ok)throw Error('Practice catalog could not load');return r.json();})));
 catalog=responses[0];const topics=new Map(responses[1].topics.map(t=>[t.id,t]));for(const r of responses[2].records)if(['Main','Shared'].includes(r.page))topics.set(r.topic.id,{...topics.get(r.topic.id),...r.topic});for(const t of catalog.newTopics)topics.set(t.id,t);all=[...topics.values()];
 const p=$('path');p.append(new Option('All lessons','all'));catalog.paths.forEach((path,i)=>p.append(new Option(path.title,String(i))));
 const wanted=new URLSearchParams(location.search).get('topic'),exists=!!catalog.topics[wanted];
 p.value='all';p.onchange=()=>fill(p.value,current);$('lesson').onchange=()=>lesson($('lesson').value);$('print').onclick=()=>window.print();
 // Explorer/tool links can point to a contract outside the lesson picker.
 if(exists){fill('all',wanted);if($('lesson').value!==wanted){const o=new Option(catalog.topics[wanted].title,wanted);$('lesson').append(o);$('lesson').value=wanted;lesson(wanted);}}
 else fill('all');
}
init().catch(error=>$('sheet').replaceChildren(el('p',error.message)));
})();
