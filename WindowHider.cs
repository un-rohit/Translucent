using System;
using System.Runtime.InteropServices;

namespace InvisibleChat
{
    public static class WindowHider
    {
        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool SetWindowDisplayAffinity(IntPtr hWnd, uint dwAffinity);

        // Windows 10 version 2004 introduces WDA_EXCLUDEFROMCAPTURE (0x00000011)
        // This makes the window completely invisible in screen captures rather than showing up as black (WDA_MONITOR = 0x1)
        private const uint WDA_NONE = 0x00000000;
        private const uint WDA_MONITOR = 0x00000001;
        private const uint WDA_EXCLUDEFROMCAPTURE = 0x00000011;

        public static bool HideFromCapture(IntPtr windowHandle)
        {
            if (windowHandle == IntPtr.Zero)
            {
                return false;
            }

            try
            {
                // Attempt to apply WDA_EXCLUDEFROMCAPTURE
                bool result = SetWindowDisplayAffinity(windowHandle, WDA_EXCLUDEFROMCAPTURE);
                if (!result)
                {
                    int error = Marshal.GetLastWin32Error();
                    System.Diagnostics.Debug.WriteLine($"Failed to set display affinity to EXCLUDEFROMCAPTURE. Error code: {error}. Falling back to WDA_MONITOR.");
                    
                    // Fallback to WDA_MONITOR if WDA_EXCLUDEFROMCAPTURE is unsupported (pre-Windows 10 2004)
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
    }
}
