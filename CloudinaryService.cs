using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace InvisibleChat
{
    public class CloudinaryService
    {
        private static CloudinaryService? _instance;
        public static CloudinaryService Instance => _instance ??= new CloudinaryService();

        public string CloudName { get; set; } = "frx537fs";
        public string ApiKey { get; set; } = "949461777111196";
        public string ApiSecret { get; set; } = "XOglkgYa9agxDfT4MTdL1nITQk0";

        private readonly HttpClient _httpClient = new() { Timeout = TimeSpan.FromSeconds(35) };

        public CloudinaryService()
        {
            // Allow override from AppConfig if configured
            try
            {
                var cfg = ConfigManager.Load();
                if (!string.IsNullOrEmpty(cfg.CloudinaryCloudName)) CloudName = cfg.CloudinaryCloudName;
                if (!string.IsNullOrEmpty(cfg.CloudinaryApiKey)) ApiKey = cfg.CloudinaryApiKey;
                if (!string.IsNullOrEmpty(cfg.CloudinaryApiSecret)) ApiSecret = cfg.CloudinaryApiSecret;
            }
            catch {}
        }

        private string GenerateSignature(IDictionary<string, string> parameters)
        {
            // Parameters to sign must be sorted alphabetically by key
            var sortedParams = parameters.OrderBy(p => p.Key, StringComparer.Ordinal);
            string paramString = string.Join("&", sortedParams.Select(p => $"{p.Key}={p.Value}"));
            string toSign = paramString + ApiSecret;

            byte[] hash = SHA1.HashData(Encoding.UTF8.GetBytes(toSign));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }

        /// <summary>
        /// Uploads raw string data (such as JSON chat history) to Cloudinary.
        /// </summary>
        public async Task<(bool Success, string? SecureUrl, string? Error)> UploadRawAsync(string content, string publicId, bool overwrite = true)
        {
            try
            {
                string timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                byte[] contentBytes = Encoding.UTF8.GetBytes(content);
                string base64Data = "data:application/json;base64," + Convert.ToBase64String(contentBytes);

                var signParams = new Dictionary<string, string>
                {
                    { "public_id", publicId },
                    { "timestamp", timestamp }
                };

                if (overwrite)
                {
                    signParams["overwrite"] = "true";
                }

                string signature = GenerateSignature(signParams);

                var formFields = new Dictionary<string, string>(signParams)
                {
                    { "file", base64Data },
                    { "api_key", ApiKey },
                    { "signature", signature }
                };

                string url = $"https://api.cloudinary.com/v1_1/{CloudName}/raw/upload";
                using var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new FormUrlEncodedContent(formFields)
                };

                var response = await _httpClient.SendAsync(request);
                string responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    if (doc.RootElement.TryGetProperty("secure_url", out var su))
                    {
                        return (true, su.GetString(), null);
                    }
                    return (true, null, null);
                }

                return (false, null, $"Cloudinary upload failed: {response.StatusCode} - {responseBody}");
            }
            catch (Exception ex)
            {
                return (false, null, ex.Message);
            }
        }

        /// <summary>
        /// Downloads raw string data (such as JSON chat history) from Cloudinary.
        /// </summary>
        public async Task<(bool Success, string? Content, string? Error)> DownloadRawAsync(string publicId)
        {
            try
            {
                string timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                string url = $"https://res.cloudinary.com/{CloudName}/raw/upload/{publicId}?_t={timestamp}";

                using var request = new HttpRequestMessage(HttpMethod.Get, url);
                var response = await _httpClient.SendAsync(request);

                if (response.IsSuccessStatusCode)
                {
                    string content = await response.Content.ReadAsStringAsync();
                    return (true, content, null);
                }

                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return (false, null, "History not found in cloud");
                }

                return (false, null, $"Failed to download: {response.StatusCode}");
            }
            catch (Exception ex)
            {
                return (false, null, ex.Message);
            }
        }

        /// <summary>
        /// Uploads an image (base64 string or file data) to Cloudinary and returns the permanent CDN URL.
        /// </summary>
        public async Task<(bool Success, string? SecureUrl, string? Error)> UploadImageAsync(string base64Image, string? publicId = null, string folder = "translucent_media")
        {
            try
            {
                string timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                string formattedBase64 = base64Image.StartsWith("data:", StringComparison.OrdinalIgnoreCase) 
                    ? base64Image 
                    : $"data:image/png;base64,{base64Image}";

                var signParams = new Dictionary<string, string>
                {
                    { "folder", folder },
                    { "timestamp", timestamp }
                };

                if (!string.IsNullOrEmpty(publicId))
                {
                    signParams["public_id"] = publicId;
                }

                string signature = GenerateSignature(signParams);

                var formFields = new Dictionary<string, string>(signParams)
                {
                    { "file", formattedBase64 },
                    { "api_key", ApiKey },
                    { "signature", signature }
                };

                string url = $"https://api.cloudinary.com/v1_1/{CloudName}/image/upload";
                using var request = new HttpRequestMessage(HttpMethod.Post, url)
                {
                    Content = new FormUrlEncodedContent(formFields)
                };

                var response = await _httpClient.SendAsync(request);
                string responseBody = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    if (doc.RootElement.TryGetProperty("secure_url", out var su))
                    {
                        return (true, su.GetString(), null);
                    }
                    return (true, null, null);
                }

                return (false, null, $"Image upload failed: {response.StatusCode} - {responseBody}");
            }
            catch (Exception ex)
            {
                return (false, null, ex.Message);
            }
        }

        /// <summary>
        /// Uploads any file (document, pdf, code, audio, image) to Cloudinary.
        /// </summary>
        public async Task<(bool Success, string? SecureUrl, string FileName, long FileSize, bool IsImage, string? Error)> UploadFileAsync(string filePath, string folder = "translucent_files")
        {
            try
            {
                if (!File.Exists(filePath))
                {
                    return (false, null, Path.GetFileName(filePath), 0, false, "File does not exist");
                }

                var fileInfo = new FileInfo(filePath);
                string fileName = fileInfo.Name;
                long fileSize = fileInfo.Length;
                string ext = fileInfo.Extension.ToLowerInvariant();

                bool isImage = ext is ".png" or ".jpg" or ".jpeg" or ".webp" or ".gif" or ".bmp";
                byte[] fileBytes = await File.ReadAllBytesAsync(filePath);

                if (isImage)
                {
                    string b64 = Convert.ToBase64String(fileBytes);
                    var imgResult = await UploadImageAsync(b64, null, folder);
                    return (imgResult.Success, imgResult.SecureUrl, fileName, fileSize, true, imgResult.Error);
                }
                else
                {
                    string timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
                    string b64 = $"data:application/octet-stream;base64,{Convert.ToBase64String(fileBytes)}";

                    var signParams = new Dictionary<string, string>
                    {
                        { "folder", folder },
                        { "timestamp", timestamp }
                    };

                    string signature = GenerateSignature(signParams);

                    var formFields = new Dictionary<string, string>(signParams)
                    {
                        { "file", b64 },
                        { "api_key", ApiKey },
                        { "signature", signature }
                    };

                    string url = $"https://api.cloudinary.com/v1_1/{CloudName}/raw/upload";
                    using var request = new HttpRequestMessage(HttpMethod.Post, url)
                    {
                        Content = new FormUrlEncodedContent(formFields)
                    };

                    var response = await _httpClient.SendAsync(request);
                    string responseBody = await response.Content.ReadAsStringAsync();

                    if (response.IsSuccessStatusCode)
                    {
                        using var doc = JsonDocument.Parse(responseBody);
                        if (doc.RootElement.TryGetProperty("secure_url", out var su))
                        {
                            return (true, su.GetString(), fileName, fileSize, false, null);
                        }
                    }

                    return (false, null, fileName, fileSize, false, $"File upload failed: {response.StatusCode} - {responseBody}");
                }
            }
            catch (Exception ex)
            {
                return (false, null, Path.GetFileName(filePath), 0, false, ex.Message);
            }
        }
    }
}
