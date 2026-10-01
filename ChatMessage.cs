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

        private string? _imageUrl;
        private string? _fileUrl;
        private string? _fileName;
        private string? _fileSize;

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
                    OnPropertyChanged(nameof(DisplayImageSource));
                }
            }
        }

        public string? ImageUrl
        {
            get => _imageUrl;
            set
            {
                if (_imageUrl != value)
                {
                    _imageUrl = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(HasImage));
                    OnPropertyChanged(nameof(DisplayImageSource));
                }
            }
        }

        public string? FileUrl
        {
            get => _fileUrl;
            set
            {
                if (_fileUrl != value)
                {
                    _fileUrl = value;
                    OnPropertyChanged();
                    OnPropertyChanged(nameof(HasFile));
                }
            }
        }

        public string? FileName
        {
            get => _fileName;
            set
            {
                if (_fileName != value)
                {
                    _fileName = value;
                    OnPropertyChanged();
                }
            }
        }

        public string? FileSize
        {
            get => _fileSize;
            set
            {
                if (_fileSize != value)
                {
                    _fileSize = value;
                    OnPropertyChanged();
                }
            }
        }

        public string? DisplayImageSource => !string.IsNullOrEmpty(_imageBase64) ? _imageBase64 : _imageUrl;
        public bool HasImage => !string.IsNullOrEmpty(_imageBase64) || !string.IsNullOrEmpty(_imageUrl);
        public bool HasFile => !string.IsNullOrEmpty(_fileUrl);

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
