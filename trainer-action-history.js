(function(root){
'use strict';
// Snapshots are supplied by the engine, so this store never runs physics or paints.
function create(limit=60){
 const entries=[];let pending=null;
 const key=s=>JSON.stringify(s.state)+'|'+s.undo.length+'|'+s.history.length;
 return {
  begin(snapshot){if(!pending)pending={snapshot,key:key(snapshot)};},
  commit(snapshot){if(!pending)return false;const before=pending;pending=null;if(before.key===key(snapshot))return false;entries.push(before.snapshot);if(entries.length>limit)entries.shift();return true;},
  cancel(){pending=null;},
  undo(){pending=null;return entries.pop()||null;},
  get pending(){return !!pending;},get count(){return entries.length;}
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports={create};else root.BilliardsActionHistory={create};
})(typeof window!=='undefined'?window:this);
