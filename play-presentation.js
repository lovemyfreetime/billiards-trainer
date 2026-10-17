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
root.BilliardsPlayPresentation={groups,icon,group:id=>groups.find(g=>g.games.includes(id))};
})(globalThis);
