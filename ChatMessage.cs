using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;

namespace InvisibleChat
{
    public class ChatMessage : INotifyPropertyChanged
    {
        private string _content = string.Empty;
        private string? _imageBase64;
        private bool _isStreaming;

        public string Id { get; set; } = Guid.NewGuid().ToString();

        public string Content
        {
            get => _content;
            set
            {
                if (_content != value)
                {
                    _content = value;
                    OnPropertyChanged();
                }
            }
        }

        public string? ImageBase64
        {
            get => _imageBase64;
            set
            {
                if (_imageBase64 != value)
                {
                    _imageBase64 = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(HasImage));
                }
            }
        }

        public bool HasImage => !string.IsNullOrEmpty(_imageBase64);

        public bool IsStreaming
        {
            get => _isStreaming;
            set
            {
                if (_isStreaming != value)
                {
                    _isStreaming = value;
                    OnPropertyChanged();
                }
            }
        }

        public bool IsUser { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.Now;

        public event PropertyChangedEventHandler? PropertyChanged;
        protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
    }
}
