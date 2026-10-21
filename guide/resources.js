/* Resources are browsed deliberately: listening never opens an external page. */
(function(global){
'use strict';
function render({topics,welcome,selected,playing,groups,onGroup,onListen,onOpen,onPractice}){
 const panel=document.createElement('section');panel.className='btg-resources';panel.setAttribute('aria-label','Recommended learning resources');
 const intro=document.createElement('div');intro.className='btg-resources-intro';
 const heading=document.createElement('h2');heading.textContent='Learn from the table. Practice with the Trainer.';
 const note=document.createElement('p');note.textContent='Tor Lowry · Zero-X Billiards and Jasmin Ouschan · Billiards Explained';
 const listen=document.createElement('button');listen.type='button';listen.dataset.action='resource-listen-'+welcome.id;listen.textContent=selected?.id===welcome.id&&playing?'Pause introduction':'Listen to introduction';listen.onclick=()=>onListen(welcome.id);
 intro.append(heading,note,listen);panel.append(intro);
 const introText=document.createElement('details'),introLabel=document.createElement('summary'),introScript=document.createElement('p');introLabel.textContent='Read introduction';introScript.textContent=welcome.text;introText.open=groups['read:'+welcome.id]===true;introText.ontoggle=()=>onGroup('read:'+welcome.id,introText.open);introText.append(introLabel,introScript);intro.append(introText);
 const status=document.createElement('p');status.className='btg-resource-now';status.setAttribute('aria-live','polite');status.textContent=(playing?'Listening: ':'Selected: ')+(selected?.title||'Welcome to Resources');panel.append(status);
 const internet=document.createElement('p');internet.className='btg-resource-note';internet.textContent='Previews are available offline. YouTube videos and websites require internet.';panel.append(internet);
 for(const group of [...new Set(topics.map(t=>t.group))]){
  const section=document.createElement('details');section.className='btg-resource-group';section.dataset.resourceGroup=group;section.open=groups[group]!==false;section.ontoggle=()=>onGroup(group,section.open);
  const title=document.createElement('summary');title.textContent=group;section.append(title);
  for(const t of topics.filter(t=>t.group===group)){
   const card=document.createElement('article');card.className='btg-resource-card';card.dataset.resourceId=t.id;card.classList.toggle('btg-resource-selected',selected?.id===t.id);
   const name=document.createElement('h3');name.textContent=t.title;
   const kind=document.createElement('span');kind.className='btg-resource-kind';kind.textContent=t.resourceKind||'Video';
   const description=document.createElement('p');description.textContent=t.summary;
   const actions=document.createElement('div');actions.className='btg-resource-actions';
   const listen=document.createElement('button');listen.type='button';listen.dataset.action='resource-listen-'+t.id;listen.textContent=selected?.id===t.id&&playing?'Pause preview':'Listen';listen.setAttribute('aria-label',listen.textContent+': '+t.title);listen.onclick=()=>onListen(t.id);actions.append(listen);
   for(const resource of t.resources||[]){
    let url;try{url=new URL(resource.url);if(!['https:','http:'].includes(url.protocol))continue;}catch{continue;}
    const link=document.createElement('a');link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';link.dataset.action='resource-open-'+t.id+'-'+actions.children.length;
    link.textContent=resource.action||(url.hostname.includes('youtube.com')?'Watch on YouTube':'Visit website');link.setAttribute('aria-label',link.textContent+': '+(resource.title||t.title));link.onclick=e=>{e.preventDefault();onOpen(t,resource.url);};actions.append(link);
   }
   if(t.setups?.length){const practice=document.createElement('button');practice.type='button';practice.dataset.action='resource-practice-'+t.id;practice.textContent='Practice in Trainer';practice.onclick=()=>onPractice(t);actions.append(practice);}
   card.append(kind,name,description,actions);
   if(selected?.id===t.id){const transcript=document.createElement('details');transcript.className='btg-resource-transcript';transcript.open=groups['read:'+t.id]===true;transcript.ontoggle=()=>onGroup('read:'+t.id,transcript.open);const label=document.createElement('summary');label.textContent='Read preview';const text=document.createElement('p');text.textContent=t.text;transcript.append(label,text);card.append(transcript);}
   section.append(card);
  }panel.append(section);
 }
 return panel;
}
global.BilliardsResources={render};
})(window);
