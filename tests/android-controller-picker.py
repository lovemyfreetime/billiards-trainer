"""Exercise the installed Trainer's mapping picker through Android touchscreen input."""
import json
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET

OUT = Path("picker-results")
OUT.mkdir(exist_ok=True)
PACKAGE = "com.lovemyfreetime.billiardstrainer"

def adb(*args):
    return subprocess.check_output(["adb", *args], timeout=30).decode(errors="replace").strip()

def screen():
    raw = adb("exec-out", "uiautomator", "dump", "/dev/tty")
    start, end = raw.find("<?xml"), raw.rfind("</hierarchy>")
    if min(start, end) < 0:
        return []
    xml = raw[start:end+12]
    (OUT/"screen.xml").write_text(xml)
    return list(ET.fromstring(xml).iter("node"))

def labels(node):
    return [node.get(k, "").strip().rstrip("⌄▾▼▿").strip() for k in ("text", "content-desc", "resource-id")]

def find(label, nodes=None):
    for n in screen() if nodes is None else nodes:
        values = labels(n)
        if label in values or any(v.startswith(label+" ") or v.startswith(label+",") or v.endswith("/"+label) or v.endswith(":id/"+label) for v in values):
            return n
    return None

def lookup(*labels, limit=12):
    end = time.monotonic()+limit
    while time.monotonic()<end:
        nodes = screen()
        # Android's one-time immersive confirmation sits above the Trainer and takes focus.
        if find("Viewing full screen", nodes) is not None:
            confirm = find("Got it", nodes)
            if confirm is not None:
                tap(confirm)
                continue
        for label in labels:
            node = find(label, nodes)
            if node is not None:
                return node
    raise AssertionError("Missing "+str(labels)+" on "+repr([(n.get("text"),n.get("content-desc"),n.get("resource-id")) for n in nodes if n.get("text") or n.get("content-desc") or n.get("resource-id")])[:6000])

