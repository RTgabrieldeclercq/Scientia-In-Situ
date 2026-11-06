"""The mouse's own movement, for the edge pan (V3.960; used by serve.py, Windows only).

Pushed against the screen's edge, the cursor stops, so the browser hears nothing more: a pointer event fires only
when the position changes. Windows still reports how far the mouse itself moves (raw input). While the app pushes a
note against an edge where the cursor is stopped (or past the window there, onto the taskbar), it asks this
computer's server how far the mouse has gone (GET /api/edge-push), and the pan speeds up with it.

Only relative movement is counted (a mouse, a touchpad); a pen, a touch screen or a remote session report absolute
positions and are skipped. Nothing else is read: no buttons, no keys, no windows, no cursor position. The listener
registers on the first question and lets go after IDLE seconds without one.
"""
import ctypes, sys, threading, time

IDLE = 3.0   # seconds without a question before the listener lets go

WM_INPUT, WM_TIMER, WM_APP = 0x00FF, 0x0113, 0x8000
RID_INPUT, RIM_TYPEMOUSE, MOUSE_MOVE_ABSOLUTE = 0x10000003, 0, 0x01
RIDEV_REMOVE, RIDEV_INPUTSINK = 0x00000001, 0x00000100
HWND_MESSAGE = -3
CLASS = 'ScientiaRawMouse'

if sys.platform == 'win32':
    from ctypes import wintypes as W
    _u = ctypes.WinDLL('user32', use_last_error=True)
    _k = ctypes.WinDLL('kernel32', use_last_error=True)
    LRESULT = ctypes.c_ssize_t
    WNDPROC = ctypes.WINFUNCTYPE(LRESULT, W.HWND, W.UINT, W.WPARAM, W.LPARAM)

    class WNDCLASSW(ctypes.Structure):
        _fields_ = [('style', W.UINT), ('lpfnWndProc', WNDPROC), ('cbClsExtra', ctypes.c_int), ('cbWndExtra', ctypes.c_int),
                    ('hInstance', W.HINSTANCE), ('hIcon', W.HICON), ('hCursor', W.HANDLE), ('hbrBackground', W.HBRUSH),
                    ('lpszMenuName', W.LPCWSTR), ('lpszClassName', W.LPCWSTR)]

    class RAWINPUTDEVICE(ctypes.Structure):
        _fields_ = [('usUsagePage', W.USHORT), ('usUsage', W.USHORT), ('dwFlags', W.DWORD), ('hwndTarget', W.HWND)]

    class RAWINPUTHEADER(ctypes.Structure):
        _fields_ = [('dwType', W.DWORD), ('dwSize', W.DWORD), ('hDevice', W.HANDLE), ('wParam', W.WPARAM)]

    class RAWMOUSE(ctypes.Structure):
        _fields_ = [('usFlags', W.USHORT), ('ulButtons', W.ULONG), ('ulRawButtons', W.ULONG), ('lLastX', W.LONG), ('lLastY', W.LONG),
                    ('ulExtraInformation', W.ULONG)]

    class RAWINPUT(ctypes.Structure):
        _fields_ = [('header', RAWINPUTHEADER), ('mouse', RAWMOUSE)]

    for name, args, res in (
            ('DefWindowProcW', [W.HWND, W.UINT, W.WPARAM, W.LPARAM], LRESULT),
            ('RegisterClassW', [ctypes.POINTER(WNDCLASSW)], W.ATOM),
            ('CreateWindowExW', [W.DWORD, W.LPCWSTR, W.LPCWSTR, W.DWORD, ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
                                 W.HWND, W.HMENU, W.HINSTANCE, W.LPVOID], W.HWND),
            ('GetRawInputData', [W.HANDLE, W.UINT, W.LPVOID, ctypes.POINTER(W.UINT), W.UINT], W.UINT),
            ('RegisterRawInputDevices', [ctypes.POINTER(RAWINPUTDEVICE), W.UINT, W.UINT], W.BOOL),
            ('GetMessageW', [ctypes.POINTER(W.MSG), W.HWND, W.UINT, W.UINT], W.BOOL),
            ('DispatchMessageW', [ctypes.POINTER(W.MSG)], LRESULT),
            ('PostMessageW', [W.HWND, W.UINT, W.WPARAM, W.LPARAM], W.BOOL),
            ('SetTimer', [W.HWND, ctypes.c_size_t, W.UINT, ctypes.c_void_p], ctypes.c_size_t)):
        f = getattr(_u, name); f.argtypes = args; f.restype = res
    _k.GetModuleHandleW.argtypes = [W.LPCWSTR]; _k.GetModuleHandleW.restype = W.HMODULE


