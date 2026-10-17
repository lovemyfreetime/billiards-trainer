(function(){
'use strict';
const params=new URLSearchParams(location.search),enabled=params.get('play')==='1',E=window.BilliardsPlay,C=window.BilliardsCatalog;
function link(mode){const url=new URL(location.href);url.searchParams.delete('zen');url.searchParams.delete('play');if(mode!=='train')url.searchParams.set(mode,'1');return url.toString();}
function init(){
 if(!enabled){if(params.get('zen')==='1')return;const a=document.createElement('a');a.id='btPlayLauncher';a.href=link('play');a.textContent='Play';a.title='Open the Play game room';a.style.cssText='position:fixed;left:80px;bottom:14px;z-index:55;padding:13px 20px;border:1px solid #4fbdd7;border-radius:25px;color:#eaf7f7;background:#164357;text-decoration:none;font:700 15px system-ui';a.onclick=()=>window.billiardsPlayBridge.save();document.body.append(a);return;}
 const bridge=window.billiardsPlayBridge,KEY='billiardsPlaySession-v1';let state=null,history=[],shotBefore=null,privacy=false,paused=false,audio=false,storageError='',selected=new Set(),returnFocus=null,expanded=false,focusControls=false,shownSceneKey=null,shotStartedAt=null;
 document.body.classList.add('play-mode');
 const root=document.createElement('section');root.id='playRoot';root.setAttribute('aria-label','Billiards Play game room');root.innerHTML=`
 <header class="play-header"><div class="play-brand">BILLIARDS <span style="color:#54d6e9">PLAY</span><small>Our table. Our rules.</small></div><nav aria-label="Session"><button id="playAudio" aria-pressed="false">Audio off</button><button id="playPause">Pause</button><button id="playRules">Rules</button><button id="playNew">Games</button></nav></header>
 <div id="playPlayers" aria-label="Players and scores"></div>
 <main class="play-main"><section id="playStage" aria-label="Playing table"><div class="play-table-toolbar" id="playTableToolbar"><span id="playFocusTurn" hidden></span><button id="playFocusControls" aria-expanded="false" aria-controls="playStrokeControls" hidden>Shot controls</button><button id="playFocusUndo" hidden disabled>Undo Shot</button><button id="playExpand" aria-expanded="false" aria-controls="playStage">Expand table</button></div><div id="playPhysical" class="play-result" hidden></div><div class="play-screen-hint">Drag the cue to aim · wheel for fine aim · Space to shoot</div><div id="playResult" class="play-result" hidden></div></section><aside id="playDock"><div class="play-eyebrow" id="playRound">Game room</div><h1 id="playTitle">Choose your game</h1><p id="playObjective">A little pressure. A little luck. One more game.</p><div id="playNotice" role="status" aria-live="polite">Choose Games to begin.</div><div id="playModule"></div><div id="playBalls" role="group" aria-label="Balls made on this shot"></div><div id="playActions"></div><div id="playStrokeControls" class="play-controls"></div></aside></main>
 <footer class="play-footer"><nav aria-label="Experience"><a href="${link('train')}">Train</a><a href="${link('play')}" aria-current="page">Play</a><a href="${link('zen')}">Zen</a></nav><span id="playLatest"></span><button id="playUndo" disabled>Undo Shot</button></footer>
 <dialog id="playDialog" aria-labelledby="playDialogTitle"></dialog>`;
 document.body.append(root);root.querySelector('#playStage').prepend(document.getElementById('stageWrap'));
 const $=id=>document.getElementById(id),dialog=$('playDialog');
 function setExpanded(value){
  expanded=!!(value&&state?.mode==='screen');if(!expanded)focusControls=false;
  root.classList.toggle('play-table-expanded',expanded);root.classList.toggle('play-focus-controls',expanded&&focusControls);
  $('playExpand').textContent=expanded?'Game view':'Expand table';$('playExpand').setAttribute('aria-expanded',String(expanded));
  $('playExpand').setAttribute('aria-label',expanded?'Return to game view':'Expand playable table');
  for(const id of ['playFocusTurn','playFocusControls','playFocusUndo'])$(id).hidden=!expanded;
  $('playFocusControls').setAttribute('aria-expanded',String(expanded&&focusControls));
  window.dispatchEvent(new Event('resize'));
 }
 function speech(message){if(!audio||!window.speechSynthesis||privacy||paused)return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(message);u.rate=1.08;window.speechSynthesis.speak(u);}
 function text(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;}
 function button(label,action,cls=''){const b=text('button',label,cls);b.type='button';b.onclick=action;return b;}
 function capture(){return {state:JSON.parse(JSON.stringify(state)),table:bridge.capture()};}
 function save(){if(!state)return;try{localStorage.setItem(KEY,JSON.stringify({version:1,...capture(),history}));storageError='';}catch(e){storageError='Browser storage is full or unavailable. This game is in memory only.';}}
 function physicalSync(){if(state?.mode!=='screen')return;if(state.scene&&shownSceneKey!==state.sceneKey){bridge.scenario(state.scene);shownSceneKey=state.sceneKey;}else if(state.needsRack)bridge.rack(state.ballCount);else bridge.reconcile(state.remaining);}
 function transact(event,before){
  if(!state||bridge.busy())return;
  try{const next=E.reduce(state,event);history.push(before||capture());history=history.slice(-45);state=next;selected.clear();physicalSync();save();render();if(state.phase==='ready')speech(`${state.players[state.active].name}. ${state.isBreak?'Break.':state.game==='ghost'?'Lowest first.':'Your turn.'}`);else if(state.phase==='result')speech(state.result.text);}
  catch(e){$('playNotice').textContent=e.message;}
 }
 function undo(){if(bridge.busy()||!history.length)return;const previous=history.pop();state=previous.state;shownSceneKey=state.sceneKey;bridge.restore(previous.table);shotBefore=null;selected.clear();closeDialog();paused=false;window.speechSynthesis?.cancel();save();render();}
 function openDialog(title,privateView=false){closeDialog();returnFocus=document.activeElement;privacy=privateView;dialog.replaceChildren(text('h2',title));dialog.firstChild.id='playDialogTitle';dialog.showModal();return dialog;}
 function closeDialog(){privacy=false;if(dialog.open)dialog.close();dialog.replaceChildren();}
 dialog.addEventListener('close',()=>{if(dialog.open)return;privacy=false;dialog.replaceChildren();returnFocus?.focus?.({preventScroll:true});});
 dialog.addEventListener('cancel',()=>{privacy=false;});
 function dismiss(label='Back to table'){const row=text('div','','play-dialog-actions');row.append(button(label,closeDialog));dialog.append(row);}
 function shieldPrivate(){if(privacy)closeDialog();}
 window.addEventListener('blur',shieldPrivate);document.addEventListener('visibilitychange',()=>{if(document.hidden){shieldPrivate();if(state?.game==='speed'&&state.timer)state=E.reduce(state,{type:'interrupt'});save();}});
 function showPrivate(){
  if(!state)return;if(C.games[state.game])return catalogPrivate();
  const p=state.players[state.active];openDialog(`Pass to ${p.name}`,true);dialog.append(text('p','Turn the screen away from the room. This is a shared-device private view.'));
  const reveal=button('Reveal privately',()=>{
   dialog.replaceChildren(text('h2',`${p.name} · your hand`));dialog.firstChild.id='playDialogTitle';
   const cards=text('div','','play-cards');if(!p.hand.length)cards.append(text('p','No cards yet.'));p.hand.forEach(c=>cards.append(card(c)));dialog.append(cards);
   if(state.phase==='choose'){dialog.append(text('p','Choose one card to keep. The other is discarded.'));const choices=text('div','','play-cards');state.pending.forEach((c,i)=>{const b=card(c,()=>{closeDialog();transact({type:'choose',index:i});});b.setAttribute('aria-label',`Keep ${E.cardLabel(c)}`);choices.append(b);});dialog.append(choices);}else dismiss('Hide hand');
  },'play-private');dialog.append(reveal);dismiss('Keep hidden');
 }
 function card(c,action){const node=action?button(E.cardLabel(c),action):text('div',E.cardLabel(c));node.className='play-card'+([1,2].includes(Math.floor(c/13))?' red':'');return node;}
 function showRules(){if(!state)return;openDialog(`${E.games[state.game].name} · our rules`);dialog.append(text('p',E.games[state.game].rules),text('p','A foul takes priority over a made ball. Unless this game says otherwise, foul-shot balls return and the next player gets cue ball anywhere. In real-table mode, report the result honestly; Undo corrects mistakes.'));dismiss();}
 function setup(game){
  if(!game){openDialog('What shall we play?');dialog.append(text('p','Twenty ways to make the next shot matter. Choose our house game, then make it yours.'));const grid=text('div','','play-game-grid');Object.entries(E.games).forEach(([id,g])=>{const b=button('',()=>setup(id));b.append(text('strong',g.name),text('small',`${g.tag} · ${g.min===g.max?g.min:g.min+'–'+g.max} player${g.max===1?'':'s'}`));grid.append(b);});const label=text('label','Find a game');label.htmlFor='playGameSearch';const search=document.createElement('input');search.id='playGameSearch';search.type='search';search.placeholder='Game name or style';search.oninput=()=>{for(const b of grid.children)b.hidden=!b.textContent.toLowerCase().includes(search.value.trim().toLowerCase());};dialog.append(label,search,grid);if(state)dismiss('Resume game');return;}
  const g=E.games[game];openDialog(g.name);dialog.append(text('p',g.rules));
  const form=document.createElement('form');
  const modeLabel=text('label','Where are you playing?');modeLabel.htmlFor='playSetupMode';const mode=document.createElement('select');mode.id='playSetupMode';[['screen','On-screen table'],['real','At a real table · scorekeeper']].forEach(([value,label])=>{const o=text('option',label);o.value=value;mode.append(o);});
  const namesLabel=text('label',`Players · separate names with commas (${g.min===g.max?g.min:g.min+'–'+g.max})`);namesLabel.htmlFor='playSetupNames';const names=document.createElement('input');names.id='playSetupNames';names.maxLength=500;names.value=Array.from({length:Math.max(g.min,Math.min(2,g.max))},(_,i)=>'Player '+(i+1)).join(', ');names.autocomplete='off';
  form.append(modeLabel,mode,namesLabel,names);
  let count=null;if(game==='ghost'){const label=text('label','How many balls?');label.htmlFor='playSetupCount';count=document.createElement('select');count.id='playSetupCount';[3,6,9,10].forEach(n=>{const o=text('option',`${n} balls`);o.value=n;count.append(o);});form.append(label,count);}
  let allowances=null;if(game==='equalizer'){allowances=document.createElement('input');allowances.id='playAllowances';allowances.value='1, 1';const l=text('label','Allowed misses per player (0–2), separated by commas');l.htmlFor=allowances.id;form.append(l,allowances);form.append(text('p','Each player also has one optional cue-ball reset per layout.'));}
  const error=text('p','');error.setAttribute('role','alert');form.append(error);const row=text('div','','play-dialog-actions');row.append(button('Other games',()=>setup()));const start=button(state?'Start new game':'Rack them up',null,'play-primary');start.type='submit';row.append(start);form.append(row);
  if(state)form.append(text('p','Starting a new game replaces the saved game. Back to table keeps your current game.'));
  form.onsubmit=e=>{e.preventDefault();try{const seed=crypto.getRandomValues(new Uint32Array(1))[0],next=E.create({game,mode:mode.value,names:names.value.split(',').map(n=>n.slice(0,28)),balls:count?.value,allowances:allowances?.value.split(',').map(Number),seed});state=next;shownSceneKey=null;history=[];paused=false;selected.clear();bridge.enter();physicalSync();save();closeDialog();render();}catch(e){error.textContent=e.message;}};dialog.append(form);if(state)dismiss();
 }
 function report(foul=false){if(!state||state.phase!=='ready')return;if(foul){openDialog('Record a foul');dialog.append(text('p',selected.size?`Balls made: ${[...selected].join(', ')}. The foul will be resolved with these balls as one shot.`:'Report any balls made first if this game needs their numbers.'));const row=text('div','','play-dialog-actions');row.append(button('Scratch',()=>{closeDialog();transact({type:'shot',potted:[...selected],foul:true,scratch:true});},'play-foul'),button('Other foul',()=>{closeDialog();transact({type:'shot',potted:[...selected],foul:true});},'play-foul'));dialog.append(row);dismiss('Cancel');return;}transact({type:'shot',potted:[...selected],made:!needsBalls(),pockets:selectedPockets(),now:Date.now()});}

 function needsBalls(){return ['cutthroat','ghost','kelly','bounty','cribbage','ring','three','highlow','bowliards','equalizer','speed','golf'].includes(state?.game);}
 function selectedPockets(){const select=$('playPocket');return select?[...select.selectedOptions].map(o=>o.value):[];}
 function catalogPrivate(){
  const seat=state.phase==='vote'?state.voteSeat:state.active,p=state.players[seat];openDialog(`Pass to ${p.name}`,true);dialog.append(text('p','Turn the screen away from the room. Hide this view before passing.'));
  dialog.append(button('Reveal privately',()=>{
   dialog.replaceChildren(text('h2',`${p.name} · private view`));dialog.firstChild.id='playDialogTitle';
   if(['kelly','bounty'].includes(state.game))dialog.append(text('h3',`Your target: ${p.target}`));
   if(state.game==='blackjack'){const cards=text('div','','play-cards');p.hand.forEach(c=>cards.append(card(c)));dialog.append(cards,text('p',`Total ${C.total(p.hand)}`));}
   if(state.game==='saboteur')dialog.append(text('h3',seat===state.saboteur?'You are the saboteur. Keep the crew below quota.':'You are crew. Reach the quota.'));
   if(state.game==='battleship'){dialog.append(text('p','■ ship · · water. First three cells form one ship; last two the other.'));const grid=text('div','','play-grid');for(let i=0;i<9;i++)grid.append(text('div',`${String.fromCharCode(65+Math.floor(i/3))}${i%3+1} ${p.fleet.includes(i)?'■':'·'}`));dialog.append(grid);if(state.phase==='fleet'){dialog.append(button('Shuffle fleet',()=>{closeDialog();transact({type:'fleet-shuffle'});catalogPrivate();}),button('Lock fleet & hide',()=>{closeDialog();transact({type:'fleet-lock'});},'play-primary'));}}
   if(state.phase==='vote'){dialog.append(text('p','Choose one suspect. Your vote stays hidden until the final result.'));state.players.forEach((pl,i)=>dialog.append(button(pl.name,()=>{closeDialog();transact({type:'vote',index:i});})));dialog.append(button('Abstain',()=>{closeDialog();transact({type:'vote',index:-1});}));}dismiss('Hide private view');
  },'play-private'));dismiss('Keep hidden');
 }
 function catalogModule(dock){
  if(!C.games[state.game])return;const module=$('playModule'),p=state.players[state.active];
  $('playRound').textContent=`${state.mode==='real'?'Real table':'On-screen'} · Round ${state.round} · Our rules`;
  if(['kelly','ring'].includes(state.game))module.append(text('p',`Lowest first: ${Math.min(...state.remaining)}`));
  if(state.game==='highlow')module.append(text('p',`Contact ${((state.active+state.rack)%2===1)?Math.min(...state.remaining):Math.max(...state.remaining)} first.`));
  if(['kelly','bounty','blackjack','saboteur'].includes(state.game)&&state.phase!=='result')dock.append(button(`Private view · ${p.name}`,showPrivate,'play-private'));
  if(state.game==='cribbage')module.append(text('p',`Owed partners: ${state.held.map(n=>15-n).join(', ')||'none'}`));
  if(state.game==='blackjack'&&state.phase==='ready')dock.append(button('Stand',()=>transact({type:'stand'}),'play-subtle'));
  if(state.phase==='hand-result'){module.append(text('p',state.last));state.players.forEach(pl=>{const row=text('div',`${pl.name}: ${pl.hand.map(E.cardLabel).join(' ')} · ${pl.bust?'BUST':C.total(pl.hand)}`);module.append(row);});dock.append(button(state.round===3?'Finish match':'Next hand',()=>transact({type:'next-hand'}),'play-primary'));}
  if(state.phase==='fleet')dock.append(button('Place & lock your fleet privately',showPrivate,'play-private'));
  if(state.phase==='vote')dock.append(button(`Private vote · ${state.players[state.voteSeat].name}`,showPrivate,'play-private'));
  if(state.game==='bingo'||state.game==='horse'){
   if(state.phase==='task'){module.append(text('p',state.game==='horse'?'Leader: choose a shot to set.':'Choose an unmarked square.'));const grid=text('div','','play-grid');(state.game==='bingo'?p.board:C.tasks.map((_,i)=>i)).forEach((task,i)=>{const b=button(`${p.marks.includes(i)?'✓ ':''}${C.tasks[task]}`,()=>transact({type:'task',index:i}));b.disabled=state.game==='bingo'&&p.marks.includes(i);grid.append(b);});module.append(grid);}
   else if(state.task!=null)module.append(text('p',`${C.tasks[state.task]} · pot ball 1 in ${state.targetPocket}${state.task===5?' · cue finishes in bottom 35%':state.task===6?' · cue finishes in top 25%':''}. ${state.mode==='real'?'A witness verifies the full task; Ball made means task completed.':''}`));
  }
  if(state.game==='battleship'&&state.phase==='attack'){module.append(text('p','Choose an enemy cell.'));const grid=text('div','','play-grid'),enemy=state.players[1-state.active];for(let i=0;i<9;i++){const tried=p.attacks.includes(i),b=button(`${String.fromCharCode(65+Math.floor(i/3))}${i%3+1}${tried?(enemy.fleet.includes(i)?' HIT':' miss'):''}`,()=>transact({type:'attack',cell:i}));b.disabled=tried;grid.append(b);}module.append(grid);}
  if(state.game==='turf'){module.append(text('p',C.pockets.map((v,i)=>`${v}: ${state.owners[i]===null?'open':state.players[state.owners[i]].name}`).join(' · ')));}
  if(['golf','turf'].includes(state.game)&&state.mode==='real'&&state.phase==='ready'){const l=text('label',state.game==='golf'?`Hole ${state.round}: target ${state.targetPocket}. Select actual pocket made.`:'Select pockets made (multiple allowed).');const sel=document.createElement('select');sel.id='playPocket';sel.multiple=state.game==='turf';C.pockets.forEach(v=>{const o=text('option',v);o.value=v;sel.append(o);});if(state.game==='golf')sel.value=state.targetPocket;l.append(sel);module.append(l);}
  if(state.game==='golf'&&state.mode==='screen')module.append(text('h3',`Hole ${state.round}: ${state.targetPocket} · ${state.attempt} strokes`));
  if(state.game==='equalizer'){module.append(text('p',`Layout ${state.round}/5 · misses ${state.attempt}/${p.missesAllowed} · reset ${state.resetUsed?'used':'available'}`));if(state.phase==='ready'&&!state.resetUsed&&p.resetAllowed)dock.append(button('Use cue-ball reset',()=>transact({type:'reset-cue'})));}
  if(state.game==='bowliards'){module.append(text('p',state.freeBreak?'FREE BREAK · pots return; then place cue ball.':`Frame ${state.round}/10 · visit ${state.visit} balls · previous visits ${(p.frames[state.round-1]||[]).join(', ')||'none'}`));state.players.forEach(pl=>module.append(text('p',`${pl.name}: ${pl.frames.map((f,i)=>`${i+1}[${f.join(',')}]`).join(' ')} = ${C.bowlingScore(pl.frames)}`)));}
  if(state.mode==='real'&&['blackjack','turf','battleship','saboteur'].includes(state.game)&&state.phase==='ready')dock.append(button('Rack empty · Rerack',()=>transact({type:'empty'}),'play-subtle'));
  if(state.game==='speed'){
   module.append(text('h3','','play-clock'));if(!state.timer)module.lastChild.textContent='Clock starts on the break';module.lastChild.id='playClock';module.append(text('p',`${state.penalties||0}s penalties${state.interrupted?' · Interrupted: this attempt cannot win':''}`));
   if(state.mode==='real'&&state.phase==='ready'){dock.replaceChildren();if(!state.timer)dock.append(button('Start timed run',()=>transact({type:'start-run',now:Date.now()}),'play-primary'));else dock.append(button('Finish run',()=>transact({type:'finish-run',now:Date.now()}),'play-primary'),button('Foul · +10 seconds',()=>transact({type:'penalty'}),'play-foul'));}
  }
  if(state.scene&&state.mode==='real')module.append(text('p',`Layout: cue (${Math.round(state.scene.cue.x*100)}%, ${Math.round(state.scene.cue.y*100)}%); ${state.scene.balls.map(b=>`ball ${b.id} (${Math.round(b.x*100)}%, ${Math.round(b.y*100)}%)`).join('; ')}. Coordinates start at the top-left of the diagram.`));
  module.querySelectorAll('button').forEach(b=>{if(paused||bridge.busy())b.disabled=true;});dock.querySelectorAll('button').forEach(b=>{if(paused||bridge.busy())b.disabled=true;});
 }
 setInterval(()=>{const clock=$('playClock');if(clock&&state?.timer)clock.textContent=((Date.now()-state.timer)/1000).toFixed(1)+'s';},100);

 function controls(){const target=$('playStrokeControls');target.replaceChildren();if(!state||state.mode!=='screen'||state.phase==='result')return;
  const aim=document.createElement('input');aim.type='range';aim.min=-10;aim.max=10;aim.step=.1;aim.value=0;aim.id='playAim';const al=text('label','Aim');al.htmlFor=aim.id;const ao=text('output','0°');let previous=0;aim.oninput=()=>{const value=+aim.value;window.billiardsZenControls.aim(value-previous);previous=value;ao.textContent=value.toFixed(1)+'°';};aim.onchange=()=>{previous=0;aim.value=0;ao.textContent='0°';};al.append(aim,ao);target.append(al);
  [['Speed','speed'],['Follow / Draw','follow'],['Left / Right','sideSpin']].forEach(([name,id])=>{const original=$(id),input=document.createElement('input');input.type='range';input.id='play-'+id;input.min=original.min;input.max=original.max;input.step=original.step;input.value=original.value;const label=text('label',name);label.htmlFor=input.id;const output=text('output',id==='speed'?Number(input.value).toFixed(1):Math.round(input.value*100)+'%');input.oninput=()=>{original.value=input.value;original.dispatchEvent(new Event('input',{bubbles:true}));output.textContent=id==='speed'?Number(input.value).toFixed(1):Math.round(input.value*100)+'%';};label.append(input,output);target.append(label);});
  target.querySelectorAll('input').forEach(input=>input.disabled=paused||bridge.busy()||state.phase!=='ready');
 }
 function render(){
  if(expanded&&(!state||state.mode!=='screen'||!['ready','placement'].includes(state.phase)))setExpanded(false);
  $('playTableToolbar').hidden=!state||state.mode!=='screen'||state.phase==='result';
  $('playFocusUndo').disabled=!history.length||bridge.busy();
  $('playUndo').disabled=!history.length||bridge.busy();$('playPause').textContent=paused?'Resume':'Pause';$('playPlayers').replaceChildren();$('playModule').replaceChildren();$('playBalls').replaceChildren();$('playActions').replaceChildren();$('playResult').hidden=true;
  if(!state){$('playPause').disabled=true;$('playRules').disabled=true;return;}
  $('playPause').disabled=false;$('playRules').disabled=false;const g=E.games[state.game],p=state.players[state.active];
  $('playTitle').textContent=g.name;$('playRound').textContent=`${state.mode==='real'?'Real table':'On-screen'} · ${state.game==='poker'?`Round ${Math.min(5,state.round)} / 5`:`Rack ${state.rack}`} · Our rules`;
  $('playObjective').textContent=g.tag;
  state.players.forEach((pl,i)=>{const el=text('div','','play-player'+(i===state.active&&state.phase!=='result'?' active':'')+((state.game==='killer'&&!pl.lives||state.game==='cutthroat'&&!E.alive(state,i))?' out':''));const name=text('div','','play-player-name');name.append(text('span',pl.name),text('small',state.phase==='result'?'FINISHED':i===state.active?'SHOOTING':((i-state.active+state.players.length)%state.players.length===1?'NEXT':'WAITING')));let value='';if(state.game==='killer')value='♥ '.repeat(pl.lives)||'OUT';if(state.game==='poker')value=`${pl.hand.length} / 5 cards`;if(state.game==='cutthroat')value=state.remaining.filter(id=>Math.floor((id-1)/5)===i).join(' · ')||'OUT';if(C.games[state.game])value=C.stat(state,i);if(state.game==='ghost')value=`You ${state.points[0]} : ${state.points[1]} Ghost`;el.append(name,text('div',value,'play-value'));el.querySelector('.play-value').title=value;$('playPlayers').append(el);});
  let notice=state.last;
  if(state.phase==='ready'&&!C.games[state.game]){notice=state.isBreak?`${p.name} to break.`:state.game==='ghost'?`Lowest first: ${Math.min(...state.remaining)}. Keep shooting.`:`${p.name} · ${state.game==='cutthroat'?'keep shooting after a pot':'one shot this turn'}.`;}
  if(state.phase==='placement')notice=state.scene?`Set the challenge layout shown. Target pocket: ${state.targetPocket}. Then Ready.`:state.needsRack?'Rack the balls. Cue ball behind the head string.':`${state.returns.length?'Return '+state.returns.join(', ')+'. ':''}${state.ballInHand?'Cue ball anywhere. Drag it to clear cloth, then Ready.':'Spot the returned balls, then Ready.'}`;
  if(C.games[state.game]&&state.phase==='ready')notice=`${p.name} · ${state.isBreak?'break next':C.stat(state,state.active)}.`;
  if(state.phase==='choose')notice=`Pass to ${p.name} to choose a card. Keep it hidden from the room.`;
  if(paused)notice='Paused. Your game is saved. Resume when everyone is ready.';
  $('playFocusTurn').textContent=paused?'Paused':`${p.name} · ${state.phase==='placement'?(state.needsRack?'Rack ready':state.ballInHand?'Cue ball anywhere':'Spot returned balls'):state.game==='ghost'?'Lowest first: '+Math.min(...state.remaining):'Shooting'}`;
  $('playNotice').textContent=storageError||notice;$('playLatest').textContent=state.last;
  const dock=$('playActions'),locked=paused||bridge.busy();
  if(state.phase==='placement')dock.append(button(state.needsRack?'Table ready · Break next':'Ready to shoot',()=>transact({type:'ready'}),'play-primary'));
  if(state.phase==='ready'){
   if(state.mode==='screen')dock.append(button('Execute Shot',()=>bridge.shoot(),'play-primary'));
   else{
    if(needsBalls()){state.remaining.forEach(id=>{const b=button('',()=>{selected.has(id)?selected.delete(id):selected.add(id);b.classList.toggle('selected',selected.has(id));b.setAttribute('aria-pressed',String(selected.has(id)));});b.className='play-ball'+(id>8?' stripe':'');b.style.setProperty('--ball',['','#d6a918','#2475cb','#c9403a','#693c96','#c96527','#2e8b55','#7e362d','#151719'][(id-1)%8+1]);b.append(text('span',id));b.setAttribute('aria-label',`Ball ${id} made`);b.setAttribute('aria-pressed','false');$('playBalls').append(b);});}
    dock.append(button(needsBalls()?'Record selected balls':'Ball made',()=>report(),'play-primary'),button('Miss',()=>transact({type:'shot',potted:[]}), 'play-miss'),button('Foul',()=>report(true),'play-foul'));
   }
  }
  if(state.phase==='choose')dock.append(button('Choose your card privately',showPrivate,'play-private'));
  if(state.game==='poker'&&state.phase!=='result'&&state.phase!=='choose')dock.append(button(`View ${p.name}’s hand`,showPrivate,'play-private'));
  if(state.mode==='real'&&['killer','poker'].includes(state.game)&&state.phase==='ready')dock.append(button('Rack empty · Rerack',()=>transact({type:'empty'}),'play-subtle'));
  dock.querySelectorAll('button').forEach(b=>b.disabled=locked);$('playBalls').querySelectorAll('button').forEach(b=>b.disabled=locked);
  if(state.phase==='result'){
   const result=$('playResult');result.hidden=false;result.replaceChildren(text('div','GAME COMPLETE','play-eyebrow'),text('h2',state.result.text),text('p',`${state.shots} strokes recorded · Our rules`),button('Play again',()=>setup(state.game),'play-primary'));
   if(state.game==='poker')state.players.forEach(pl=>{const row=text('div');row.append(text('p',`${pl.name} · ${E.rankHand(pl.hand).label}`));const cards=text('div','','play-cards');pl.hand.forEach(c=>cards.append(card(c)));row.append(cards);result.append(row);});
   dock.append(button('Another game',()=>setup(),'play-primary'));
  }
  catalogModule(dock);
  const physical=$('playPhysical');physical.hidden=state.mode!=='real'||state.phase==='result';physical.replaceChildren(text('div','AT YOUR TABLE','play-eyebrow'),text('h2',p.name),text('p',C.games[state.game]?C.stat(state,state.active):state.game==='ghost'?`${state.remaining.length} balls left · You ${state.points[0]} / Ghost ${state.points[1]}`:state.game==='killer'?`${p.lives} ${p.lives===1?'life':'lives'} remaining`:state.game==='cutthroat'?`Protect balls ${state.active*5+1}–${state.active*5+5}`:`Round ${Math.min(5,state.round)} · ${p.hand.length} cards held`));
  if(state.mode==='real'&&state.scene&&state.phase!=='result'){const diagram=document.createElementNS('http://www.w3.org/2000/svg','svg');diagram.setAttribute('viewBox','0 0 320 160');diagram.setAttribute('role','img');diagram.setAttribute('aria-label','Challenge layout, coordinates measured from top left');diagram.classList.add('play-layout-diagram');const marks=[{id:0,...state.scene.cue},...state.scene.balls];diagram.innerHTML='<rect x="4" y="4" width="312" height="152" rx="9" fill="#245e59" stroke="#79968d"/>'+marks.map(b=>`<circle cx="${b.x*300+10}" cy="${b.y*140+10}" r="7" fill="${b.id?'#efb72f':'#fff'}"/><text x="${b.x*300+10}" y="${b.y*140+13}" text-anchor="middle" font-size="8" fill="#111">${b.id||''}</text>`).join('')+'<text x="12" y="18" font-size="9" fill="white">TL</text><text x="154" y="14" font-size="9" fill="white">TM</text><text x="294" y="18" font-size="9" fill="white">TR</text><text x="12" y="150" font-size="9" fill="white">BL</text><text x="154" y="153" font-size="9" fill="white">BM</text><text x="294" y="150" font-size="9" fill="white">BR</text>';physical.append(diagram);}
  controls();
 }
 $('playExpand').onclick=()=>{setExpanded(!expanded);$('playExpand').focus({preventScroll:true});};
 $('playFocusControls').onclick=()=>{focusControls=!focusControls;setExpanded(expanded);};
 $('playFocusUndo').onclick=undo;
 $('playNew').onclick=()=>{if(!bridge.busy())setup();};$('playRules').onclick=showRules;$('playUndo').onclick=undo;
 $('playAudio').onclick=()=>{audio=!audio;$('playAudio').textContent=audio?'Audio on':'Audio off';$('playAudio').setAttribute('aria-pressed',String(audio));if(!audio)window.speechSynthesis?.cancel();else speech('Play audio on.');};
 $('playPause').onclick=()=>{if(bridge.busy())return;if(state?.game==='speed'&&state.timer&&!paused)transact({type:'interrupt'});paused=!paused;window.speechSynthesis?.cancel();render();};
 root.querySelectorAll('.play-footer a').forEach(a=>a.addEventListener('click',e=>{if(bridge.busy()){e.preventDefault();return;}save();bridge.save();}));
 window.billiardsPlayHooks={canShoot:()=>!!state&&state.mode==='screen'&&state.phase==='ready'&&!paused&&!dialog.open,canInteract:()=>!!state&&state.mode==='screen'&&!bridge.busy()&&!paused&&!dialog.open&&['ready','placement'].includes(state.phase),canPlaceCue:()=>!!state&&state.ballInHand};
 window.addEventListener('billiards:shot-start',()=>{shotBefore=capture();shotStartedAt=Date.now();if(state?.game==='speed'&&!state.timer){state=E.reduce(state,{type:'start-run',now:shotStartedAt});}render();$('playActions').querySelectorAll('button').forEach(b=>b.disabled=true);$('playStrokeControls').querySelectorAll('input').forEach(b=>b.disabled=true);});
 window.addEventListener('billiards:shot-complete',e=>{if(!state||state.mode!=='screen'||!shotBefore)return;const d=e.detail,before=shotBefore;shotBefore=null;transact({type:'shot',potted:d.removed.filter(id=>id>0&&id<=15),foul:d.scratch,scratch:d.scratch,auto:true,firstContact:d.firstContact,railAfter:d.railAfter,breakLegal:d.removed.length>0||d.breakRails>=4,pockets:d.pockets,bank:d.bank,kick:d.kick,cueFinish:d.cueFinish,startedAt:shotStartedAt,now:state.game==='speed'?shotStartedAt+(d.lastPotSeconds||0)*1000:Date.now()},before);});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&expanded&&!dialog.open){e.preventDefault();e.stopPropagation();setExpanded(false);$('playExpand').focus({preventScroll:true});return;}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!e.target.matches('input,textarea')){e.preventDefault();e.stopImmediatePropagation();undo();}},true);
 window.addEventListener('pagehide',save);
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'null');if(saved?.version===1&&E.games[saved.state?.game]&&Array.isArray(saved.table?.balls)){state=saved.state;if(state.game==='speed'&&state.timer)state.interrupted=true;shownSceneKey=state.sceneKey;history=saved.history||[];bridge.restore(saved.table);bridge.enter();}}catch(e){storageError='Saved game could not be restored. Start a new game.';}
 render();if(!state)setup();
 // Read-only inspection supports browser QA without exposing secret cards through a public UI.
 window.billiardsPlayStatus=()=>state?{game:state.game,phase:state.phase,mode:state.mode,active:state.active,round:state.round,shots:state.shots,lives:state.players.map(p=>p.lives),remaining:[...state.remaining],undo:history.length}:null;
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
