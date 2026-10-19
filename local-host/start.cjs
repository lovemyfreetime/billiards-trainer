'use strict';
const {createHost}=require('./server.cjs'),{spawn}=require('node:child_process');
createHost().listen().then(({hostUrl})=>{console.log('Local Play is running. Keep this window open.\nHost only: '+hostUrl);if(process.platform==='win32')spawn('cmd.exe',['/d','/s','/c',`start "" "${hostUrl}"`],{stdio:'ignore',windowsHide:true});}).catch(err=>{console.error(err.code==='EADDRINUSE'?'Another local host is using port 8788. Close it first.':err.message);process.exitCode=1;});