class RawMouse:
    def __init__(self):
        self.lock = threading.Lock(); self.x = 0; self.y = 0; self.asked = 0.0
        self.hwnd = None; self.on = False; self.thread = None; self.ready = threading.Event()
        self.error = None if sys.platform == 'win32' else 'only on Windows'

    def read(self):
        """How far the mouse has moved so far, in its own counts (the app takes the difference between two answers).
        The first question starts the listener; movement before it is not counted."""
        if self.error: return {'ok': False, 'error': self.error}
        self.asked = time.time()
        with self.lock:
            if not self.thread: self.thread = threading.Thread(target=self._run, name='rawmouse', daemon=True); self.thread.start()
        self.ready.wait(2)
        if self.error or not self.hwnd: return {'ok': False, 'error': self.error or 'the listener did not start'}
        if not self.on: _u.PostMessageW(self.hwnd, WM_APP, 0, 0)   # idle: listen again (this answer is where counting restarts)
        with self.lock: return {'ok': True, 'x': self.x, 'y': self.y, 'on': self.on}

    # ---- the listener's own thread: a hidden message-only window that receives raw mouse input ----
    def _listen(self, on):
        d = RAWINPUTDEVICE(1, 2, RIDEV_INPUTSINK if on else RIDEV_REMOVE, self.hwnd if on else None)   # usage page 1, usage 2: mice
        if _u.RegisterRawInputDevices(ctypes.byref(d), 1, ctypes.sizeof(d)): self.on = on

    def _proc(self, hwnd, msg, wp, lp):
        if msg == WM_INPUT:
            try:
                ri = RAWINPUT(); n = W.UINT(ctypes.sizeof(ri))
                got = _u.GetRawInputData(lp, RID_INPUT, ctypes.byref(ri), ctypes.byref(n), ctypes.sizeof(RAWINPUTHEADER))
                if got not in (0, 0xFFFFFFFF) and ri.header.dwType == RIM_TYPEMOUSE and not ri.mouse.usFlags & MOUSE_MOVE_ABSOLUTE:
                    with self.lock: self.x += ri.mouse.lLastX; self.y += ri.mouse.lLastY
            except Exception: pass
            return _u.DefWindowProcW(hwnd, msg, wp, lp)   # Windows frees the input here
        if msg == WM_APP: self._listen(True); return 0
        if msg == WM_TIMER:
            if self.on and time.time() - self.asked > IDLE: self._listen(False)
            return 0
        return _u.DefWindowProcW(hwnd, msg, wp, lp)

    def _run(self):
        try:
            self._wndproc = WNDPROC(self._proc)   # kept, so it is not collected while Windows calls it
            hinst = _k.GetModuleHandleW(None)
            wc = WNDCLASSW(lpfnWndProc=self._wndproc, hInstance=hinst, lpszClassName=CLASS)
            if not _u.RegisterClassW(ctypes.byref(wc)) and ctypes.get_last_error() != 1410:   # 1410: the class exists already
                raise OSError('RegisterClass failed (%d)' % ctypes.get_last_error())
            self.hwnd = _u.CreateWindowExW(0, CLASS, CLASS, 0, 0, 0, 0, 0, HWND_MESSAGE, None, hinst, None)
            if not self.hwnd: raise OSError('CreateWindow failed (%d)' % ctypes.get_last_error())
            self._listen(True)
            if not self.on: raise OSError('RegisterRawInputDevices failed (%d)' % ctypes.get_last_error())
            _u.SetTimer(self.hwnd, 1, 1000, None)
        except Exception as e:
            self.error = 'raw mouse input is unavailable: %s' % e; self.ready.set(); return
        self.ready.set()
        msg = W.MSG()
        while _u.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0: _u.DispatchMessageW(ctypes.byref(msg))


if __name__ == '__main__':   # a check by hand: move the mouse, against an edge too, and watch the counts grow
    m = RawMouse()
    for _ in range(20): print(m.read()); time.sleep(.5)
