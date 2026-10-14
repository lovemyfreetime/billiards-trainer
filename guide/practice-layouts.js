(function(global){
'use strict';
let pending;
function load(){return pending||(pending=fetch('./guide/practice-layouts.json?v=corner-guide-v9').then(r=>{if(!r.ok)throw Error('Practice layouts unavailable');return r.json()}));}
async function attach(topics){const data=await load();for(const t of topics)t.setups=data.topics[t.id]||[];return data;}
async function apply(url){const r=await fetch(url);if(!r.ok)throw Error('Starting layout unavailable');const text=await r.text();const file=global.BilliardsLayoutFiles.parse(text);global.billiardsGuideApplyLayout(file);await global.BilliardsSavedFiles?.remember(file,url.split('/').pop()).catch(()=>{});}
global.BilliardsPracticeLayouts={load,attach,apply};
})(window);
