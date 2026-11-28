#!/usr/bin/env python3
"""Verify actual APK payloads, not just the staging folder."""
import argparse,hashlib,json,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
audio=root/'play-audio'
expected_recordings={p.relative_to(root).as_posix() for folder in (audio,audio/'companion',audio/'rack-rules') for p in folder.glob('*.mp3')}
p=argparse.ArgumentParser();p.add_argument('apks',nargs='+',type=Path);args=p.parse_args()
for apk in args.apks:
 with zipfile.ZipFile(apk) as z:
  manifest=json.loads(z.read('assets/app/app-manifest.json'))['files']
  for name,meta in manifest.items():
   b=z.read('assets/app/'+name)
   assert len(b)==meta['length'] and hashlib.sha256(b).hexdigest()==meta['sha256'],f'{apk}: {name}'
   if name.endswith('.html'):assert b'window.BilliardsBundledAndroid=true' in b,name
  for name in ['backup.html','app-backup.js','backup-ui.js','welcome.html','index.html','play.html','zen-mode.js','vendor/onnxruntime-1.22.0/ort.wasm.min.js','vendor/onnxruntime-1.22.0/ort-wasm-simd-threaded.mjs','vendor/onnxruntime-1.22.0/ort-wasm-simd-threaded.wasm','ai_model/pool_ball_classifier.onnx','ai_model/pool_ball_detector.part1.bin','ai_model/pool_ball_detector.part2.bin']:
   assert name in manifest,name
  packaged_recordings={n for n in manifest if n.startswith('play-audio/') and n.endswith('.mp3')}
  assert packaged_recordings==expected_recordings, f'{apk}: missing {sorted(expected_recordings-packaged_recordings)}, unexpected {sorted(packaged_recordings-expected_recordings)}'
  assert not any('source-wav/' in n for n in manifest)
  for page in ['install/index.html','install/android/index.html']:
   assert b'https://github.com/lovemyfreetime/billiards-trainer/releases/download/android-app/Billiards-Trainer-Android.apk' in z.read('assets/app/'+page),page
 print(f'{apk}: {len(manifest)} bundled files verified, all {len(expected_recordings)} Chase recordings and all analysis files included.')
