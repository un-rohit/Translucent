using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

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
            "Translucent"
        );
        private static readonly string LegacyFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), 
            "InvisibleChat", "history.json"
        );
        private static readonly string FilePath = Path.Combine(FolderPath, "history.json");

        private static System.Threading.Timer? _cloudSyncDebounceTimer;
        private static readonly SemaphoreSlim _syncLock = new(1, 1);
        private static bool _isSyncing = false;

        public static event Action<List<ConversationSession>>? HistoryUpdatedFromCloud;
        public static event Action<string>? CloudSyncStatusChanged;

        static ChatHistoryManager()
        {
            // When user signs in or out, automatically sync history with Cloudinary
            try
            {
                AuthManager.Instance.AuthStateChanged += () =>
                {
                    _ = Task.Run(async () =>
                    {
                        await Task.Delay(1000);
                        await SyncFromCloudAsync();
                    });
                };
            }
            catch {}
        }

        public static string GetCloudUserKey()
        {
            try
            {
                var auth = AuthManager.Instance;
                if (!string.IsNullOrEmpty(auth.UserEmail))
                {
                    string safeEmail = auth.UserEmail.Trim().ToLowerInvariant()
                        .Replace("@", "_at_")
                        .Replace(".", "_")
                        .Replace("+", "_");
                    return $"translucent_history_{safeEmail}";
                }

                string devId = auth.DeviceId;
                if (!string.IsNullOrEmpty(devId))
                {
                    return $"translucent_history_dev_{devId}";
                }
            }
            catch {}

            return "translucent_history_default";
        }

        /// <summary>
        /// Reads local history immediately from disk (temporary device cache).
        /// </summary>
        public static List<ConversationSession> LoadHistory()
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
                    var history = JsonSerializer.Deserialize<List<ConversationSession>>(json);
                    if (history != null)
                    {
                        return history;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load local chat history: {ex.Message}");
            }
            return new List<ConversationSession>();
        }

        /// <summary>
        /// Saves chat history to local device cache immediately, then debounces background upload to Cloudinary.
        /// </summary>
        public static void SaveHistory(List<ConversationSession> history)
        {
            try
            {
                // 1. Immediate local cache write (Temporary on device)
                if (!Directory.Exists(FolderPath))
                {
                    Directory.CreateDirectory(FolderPath);
                }
                string json = JsonSerializer.Serialize(history, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(FilePath, json);

                // 2. Debounce cloud upload to Cloudinary (Permanent in Cloud)
                _cloudSyncDebounceTimer?.Dispose();
                _cloudSyncDebounceTimer = new System.Threading.Timer(async _ =>
                {
                    await UploadHistoryToCloudAsync(history);
                }, null, 1500, Timeout.Infinite);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to save chat history: {ex.Message}");
            }
        }

        /// <summary>
        /// Asynchronously uploads history and any pending media/files to Cloudinary.
        /// </summary>
        public static async Task UploadHistoryToCloudAsync(List<ConversationSession> history)
        {
            if (_isSyncing) return;

            await _syncLock.WaitAsync();
            try
            {
                _isSyncing = true;
                CloudSyncStatusChanged?.Invoke("⏳ Syncing...");

                var cloudinary = CloudinaryService.Instance;

                // 1. Check and upload any pending local images to Cloudinary
                bool updatedImages = false;
                foreach (var session in history)
                {
                    foreach (var msg in session.Messages)
                    {
                        if (string.IsNullOrEmpty(msg.ImageUrl) && !string.IsNullOrEmpty(msg.ImageBase64))
                        {
                            var uploadResult = await cloudinary.UploadImageAsync(msg.ImageBase64, null, "translucent_media");
                            if (uploadResult.Success && !string.IsNullOrEmpty(uploadResult.SecureUrl))
                            {
                                msg.ImageUrl = uploadResult.SecureUrl;
                                updatedImages = true;
                            }
                        }
                    }
                }

                // If images were uploaded and URLs assigned, re-save local cache with the new URLs
                if (updatedImages)
                {
                    try
                    {
                        string updatedJson = JsonSerializer.Serialize(history, new JsonSerializerOptions { WriteIndented = true });
                        File.WriteAllText(FilePath, updatedJson);
                    }
                    catch {}
                }

                // 2. Upload complete history JSON to Cloudinary
                string historyJson = JsonSerializer.Serialize(history, new JsonSerializerOptions { WriteIndented = false });
                string publicId = GetCloudUserKey();

                var (success, secureUrl, error) = await cloudinary.UploadRawAsync(historyJson, publicId, overwrite: true);
                if (success)
                {
                    System.Diagnostics.Debug.WriteLine($"[Cloudinary] History successfully synced to cloud: {secureUrl}");
                    CloudSyncStatusChanged?.Invoke("☁️ Cloud Synced");
                }
                else
                {
                    System.Diagnostics.Debug.WriteLine($"[Cloudinary] Cloud sync error: {error}");
                    CloudSyncStatusChanged?.Invoke("⚠️ Cloud Sync Pending");
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"[Cloudinary] Exception during cloud sync: {ex.Message}");
                CloudSyncStatusChanged?.Invoke("⚠️ Cloud Sync Error");
            }
            finally
            {
                _isSyncing = false;
                _syncLock.Release();
            }
        }

        /// <summary>
        /// Downloads chat history from Cloudinary and merges it with local device history.
        /// </summary>
        public static async Task<List<ConversationSession>> SyncFromCloudAsync()
        {
            await _syncLock.WaitAsync();
            try
            {
                CloudSyncStatusChanged?.Invoke("⏳ Checking Cloudinary...");
                string publicId = GetCloudUserKey();
                var (success, content, error) = await CloudinaryService.Instance.DownloadRawAsync(publicId);

                if (!success || string.IsNullOrWhiteSpace(content))
                {
                    CloudSyncStatusChanged?.Invoke("☁️ Cloud Ready");
                    return LoadHistory();
                }

                var cloudSessions = JsonSerializer.Deserialize<List<ConversationSession>>(content);
                if (cloudSessions == null || cloudSessions.Count == 0)
                {
                    CloudSyncStatusChanged?.Invoke("☁️ Cloud Ready");
                    return LoadHistory();
                }

                // Merge cloud sessions with local sessions
                var localSessions = LoadHistory();
                var mergedDict = new Dictionary<string, ConversationSession>();

                foreach (var s in cloudSessions)
                {
                    mergedDict[s.Id] = s;
                }

                foreach (var s in localSessions)
                {
                    if (!mergedDict.TryGetValue(s.Id, out var existingCloudSession))
                    {
                        mergedDict[s.Id] = s;
                    }
                    else
                    {
                        // Keep the session with newer update or more messages
                        if (s.LastUpdated > existingCloudSession.LastUpdated || s.Messages.Count > existingCloudSession.Messages.Count)
                        {
                            mergedDict[s.Id] = s;
                        }
                    }
                }

                var mergedList = mergedDict.Values.OrderByDescending(s => s.LastUpdated).ToList();

                // Save merged list locally
                if (!Directory.Exists(FolderPath)) Directory.CreateDirectory(FolderPath);
                string json = JsonSerializer.Serialize(mergedList, new JsonSerializerOptions { WriteIndented = true });
                File.WriteAllText(FilePath, json);

                CloudSyncStatusChanged?.Invoke("☁️ Cloud Synced");
                HistoryUpdatedFromCloud?.Invoke(mergedList);

                return mergedList;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to sync from cloud: {ex.Message}");
                CloudSyncStatusChanged?.Invoke("⚠️ Cloud Offline");
                return LoadHistory();
            }
            finally
            {
                _syncLock.Release();
            }
        }
    }
}
