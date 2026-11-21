/* Play room presentation only. Rules and player limits come from the engines. */
(function(root){
'use strict';
const groups=[
 {id:'secret',name:'Secret & pressure',color:'#bc81f5',games:['kelly','bounty','saboteur','highlow','ghost']},
 {id:'pub',name:'Pub challenges',color:'#f16f77',games:['cutthroat','killer','horse','speed','three']},
 {id:'cards',name:'Cards & points',color:'#efb552',games:['poker','blackjack','cribbage','bingo','ring']},
 {id:'tactical',name:'Tactical & skill',color:'#40d8df',games:['turf','battleship','golf','bowliards','equalizer']}
];
const paths={
 target:'<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="10"/><circle cx="24" cy="24" r="3"/><path d="m26 22 16-16m-1 0v7m0-7h-7"/>',
 cards:'<rect x="9" y="10" width="23" height="31" rx="4" transform="rotate(-14 20 25)"/><path d="M25 7h10a4 4 0 0 1 4 4v25M16 23l5-6 5 6-5 7Z"/>',
 skull:'<path d="M10 23a14 14 0 1 1 28 0c0 7-4 10-8 11v7H18v-7c-5-2-8-5-8-11Z"/><circle cx="18" cy="23" r="3"/><circle cx="30" cy="23" r="3"/><path d="m22 31 2-3 2 3M22 36v5m4-5v5"/>',
 swords:'<path d="m8 8 26 23-4 4L8 8Zm32 0L14 31l4 4L40 8ZM9 32l7 7m-8 1 7-7m18-1 7 7m-1 1-7-7"/>',
 balls:'<circle cx="24" cy="14" r="8"/><circle cx="14" cy="33" r="8"/><circle cx="34" cy="33" r="8"/>',
 timer:'<circle cx="24" cy="28" r="15"/><path d="M18 5h12M24 5v8m0 6v10l7-4M36 13l4-4"/>',
 horse:'<path d="M12 40h27l-4-13 3-8-11-9-2-6-5 9-10 9 3 7 8-4-2 15M29 19h1"/>',
 ghost:'<path d="M11 40V21a13 13 0 0 1 26 0v19l-7-5-6 5-6-5-7 5Z"/><circle cx="19" cy="22" r="2"/><circle cx="29" cy="22" r="2"/>',
 grid:'<rect x="7" y="7" width="34" height="34" rx="5"/><path d="M18 7v34M30 7v34M7 18h34M7 30h34m-14-8 5 5 9-11"/>',
 ship:'<path d="M6 29h36l-8 12H15L6 29Zm10 0V18h16v11M21 18V8h7v10M4 44q5-4 10 0t10 0 10 0 10 0"/>',
 flag:'<path d="M22 39V5l17 6-17 7M11 40c-11 7 25 7 25 0 0-3-7-5-14-5"/><circle cx="36" cy="30" r="3"/>',
 pins:'<path d="M17 6h6v8l-3 6 5 19c1 4-16 4-15 0l5-19-3-6V6Zm15 8h6v7l-3 5 4 13M13 24h10"/><circle cx="34" cy="37" r="8"/>',
 equal:'<path d="M7 17h34M7 31h34"/><circle cx="15" cy="17" r="5"/><circle cx="32" cy="31" r="5"/>',
 ring:'<circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="7"/><path d="M24 7v5m0 24v5M7 24h5m24 0h5M12 12l4 4m16 16 4 4m0-24-4 4M16 32l-4 4"/>',
 split:'<path d="M8 12h32M8 36h32m-24-7 8 7 8-7m-16-10 8-7 8 7M24 5v38"/>',
 spy:'<path d="m7 19 5-3 4-9h16l4 9 5 3H7ZM9 27h12l3 3 3-3h12M11 27v5a5 5 0 0 0 10 0v-5m6 0v5a5 5 0 0 0 10 0v-5M19 42h10"/>'
};
const symbols={kelly:'cards',bounty:'target',saboteur:'spy',highlow:'split',ghost:'ghost',cutthroat:'swords',killer:'skull',horse:'horse',speed:'timer',three:'balls',poker:'cards',blackjack:'cards',cribbage:'cards',bingo:'grid',ring:'ring',turf:'target',battleship:'ship',golf:'flag',bowliards:'pins',equalizer:'equal'};
function icon(id){return `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths[symbols[id]]||paths.balls}</svg>`;}
function familyArt(id){return `<img src="./play-panel-${id}.webp" alt="" loading="eager">`;}
// Approved photographic choices. SVG viewports select the art without changing native labels or source images.
const gamePhotos={"kelly":{"choice":"D","file":"kelly.webp","width":1774,"height":887,"viewBox":[1330.5,510.02,412.46,354.8]},"bounty":{"choice":"D","file":"bounty.webp","width":1774,"height":887,"viewBox":[1330.5,510.02,412.46,354.8]},"saboteur":{"choice":"A","file":"saboteur.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"highlow":{"choice":"A","file":"highlow.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"ghost":{"choice":"C","file":"ghost.webp","width":1774,"height":887,"viewBox":[443.5,510.02,412.46,354.8]},"cutthroat":{"choice":"A","file":"cutthroat.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"killer":{"choice":"D","file":"killer.webp","width":1774,"height":887,"viewBox":[1330.5,510.02,412.46,354.8]},"horse":{"choice":"B","file":"horse.webp","width":1774,"height":887,"viewBox":[1330.5,66.52,412.46,354.8]},"speed":{"choice":"A","file":"speed.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"three":{"choice":"A","file":"three.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"poker":{"choice":"C","file":"poker.webp","width":1774,"height":887,"viewBox":[443.5,510.02,412.46,354.8]},"blackjack":{"choice":"A","file":"blackjack.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"cribbage":{"choice":"A","file":"cribbage.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"bingo":{"choice":"C","file":"bingo.webp","width":1774,"height":887,"viewBox":[443.5,510.02,412.46,354.8]},"ring":{"choice":"A","file":"ring.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"turf":{"choice":"A","file":"turf.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"battleship":{"choice":"C","file":"battleship.webp","width":1774,"height":887,"viewBox":[381.41,510.02,474.55,354.8]},"golf":{"choice":"A","file":"golf.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"bowliards":{"choice":"A","file":"bowliards.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]},"equalizer":{"choice":"A","file":"equalizer.webp","width":1774,"height":887,"viewBox":[443.5,66.52,412.46,354.8]}};
function gameArt(id){const art=gamePhotos[id];if(!art)return icon(id);return `<svg viewBox="${art.viewBox.join(' ')}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false"><image href="./play-game-images/${art.file}" width="${art.width}" height="${art.height}"/></svg>`;}
const uiPaths={games:'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',trophy:'<path d="M7 3h10v6a5 5 0 0 1-10 0V3Zm5 11v7m-4 0h8M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4"/>',people:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-4a6 6 0 0 1 12 0v4m1-17a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2"/>',tools:'<path d="M4 5h16M4 12h16M4 19h16"/><circle cx="9" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="19" r="2"/>',resume:'<path d="m9 5 10 7-10 7V5ZM4 5v14"/>',updates:'<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>'};
function uiIcon(id){return `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${uiPaths[id]||uiPaths.games}</svg>`;}
root.BilliardsPlayPresentation={groups,icon,familyArt,gameArt,gamePhotos,uiIcon,group:id=>groups.find(g=>g.games.includes(id))};
})(globalThis);
