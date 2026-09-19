using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace InvisibleChat
{
    public class AppConfig
    {
        public string ApiKey { get; set; } = string.Empty;
        public string ApiUrl { get; set; } = "https://generativelanguage.googleapis.com/v1beta";
        public string ModelName { get; set; } = "gemini-2.0-flash";
        public string SystemPrompt { get; set; } = "You are a concise, sharp stealth assistant. Provide direct answers, solutions, and code without unnecessary fluff.";
        public bool Topmost { get; set; } = true;
        public double WindowOpacity { get; set; } = 0.92;
        
        // Session & Layout Properties
        public List<string> OpenTabsUrls { get; set; } = new();
        public int SelectedTabIndex { get; set; } = -1;
        public bool IsChatTabActive { get; set; } = true;
        public bool IsSplitView { get; set; } = false;

        // Co-pilot & Audio Settings
        public bool AutoCopilot { get; set; } = false;
        public bool AudioSourceMic { get; set; } = false; // false = Loopback/Speakers, true = Microphone
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
