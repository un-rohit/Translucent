using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;

namespace InvisibleChat
{
    public class ConversationSession
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public string Title { get; set; } = "New Conversation";
        public List<ChatMessage> Messages { get; set; } = new List<ChatMessage>();
        public DateTime LastUpdated { get; set; } = DateTime.Now;
    }

    public static class ChatHistoryManager
    {
        private static readonly string FolderPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "InvisibleChat"
        );
        private static readonly string FilePath = Path.Combine(FolderPath, "history.json");

        public static List<ConversationSession> LoadHistory()
        {
            try
            {
                if (File.Exists(FilePath))
                {
                    string json = File.ReadAllText(FilePath);
                    var history = JsonSerializer.Deserialize<List<ConversationSession>>(json);
                    if (history != null)
                    {
                        return history;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load chat history: {ex.Message}");
            }
            return new List<ConversationSession>();
        }

        public static void SaveHistory(List<ConversationSession> history)
        {
            try
            {
                if (!Directory.Exists(FolderPath))
                {
                    Directory.CreateDirectory(FolderPath);
                }
                string json = JsonSerializer.Serialize(history, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(FilePath, json);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to save chat history: {ex.Message}");
            }
        }
    }
}
