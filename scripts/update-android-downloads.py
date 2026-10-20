#!/usr/bin/env python3
"""Run only after both pinned-certificate APKs pass offline runtime checks and publish."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
base='https://github.com/lovemyfreetime/billiards-trainer/releases/download/android-app/'
for name in ['install/index.html','install/android/index.html','install/assets/installer.js']:
    path=root/name
    text=path.read_text()
    for apk in ['Billiards-Trainer-Android.apk','Billiards-Trainer-Installer-Android.apk']:
        for prefix in ['../../downloads/','../downloads/']:
            text=text.replace(prefix+apk,base+apk)
    if name=='install/android/index.html':
        text=text.replace('Future trainer updates load automatically; you only need a new APK when the wrapper itself changes.','The installed app includes Zen, Trainer, Play, recordings and analysis files. Install a newer APK when an app update is available.')
    path.write_text(text)
