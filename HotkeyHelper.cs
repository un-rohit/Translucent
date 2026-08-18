using System;
using System.Runtime.InteropServices;
using System.Windows.Interop;

namespace InvisibleChat
{
    public class HotkeyHelper : IDisposable
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool RegisterHotKey(IntPtr hWnd, int id, uint fsModifiers, uint vk);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnregisterHotKey(IntPtr hWnd, int id);

        public const uint MOD_ALT = 0x0001;
        public const uint MOD_CONTROL = 0x0002;
        public const uint MOD_SHIFT = 0x0004;
        public const uint MOD_WIN = 0x0008;
        
        private const int WM_HOTKEY = 0x0312;

        private readonly IntPtr _hWnd;
        private readonly int _id;
        private readonly HwndSource _source;
        private readonly Action _onPressed;
        private bool _isRegistered = false;

        public HotkeyHelper(IntPtr hWnd, int id, uint modifiers, uint virtualKey, Action onPressed)
        {
            _hWnd = hWnd;
            _id = id;
            _onPressed = onPressed ?? throw new ArgumentNullException(nameof(onPressed));

            _source = HwndSource.FromHwnd(_hWnd) ?? throw new InvalidOperationException("Could not create HwndSource from window handle.");
            _source.AddHook(HwndHook);

            _isRegistered = RegisterHotKey(_hWnd, _id, modifiers, virtualKey);
            if (!_isRegistered)
            {
                int error = Marshal.GetLastWin32Error();
                System.Diagnostics.Debug.WriteLine($"Failed to register hotkey. Error code: {error}");
            }
        }

        private IntPtr HwndHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            if (msg == WM_HOTKEY && wParam.ToInt32() == _id)
            {
                _onPressed.Invoke();
                handled = true;
            }
            return IntPtr.Zero;
        }

        public void Dispose()
        {
            if (_isRegistered)
            {
                UnregisterHotKey(_hWnd, _id);
                _isRegistered = false;
            }
            _source?.RemoveHook(HwndHook);
        }
    }
}
