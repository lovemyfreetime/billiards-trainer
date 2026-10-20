(function(){
'use strict';
const $=id=>document.getElementById(id),status=text=>$('status').textContent=text;
const oldAndroid=!!window.BilliardsAndroid&&!window.BilliardsAndroid.saveBackup;
$('legacy').hidden=!oldAndroid;
let created='';
function downloadable(text){$('save').disabled=oldAndroid||!text;$('copy').disabled=!text;}
$('create').onclick=async()=>{try{$('create').disabled=true;status('Reading saved data…');created=await BilliardsBackup.create();$('backup').value=created;downloadable(created);$('verified').checked=false;$('ready').hidden=true;const b=BilliardsBackup.parse(created);status(`Backup ready: ${b.storage.length} saved settings and ${b.databases.reduce((n,d)=>n+d.rows.length,0)} saved files/images. Save a copy outside this app before reinstalling.`);}catch(e){status('Backup failed: '+e.message);}finally{$('create').disabled=false;}};
$('save').onclick=()=>{const text=$('backup').value;BilliardsBackup.parse(text);if(window.BilliardsAndroid?.saveBackup){BilliardsAndroid.saveBackup(text);status('Backup save requested. Verify the file in Downloads before uninstalling.');return;}const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='Billiards-Trainer-Backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status('Backup download requested. Verify the file before uninstalling.');};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('backup').value);status('Backup copied. Paste the complete text into a text editor and save it outside the app.');}catch(e){$('backup').focus();$('backup').select();status('Long-press the selected text and choose Copy, then save it outside the app.');}};
$('backup').oninput=()=>{downloadable($('backup').value);$('verified').checked=false;$('ready').hidden=true;};
$('verified').onchange=()=>{$('ready').hidden=!$('verified').checked;};
$('file').onchange=async()=>{try{const file=$('file').files[0];if(!file)return;const text=await file.text();BilliardsBackup.parse(text);$('backup').value=text;downloadable(text);status('Backup file is valid. Tap Restore backup to import it.');}catch(e){status('Could not read backup: '+e.message);}};
$('restore').onclick=async()=>{try{BilliardsBackup.parse($('backup').value);if(!confirm('Restore this backup? Saved settings and records with matching names will be replaced.'))return;$('restore').disabled=true;const r=await BilliardsBackup.restore($('backup').value);status(`Restored ${r.settings} settings and ${r.records} saved files/images. Return to the app to load them.`);}catch(e){status('Restore did not finish: '+e.message+'. Keep your backup and retry; some records may already have been restored.');}finally{$('restore').disabled=false;}};
})();
