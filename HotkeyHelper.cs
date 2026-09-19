using System;
using System.Collections.Generic;
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
        private readonly HwndSource _source;
        private readonly Dictionary<int, Action> _hotkeyActions = new();
        private readonly List<int> _registeredIds = new();

        public HotkeyHelper(IntPtr hWnd)
        {
            _hWnd = hWnd;
            _source = HwndSource.FromHwnd(_hWnd) ?? throw new InvalidOperationException("Could not create HwndSource from window handle.");
            _source.AddHook(HwndHook);
        }

        public bool Register(int id, uint modifiers, uint virtualKey, Action onPressed)
        {
            if (_hotkeyActions.ContainsKey(id))
            {
                Unregister(id);
            }

            _hotkeyActions[id] = onPressed ?? throw new ArgumentNullException(nameof(onPressed));
            bool success = RegisterHotKey(_hWnd, id, modifiers, virtualKey);
            if (success)
            {
                _registeredIds.Add(id);
            }
            else
            {
                int error = Marshal.GetLastWin32Error();
                System.Diagnostics.Debug.WriteLine($"Failed to register hotkey {id}. Error code: {error}");
            }
            return success;
        }

        public bool Unregister(int id)
        {
            _hotkeyActions.Remove(id);
            if (_registeredIds.Contains(id))
            {
                _registeredIds.Remove(id);
                return UnregisterHotKey(_hWnd, id);
            }
            return false;
        }

        private IntPtr HwndHook(IntPtr hwnd, int msg, IntPtr wParam, IntPtr lParam, ref bool handled)
        {
            if (msg == WM_HOTKEY)
            {
                int id = wParam.ToInt32();
                if (_hotkeyActions.TryGetValue(id, out var action))
                {
                    action.Invoke();
                    handled = true;
                }
            }
            return IntPtr.Zero;
        }

        public void Dispose()
        {
            foreach (var id in _registeredIds)
            {
                UnregisterHotKey(_hWnd, id);
            }
            _registeredIds.Clear();
            _hotkeyActions.Clear();
            _source?.RemoveHook(HwndHook);
        }
    }
}
