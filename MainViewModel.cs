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

        // Settings Properties (bound to Settings UI)
        private string _apiKey = string.Empty;
        private string _apiUrl = string.Empty;
        private string _modelName = string.Empty;
        private string _systemPrompt = string.Empty;
        private double _windowOpacity = 0.92;
        private bool _topmost = true;

        public MainViewModel()
        {
            _chatService = new ChatService();
            _config = ConfigManager.Load();

            // Load saved settings into VM fields
            LoadConfigToFields();

            // Load history sessions
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

            // Create initial session if history is empty
            if (_sessions.Count == 0)
            {
                CreateNewSession();
            }
            else
            {
                SelectedSession = _sessions.First();
            }

            // Initialize Commands
            SendMessageCommand = new RelayCommand(async _ => await SendMessageAsync(), _ => CanSendMessage());
            NewSessionCommand = new RelayCommand(_ => CreateNewSession());
            DeleteSessionCommand = new RelayCommand(param => DeleteSession(param as ConversationSession));
            ToggleSidebarCommand = new RelayCommand(_ => IsSidebarVisible = !IsSidebarVisible);
            ToggleSettingsCommand = new RelayCommand(_ => ToggleSettings());
            SaveSettingsCommand = new RelayCommand(_ => SaveSettings());
            ClearHistoryCommand = new RelayCommand(_ => ClearCurrentHistory());
            
            // Captions Commands
            ToggleCaptionsSidebarCommand = new RelayCommand(_ => IsCaptionsSidebarVisible = !IsCaptionsSidebarVisible);
            ClearCaptionsCommand = new RelayCommand(_ => Captions.Clear());
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

        // Live Captions Properties
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
        
        // Captions Commands Properties
        public ICommand ToggleCaptionsSidebarCommand { get; }
        public ICommand ClearCaptionsCommand { get; }

        // Methods
        private void LoadConfigToFields()
        {
            ApiKey = _config.ApiKey;
            ApiUrl = _config.ApiUrl;
            ModelName = _config.ModelName;
            SystemPrompt = _config.SystemPrompt;
            WindowOpacity = _config.WindowOpacity;
            Topmost = _config.Topmost;
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

            // 1. Add User Message
            var userMsg = new ChatMessage { Content = rawInput, IsUser = true, Timestamp = DateTime.Now };
            CurrentMessages.Add(userMsg);
            SelectedSession.Messages.Add(userMsg);

            // Update title if it is default
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

            // 2. Call ChatService
            string reply = await _chatService.SendMessageAsync(SelectedSession.Messages.ToList(), _config);

            // 3. Add AI Message
            var aiMsg = new ChatMessage { Content = reply, IsUser = false, Timestamp = DateTime.Now };
            CurrentMessages.Add(aiMsg);
            SelectedSession.Messages.Add(aiMsg);
            SelectedSession.LastUpdated = DateTime.Now;
            SaveHistory();

            IsSending = false;
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
