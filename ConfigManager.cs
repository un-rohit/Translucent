using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace InvisibleChat
{
    public class AppConfig
    {
        public string AiProvider { get; set; } = "Google Gemini";
        public string ApiKey { get; set; } = string.Empty;
        public string GeminiApiKey { get; set; } = string.Empty;
        public string GroqApiKey { get; set; } = string.Empty;
        public string OpenAiApiKey { get; set; } = string.Empty;
        public string DeepSeekApiKey { get; set; } = string.Empty;
        public string OpenRouterApiKey { get; set; } = string.Empty;
        public string CustomApiKey { get; set; } = string.Empty;

        public string ApiUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
        public string ModelName { get; set; } = "gemini-3.8-flash";
        public string SystemPrompt { get; set; } = "You are a concise, sharp stealth assistant. Provide direct answers, solutions, and code without unnecessary fluff.";
        public bool Topmost { get; set; } = true;
        public double WindowOpacity { get; set; } = 0.92;

        public string GetCurrentApiKey()
        {
            if (AiProvider.Contains("Groq", StringComparison.OrdinalIgnoreCase))
                return !string.IsNullOrWhiteSpace(GroqApiKey) ? GroqApiKey : ApiKey;
            if (AiProvider.Contains("OpenAI", StringComparison.OrdinalIgnoreCase))
                return !string.IsNullOrWhiteSpace(OpenAiApiKey) ? OpenAiApiKey : ApiKey;
            if (AiProvider.Contains("DeepSeek", StringComparison.OrdinalIgnoreCase))
                return !string.IsNullOrWhiteSpace(DeepSeekApiKey) ? DeepSeekApiKey : ApiKey;
            if (AiProvider.Contains("OpenRouter", StringComparison.OrdinalIgnoreCase))
                return !string.IsNullOrWhiteSpace(OpenRouterApiKey) ? OpenRouterApiKey : ApiKey;
            if (AiProvider.Contains("Custom", StringComparison.OrdinalIgnoreCase) || AiProvider.Contains("Local", StringComparison.OrdinalIgnoreCase))
                return !string.IsNullOrWhiteSpace(CustomApiKey) ? CustomApiKey : ApiKey;

            return !string.IsNullOrWhiteSpace(GeminiApiKey) ? GeminiApiKey : ApiKey;
        }

        public void SetCurrentApiKey(string key)
        {
            ApiKey = key;
            if (AiProvider.Contains("Groq", StringComparison.OrdinalIgnoreCase))
                GroqApiKey = key;
            else if (AiProvider.Contains("OpenAI", StringComparison.OrdinalIgnoreCase))
                OpenAiApiKey = key;
            else if (AiProvider.Contains("DeepSeek", StringComparison.OrdinalIgnoreCase))
                DeepSeekApiKey = key;
            else if (AiProvider.Contains("OpenRouter", StringComparison.OrdinalIgnoreCase))
                OpenRouterApiKey = key;
            else if (AiProvider.Contains("Custom", StringComparison.OrdinalIgnoreCase) || AiProvider.Contains("Local", StringComparison.OrdinalIgnoreCase))
                CustomApiKey = key;
            else
                GeminiApiKey = key;
        }
        
        // Session & Layout Properties
        public List<string> OpenTabsUrls { get; set; } = new();
        public int SelectedTabIndex { get; set; } = -1;
        public bool IsChatTabActive { get; set; } = true;
        public bool IsSplitView { get; set; } = false;

        // Co-pilot & Audio Settings
        public bool AutoCopilot { get; set; } = false;
        public bool AudioSourceMic { get; set; } = false; // false = Loopback/Speakers, true = Microphone

        // Licensing & Authentication
        public string AuthToken { get; set; } = string.Empty;
        public string UserEmail { get; set; } = string.Empty;
        public string UserName { get; set; } = string.Empty;
        public string UserAvatarUrl { get; set; } = string.Empty;
        public string AuthServerUrl { get; set; } = "https://translucent-livid.vercel.app";
        public bool IsSubscribedCached { get; set; } = false;
        public string SubscriptionStatus { get; set; } = "pending";
        public string DeviceId { get; set; } = string.Empty;

        // Cloud Storage & Sync (Cloudinary)
        public string CloudinaryCloudName { get; set; } = "frx537fs";
        public string CloudinaryApiKey { get; set; } = "949461777111196";
        public string CloudinaryApiSecret { get; set; } = "XOglkgYa9agxDfT4MTdL1nITQk0";
        public bool EnableCloudSync { get; set; } = true;
        public DateTime? LastCloudSyncTime { get; set; }
    }

    public static class ConfigManager
    {
        private static readonly string FolderPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "Translucent"
        );
        private static readonly string LegacyFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "InvisibleChat", "config.json"
        );
        private static readonly string FilePath = Path.Combine(FolderPath, "config.json");

        public static AppConfig Load()
        {
            try
            {
                if (!File.Exists(FilePath) && File.Exists(LegacyFilePath))
                {
                    try
                    {
                        if (!Directory.Exists(FolderPath)) Directory.CreateDirectory(FolderPath);
                        File.Copy(LegacyFilePath, FilePath, true);
                    }
                    catch { }
                }

                if (File.Exists(FilePath))
                {
                    string json = File.ReadAllText(FilePath);
                    var config = JsonSerializer.Deserialize<AppConfig>(json);
                    if (config != null)
                    {
                        bool needsSave = false;
                        if (string.IsNullOrEmpty(config.DeviceId))
                        {
                            config.DeviceId = GenerateDeviceId();
                            needsSave = true;
                        }
                        if (string.IsNullOrWhiteSpace(config.ModelName) ||
                            config.ModelName.Equals("gemini-2.0-flash", StringComparison.OrdinalIgnoreCase) ||
                            config.ModelName.Equals("gemini-1.5-flash", StringComparison.OrdinalIgnoreCase))
                        {
                            config.ModelName = "gemini-3.8-flash";
                            needsSave = true;
                        }
                        if (!string.IsNullOrEmpty(config.ApiKey) && string.IsNullOrEmpty(config.GeminiApiKey))
                        {
                            config.GeminiApiKey = config.ApiKey;
                            needsSave = true;
                        }
                        if (string.IsNullOrWhiteSpace(config.AiProvider))
                        {
                            config.AiProvider = "Google Gemini";
                            needsSave = true;
                        }
                        if (needsSave)
                        {
                            Save(config);
                        }
                        return config;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load config: {ex.Message}");
            }
            var def = new AppConfig();
            def.DeviceId = GenerateDeviceId();
            Save(def);
            return def;
        }

        private static string GenerateDeviceId()
        {
            try
            {
                string raw = $"{Environment.MachineName}_{Environment.UserName}_{Guid.NewGuid():N}";
                using var sha = System.Security.Cryptography.SHA256.Create();
                byte[] hash = sha.ComputeHash(System.Text.Encoding.UTF8.GetBytes(raw));
                return Convert.ToHexString(hash)[..16].ToLower();
            }
            catch
            {
                return Guid.NewGuid().ToString("N")[..16].ToLower();
            }
        }

        public static void Save(AppConfig config)
        {
            try
            {
                if (!Directory.Exists(FolderPath))
                {
                    Directory.CreateDirectory(FolderPath);
                }
                string json = JsonSerializer.Serialize(config, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(FilePath, json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to save config: {ex.Message}");
            }
        }
    }
}
