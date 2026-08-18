using System;
using System.IO;
using System.Text.Json;

namespace InvisibleChat
{
    public class AppConfig
    {
        public string ApiKey { get; set; } = string.Empty;
        public string ApiUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
        public string ModelName { get; set; } = "gemini-3.7-flash";
        public string SystemPrompt { get; set; } = "You are a helpful, concise AI assistant. Respond clearly and briefly.";
        public bool Topmost { get; set; } = true;
        public double WindowOpacity { get; set; } = 0.92;
    }

    public static class ConfigManager
    {
        private static readonly string FolderPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "InvisibleChat"
        );
        private static readonly string FilePath = Path.Combine(FolderPath, "config.json");

        public static AppConfig Load()
        {
            try
            {
                if (File.Exists(FilePath))
                {
                    string json = File.ReadAllText(FilePath);
                    var config = JsonSerializer.Deserialize<AppConfig>(json);
                    if (config != null)
                    {
                        return config;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load config: {ex.Message}");
            }
            return new AppConfig();
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
