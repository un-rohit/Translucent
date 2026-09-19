using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

namespace InvisibleChat
{
    public static class ScreenCaptureHelper
    {
        public static string? CaptureRegionToBase64(int x, int y, int width, int height)
        {
            if (width <= 0 || height <= 0) return null;

            try
            {
                using var bmp = new Bitmap(width, height, PixelFormat.Format32bppArgb);
                using (var g = Graphics.FromImage(bmp))
                {
                    g.CopyFromScreen(x, y, 0, 0, new Size(width, height), CopyPixelOperation.SourceCopy);
                }

                using var ms = new MemoryStream();
                bmp.Save(ms, ImageFormat.Png);
                return Convert.ToBase64String(ms.ToArray());
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Screen capture failed: {ex.Message}");
                return null;
            }
        }

        public static string? CaptureVirtualScreen()
        {
            var bounds = System.Windows.Forms.SystemInformation.VirtualScreen;
            return CaptureRegionToBase64(bounds.Left, bounds.Top, bounds.Width, bounds.Height);
        }
    }
}
