/* Our four first Play games. Pure state transitions, shared by table and scorekeeper. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BilliardsPlay=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const catalog=typeof module==='object'&&module.exports?require('./play-catalog.js'):globalThis.BilliardsCatalog;
const copy=x=>JSON.parse(JSON.stringify(x));
const games={
 killer:{name:'Killer',min:2,max:12,tag:'Make it. Stay alive.',rules:'Three lives. One shot per turn. Make a ball to stay safe; miss or foul to lose one life. Last player alive wins. A dry break gets one retry; a break scratch loses a life immediately. Rerack when empty. No eight-ball bonus in this version.'},
 poker:{name:'Poker Pool',min:2,max:6,tag:'Shoot for a better hand.',rules:'Five rounds, one shot each. Miss or foul: receive one random card. Make a legal pot: privately choose one of two cards. Multi-pots still earn one choice. After five full rounds, the best five-card poker hand wins. Equal hands tie; suits do not break ties. Rerack when empty. A legal break needs a pot or four object balls to cushions; one dry illegal-break retry is free.'},
 cutthroat:{name:'Cutthroat',min:3,max:3,tag:'Protect yours. Remove theirs.',rules:'Protect your five balls: 1–5, 6–10 or 11–15. Keep shooting after any legal pot, even your own. Losing your last ball ends your turn. Scratch: pots stay down, then one pocketed ball per opponent returns, bringing eliminated players back. Other foul pots return. Last surviving group wins after returns. If everyone goes out together, return one ball per group and continue.'},
 ghost:{name:'Ghost Runout',min:1,max:1,tag:'Beat the opponent who never misses.',rules:'Break, take cue ball anywhere, then clear in numerical contact order. Break pots count and break scratches are forgiven. First post-break miss or foul gives the rack to the ghost. Clear to win it yourself. Race to five. Highest ball made early returns until last. Any full break clearance wins a rack.'}
};
function random(s){let x=s.rng|0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
function shuffled(s,a){for(let i=a.length-1;i>0;i--){const j=Math.floor(random(s)*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function deck(s){return shuffled(s,Array.from({length:52},(_,i)=>i));}
function draw(s){if(!s.deck.length){s.deck=shuffled(s,s.discards.splice(0));}if(!s.deck.length)throw Error('No cards available');return s.deck.pop();}
function rankHand(cards){
 if(cards.length!==5)return null;
 const ranks=cards.map(c=>c%13+2).sort((a,b)=>b-a),counts=new Map();ranks.forEach(r=>counts.set(r,(counts.get(r)||0)+1));
 const groups=[...counts].sort((a,b)=>b[1]-a[1]||b[0]-a[0]),unique=[...counts.keys()].sort((a,b)=>b-a);
 const straight=unique.length===5&&(unique[0]-unique[4]===4?unique[0]:unique.join(',')==='14,5,4,3,2'?5:0);
 const flush=cards.every(c=>Math.floor(c/13)===Math.floor(cards[0]/13));
 let value,label;
 if(flush&&straight){value=[8,straight];label=straight===14?'Royal flush':'Straight flush';}
 else if(groups[0][1]===4){value=[7,groups[0][0],groups[1][0]];label='Four of a kind';}
 else if(groups[0][1]===3&&groups[1][1]===2){value=[6,groups[0][0],groups[1][0]];label='Full house';}
 else if(flush){value=[5,...ranks];label='Flush';}
 else if(straight){value=[4,straight];label='Straight';}
 else if(groups[0][1]===3){value=[3,...groups.map(g=>g[0])];label='Three of a kind';}
 else if(groups[0][1]===2&&groups[1][1]===2){value=[2,...groups.map(g=>g[0])];label='Two pair';}
 else if(groups[0][1]===2){value=[1,...groups.map(g=>g[0])];label='One pair';}
 else{value=[0,...ranks];label='High card';}
 return {value,label};
}
function compare(a,b){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]||0)-(b[i]||0);if(d)return Math.sign(d);}return 0;}
function ids(n){return Array.from({length:n},(_,i)=>i+1);}
Object.assign(games,catalog.games);
function create(opts){
 if(catalog.games[opts.game])return catalog.create(opts);
 const g=games[opts.game];if(!g)throw Error('Choose a game');
 const names=opts.names.map(x=>String(x).trim()).filter(Boolean);
 if(names.length<g.min||names.length>g.max)throw Error(g.min===g.max?`Choose ${g.min} player${g.min===1?'':'s'}`:`Choose ${g.min}–${g.max} players`);
 const n=opts.game==='ghost'&&[3,6,9,10].includes(+opts.balls)?+opts.balls:opts.game==='ghost'?3:15;
 const s={version:1,rules:'play-house-1',game:opts.game,mode:opts.mode==='real'?'real':'screen',players:names.map((name,i)=>({id:i,name,lives:3,hand:[]})),active:0,round:1,rack:1,shots:0,phase:'placement',needsRack:true,remaining:ids(n),ballCount:n,returns:[],ballInHand:true,isBreak:true,breakRetry:0,points:[0,0],pending:[],deck:[],discards:[],rng:(opts.seed>>>0)||123456789,last:'New game. Rack the balls.',result:null};
 if(s.game==='poker')s.deck=deck(s);return s;
}
function result(s,winners,text){s.phase='result';s.result={winners,text};s.last=text;}
function next(s){const start=s.active;do{s.active=(s.active+1)%s.players.length;}while(s.game==='killer'&&s.players[s.active].lives===0&&s.active!==start||s.game==='cutthroat'&&!alive(s,s.active)&&s.active!==start);}
function alive(s,i){return s.remaining.some(id=>Math.floor((id-1)/5)===i);}
function spot(s,balls){for(const id of balls){if(!s.remaining.includes(id)){s.remaining.push(id);s.returns.push(id);}}s.remaining.sort((a,b)=>a-b);}
function rack(s){s.needsRack=true;s.phase='placement';s.isBreak=true;s.breakRetry=0;s.ballInHand=true;}
function finishPokerTurn(s){
 s.pending=[];s.active++;
 if(s.active===s.players.length){s.active=0;s.round++;}
 if(s.round>5){
  const ranked=s.players.map(p=>rankHand(p.hand));let best=0;for(let i=1;i<ranked.length;i++)if(compare(ranked[i].value,ranked[best].value)>0)best=i;
  const winners=ranked.map((r,i)=>compare(r.value,ranked[best].value)===0?i:-1).filter(i=>i>=0);
  result(s,winners,`${winners.map(i=>s.players[i].name).join(' & ')} ${winners.length>1?'tie':'wins'} · ${ranked[best].label}`);return;
 }
 if(!s.remaining.length){s.rack++;rack(s);}
}
function ghostRack(s,win){s.points[win?0:1]++;s.last=win?'You won the rack.':'The ghost takes the rack.';if(s.points[win?0:1]===5){result(s,win?[0]:[],win?'You beat the ghost!':'The ghost wins the match.');return;}s.rack++;rack(s);}
function resolve(s,event){
 if(s.phase!=='ready')throw Error('Finish the current step first');
 const p=s.players[s.active],wasBreak=s.isBreak,valid=event.potted||[];
 if(new Set(valid).size!==valid.length||valid.some(id=>!s.remaining.includes(id)))throw Error('Choose balls still on the table');
 let foul=!!event.foul;const made=valid.length>0||!!event.made;
 const first=event.firstContact;
 if(event.auto){
  if(first===null||first===undefined)foul=true;
  if(!wasBreak&&!(event.railAfter||made))foul=true;
  if(s.game==='ghost'&&!wasBreak&&first!==Math.min(...s.remaining))foul=true;
 }
 // Only a legal dry break can receive a free retry. A reported foul never does.
 if(wasBreak&&!foul&&s.game!=='ghost'&&!made&&(s.game==='killer'||event.breakLegal===false)){
  if(!s.breakRetry){s.breakRetry=1;s.needsRack=true;s.phase='placement';s.last='Free break retry. Rack again.';return;}
  if(s.game!=='killer')foul=true;
 }
 s.shots++;s.isBreak=false;s.returns=[];s.ballInHand=false;
 s.remaining=s.remaining.filter(id=>!valid.includes(id));
 if(s.game==='ghost'){
  if(valid.includes(s.ballCount)&&s.remaining.length)spot(s,[s.ballCount]);
  if(wasBreak){s.ballInHand=true;s.phase='placement';s.last='Break complete. Place cue ball anywhere.';if(!s.remaining.length)ghostRack(s,true);return;}
  if(foul||!made){ghostRack(s,false);return;}
  if(!s.remaining.length){ghostRack(s,true);return;}
  s.last=`${valid.length} made. Keep shooting.`;if(s.returns.length)s.phase='placement';return;
 }
 if(foul&&!(s.game==='cutthroat'&&event.scratch))spot(s,valid);
 if(foul)s.ballInHand=true;
 if(s.game==='killer'){
  if(foul||!made)p.lives--;
  const survivors=s.players.filter(x=>x.lives>0);
  s.last=`${p.name}: ${foul?'foul · one life lost':made?'made · safe':'miss · one life lost'}.`;
  if(survivors.length===1){result(s,[survivors[0].id],`${survivors[0].name} wins Killer!`);return;}next(s);
 }else if(s.game==='poker'){
  if(made&&!foul){s.pending=[draw(s),draw(s)];s.phase='choose';s.last=`${p.name} made a ball. Choose one of two cards privately.`;return;}
  p.hand.push(draw(s));s.last=`${p.name}: ${foul?'foul':'miss'} · one random card dealt.`;finishPokerTurn(s);
 }else if(s.game==='cutthroat'){
  if(event.scratch){for(let i=0;i<3;i++)if(i!==s.active){const id=ids(5).map(n=>n+i*5).find(n=>!s.remaining.includes(n));if(id)spot(s,[id]);}}
  let survivors=s.players.filter(x=>alive(s,x.id));
  if(!survivors.length){spot(s,[1,6,11]);survivors=s.players;}
  if(survivors.length===1){result(s,[survivors[0].id],`${survivors[0].name} wins Cutthroat!`);return;}
  s.last=`${p.name}: ${foul?'foul':made?`${valid.join(', ')} made`:'miss'}${s.returns.length?' · return '+s.returns.join(', '):''}.`;
  if(foul||!made||!alive(s,s.active))next(s);
 }
 if(s.phase==='result')return;
 if(!s.remaining.length){s.rack++;rack(s);}else if(s.ballInHand||s.returns.length)s.phase='placement';
}
function reduce(state,event){
 if(catalog.games[state.game])return catalog.reduce(state,event);
 const s=copy(state);
 if(event.type==='ready'){
  if(s.phase!=='placement')throw Error('No placement pending');
  if(s.needsRack){s.remaining=ids(s.ballCount);s.needsRack=false;}
  s.returns=[];s.phase='ready';s.last=s.isBreak?`${s.players[s.active].name} to break.`:`${s.players[s.active].name} shooting.`;
 }else if(event.type==='shot')resolve(s,event);
 else if(event.type==='choose'){
  if(s.phase!=='choose'||![0,1].includes(event.index))throw Error('Choose one of the two cards');
  s.players[s.active].hand.push(s.pending[event.index]);s.discards.push(s.pending[1-event.index]);s.phase='ready';s.last=`${s.players[s.active].name} kept a card.`;finishPokerTurn(s);
  if(s.phase!=='result'&&(s.returns.length||s.ballInHand))s.phase='placement';
 }else if(event.type==='empty'){
  if(s.mode!=='real'||s.phase!=='ready'||!['killer','poker'].includes(s.game))throw Error('Rack cannot reset now');
  rack(s);s.rack++;s.last='Rack empty. Next player breaks.';
 }else throw Error('Unknown action');
 return s;
}
function cardLabel(c){return ['2','3','4','5','6','7','8','9','10','J','Q','K','A'][c%13]+['♠','♥','♦','♣'][Math.floor(c/13)];}
return {games,create,reduce,rankHand,compare,cardLabel,alive};
});
