/* Written practice contracts supplement the existing recordings. */
(function(global){
'use strict';
let pending;
function load(){return pending||(pending=fetch('./guide/learning-catalog.json?v=guided-cues-v1').then(r=>{if(!r.ok)throw Error('Practice instructions unavailable');return r.json();}));}
async function attach(topics){
 const data=await load();
 for(const topic of topics){
  const card=data.topics[topic.id];
  if(card&&!topic.categoryWelcome&&topic.category!=='more')topic.learning={...card,setups:topic.setups};
 }
 return data;
}
function element(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e;}
function render(container,topic){
 const card=topic?.learning;if(!card)return;
 const section=element('section',null,'btg-learning-card');section.setAttribute('aria-label','Practice plan');
 section.append(element('strong','Practice plan'));
 const dl=element('dl');
 for(const [label,key] of [['Purpose','purpose'],['Instruction','instruction'],['Success','success'],['Transfer','transfer'],['Next challenge','progression']]){
  dl.append(element('dt',label),element('dd',card[key]));
 }
 section.append(dl);
 if(card.physicalCheck)section.append(element('p','Physical check: use observation, video, or a coach. The table simulation does not assess body mechanics.','btg-setup-note'));
 const link=element('a','Open setup diagram and physical practice sheet');
 link.href='./guide/practice.html?topic='+encodeURIComponent(topic.id);link.target='_blank';link.rel='noopener';section.append(link);
 container.append(section);
}
global.BilliardsLearning={load,attach,render};
})(window);