def tap(node):
    x,y,x1,y1=map(int,re.findall(r"\d+",node.attrib["bounds"]))
    assert x1>x and y1>y, node.attrib
    adb("shell","input","tap",str((x+x1)//2),str((y+y1)//2))

def save(name):
    (OUT/(name+".png")).write_bytes(subprocess.check_output(["adb","exec-out","screencap","-p"]))

def main():
    adb("shell","wm","size","1080x1728")
    adb("shell","wm","density","210")
    adb("shell","settings","put","secure","immersive_mode_confirmations","confirmed")
    adb("shell","settings","put","system","accelerometer_rotation","0")
    adb("shell","settings","put","system","user_rotation","1")
    adb("shell","input","keyevent","KEYCODE_WAKEUP")
    adb("shell","wm","dismiss-keyguard")
    adb("shell","am","start","-W","-n",PACKAGE+"/.MainActivity")
    tap(lookup("Open Trainer","Trainer",limit=45))
    view=lookup("View","workspace-view",limit=35)
    mode=find("3D Mode")
    if mode is not None:
        tap(mode)
        lookup("2D Mode",limit=16)
    tap(lookup("View","workspace-view",limit=8))
    tap(lookup("Controller","trainerControllerSetup"))
    enable=lookup("Enable Controller Mode","trainerControllerEnabled")
    if enable.get("checked")!="true":
        tap(enable)
    lookup("Input test active. Table controls are paused.", limit=18)
    print("PASS: input device visible in Controller Setup", flush=True)
    for _ in range(5):
        nodes=screen()
        field=find("Button 14 action",nodes)
        if field is None: field=find("Fine aim left",nodes)
        if field is not None:
            x,y,x1,y1=map(int,re.findall(r"\d+",field.attrib["bounds"]))
            if y1-y>15: break
        adb("shell","input","swipe","850","800","850","270","400")
    else:
        raise AssertionError("Button 14 mapping could not be reached: "+repr([labels(n) for n in nodes if any(labels(n))])[:8000])
    save("before-picker")
    tap(field)
    # The adapter refreshes within 120 ms. Keep the chooser open past several refreshes.
    time.sleep(1)
    save("open-picker")
    # A uiautomator dump starts a new accessibility connection and can dismiss
    # the popup it is trying to inspect. Read its pixels before another connection.
    import csv
    from io import StringIO
    from PIL import Image, ImageChops
    before=Image.open(OUT/"before-picker.png").convert("RGB")
    opened=Image.open(OUT/"open-picker.png").convert("RGB")
    diff=ImageChops.difference(before,opened).convert("L").point(lambda v: 255 if v>38 else 0)
    bounds=diff.getbbox()
    assert bounds is not None and bounds[3]-bounds[1]>100, "No visible picker after one second"
    def words(image):
        image.save(OUT/"ocr.png")
        raw=subprocess.check_output(["tesseract",str(OUT/"ocr.png"),"stdout","--psm","6","tsv"],stderr=subprocess.DEVNULL).decode()
        lines={}
        for w in csv.DictReader(StringIO(raw),delimiter="\t"):
            if w["text"].strip():lines.setdefault((w["block_num"],w["par_num"],w["line_num"]),[]).append(w)
        return lines.values()
    # Limit OCR to the popup column. Its option order puts Fine aim right last.
    rect=list(map(int,re.findall(r"\d+",field.attrib["bounds"])))
    cx=(rect[0]+rect[2])//2
    crop=(max(0,rect[0]-12),0,min(opened.width,rect[2]+12),opened.height)
    rows=words(opened.crop(crop))
    match=next((row for row in rows if "fine aim right" in " ".join(w["text"] for w in row).lower()),None)
    if match is not None:
        y=int(match[0]["top"])+int(match[0]["height"])//2
        adb("shell","input","tap",str(cx),str(y))
    else:
        # Android's select list accepts DPAD_DOWN from Fine aim left to Fine aim right.
        adb("shell","input","keyevent","KEYCODE_DPAD_DOWN")
        adb("shell","input","keyevent","KEYCODE_ENTER")
    time.sleep(0.6)
    save("saved-mapping")
    selected=Image.open(OUT/"saved-mapping.png").crop(tuple(rect)).resize(((rect[2]-rect[0])*2,(rect[3]-rect[1])*2))
    words_after=" ".join(w["text"] for row in words(selected) for w in row).lower()
    assert "fine aim right" in words_after, "Selected row after closing chooser: "+words_after
    chosen=lookup("Button 14 action")
    new_bounds=list(map(int,re.findall(r"\d+",chosen.attrib["bounds"])))
    assert abs(new_bounds[1]-rect[1])<12, "The panel moved after selection"
    print("PASS: connected Android native picker stays open, saves Fine aim right and retains the lower mapping",flush=True)

if __name__=="__main__":
    device=subprocess.Popen(["adb","shell","uinput","-"],stdin=subprocess.PIPE,text=True)
    try:
        cmd={"id":1,"type":"uinput","command":"register","name":"Picker Test Pad","vid":6353,"pid":43981,"bus":"usb","configuration":[{"type":100,"data":[1]},{"type":101,"data":[304]}]}
        device.stdin.write(json.dumps(cmd)+"\n");device.stdin.flush()
        main()
        device.stdin.close()
        device.wait(timeout=10)
        end=time.monotonic()+10
        while time.monotonic()<end:
            after=screen()
            mapping=find("Button 14 action",after)
            if mapping is None:
                mapping=next((n for n in after if n.get("class")=="android.widget.Spinner" and n.get("enabled")=="false"),None)
            if mapping is not None and mapping.get("enabled")=="false":
                print("PASS: actual device removal disabled the retained mapping field",flush=True)
                break
        else:
            raise AssertionError("Mapping remained editable or disappeared after unplug")
    finally:
        device.stdin.close()
        device.wait(timeout=10)
        (OUT/"input-devices.txt").write_text(adb("shell","dumpsys","input"))
        save("final")
