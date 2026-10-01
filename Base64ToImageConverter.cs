using System;
using System.Globalization;
using System.IO;
using System.Windows.Data;
using System.Windows.Media.Imaging;

namespace InvisibleChat
{
    public class Base64ToImageConverter : IValueConverter
    {
        public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            if (value is string str && !string.IsNullOrWhiteSpace(str))
            {
                try
                {
                    // If it's a Cloudinary or remote image URL
                    if (str.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || 
                        str.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    {
                        var imgUri = new BitmapImage();
                        imgUri.BeginInit();
                        imgUri.UriSource = new Uri(str, UriKind.Absolute);
                        imgUri.CacheOption = BitmapCacheOption.OnLoad;
                        imgUri.EndInit();
                        imgUri.Freeze();
                        return imgUri;
                    }

                    // Strip data:image/...;base64, prefix if present
                    string rawBase64 = str;
                    int commaIdx = rawBase64.IndexOf(',');
                    if (commaIdx >= 0 && rawBase64.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                    {
                        rawBase64 = rawBase64.Substring(commaIdx + 1);
                    }

                    byte[] bytes = System.Convert.FromBase64String(rawBase64);
                    using var ms = new MemoryStream(bytes);
                    var img = new BitmapImage();
                    img.BeginInit();
                    img.CacheOption = BitmapCacheOption.OnLoad;
                    img.StreamSource = ms;
                    img.EndInit();
                    img.Freeze();
                    return img;
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine($"Failed to decode image from source: {ex.Message}");
                }
            }
            return null;
        }

        public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }
}
