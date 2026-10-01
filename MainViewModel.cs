using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;
using System.Windows.Input;

namespace InvisibleChat
{
    public class ViewModelBase : INotifyPropertyChanged
    {
        public event PropertyChangedEventHandler? PropertyChanged;

        protected virtual void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }

        protected bool SetField<T>(ref T field, T value, [CallerMemberName] string? propertyName = null)
        {
            if (EqualityComparer<T>.Default.Equals(field, value)) return false;
            field = value;
            OnPropertyChanged(propertyName);
            return true;
        }
    }

    public class RelayCommand : ICommand
    {
        private readonly Action<object?> _execute;
        private readonly Func<object?, bool>? _canExecute;

        public RelayCommand(Action<object?> execute, Func<object?, bool>? canExecute = null)
        {
            _execute = execute ?? throw new ArgumentNullException(nameof(execute));
            _canExecute = canExecute;
        }

        public bool CanExecute(object? parameter) => _canExecute == null || _canExecute(parameter);

        public void Execute(object? parameter) => _execute(parameter);

        public event EventHandler? CanExecuteChanged
        {
            add => CommandManager.RequerySuggested += value;
            remove => CommandManager.RequerySuggested -= value;
        }
    }

    public class MainViewModel : ViewModelBase
    {
        private readonly ChatService _chatService;
        private AppConfig _config;

        private ObservableCollection<ConversationSession> _sessions = new();
        private ConversationSession? _selectedSession;
        private ObservableCollection<ChatMessage> _currentMessages = new();
        
        private string _inputText = string.Empty;
        private bool _isSending;
        private bool _isSidebarVisible = true;
        private bool _isSettingsOpen;
        
        // Live Captions Fields
        private bool _isCaptionsSidebarVisible;
        private bool _isCaptionsListening;
        private ObservableCollection<CaptionItem> _captions = new();

        // Advanced Stealth & Multimodal Fields
        private bool _isSplitView;
        private bool _isGhostMode;
        private bool _autoCopilot;
        private bool _audioSourceMic;

        // Cloudinary Sync Field
        private string _cloudSyncStatus = "☁️ Cloud Ready";

        // Settings Properties (bound to Settings UI)
        private string _aiProvider = "Google Gemini";
        private string _apiKey = string.Empty;
        private string _apiKeyLabel = "Gemini API Key (Google AI Studio)";
        private string _apiKeyPlaceholder = "AIzaSy...";
        private string _apiKeyHelperUrl = "https://aistudio.google.com/apikey";
        private ObservableCollection<string> _suggestedModels = new();
        private string _apiUrl = string.Empty;
        private string _modelName = string.Empty;
        private string _systemPrompt = string.Empty;
        private double _windowOpacity = 0.92;
        private bool _topmost = true;

        // Events for Window interaction
        public event Action? RequestSnipScreen;
        public event Action<bool>? GhostModeChanged;
        public event Action<bool>? SplitViewChanged;
        public event Action? RequestSwitchToChat;

        public AppConfig Config => _config;

        public string CloudSyncStatus
        {
            get => _cloudSyncStatus;
            set
            {
                if (_cloudSyncStatus != value)
                {
                    _cloudSyncStatus = value;
                    OnPropertyChanged();
                }
            }
        }

        public MainViewModel()
        {
            _chatService = new ChatService();
            _config = ConfigManager.Load();

            LoadConfigToFields();

            try
            {
                var savedSessions = ChatHistoryManager.LoadHistory();
                foreach (var session in savedSessions.OrderByDescending(s => s.LastUpdated))
                {
                    _sessions.Add(session);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Failed to load history on init: {ex.Message}");
            }

            if (_sessions.Count == 0)
            {
                CreateNewSession();
            }
            else
            {
                SelectedSession = _sessions.First();
            }

            // Cloudinary Cloud Sync subscriptions
            ChatHistoryManager.HistoryUpdatedFromCloud += updatedSessions =>
            {
                System.Windows.Application.Current?.Dispatcher?.Invoke(() =>
                {
                    var currentSelectedId = SelectedSession?.Id;
                    _sessions.Clear();
                    foreach (var s in updatedSessions)
                    {
                        _sessions.Add(s);
                    }
                    if (!string.IsNullOrEmpty(currentSelectedId))
                    {
                        SelectedSession = _sessions.FirstOrDefault(s => s.Id == currentSelectedId) ?? _sessions.FirstOrDefault();
                    }
                    else if (_sessions.Count > 0)
                    {
                        SelectedSession = _sessions.First();
                    }
                });
            };

            ChatHistoryManager.CloudSyncStatusChanged += status =>
            {
                System.Windows.Application.Current?.Dispatcher?.Invoke(() =>
                {
                    CloudSyncStatus = status;
                });
            };

            // Trigger background cloud sync check on startup
            _ = Task.Run(async () =>
            {
                await Task.Delay(1500);
                await ChatHistoryManager.SyncFromCloudAsync();
            });

            // Commands
            SendMessageCommand = new RelayCommand(async _ => await SendMessageAsync(), _ => CanSendMessage());
            NewSessionCommand = new RelayCommand(_ => CreateNewSession());
            DeleteSessionCommand = new RelayCommand(param => DeleteSession(param as ConversationSession));
            ToggleSidebarCommand = new RelayCommand(_ => IsSidebarVisible = !IsSidebarVisible);
            ToggleSettingsCommand = new RelayCommand(_ => ToggleSettings());
            SaveSettingsCommand = new RelayCommand(_ => SaveSettings());
            ClearHistoryCommand = new RelayCommand(_ => ClearCurrentHistory());
            ManualCloudSyncCommand = new RelayCommand(async _ => await ChatHistoryManager.SyncFromCloudAsync());
            
            // Captions & Co-pilot Commands
            ToggleCaptionsSidebarCommand = new RelayCommand(_ => IsCaptionsSidebarVisible = !IsCaptionsSidebarVisible);
            ClearCaptionsCommand = new RelayCommand(_ => Captions.Clear());
            AskAiFromCaptionCommand = new RelayCommand(async param => await HandleAskAiFromCaptionAsync(param as string));

            // Productivity & Stealth Commands
            SnipScreenCommand = new RelayCommand(_ => RequestSnipScreen?.Invoke());
            ToggleSplitViewCommand = new RelayCommand(_ => IsSplitView = !IsSplitView);
            ToggleGhostModeCommand = new RelayCommand(_ => IsGhostMode = !IsGhostMode);
            SelectSuggestedModelCommand = new RelayCommand(param =>
            {
                if (param is string model)
                {
                    ModelName = model;
                }
            });
        }

        // Properties
        public ObservableCollection<ConversationSession> Sessions
        {
            get => _sessions;
            set => SetField(ref _sessions, value);
        }

        public ConversationSession? SelectedSession
        {
            get => _selectedSession;
            set
            {
                if (SetField(ref _selectedSession, value))
                {
                    LoadSessionMessages();
                    OnPropertyChanged(nameof(CurrentMessages));
                }
            }
        }

        public ObservableCollection<ChatMessage> CurrentMessages
        {
            get => _currentMessages;
            set => SetField(ref _currentMessages, value);
        }

        public string InputText
        {
            get => _inputText;
            set => SetField(ref _inputText, value);
        }

        public bool IsSending
        {
            get => _isSending;
            set
            {
                if (SetField(ref _isSending, value))
                {
                    CommandManager.InvalidateRequerySuggested();
                }
            }
        }

        public bool IsSidebarVisible
        {
            get => _isSidebarVisible;
            set => SetField(ref _isSidebarVisible, value);
        }

        public bool IsSettingsOpen
        {
            get => _isSettingsOpen;
            set => SetField(ref _isSettingsOpen, value);
        }

        public bool IsCaptionsSidebarVisible
        {
            get => _isCaptionsSidebarVisible;
            set => SetField(ref _isCaptionsSidebarVisible, value);
        }

        public bool IsCaptionsListening
        {
            get => _isCaptionsListening;
            set => SetField(ref _isCaptionsListening, value);
        }

        public ObservableCollection<CaptionItem> Captions
        {
            get => _captions;
            set => SetField(ref _captions, value);
        }

        public bool IsSplitView
        {
            get => _isSplitView;
            set
            {
                if (SetField(ref _isSplitView, value))
                {
                    _config.IsSplitView = value;
                    ConfigManager.Save(_config);
                    SplitViewChanged?.Invoke(value);
                }
            }
        }

        public bool IsGhostMode
        {
            get => _isGhostMode;
            set
            {
                if (SetField(ref _isGhostMode, value))
                {
                    GhostModeChanged?.Invoke(value);
                }
            }
        }

        public bool AutoCopilot
        {
            get => _autoCopilot;
            set
            {
                if (SetField(ref _autoCopilot, value))
                {
                    _config.AutoCopilot = value;
                    ConfigManager.Save(_config);
                }
            }
        }

        public bool AudioSourceMic
        {
            get => _audioSourceMic;
            set
            {
                if (SetField(ref _audioSourceMic, value))
                {
                    _config.AudioSourceMic = value;
                    ConfigManager.Save(_config);
                }
            }
        }

        // Settings bindings
        public List<string> AvailableProviders { get; } = new()
        {
            "Google Gemini",
            "Groq (Free & Ultra Fast)",
            "OpenAI (GPT-4o)",
            "DeepSeek",
            "OpenRouter (All-in-One)",
            "Custom / Local (Ollama)"
        };

        public string AiProvider
        {
            get => _aiProvider;
            set
            {
                if (SetField(ref _aiProvider, value))
                {
                    OnProviderChanged(value);
                }
            }
        }

        public string ApiKeyLabel
        {
            get => _apiKeyLabel;
            set => SetField(ref _apiKeyLabel, value);
        }

        public string ApiKeyPlaceholder
        {
            get => _apiKeyPlaceholder;
            set => SetField(ref _apiKeyPlaceholder, value);
        }

        public string ApiKeyHelperUrl
        {
            get => _apiKeyHelperUrl;
            set => SetField(ref _apiKeyHelperUrl, value);
        }

        public ObservableCollection<string> SuggestedModels
        {
            get => _suggestedModels;
            set => SetField(ref _suggestedModels, value);
        }

        public string ApiKey
        {
            get => _apiKey;
            set => SetField(ref _apiKey, value);
        }

        public string ApiUrl
        {
            get => _apiUrl;
            set => SetField(ref _apiUrl, value);
        }

        public string ModelName
        {
            get => _modelName;
            set => SetField(ref _modelName, value);
        }

        public string SystemPrompt
        {
            get => _systemPrompt;
            set => SetField(ref _systemPrompt, value);
        }

        public double WindowOpacity
        {
            get => _windowOpacity;
            set
            {
                if (value >= 0.1 && value <= 1.0)
                {
                    SetField(ref _windowOpacity, value);
                }
            }
        }

        public bool Topmost
        {
            get => _topmost;
            set => SetField(ref _topmost, value);
        }

        // Commands
        public ICommand SendMessageCommand { get; }
        public ICommand NewSessionCommand { get; }
        public ICommand DeleteSessionCommand { get; }
        public ICommand ToggleSidebarCommand { get; }
        public ICommand ToggleSettingsCommand { get; }
        public ICommand SaveSettingsCommand { get; }
        public ICommand ClearHistoryCommand { get; }
        public ICommand ManualCloudSyncCommand { get; }
        public ICommand ToggleCaptionsSidebarCommand { get; }
        public ICommand ClearCaptionsCommand { get; }
        public ICommand AskAiFromCaptionCommand { get; }
        public ICommand SnipScreenCommand { get; }
        public ICommand ToggleSplitViewCommand { get; }
        public ICommand ToggleGhostModeCommand { get; }
        public ICommand SelectSuggestedModelCommand { get; }

        private void OnProviderChanged(string newProvider)
        {
            // Save the current typed key to the previous provider slot
            _config.SetCurrentApiKey(ApiKey);
            _config.AiProvider = newProvider;

            // Load the newly selected provider's key
            ApiKey = _config.GetCurrentApiKey();

            RefreshProviderMetadata(newProvider, updateDefaults: true);
        }

        private void RefreshProviderMetadata(string provider, bool updateDefaults)
        {
            if (provider.Contains("Groq", StringComparison.OrdinalIgnoreCase))
            {
                ApiKeyLabel = "Groq API Key (Free & Ultra Fast)";
                ApiKeyPlaceholder = "gsk_...";
                ApiKeyHelperUrl = "https://console.groq.com/keys";
                SuggestedModels = new ObservableCollection<string> { "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768" };
                if (updateDefaults)
                {
                    ModelName = "llama-3.3-70b-versatile";
                    ApiUrl = "https://api.groq.com/openai/v1";
                }
            }
            else if (provider.Contains("OpenAI", StringComparison.OrdinalIgnoreCase))
            {
                ApiKeyLabel = "OpenAI API Key";
                ApiKeyPlaceholder = "sk-proj-...";
                ApiKeyHelperUrl = "https://platform.openai.com/api-keys";
                SuggestedModels = new ObservableCollection<string> { "gpt-4o", "gpt-4o-mini", "o3-mini" };
                if (updateDefaults)
                {
                    ModelName = "gpt-4o";
                    ApiUrl = "https://api.openai.com/v1";
                }
            }
            else if (provider.Contains("DeepSeek", StringComparison.OrdinalIgnoreCase))
            {
                ApiKeyLabel = "DeepSeek API Key";
                ApiKeyPlaceholder = "sk-...";
                ApiKeyHelperUrl = "https://platform.deepseek.com";
                SuggestedModels = new ObservableCollection<string> { "deepseek-chat", "deepseek-reasoner" };
                if (updateDefaults)
                {
                    ModelName = "deepseek-chat";
                    ApiUrl = "https://api.deepseek.com/v1";
                }
            }
            else if (provider.Contains("OpenRouter", StringComparison.OrdinalIgnoreCase))
            {
                ApiKeyLabel = "OpenRouter API Key (Any Model)";
                ApiKeyPlaceholder = "sk-or-v1-...";
                ApiKeyHelperUrl = "https://openrouter.ai/keys";
                SuggestedModels = new ObservableCollection<string> { "meta-llama/llama-3.3-70b-instruct", "deepseek/deepseek-chat", "anthropic/claude-3.5-sonnet" };
                if (updateDefaults)
                {
                    ModelName = "meta-llama/llama-3.3-70b-instruct";
                    ApiUrl = "https://openrouter.ai/api/v1";
                }
            }
            else if (provider.Contains("Custom", StringComparison.OrdinalIgnoreCase) || provider.Contains("Local", StringComparison.OrdinalIgnoreCase))
            {
                ApiKeyLabel = "Custom / Ollama Key (Optional)";
                ApiKeyPlaceholder = "Leave empty for Ollama...";
                ApiKeyHelperUrl = "http://localhost:11434";
                SuggestedModels = new ObservableCollection<string> { "llama3", "mistral", "deepseek-r1" };
                if (updateDefaults)
                {
                    ModelName = "llama3";
                    ApiUrl = "http://localhost:11434/v1";
                }
            }
            else // Default: Google Gemini
            {
                ApiKeyLabel = "Gemini API Key (Google AI Studio)";
                ApiKeyPlaceholder = "AIzaSy...";
                ApiKeyHelperUrl = "https://aistudio.google.com/apikey";
                SuggestedModels = new ObservableCollection<string> { "gemini-3.8-flash", "gemini-2.5-flash", "gemini-3.5-flash-lite" };
                if (updateDefaults)
                {
                    ModelName = "gemini-3.8-flash";
                    ApiUrl = "https://generativelanguage.googleapis.com/v1beta";
                }
            }
        }

        private void LoadConfigToFields()
        {
            _aiProvider = _config.AiProvider;
            OnPropertyChanged(nameof(AiProvider));
            ApiKey = _config.GetCurrentApiKey();
            ApiUrl = _config.ApiUrl;
            ModelName = _config.ModelName;
            SystemPrompt = _config.SystemPrompt;
            WindowOpacity = _config.WindowOpacity;
            Topmost = _config.Topmost;
            _isSplitView = _config.IsSplitView;
            _autoCopilot = _config.AutoCopilot;
            _audioSourceMic = _config.AudioSourceMic;
            RefreshProviderMetadata(_aiProvider, updateDefaults: false);
        }

        private void LoadSessionMessages()
        {
            CurrentMessages.Clear();
            if (SelectedSession != null)
            {
                foreach (var msg in SelectedSession.Messages)
                {
                    CurrentMessages.Add(msg);
                }
            }
        }

        private bool CanSendMessage()
        {
            return !string.IsNullOrWhiteSpace(InputText) && !IsSending && SelectedSession != null;
        }

        private async Task SendMessageAsync()
        {
            if (SelectedSession == null || string.IsNullOrWhiteSpace(InputText)) return;

            string rawInput = InputText.Trim();
            InputText = string.Empty;
            IsSending = true;

            // Add user message
            var userMsg = new ChatMessage { Content = rawInput, IsUser = true, Timestamp = DateTime.Now };
            CurrentMessages.Add(userMsg);
            SelectedSession.Messages.Add(userMsg);

            // Update title if default
            if (SelectedSession.Title == "New Conversation" && SelectedSession.Messages.Count == 1)
            {
                string title = rawInput.Length > 25 ? rawInput.Substring(0, 22) + "..." : rawInput;
                SelectedSession.Title = title;
                var tempIndex = Sessions.IndexOf(SelectedSession);
                if (tempIndex >= 0)
                {
                    Sessions[tempIndex] = SelectedSession;
                    SelectedSession = Sessions[tempIndex];
                }
            }

            SelectedSession.LastUpdated = DateTime.Now;
            SaveHistory();

            // Create streaming AI message
            var aiMsg = new ChatMessage { Content = string.Empty, IsUser = false, Timestamp = DateTime.Now, IsStreaming = true };
            CurrentMessages.Add(aiMsg);
            SelectedSession.Messages.Add(aiMsg);

            try
            {
                var historyToSend = SelectedSession.Messages.Take(SelectedSession.Messages.Count - 1).ToList();
                await foreach (var token in _chatService.StreamMessageAsync(historyToSend, _config))
                {
                    aiMsg.Content += token;
                }
            }
            catch (Exception ex)
            {
                aiMsg.Content += $"\n⚠️ Streaming Error: {ex.Message}";
            }
            finally
            {
                aiMsg.IsStreaming = false;
                IsSending = false;
                SelectedSession.LastUpdated = DateTime.Now;
                SaveHistory();
            }
        }

        public async Task SendVisionPromptAsync(string base64Image, string prompt)
        {
            if (SelectedSession == null)
            {
                CreateNewSession();
            }

            RequestSwitchToChat?.Invoke();
            IsSending = true;

            // Add user message with image attached
            var userMsg = new ChatMessage
            {
                Content = prompt,
                ImageBase64 = base64Image,
                IsUser = true,
                Timestamp = DateTime.Now
            };
            CurrentMessages.Add(userMsg);
            SelectedSession!.Messages.Add(userMsg);

            if (SelectedSession.Title == "New Conversation")
            {
                SelectedSession.Title = "📷 Screen Analysis";
                var tempIndex = Sessions.IndexOf(SelectedSession);
                if (tempIndex >= 0) Sessions[tempIndex] = SelectedSession;
            }

            SelectedSession.LastUpdated = DateTime.Now;
            SaveHistory();

            // Create streaming AI message
            var aiMsg = new ChatMessage { Content = string.Empty, IsUser = false, Timestamp = DateTime.Now, IsStreaming = true };
            CurrentMessages.Add(aiMsg);
            SelectedSession.Messages.Add(aiMsg);

            try
            {
                var historyToSend = SelectedSession.Messages.Take(SelectedSession.Messages.Count - 1).ToList();
                await foreach (var token in _chatService.StreamMessageAsync(historyToSend, _config))
                {
                    aiMsg.Content += token;
                }
            }
            catch (Exception ex)
            {
                aiMsg.Content += $"\n⚠️ Vision Error: {ex.Message}";
            }
            finally
            {
                aiMsg.IsStreaming = false;
                IsSending = false;
                SelectedSession.LastUpdated = DateTime.Now;
                SaveHistory();

                // Background upload screenshot/vision image to Cloudinary
                _ = Task.Run(async () =>
                {
                    try
                    {
                        var uploadResult = await CloudinaryService.Instance.UploadImageAsync(base64Image, null, "translucent_media");
                        if (uploadResult.Success && !string.IsNullOrEmpty(uploadResult.SecureUrl))
                        {
                            userMsg.ImageUrl = uploadResult.SecureUrl;
                            SaveHistory();
                        }
                    }
                    catch {}
                });
            }
        }

        public async Task AttachFileAsync(string filePath)
        {
            if (string.IsNullOrEmpty(filePath) || !File.Exists(filePath)) return;

            if (SelectedSession == null)
            {
                CreateNewSession();
            }

            RequestSwitchToChat?.Invoke();
            IsSending = true;
            CloudSyncStatus = "⏳ Uploading to Cloudinary...";

            try
            {
                var result = await CloudinaryService.Instance.UploadFileAsync(filePath);
                if (result.Success && !string.IsNullOrEmpty(result.SecureUrl))
                {
                    var fileMsg = new ChatMessage
                    {
                        Content = $"📎 Attached file: {result.FileName}",
                        FileUrl = result.SecureUrl,
                        FileName = result.FileName,
                        FileSize = FormatBytes(result.FileSize),
                        IsUser = true,
                        Timestamp = DateTime.Now
                    };

                    if (result.IsImage)
                    {
                        fileMsg.ImageUrl = result.SecureUrl;
                        try
                        {
                            fileMsg.ImageBase64 = Convert.ToBase64String(await File.ReadAllBytesAsync(filePath));
                        }
                        catch {}
                    }

                    CurrentMessages.Add(fileMsg);
                    SelectedSession!.Messages.Add(fileMsg);
                    SelectedSession.LastUpdated = DateTime.Now;
                    SaveHistory();

                    // Prepare AI analysis prompt
                    string promptExtra = $"I uploaded and attached a file: {result.FileName} ({result.SecureUrl}).";
                    string ext = Path.GetExtension(filePath).ToLowerInvariant();
                    if (ext is ".txt" or ".md" or ".json" or ".csv" or ".py" or ".cs" or ".js" or ".html" or ".css" or ".xml" or ".log")
                    {
                        try
                        {
                            string textContent = await File.ReadAllTextAsync(filePath);
                            if (textContent.Length > 20000) textContent = textContent.Substring(0, 20000) + "\n...[truncated]";
                            promptExtra += $"\n\nFile Content:\n```\n{textContent}\n```\n\nPlease analyze and explain this file.";
                        }
                        catch {}
                    }
                    else if (result.IsImage)
                    {
                        promptExtra += "\nPlease analyze this attached image.";
                    }
                    else
                    {
                        promptExtra += "\nPlease confirm you received the attached file reference.";
                    }

                    var aiMsg = new ChatMessage { Content = string.Empty, IsUser = false, Timestamp = DateTime.Now, IsStreaming = true };
                    CurrentMessages.Add(aiMsg);
                    SelectedSession.Messages.Add(aiMsg);

                    var historyToSend = SelectedSession.Messages.Take(SelectedSession.Messages.Count - 1).ToList();
                    historyToSend.Add(new ChatMessage 
                    { 
                        Content = promptExtra, 
                        IsUser = true, 
                        ImageBase64 = result.IsImage ? fileMsg.ImageBase64 : null 
                    });

                    await foreach (var token in _chatService.StreamMessageAsync(historyToSend, _config))
                    {
                        aiMsg.Content += token;
                    }
                    aiMsg.IsStreaming = false;
                    SaveHistory();
                }
                else
                {
                    CurrentMessages.Add(new ChatMessage
                    {
                        Content = $"⚠️ Failed to upload file to Cloudinary: {result.Error}",
                        IsUser = false,
                        Timestamp = DateTime.Now
                    });
                }
            }
            catch (Exception ex)
            {
                CurrentMessages.Add(new ChatMessage
                {
                    Content = $"⚠️ File upload error: {ex.Message}",
                    IsUser = false,
                    Timestamp = DateTime.Now
                });
            }
            finally
            {
                IsSending = false;
                CloudSyncStatus = "☁️ Cloud Synced";
            }
        }

        private static string FormatBytes(long bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{(bytes / 1024.0):F1} KB";
            return $"{(bytes / (1024.0 * 1024.0)):F1} MB";
        }

        public async Task HandleAskAiFromCaptionAsync(string? captionText)
        {
            if (string.IsNullOrWhiteSpace(captionText)) return;

            RequestSwitchToChat?.Invoke();

            string prompt = $"Respond to or solve this question/statement concisely:\n\"{captionText.Trim()}\"";
            InputText = prompt;
            if (CanSendMessage())
            {
                await SendMessageAsync();
            }
        }

        private void CreateNewSession()
        {
            var newSession = new ConversationSession
            {
                Title = "New Conversation",
                Messages = new List<ChatMessage>(),
                LastUpdated = DateTime.Now
            };
            Sessions.Insert(0, newSession);
            SelectedSession = newSession;
            SaveHistory();
        }

        private void DeleteSession(ConversationSession? session)
        {
            if (session == null) return;
            
            bool isCurrent = SelectedSession == session;
            Sessions.Remove(session);

            if (Sessions.Count == 0)
            {
                CreateNewSession();
            }
            else if (isCurrent)
            {
                SelectedSession = Sessions.First();
            }

            SaveHistory();
        }

        private void ToggleSettings()
        {
            if (IsSettingsOpen)
            {
                LoadConfigToFields();
            }
            IsSettingsOpen = !IsSettingsOpen;
        }

        private void SaveSettings()
        {
            _config.AiProvider = AiProvider;
            _config.SetCurrentApiKey(ApiKey);
            _config.ApiUrl = ApiUrl;
            _config.ModelName = ModelName;
            _config.SystemPrompt = SystemPrompt;
            _config.WindowOpacity = WindowOpacity;
            _config.Topmost = Topmost;
            _config.AutoCopilot = AutoCopilot;
            _config.AudioSourceMic = AudioSourceMic;

            ConfigManager.Save(_config);
            IsSettingsOpen = false;
        }

        private void ClearCurrentHistory()
        {
            if (SelectedSession != null)
            {
                SelectedSession.Messages.Clear();
                CurrentMessages.Clear();
                SelectedSession.LastUpdated = DateTime.Now;
                SaveHistory();
            }
        }

        private void SaveHistory()
        {
            ChatHistoryManager.SaveHistory(Sessions.ToList());
        }
    }
}
