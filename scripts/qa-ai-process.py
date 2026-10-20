"""Read only the current directory of a specified 64-bit Windows process."""
import ctypes as C
from ctypes import wintypes as W
import sys, json

pid = int(sys.argv[1])
kernel = C.WinDLL('kernel32', use_last_error=True)
nt = C.WinDLL('ntdll')
kernel.OpenProcess.argtypes = [W.DWORD, W.BOOL, W.DWORD]
kernel.OpenProcess.restype = W.HANDLE
kernel.ReadProcessMemory.argtypes = [W.HANDLE, C.c_void_p, C.c_void_p, C.c_size_t, C.c_void_p]
kernel.ReadProcessMemory.restype = W.BOOL
kernel.CloseHandle.argtypes = [W.HANDLE]
class Basic(C.Structure):
    _fields_ = [('Reserved1', C.c_void_p), ('PebBaseAddress', C.c_void_p), ('Reserved2', C.c_void_p * 2), ('UniqueProcessId', C.c_size_t), ('Reserved3', C.c_void_p)]
class Unicode(C.Structure):
    _fields_ = [('Length', W.USHORT), ('MaximumLength', W.USHORT), ('Buffer', C.c_void_p)]
def main():
    if C.sizeof(C.c_void_p) != 8:
        raise RuntimeError('64-bit interpreter required')
    handle = kernel.OpenProcess(0x0400 | 0x0010, False, pid)
    if not handle:
        raise C.WinError(C.get_last_error())
    try:
        info = Basic()
        status = nt.NtQueryInformationProcess(W.HANDLE(handle), 0, C.byref(info), C.sizeof(info), None)
        if status:
            raise RuntimeError('Process information unavailable')
        def read(address, target):
            if not kernel.ReadProcessMemory(handle, address, C.byref(target), C.sizeof(target), None):
                raise C.WinError(C.get_last_error())
            return target
        parameters = read(info.PebBaseAddress + 0x20, C.c_void_p()).value
        directory = read(parameters + 0x38, Unicode())
        if directory.Length > 32768:
            raise RuntimeError('Invalid directory length')
        value = C.create_string_buffer(directory.Length)
        if not kernel.ReadProcessMemory(handle, directory.Buffer, value, directory.Length, None):
            raise C.WinError(C.get_last_error())
        print(json.dumps({'pid': pid, 'cwd': value.raw.decode('utf-16-le')}, ensure_ascii=False))
    finally:
        kernel.CloseHandle(handle)
if __name__ == '__main__':
    main()
