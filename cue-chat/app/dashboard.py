"""The single Windows launcher UI for the clean Cue Chat bundle."""
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import threading
import tkinter as tk
from tkinter import messagebox, ttk
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import build_opener, ProxyHandler, HTTPRedirectHandler
from queue import Empty, Queue
from private_settings import read_settings, save_settings
import webbrowser

APP = Path(__file__).resolve().parent
HOME_FOLDER = APP.parent
DATA = HOME_FOLDER / 'pilot-data'
HOST = '127.0.0.1'
PORT = 3003
PC_URL = f'http://{HOST}:{PORT}/'
BUILD = 'cue-chat-complete-20261126'
TAIL_HOST = re.compile(r'(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.){2,}ts\.net')
SETTINGS = Path(os.environ.get('LOCALAPPDATA',str(Path.home()))) / 'CueChatComplete' / 'private-settings.bin'

def android_address(value):
    try:
        url = urlsplit(value.strip())
        host = url.hostname or ''
        if (len(value) > 320 or url.scheme != 'https' or len(host) > 253 or not TAIL_HOST.fullmatch(host)
                or url.username or url.password or url.path not in ('','/') or url.query or url.fragment):
            return ''
        if url.port is not None and url.port < 1:
            return ''
        port = '' if url.port in (None, 443) else f':{url.port}'
        return f'https://{host}{port}/'
    except ValueError:
        return ''

