/* Optional details for the same energy ledger used by the table overlay. */
(() => {
 'use strict';
 let shots=[],selected=1,enabled=false,expanded=false;
 const $=id=>document.getElementById(id),api=()=>window.BilliardsShotBudget;
 const name=id=>id===0?'Cue ball':'Ball '+id;
 const node=(tag,text,cls)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(cls)el.className=cls;return el;};
 function amount(percent,preview){return api().format(percent)+'% · '+api().format((preview.strokeFeel||0)*Math.max(0,percent)/100)+'D';}
 function render(){
  const button=$('budgetInfo'),panel=$('budgetInfoPanel');if(!button||!panel)return;
  button.hidden=!enabled;button.setAttribute('aria-expanded',String(expanded&&enabled));panel.hidden=!enabled||!expanded;
  if(panel.hidden)return;
  const opened=new Set([...panel.querySelectorAll('details[open]')].map(el=>el.dataset.key));
  const hadRows=panel.dataset.shot===String(selected)&&panel.querySelector('details')!==null;
  panel.dataset.shot=String(selected);
  panel.replaceChildren();
  const tabs=node('div',undefined,'budgetShotTabs');tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Shot budget selection');
  for(const shot of shots){const tab=node('button','Shot '+shot.which);tab.type='button';tab.setAttribute('aria-pressed',String(selected===shot.which));tab.onclick=()=>{selected=shot.which;render();};tabs.append(tab);}panel.append(tabs);
  const preview=shots.find(s=>s.which===selected)?.preview;
  panel.append(node('p','Percentages use the starting shot. D is its calibrated energy budget, not travel distance.','budgetHint'));
  if(!preview?.budgetPaths){panel.append(node('p','No budget available for this shot.'));return;}
  panel.append(node('div','Starting budget: '+amount(100,preview),'budgetStart'));
  const list=node('div',undefined,'budgetJourney');
  const items=api().journey(preview);let ballNumber=0;
  for(const [itemIndex,item] of items.entries()){
   const details=node('details'),key=selected+':'+item.kind+':'+(item.index??item.id)+':'+itemIndex;details.dataset.key=key;
   const summary=node('summary');
   if(item.kind==='ball'){
    ballNumber++;const {event}=item,{source,target,donor,receiver,given,received}=api().exchange(event);
    summary.textContent='Contact '+ballNumber+': '+name(source.id)+' → '+name(target.id);
    const wrap=node('div',undefined,'budgetEvent');wrap.append(node('p',api().format(event.overlap)+'% overlap','budgetOverlap'));
    const table=node('table');const head=node('tr');for(const title of ['Energy','% of shot','Diamonds'])head.append(node('th',title));const thead=node('thead');thead.append(head);table.append(thead);
    const body=node('tbody');
    for(const [label,value,cls] of [['Incoming total',event.incoming,''],[name(source.id)+' keeps',event.after[donor].percent,''],[name(target.id)+' carries',event.after[receiver].percent,'budgetReceive'],['Transferred to '+name(target.id),received,'budgetReceive'],[name(source.id)+' gives',given,'budgetLoss'],['Collision loss',event.loss,'budgetLoss']]){
     const row=node('tr',undefined,cls);row.append(node('td',label),node('td',api().format(value)+'%'),node('td',api().format((preview.strokeFeel||0)*Math.max(0,value)/100)+'D'));body.append(row);
    }
    table.append(body);wrap.append(table);details.append(summary,wrap);
    details.open=opened.has(key)||(!hadRows&&ballNumber===1);
   }else{
    const label={travel:'cloth / travel loss',cushion:'cushion / jaw loss',pocket:'pocket arrival',end:'at rest / end of preview'}[item.kind];
    summary.textContent=name(item.id)+' · '+label+' · '+amount(item.loss??item.to,preview);
    const text=item.from===undefined?'Remaining: '+amount(item.to,preview):'Before '+amount(item.from,preview)+' → after '+amount(item.to,preview);
    details.append(summary,node('p',text,'budgetEvent'));details.open=opened.has(key);
   }
   list.append(details);
  }
  panel.append(list);
 }
 window.BilliardsBudgetInfo={
  update(on,previews){enabled=!!on;shots=previews;if(!shots.some(s=>s.which===selected))selected=shots[0]?.which||1;if(!enabled)expanded=false;render();},
  toggle(){expanded=!expanded;render();},
 };
})();
