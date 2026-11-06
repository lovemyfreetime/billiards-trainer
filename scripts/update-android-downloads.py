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
    if name.endswith('.html') and 'Billiards-Trainer-Android.zip' not in text:
        import re
        apk_link = re.escape(base+'Billiards-Trainer-Android.apk')
        fallback = (
            '<p class="muted small">If the APK download stalls, '
            f'<a href="{base}Billiards-Trainer-Android.zip" download>download the ZIP</a>. '
            'Open it in My Files or Files, extract it to Downloads, then tap the APK to install.</p>'
        )
        # Keep the alternative by the primary Android install link on both pages.
        text, count = re.subn(r'(<a\b[^>]*href="'+apk_link+r'"[^>]*>[^<]*</a>)',
                              lambda match: match[0]+fallback, text, count=1)
        if count != 1:
            raise ValueError(f'Android install link missing in {name}')
    path.write_text(text)
