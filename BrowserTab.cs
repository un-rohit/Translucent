using System;
using System.ComponentModel;

namespace InvisibleChat
{
    public class BrowserTab : INotifyPropertyChanged
    {
        private string _title  = "New Tab";
        private string _url    = "https://www.google.com";
        private bool   _isActive;

        public string Id { get; } = Guid.NewGuid().ToString();

        public string Title
        {
            get => _title;
            set { _title = value; Notify(); }
        }

        public string Url
        {
            get => _url;
            set { _url = value; Notify(); }
        }

        public bool IsActive
        {
            get => _isActive;
            set { _isActive = value; Notify(); }
        }

        private bool _isPlayingAudio;
        public bool IsPlayingAudio
        {
            get => _isPlayingAudio;
            set { _isPlayingAudio = value; Notify(); }
        }

        private bool _isMuted;
        public bool IsMuted
        {
            get => _isMuted;
            set { _isMuted = value; Notify(); }
        }

        private bool _isSystemAudioInputAllowed = true;
        public bool IsSystemAudioInputAllowed
        {
            get => _isSystemAudioInputAllowed;
            set { _isSystemAudioInputAllowed = value; Notify(); }
        }

        private string _tabAudioInputSource = "system"; // "system", "mic", "both"
        public string TabAudioInputSource
        {
            get => _tabAudioInputSource;
            set { _tabAudioInputSource = value; Notify(); }
        }

        public event PropertyChangedEventHandler? PropertyChanged;
        private void Notify([System.Runtime.CompilerServices.CallerMemberName] string? n = null)
            => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(n));
    }
}