def suggested_address():
    try:
        command = Path(os.environ.get('ProgramFiles','C:/Program Files')) / 'Tailscale' / 'tailscale.exe'
        if not command.is_file():
            return ''
        reply = subprocess.run([str(command),'status','--json'],capture_output=True,check=True,timeout=2,
                               creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
        name = json.loads(reply.stdout).get('Self',{}).get('DNSName','').rstrip('.')
        return android_address(f'https://{name}:9443/')
    except (OSError,ValueError,subprocess.SubprocessError):
        return ''

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def has_listener(host=HOST, port=PORT):
    try:
        with socket.create_connection((host, port), timeout=.4):
            return True
    except OSError:
        return False

def probe(base):
    """Return what is actually answering this address, not the selected folder."""
    try:
        opener = build_opener(ProxyHandler({}), NoRedirect())
        with opener.open(base + 'api/health', timeout=3) as response:
            data = json.loads(response.read(16_384))
        if not isinstance(data, dict) or data.get('transport') != 'local-network' or data.get('archive') != 'sqlite':
            return 'Other service'
        if data.get('bundle') != BUILD:
            return 'Old Cue Chat copy'
        return 'Ready'
    except (OSError, URLError, ValueError):
        return 'Not reachable'

def configuration(speechify=False, cloud=False, speechify_key='', cloud_key='', inherited=None):
    env = dict(os.environ if inherited is None else inherited)
    cli = [sys.executable, str(APP / 'server.py'), '--host', HOST, '--port', str(PORT), '--data', str(DATA)]
    for enabled, key, var, flag, name in [
        (speechify, speechify_key, 'SPEECHIFY_API_KEY', '--coach-speechify', 'Speechify'),
        (cloud, cloud_key, 'OPENAI_API_KEY', '--coach-openai', 'OpenAI'),
    ]:
        if not enabled:
            continue
        value = key.strip() or env.get(var,'').strip()
        if not value:
            raise ValueError(f'Enter the {name} API key or leave {name} unchecked.')
        env[var] = value
        cli.append(flag)
    return cli, env

def main():
    root = tk.Tk()
    root.title('Cue Chat Dashboard')
    root.minsize(680,465)
    ui = ttk.Frame(root,padding=20)
    ui.grid(sticky='nsew')
    root.columnconfigure(0, weight=1)
    root.rowconfigure(0, weight=1)
    ui.columnconfigure(1, weight=1)
    ttk.Label(ui,text='Cue Chat',font=('Segoe UI',24,'bold')).grid(row=0,column=0,columnspan=2,sticky='w')
    ttk.Label(ui,text=str(HOME_FOLDER),wraplength=630).grid(row=1,column=0,columnspan=2,sticky='w',pady=(3,14))
    pc = tk.StringVar(value='Checking…')
    link = tk.StringVar(value='Checking…')
    info = tk.StringVar(value='Close any older running copy of Cue Chat before you start.')
    try:
        prefs = read_settings(SETTINGS)
    except (OSError, ValueError):
        prefs = {}
        info.set('This Windows account could not open the saved settings. Enter them again if needed.')
    address = tk.StringVar(value=android_address(prefs.get('android','')) or suggested_address())
    speech = tk.BooleanVar(value=bool(prefs.get('speechify_enabled',os.environ.get('SPEECHIFY_API_KEY'))))
    cloud = tk.BooleanVar(value=bool(prefs.get('cloud_enabled',False)))
    remember = tk.BooleanVar(value=True)
    sk = tk.StringVar(value=prefs.get('speechify_key',''))
    ck = tk.StringVar(value=prefs.get('cloud_key',''))
    ttk.Label(ui,text='Cue Chat on this PC').grid(row=2,column=0,sticky='w',pady=5)
    ttk.Label(ui,textvariable=pc).grid(row=2,column=1,sticky='w')
    ttk.Label(ui,text='Android Tailscale link').grid(row=3,column=0,sticky='w',pady=5)
    ttk.Label(ui,textvariable=link).grid(row=3,column=1,sticky='w')
    ttk.Label(ui,text='Android address').grid(row=4,column=0,sticky='w',pady=5)
    ttk.Entry(ui,textvariable=address).grid(row=4,column=1,sticky='ew')
    ttk.Separator(ui).grid(row=5,column=0,columnspan=2,sticky='ew',pady=8)
    ttk.Checkbutton(ui,text='Speechify voice',variable=speech).grid(row=6,column=0,sticky='w',pady=4)
    ttk.Entry(ui,textvariable=sk,show='*').grid(row=6,column=1,sticky='ew')
    ttk.Checkbutton(ui,text='OpenAI replies',variable=cloud).grid(row=7,column=0,sticky='w',pady=4)
    ttk.Entry(ui,textvariable=ck,show='*').grid(row=7,column=1,sticky='ew')
    ttk.Checkbutton(ui,text='Remember on this PC (encrypted for this Windows account)',variable=remember).grid(row=8,columnspan=2,sticky='w',pady=(5,8))
    controls = ttk.Frame(ui)
    controls.grid(row=9,column=0,columnspan=2,sticky='w',pady=6)
    ttk.Label(ui,textvariable=info,wraplength=630).grid(row=10,column=0,columnspan=2,sticky='w',pady=8)
    messages = Queue()
    polling = False
    process = None
    launched_at = 0.
    exited_shown = False
    from time import monotonic

    def remember_choices():
        if remember.get():
            values = dict(android=android_address(address.get()),speechify_enabled=speech.get(),
                          cloud_enabled=cloud.get(),speechify_key=sk.get().strip(),cloud_key=ck.get().strip())
            save_settings(SETTINGS,values)
        else:
            SETTINGS.unlink(missing_ok=True)

    def dispatch_probe():
        nonlocal polling
        if polling:
            return
        polling=True
        endpoint=android_address(address.get())
        def job():
            pc_result=probe(PC_URL)
            android_result=probe(endpoint) if endpoint else 'Set your Tailscale link'
            messages.put((pc_result,android_result))
        threading.Thread(target=job,daemon=True).start()

    def start():
        nonlocal process,launched_at,exited_shown
        if process and process.poll() is None:
            return
        if has_listener():
            info.set('Port 3003 is already in use. Close the old Cue Chat window and click Start again.')
            dispatch_probe()
            return
        try:
            cli,env=configuration(speech.get(),cloud.get(),sk.get(),ck.get())
            DATA.mkdir(exist_ok=True)
            with (DATA/'dashboard-server.log').open('w',encoding='utf-8') as log:
                process=subprocess.Popen(cli,cwd=APP,env=env,stdin=subprocess.DEVNULL,stdout=log,
                                         stderr=subprocess.STDOUT,creationflags=getattr(subprocess,'CREATE_NO_WINDOW',0))
            launched_at=monotonic();exited_shown=False
            info.set('Starting the bundled copy…')
            try:
                remember_choices()
            except OSError:
                info.set('Starting Cue Chat. Windows could not save the encrypted settings.')
        except (OSError,ValueError) as e:
            info.set(str(e))
        dispatch_probe()

    def stop():
        nonlocal process
        if process and process.poll() is None:
            process.terminate()
            try:process.wait(timeout=2)
            except subprocess.TimeoutExpired:info.set('Cue Chat is stopping…');return
        process=None
        info.set('Cue Chat is stopped.')
        dispatch_probe()

    def open_inbox():
        if pc.get()=='Ready':
            webbrowser.open(PC_URL+'?bundle='+BUILD)

    def copy_link():
        url=android_address(address.get())
        if not url:
            info.set('Enter the HTTPS address from Tailscale Serve in the Android address field.')
            return
        try:
            remember_choices()
        except OSError:
            pass
        root.clipboard_clear()
        root.clipboard_append(url)
        info.set('Android link copied. Connect the phone or tablet to Tailscale before opening it.')

    start_btn=ttk.Button(controls,text='Start Cue Chat',command=start)
    stop_btn=ttk.Button(controls,text='Stop',command=stop)
    open_btn=ttk.Button(controls,text='Open Inbox',command=open_inbox)
    for button in [start_btn,stop_btn,open_btn,ttk.Button(controls,text='Copy Android link',command=copy_link)]:
        button.pack(side='left',padx=(0,7))

    def tick():
        nonlocal polling,exited_shown
        try:
            p,a=messages.get_nowait()
            pc.set(p);link.set(a);polling=False
            if p=='Ready' and info.get()=='Starting the bundled copy…':
                info.set('The bundled inbox is ready.')
        except Empty:
            pass
        running=process is not None and process.poll() is None
        if process is not None and not running and not exited_shown:
            exited_shown=True
            info.set('Cue Chat did not stay running. Check the API key or see pilot-data/dashboard-server.log.')
        if running and pc.get()!='Ready' and monotonic()-launched_at>20 and info.get()=='Starting the bundled copy…':
            info.set('Still starting. If voice is enabled, check the Speechify connection or try text only.')
        start_btn.state(['disabled'] if running or pc.get()=='Ready' else ['!disabled'])
        stop_btn.state(['!disabled'] if running else ['disabled'])
        open_btn.state(['!disabled'] if pc.get()=='Ready' else ['disabled'])
        dispatch_probe()
        root.after(1600,tick)

    def close():
        if process and process.poll() is None:
            if not messagebox.askyesno('Close Cue Chat?', 'Closing the dashboard also stops this copy of Cue Chat.',parent=root):
                return
            stop()
            if process and process.poll() is None:
                return
        root.destroy()

    root.protocol('WM_DELETE_WINDOW',close)
    tick()
    root.mainloop()

if __name__ == '__main__':
    main()
