(function(root){
'use strict';
// Snapshots are supplied by the engine, so this store never runs physics or paints.
function create(limit=60){
 const entries=[],future=[];let pending=null;
 const key=s=>JSON.stringify(s.state)+'|'+s.undo.length+'|'+s.history.length+'|'+(s.redo?.length||0);
 return {
  begin(snapshot){if(!pending)pending={snapshot,key:key(snapshot)};},
  commit(snapshot){if(!pending)return false;const before=pending;pending=null;if(before.key===key(snapshot))return false;entries.push(before.snapshot);if(entries.length>limit)entries.shift();future.length=0;return true;},
  cancel(){pending=null;},
  undo(current){pending=null;if(!entries.length)return null;if(current)future.push(current);return entries.pop();},
  redo(current){pending=null;if(!future.length)return null;if(current){entries.push(current);if(entries.length>limit)entries.shift();}return future.pop();},
  get pending(){return !!pending;},get count(){return entries.length;},get redoCount(){return future.length;}
 };
}
if(typeof module!=='undefined'&&module.exports)module.exports={create};else root.BilliardsActionHistory={create};
})(typeof window!=='undefined'?window:this);
