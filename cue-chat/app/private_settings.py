"""Windows-user-scoped settings through the Data Protection API."""
import ctypes as C
from ctypes import wintypes as W
import json
import os
from pathlib import Path
import tempfile

class Blob(C.Structure):
    _fields_ = [('size',W.DWORD),('data',C.POINTER(C.c_ubyte))]

def dpapi(content, protect):
    if os.name != 'nt':
        raise OSError('Windows account encryption is unavailable on this system.')
    api = C.WinDLL('crypt32',use_last_error=True)
    kernel = C.WinDLL('kernel32',use_last_error=True)
    free = kernel.LocalFree
    free.argtypes = [C.c_void_p]
    free.restype = C.c_void_p
    pointer = C.POINTER(Blob)
    call = api.CryptProtectData if protect else api.CryptUnprotectData
    second = W.LPCWSTR if protect else C.POINTER(W.LPWSTR)
    call.argtypes = [pointer,second,pointer,C.c_void_p,C.c_void_p,W.DWORD,pointer]
    call.restype = W.BOOL
    buffer=(C.c_ubyte*len(content)).from_buffer_copy(content)
    source,result=Blob(len(content),buffer),Blob()
    try:
        # CRYPTPROTECT_UI_FORBIDDEN only. Do not use CRYPTPROTECT_LOCAL_MACHINE.
        if not call(C.byref(source),None,None,None,None,1,C.byref(result)):
            raise C.WinError(C.get_last_error())
        return C.string_at(result.data,result.size)
    finally:
        C.memset(buffer,0,len(content))
        if result.data:
            C.memset(result.data,0,result.size)
            free(C.cast(result.data,C.c_void_p))

def read_settings(file, crypto=dpapi):
    try:
        with Path(file).open('rb') as source:
            raw = source.read(32769)
        if len(raw)>32768:
            raise ValueError('The private settings file is too large.')
        values=json.loads(crypto(raw,False))
        return values if isinstance(values,dict) else {}
    except FileNotFoundError:
        return {}

def save_settings(file, values, crypto=dpapi):
    path=Path(file)
    path.parent.mkdir(parents=True,exist_ok=True)
    blob=crypto(json.dumps(values,separators=(',',':')).encode(),True)
    fd,temp=tempfile.mkstemp(dir=path.parent,prefix='private-',suffix='.tmp')
    try:
        with os.fdopen(fd,'wb') as out:
            out.write(blob)
        os.replace(temp,path)
    finally:
        Path(temp).unlink(missing_ok=True)
