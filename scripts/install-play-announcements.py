#!/usr/bin/env python3
"""Validate and install the Chase gameplay vocabulary from browser exports."""
import argparse,hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(b):return hashlib.sha256(b).hexdigest()
def duration(p):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(p)],text=True))
def install(source):
 copy=json.loads((ROOT/'play-announcements-copy.json').read_text());records={};seen={}
 assert copy['voice']=='chase' and copy['rate']=='+10%' and len(copy['records'])==189
 for key,text in copy['records'].items():
  src=source/(key+'.mp3');raw=src.read_bytes();receipt=json.loads((source/(key+'.json')).read_text());text_hash=digest(text.encode())
  assert receipt['textHash']==text_hash and receipt['text']==text and receipt['voice']=='chase' and receipt['rate']=='+10%',key
  source_hash=digest(raw);assert source_hash not in seen,(key,seen.get(source_hash));seen[source_hash]=key
  subprocess.run(['ffmpeg','-v','error','-i',str(src),'-f','null','-'],check=True,capture_output=True)
  target=ROOT/'play-audio'/('call-'+key+'.mp3')
  # Only shave quiet padding. Keep a small lead/trail so stitched words stay natural.
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(src),'-af','silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.035,areverse,silenceremove=start_periods=1:start_threshold=-48dB:start_silence=0.07,areverse','-ar','24000','-ac','1','-codec:a','libmp3lame','-b:a','96k',str(target)],check=True)
  seconds=duration(target);assert .12<seconds<15,(key,seconds)
  row={'text':text,'textHash':text_hash,'voice':'chase','rate':'+10%','sourceHash':source_hash,'audioHash':digest(target.read_bytes()),'duration':seconds,'sourceDuration':duration(src),'recordingStatus':'recorded'}
  (target.with_suffix('.json')).write_text(json.dumps(row,indent=2)+'\n')
  records[key]={**{k:row[k] for k in ['text','textHash','voice','rate','duration','recordingStatus']},'src':'play-audio/'+target.name+'?v='+row['audioHash'][:12]}
 catalog={**{k:copy[k] for k in ['voice','rate']},'records':records}
 (ROOT/'play-audio/announcements.json').write_text(json.dumps(catalog,indent=2)+'\n')
 (ROOT/'play-announcements-data.js').write_text('/* Generated recorded Chase gameplay catalog. */\nwindow.BilliardsAnnouncementCatalog='+json.dumps(records,separators=(',',':'))+';\n')
 print(f'Installed {len(records)} Chase clips; {sum(r["duration"] for r in records.values()):.1f} seconds')
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('source',type=Path);install(p.parse_args().source)
