const test=require('node:test'),assert=require('node:assert/strict'),C=require('../companion-core');
test('toolkit opens session tools at the intended step and preserves session prerequisites',()=>{
 assert.deepEqual(C.toolRoute('session/attempts'),{view:'session',section:'attempts',requiresSession:true,stage:3,practiceStep:2});
 assert.equal(C.toolRoute('session/meet').stage,0);
 assert.equal(C.toolRoute('session/notice').stage,1);
 assert.equal(C.toolRoute('session/keep').stage,4);
 assert.equal(C.toolRoute('workshop/pressure').requiresSession,true);
 assert.equal(C.toolRoute('companions/preferences').requiresSession,false);
 assert.equal(C.toolRoute('settings/backup').requiresSession,false);
});
test('only connected toolkit destinations can be opened, never unknown routes or unconnected services',()=>{
 assert.equal(C.toolRoute(''),null);
 assert.equal(C.toolRoute('workshop/delete-everything'),null);
 assert.equal(C.toolRoute('https://example.com'),null);
 const shown=C.features.flatMap(g=>g[1]).filter(r=>['ready','device'].includes(r[1]));
 assert.equal(shown.length,43);
 assert.equal(C.features.flatMap(g=>g[1]).filter(r=>r[1]==='service').length,2);
 for(const row of shown)assert.ok(C.toolRoute(row[3]),row[0]);
});
