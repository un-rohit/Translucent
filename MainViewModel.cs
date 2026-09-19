using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.ComponentModel;
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

        // Settings Properties (bound to Settings UI)
        private string _apiKey = string.Empty;
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

            // Commands
            SendMessageCommand = new RelayCommand(async _ => await SendMessageAsync(), _ => CanSendMessage());
            NewSessionCommand = new RelayCommand(_ => CreateNewSession());
            DeleteSessionCommand = new RelayCommand(param => DeleteSession(param as ConversationSession));
            ToggleSidebarCommand = new RelayCommand(_ => IsSidebarVisible = !IsSidebarVisible);
            ToggleSettingsCommand = new RelayCommand(_ => ToggleSettings());
            SaveSettingsCommand = new RelayCommand(_ => SaveSettings());
            ClearHistoryCommand = new RelayCommand(_ => ClearCurrentHistory());
            
            // Captions & Co-pilot Commands
            ToggleCaptionsSidebarCommand = new RelayCommand(_ => IsCaptionsSidebarVisible = !IsCaptionsSidebarVisible);
            ClearCaptionsCommand = new RelayCommand(_ => Captions.Clear());
            AskAiFromCaptionCommand = new RelayCommand(async param => await HandleAskAiFromCaptionAsync(param as string));

            // Productivity & Stealth Commands
            SnipScreenCommand = new RelayCommand(_ => RequestSnipScreen?.Invoke());
            ToggleSplitViewCommand = new RelayCommand(_ => IsSplitView = !IsSplitView);
            ToggleGhostModeCommand = new RelayCommand(_ => IsGhostMode = !IsGhostMode);
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
        public ICommand ToggleCaptionsSidebarCommand { get; }
        public ICommand ClearCaptionsCommand { get; }
        public ICommand AskAiFromCaptionCommand { get; }
        public ICommand SnipScreenCommand { get; }
        public ICommand ToggleSplitViewCommand { get; }
        public ICommand ToggleGhostModeCommand { get; }

        private void LoadConfigToFields()
        {
            ApiKey = _config.ApiKey;
            ApiUrl = _config.ApiUrl;
            ModelName = _config.ModelName;
            SystemPrompt = _config.SystemPrompt;
            WindowOpacity = _config.WindowOpacity;
            Topmost = _config.Topmost;
            _isSplitView = _config.IsSplitView;
            _autoCopilot = _config.AutoCopilot;
            _audioSourceMic = _config.AudioSourceMic;
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
            }
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
            _config.ApiKey = ApiKey;
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
