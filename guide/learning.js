/* Written practice contracts supplement the existing recordings. */
(function(global){
'use strict';
let pending;
function load(){return pending||(pending=fetch('./guide/learning-catalog.json?v=topic-guide-v2').then(r=>{if(!r.ok)throw Error('Practice instructions unavailable');return r.json();}));}
async function attach(topics){
 const data=await load();
 for(const extra of data.newTopics)if(!topics.some(t=>t.id===extra.id))topics.push({...extra});
 for(const topic of topics){
  const card=data.topics[topic.id];if(!card||topic.categoryWelcome||topic.category==='more')continue;
  topic.learning=card;if(topic.category!=='start')topic.group=card.group;topic.setups=card.setups;
  if(card.visible&&['fundamentals','physics','drills','exercises'].includes(card.category)){
   topic.category=card.category;topic.explorerOnly=false;
  }
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
