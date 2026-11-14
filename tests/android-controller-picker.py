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
    return [node.get(k, "").strip() for k in ("text", "content-desc", "resource-id")]

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
    adb("shell","settings","put","system","accelerometer_rotation","0")
    adb("shell","settings","put","system","user_rotation","1")
    adb("shell","input","keyevent","KEYCODE_WAKEUP")
    adb("shell","wm","dismiss-keyguard")
    adb("shell","am","start","-W","-n",PACKAGE+"/.MainActivity")
    tap(lookup("Open Trainer","Trainer",limit=45))
    tap(lookup("View","workspace-view",limit=35))
    tap(lookup("Controller","trainerControllerSetup"))
    enable=lookup("Enable Controller Mode","trainerControllerEnabled")
    if enable.get("checked")!="true":
        tap(enable)
    lookup("Picker Test Pad", limit=18)
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
        raise AssertionError("Button 14 mapping could not be reached")
    save("before-picker")
    tap(field)
    # The adapter refreshes within 120 ms. Keep the chooser open past several refreshes.
    time.sleep(1)
    options=screen()
    choice=next((n for n in options if n.get("text")=="Fine aim right" and
                 n.get("class") in ("android.widget.CheckedTextView","android.widget.TextView","android.widget.RadioButton")),None)
    assert choice is not None, "Native chooser missing after touch and one-second wait"
    save("open-picker")
    tap(choice)
    changed=screen()
    field_at_bottom=next((n for n in changed if n.get("bounds")==field.get("bounds") and any("Fine aim right" in v for v in labels(n))),None)
    chosen=field_at_bottom if field_at_bottom is not None else lookup("Button 14 action")
    assert "Fine aim right" in " ".join(chosen.attrib.values()) or any(
        "Fine aim right" in n.get("text","") for n in chosen.iter()), chosen.attrib
    save("saved-mapping")
    print("PASS: connected Android native picker stays open, saves Fine aim right and retains the lower mapping",flush=True)

if __name__=="__main__":
    device=subprocess.Popen(["adb","shell","uinput","-"],stdin=subprocess.PIPE,text=True)
    try:
        cmd={"id":1,"type":"uinput","command":"register","name":"Picker Test Pad","vid":6353,"pid":43981,"bus":"usb","configuration":[{"type":100,"data":[1]},{"type":101,"data":[304]}]}
        device.stdin.write(json.dumps(cmd)+"\n");device.stdin.flush()
        main()
    finally:
        device.stdin.close()
        device.wait(timeout=10)
        (OUT/"input-devices.txt").write_text(adb("shell","dumpsys","input"))
        save("final")
