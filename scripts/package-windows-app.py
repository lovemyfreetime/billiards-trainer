#!/usr/bin/env python3
"""Package the complete app for Windows; no first-run web download is required."""
from pathlib import Path
import argparse,hashlib,json,shutil
ROOT=Path(__file__).resolve().parents[1]
EXT={'.html','.js','.mjs','.css','.json','.webmanifest','.png','.svg','.webp','.jpg','.jpeg','.ico','.mp3','.wav','.wasm','.onnx','.bin'}
def assets():
 files={p.relative_to(ROOT).as_posix():p for p in ROOT.iterdir() if p.is_file() and p.suffix in EXT and p.name not in {'package-lock.json','package.json','play-narration-copy.json','play-announcements-copy.json'}}
 for folder in ['guide','icons','ai_model','vendor','install','play-audio']:
  for p in (ROOT/folder).rglob('*'):
   if p.is_file() and 'source-wav' not in p.parts and (p.suffix in EXT or p.name in {'LICENSE','ThirdPartyNotices.txt'}):
    if folder=='play-audio' and p.suffix=='.json' and p.name not in {'scripts.json','announcements.json'}:continue
    files[p.relative_to(ROOT).as_posix()]=p
 return dict(sorted(files.items()))
def build(out):
 files=assets();manifest={}
 for name,src in files.items():
  target=out/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,target)
  if name in {'install/assets/installer.js','install/windows/index.html'}:
   text=target.read_text().replace('../../downloads/Billiards-Trainer-Windows-Setup.exe','https://github.com/lovemyfreetime/billiards-trainer/releases/download/windows-offline/Billiards-Trainer-Windows-Setup.exe').replace('../downloads/Billiards-Trainer-Windows-Setup.exe','https://github.com/lovemyfreetime/billiards-trainer/releases/download/windows-offline/Billiards-Trainer-Windows-Setup.exe');target.write_text(text)
  manifest[name]=hashlib.sha256(target.read_bytes()).hexdigest()
 (out/'bundle-manifest.json').write_text(json.dumps({'files':manifest},indent=2)+'\n')
 print(f'Windows app: {len(files)} files, {sum(p.stat().st_size for p in files.values())/1048576:.1f} MiB, all three experiences/audio/models/runtime included.')
 return manifest
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--output',type=Path,default=ROOT/'windows-wrapper/publish/offline-app');build(p.parse_args().output)
