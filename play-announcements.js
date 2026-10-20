/* Recorded Chase gameplay vocabulary and privacy-safe announcement plans. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.BilliardsAnnouncements=api;})(typeof window==='object'?window:null,function(){'use strict';
let previousTurn=-1;
function turn(){const choices=[0,1,2].filter(n=>n!==previousTurn);previousTurn=choices[Math.floor(Math.random()*choices.length)];return 'turn-'+(previousTurn+1);}
function number(value){
 if(!Number.isFinite(value)||value<0||value>=1000000)return [];
 const rounded=Math.round(value*10)/10,n=Math.floor(rounded),out=[];
 function integer(v){if(v<=100){out.push('number-'+v);return;}if(v>=1000){integer(Math.floor(v/1000));out.push('thousand');v%=1000;}if(v>=100){out.push('number-'+Math.floor(v/100),'hundred');v%=100;}if(v)out.push('number-'+v);}
 integer(n);if(rounded!==n)out.push('point','number-'+Math.round((rounded-n)*10));return out;
}
function player(seat){return Number.isInteger(seat)&&seat>=0&&seat<12?['player-'+(seat+1)]:[];}
function result(s){if(!s?.result)return [];if(s.game==='ghost')return [s.result.winners?.length?'you-win':'ghost-wins','game-complete'];if(s.game==='saboteur')return [s.result.winners?.length>1?'crew-wins':'saboteur-wins','game-complete'];const winners=s.result.winners||[];const prefix=s.game==='bingo'?['bingo']:[];return winners.length?[...prefix,...winners.flatMap(player),winners.length>1?'tie':'wins','game-complete']:['game-complete'];}
function phase(s){if(s.phase==='result')return result(s);const seat=s.phase==='vote'?s.voteSeat:s.active,who=player(seat);if(s.phase==='choose')return [...who,'choose-card'];if(s.phase==='vote')return [...who,'private-vote'];if(s.phase==='fleet')return [...who,'choose-fleet'];if(s.phase==='hand-result'){const w=s.handWinners||[];return ['round',...number(s.round),...w.flatMap(player),...(w.length?[w.length>1?'tie':'wins']:[])];}if(s.phase==='placement')return [...who,s.needsRack?'rack-balls':'ball-in-hand'];if(s.phase==='ready'||s.phase==='task')return [...who,s.isBreak?'break':turn()];return [];}
function start(s){return ['game-'+s.game,...phase(s)];}
function ghost(before,s,event){const out=[];if(event.type==='shot'){if(s.points[0]>before.points[0])out.push('rack-won');else if(s.points[1]>before.points[1])out.push('rack-lost');else out.push(event.foul?(event.scratch?'scratch':'foul'):event.potted?.length?'made':'miss');}out.push('you',...number(s.points[0]),'ghost',...number(s.points[1]));if(s.phase==='result')out.push(...result(s));else if(s.phase==='ready'&&s.remaining.length)out.push(...number(s.remaining.length),'balls-left','lowest-ball',...number(Math.min(...s.remaining)));else out.push(...phase(s));if(event.type==='shot'&&(s.points[0]!==before.points[0]||s.points[1]!==before.points[1])){const g=s.ghostStats||{};out.push('best-run',...number(g.bestRun||0),'runout-rate',...number(Math.round(100*s.points[0]/(s.points[0]+s.points[1]))),'percent');}return out;}
function event(before,s,event){
 if(!s)return [];if(s.game==='ghost')return ghost(before,s,event);if(s.phase==='result')return result(s);
 const out=[];if(event.type==='shot'){out.push(...player(before.active),event.foul?(event.scratch?'scratch':'foul'):(event.made||event.potted?.length)?'made':'miss');if(s.game==='killer')out.push(...number(s.players[before.active].lives),'lives');else if(['bounty','cribbage','ring','turf','golf','highlow','three','bowliards','equalizer'].includes(s.game)){const score=s.players[before.active].score;if(Number.isFinite(score)&&score>=0)out.push('score',...number(score));}}
 if(event.type==='attack')out.push(s.last?.includes('HIT')?'hit':'miss');out.push(...phase(s));return out;
}
function guest(s,kind){if(kind==='next')return [...player(s.you),'next'];if(kind==='result')return result(s);return phase({...s,active:s.you,voteSeat:s.you});}
function drill(s,made){return [made?'made':'miss',...(s.done?['drill-complete']:[...player(s.active),'set',...number(s.set)])];}
return {number,player,turn,result,phase,start,event,guest,drill};
});
