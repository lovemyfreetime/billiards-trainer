#!/usr/bin/env python3
"""Build self-contained Play web assets and the Android Play asset directory."""
from pathlib import Path
import argparse, hashlib, json, shutil, zipfile, re
ROOT=Path(__file__).resolve().parents[1]
FILES=['play.html','play-viewport.js','play-catalog.js','play-engine.js','play-presentation.js','play-input.js','play-training.js','play-controls.js','play-mode.js','play-mode.css','play-calibration.js','play-calibration.html','experience-menu.js','experience-menu.css','local-session.js','local-session.css','app-display.js','app-display.css','tournament.html','tournament-engine.js','tournament-ui.js','tournament.css','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png','icons/play-experience-v1.webp','icons/trainer-original-execute-v2.svg','local-host/player.html','local-host/player.js','local-host/player.css']
def build(out):
 out.mkdir(parents=True,exist_ok=True)
 for name in FILES:
  src=ROOT/name
  if not src.is_file(): raise FileNotFoundError(name)
  target=out/name;target.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(src,target)
 # Offline Play has its own entry point; Trainer and Zen remain separate apps.
 (out/'index.html').write_text('<!doctype html><meta charset="utf-8"><title>Billiards Play</title><meta http-equiv="refresh" content="0;url=play.html"><a href="play.html">Open Billiards Play</a>')
 p=out/'play.html';p.write_text(p.read_text().replace('<link rel="manifest" href="./manifest.webmanifest">','').replace('<body><script>', '<body><script>window.BilliardsOfflinePlay=true;</script><script>'))
 (out/'README.txt').write_text('Billiards Play — Offline\n\nExtract the entire folder and open play.html. All 20 real-table games, Tournament Play, drill tracking, shot clock and calibration are included. No internet is needed. Browser storage availability under file URLs varies by browser: use the Android Play app or existing Windows Local Host for reliable saves and private player connections. This web package cannot create a hotspot or supply offline speech recognition. Android Play uses an available on-device speech service; it never switches to cloud recognition. Trainer and Zen are separate packages.\n')
 manifest={name:hashlib.sha256((out/name).read_bytes()).hexdigest() for name in FILES}
 (out/'offline-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
 return manifest
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--android',action='store_true');parser.add_argument('--output');args=parser.parse_args()
 if args.android:
  folder=ROOT/'android-wrapper/app/build/generated/playAssets/play';build(folder);print(folder)
 else:
  import tempfile
  target=Path(args.output) if args.output else ROOT/'downloads/Billiards-Play-Offline.zip'
  target.parent.mkdir(parents=True,exist_ok=True)
  with tempfile.TemporaryDirectory() as temp:
   folder=Path(temp);manifest=build(folder)
   with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
    for p in sorted(folder.rglob('*')):
     if p.is_file():z.write(p,'Billiards-Play/'+str(p.relative_to(folder)))
  print(f'{target} ({len(manifest)} bundled assets)')
