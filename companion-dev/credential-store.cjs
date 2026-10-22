'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
function createCredentialStore(directory,{platform=process.platform,run=execFileSync}={}){
 const supported=platform==='win32',file=path.join(directory,'chatgpt-session.dpapi'),lock=file+'.lock';
 function transform(value,decrypt=false){
  const operation=decrypt?'Unprotect':'Protect',input=decrypt?'[Convert]::FromBase64String($raw)':'[Text.Encoding]::UTF8.GetBytes($raw)',output=decrypt?'[Text.Encoding]::UTF8.GetString($out)':'[Convert]::ToBase64String($out)';
  const script="$ErrorActionPreference='Stop'; [Console]::InputEncoding=[Text.UTF8Encoding]::new($false); [Console]::OutputEncoding=[Text.UTF8Encoding]::new($false); Add-Type -AssemblyName System.Security; $raw=[Console]::In.ReadToEnd(); $bytes="+input+"; $out=[Security.Cryptography.ProtectedData]::"+operation+"($bytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser); [Console]::Out.Write("+output+")";
  try{return run(path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe'),['-NoProfile','-NonInteractive','-Command',script],{input:value,encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:256*1024,stdio:['pipe','pipe','pipe']}).trim();}catch{throw Error('Windows could not unlock the saved ChatGPT sign-in. Sign in again.');}
 }
 function read(){if(!supported)return null;try{return JSON.parse(transform(fs.readFileSync(file,'utf8'),true));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
 function write(value){if(!supported)return false;fs.mkdirSync(directory,{recursive:true,mode:0o700});const tmp=file+'.'+crypto.randomUUID()+'.tmp';try{fs.writeFileSync(tmp,transform(JSON.stringify(value)),{mode:0o600});fs.renameSync(tmp,file);}finally{try{fs.unlinkSync(tmp);}catch{}}return true;}
 function clear(){try{fs.unlinkSync(file);}catch(e){if(e.code!=='ENOENT')throw e;}}
 async function withLock(fn){if(!supported)return fn();fs.mkdirSync(directory,{recursive:true,mode:0o700});let handle;for(let i=0;i<100;i++){try{handle=fs.openSync(lock,'wx',0o600);break;}catch(e){if(e.code!=='EEXIST')throw e;try{if(Date.now()-fs.statSync(lock).mtimeMs>120000){fs.unlinkSync(lock);continue;}}catch{}await new Promise(r=>setTimeout(r,100));}}if(handle===undefined)throw Error('Another Companion is renewing this sign-in. Try again shortly.');try{return await fn();}finally{fs.closeSync(handle);try{fs.unlinkSync(lock);}catch{}}}
 return {supported,read,write,clear,withLock};
}
module.exports={createCredentialStore};
