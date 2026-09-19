using System;
using System.Runtime.InteropServices;

namespace InvisibleChat
{
    public static class WindowHider
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern int GetWindowLong(IntPtr hWnd, int nIndex);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

        // Windows 10 version 2004 introduces WDA_EXCLUDEFROMCAPTURE (0x00000011)
        private const uint WDA_NONE = 0x00000000;
        private const uint WDA_MONITOR = 0x00000001;
        private const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;

        private const int GWL_EXSTYLE = -20;
        private const int WS_EX_TRANSPARENT = 0x00000020;
        private const int WS_EX_LAYERED = 0x00080000;

        public static bool HideFromCapture(IntPtr windowHandle)
        {
            if (windowHandle == IntPtr.Zero)
            {
                return false;
            }

            try
            {
                bool result = SetWindowDisplayAffinity(windowHandle, WDA_EXCLUDEFROMCAPTURE);
                if (!result)
                {
                    int error = Marshal.GetLastWin32Error();
                    System.Diagnostics.Debug.WriteLine($"Failed to set display affinity to EXCLUDEFROMCAPTURE. Error code: {error}. Falling back to WDA_MONITOR.");
                    
                    result = SetWindowDisplayAffinity(windowHandle, WDA_MONITOR);
                    if (!result)
                    {
                        error = Marshal.GetLastWin32Error();
                        System.Diagnostics.Debug.WriteLine($"Failed to set display affinity to MONITOR. Error code: {error}");
                        return false;
                    }
                }
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Error applying window display affinity: {ex.Message}");
                return false;
            }
        }

        public static bool SetClickThrough(IntPtr hWnd, bool clickThrough)
        {
            if (hWnd == IntPtr.Zero) return false;

            try
            {
                int currentExStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
                int newExStyle;

                if (clickThrough)
                {
                    newExStyle = currentExStyle | WS_EX_TRANSPARENT | WS_EX_LAYERED;
                }
                else
                {
                    newExStyle = (currentExStyle & ~WS_EX_TRANSPARENT) | WS_EX_LAYERED;
                }

                SetWindowLong(hWnd, GWL_EXSTYLE, newExStyle);
                return true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to set click-through: {ex.Message}");
                return false;
            }
        }
    }
}
