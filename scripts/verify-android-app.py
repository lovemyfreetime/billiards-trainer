#!/usr/bin/env python3
"""Verify actual APK payloads, not just the staging folder."""
import argparse,hashlib,json,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
recordings={p.relative_to(ROOT).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in (ROOT/'play-audio').rglob('*.mp3')}
assert recordings,'Source recordings are missing'
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
  bundled_recordings={n for n in manifest if n.startswith('play-audio/') and n.endswith('.mp3')}
  assert bundled_recordings==recordings.keys(),f'{apk}: recording inventory mismatch; missing={sorted(recordings.keys()-bundled_recordings)}, extra={sorted(bundled_recordings-recordings.keys())}'
  for name,digest in recordings.items():
   assert manifest[name]['sha256']==digest,f'{apk}: recording differs from source: {name}'
  assert not any('source-wav/' in n for n in manifest)
  for page in ['install/index.html','install/android/index.html']:
   assert b'https://github.com/lovemyfreetime/billiards-trainer/releases/download/android-app/Billiards-Trainer-Android.apk' in z.read('assets/app/'+page),page
 print(f'{apk}: {len(manifest)} bundled files verified, all {len(recordings)} Chase recordings and all analysis files included.')
