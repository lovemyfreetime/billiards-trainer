/* Authored scripts. Chase recording paths are installed only after export verification. */
(function(root){
'use strict';
const C=root.CompanionCore||(typeof require==='function'&&require('./companion-core.js'));
const F=root.CompanionFeatures||(typeof require==='function'&&require('./companion-features.js'));
const pages={
 home:['Welcome to Companion Play','Get more from your time at the table. Explore a shot. Test an idea. Help each other find something that sticks. Start a new session for solo practice, companions, a coach, or a group. Notice together. Try one thing. Keep what helps. Your sessions and discoveries stay ready for your next visit.'],
 new:['Start a session','Choose who is at the table and how you would like to practice. Players take turns. Coaches can keep observations without taking player turns. Choose relaxed exploration, focused practice, or match preparation. You can plan for thirty minutes, one hour, or lots of free time. These are estimates, not countdowns. Your other sessions stay saved.'],
 sessions:['Our sessions','Keep separate sessions for different companions, coaches, and your own practice. Continue any saved session, start another, or revisit a completed session. Inside a session, open People in this session to add another player or coach. Existing notes and results stay with the original person.'],
 discoveries:['Discoveries','Your useful discoveries stay linked to the people and situations that helped you find them. Finish a session to collect its takeaways here. Reopen it to revisit written notes and any voice recordings.'],
 detail:['Revisit a session','Look back at each person’s starting observation, learning goal, and useful discovery. Continue this session to add more, or start another session with the same people.'],
 meet:['A good practice partner','You can have different goals and still help each other. Ask before offering a correction. Test an idea together. Anyone can revise it. Describe what happened before explaining why. Each person chooses something useful to take away. Choose when advice is welcome. During a rack, wait until the turn or rack is over unless the shooter asks.'],
 notice:['Notice before choosing','Play a few shots, or recall one recent situation. What feels reliable? What breaks down? One honest observation each is enough. Keep guesses separate from what you observed. Talk it through, write a short note, or keep a voice recording.'],
 choose:['Choose what helps today','Look at your starting point together. Choose one question to explore. Each person can want a different useful result: a better explanation, a clearer observation, or more confidence with a shot.'],
 keep:['Keep something useful','What will you take with you? Different takeaways are welcome. Say what helped and when you would use it. Decide what to try next time. Learning, enjoyment, and partner fit can be different. Everyone can give a different answer.'],
 library:['Practice library','Choose an activity, agree on useful targets, then test a variation. A routine can carry across sessions. Mark a drill complete after trying its transfer step in play. Choose a session first so the results stay with the right people.'],
 workshop:['Practice tools','Set a useful target for each player. Keep pressure optional and agreed by everyone. Attach a layout, image, video, or audio note to remember what happened. Use Trainer to compare a setup, then test the idea on your table. Choose just-play mode when you want a rack without coaching or result tracking.'],
 companions:['Companions','Keep a private invitation card with the details you choose to share. Exchange cards with people you know, review incoming invitations, and accept only the connections you want. Matching compares the preferences on accepted cards. This is a private local contact list. It does not search for people online or synchronize automatically.'],
 guide:['Guide and voice','Explore a topic from the authored billiards guide. Choose a demonstration, a short explanation, a first attempt, or teaching the idea back. Keep personal observations separate from the guide. Review and correct captured words before saving them. Device voice availability varies; typed contributions always work.'],
 plans:['Meet again','Leave a useful invitation to return. Save a meeting time, place, and the idea you want to explore. When everyone agrees, export a calendar invitation and share it yourself. Import it into your calendar to activate its reminder. Companion does not send invitations automatically.'],
 devices:['Share a session copy','Send a session file using your usual sharing app. It includes everyone’s written notes and attempt results. Each person can contribute and send a copy back. Import to combine the contributions, then share the merged copy again. Changes do not appear live. Keep one device responsible for each group’s attempt counts. Private practice tools, preferences, media, and audio travel only in a complete backup.']
};
const modes={see:'Watch or show one example. Predict what changes before the second demonstration.',hear:'Listen to one short idea, then say what result you expect.',try:'Take an attempt before advice. Describe what you noticed.',explain:'Teach the idea back in your own words, then test one variation.'};
const records={};
function add(id,title,text){records[id]={title,text,voice:'chase',src:'',status:'awaiting-recording'};}
Object.entries(pages).forEach(([id,[title,text]])=>add(id,title,text));
for(const a of C.activities)for(let i=0;i<a.steps.length;i++)add('activity-'+a.id+'-'+i,a.title+' · '+a.steps[i][0],a.title+'. '+a.steps[i].join('. '));
for(const d of F.drills){const a=F.activity({baseline:[],work:{drill:d.id}});for(let i=0;i<a.steps.length;i++)add('drill-'+d.id+'-'+i,d.title+' · '+a.steps[i][0],d.title+'. '+a.steps[i].join('. '));}
for(const k of F.knowledge)add('topic-'+k.id,k.title,k.title+'. '+k.text);
Object.entries(modes).forEach(([id,text])=>add('mode-'+id,'How to explore',text));
const api={records,modes};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CompanionNarrationCopy=api;
})(typeof window!=='undefined'?window:globalThis);
